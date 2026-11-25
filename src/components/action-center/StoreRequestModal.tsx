import * as React from "react";
import { Loader2, PackagePlus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useRegions, useStores } from "@/hooks/useStores";
import { useActionMutations } from "@/hooks/useActionMutations";
import { apiClient } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { actionCenterApi } from "@/api/action-center.api";
import { toast } from "sonner";

export interface StoreRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FALLBACK_PRODUCTS: Array<
  ComboboxItem & { sku: string; unitCost: number }
> = [
  {
    id: "prod-tata-tea-1kg",
    label: "Tata Tea Gold 1kg",
    subLabel: "SKU-GRO-101 • Beverages & Tea",
    badgeText: "₹485",
    sku: "SKU-GRO-101",
    unitCost: 485,
  },
  {
    id: "prod-fortune-oil-5l",
    label: "Fortune Sunlite Refined Oil 5L Jar",
    subLabel: "SKU-GRO-204 • Edible Oils & Ghee",
    badgeText: "₹710",
    sku: "SKU-GRO-204",
    unitCost: 710,
  },
  {
    id: "prod-surf-excel-2kg",
    label: "Surf Excel Matic Top Load 2kg",
    subLabel: "SKU-HPC-309 • Home & Fabric Care",
    badgeText: "₹390",
    sku: "SKU-HPC-309",
    unitCost: 390,
  },
  {
    id: "prod-haldiram-bhujia-1kg",
    label: "Haldiram's Bhujia Sev 1kg Family Pack",
    subLabel: "SKU-SNK-412 • Packaged Snacks",
    badgeText: "₹215",
    sku: "SKU-SNK-412",
    unitCost: 215,
  },
  {
    id: "prod-maggi-masala-560g",
    label: "Maggi 2-Minute Masala Noodles 560g",
    subLabel: "SKU-SNK-502 • Packaged Foods",
    badgeText: "₹112",
    sku: "SKU-SNK-502",
    unitCost: 112,
  },
  {
    id: "prod-aashirvaad-atta-10kg",
    label: "Aashirvaad Select Sharbati Atta 10kg",
    subLabel: "SKU-STA-118 • Staples & Flour",
    badgeText: "₹445",
    sku: "SKU-STA-118",
    unitCost: 445,
  },
];

export const StoreRequestModal: React.FC<StoreRequestModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
  const isRegionalMgr = user?.role === "REGIONAL_MANAGER";
  const isStoreMgr = user?.role === "STORE_MANAGER";

  const { data: regions = [] } = useRegions();
  const { stores: allStores = [] } = useStores();
  const { createStoreRequestMutation } = useActionMutations();
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

  // Query catalog products dynamically from API
  const { data: dbProducts = [] } = useQuery({
    queryKey: ["products", "catalog-selection"],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>("/products", {
          params: { page: 1, limit: 100 },
        });
        const items = res.data?.data?.items || res.data?.items || [];
        return items.map((p: any) => ({
          id: p.id,
          label: p.name,
          subLabel: `${p.sku} · ${p.category?.name || "General"}`,
          badgeText: `₹${p.costPrice || 100}`,
          sku: p.sku,
          unitCost: Number(p.costPrice || 100),
        }));
      } catch {
        return FALLBACK_PRODUCTS;
      }
    },
    staleTime: 60_000,
  });

  const productItems = dbProducts.length > 0 ? dbProducts : FALLBACK_PRODUCTS;

  // Region and Store Scope State
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
  const [productId, setProductId] = React.useState<string | null>(null);
  const [requestedQuantity, setRequestedQuantity] = React.useState<number>(15);
  const [qtyInputValue, setQtyInputValue] = React.useState<string>("15");
  const [reason, setReason] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);

  // Accessible regions based on RBAC
  const accessibleRegions = React.useMemo(() => {
    if (isAdminOrExec) return regions;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      return regions.filter((r: any) => assigned.includes(r.id));
    }
    return [];
  }, [regions, isAdminOrExec, isRegionalMgr, user]);

  const regionOptions = React.useMemo<ComboboxItem[]>(() => {
    return accessibleRegions.map((r: any) => ({
      id: r.id,
      label: r.name,
      subLabel: r.code || r.regionCode,
    }));
  }, [accessibleRegions]);

  // Stores cascading from selected region and RBAC
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

  // Initialize defaults on open
  React.useEffect(() => {
    if (open) {
      setProductId(productItems[0]?.id || null);
      setRequestedQuantity(15);
      setQtyInputValue("15");
      setReason("");
      setFormError(null);

      if (isStoreMgr) {
        setSelectedStoreId(user?.assignedStoreIds?.[0] || allStores[0]?.id || "");
      } else if (isRegionalMgr) {
        const assigned = user?.assignedRegionIds || [];
        const firstRegion = accessibleRegions[0]?.id || "ALL";
        setSelectedRegionId(firstRegion);
        const regionalStores = allStores.filter((s) => assigned.includes(s.regionId));
        setSelectedStoreId(regionalStores[0]?.id || allStores[0]?.id || "");
      } else {
        setSelectedRegionId("ALL");
        setSelectedStoreId(allStores[0]?.id || "");
      }
    }
  }, [open, isStoreMgr, isRegionalMgr, user, allStores, accessibleRegions, productItems]);

  const selectedProductMeta = React.useMemo(
    () => productItems.find((item: any) => item.id === productId) ?? null,
    [productId, productItems],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetStoreId = isStoreMgr
      ? user?.assignedStoreIds?.[0] || selectedStoreId
      : selectedStoreId;

    if (!targetStoreId) {
      setFormError("Please select a target store.");
      return;
    }
    if (!productId) {
      setFormError("Please select a product SKU.");
      return;
    }
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setFormError("Requested quantity must be greater than 0 units.");
      return;
    }
    if (reason.trim().length < 5) {
      setFormError("Please provide an operational reason of at least 5 characters.");
      return;
    }
    if (reason.length > 250) {
      setFormError("Operational reason cannot exceed 250 characters.");
      return;
    }

    setFormError(null);
    await createStoreRequestMutation.mutateAsync({
      storeId: targetStoreId,
      productId,
      requestedQuantity,
      reason: reason.trim(),
      productLabel: selectedProductMeta?.label,
      productSku: selectedProductMeta?.sku,
      unitCost: selectedProductMeta?.unitCost,
    });

    setReason("");
    setRequestedQuantity(15);
    setQtyInputValue("15");
    onOpenChange(false);
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setQtyInputValue(raw);
    if (raw.trim() === "") {
      setRequestedQuantity(0);
      return;
    }
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      setRequestedQuantity(parsed);
    }
  };

  const handleQtyBlur = () => {
    const parsed = parseFloat(qtyInputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQtyInputValue("1");
      setRequestedQuantity(1);
    } else {
      setQtyInputValue(String(parsed));
      setRequestedQuantity(parsed);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base text-slate-900">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <PackagePlus className="h-4 w-4 size-4 shrink-0" />
            </div>
            <span>Request Store Stock Rebalance</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submit an urgent replenishment request. The Intelligence Engine automatically
            ranks peer donor stores within 300 km and attaches an AI executive briefing
            for the Regional Manager.
          </p>

          {/* AI REASONING MODEL SELECTOR (Compact) */}
          <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 truncate">
                AI Engine:
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold border border-purple-200 truncate">
                {modelConfig?.activeModelName || "Gemini 2.5 Flash"}
              </span>
            </div>
            {isAdminOrExec && (
              <div className="w-52 shrink-0">
                <DropSearch
                  items={modelItems}
                  value={modelConfig?.activeModel || "gemini-2.5-flash"}
                  onChange={(newModel) => {
                    if (newModel && newModel !== modelConfig?.activeModel) {
                      switchModelMutation.mutate(newModel);
                    }
                  }}
                  placeholder="Switch Model..."
                  width="w-full"
                  className="h-8 text-xs bg-white"
                />
              </div>
            )}
          </div>

          {/* Region & Target Store (Side by Side Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isAdminOrExec && (
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Region <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <DropSearch
                  items={regionOptions}
                  value={selectedRegionId}
                  onChange={(val) => {
                    setSelectedRegionId(val || "ALL");
                    const filtered = allStores.filter((s) => !val || val === "ALL" || s.regionId === val);
                    setSelectedStoreId(filtered[0]?.id || "");
                  }}
                  allOption={{ id: "ALL", label: "All Enterprise Regions" }}
                  placeholder="Select Region..."
                  searchPlaceholder="Search region name or code..."
                  width="w-full"
                  className="h-9 text-xs bg-white border-slate-300"
                />
              </div>
            )}

            {!isStoreMgr && (
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Target Store <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <DropSearch
                  items={storeOptions}
                  value={selectedStoreId}
                  onChange={(val) => setSelectedStoreId(val || "")}
                  placeholder="Select Target Store..."
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-9 text-xs bg-white border-slate-300"
                />
              </div>
            )}
          </div>

          {/* Product SKU & Requested Quantity (Side by Side Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Select Product SKU <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <DropSearch
                items={productItems}
                value={productId}
                onChange={(val) => setProductId(val)}
                placeholder="Search SKU or product name..."
                searchPlaceholder="Filter by SKU or product name..."
                width="w-full"
                className="h-9 text-xs bg-white border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="store-req-qty" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Quantity (Units) <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <Input
                id="store-req-qty"
                type="number"
                min="1"
                step="1"
                value={qtyInputValue}
                onChange={handleQtyChange}
                onBlur={handleQtyBlur}
                placeholder="1"
                className="font-mono text-sm h-9 bg-white border-slate-300"
              />
            </div>
          </div>

          {/* 5. Operational Reason / Local Demand Signal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="store-req-reason" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Operational Reason / Local Demand Signal (≥ 5 chars){" "}
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {reason.length}/250 chars
              </span>
            </div>
            <Textarea
              id="store-req-reason"
              rows={2}
              maxLength={250}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Local festival surge expected this weekend; current gondola display down to 4 units..."
              className="text-xs resize-none overflow-y-auto max-h-[52px] h-[72px] bg-white border-slate-300"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
              {formError}
            </p>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createStoreRequestMutation.isPending}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <StandardButton
              type="submit"
              disabled={createStoreRequestMutation.isPending}
              className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createStoreRequestMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin mr-1.5" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Submit Rebalance Request</span>
              )}
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StoreRequestModal;
