import * as React from "react";
import { History, SlidersHorizontal, Truck } from "lucide-react";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StandardButton } from "@/components/ui/button";
import { type InventoryRecord } from "@/api/inventory.api";
import { formatThreeDecimalQuantity } from "./InventoryTable";

export interface InventoryCardMobileProps {
  item: InventoryRecord;
  onAdjustStock: (item: InventoryRecord) => void;
}

export const InventoryCardMobile: React.FC<InventoryCardMobileProps> = ({
  item,
  onAdjustStock,
}) => {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {item.sku}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {item.productCode}
            </span>
          </div>
          <h4 className="font-semibold text-sm text-foreground truncate">
            {item.productName}
          </h4>
          <p className="text-xs text-muted-foreground">
            {item.storeCode} · {item.storeName}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 rounded-md bg-muted/40 p-2.5 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground block">
            Available Stock
          </span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              item.availableQuantity <= 0 ? "text-red-600" : "text-foreground"
            }`}
          >
            {formatThreeDecimalQuantity(
              item.availableQuantity,
              item.unitOfMeasure,
            )}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">
            In-Transit Stock
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums text-blue-700">
            {item.inTransitQuantity > 0 && (
              <Truck className="h-3 w-3 shrink-0" />
            )}
            {formatThreeDecimalQuantity(
              item.inTransitQuantity,
              item.unitOfMeasure,
            )}
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">
            Daily Sales (ADS)
          </span>
          <span className="font-mono text-foreground tabular-nums">
            {Number(item.averageDailySales).toFixed(3)} / day
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">
            Reorder Threshold
          </span>
          <span className="font-mono text-foreground tabular-nums">
            {formatThreeDecimalQuantity(item.reorderLevel, item.unitOfMeasure)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Days of Inventory (DOI)</span>
          <span className="font-mono text-[11px]">v{item.version}</span>
        </div>
        <RH_DOIGauge doi={item.daysOfInventory} showLabel />
      </div>

      <div className="flex items-center justify-end pt-1 border-t">
        <StandardButton
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onAdjustStock(item)}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
        >
          Adjust Stock
        </StandardButton>
      </div>
    </div>
  );
};
