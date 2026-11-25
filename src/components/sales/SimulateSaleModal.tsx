import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, ShoppingBag, Store, Tag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { apiClient } from "@/api/client";
import { useStores } from "@/hooks/useStores";
import { formatCurrency, formatNumber } from "@/lib/utils";

export interface SimulateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleSuccess?: () => void;
  defaultStoreId?: string | null;
}

interface StoreInventoryItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  availableQuantity: number;
  unitOfMeasure: string;
  sellingPrice: number;
  costPrice: number;
}

export const SimulateSaleModal: React.FC<SimulateSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleSuccess,
  defaultStoreId,
}) => {
  const queryClient = useQueryClient();
  const { stores = [] } = useStores();

  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("");
  const [selectedProductId, setSelectedProductId] = React.useState<string>("");
  const [quantityInput, setQuantityInput] = React.useState<string>("1.000");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize or synchronize selected store
  React.useEffect(() => {
    if (isOpen) {
      if (defaultStoreId && defaultStoreId !== "ALL") {
        setSelectedStoreId(defaultStoreId);
      } else if (stores.length > 0 && !selectedStoreId) {
        setSelectedStoreId(stores[0].id);
      }
      setQuantityInput("1.000");
      setIsSubmitting(false);
    }
  }, [isOpen, defaultStoreId, stores]);

  // Fetch inventory for the currently selected store to provide live stock options
  const { data: storeInventory = [], isLoading: isInventoryLoading } = useQuery<StoreInventoryItem[]>({
    queryKey: ["inventory", "store-options", selectedStoreId],
    queryFn: async () => {
      if (!selectedStoreId) return [];
      const res = await apiClient.get<any>("/inventory", {
        params: { storeId: selectedStoreId, limit: 300 },
      });
      const items = res.data?.data?.items || res.data?.items || [];
      return items.map((inv: any) => ({
        id: inv.id,
        productId: inv.productId,
        sku: inv.sku,
        productName: inv.productName,
        availableQuantity: Number(inv.availableQuantity) || 0,
        unitOfMeasure: inv.unitOfMeasure === "PIECE" ? "Units" : (inv.unitOfMeasure || "Units"),
        sellingPrice: Number(inv.sellingPrice) || 0,
        costPrice: Number(inv.costPrice) || 0,
      }));
    },
    enabled: Boolean(isOpen && selectedStoreId),
    staleTime: 10_000,
  });

  // Automatically select first available product when inventory loads
  React.useEffect(() => {
    if (storeInventory.length > 0 && (!selectedProductId || !storeInventory.some((i) => i.productId === selectedProductId))) {
      setSelectedProductId(storeInventory[0].productId);
    }
  }, [storeInventory, selectedProductId]);

  const storeItems: ComboboxItem[] = React.useMemo(() => {
    return stores.map((s) => ({
      id: s.id,
      label: `${s.storeCode} — ${s.name} (${s.city})`,
      subLabel: `Store Code: ${s.storeCode} · City: ${s.city}`,
      badgeText: s.city || undefined,
    }));
  }, [stores]);

  const productItems: ComboboxItem[] = React.useMemo(() => {
    return storeInventory.map((item) => ({
      id: item.productId,
      label: `${item.sku} · ${item.productName}`,
      subLabel: `Available: ${item.availableQuantity.toFixed(3)} ${item.unitOfMeasure} · Price: ${formatCurrency(item.sellingPrice || Math.round(item.costPrice * 1.25))}`,
      badgeText: item.availableQuantity <= 0 ? "OUT OF STOCK" : `${item.availableQuantity.toFixed(0)} ${item.unitOfMeasure} Avail`,
    }));
  }, [storeInventory]);

  const selectedItem = React.useMemo(() => {
    return storeInventory.find((i) => i.productId === selectedProductId) || null;
  }, [storeInventory, selectedProductId]);

  const availableStock = selectedItem?.availableQuantity ?? 0;
  const parsedQty = parseFloat(quantityInput);
  const isValidQty = Number.isFinite(parsedQty) && parsedQty > 0;
  const isExceeding = isValidQty && parsedQty > availableStock;
  const projectedRemaining = isValidQty ? Math.max(0, availableStock - parsedQty) : availableStock;
  const uom = selectedItem?.unitOfMeasure || "Units";
  const unitPrice = selectedItem?.sellingPrice || (selectedItem ? Math.round(selectedItem.costPrice * 1.25) : 0);
  const projectedAmount = isValidQty ? parsedQty * unitPrice : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId || !selectedProductId || !isValidQty) {
      toast.error("Please select a store, product SKU, and enter a valid quantity.");
      return;
    }
    if (isExceeding) {
      toast.error(
        `Sale quantity (${parsedQty.toFixed(3)}) cannot exceed available stock (${availableStock.toFixed(3)} ${uom}).`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post<any>("/sales/simulate", {
        storeId: selectedStoreId,
        productId: selectedProductId,
        quantity: parsedQty,
      });

      const data = res.data?.data || res.data;
      toast.success(
        `POS Sale simulated successfully! Invoice: ${data.invoiceNumber}. Remaining stock: ${data.newAvailableQuantity} ${uom}.`,
      );

      // Invalidate both sales and inventory caches
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });

      onSaleSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to simulate sales transaction.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md sm:max-w-lg p-0 overflow-hidden rounded-xl shadow-2xl">
        <DialogHeader className="border-b px-6 py-4 bg-slate-50">
          <DialogTitle className="text-base font-semibold flex items-center gap-2 text-slate-900">
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            Simulate POS Register Checkout
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record a real-time register transaction, decrement physical shelf stock, and generate POS audit lines.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Store Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-slate-500" />
              <span>Retail Store Location</span>
              <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <DropSearch
              items={storeItems}
              value={selectedStoreId}
              onChange={(val) => {
                setSelectedStoreId(val || "");
                setSelectedProductId("");
              }}
              placeholder="Select operational store..."
              searchPlaceholder="Search store code, name, or city..."
              width="w-full"
              className="h-9 text-xs bg-white border-slate-300"
            />
          </div>

          {/* Product SKU Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-500" />
                <span>Product SKU (Shelf Stock)</span>
                <span className="text-red-500 font-bold ml-0.5">*</span>
              </span>
              {isInventoryLoading && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading stock...
                </span>
              )}
            </Label>
            <DropSearch
              items={productItems}
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val || "")}
              disabled={isInventoryLoading || storeInventory.length === 0}
              placeholder={
                isInventoryLoading
                  ? "Loading stock balances..."
                  : storeInventory.length === 0
                  ? "No inventory balances loaded"
                  : "Search SKU or product name..."
              }
              searchPlaceholder="Filter by SKU or product name..."
              emptyMessage="No matching products found in this store."
              width="w-full"
              className="h-9 text-xs bg-white border-slate-300"
            />
          </div>

          {/* Available Stock Indicator Box */}
          {selectedItem && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Current Available Stock</span>
                <span className={`font-mono text-sm font-bold ${availableStock <= 0 ? "text-red-600" : "text-slate-900"}`}>
                  {availableStock.toFixed(3)} {uom}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Store Selling Price</span>
                <span className="font-mono text-sm font-bold text-emerald-700">
                  {formatCurrency(unitPrice)} / {uom}
                </span>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Sale Quantity ({uom}) <span className="text-red-500 font-bold ml-0.5">*</span>
              </Label>
              <span className="text-[11px] text-slate-500 font-mono">Max allowed: {availableStock.toFixed(3)}</span>
            </div>
            <Input
              type="number"
              min="0.001"
              max={availableStock > 0 ? availableStock : 0}
              step="any"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className={`h-9 font-mono text-xs bg-white border-slate-300 ${
                isExceeding ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
              placeholder="e.g. 5.000"
            />
            {isExceeding && (
              <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Quantity exceeds available shelf stock ({availableStock.toFixed(3)} {uom}).
              </p>
            )}
          </div>

          {/* Live Checkout Summary Box */}
          {selectedItem && isValidQty && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span>Projected Remaining Stock:</span>
                <span className={`font-mono font-bold ${projectedRemaining <= 0 ? "text-red-600" : "text-emerald-800"}`}>
                  {projectedRemaining.toFixed(3)} {uom}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Total Register Basket Value:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {formatCurrency(projectedAmount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="h-9 px-4 text-xs">
              Cancel
            </Button>
            <StandardButton
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedStoreId || !selectedProductId || !isValidQty || isExceeding || availableStock <= 0}
              className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 px-5 text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  <span>Post POS Sale</span>
                </>
              )}
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
