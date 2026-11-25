import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiClient, type ApiEnvelope } from "@/api/client";
import { useRegions, useStores } from "@/hooks/useStores";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { Button } from "@/components/ui/button";
import { StandardButton } from "@/components/ui/StandardButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SimulateStockoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SimulateStockoutModal: React.FC<SimulateStockoutModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const { data: regions = [], isLoading: isLoadingRegions } = useRegions();
  const { stores = [], isLoading: isLoadingStores } = useStores();

  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("ALL");

  // Region options for DropSearch
  const regionOptions: ComboboxItem[] = React.useMemo(() => {
    return (regions || []).map((r) => ({
      id: r.id,
      label: r.name,
      subLabel: `Code: ${r.regionCode || r.id}`,
    }));
  }, [regions]);

  // Store options filtered by selected region
  const storeOptions: ComboboxItem[] = React.useMemo(() => {
    let filtered = stores || [];
    if (selectedRegionId && selectedRegionId !== "ALL") {
      filtered = filtered.filter(
        (s) => s.regionId === selectedRegionId || (s as any).region?.id === selectedRegionId,
      );
    }
    return filtered.map((s) => ({
      id: s.id,
      label: s.name,
      subLabel: `${s.storeCode} · ${s.city || "Store"}`,
    }));
  }, [stores, selectedRegionId]);

  // Reset store selection when region changes
  const handleRegionChange = (newRegionId: string | null) => {
    setSelectedRegionId(newRegionId || "ALL");
    setSelectedStoreId("ALL");
  };

  // Deplete stock mutation
  const depleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiEnvelope<any>>("/inventory/bulk-deplete", {
        regionId: selectedRegionId,
        storeId: selectedStoreId,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
      toast.success(
        data?.message || "Stock successfully cleared to 0.000 for selected target.",
      );
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to clear stock to 0.");
    },
  });

  // Restore stock baseline mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiEnvelope<any>>("/inventory/restore-baseline", {
        regionId: selectedRegionId,
        storeId: selectedStoreId,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
      toast.success(
        data?.message || "Healthy baseline stock (45 units) restored for selected target.",
      );
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to restore baseline stock.");
    },
  });

  // Target summary display
  const targetLabel = React.useMemo(() => {
    if (selectedStoreId && selectedStoreId !== "ALL") {
      const st = stores.find((s) => s.id === selectedStoreId);
      return st ? `${st.name} (${st.storeCode})` : "Selected Store";
    }
    if (selectedRegionId && selectedRegionId !== "ALL") {
      const reg = regions.find((r) => r.id === selectedRegionId);
      return reg ? `All Stores in ${reg.name} Region` : "Selected Region";
    }
    return "All Stores across the entire Network";
  }, [selectedRegionId, selectedStoreId, stores, regions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Simulate 0-Stockout Test (Test Utility)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Set on-hand available stock to 0.000 to test automated rebalance scan detection.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Info Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold">QA & AI Engine Testing Utility</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Clearing stock to 0 units triggers real-time <code className="font-mono text-rose-700">CRITICAL STOCKOUT</code> status (0.0d DOI), allowing the autonomous rebalance agent to evaluate donor stores and create replenishment proposals.
              </p>
            </div>
          </div>

          {/* Region DropSearch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Select Region Scope
            </label>
            <DropSearch
              items={regionOptions}
              options={regionOptions}
              value={selectedRegionId}
              onChange={handleRegionChange}
              onSelect={handleRegionChange}
              placeholder={isLoadingRegions ? "Loading regions..." : "Select Region..."}
              searchPlaceholder="Search region name or code..."
              allOption={{ id: "ALL", label: "All Enterprise Regions (Network-wide)" }}
              width="w-full"
            />
          </div>

          {/* Store DropSearch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Select Store Target
            </label>
            <DropSearch
              items={storeOptions}
              options={storeOptions}
              value={selectedStoreId}
              onChange={(val) => setSelectedStoreId(val || "ALL")}
              onSelect={(val) => setSelectedStoreId(val || "ALL")}
              placeholder={isLoadingStores ? "Loading stores..." : "Select Store Target..."}
              searchPlaceholder="Search store code, name, city..."
              allOption={{
                id: "ALL",
                label:
                  selectedRegionId !== "ALL"
                    ? "All Stores in Selected Region"
                    : "All Network Stores",
              }}
              width="w-full"
            />
          </div>

          {/* Target Impact Preview */}
          <div className="rounded-md border bg-slate-50 p-2.5 text-xs">
            <div className="text-[11px] text-muted-foreground font-medium">Target Scope:</div>
            <div className="font-bold text-rose-700 font-mono text-xs mt-0.5 flex items-center gap-1.5">
              <span>{targetLabel}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <StandardButton
              type="button"
              size="sm"
              variant="outline"
              loading={restoreMutation.isPending}
              loadingText="Restoring..."
              onClick={() => restoreMutation.mutate()}
              className="text-xs font-semibold text-slate-700 border-slate-300"
              title="Restore healthy baseline stock (45 units) for selected target"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restore 45 KG Baseline
            </StandardButton>

            <StandardButton
              type="button"
              size="sm"
              loading={depleteMutation.isPending}
              loadingText="Clearing to 0..."
              onClick={() => depleteMutation.mutate()}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Zap className="h-3.5 w-3.5 mr-1 fill-current" />
              Clear Stock to 0
            </StandardButton>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
