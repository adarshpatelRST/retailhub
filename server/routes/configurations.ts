import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { authenticateToken } from "../auth";
import { requireRole } from "../middleware/rbac";
import { backgroundScheduler } from "../services/background-scheduler";
import { realisticSimulationService } from "../services/realistic-simulation-service";
import { IN_MEMORY_RULES } from "./action-center";
import { BadRequestError } from "../utils/errors";

const router = Router();

// Apply auth to all /configurations endpoints
router.use(authenticateToken);

// ============================================================================
// 1. SCHEDULER & SCAN TIMING CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/configurations/scheduler
 * Returns live scheduler telemetry and active configuration parameters
 */
router.get("/scheduler", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = backgroundScheduler.getStatus();
    const config = backgroundScheduler.getConfig();

    res.json({
      success: true,
      data: {
        status,
        config,
      },
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/v1/configurations/scheduler
 * Updates wave schedule, interval (minutes or hours), switches, and hot-reloads the scheduler
 * RBAC: ADMIN or EXECUTIVE
 */
router.put("/scheduler", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      enabled,
      wavesEnabled,
      waveHours,
      hourlyEnabled,
      intervalValue,
      intervalUnit,
      hourlyIntervalHours,
      autoExpire,
      safetyFloorDays,
    } = req.body;

    const updates: Record<string, any> = {};

    if (typeof enabled === "boolean") updates.enabled = enabled;
    if (typeof wavesEnabled === "boolean") updates.wavesEnabled = wavesEnabled;
    if (typeof hourlyEnabled === "boolean") updates.hourlyEnabled = hourlyEnabled;
    if (typeof autoExpire === "boolean") updates.autoExpire = autoExpire;

    if (intervalUnit === "MINUTES" || intervalUnit === "HOURS") {
      updates.intervalUnit = intervalUnit;
    }

    if (intervalValue !== undefined) {
      const parsedVal = Number(intervalValue);
      if (isNaN(parsedVal) || parsedVal < 1 || !Number.isInteger(parsedVal)) {
        throw new BadRequestError("Recurring interval must be a positive whole integer (e.g. 5 minutes or 2 hours).");
      }
      updates.intervalValue = parsedVal;
    } else if (hourlyIntervalHours !== undefined) {
      const parsedHours = Number(hourlyIntervalHours);
      if (isNaN(parsedHours) || parsedHours < 1 || !Number.isInteger(parsedHours)) {
        throw new BadRequestError("Recurring interval must be a positive whole integer (e.g. 1, 2, 4, 8 hours).");
      }
      updates.intervalValue = parsedHours;
      updates.intervalUnit = "HOURS";
    }

    if (Array.isArray(waveHours)) {
      const validHours = waveHours.filter((t: any) => typeof t === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(t.trim()));
      updates.waveHours = Array.from(new Set(validHours.map((t) => t.trim()))).sort();
    }

    if (safetyFloorDays !== undefined) {
      const floor = Number(safetyFloorDays);
      if (!isNaN(floor) && floor >= 0) {
        updates.safetyFloorDays = floor;
      }
    }

    const updatedTelemetry = backgroundScheduler.updateConfig(updates);
    const updatedConfig = backgroundScheduler.getConfig();

    res.json({
      success: true,
      data: {
        status: updatedTelemetry,
        config: updatedConfig,
      },
      message: "Background scheduler configuration updated and hot-reloaded successfully.",
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/waves
 * Adds an operational shift wave time (HH:mm)
 */
router.post("/scheduler/waves", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { time } = req.body;
    if (!time || typeof time !== "string" || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim())) {
      throw new BadRequestError("Invalid wave time format. Must be 24-hour HH:mm (e.g. '06:00', '14:30').");
    }

    const updatedStatus = backgroundScheduler.addWaveHour(time.trim());
    const updatedConfig = backgroundScheduler.getConfig();

    res.json({
      success: true,
      data: {
        status: updatedStatus,
        config: updatedConfig,
      },
      message: `Wave time ${time.trim()} added successfully.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/configurations/scheduler/waves/:time
 * Deletes an operational shift wave time
 */
router.delete("/scheduler/waves/:time", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { time } = req.params;
    if (!time) {
      throw new BadRequestError("Wave time parameter is required.");
    }

    const updatedStatus = backgroundScheduler.removeWaveHour(decodeURIComponent(time));
    const updatedConfig = backgroundScheduler.getConfig();

    res.json({
      success: true,
      data: {
        status: updatedStatus,
        config: updatedConfig,
      },
      message: `Wave time ${time} removed successfully.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/trigger
 * Manually executes an enterprise rebalance sweep immediately
 */
router.post("/scheduler/trigger", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sweepResult = await backgroundScheduler.executeSweep("MANUAL");
    const status = backgroundScheduler.getStatus();

    res.json({
      success: true,
      data: {
        sweepResult,
        status,
      },
      message: sweepResult
        ? `Manual scan completed in ${status.lastDurationMs}ms (${sweepResult.evaluatedPairs} pairs evaluated, ${sweepResult.createdRecommendations} created).`
        : "Sweep skipped: Another scan is currently in progress.",
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/simulate-stockout
 * Injects a test stockout on Bhopal store (BPL-001) for SKU-1001 to test the automated AI recommendation pipeline
 */
router.post("/scheduler/simulate-stockout", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeCode = (req.body.storeCode as string) || "BPL-001";
    const sku = (req.body.sku as string) || "SKU-1001";

    const store = await prisma.store.findFirst({
      where: { storeCode },
    });
    if (!store) {
      throw new BadRequestError(`Store with code '${storeCode}' not found.`);
    }

    const product = await prisma.product.findFirst({
      where: { sku },
    });
    if (!product) {
      throw new BadRequestError(`Product with SKU '${sku}' not found.`);
    }

    const inventory = await prisma.inventory.findFirst({
      where: { storeId: store.id, productId: product.id },
    });

    if (!inventory) {
      throw new BadRequestError(`Inventory record for ${storeCode} - ${sku} not found.`);
    }

    await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        availableQuantity: 0.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        store: { id: store.id, storeCode: store.storeCode, name: store.name },
        product: { id: product.id, sku: product.sku, name: product.name },
        previousQuantity: Number(inventory.availableQuantity),
        currentQuantity: 0,
        reorderLevel: 15,
      },
      message: `Test stockout injected for ${product.name} at ${store.name}. Available quantity set to 0.000 (ROP: 15). The auto-scheduler will detect this on the next sweep!`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/simulate-5-cycles
 * Replaces test/depleted data and executes a realistic 5-cycle simulation (sales -> scan -> approve -> sales -> scan)
 */
router.post("/scheduler/simulate-5-cycles", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await realisticSimulationService.runFull5CycleSimulation();
    const status = backgroundScheduler.getStatus();

    res.json({
      success: true,
      data: {
        report,
        status,
      },
      message: `Successfully executed realistic 5-cycle store simulation. ${report.finalState.totalRecommendations} total recommendations created (${report.finalState.openRecommendations} OPEN, ${report.finalState.approvedRecommendations} APPROVED), ${report.finalState.totalStockTransfers} stock transfers fulfilled.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/reset-test-stock
 * Restores healthy inventory level on Bhopal store (BPL-001) for SKU-1001
 */
router.post("/scheduler/reset-test-stock", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeCode = (req.body.storeCode as string) || "BPL-001";
    const sku = (req.body.sku as string) || "SKU-1001";

    const store = await prisma.store.findFirst({
      where: { storeCode },
    });
    const product = await prisma.product.findFirst({
      where: { sku },
    });

    if (!store || !product) {
      throw new BadRequestError("Store or product not found.");
    }

    const inventory = await prisma.inventory.findFirst({
      where: { storeId: store.id, productId: product.id },
    });

    if (inventory) {
      await prisma.inventory.update({
        where: { id: inventory.id },
        data: {
          availableQuantity: 45.000,
          reorderLevel: 15.000,
          lastUpdatedOn: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: `Test stock restored for ${product.name} at ${store.name} to 45 units.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/bulk-deplete
 * Sets availableQuantity = 0.000 for ALL products in a test store (default: Bhopal BPL-001)
 * to test large-scale AI rebalance throughput across 90+ products simultaneously.
 */
router.post("/scheduler/bulk-deplete", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeCode = (req.body.storeCode as string) || "BPL-001";
    const store = await prisma.store.findFirst({
      where: { storeCode },
    });
    if (!store) {
      throw new BadRequestError(`Store '${storeCode}' not found.`);
    }

    const updateResult = await prisma.inventory.updateMany({
      where: { storeId: store.id },
      data: {
        availableQuantity: 0.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        store: { id: store.id, storeCode: store.storeCode, name: store.name },
        depletedRecordsCount: updateResult.count,
      },
      message: `Bulk stockout injected: All ${updateResult.count} products at ${store.name} set to 0.000 available stock. The AI rebalance agent will evaluate and process all products on the next sweep!`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/scheduler/restore-inventory
 * Restores healthy inventory baseline stock across all products in the test store
 */
router.post("/scheduler/restore-inventory", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeCode = (req.body.storeCode as string) || "BPL-001";
    const store = await prisma.store.findFirst({
      where: { storeCode },
    });
    if (!store) {
      throw new BadRequestError(`Store '${storeCode}' not found.`);
    }

    const updateResult = await prisma.inventory.updateMany({
      where: { storeId: store.id },
      data: {
        availableQuantity: 45.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        store: { id: store.id, storeCode: store.storeCode, name: store.name },
        restoredRecordsCount: updateResult.count,
      },
      message: `Inventory baseline restored: ${updateResult.count} products at ${store.name} reset to 45 units.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. INVENTORY RULES (SCD TYPE 2) CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/configurations/rules
 * Returns SCD-2 inventory rules (current active versions or full history)
 */
router.get("/rules", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showHistorical = req.query.includeHistory === "true";
    const search = ((req.query.search as string) || "").trim().toLowerCase();

    let rules = IN_MEMORY_RULES;
    if (!showHistorical) {
      rules = rules.filter((r) => r.isCurrentVersion);
    }
    if (search) {
      rules = rules.filter(
        (r) =>
          r.ruleCode.toLowerCase().includes(search) ||
          r.scopeLabel.toLowerCase().includes(search) ||
          r.scopeType.toLowerCase().includes(search),
      );
    }

    res.json({
      success: true,
      data: rules,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/configurations/rules
 * Creates a new SCD-2 version for an inventory threshold rule
 */
router.post("/rules", requireRole("ADMIN", "EXECUTIVE"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      previousRuleId,
      scopeType = "CATEGORY",
      scopeLabel = "",
      minStockDays = 3.0,
      reorderPointDays = 7.0,
      targetStockDays = 14.0,
      maxStockDays = 30.0,
      donorSafetyFloorDays = 7.0,
      effectiveFrom = new Date().toISOString().slice(0, 10),
    } = req.body;

    if (previousRuleId) {
      const prev = IN_MEMORY_RULES.find((r) => r.id === previousRuleId);
      if (prev) {
        prev.isCurrentVersion = false;
        prev.effectiveTo = effectiveFrom;
      }
    }

    const prevRule = previousRuleId
      ? IN_MEMORY_RULES.find((r) => r.id === previousRuleId)
      : null;
    const nextVersion = prevRule ? prevRule.versionNumber + 1 : 1;
    const nextCode = prevRule ? prevRule.ruleCode : `RUL-CUSTOM-${Date.now().toString().slice(-4)}`;

    const newRule = {
      id: `rule-${Date.now()}`,
      ruleCode: nextCode,
      scopeType,
      scopeLabel,
      minStockDays: Number(minStockDays),
      reorderPointDays: Number(reorderPointDays),
      targetStockDays: Number(targetStockDays),
      maxStockDays: Number(maxStockDays),
      donorSafetyFloorDays: Number(donorSafetyFloorDays),
      effectiveFrom,
      effectiveTo: null,
      isCurrentVersion: true,
      versionNumber: nextVersion,
      updatedBy: req.user?.fullName || "Ananya Deshmukh (ADMIN)",
    };

    IN_MEMORY_RULES.unshift(newRule);

    res.json({
      success: true,
      data: newRule,
      message: `SCD-2 rule ${newRule.ruleCode} version ${newRule.versionNumber} published.`,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
