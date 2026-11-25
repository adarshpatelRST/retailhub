import * as React from "react";
import { History, SlidersHorizontal, Truck } from "lucide-react";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StandardButton } from "@/components/ui/button";
import { type InventoryRecord } from "@/api/inventory.api";

export interface InventoryTableProps {
  data: InventoryRecord[];
  loading?: boolean;
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onAdjustStock: (item: InventoryRecord) => void;
}

export function formatThreeDecimalQuantity(
  quantity: number,
  unitOfMeasure?: string,
): string {
  const safeVal = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
  const formatted = safeVal.toFixed(3);
  if (!unitOfMeasure) return formatted;
  const unitLabel = unitOfMeasure === "PIECE" ? "Units" : unitOfMeasure;
  return `${formatted} ${unitLabel}`;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  data,
  loading = false,
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onAdjustStock,
}) => {
  const columns = React.useMemo<ServerColumn<InventoryRecord>[]>(
    () => [
      {
        key: "sku",
        header: "SKU / Barcode",
        sortable: false,
        widthClass: "min-w-[165px]",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex w-fit items-center rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
              {row.sku}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              EAN: {row.productCode}
            </span>
          </div>
        ),
      },
      {
        key: "productName",
        header: "Product Name",
        sortable: false,
        widthClass: "min-w-[200px]",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">
              {row.productName}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {row.categoryName || "General Merchandise"}
            </span>
          </div>
        ),
      },
      {
        key: "store",
        header: "Store Location",
        sortable: false,
        widthClass: "min-w-[210px]",
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 font-mono text-[11px] font-bold">
                {row.storeCode}
              </span>
              <span className="text-xs font-medium text-slate-800 truncate max-w-[150px]" title={row.storeName}>
                {row.storeName}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Reorder: <span className="font-mono font-medium text-slate-700">{Number(row.reorderLevel).toFixed(3)}</span> {row.unitOfMeasure === "PIECE" ? "Units" : row.unitOfMeasure}
            </span>
          </div>
        ),
      },
      {
        key: "availableQuantity",
        header: "Available Stock",
        sortable: false,
        align: "right",
        widthClass: "min-w-[140px]",
        render: (row) => {
          const isDepleted = row.availableQuantity <= 0;
          return (
            <div className="flex flex-col items-end">
              <span
                className={`font-mono text-xs tabular-nums ${
                  isDepleted ? "text-red-600 font-bold" : "font-semibold text-foreground"
                }`}
              >
                {formatThreeDecimalQuantity(
                  row.availableQuantity,
                  row.unitOfMeasure,
                )}
              </span>
              {isDepleted ? (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-600">
                  Critical Stockout
                </span>
              ) : row.reservedQuantity > 0 ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Reserved: {row.reservedQuantity.toFixed(3)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "inTransitQuantity",
        header: "In-Transit Stock",
        sortable: false,
        align: "right",
        widthClass: "min-w-[140px]",
        render: (row) => (
          <div className="inline-flex items-center justify-end gap-1.5 font-mono text-xs tabular-nums">
            {row.inTransitQuantity > 0 ? (
              <>
                <Truck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-blue-700">
                  +{formatThreeDecimalQuantity(
                    row.inTransitQuantity,
                    row.unitOfMeasure,
                  )}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                0.000 {row.unitOfMeasure === "PIECE" ? "Units" : row.unitOfMeasure}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "averageDailySales",
        header: "Daily Sales (ADS)",
        sortable: false,
        align: "right",
        widthClass: "min-w-[130px]",
        render: (row) => (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {Number(row.averageDailySales).toFixed(3)} / day
          </span>
        ),
      },
      {
        key: "daysOfInventory",
        header: "Days of Inventory (DOI)",
        sortable: false,
        widthClass: "min-w-[190px]",
        render: (row) => <RH_DOIGauge doi={row.daysOfInventory} showLabel />,
      },
      {
        key: "status",
        header: "Status",
        sortable: false,
        align: "center",
        widthClass: "min-w-[115px]",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        widthClass: "min-w-[100px]",
        render: (row) => (
          <div className="flex items-center justify-end">
            <StandardButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAdjustStock(row)}
              icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            >
              Adjust
            </StandardButton>
          </div>
        ),
      },
    ],
    [onAdjustStock],
  );

  return (
    <ServerDataTable
      data={data}
      columns={columns}
      loading={loading}
      page={page}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={onPageChange}
      emptyMessage="No inventory balance records match the active filters."
    />
  );
};
