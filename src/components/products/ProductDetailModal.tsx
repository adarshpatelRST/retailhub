import * as React from "react";
import {
  Barcode,
  Layers,
  Package,
  Tag,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils";
import { type ProductItem } from "@/api/product.api";

export interface ProductDetailModalProps {
  product: ProductItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  open,
  onOpenChange,
}) => {
  if (!product) return null;

  const customerSavings = Math.max(0, product.mrp - product.sellingPrice);
  const discountPercent =
    product.mrp > 0
      ? ((customerSavings / product.mrp) * 100).toFixed(1)
      : "0.0";
  const grossMargin = product.sellingPrice - product.costPrice;
  const grossMarginPercent =
    product.sellingPrice > 0
      ? ((grossMargin / product.sellingPrice) * 100).toFixed(1)
      : "0.0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full h-dvh sm:h-auto sm:max-w-xl overflow-y-auto pb-20 sm:pb-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {product.sku}
            </span>
            <StatusBadge
              status={product.isActive ? "HEALTHY" : "REJECTED"}
              label={product.isActive ? "ACTIVE SKU" : "INACTIVE"}
            />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight mt-1">
            {product.name}
          </DialogTitle>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {product.description}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* D-Mart Value Pricing Spread Banner */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              D-Mart Value Pricing &amp; Margin Spread
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">MRP</div>
                <div className="text-sm font-mono line-through text-muted-foreground mt-0.5">
                  {formatCurrency(product.mrp)}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  Save {formatCurrency(customerSavings)} ({discountPercent}%)
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Store Selling Price
                </div>
                <div className="text-lg font-mono font-bold text-primary mt-0.5">
                  {formatCurrency(product.sellingPrice)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Per {product.unitOfMeasure}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Landed Cost &amp; Margin
                </div>
                <div className="text-sm font-mono font-semibold text-foreground mt-0.5">
                  {formatCurrency(product.costPrice)}
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 mt-0.5">
                  <TrendingUp className="h-3 w-3" />
                  <span>+{grossMarginPercent}% Margin</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Barcode className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  EAN / Barcode (Product Code)
                </div>
                <div className="font-mono font-semibold">
                  {product.productCode}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Unit of Measure (UOM)
                </div>
                <div className="font-mono font-semibold">
                  {product.unitOfMeasure}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Tag className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Brand</div>
                <div className="font-medium">
                  {product.brandName ?? product.brandCode ?? product.brandId}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Layers className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="font-medium">
                  {product.categoryName ??
                    product.categoryCode ??
                    product.categoryId}
                </div>
              </div>
            </div>
          </div>

          {/* Network Inventory Summary */}
          <div className="flex items-center justify-between rounded-md border bg-primary/5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Warehouse className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Total Network Store Inventory
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {formatDateTime(product.updatedAt)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-lg font-bold text-foreground">
                {formatNumber(product.totalStockUnits ?? 0)}
              </span>
              <span className="ml-1 text-xs font-mono text-muted-foreground">
                {product.unitOfMeasure}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background flex justify-end gap-2 sm:static sm:border-t-0 sm:p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
