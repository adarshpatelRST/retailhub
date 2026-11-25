import * as React from "react";
import { CheckCheck, Loader2, X } from "lucide-react";
import { type RecommendationDto } from "../api/action-center.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BatchApproveBarProps {
  selectedIds: string[];
  recommendations: RecommendationDto[];
  isSubmitting?: boolean;
  onConfirmBatchApprove: (ids: string[]) => Promise<void> | void;
  onClearSelection: () => void;
  className?: string;
}

export const BatchApproveBar: React.FC<BatchApproveBarProps> = ({
  selectedIds,
  recommendations,
  isSubmitting = false,
  onConfirmBatchApprove,
  onClearSelection,
  className,
}) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const selectedRecords = React.useMemo(
    () =>
      recommendations.filter((rec) => selectedIds.includes(rec.id)),
    [recommendations, selectedIds],
  );

  const totalUnits = React.useMemo(
    () =>
      selectedRecords.reduce((acc, rec) => acc + rec.recommendedQty, 0),
    [selectedRecords],
  );

  const totalValuation = React.useMemo(
    () =>
      selectedRecords.reduce(
        (acc, rec) => acc + rec.recommendedQty * rec.unitCost,
        0,
      ),
    [selectedRecords],
  );

  if (selectedIds.length < 2) {
    return null;
  }

  const summaryText = `${selectedIds.length} Transfers Selected • Total ${totalUnits.toFixed(3)} Units • Est. Value ₹${totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div
      role="region"
      aria-label="Batch Approval Action Bar"
      className={cn(
        "fixed bottom-5 left-1/2 z-40 -translate-x-1/2 w-[94vw] max-w-3xl rounded-xl border border-primary/30 bg-slate-900 text-white shadow-xl px-4 py-3 transition-all",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 font-mono text-xs font-bold text-emerald-300 border border-emerald-400/30">
            {selectedIds.length}
          </span>
          <div>
            <p className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-white">
              {summaryText}
            </p>
            <p className="text-[11px] text-slate-300">
              All selected recommendations pass the 7.0-day donor DOI safety
              floor and will generate StockTransfer dispatches.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onClearSelection}
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5 size-3.5 mr-1" />
            <span>Clear</span>
          </Button>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <StandardButton
                type="button"
                size="sm"
                disabled={isSubmitting}
                className="h-8 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin mr-1.5" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 size-3.5 mr-1.5" />
                    <span>Approve Selected</span>
                  </>
                )}
              </StandardButton>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Confirm Batch Approval ({selectedIds.length} Transfers)
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to approve{" "}
                  <strong className="text-foreground">
                    {selectedIds.length} inventory rebalance transfers
                  </strong>{" "}
                  totaling{" "}
                  <strong className="font-mono text-foreground">
                    {totalUnits.toFixed(3)} units
                  </strong>{" "}
                  with an estimated valuation of{" "}
                  <strong className="font-mono text-foreground">
                    ₹
                    {totalValuation.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                  . This action will immediately create StockTransfer orders and
                  log immutable ActionHistory records.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/40 p-2.5 space-y-1.5 text-xs font-mono">
                {selectedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate">
                      {rec.recommendationNumber} • {rec.productName}
                    </span>
                    <span className="font-semibold text-foreground shrink-0">
                      {rec.recommendedQty.toFixed(3)} u (₹
                      {(rec.recommendedQty * rec.unitCost).toLocaleString(
                        "en-IN",
                      )}
                      )
                    </span>
                  </div>
                ))}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isSubmitting}
                  onClick={async (e) => {
                    e.preventDefault();
                    await onConfirmBatchApprove(selectedIds);
                    setConfirmOpen(false);
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isSubmitting
                    ? "Processing Batch..."
                    : `Confirm & Create ${selectedIds.length} Transfers`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
