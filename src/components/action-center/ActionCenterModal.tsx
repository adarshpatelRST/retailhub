import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  PackageOpen,
  Save,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRecommendationDetail } from "@/hooks/useRecommendationDetail";
import { useActionMutations } from "@/hooks/useActionMutations";
import { SideBySideStoreCard } from "./SideBySideStoreCard";
import { CandidateStoreSelector } from "./CandidateStoreSelector";
import { AiNarrativeCard } from "./AiNarrativeCard";
import { cn } from "@/lib/utils";

export interface ActionCenterModalProps {
  recommendationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActionCenterModal: React.FC<ActionCenterModalProps> = ({
  recommendationId,
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();

  // All operational roles can review and action recommendations
  const canTakeAction = Boolean(user);

  const {
    recommendation,
    isLoadingDetail,
    candidates,
    aiExplanation,
    isLoadingExplanation,
  } = useRecommendationDetail(recommendationId);

  const { approveMutation, modifyMutation, rejectMutation } =
    useActionMutations();

  const [selectedSourceStoreId, setSelectedSourceStoreId] = React.useState<
    string | null
  >(null);
  const [transferQty, setTransferQty] = React.useState<number>(0);
  const [isDonorValid, setIsDonorValid] = React.useState<boolean>(true);
  const [auditComment, setAuditComment] = React.useState<string>("");
  const [commentError, setCommentError] = React.useState<string | null>(null);

  const [showDispatchPanel, setShowDispatchPanel] = React.useState<boolean>(true);
  const [carrierName, setCarrierName] = React.useState<string>(
    "Mahindra Logistics Line-Haul",
  );
  const [vehicleNumber, setVehicleNumber] = React.useState<string>(
    "MP-09-HH-4821",
  );
  const [showAuditHistory, setShowAuditHistory] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (open && recommendation) {
      const initialDonorId =
        recommendation.fromStoreId || "CENTRAL_SUPPLY";
      setSelectedSourceStoreId(initialDonorId);
      setTransferQty(Number(recommendation.approvedQty ?? recommendation.recommendedQty));
      setAuditComment("");
      setCommentError(null);
      setCarrierName("Mahindra Logistics Line-Haul");
      setVehicleNumber("MP-09-HH-4821");
    }
  }, [open, recommendation?.id, recommendation?.recommendedQty, recommendation?.fromStoreId, recommendation?.approvedQty]);

  const activeSourceStore = React.useMemo(() => {
    if (!recommendation) return null;
    if (selectedSourceStoreId === null || selectedSourceStoreId === "CENTRAL_SUPPLY") return null;

    const matchingCandidate = candidates.find(
      (cand: any) => cand.storeId === selectedSourceStoreId,
    );
    if (matchingCandidate) {
      return {
        name: matchingCandidate.storeName,
        code: matchingCandidate.storeCode,
        format: matchingCandidate.storeFormat,
        currentStock: matchingCandidate.availableStock,
        ads: matchingCandidate.ads,
        currentDOI: matchingCandidate.currentDOI,
        distanceKm: matchingCandidate.distanceKm,
      };
    }

    if (
      recommendation.sourceStore &&
      recommendation.fromStoreId === selectedSourceStoreId
    ) {
      return {
        ...recommendation.sourceStore,
        distanceKm:
          recommendation.sourceStore.distanceKm ??
          recommendation.distanceKm ??
          0,
      };
    }

    return null;
  }, [recommendation, selectedSourceStoreId, candidates]);

  const isModifiedFromOriginal = React.useMemo(() => {
    if (!recommendation) return false;
    const origDonor = recommendation.fromStoreId || "CENTRAL_SUPPLY";
    const currDonor = selectedSourceStoreId || "CENTRAL_SUPPLY";
    const origQty = Number(recommendation.approvedQty ?? recommendation.recommendedQty);
    return (
      currDonor !== origDonor ||
      Math.abs(transferQty - origQty) > 0.001
    );
  }, [recommendation, selectedSourceStoreId, transferQty]);

  // Include OPEN in actionable status so seeded recommendations can be actioned!
  const isActionableStatus =
    recommendation?.status === "OPEN" ||
    recommendation?.status === "GENERATED" ||
    recommendation?.status === "REVIEWED" ||
    recommendation?.status === "MODIFIED";

  const isMutating =
    approveMutation.isPending ||
    modifyMutation.isPending ||
    rejectMutation.isPending;

  const validateMandatoryComment = (actionLabel: string): boolean => {
    if (auditComment.trim().length < 5) {
      setCommentError(
        `Mandatory audit comment (≥ 5 characters) is required to ${actionLabel} this recommendation.`,
      );
      return false;
    }
    if (auditComment.length > 250) {
      setCommentError("Audit comment cannot exceed 250 characters.");
      return false;
    }
    setCommentError(null);
    return true;
  };

  const handleApprove = async () => {
    if (!recommendation || !isDonorValid) return;
    setCommentError(null);
    await approveMutation.mutateAsync({
      id: recommendation.id,
      dto: {
        fromStoreId: selectedSourceStoreId === "CENTRAL_SUPPLY" ? undefined : (selectedSourceStoreId ?? undefined),
        approvedQuantity: transferQty,
        dispatchNow: Boolean(carrierName.trim() || vehicleNumber.trim()),
        carrierName: carrierName.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
        comments: auditComment.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  const handleModifyAndSave = async () => {
    if (!recommendation || !isDonorValid) return;
    if (!validateMandatoryComment("modify")) return;

    await modifyMutation.mutateAsync({
      id: recommendation.id,
      dto: {
        fromStoreId: selectedSourceStoreId === "CENTRAL_SUPPLY" ? null : selectedSourceStoreId,
        modifiedQuantity: transferQty,
        comments: auditComment.trim(),
        dispatchNow: Boolean(carrierName.trim() || vehicleNumber.trim()),
        carrierName: carrierName.trim() || undefined,
        vehicleNumber: vehicleNumber.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  const handleReject = async () => {
    if (!recommendation) return;
    if (!validateMandatoryComment("reject")) return;

    await rejectMutation.mutateAsync({
      id: recommendation.id,
      dto: {
        comments: auditComment.trim(),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] p-0 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b px-6 py-3.5 shrink-0 bg-slate-50/70">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <PackageOpen className="h-4 w-4 shrink-0" />
              </div>
              <DialogTitle className="font-mono text-sm sm:text-base font-bold text-slate-900">
                {recommendation?.recommendationNumber ?? "Review Recommendation"}
              </DialogTitle>
              {recommendation && <StatusBadge status={recommendation.priority} />}
              {recommendation && <StatusBadge status={recommendation.status} />}
            </div>

            {recommendation?.isManualRequest && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>Manual Store Request</span>
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoadingDetail || !recommendation ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading recommendation intelligence...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: Problem Summary Banner */}
              <section
                aria-label="Problem Header"
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {recommendation.sku}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        EAN: {recommendation.barcode}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {recommendation.productName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Category: {recommendation.categoryName} • Unit Cost: ₹
                      {Number(recommendation.unitCost ?? 0).toLocaleString("en-IN")} • MRP: ₹
                      {Number(recommendation.mrp ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Margin Velocity at Risk
                    </span>
                    <span className="text-base font-bold text-emerald-700">
                      ₹
                      {Number(
                        recommendation.potentialRevenueSaved ??
                          ((recommendation.unitCost || 0) * (recommendation.recommendedQty || 0)),
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {recommendation.isManualRequest &&
                  recommendation.storeRequestReason && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-950">
                      <span className="font-semibold text-blue-900">
                        {recommendation.requestedByStoreManagerName ??
                          "Store Manager"}{" "}
                        Escalation Note:
                      </span>{" "}
                      &ldquo;{recommendation.storeRequestReason}&rdquo;
                    </div>
                  )}
              </section>

              {/* SECTION 2: AI Executive Briefing (Prominent, Full-Width & Immediately Readable) */}
              <AiNarrativeCard
                explanation={aiExplanation}
                fallbackText={recommendation.aiExplanation}
                loading={isLoadingExplanation}
              />

              {/* 2-COLUMN GRID: Store Comparison & Configuration */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                {/* SECTION 3: Side-by-Side Store Comparison */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between min-h-[20px]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Store Stock &amp; DOI Balance Simulation
                    </h4>
                  </div>
                  <SideBySideStoreCard
                    destStore={
                      recommendation.destStore ?? {
                        id: recommendation.toStoreId,
                        name: recommendation.toStoreName ?? "Destination Store",
                        code: recommendation.toStoreCode ?? "DST-001",
                        format: recommendation.toStoreFormat || "HYPERMARKET",
                        city: "Store City",
                        state: "State",
                        currentStock: recommendation.destStockBefore ?? 0,
                        ads: recommendation.destAds ?? 1.8,
                        currentDOI: recommendation.destDoiBefore ?? 0,
                      }
                    }
                    sourceStore={activeSourceStore}
                    transferQty={transferQty}
                    unitCost={recommendation.unitCost ?? 0}
                  />
                </div>

                {/* SECTION 4: Source Donor Selector */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between min-h-[20px]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Source Donor Store &amp; Transfer Quantity
                    </h4>
                  </div>
                  <CandidateStoreSelector
                    candidates={candidates}
                    selectedStoreId={selectedSourceStoreId}
                    onStoreChange={(nextStoreId) =>
                      setSelectedSourceStoreId(nextStoreId)
                    }
                    quantity={transferQty}
                    onQuantityChange={(nextQty) => setTransferQty(nextQty)}
                    onValidationChange={(valid) => setIsDonorValid(valid)}
                    disabled={!canTakeAction || !isActionableStatus || isMutating}
                  />
                </div>
              </div>

              {/* SECTION 5: Decision, Audit & Direct Dispatch Controls */}
              <section
                aria-label="Decision and Audit Controls"
                className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-600 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Operational Dispatch &amp; Decision Audit Log
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Section 5 Controls
                  </span>
                </div>

                {!isActionableStatus ? (
                  /* FINALIZED / READ-ONLY STATUS BANNER */
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Recommendation Disposition:
                      </span>
                      <StatusBadge status={recommendation.status} />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      This rebalance recommendation has been finalized as{" "}
                      <strong className="text-slate-700">{recommendation.status}</strong>.
                      Modifications and additional operational inputs are locked. Complete
                      audit records are displayed in the timeline below.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Direct Dispatch Metadata (Carrier & Vehicle) */}
                    <div className="rounded-lg border border-slate-200/90 bg-slate-50/60 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                          <span>Direct Dispatch Logistics Metadata (Optional)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDispatchPanel((prev) => !prev)}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          {showDispatchPanel ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {showDispatchPanel && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label htmlFor="dispatch-carrier" className="text-xs font-medium text-slate-700">
                              Logistics Carrier Name
                            </Label>
                            <Input
                              id="dispatch-carrier"
                              placeholder="e.g., Mahindra Logistics Line-Haul"
                              value={carrierName}
                              onChange={(e) => setCarrierName(e.target.value)}
                              disabled={!canTakeAction || !isActionableStatus}
                              className="h-8 text-xs bg-white border-slate-300"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="dispatch-vehicle" className="text-xs font-medium text-slate-700">
                              Vehicle Registration Number
                            </Label>
                            <Input
                              id="dispatch-vehicle"
                              placeholder="e.g., MP-09-HH-4821"
                              value={vehicleNumber}
                              onChange={(e) => setVehicleNumber(e.target.value)}
                              disabled={!canTakeAction || !isActionableStatus}
                              className="h-8 font-mono text-xs uppercase bg-white border-slate-300"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mandatory Audit Comment Textarea (Fixed 3 rows, 250 max chars) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="audit-decision-comment"
                          className="text-xs font-bold uppercase tracking-wider text-slate-700"
                        >
                          Decision Audit Comment <span className="text-red-500 font-bold ml-0.5">*</span>{" "}
                          <span className="text-slate-400 font-normal">
                            (Mandatory ≥ 5 chars for Modify or Reject)
                          </span>
                        </Label>
                        <span
                          className={cn(
                            "font-mono text-[11px]",
                            auditComment.trim().length >= 5
                              ? "text-emerald-700 font-semibold"
                              : "text-slate-400",
                          )}
                        >
                          {auditComment.length}/250 chars
                        </span>
                      </div>
                      <Textarea
                        id="audit-decision-comment"
                        rows={3}
                        maxLength={250}
                        disabled={!canTakeAction || !isActionableStatus}
                        value={auditComment}
                        onChange={(e) => {
                          setAuditComment(e.target.value);
                          if (e.target.value.trim().length >= 5) {
                            setCommentError(null);
                          }
                        }}
                        placeholder="Document operational rationale for modifying donor/quantity or rejecting this recommendation (e.g., Local distributor shipment confirmed)..."
                        className={cn(
                          "text-xs resize-none overflow-y-auto max-h-[72px] h-[72px] bg-white border-slate-300",
                          commentError &&
                            "border-rose-500 focus-visible:ring-rose-500",
                        )}
                      />
                      {commentError && (
                        <p
                          role="alert"
                          className="flex items-center gap-1.5 text-xs font-medium text-rose-600"
                        >
                          <AlertCircle className="h-3.5 w-3.5 size-3.5 shrink-0" />
                          <span>{commentError}</span>
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* ActionHistory Audit Trail Timeline */}
                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAuditHistory((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-800 hover:text-slate-900 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>
                        ActionHistory Audit Trail Timeline (
                        {(recommendation.auditHistory ?? []).length} events logged)
                      </span>
                    </span>
                    {showAuditHistory ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {showAuditHistory && (
                    <div className="mt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {(recommendation.auditHistory ?? []).map((entry: any) => (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-semibold text-slate-900">
                              {entry.changedByName}{" "}
                              <span className="font-mono text-[10px] text-slate-500">
                                ({entry.changedByRole})
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {entry.changedOn
                                ? new Date(entry.changedOn).toLocaleString(
                                    "en-IN",
                                    {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    },
                                  )
                                : "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-slate-500">
                              {entry.previousStatus ?? "NONE"}
                            </span>
                            <span className="text-slate-400">➔</span>
                            <StatusBadge status={entry.newStatus} />
                          </div>
                          {entry.comments && (
                            <p className="text-xs text-slate-600 pt-0.5 leading-relaxed bg-white/70 p-2 rounded border border-slate-200/50">
                              &ldquo;{entry.comments}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modal Action Footer */}
        {recommendation && (
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 shrink-0 flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canTakeAction || !isActionableStatus || isMutating}
              onClick={handleReject}
              className="h-9 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700"
            >
              <XCircle className="h-3.5 w-3.5 size-3.5 mr-1.5" />
              <span>Reject Recommendation</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-4 text-xs font-semibold border-slate-300 hover:bg-slate-100"
              >
                Close
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  !canTakeAction ||
                  !isActionableStatus ||
                  !isDonorValid ||
                  isMutating
                }
                onClick={handleModifyAndSave}
                className="h-9 px-4 text-xs font-semibold border-slate-300"
              >
                <Save className="h-3.5 w-3.5 size-3.5 mr-1.5" />
                <span>Modify &amp; Save</span>
              </Button>

              <StandardButton
                type="button"
                size="sm"
                disabled={
                  !canTakeAction ||
                  !isActionableStatus ||
                  !isDonorValid ||
                  isMutating
                }
                onClick={handleApprove}
                className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 px-5 text-xs font-semibold"
              >
                {isMutating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin mr-1.5" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 size-3.5 mr-1.5" />
                    <span>Approve Transfer</span>
                  </>
                )}
              </StandardButton>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ActionCenterDrawer = ActionCenterModal;
export default ActionCenterModal;

