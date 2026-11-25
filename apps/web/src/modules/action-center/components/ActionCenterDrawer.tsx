import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Save,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRecommendationDetail } from "../hooks/useRecommendationDetail";
import { useActionMutations } from "../hooks/useActionMutations";
import { SideBySideStoreCard } from "./SideBySideStoreCard";
import { CandidateStoreSelector } from "./CandidateStoreSelector";
import { AiNarrativeCard } from "./AiNarrativeCard";
import { cn } from "@/lib/utils";

export interface ActionCenterDrawerProps {
  recommendationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActionCenterDrawer: React.FC<ActionCenterDrawerProps> = ({
  recommendationId,
  open,
  onOpenChange,
}) => {
  const { hasRole } = useAuth();
  const canTakeAction = hasRole(["REGIONAL_MANAGER", "ADMIN"]);

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

  const [showDispatchPanel, setShowDispatchPanel] =
    React.useState<boolean>(false);
  const [carrierName, setCarrierName] = React.useState<string>("");
  const [vehicleNumber, setVehicleNumber] = React.useState<string>("");
  const [showAuditHistory, setShowAuditHistory] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (recommendation) {
      setSelectedSourceStoreId(recommendation.fromStoreId);
      setTransferQty(recommendation.recommendedQty);
      setAuditComment("");
      setCommentError(null);
      setCarrierName("");
      setVehicleNumber("");
    }
  }, [recommendation]);

  const activeSourceStore = React.useMemo(() => {
    if (!recommendation) return null;
    if (selectedSourceStoreId === null) return null;

    const matchingCandidate = candidates.find(
      (cand) => cand.storeId === selectedSourceStoreId,
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
    return (
      selectedSourceStoreId !== recommendation.fromStoreId ||
      Number(transferQty.toFixed(3)) !==
        Number(recommendation.recommendedQty.toFixed(3))
    );
  }, [recommendation, selectedSourceStoreId, transferQty]);

  const isActionableStatus =
    recommendation?.status === "GENERATED" ||
    recommendation?.status === "REVIEWED";

  const isMutating =
    approveMutation.isPending ||
    modifyMutation.isPending ||
    rejectMutation.isPending;

  const validateMandatoryComment = (actionLabel: string): boolean => {
    if (auditComment.trim().length < 5) {
      setCommentError(
        `Mandatory audit comment (>= 5 characters) is required to ${actionLabel} this recommendation.`,
      );
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
        fromStoreId: selectedSourceStoreId,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[500px] lg:max-w-[600px] p-0 flex flex-col bg-background"
      >
        <SheetHeader className="border-b px-5 py-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2">
              <SheetTitle className="font-mono text-sm sm:text-base font-bold">
                {recommendation?.recommendationNumber ??
                  "Review Recommendation"}
              </SheetTitle>
              {recommendation && (
                <StatusBadge status={recommendation.priority} />
              )}
              {recommendation && <StatusBadge status={recommendation.status} />}
            </div>

            {recommendation?.isManualRequest && (
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                <UserCheck className="h-3 w-3 size-3 shrink-0" />
                <span>Manual Store Request</span>
              </span>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable 5-Section Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-28">
          {isLoadingDetail || !recommendation ? (
            <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 size-5 animate-spin text-primary" />
              <span>Loading recommendation intelligence...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: Problem Header */}
              <section
                aria-label="Problem Header"
                className="rounded-lg border bg-muted/30 p-3.5 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                        {recommendation.sku}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        EAN: {recommendation.barcode}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      {recommendation.productName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Category: {recommendation.categoryName} • Unit Cost: ₹
                      {recommendation.unitCost.toLocaleString("en-IN")} • MRP: ₹
                      {recommendation.mrp.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="block text-[10px] uppercase text-muted-foreground">
                      Margin Velocity at Risk
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      ₹
                      {recommendation.potentialRevenueSaved.toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                </div>

                {recommendation.isManualRequest &&
                  recommendation.storeRequestReason && (
                    <div className="rounded border border-blue-200 bg-blue-50/60 p-2.5 text-xs text-blue-950">
                      <span className="font-semibold">
                        {recommendation.requestedByStoreManagerName ??
                          "Store Manager"}{" "}
                        Note:
                      </span>{" "}
                      &ldquo;{recommendation.storeRequestReason}&rdquo;
                    </div>
                  )}
              </section>

              {/* SECTION 2: Side-by-Side Store Comparison */}
              <section aria-label="Side-by-Side Store Comparison">
                <SideBySideStoreCard
                  destStore={recommendation.destStore}
                  sourceStore={activeSourceStore}
                  transferQty={transferQty}
                  unitCost={recommendation.unitCost}
                />
              </section>

              {/* SECTION 3: Source & Quantity Configuration */}
              <section aria-label="Source and Quantity Configuration">
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
              </section>

              {/* SECTION 4: AI Executive Narrative */}
              <section aria-label="AI Executive Briefing">
                <AiNarrativeCard
                  explanation={aiExplanation}
                  fallbackText={recommendation.aiExplanation}
                  loading={isLoadingExplanation}
                />
              </section>

              {/* SECTION 5: Decision & Audit Controls */}
              <section
                aria-label="Decision and Audit Controls"
                className="rounded-lg border bg-card p-4 space-y-4"
              >
                {/* Optional Carrier / Vehicle Collapse Panel */}
                <div className="border-b pb-3">
                  <button
                    type="button"
                    onClick={() => setShowDispatchPanel((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 size-3.5 text-primary shrink-0" />
                      <span>
                        Optional Direct Dispatch Metadata (Carrier & Vehicle)
                      </span>
                    </span>
                    {showDispatchPanel ? (
                      <ChevronUp className="h-4 w-4 size-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4 size-4" />
                    )}
                  </button>

                  {showDispatchPanel && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="dispatch-carrier" className="text-xs">
                          Logistics Carrier Name
                        </Label>
                        <Input
                          id="dispatch-carrier"
                          placeholder="e.g., Mahindra Logistics Line-Haul"
                          value={carrierName}
                          onChange={(e) => setCarrierName(e.target.value)}
                          disabled={!canTakeAction || !isActionableStatus}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="dispatch-vehicle" className="text-xs">
                          Vehicle Registration Number
                        </Label>
                        <Input
                          id="dispatch-vehicle"
                          placeholder="e.g., MP-09-HH-4821"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          disabled={!canTakeAction || !isActionableStatus}
                          className="h-8 font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Mandatory Audit Comment Textarea */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="audit-decision-comment" className="text-xs">
                      Decision Audit Comment{" "}
                      <span className="text-muted-foreground font-normal">
                        (Mandatory &ge; 5 chars for Modify or Reject)
                      </span>
                    </Label>
                    <span
                      className={cn(
                        "font-mono text-[11px]",
                        auditComment.trim().length >= 5
                          ? "text-emerald-700 font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {auditComment.trim().length} chars
                    </span>
                  </div>
                  <Textarea
                    id="audit-decision-comment"
                    rows={3}
                    disabled={!canTakeAction || !isActionableStatus}
                    value={auditComment}
                    onChange={(e) => {
                      setAuditComment(e.target.value);
                      if (e.target.value.trim().length >= 5) {
                        setCommentError(null);
                      }
                    }}
                    placeholder="Document operational rationale for modifying donor/quantity or rejecting this recommendation..."
                    className={cn(
                      "text-xs",
                      commentError &&
                        "border-red-500 focus-visible:ring-red-500",
                    )}
                  />
                  {commentError && (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 text-xs font-medium text-red-600"
                    >
                      <AlertCircle className="h-3.5 w-3.5 size-3.5 shrink-0" />
                      <span>{commentError}</span>
                    </p>
                  )}
                </div>

                {/* Collapsible Audit History Timeline */}
                <div className="border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAuditHistory((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 size-3.5 text-muted-foreground shrink-0" />
                      <span>
                        ActionHistory Audit Trail (
                        {recommendation.auditHistory.length})
                      </span>
                    </span>
                    {showAuditHistory ? (
                      <ChevronUp className="h-4 w-4 size-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4 size-4" />
                    )}
                  </button>

                  {showAuditHistory && (
                    <div className="mt-3 space-y-2.5">
                      {recommendation.auditHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-md border bg-muted/30 p-2.5 text-xs space-y-1"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-semibold text-foreground">
                              {entry.changedByName}{" "}
                              <span className="font-mono text-[10px] text-muted-foreground">
                                ({entry.changedByRole})
                              </span>
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {new Date(entry.changedOn).toLocaleString(
                                "en-IN",
                                {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                },
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-muted-foreground">
                              {entry.previousStatus ?? "NONE"}
                            </span>
                            <span>➔</span>
                            <StatusBadge status={entry.newStatus} />
                          </div>
                          {entry.comments && (
                            <p className="text-xs text-muted-foreground pt-0.5">
                              {entry.comments}
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

        {/* Sticky Bottom Action Footer (Mobile + Desktop) */}
        {recommendation && (
          <div className="fixed bottom-0 left-0 right-0 sm:static p-4 border-t bg-background z-20 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canTakeAction || !isActionableStatus || isMutating}
              onClick={handleReject}
              className="h-9 px-3 text-xs"
            >
              <XCircle className="h-3.5 w-3.5 size-3.5 mr-1.5" />
              <span>Reject</span>
            </Button>

            <div className="flex items-center gap-2">
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
                className="h-9 px-3 text-xs"
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
                onClick={
                  isModifiedFromOriginal ? handleModifyAndSave : handleApprove
                }
                className="h-9 bg-emerald-600 text-white hover:bg-emerald-700 px-4 text-xs font-semibold"
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
      </SheetContent>
    </Sheet>
  );
};
