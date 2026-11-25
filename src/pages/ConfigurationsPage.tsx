import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  History,
  Layers,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Timer,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient, type ApiEnvelope } from "@/api/client";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardButton } from "@/components/ui/StandardButton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { InventoryRuleConfigView } from "./InventoryRulesPage";

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

export interface SchedulerTelemetryResponse {
  status: {
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
  };
  config: {
    enabled: boolean;
    mode: string;
    wavesEnabled: boolean;
    waveHours: string[];
    hourlyEnabled: boolean;
    intervalValue: number;
    intervalUnit: "MINUTES" | "HOURS";
    hourlyIntervalHours: number;
    hourlyIntervalMinutes: number;
    autoExpire: boolean;
    safetyFloorDays: number;
  };
}

// Map standard wave hours to enterprise operational shift labels
const SHIFT_PURPOSES: Record<string, { title: string; subtitle: string; actor: string }> = {
  "02:00": {
    title: "Nightly Deep Network Rebalance & Cleanup",
    subtitle: "Runs full 50-store matrix scan before warehouse dispatch shifts begin.",
    actor: "SYS-CRON-0200",
  },
  "06:00": {
    title: "Morning Pre-Opening Picklist Wave",
    subtitle: "Final pre-store-opening scan to capture early inward deliveries.",
    actor: "SYS-CRON-0600",
  },
  "14:00": {
    title: "Midday Shift Handover Rebalance",
    subtitle: "Evaluates lunch rush sales depletion and generates afternoon transfers.",
    actor: "SYS-CRON-1400",
  },
};

/**
 * Converts "HH:mm" 24h string to 12h display string (e.g. "02:00" -> "02:00 AM", "14:00" -> "02:00 PM")
 */
function formatTo12Hour(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

export const ConfigurationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const activeTab = searchParams.get("tab") === "timing" ? "timing" : "rules";

  const handleTabChange = (newTab: "rules" | "timing") => {
    setSearchParams({ tab: newTab });
  };

  // ==========================================================================
  // SCHEDULER DATA & MUTATIONS
  // ==========================================================================
  const { data: schedulerData, isLoading: isSchedulerLoading, refetch } = useQuery<
    ApiEnvelope<SchedulerTelemetryResponse>
  >({
    queryKey: ["admin", "configurations", "scheduler"],
    queryFn: async () => {
      const res = await apiClient.get<ApiEnvelope<SchedulerTelemetryResponse>>(
        "/configurations/scheduler",
      );
      return res.data;
    },
    refetchInterval: (query) => (query.state.data?.data?.status?.isScanRunning ? 2000 : 8000),
  });

  const status = schedulerData?.data?.status;
  const config = schedulerData?.data?.config;

  // Form states for periodic interval
  const [intervalValueInput, setIntervalValueInput] = React.useState<string>("5");
  const [intervalUnitInput, setIntervalUnitInput] = React.useState<"MINUTES" | "HOURS">("MINUTES");

  React.useEffect(() => {
    if (config?.intervalValue) {
      setIntervalValueInput(String(config.intervalValue));
    }
    if (config?.intervalUnit) {
      setIntervalUnitInput(config.intervalUnit);
    }
  }, [config?.intervalValue, config?.intervalUnit]);

  // Real-time second-by-second countdown state
  const [countdownSeconds, setCountdownSeconds] = React.useState<number | null>(null);

  // Invalidate Action Center and Scheduler caches when scan concludes
  const prevIsScanRunning = React.useRef(false);
  React.useEffect(() => {
    if (prevIsScanRunning.current && !status?.isScanRunning) {
      // Scan just concluded! Immediately invalidate recommendation and telemetry caches
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
    }
    prevIsScanRunning.current = !!status?.isScanRunning;
  }, [status?.isScanRunning, queryClient]);

  React.useEffect(() => {
    if (status?.isScanRunning || !status?.nextRunAt || !status.isActive) {
      setCountdownSeconds(null);
      return;
    }

    let hasTriggered = false;
    const updateCountdown = () => {
      const targetTime = new Date(status.nextRunAt!).getTime();
      const diffSecs = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setCountdownSeconds(diffSecs);

      // In-place reactive refetch via TanStack Query without full browser reload
      if (diffSecs === 0 && !hasTriggered) {
        hasTriggered = true;
        queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
          queryClient.invalidateQueries({ queryKey: ["action-center"] });
        }, 1500);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [status?.nextRunAt, status?.isActive, status?.isScanRunning, queryClient]);

  const formattedCountdown = React.useMemo(() => {
    if (status?.isScanRunning) return "Scan in progress...";
    if (countdownSeconds === null) return "Paused";
    if (countdownSeconds <= 0) return "Running now...";
    const mins = Math.floor(countdownSeconds / 60);
    const secs = countdownSeconds % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;

    if (hours > 0) {
      return `${hours}h ${String(remMins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [countdownSeconds, status?.isScanRunning]);

  // ==========================================================================
  // PAGINATION FOR RECENT EXECUTION LOGS (Max 10 Pages)
  // ==========================================================================
  const [logPage, setLogPage] = React.useState<number>(1);
  const [logPageInput, setLogPageInput] = React.useState<string>("1");
  const LOG_PAGE_SIZE = 5;

  const allExecutions = React.useMemo(() => status?.recentExecutions || [], [status?.recentExecutions]);
  const totalLogItems = allExecutions.length;
  // User requirement: Max 10 pages for the ring buffer
  const totalLogPages = Math.min(10, Math.max(1, Math.ceil(totalLogItems / LOG_PAGE_SIZE)));

  React.useEffect(() => {
    setLogPageInput(String(logPage));
  }, [logPage]);

  React.useEffect(() => {
    if (logPage > totalLogPages) {
      setLogPage(totalLogPages);
    }
  }, [totalLogPages, logPage]);

  const handleLogPageCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(totalLogPages, parsed));
      setLogPage(clamped);
      setLogPageInput(String(clamped));
    } else {
      setLogPageInput(String(logPage));
    }
  };

  const paginatedExecutions = React.useMemo(() => {
    const start = (logPage - 1) * LOG_PAGE_SIZE;
    return allExecutions.slice(start, start + LOG_PAGE_SIZE);
  }, [allExecutions, logPage, LOG_PAGE_SIZE]);

  // Dialog state for adding new wave time
  const [isAddWaveModalOpen, setIsAddWaveModalOpen] = React.useState(false);
  const [newWaveTime, setNewWaveTime] = React.useState("18:00");
  const [newWavePurpose, setNewWavePurpose] = React.useState("Evening Peak Shift Rebalance");

  // Mutation: Update general scheduler config
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<{
      enabled: boolean;
      wavesEnabled: boolean;
      waveHours: string[];
      hourlyEnabled: boolean;
      intervalValue: number;
      intervalUnit: "MINUTES" | "HOURS";
      hourlyIntervalHours: number;
      autoExpire: boolean;
    }>) => {
      const res = await apiClient.put<ApiEnvelope<SchedulerTelemetryResponse>>(
        "/configurations/scheduler",
        updates,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "configurations", "scheduler"], data);
      toast.success("Scheduler configuration hot-reloaded successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update scheduler configuration.");
    },
  });

  // Mutation: Add Wave Time
  const addWaveMutation = useMutation({
    mutationFn: async (time: string) => {
      const res = await apiClient.post<ApiEnvelope<SchedulerTelemetryResponse>>(
        "/configurations/scheduler/waves",
        { time },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "configurations", "scheduler"], data);
      setIsAddWaveModalOpen(false);
      toast.success(`Wave time added successfully.`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add wave time.");
    },
  });

  // Mutation: Delete Wave Time
  const deleteWaveMutation = useMutation({
    mutationFn: async (time: string) => {
      const res = await apiClient.delete<ApiEnvelope<SchedulerTelemetryResponse>>(
        `/configurations/scheduler/waves/${encodeURIComponent(time)}`,
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "configurations", "scheduler"], data);
      toast.success("Wave time removed.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove wave time.");
    },
  });

  // Mutation: Trigger Manual Rebalance Sweep Now
  const triggerSweepMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiEnvelope<any>>(
        "/configurations/scheduler/trigger",
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      toast.success(
        (data as any)?.message || "Manual sweep completed successfully across enterprise stores.",
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to trigger rebalance sweep.");
    },
  });

  // Mutation: Inject Test Stockout (Simulation Sandbox)
  const simulateStockoutMutation = useMutation({
    mutationFn: async (params?: { storeCode?: string; sku?: string }) => {
      const res = await apiClient.post<ApiEnvelope<any>>(
        "/configurations/scheduler/simulate-stockout",
        params || { storeCode: "BPL-001", sku: "SKU-1001" },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      toast.success(
        (data as any)?.message || "Test stockout injected! Available stock set to 0. Auto-scheduler will trigger rebalance.",
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to inject test stockout.");
    },
  });

  // Mutation: Reset Test Stock
  const resetStockMutation = useMutation({
    mutationFn: async (params?: { storeCode?: string; sku?: string }) => {
      const res = await apiClient.post<ApiEnvelope<any>>(
        "/configurations/scheduler/reset-test-stock",
        params || { storeCode: "BPL-001", sku: "SKU-1001" },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      toast.success((data as any)?.message || "Test stock restored to healthy levels.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset test stock.");
    },
  });

  // Mutation: Bulk Deplete All SKUs (Simulation Sandbox - 0 Stock for all products)
  const bulkDepleteMutation = useMutation({
    mutationFn: async (params?: { storeCode?: string }) => {
      const res = await apiClient.post<ApiEnvelope<any>>(
        "/configurations/scheduler/bulk-deplete",
        params || { storeCode: "BPL-001" },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      toast.success(
        (data as any)?.message || "Bulk stockout injected! All products in Bhopal store set to 0.000 available stock.",
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to inject bulk stockout.");
    },
  });

  // Mutation: Restore Full Inventory Baseline
  const restoreInventoryMutation = useMutation({
    mutationFn: async (params?: { storeCode?: string }) => {
      const res = await apiClient.post<ApiEnvelope<any>>(
        "/configurations/scheduler/restore-inventory",
        params || { storeCode: "BPL-001" },
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      toast.success((data as any)?.message || "Full store inventory baseline restored.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to restore store inventory baseline.");
    },
  });

  // Handle Save Interval Settings
  const handleSaveIntervalSettings = () => {
    const val = parseInt(intervalValueInput, 10);
    if (isNaN(val) || val < 1) {
      toast.error("Please enter a valid whole positive integer (e.g. 5 minutes or 1 hour).");
      return;
    }
    updateConfigMutation.mutate({
      intervalValue: val,
      intervalUnit: intervalUnitInput,
      hourlyEnabled: true, // Auto-enable when saving test interval
    });
  };

  return (
    <PageLayout
      title="System Configurations"
      description="Manage replenishment policies, dynamic SCD-2 inventory thresholds, and automated rebalance scan timing."
    >
      <div className="space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div
            role="tablist"
            aria-label="Configuration Sub-Modules"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rules"}
              onClick={() => handleTabChange("rules")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "rules"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Inventory Rules (SCD Type 2)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "timing"}
              onClick={() => handleTabChange("timing")}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "timing"
                  ? "bg-background text-foreground shadow-xs font-bold text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Auto-Scan Timing & Schedule</span>
              {status?.hourlyEnabled && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.2 text-[10px] font-mono font-medium rounded-full bg-indigo-100 text-indigo-700">
                  {status.intervalValue}{status.intervalUnit === "MINUTES" ? "m" : "h"} Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* SUB-MODULE 1: INVENTORY RULES (SCD TYPE 2)                         */}
        {/* ================================================================== */}
        {activeTab === "rules" && (
          <div className="space-y-4">
            <InventoryRuleConfigView embedded />
          </div>
        )}

        {/* ================================================================== */}
        {/* SUB-MODULE 2: AUTO-SCAN TIMING & SCHEDULE                          */}
        {/* ================================================================== */}
        {activeTab === "timing" && (
          <div className="space-y-6">
            {/* Live Telemetry Status Banner */}
            <Card className="border-border bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 shadow-2xs">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-3 w-3">
                          <span
                            className={cn(
                              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                              status?.isActive ? "bg-emerald-400" : "bg-amber-400",
                            )}
                          />
                          <span
                            className={cn(
                              "relative inline-flex rounded-full h-3 w-3",
                              status?.isActive ? "bg-emerald-500" : "bg-amber-500",
                            )}
                          />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          {status?.isActive ? "Background Engine Running" : "Engine Standby"}
                        </span>
                      </div>

                      <span className="text-slate-300">|</span>

                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 font-mono">
                        <Clock className="h-3 w-3" />
                        Mode: {status?.mode || "WAVES"}
                      </span>

                      {/* Live Second-by-Second Countdown Pill or Live Scan Indicator */}
                      {status?.isScanRunning ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                          <RefreshCw className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                          <span>Scan In Progress:</span>
                          <span className="font-bold text-blue-700">
                            Generating recommendations...
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                          <Timer className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                          <span>Next Scan In:</span>
                          <span className="font-mono font-bold text-emerald-700 tracking-wider">
                            {formattedCountdown}
                          </span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {status?.lastRunAt ? (
                        <>
                          Last executed at <span className="font-semibold text-foreground">{new Date(status.lastRunAt).toLocaleTimeString()}</span> via{" "}
                          <span className="font-semibold text-foreground">{status.lastRunType}</span> ({status.lastDurationMs}ms &bull; {status.lastEvaluatedPairs} pairs evaluated &bull;{" "}
                          <span className="text-emerald-600 font-semibold">{status.lastCreatedRecs} recommendations</span> &bull; {status.lastAutoExpiredCount} auto-expired).
                        </>
                      ) : (
                        "Engine initialized. Standing by for next scheduled operational wave sweep."
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refetch()}
                      className="h-9 gap-1.5 text-xs"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isSchedulerLoading && "animate-spin")} />
                      <span>Refresh</span>
                    </Button>

                    <StandardButton
                      type="button"
                      variant="default"
                      size="sm"
                      loading={triggerSweepMutation.isPending}
                      loadingText="Scanning Enterprise Stores..."
                      onClick={() => triggerSweepMutation.mutate()}
                      className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Run Sweep Now</span>
                    </StandardButton>
                  </div>
                </div>

                {/* Telemetry Metrics Strip */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                  <div className="rounded-lg bg-slate-50/60 p-2.5 border border-slate-100">
                    <div className="text-[11px] text-muted-foreground font-medium">Total Sweeps Executed</div>
                    <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                      {status?.totalExecutions || 0}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/60 p-2.5 border border-slate-100">
                    <div className="text-[11px] text-muted-foreground font-medium">Last Scan Latency</div>
                    <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                      {status?.lastDurationMs ? `${status.lastDurationMs} ms` : "0 ms"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/60 p-2.5 border border-slate-100">
                    <div className="text-[11px] text-muted-foreground font-medium">Periodic Frequency</div>
                    <div className="text-lg font-bold font-mono text-indigo-700 mt-0.5">
                      {status?.hourlyEnabled ? `Every ${status.intervalValue} ${status.intervalUnit === "MINUTES" ? "Min" : "Hour(s)"}` : "Inactive"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-slate-50/60 p-2.5 border border-slate-100">
                    <div className="text-[11px] text-muted-foreground font-medium">Auto-Expired Stockouts</div>
                    <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
                      {status?.lastAutoExpiredCount || 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Architecture Testing & Verification Sandbox */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/40 via-white to-purple-50/30 shadow-2xs">
              <CardHeader className="pb-3 border-b border-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-indigo-950 flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-indigo-600" />
                      AI Recommendation Architecture Verification Sandbox
                    </CardTitle>
                    <CardDescription className="text-xs text-indigo-900/80 mt-1">
                      Test how the autonomous agent detects stockouts, selects donor stores, and creates recommendations in real-time.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StandardButton
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={restoreInventoryMutation.isPending || resetStockMutation.isPending}
                      loadingText="Restoring..."
                      onClick={() => restoreInventoryMutation.mutate({ storeCode: "BPL-001" })}
                      className="h-8 text-xs font-semibold border-slate-300"
                      title="Restore all 103 SKUs at Bhopal store to healthy 45 units baseline stock"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore Inventory Baseline (Bhopal)
                    </StandardButton>

                    <StandardButton
                      type="button"
                      size="sm"
                      loading={bulkDepleteMutation.isPending}
                      loadingText="Setting 0 Stock..."
                      onClick={() => bulkDepleteMutation.mutate({ storeCode: "BPL-001" })}
                      className="h-8 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                      title="Set available stock to 0 for all 103 products at Bhopal to test high-volume AI processing"
                    >
                      <Zap className="h-3.5 w-3.5 mr-1 fill-current" />
                      ⚡ Bulk 0 Stock: All 103 SKUs
                    </StandardButton>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={simulateStockoutMutation.isPending}
                      onClick={() => simulateStockoutMutation.mutate({ storeCode: "BPL-001", sku: "SKU-1001" })}
                      className="h-8 text-xs font-medium border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      title="Inject single SKU-1001 stockout"
                    >
                      Single SKU-1001 Test
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 text-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] items-center justify-center font-bold">1</span>
                      Inject Critical Stockout
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Sets Bhopal Store (<code className="font-mono">BPL-001</code>) on-hand stock for <code className="font-mono">SKU-1001</code> to 0 units with high velocity.
                    </p>
                  </div>

                  <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] items-center justify-center font-bold">2</span>
                      Autonomous 5-Min Scan
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      When the countdown ticks to zero, the background engine scans 4,558 pairs and detects Bhopal's stockout in under 900ms.
                    </p>
                  </div>

                  <div className="rounded-lg border border-indigo-100 bg-white/80 p-3">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] items-center justify-center font-bold">3</span>
                      AI Donor Ranking & Action
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      AI picks Indore Vijay Nagar (<code className="font-mono">IND-001</code>) with 110d DOI and pushes an optimal 25-unit transfer to the Action Center.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SUB-SECTION: Recurring Periodic Interval (Minutes / Hours) */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      Recurring Periodic Interval (Configurable: Minutes / Hours)
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Executes an automated sweep every N minutes or hours. Recommended: 5 minutes for rapid testing, 1-2 hours for production.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Label htmlFor="hourly-toggle" className="text-xs font-semibold cursor-pointer">
                      Periodic Interval Scan
                    </Label>
                    <Switch
                      id="hourly-toggle"
                      checked={Boolean(status?.hourlyEnabled)}
                      onCheckedChange={(checked) => {
                        updateConfigMutation.mutate({ hourlyEnabled: checked });
                      }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div
                  className={cn(
                    "p-3 rounded-lg border text-xs flex items-start gap-2.5",
                    status?.hourlyEnabled
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-800"
                      : "bg-slate-50 border-slate-200 text-slate-700",
                  )}
                >
                  {status?.hourlyEnabled ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {status?.hourlyEnabled
                        ? `Recurring Scan Active: Running every ${status.intervalValue} ${status.intervalUnit === "MINUTES" ? "Minute(s)" : "Hour(s)"}`
                        : "Recurring Interval Scan is currently Disabled"}
                    </div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      {status?.hourlyEnabled
                        ? `The background engine executes automatically every ${status.hourlyIntervalMinutes} minute(s). Next sweep will trigger in: ${formattedCountdown}.`
                        : "Enable this toggle to initiate automated sweeps at the chosen frequency for continuous testing."}
                    </div>
                  </div>
                </div>

                {/* Interval Frequency Input + Unit Selector */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold">
                    Set Automated Scan Frequency
                  </Label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Input with Unit Toggle */}
                    <div className="flex items-center max-w-sm">
                      <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-600 bg-slate-100 border border-r-0 border-slate-300 rounded-l-md h-10 select-none">
                        Run Every
                      </span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={intervalValueInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setIntervalValueInput(val);
                        }}
                        placeholder="5"
                        className="font-mono text-center font-bold text-sm h-10 rounded-none border-slate-300 w-24 focus:ring-1"
                      />

                      {/* Unit Selector: Minutes vs Hours */}
                      <div className="inline-flex rounded-r-md border border-l-0 border-slate-300 bg-slate-100 p-0.5 h-10 items-center">
                        <button
                          type="button"
                          onClick={() => setIntervalUnitInput("MINUTES")}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-xs transition-colors",
                            intervalUnitInput === "MINUTES"
                              ? "bg-white text-indigo-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900",
                          )}
                        >
                          Minutes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntervalUnitInput("HOURS")}
                          className={cn(
                            "px-2.5 py-1 text-xs font-bold rounded-xs transition-colors",
                            intervalUnitInput === "HOURS"
                              ? "bg-white text-indigo-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900",
                          )}
                        >
                          Hours
                        </button>
                      </div>
                    </div>

                    {/* Presets based on selected unit */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground mr-1">Testing Presets:</span>
                      {intervalUnitInput === "MINUTES" ? (
                        <>
                          {[1, 2, 5, 10, 15, 30].map((mins) => (
                            <Button
                              key={mins}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIntervalValueInput(String(mins));
                              }}
                              className={cn(
                                "h-8 px-2.5 text-xs font-mono font-medium",
                                intervalValueInput === String(mins) &&
                                  "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold",
                              )}
                            >
                              {mins === 5 ? "5m (Test)" : `${mins}m`}
                            </Button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[1, 2, 4, 8, 12, 24].map((hrs) => (
                            <Button
                              key={hrs}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIntervalValueInput(String(hrs));
                              }}
                              className={cn(
                                "h-8 px-2.5 text-xs font-mono font-medium",
                                intervalValueInput === String(hrs) &&
                                  "border-indigo-600 bg-indigo-50 text-indigo-700 font-bold",
                              )}
                            >
                              {hrs}h
                            </Button>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="sm:ml-auto">
                      <StandardButton
                        type="button"
                        size="sm"
                        loading={updateConfigMutation.isPending}
                        loadingText="Saving..."
                        onClick={handleSaveIntervalSettings}
                        className="h-10 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Save & Apply Interval
                      </StandardButton>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* RECENT AUTOMATED SWEEPS EXECUTION LOG */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-700" />
                      Recent Automated Sweeps Execution Log (Live Ring Buffer)
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Historical log of automated background sweeps with page-based browsing (up to 10 pages).
                    </CardDescription>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                    Max 50 Records (Up to 10 Pages)
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Timestamp</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Trigger Source</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Execution Latency</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Pairs Evaluated</th>
                        <th className="py-2.5 px-4 text-center font-semibold">AI Recs Created</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Auto-Expired</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedExecutions && paginatedExecutions.length > 0 ? (
                        paginatedExecutions.map((exec) => (
                          <tr key={exec.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-foreground">
                              {new Date(exec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-4">
                              <span
                                className={cn(
                                   "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                                  exec.type === "HOURLY"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : exec.type === "WAVE"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800",
                                )}
                              >
                                {exec.type === "HOURLY" ? "PERIODIC TIMER" : exec.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              {exec.durationMs} ms
                            </td>
                            <td className="py-2.5 px-4 font-mono">
                              {exec.evaluatedPairs.toLocaleString()} pairs
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full font-bold font-mono text-xs",
                                  exec.createdRecs > 0
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "text-muted-foreground",
                                )}
                              >
                                {exec.createdRecs}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                              {exec.autoExpiredCount}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No sweep executions recorded in this session yet. Sweeps will appear here automatically every cycle.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls (Max 10 Pages) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const count = totalLogItems;
                      const startItem = count === 0 ? 0 : (logPage - 1) * LOG_PAGE_SIZE + 1;
                      const endItem = Math.min(logPage * LOG_PAGE_SIZE, count);
                      return (
                        <span className="font-medium text-slate-600">
                          {count === 0
                            ? "Showing 0 sweeps"
                            : `Showing ${startItem}-${endItem} of ${count} sweeps`}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous Page"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                      <input
                        type="number"
                        min={1}
                        max={totalLogPages}
                        value={logPageInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setLogPageInput(val);
                        }}
                        onBlur={() => handleLogPageCommit(logPageInput)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleLogPageCommit(logPageInput);
                          }
                        }}
                        className="h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-center font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-slate-500 font-medium">of {totalLogPages}</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={logPage >= totalLogPages}
                      onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                      aria-label="Next Page"
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SUB-SECTION 1: Operational Shift Waves (Exact Scheduled Times) */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                      Operational Shift Waves (Exact Scheduled Times)
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Runs high-velocity network balance sweeps aligned with store opening, shift changes, and warehouse picking waves.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Label htmlFor="waves-toggle" className="text-xs font-semibold cursor-pointer">
                      Operational Waves
                    </Label>
                    <Switch
                      id="waves-toggle"
                      checked={Boolean(status?.wavesEnabled)}
                      onCheckedChange={(checked) => {
                        updateConfigMutation.mutate({ wavesEnabled: checked });
                      }}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Wave Time</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Shift / Operational Purpose</th>
                        <th className="py-2.5 px-4 text-left font-semibold">Audit Actor</th>
                        <th className="py-2.5 px-4 text-center font-semibold">Status</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {status?.waveHours && status.waveHours.length > 0 ? (
                        status.waveHours.map((hhmm) => {
                          const purpose = SHIFT_PURPOSES[hhmm] || {
                            title: "Custom Shift Wave Sweep",
                            subtitle: "Automated replenishment calculation at scheduled hour.",
                            actor: "SYS-CRON-WAVE",
                          };
                          return (
                            <tr key={hhmm} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-foreground">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">
                                    {formatTo12Hour(hhmm)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono">({hhmm})</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-foreground">{purpose.title}</div>
                                <div className="text-[11px] text-muted-foreground">{purpose.subtitle}</div>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                                {purpose.actor}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                    status.wavesEnabled
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-600",
                                  )}
                                >
                                  {status.wavesEnabled ? "Active" : "Paused"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={status.waveHours.length <= 1 || deleteWaveMutation.isPending}
                                  onClick={() => deleteWaveMutation.mutate(hhmm)}
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                  title={status.waveHours.length <= 1 ? "At least one wave time must remain" : "Remove wave time"}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No operational wave times configured. Click below to add one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Wave sweeps execute automatically at the configured hours when the server is active.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddWaveModalOpen(true)}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Shift Wave Time</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* SUB-SECTION 3: Auto-Healing Policies & Donor Protection */}
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Self-Healing & Supply Chain Protection Policies
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Automated resolution safeguards and inventory health parameters enforced across all scans.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Auto-Expiration Switch */}
                  <div className="rounded-lg border border-border p-4 space-y-3 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-foreground">
                          Auto-Expire Normalized Recommendations
                        </span>
                      </div>
                      <Switch
                        checked={Boolean(status?.autoExpireEnabled)}
                        onCheckedChange={(checked) => {
                          updateConfigMutation.mutate({ autoExpire: checked });
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Automatically marks pending recommendations as <code className="font-mono text-xs">AUTO_EXPIRED</code> when the destination store receives inward stock receipts raising stock above ROP.
                    </p>
                  </div>

                  {/* Donor Protection Safeguard Floor */}
                  <div className="rounded-lg border border-border p-4 space-y-3 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-foreground">
                          Donor Store Protection Floor
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        7.0 Days DOI Floor
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Hard constraint enforced during recommendation calculation: donor stores must retain at least 7.0 days of inventory to ensure donating stock does not induce a secondary stockout.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Add Shift Wave Time Dialog */}
      <Dialog open={isAddWaveModalOpen} onOpenChange={setIsAddWaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" />
              Add Operational Shift Wave Time
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a daily scheduled time for the automated rebalance scan engine.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Wave Time (24-Hour Format HH:mm)</Label>
              <Input
                type="time"
                step="60"
                value={newWaveTime}
                onChange={(e) => setNewWaveTime(e.target.value)}
                className="font-mono text-base h-11 text-center font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quick Time Presets:</Label>
              <div className="flex flex-wrap gap-1.5">
                {["08:00", "12:00", "16:00", "18:00", "20:00", "22:00"].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewWaveTime(preset)}
                    className={cn(
                      "h-7 text-xs font-mono",
                      newWaveTime === preset && "bg-blue-50 border-blue-400 font-bold text-blue-700",
                    )}
                  >
                    {formatTo12Hour(preset)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Shift Wave Purpose (Optional)</Label>
              <Input
                type="text"
                value={newWavePurpose}
                onChange={(e) => setNewWavePurpose(e.target.value)}
                placeholder="e.g. Evening Shift Handover Rebalance"
                className="text-xs h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddWaveModalOpen(false)}
            >
              Cancel
            </Button>
            <StandardButton
              type="button"
              size="sm"
              loading={addWaveMutation.isPending}
              loadingText="Adding Wave..."
              onClick={() => addWaveMutation.mutate(newWaveTime)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Wave Time</span>
            </StandardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ConfigurationsPage;
