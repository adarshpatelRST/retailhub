import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db";
import { config } from "../config";
import { logger } from "../utils/logger";
import { rebalanceAgent, ScanResult } from "../agent/rebalance-agent";

export interface ActiveSchedulerConfig {
  enabled: boolean;
  mode: "WAVES" | "HOURLY" | "BOTH";
  wavesEnabled: boolean;
  waveHours: string[];
  hourlyEnabled: boolean;
  intervalValue: number;
  intervalUnit: "MINUTES" | "HOURS";
  hourlyIntervalHours: number;
  hourlyIntervalMinutes: number;
  autoExpire: boolean;
  safetyFloorDays: number;
}

export interface SweepExecutionRecord {
  id: string;
  timestamp: string;
  type: "WAVE" | "HOURLY" | "MANUAL";
  durationMs: number;
  evaluatedPairs: number;
  createdRecs: number;
  autoExpiredCount: number;
  summary: string;
}

export interface SchedulerTelemetry {
  enabled: boolean;
  isActive: boolean;
  isScanRunning: boolean;
  mode: string;
  wavesEnabled: boolean;
  waveHours: string[];
  hourlyEnabled: boolean;
  intervalValue: number;
  intervalUnit: "MINUTES" | "HOURS";
  hourlyIntervalHours: number;
  hourlyIntervalMinutes: number;
  autoExpireEnabled: boolean;
  lastRunAt: string | null;
  lastRunType: "WAVE" | "HOURLY" | "MANUAL" | null;
  lastDurationMs: number;
  lastEvaluatedPairs: number;
  lastCreatedRecs: number;
  lastAutoExpiredCount: number;
  nextRunAt: string | null;
  totalExecutions: number;
  recentExecutions: SweepExecutionRecord[];
}

const CONFIG_FILE_PATH = path.join(process.cwd(), "server", "services", "scheduler-config.json");

export class BackgroundRebalanceScheduler {
  private isRunning = false;
  private isScanRunning = false;
  private waveCheckInterval: NodeJS.Timeout | null = null;
  private hourlyTimeout: NodeJS.Timeout | null = null;
  private hourlyInterval: NodeJS.Timeout | null = null;
  private nextIntervalRunAt: number | null = null;
  private lastTriggeredMinute: string | null = null;

  // Mutable dynamic configuration
  private currentConfig: ActiveSchedulerConfig;

  // In-memory ring buffer of recent sweep executions (last 10)
  private recentExecutions: SweepExecutionRecord[] = [];

  // Telemetry metrics
  private lastRunAt: string | null = null;
  private lastRunType: "WAVE" | "HOURLY" | "MANUAL" | null = null;
  private lastDurationMs = 0;
  private lastEvaluatedPairs = 0;
  private lastCreatedRecs = 0;
  private lastAutoExpiredCount = 0;
  private totalExecutions = 0;

  constructor() {
    this.currentConfig = this.loadConfigFromDisk();
  }

  /**
   * Loads saved configuration from disk or falls back to server env defaults
   */
  private loadConfigFromDisk(): ActiveSchedulerConfig {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const unit: "MINUTES" | "HOURS" = parsed.intervalUnit === "MINUTES" ? "MINUTES" : "HOURS";
          let val = parsed.intervalValue;
          if (typeof val !== "number" || isNaN(val) || val < 1) {
            val = parsed.hourlyIntervalHours || (unit === "MINUTES" ? 5 : 1);
          }

          const intervalMinutes = unit === "MINUTES" ? val : val * 60;
          const intervalHours = Math.max(1, Math.round(intervalMinutes / 60));

          if (typeof parsed.lastRunAt === "string") {
            this.lastRunAt = parsed.lastRunAt;
          }
          if (typeof parsed.nextIntervalRunAt === "number") {
            this.nextIntervalRunAt = parsed.nextIntervalRunAt;
          }

          return {
            enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : config.scheduler.enabled,
            mode: parsed.mode || config.scheduler.mode,
            wavesEnabled: typeof parsed.wavesEnabled === "boolean" ? parsed.wavesEnabled : true,
            waveHours: Array.isArray(parsed.waveHours) ? parsed.waveHours : [...config.scheduler.waveHours],
            hourlyEnabled:
              typeof parsed.hourlyEnabled === "boolean" ? parsed.hourlyEnabled : config.scheduler.hourlyEnabled,
            intervalValue: val,
            intervalUnit: unit,
            hourlyIntervalHours: intervalHours,
            hourlyIntervalMinutes: intervalMinutes,
            autoExpire: typeof parsed.autoExpire === "boolean" ? parsed.autoExpire : config.scheduler.autoExpire,
            safetyFloorDays: typeof parsed.safetyFloorDays === "number" ? parsed.safetyFloorDays : 7.0,
          };
        }
      }
    } catch (err) {
      logger.warn("[Scheduler] Failed to read scheduler-config.json, using defaults:", err);
    }

    const defaultHours = Math.max(1, Math.round(config.scheduler.hourlyIntervalMinutes / 60));
    return {
      enabled: config.scheduler.enabled,
      mode: config.scheduler.mode,
      wavesEnabled: config.scheduler.mode === "WAVES" || config.scheduler.mode === "BOTH",
      waveHours: [...config.scheduler.waveHours],
      hourlyEnabled: config.scheduler.hourlyEnabled,
      intervalValue: defaultHours,
      intervalUnit: "HOURS",
      hourlyIntervalHours: defaultHours,
      hourlyIntervalMinutes: defaultHours * 60,
      autoExpire: config.scheduler.autoExpire,
      safetyFloorDays: 7.0,
    };
  }

  /**
   * Persists active configuration and persistent run targets to disk
   */
  private saveConfigToDisk(): void {
    try {
      const dataToSave = {
        ...this.currentConfig,
        lastRunAt: this.lastRunAt,
        nextIntervalRunAt: this.nextIntervalRunAt,
      };
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(dataToSave, null, 2), "utf-8");
    } catch (err) {
      logger.warn("[Scheduler] Could not persist scheduler configuration to disk:", err);
    }
  }

  /**
   * Starts the background scheduler service
   */
  start(): void {
    if (!this.currentConfig.enabled) {
      logger.info("[Scheduler] Automated background rebalance scheduler is disabled via config.");
      return;
    }

    if (this.isRunning) {
      logger.warn("[Scheduler] Background scheduler is already running.");
      return;
    }

    this.isRunning = true;
    logger.info(
      `[Scheduler] Starting Automated Rebalance Scheduler. Mode: '${this.currentConfig.mode}'. Waves: [${this.currentConfig.waveHours.join(
        ", ",
      )}] (active: ${this.currentConfig.wavesEnabled}). Interval: every ${this.currentConfig.intervalValue} ${this.currentConfig.intervalUnit.toLowerCase()} (${this.currentConfig.hourlyIntervalMinutes}m) (active: ${this.currentConfig.hourlyEnabled}).`,
    );

    // 1. Wave Mode Checker: checks clock every 30 seconds for wave matches (02:00, 06:00, 14:00)
    if (this.currentConfig.wavesEnabled) {
      this.waveCheckInterval = setInterval(() => {
        this.checkAndTriggerWave();
      }, 30_000);
      // Run an immediate check on startup in case server started exactly on the minute
      this.checkAndTriggerWave();
    }

    // 2. Periodic Interval Timer (e.g. every 5 minutes, or every N hours)
    if (this.currentConfig.hourlyEnabled) {
      const intervalMs = Math.max(1, this.currentConfig.hourlyIntervalMinutes) * 60 * 1000;
      const now = Date.now();

      // Ensure nextIntervalRunAt is a valid future timestamp
      if (!this.nextIntervalRunAt || this.nextIntervalRunAt <= now) {
        this.nextIntervalRunAt = now + intervalMs;
        this.saveConfigToDisk();
      }

      const initialDelay = Math.max(0, this.nextIntervalRunAt - now);
      logger.info(
        `[Scheduler] Periodic interval timer registered: every ${this.currentConfig.intervalValue} ${this.currentConfig.intervalUnit.toLowerCase()} (${this.currentConfig.hourlyIntervalMinutes} minutes). First sweep in ${Math.round(initialDelay / 1000)}s (target: ${new Date(this.nextIntervalRunAt).toLocaleTimeString()}).`,
      );

      // Chained Post-Completion Scheduling: Starts the first sweep and chains recurring intervals strictly after completion
      this.scheduleNextInterval(initialDelay);
    }
  }

  /**
   * Chained post-completion interval scheduling:
   * The next interval timer ONLY arms after the current sweep has completely finished all micro-batches!
   */
  private scheduleNextInterval(delayMs?: number): void {
    if (!this.currentConfig.hourlyEnabled) return;

    if (this.hourlyTimeout) {
      clearTimeout(this.hourlyTimeout);
      this.hourlyTimeout = null;
    }

    const intervalMs = Math.max(1, this.currentConfig.hourlyIntervalMinutes) * 60 * 1000;
    const waitTime = delayMs !== undefined ? delayMs : intervalMs;

    this.nextIntervalRunAt = Date.now() + waitTime;
    this.saveConfigToDisk();

    this.hourlyTimeout = setTimeout(async () => {
      try {
        await this.executeSweep("HOURLY");
      } catch (err) {
        logger.error("[Scheduler] Error executing periodic sweep:", err);
      }
    }, waitTime);
  }

  /**
   * Graceful shutdown: clears all timers
   */
  stop(): void {
    if (this.waveCheckInterval) {
      clearInterval(this.waveCheckInterval);
      this.waveCheckInterval = null;
    }
    if (this.hourlyTimeout) {
      clearTimeout(this.hourlyTimeout);
      this.hourlyTimeout = null;
    }
    if (this.hourlyInterval) {
      clearInterval(this.hourlyInterval);
      this.hourlyInterval = null;
    }
    this.isRunning = false;
    logger.info("[Scheduler] Background rebalance scheduler stopped cleanly.");
  }

  /**
   * Dynamically hot-reloads scheduler configuration without server restart
   */
  updateConfig(updates: Partial<ActiveSchedulerConfig>): SchedulerTelemetry {
    if (Array.isArray(updates.waveHours)) {
      // Validate and sort wave times
      const validHours = updates.waveHours
        .map((t) => t.trim())
        .filter((t) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(t));
      this.currentConfig.waveHours = Array.from(new Set(validHours)).sort();
    }

    if (typeof updates.wavesEnabled === "boolean") {
      this.currentConfig.wavesEnabled = updates.wavesEnabled;
    }

    const intervalChanged =
      updates.intervalValue !== undefined ||
      updates.intervalUnit !== undefined ||
      updates.hourlyIntervalHours !== undefined;

    if (updates.hourlyEnabled === true) {
      this.currentConfig.hourlyEnabled = true;
      if (intervalChanged || !this.nextIntervalRunAt) {
        this.nextIntervalRunAt = Date.now() + this.currentConfig.hourlyIntervalMinutes * 60 * 1000;
      }
    } else if (updates.hourlyEnabled === false) {
      this.currentConfig.hourlyEnabled = false;
      this.nextIntervalRunAt = null;
    } else if (intervalChanged && this.currentConfig.hourlyEnabled) {
      this.nextIntervalRunAt = Date.now() + this.currentConfig.hourlyIntervalMinutes * 60 * 1000;
    }

    if (updates.intervalUnit === "MINUTES" || updates.intervalUnit === "HOURS") {
      this.currentConfig.intervalUnit = updates.intervalUnit;
    }

    if (typeof updates.intervalValue === "number" && !isNaN(updates.intervalValue)) {
      this.currentConfig.intervalValue = Math.max(1, Math.floor(updates.intervalValue));
    } else if (typeof updates.hourlyIntervalHours === "number" && !isNaN(updates.hourlyIntervalHours)) {
      // Backwards-compatibility for hourlyIntervalHours
      this.currentConfig.intervalValue = Math.max(1, Math.floor(updates.hourlyIntervalHours));
      this.currentConfig.intervalUnit = "HOURS";
    }

    // Recompute total minutes and hours based on active intervalUnit
    if (this.currentConfig.intervalUnit === "MINUTES") {
      this.currentConfig.hourlyIntervalMinutes = this.currentConfig.intervalValue;
      this.currentConfig.hourlyIntervalHours = Math.max(1, Math.round(this.currentConfig.intervalValue / 60));
    } else {
      this.currentConfig.hourlyIntervalHours = this.currentConfig.intervalValue;
      this.currentConfig.hourlyIntervalMinutes = this.currentConfig.intervalValue * 60;
    }

    if (typeof updates.enabled === "boolean") {
      this.currentConfig.enabled = updates.enabled;
    }

    if (typeof updates.autoExpire === "boolean") {
      this.currentConfig.autoExpire = updates.autoExpire;
    }

    if (typeof updates.safetyFloorDays === "number") {
      this.currentConfig.safetyFloorDays = updates.safetyFloorDays;
    }

    // Recalculate operational mode
    if (this.currentConfig.wavesEnabled && this.currentConfig.hourlyEnabled) {
      this.currentConfig.mode = "BOTH";
    } else if (this.currentConfig.hourlyEnabled) {
      this.currentConfig.mode = "HOURLY";
    } else {
      this.currentConfig.mode = "WAVES";
    }

    this.saveConfigToDisk();

    // Hot-reload active timers
    this.stop();
    if (this.currentConfig.enabled) {
      this.start();
    }

    logger.info(`[Scheduler] Configuration hot-reloaded successfully. Next run: ${this.getNextRunAt()}`);
    return this.getStatus();
  }

  /**
   * Adds a single wave time (e.g. "18:00")
   */
  addWaveHour(waveTime: string): SchedulerTelemetry {
    const trimmed = waveTime.trim();
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
      throw new Error(`Invalid time format '${waveTime}'. Must be 24-hour HH:mm (e.g. 06:00, 18:30).`);
    }

    if (!this.currentConfig.waveHours.includes(trimmed)) {
      this.currentConfig.waveHours.push(trimmed);
      this.currentConfig.waveHours.sort();
      this.saveConfigToDisk();
      this.stop();
      if (this.currentConfig.enabled) {
        this.start();
      }
    }

    return this.getStatus();
  }

  /**
   * Removes a single wave time
   */
  removeWaveHour(waveTime: string): SchedulerTelemetry {
    const trimmed = waveTime.trim();
    this.currentConfig.waveHours = this.currentConfig.waveHours.filter((t) => t !== trimmed);
    this.saveConfigToDisk();
    this.stop();
    if (this.currentConfig.enabled) {
      this.start();
    }
    return this.getStatus();
  }

  /**
   * Returns current active configuration
   */
  getConfig(): ActiveSchedulerConfig {
    return { ...this.currentConfig };
  }

  /**
   * Checks current local time against configured wave hours (e.g. 02:00, 06:00, 14:00)
   */
  private async checkAndTriggerWave(): Promise<void> {
    if (!this.currentConfig.wavesEnabled) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentHHmm = `${hours}:${minutes}`;
    const minuteKey = `${now.toDateString()} ${currentHHmm}`;

    if (this.currentConfig.waveHours.includes(currentHHmm) && this.lastTriggeredMinute !== minuteKey) {
      this.lastTriggeredMinute = minuteKey;
      logger.info(`[Scheduler] Operational Wave match detected at ${currentHHmm}. Executing scheduled sweep across all micro-batches...`);
      await this.executeSweep("WAVE");
    }
  }

  /**
   * Auto-expires recommendations where destination store stock has recovered to healthy levels
   */
  async autoExpireResolved(): Promise<number> {
    if (!this.currentConfig.autoExpire) return 0;

    let autoExpiredCount = 0;
    try {
      const openRecs = await prisma.recommendation.findMany({
        where: {
          status: { in: ["OPEN", "GENERATED", "MODIFIED"] },
        },
        include: {
          store: true,
          product: true,
        },
      });

      for (const rec of openRecs) {
        // Fetch current inventory balance for destination store & product
        const inv = await prisma.inventory.findFirst({
          where: { storeId: rec.storeId, productId: rec.productId },
        });

        if (!inv) continue;

        const currentStock = Number(inv.availableQuantity);
        const reorderLevel = Number(inv.reorderLevel || 10);

        // If stock normalized above reorder level, auto-expire
        if (currentStock > reorderLevel && currentStock > 0) {
          await prisma.$transaction(async (tx) => {
            await tx.recommendation.update({
              where: { id: rec.id },
              data: {
                status: "AUTO_EXPIRED",
                reason: `Auto-closed: Store inventory recovered to healthy buffer (${currentStock} units on hand > ${reorderLevel} ROP).`,
              },
            });

            await tx.action.create({
              data: {
                recommendationId: rec.id,
                actionType: "AUTO_EXPIRE",
                actionedBy: "SYS-CRON-0200",
                comments: `Automated recovery: Shelf stock replenished to ${currentStock} units via inward receipt.`,
              },
            });
          });

          autoExpiredCount++;
        }
      }

      if (autoExpiredCount > 0) {
        logger.info(`[Scheduler] Self-healing auto-expired ${autoExpiredCount} normalized recommendations.`);
      }
    } catch (err) {
      logger.warn("[Scheduler] Auto-expiration evaluation encountered an error:", err);
    }

    return autoExpiredCount;
  }

  /**
   * Executes a scheduled rebalance sweep
   */
  async executeSweep(type: "WAVE" | "HOURLY" | "MANUAL"): Promise<ScanResult | null> {
    if (this.isScanRunning) {
      logger.warn(`[Scheduler] Scan already in progress. Skipping ${type} sweep.`);
      return null;
    }

    this.isScanRunning = true;
    this.nextIntervalRunAt = null; // Freeze timer during active scan so telemetry doesn't prematurely advance
    this.saveConfigToDisk();
    const startTime = Date.now();
    logger.info(`[Scheduler] Starting ${type} rebalance sweep across enterprise stores...`);

    try {
      // 1. Auto-expire resolved recommendations
      const autoExpired = await this.autoExpireResolved();
      this.lastAutoExpiredCount = autoExpired;

      // 2. Run enterprise rebalance scan
      const scanResult = await rebalanceAgent.runScan();

      // 3. Update telemetry metrics
      const duration = Date.now() - startTime;
      this.lastRunAt = new Date().toISOString();
      this.lastRunType = type;
      this.lastDurationMs = duration;
      this.lastEvaluatedPairs = scanResult.evaluatedPairs;
      this.lastCreatedRecs = scanResult.createdRecommendations;
      this.totalExecutions++;

      logger.info(
        `[Scheduler] ${type} sweep completed in ${duration}ms. Evaluated: ${scanResult.evaluatedPairs} pairs, Created: ${scanResult.createdRecommendations} recommendations, Auto-expired: ${autoExpired}.`,
      );

      // Record in recent executions ring buffer (max 50 items for pagination)
      const executionRecord: SweepExecutionRecord = {
        id: `sweep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: this.lastRunAt,
        type,
        durationMs: duration,
        evaluatedPairs: scanResult.evaluatedPairs,
        createdRecs: scanResult.createdRecommendations,
        autoExpiredCount: autoExpired,
        summary: `${type} sweep completed in ${duration}ms (${scanResult.evaluatedPairs} pairs, ${scanResult.createdRecommendations} recommendations generated)`,
      };
      this.recentExecutions.unshift(executionRecord);
      if (this.recentExecutions.length > 50) {
        this.recentExecutions = this.recentExecutions.slice(0, 50);
      }

      // Record permanent audit entry in Prisma AuditLog model
      try {
        await prisma.auditLog.create({
          data: {
            correlationId: `sweep-${Date.now()}`,
            userId: null,
            action: `REBALANCE_SWEEP_${type}`,
            entityName: "Recommendation",
            entityId: `SWEEP-${Date.now()}`,
            oldValues: JSON.stringify({
              previousLastRunAt: this.lastRunAt,
              totalExecutions: this.totalExecutions - 1,
            }),
            newValues: JSON.stringify({
              sweepType: type,
              durationMs: duration,
              evaluatedPairs: scanResult.evaluatedPairs,
              createdRecommendations: scanResult.createdRecommendations,
              autoExpiredCount: autoExpired,
              summary: `${type} sweep completed in ${duration}ms (${scanResult.evaluatedPairs} pairs, ${scanResult.createdRecommendations} recommendations generated)`,
            }),
            ipAddress: "127.0.0.1 (In-Process Scheduler)",
            timestamp: new Date(),
          },
        });
      } catch (auditErr) {
        logger.warn("[Scheduler] Failed to record sweep audit log:", auditErr);
      }

      return scanResult;
    } catch (err) {
      logger.error(`[Scheduler] Error during ${type} sweep:`, err);
      return null;
    } finally {
      this.isScanRunning = false;
      // Re-arm periodic interval countdown strictly AFTER scan has finished all micro-batches
      if (this.isRunning && this.currentConfig.hourlyEnabled) {
        this.scheduleNextInterval();
      }
    }
  }

  /**
   * Calculates the projected next run time based on wave hours or hourly interval
   */
  getNextRunAt(): string | null {
    if (!this.isRunning || this.isScanRunning) return null;

    const now = new Date();
    const candidates: Date[] = [];

    if (this.currentConfig.wavesEnabled && this.currentConfig.waveHours.length > 0) {
      for (const waveTime of this.currentConfig.waveHours) {
        const [hhStr, mmStr] = waveTime.split(":");
        const target = new Date(now);
        target.setHours(parseInt(hhStr, 10), parseInt(mmStr || "0", 10), 0, 0);

        if (target.getTime() <= now.getTime()) {
          // If already passed today, target tomorrow
          target.setDate(target.getDate() + 1);
        }
        candidates.push(target);
      }
    }

    if (this.currentConfig.hourlyEnabled && this.nextIntervalRunAt) {
      const intervalMs = Math.max(1, this.currentConfig.hourlyIntervalMinutes) * 60 * 1000;
      let projected = this.nextIntervalRunAt;
      while (projected <= now.getTime()) {
        projected += intervalMs;
      }
      candidates.push(new Date(projected));
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.getTime() - b.getTime());
      return candidates[0].toISOString();
    }

    return null;
  }

  /**
   * Sets recent execution history (used by simulation or test runners)
   */
  setRecentExecutions(executions: SweepExecutionRecord[]): void {
    this.recentExecutions = [...executions];
    this.totalExecutions = Math.max(this.totalExecutions, executions.length);
  }

  /**
   * Updates last telemetry state directly and saves to disk
   */
  setLastTelemetry(data: {
    lastRunAt: string;
    lastRunType: "WAVE" | "HOURLY" | "MANUAL";
    lastDurationMs: number;
    lastEvaluatedPairs: number;
    lastCreatedRecs: number;
    lastAutoExpiredCount: number;
  }): void {
    this.lastRunAt = data.lastRunAt;
    this.lastRunType = data.lastRunType;
    this.lastDurationMs = data.lastDurationMs;
    this.lastEvaluatedPairs = data.lastEvaluatedPairs;
    this.lastCreatedRecs = data.lastCreatedRecs;
    this.lastAutoExpiredCount = data.lastAutoExpiredCount;
    this.saveConfigToDisk();
  }

  /**
   * Returns current telemetry snapshot
   */
  getStatus(): SchedulerTelemetry {
    return {
      enabled: this.currentConfig.enabled,
      isActive: this.isRunning,
      isScanRunning: this.isScanRunning,
      mode: this.currentConfig.mode,
      wavesEnabled: this.currentConfig.wavesEnabled,
      waveHours: [...this.currentConfig.waveHours],
      hourlyEnabled: this.currentConfig.hourlyEnabled,
      intervalValue: this.currentConfig.intervalValue,
      intervalUnit: this.currentConfig.intervalUnit,
      hourlyIntervalHours: this.currentConfig.hourlyIntervalHours,
      hourlyIntervalMinutes: this.currentConfig.hourlyIntervalMinutes,
      autoExpireEnabled: this.currentConfig.autoExpire,
      lastRunAt: this.lastRunAt,
      lastRunType: this.lastRunType,
      lastDurationMs: this.lastDurationMs,
      lastEvaluatedPairs: this.lastEvaluatedPairs,
      lastCreatedRecs: this.lastCreatedRecs,
      lastAutoExpiredCount: this.lastAutoExpiredCount,
      nextRunAt: this.getNextRunAt(),
      totalExecutions: this.totalExecutions,
      recentExecutions: [...this.recentExecutions],
    };
  }
}

export const backgroundScheduler = new BackgroundRebalanceScheduler();

