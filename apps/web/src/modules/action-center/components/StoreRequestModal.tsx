import * as React from "react";
import { Loader2, PackagePlus } from "lucide-react";
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
import { useActionMutations } from "../hooks/useActionMutations";
import { useDataScope } from "@/context/DataScopeContext";

export interface StoreRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATALOG_PRODUCTS: Array<
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
  const { selectedStoreId } = useDataScope();
  const { createStoreRequestMutation } = useActionMutations();

  const [productId, setProductId] = React.useState<string | null>(
    CATALOG_PRODUCTS[0].id,
  );
  const [requestedQuantity, setRequestedQuantity] = React.useState<number>(15);
  const [reason, setReason] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const selectedProductMeta = React.useMemo(
    () => CATALOG_PRODUCTS.find((item) => item.id === productId) ?? null,
    [productId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setFormError("Please select a product SKU.");
      return;
    }
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setFormError("Requested quantity must be greater than 0 units.");
      return;
    }
    if (reason.trim().length < 5) {
      setFormError(
        "Please provide an operational reason of at least 5 characters.",
      );
      return;
    }

    setFormError(null);
    await createStoreRequestMutation.mutateAsync({
      storeId: selectedStoreId ?? "store-bhopal-004",
      productId,
      requestedQuantity,
      reason: reason.trim(),
      productLabel: selectedProductMeta?.label,
      productSku: selectedProductMeta?.sku,
      unitCost: selectedProductMeta?.unitCost,
    });

    setReason("");
    setRequestedQuantity(15);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-4 w-4 size-4 text-primary shrink-0" />
            <span>Request Store Stock Rebalance</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submit an urgent replenishment request. The Intelligence Engine
            automatically ranks peer donor stores within 300 km and attaches an
            AI executive briefing for the Regional Manager.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">Select Product SKU</Label>
            <DropSearch
              items={CATALOG_PRODUCTS}
              value={productId}
              onChange={(val) => setProductId(val)}
              placeholder="Search SKU or product name..."
              searchPlaceholder="Filter by SKU or product name..."
              width="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store-req-qty" className="text-xs">
              Requested Quantity (Units)
            </Label>
            <Input
              id="store-req-qty"
              type="number"
              min="1"
              step="1"
              value={requestedQuantity}
              onChange={(e) =>
                setRequestedQuantity(parseFloat(e.target.value) || 0)
              }
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store-req-reason" className="text-xs">
              Operational Reason / Local Demand Signal (&ge; 5 chars)
            </Label>
            <Textarea
              id="store-req-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Local festival surge expected this weekend; current gondola display down to 4 units..."
              className="text-xs"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {formError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createStoreRequestMutation.isPending}
            >
              Cancel
            </Button>
            <StandardButton
              type="submit"
              disabled={createStoreRequestMutation.isPending}
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
