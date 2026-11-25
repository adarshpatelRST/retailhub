import * as React from "react";
import { cva } from "class-variance-authority";
import { ChevronLeft, ChevronRight, FileText, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMovements } from "../hooks/useMovements";
import {
  type MovementLedgerEntry,
  type MovementType,
} from "../api/inventory.api";

export interface MovementLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  productId: string;
  productName: string;
  sku: string;
  fallbackEntries?: MovementLedgerEntry[];
}

export const movementTypeBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-tight whitespace-nowrap",
  {
    variants: {
      movementType: {
        POS_SALE: "bg-red-50 text-red-700 border-red-200",
        INWARD_RECEIPT: "bg-emerald-50 text-emerald-700 border-emerald-200",
        TRANSFER_OUT_DISPATCH: "bg-blue-50 text-blue-700 border-blue-200",
        TRANSFER_IN_RECEIPT: "bg-emerald-50 text-emerald-700 border-emerald-200",
        DAMAGED_WRITE_OFF: "bg-red-100 text-red-800 border-red-300",
        STOCK_ADJUSTMENT: "bg-gray-100 text-gray-700 border-gray-200",
      },
    },
    defaultVariants: {
      movementType: "STOCK_ADJUSTMENT",
    },
  },
);

export function formatLedgerTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const paddedHours = String(hours).padStart(2, "0");
  return `${day} ${month} ${year}, ${paddedHours}:${minutes} ${ampm}`;
}

export function formatSignedQuantityDelta(delta: number): string {
  const numeric = Number(delta) || 0;
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(3)}`;
}

export const MovementLedgerModal: React.FC<MovementLedgerModalProps> = ({
  isOpen,
  onClose,
  storeId,
  productId,
  productName,
  sku,
  fallbackEntries,
}) => {
  const [page, setPage] = React.useState(1);
  const limit = 20;

  React.useEffect(() => {
    if (isOpen) {
      setPage(1);
    }
  }, [isOpen, storeId, productId]);

  const { data, isLoading } = useMovements({
    storeId,
    productId,
    page,
    limit,
    enabled: isOpen && !fallbackEntries,
  });

  const entries: MovementLedgerEntry[] =
    fallbackEntries ?? data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-full sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-primary shrink-0" />
              <DialogTitle className="text-base sm:text-lg font-semibold">
                {productName}
              </DialogTitle>
            </div>
            <span className="inline-flex items-center rounded-md border bg-muted px-2.5 py-0.5 font-mono text-xs font-semibold text-foreground">
              {sku}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Immutable double-entry inventory movement ledger · Quantities shown
            to 3 decimal places
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Date &amp; Time</th>
                  <th className="px-3 py-2.5 font-semibold">Movement Type</th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    Quantity Delta
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Reference</th>
                  <th className="px-3 py-2.5 font-semibold">Actor</th>
                  <th className="px-3 py-2.5 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Loading ledger entries...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No ledger movements recorded for this SKU yet.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const isPositive = entry.quantityDelta >= 0;
                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap text-foreground">
                          {formatLedgerTimestamp(entry.createdAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              movementTypeBadgeVariants({
                                movementType:
                                  entry.movementType as MovementType,
                              }),
                            )}
                          >
                            {entry.movementType}
                          </span>
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap",
                            isPositive ? "text-emerald-600" : "text-red-600",
                          )}
                        >
                          {formatSignedQuantityDelta(entry.quantityDelta)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 font-mono text-foreground">
                            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                            {entry.referenceNumber}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                          {entry.actorName}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground max-w-[200px] truncate">
                          {entry.remarks || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-3 flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="font-mono text-xs text-muted-foreground">
              Page {page} of {Math.max(1, totalPages)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
