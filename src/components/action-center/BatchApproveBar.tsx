import * as React from "react";
import { AlertCircle, CheckCheck, Loader2, X, XCircle } from "lucide-react";
import { type RecommendationDto } from "@/api/action-center.api";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface BatchApproveBarProps {
  selectedIds: string[];
  recommendations: RecommendationDto[];
  isSubmitting?: boolean;
  onConfirmBatchApprove: (ids: string[]) => Promise<void> | void;
  onConfirmBatchReject: (ids: string[], reason: string) => Promise<void> | void;
  onClearSelection: () => void;
  className?: string;
}

export const BatchApproveBar: React.FC<BatchApproveBarProps> = ({
  selectedIds,
  recommendations,
  isSubmitting = false,
  onConfirmBatchApprove,
  onConfirmBatchReject,
  onClearSelection,
  className,
}) => {
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [rejectError, setRejectError] = React.useState<string | null>(null);

  const selectedRecords = React.useMemo(
    () => recommendations.filter((rec) => selectedIds.includes(rec.id)),
    [recommendations, selectedIds],
  );

  const totalUnits = React.useMemo(
    () => selectedRecords.reduce((acc, rec) => acc + (rec.recommendedQty || 0), 0),
    [selectedRecords],
  );

  const totalValuation = React.useMemo(
    () =>
      selectedRecords.reduce(
        (acc, rec) => acc + (rec.recommendedQty || 0) * (rec.unitCost || 0),
        0,
      ),
    [selectedRecords],
  );

  if (selectedIds.length < 2) {
    return null;
  }

  const summaryText = `${selectedIds.length} Transfers Selected • Total ${(totalUnits || 0).toFixed(3)} Units • Est. Value ₹${(totalValuation || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const handleBatchRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectReason.trim().length < 5) {
      setRejectError(
        "A mandatory rejection reason (≥ 5 characters) is required to reject selected transfers.",
      );
      return;
    }
    setRejectError(null);
    await onConfirmBatchReject(selectedIds, rejectReason.trim());
    setRejectReason("");
    setRejectOpen(false);
  };

  return (
    <div
      role="region"
      aria-label="Batch Actions Bar"
      className={cn(
        "fixed bottom-5 left-1/2 z-40 -translate-x-1/2 w-[94vw] max-w-4xl rounded-2xl border border-slate-300/80 bg-white/95 backdrop-blur-md text-slate-900 shadow-2xl px-5 py-3.5 transition-all",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 font-mono text-xs font-bold text-blue-700 border border-blue-200 shrink-0">
            {selectedIds.length}
          </span>
          <div>
            <p className="font-mono text-xs sm:text-sm font-semibold tracking-tight text-slate-900">
              {summaryText}
            </p>
            <p className="text-[11px] text-slate-500">
              All selected recommendations maintain up to 7.0+ days donor DOI
              safety floor and will generate StockTransfer dispatches.
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
            className="h-8 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <X className="h-3.5 w-3.5 size-3.5 mr-1" />
            <span>Clear</span>
          </Button>

          {/* Batch Reject Button */}
          <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isSubmitting}
                className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 shadow-xs"
              >
                <XCircle className="h-3.5 w-3.5 size-3.5 mr-1.5" />
                <span>Reject Selected</span>
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="sm:max-w-[500px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-base text-slate-900">
                  <XCircle className="h-4 w-4 size-4 text-rose-600 shrink-0" />
                  <span>
                    Reject Selected ({selectedIds.length} Recommendations)
                  </span>
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
                  Provide an operational reason for rejecting these{" "}
                  <strong className="text-slate-700">
                    {selectedIds.length} rebalance recommendations
                  </strong>
                  . The specified reason will be recorded across all selected
                  records in the enterprise audit log.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <form onSubmit={handleBatchRejectSubmit} className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="batch-reject-reason"
                      className="text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Rejection Reason <span className="text-red-500 font-bold ml-0.5">*</span>
                    </Label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {rejectReason.length}/250 chars
                    </span>
                  </div>
                  <Textarea
                    id="batch-reject-reason"
                    rows={3}
                    maxLength={250}
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (e.target.value.trim().length >= 5) {
                        setRejectError(null);
                      }
                    }}
                    placeholder="Document reason for rejecting these recommendations (e.g., Supplier delivering tomorrow; local storage constrained)..."
                    className="text-xs resize-none overflow-y-auto max-h-[72px] h-[72px] bg-white border-slate-300"
                  />
                  {rejectError && (
                    <p
                      role="alert"
                      className="flex items-center gap-1 text-[11px] font-medium text-rose-600"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{rejectError}</span>
                    </p>
                  )}
                </div>

                <AlertDialogFooter className="pt-2 gap-2">
                  <AlertDialogCancel
                    type="button"
                    disabled={isSubmitting}
                    className="text-xs h-9"
                    onClick={() => {
                      setRejectReason("");
                      setRejectError(null);
                    }}
                  >
                    Cancel
                  </AlertDialogCancel>
                  <StandardButton
                    type="submit"
                    disabled={isSubmitting || rejectReason.trim().length < 5}
                    className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin mr-1.5" />
                        <span>Rejecting...</span>
                      </>
                    ) : (
                      <span>Reject All {selectedIds.length}</span>
                    )}
                  </StandardButton>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>

          {/* Batch Approve Button */}
          <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
            <AlertDialogTrigger asChild>
              <StandardButton
                type="button"
                size="sm"
                disabled={isSubmitting}
                className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold px-3.5 shadow-xs"
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

            <AlertDialogContent className="sm:max-w-[540px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base text-slate-900">
                  Confirm Batch Approval ({selectedIds.length} Transfers)
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-slate-500 leading-relaxed">
                  You are about to approve{" "}
                  <strong className="text-slate-800">
                    {selectedIds.length} inventory rebalance transfers
                  </strong>{" "}
                  totaling{" "}
                  <strong className="font-mono text-slate-800">
                    {(totalUnits || 0).toFixed(3)} units
                  </strong>{" "}
                  with an estimated valuation of{" "}
                  <strong className="font-mono text-slate-800">
                    ₹
                    {(totalValuation || 0).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                  . This action will immediately create StockTransfer dispatches and
                  record immutable ActionHistory entries.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="max-h-40 overflow-y-auto rounded-md border bg-slate-50/70 p-2.5 space-y-1.5 text-xs font-mono">
                {selectedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate text-slate-700">
                      {rec.recommendationNumber} • {rec.productName}
                    </span>
                    <span className="font-semibold text-slate-900 shrink-0">
                      {(rec.recommendedQty || 0).toFixed(3)} u (₹
                      {(
                        (rec.recommendedQty || 0) * (rec.unitCost || 0)
                      ).toLocaleString("en-IN")}
                      )
                    </span>
                  </div>
                ))}
              </div>

              <AlertDialogFooter className="pt-2 gap-2">
                <AlertDialogCancel disabled={isSubmitting} className="text-xs h-9">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={isSubmitting}
                  onClick={async (e) => {
                    e.preventDefault();
                    await onConfirmBatchApprove(selectedIds);
                    setApproveOpen(false);
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-9"
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

export default BatchApproveBar;
