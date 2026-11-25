import * as React from "react";
import { AlertTriangle, Loader2, Radar, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { useAuth } from "@/context/AuthContext";
import { useRegions, useStores } from "@/hooks/useStores";
import { useActionMutations } from "@/hooks/useActionMutations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { actionCenterApi } from "@/api/action-center.api";
import { toast } from "sonner";

export interface RunIntelligenceScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RunIntelligenceScanModal: React.FC<RunIntelligenceScanModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
  const isRegionalMgr = user?.role === "REGIONAL_MANAGER";
  const isStoreMgr = user?.role === "STORE_MANAGER";

  const { data: regions = [] } = useRegions();
  const { stores: allStores = [] } = useStores();
  const { intelligenceScanMutation } = useActionMutations();
  const queryClient = useQueryClient();

  // Active AI Model Configuration & Dynamic Switching
  const { data: modelConfig } = useQuery({
    queryKey: ["ai-model-config"],
    queryFn: () => actionCenterApi.getModelConfig(),
    staleTime: 30_000,
    enabled: open,
  });

  const switchModelMutation = useMutation({
    mutationFn: (newModel: string) => actionCenterApi.switchModel(newModel),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-config"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(`Active reasoning model switched to ${data?.activeModelName || "new model"}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || "Failed to switch AI model");
    },
  });

  // Available AI models for dropdown selection
  const modelItems = React.useMemo<ComboboxItem[]>(() => {
    const list = modelConfig?.availableModels ?? modelConfig?.models ?? [];
    if (list.length > 0) {
      return list.map((m: any) => ({
        id: m.id,
        label: m.name,
        subLabel: m.description,
      }));
    }
    return [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash (Production Default)",
        subLabel: "High-speed, low-latency multimodal reasoning optimized for high-volume inventory rebalancing.",
      },
      {
        id: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash (High Capacity)",
        subLabel: "Next-generation Gemini architecture with accelerated inference and enhanced mathematical precision.",
      },
      {
        id: "gemini-3.1-pro-preview",
        label: "Gemini 3.1 Pro (Deep Multi-Echelon)",
        subLabel: "Advanced reasoning model with deep contextual window for complex cross-regional supply chain constraints.",
      },
      {
        id: "deterministic-rule-engine",
        label: "Deterministic Rule Engine (Offline Fallback)",
        subLabel: "Zero-latency, strictly deterministic rule-based generator that runs entirely offline without external API dependencies.",
      },
    ];
  }, [modelConfig]);

  // Region and store scope state
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("ALL");

  // Filter accessible regions based on RBAC
  const accessibleRegions = React.useMemo(() => {
    if (isAdminOrExec) return regions;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      return regions.filter((r: any) => assigned.includes(r.id));
    }
    return [];
  }, [regions, isAdminOrExec, isRegionalMgr, user]);

  const userAssignedStore = React.useMemo(() => {
    if (!isStoreMgr) return null;
    const storeId = user?.assignedStoreIds?.[0];
    return allStores.find((s) => s.id === storeId) || allStores[0] || null;
  }, [isStoreMgr, user, allStores]);

  // Set default scopes when modal opens
  React.useEffect(() => {
    if (open) {
      if (isStoreMgr) {
        const sId = user?.assignedStoreIds?.[0] || allStores[0]?.id || "";
        setSelectedStoreId(sId);
        const sObj = allStores.find((s) => s.id === sId);
        setSelectedRegionId(sObj?.regionId || "ALL");
      } else if (isRegionalMgr && accessibleRegions.length > 0) {
        setSelectedRegionId(accessibleRegions[0].id);
        setSelectedStoreId("ALL");
      } else {
        setSelectedRegionId("ALL");
        setSelectedStoreId("ALL");
      }
    }
  }, [open, isStoreMgr, isRegionalMgr, accessibleRegions, user, allStores]);

  const regionOptions = React.useMemo<ComboboxItem[]>(() => {
    return accessibleRegions.map((r: any) => ({
      id: r.id,
      label: r.name,
      subLabel: r.code || r.regionCode,
    }));
  }, [accessibleRegions]);

  // Stores cascading from selected region
  const storeOptions = React.useMemo<ComboboxItem[]>(() => {
    let source = allStores;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      source = allStores.filter((s) => assigned.includes(s.regionId));
    }
    if (selectedRegionId && selectedRegionId !== "ALL") {
      source = source.filter((s) => s.regionId === selectedRegionId);
    }
    return source.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.storeCode})`,
      subLabel: `${(s as any).city || ""} · ${s.region?.name || ""}`,
    }));
  }, [allStores, isRegionalMgr, user, selectedRegionId]);

  const handleRegionChange = (newRegionId: string | null) => {
    const val = newRegionId || "ALL";
    setSelectedRegionId(val);
    setSelectedStoreId("ALL");
  };

  const isScanning = intelligenceScanMutation.isPending;

  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isScanning) return; // Prevent spamming duplicate clicks

    const targetStoreId = isStoreMgr
      ? user?.assignedStoreIds?.[0] || selectedStoreId
      : selectedStoreId === "ALL"
        ? undefined
        : selectedStoreId;

    const targetRegionId = isStoreMgr
      ? undefined
      : isRegionalMgr
        ? accessibleRegions[0]?.id || undefined
        : selectedRegionId === "ALL"
          ? undefined
          : selectedRegionId;

    await intelligenceScanMutation.mutateAsync({
      regionId: targetRegionId,
      storeId: targetStoreId,
    });

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isScanning) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Radar className="h-4 w-4 size-4 shrink-0" />
            </div>
            <span>Run Intelligence Network Scan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed pt-1">
            Execute the multi-echelon stockout evaluation engine to analyze velocity patterns,
            evaluate peer donor candidate buffers (&gt; 7d DOI floor), and generate AI-justified
            rebalancing recommendations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleStartScan} className="space-y-4 py-2">
          {/* Advisory Notice */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Resource &amp; LLM Execution Advisory</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              This process evaluates store-SKU velocity combinations and queries the Google Gemini AI
              reasoning model. Once triggered, the background scan cannot be cancelled or aborted.
            </p>
          </div>

          {/* AI REASONING MODEL SELECTOR */}
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                AI Reasoning Engine
              </Label>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                {modelConfig?.activeModelName || "Google Gemini 2.5 Flash"}
              </span>
            </div>

            {isAdminOrExec ? (
              <div className="space-y-1">
                <DropSearch
                  items={modelItems}
                  value={modelConfig?.activeModel || "gemini-2.5-flash"}
                  onChange={(newModel) => {
                    if (newModel && newModel !== modelConfig?.activeModel) {
                      switchModelMutation.mutate(newModel);
                    }
                  }}
                  placeholder="Select AI Model..."
                  searchPlaceholder="Search available LLM models..."
                  disabled={isScanning || switchModelMutation.isPending}
                  width="w-full"
                  className="h-9 text-xs bg-white"
                />
                <p className="text-[11px] text-purple-700/80 leading-relaxed">
                  Admins and VP Retail Operations can switch LLM reasoning providers on-the-fly. Switched models are tracked in the audit logs.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-purple-700/80 leading-relaxed">
                Operating with enterprise engine: <span className="font-semibold text-purple-950">{modelConfig?.activeModelName || "Google Gemini 1.5 Flash"}</span>. Only Platform Admins and VP Retail Operations can switch models.
              </p>
            )}
          </div>

          {/* STORE MANAGER: Fixed Scope Display */}
          {isStoreMgr && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                Assigned Store Target
              </Label>
              <div className="font-semibold text-slate-900 text-sm">
                {userAssignedStore?.name || "Bhopal MP Nagar Store"}
                <span className="font-mono text-xs font-normal text-slate-500 ml-2">
                  ({userAssignedStore?.storeCode || "BPL-001"})
                </span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Scan will evaluate SKU replenishment projections and peer donor stores specifically
                for your assigned store location.
              </p>
            </div>
          )}

          {/* REGIONAL MANAGER: Read-Only Region Display */}
          {isRegionalMgr && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Assigned Region
              </Label>
              <div className="h-9 px-3 rounded-md border border-slate-200 bg-slate-100 flex items-center justify-between text-xs text-slate-800 font-medium">
                <span>{accessibleRegions[0]?.name || "Central MP (Bhopal & Narmadapuram)"}</span>
                <span className="font-mono text-[10px] text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
                  {accessibleRegions[0]?.regionCode || "ASSIGNED"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Region is fixed to your assigned jurisdiction.
              </p>
            </div>
          )}

          {/* ADMIN / EXECUTIVE: Interactive Region Dropdown */}
          {isAdminOrExec && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Region Scope <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <DropSearch
                items={regionOptions}
                value={selectedRegionId}
                onChange={handleRegionChange}
                allOption={{ id: "ALL", label: "All Enterprise Regions (Entire Network)" }}
                placeholder="Select Region Scope..."
                searchPlaceholder="Search region name or code..."
                disabled={isScanning}
                width="w-full"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Scan all enterprise stores simultaneously or target a specific operational region.
              </p>
            </div>
          )}

          {/* Store Scope Filter (Visible for Admin, Exec, and Regional Manager) */}
          {!isStoreMgr && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Store Scope <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <DropSearch
                items={storeOptions}
                value={selectedStoreId}
                onChange={(val) => setSelectedStoreId(val || "ALL")}
                allOption={{
                  id: "ALL",
                  label:
                    selectedRegionId === "ALL"
                      ? "All Stores in Selected Network"
                      : "All Stores in Selected Region",
                }}
                placeholder="Select Store Scope..."
                searchPlaceholder="Search store code or city..."
                disabled={isScanning}
                width="w-full"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-slate-400">
                Target a specific destination store or evaluate all stores in the selected scope.
              </p>
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isScanning}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <StandardButton
              type="submit"
              disabled={isScanning}
              className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin mr-1.5" />
                  <span>Evaluating Network &amp; Running AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 size-3.5 mr-1.5" />
                  <span>
                    Start Scan (
                    {isStoreMgr
                      ? "Assigned Store"
                      : selectedStoreId !== "ALL"
                        ? "1 Store"
                        : selectedRegionId !== "ALL"
                          ? "1 Region"
                          : "All Regions"}
                    )
                  </span>
                </>
              )}
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RunIntelligenceScanModal;
