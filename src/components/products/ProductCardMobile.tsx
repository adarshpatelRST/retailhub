import * as React from "react";
import { Barcode, Edit, Eye, Layers, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { type ProductItem } from "@/api/product.api";

export interface ProductCardMobileProps {
  product: ProductItem;
  onInspect: (product: ProductItem) => void;
  onEdit?: (product: ProductItem) => void;
}

export const ProductCardMobile: React.FC<ProductCardMobileProps> = ({
  product,
  onInspect,
  onEdit,
}) => {
  const stockUnits = product.totalStockUnits ?? 0;
  const stockBadgeStatus =
    stockUnits <= 0 ? "CRITICAL" : stockUnits < 25 ? "LOW" : "HEALTHY";

  return (
    <Card className="overflow-hidden border shadow-xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {product.sku}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Barcode className="h-3 w-3" />
                {product.productCode}
              </span>
            </div>
            <h4 className="font-semibold text-sm text-foreground mt-0.5 line-clamp-2">
              {product.name}
            </h4>
          </div>
          <StatusBadge
            status={product.isActive ? "HEALTHY" : "REJECTED"}
            label={product.isActive ? "ACTIVE" : "INACTIVE"}
          />
        </div>

        {/* Category & Brand Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {product.brandName ?? product.brandCode ?? "Standard Brand"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {product.categoryName ?? product.categoryCode ?? "General"}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            UOM: {product.unitOfMeasure}
          </span>
        </div>

        {/* Pricing + Stock Row */}
        <div className="flex items-center justify-between border-t pt-2.5">
          <div>
            <div className="text-[11px] text-muted-foreground">
              Selling Price & MRP
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs line-through text-muted-foreground font-mono">
                {formatCurrency(product.mrp)}
              </span>
              <span className="font-semibold text-primary font-mono text-base">
                {formatCurrency(product.sellingPrice)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <StatusBadge
              status={stockBadgeStatus}
              label={`${formatNumber(stockUnits)} ${product.unitOfMeasure}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInspect(product)}
              className="h-8 px-2.5 text-xs"
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Details
            </Button>
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(product)}
                className="h-8 px-2.5 text-xs text-primary hover:text-primary"
              >
                <Edit className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
