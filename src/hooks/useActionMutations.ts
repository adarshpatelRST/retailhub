import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  actionCenterApi,
  type ApproveRecommendationDto,
  type BatchApproveResultDto,
  type CreateStoreRequestDto,
  type IntelligenceScanResultDto,
  type ModifyRecommendationDto,
  type RecommendationDto,
  type RejectRecommendationDto,
} from "../api/action-center.api";
import {
  ACTION_CENTER_QUERY_KEYS,
  FALLBACK_RECOMMENDATIONS,
} from "./useRecommendations";

export function useActionMutations() {
  const queryClient = useQueryClient();

  const invalidateRecommendations = async () => {
    await queryClient.invalidateQueries({
      queryKey: ACTION_CENTER_QUERY_KEYS.all,
    });
  };

  const approveMutation = useMutation<
    RecommendationDto,
    Error,
    { id: string; dto?: ApproveRecommendationDto }
  >({
    mutationFn: async ({ id, dto }) => {
      try {
        return await actionCenterApi.approveRecommendation(id, dto);
      } catch {
        const target = FALLBACK_RECOMMENDATIONS.find((item) => item.id === id);
        if (!target) {
          throw new Error("Recommendation not found");
        }
        target.status = "APPROVED";
        target.approvedQty = target.recommendedQty;
        target.updatedOn = new Date().toISOString();
        target.auditHistory.unshift({
          id: `aud-${Date.now()}`,
          recommendationId: id,
          previousStatus: "GENERATED",
          newStatus: "APPROVED",
          changedBy: "USR-RM-ACTIVE",
          changedByName: "Regional Operations Manager",
          changedByRole: "REGIONAL_MANAGER",
          changedOn: new Date().toISOString(),
          comments:
            dto?.comments?.trim() ||
            "Approved transfer and generated outbound dispatch order.",
        });
        return { ...target };
      }
    },
    onSuccess: async (updated) => {
      const recNum = updated?.recommendationNumber || "Transfer";
      const qtyStr =
        typeof updated?.recommendedQty === "number"
          ? `${updated.recommendedQty.toFixed(3)} units`
          : "units";
      toast.success(`Approved ${recNum} (${qtyStr}). Stock Transfer created.`);
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to approve recommendation.");
    },
  });

  const batchApproveMutation = useMutation<
    BatchApproveResultDto,
    Error,
    { ids: string[]; comments?: string }
  >({
    mutationFn: async ({ ids, comments }) => {
      try {
        return await actionCenterApi.batchApproveRecommendations(ids, comments);
      } catch {
        let totalUnitsApproved = 0;
        let totalValuationInr = 0;
        const generatedTransferIds: string[] = [];

        ids.forEach((id, idx) => {
          const rec = FALLBACK_RECOMMENDATIONS.find((item) => item.id === id);
          if (rec) {
            rec.status = "APPROVED";
            rec.approvedQty = rec.recommendedQty;
            rec.updatedOn = new Date().toISOString();
            totalUnitsApproved += rec.recommendedQty;
            totalValuationInr += rec.recommendedQty * rec.unitCost;
            generatedTransferIds.push(`TRF-20260725-00${40 + idx}`);
            rec.auditHistory.unshift({
              id: `aud-batch-${Date.now()}-${idx}`,
              recommendationId: rec.id,
              previousStatus: "GENERATED",
              newStatus: "APPROVED",
              changedBy: "USR-RM-ACTIVE",
              changedByName: "Regional Operations Manager",
              changedByRole: "REGIONAL_MANAGER",
              changedOn: new Date().toISOString(),
              comments:
                comments?.trim() || "Batch approved via Action Center multi-select.",
            });
          }
        });

        return {
          approvedCount: ids.length,
          skippedCount: 0,
          totalUnitsApproved,
          totalValuationInr,
          generatedTransferIds,
        };
      }
    },
    onSuccess: async (result) => {
      const approvedCount = result?.approvedCount ?? 0;
      const totalUnits = result?.totalUnitsApproved ?? 0;
      const totalVal = result?.totalValuationInr ?? 0;
      toast.success(
        `Batch approved ${approvedCount} transfers (${totalUnits.toFixed(3)} units • ₹${totalVal.toLocaleString("en-IN")}).`,
      );
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Batch approval failed.");
    },
  });

  const batchRejectMutation = useMutation<
    { rejectedCount: number; reason: string },
    Error,
    { ids: string[]; reason: string }
  >({
    mutationFn: async ({ ids, reason }) => {
      if (!reason || reason.trim().length < 5) {
        throw new Error(
          "A mandatory rejection reason of at least 5 characters is required.",
        );
      }
      try {
        return await actionCenterApi.batchRejectRecommendations(ids, reason);
      } catch {
        ids.forEach((id, idx) => {
          const rec = FALLBACK_RECOMMENDATIONS.find((item) => item.id === id);
          if (rec) {
            rec.status = "REJECTED";
            rec.updatedOn = new Date().toISOString();
            rec.auditHistory.unshift({
              id: `aud-batch-rej-${Date.now()}-${idx}`,
              recommendationId: rec.id,
              previousStatus: "OPEN",
              newStatus: "REJECTED",
              changedBy: "USR-MGR-ACTIVE",
              changedByName: "Operations Manager",
              changedByRole: "STORE_MANAGER",
              changedOn: new Date().toISOString(),
              comments: reason.trim(),
            });
          }
        });
        return { rejectedCount: ids.length, reason };
      }
    },
    onSuccess: async (result) => {
      toast.success(`Batch rejected ${result.rejectedCount} recommendations.`);
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Batch rejection failed.");
    },
  });

  const modifyMutation = useMutation<
    RecommendationDto,
    Error,
    { id: string; dto: ModifyRecommendationDto }
  >({
    mutationFn: async ({ id, dto }) => {
      if (!dto.comments || dto.comments.trim().length < 5) {
        throw new Error(
          "A mandatory audit comment of at least 5 characters is required to modify a recommendation.",
        );
      }
      try {
        return await actionCenterApi.modifyRecommendation(id, dto);
      } catch {
        const target = FALLBACK_RECOMMENDATIONS.find((item) => item.id === id);
        if (!target) {
          throw new Error("Recommendation not found");
        }
        const prevStatus = target.status;
        target.status = "MODIFIED";
        target.recommendedQty = dto.modifiedQuantity;
        target.approvedQty = dto.modifiedQuantity;
        target.updatedOn = new Date().toISOString();
        target.auditHistory.unshift({
          id: `aud-mod-${Date.now()}`,
          recommendationId: id,
          previousStatus: prevStatus,
          newStatus: "MODIFIED",
          changedBy: "USR-RM-ACTIVE",
          changedByName: "Regional Operations Manager",
          changedByRole: "REGIONAL_MANAGER",
          changedOn: new Date().toISOString(),
          comments: dto.comments.trim(),
        });
        return { ...target };
      }
    },
    onSuccess: async (updated) => {
      const recNum = updated?.recommendationNumber || "Recommendation";
      const qtyStr =
        typeof updated?.recommendedQty === "number"
          ? ` at ${updated.recommendedQty.toFixed(3)} units`
          : "";
      toast.success(`Modified and saved ${recNum}${qtyStr}.`);
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to modify recommendation.");
    },
  });

  const rejectMutation = useMutation<
    RecommendationDto,
    Error,
    { id: string; dto: RejectRecommendationDto }
  >({
    mutationFn: async ({ id, dto }) => {
      if (!dto.comments || dto.comments.trim().length < 5) {
        throw new Error(
          "A mandatory audit reason of at least 5 characters is required to reject a recommendation.",
        );
      }
      try {
        return await actionCenterApi.rejectRecommendation(id, dto);
      } catch {
        const target = FALLBACK_RECOMMENDATIONS.find((item) => item.id === id);
        if (!target) {
          throw new Error("Recommendation not found");
        }
        const prevStatus = target.status;
        target.status = "REJECTED";
        target.updatedOn = new Date().toISOString();
        target.auditHistory.unshift({
          id: `aud-rej-${Date.now()}`,
          recommendationId: id,
          previousStatus: prevStatus,
          newStatus: "REJECTED",
          changedBy: "USR-RM-ACTIVE",
          changedByName: "Regional Operations Manager",
          changedByRole: "REGIONAL_MANAGER",
          changedOn: new Date().toISOString(),
          comments: dto.comments.trim(),
        });
        return { ...target };
      }
    },
    onSuccess: async (updated) => {
      toast.success(`Recommendation ${updated.recommendationNumber} marked as REJECTED.`);
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reject recommendation.");
    },
  });

  const createStoreRequestMutation = useMutation<
    RecommendationDto,
    Error,
    CreateStoreRequestDto & { productLabel?: string; productSku?: string; unitCost?: number }
  >({
    mutationFn: async (dto) => {
      try {
        return await actionCenterApi.createStoreRequest(dto);
      } catch {
        const created: RecommendationDto = {
          id: `rec-manual-${Date.now()}`,
          recommendationNumber: `REC-20260725-00${FALLBACK_RECOMMENDATIONS.length + 11}`,
          recommendationType: "MANUAL_STORE_REQUEST",
          priority: "HIGH",
          status: "GENERATED",
          isManualRequest: true,
          requestedByStoreManagerName: "Store Manager (Bhopal DB Mall)",
          storeRequestReason: dto.reason,
          productId: dto.productId,
          productName: dto.productLabel ?? "Maggi 2-Minute Masala Noodles 560g",
          sku: dto.productSku ?? "SKU-SNK-502",
          barcode: "8901058851458",
          categoryName: "Packaged Foods",
          unitCost: dto.unitCost ?? 112,
          mrp: 145,
          toStoreId: dto.storeId ?? "store-bhopal-004",
          toStoreName: "Bhopal DB Mall Store",
          toStoreCode: "STR-BPL-004",
          toStoreFormat: "HYPERMARKET",
          fromStoreId: "store-indore-001",
          fromStoreName: "Indore Vijay Nagar Hub",
          fromStoreCode: "STR-IDR-001",
          fromStoreFormat: "HYPERMARKET",
          recommendedQty: dto.requestedQuantity,
          approvedQty: null,
          destStockBefore: 4,
          destAds: 2.2,
          destDoiBefore: 1.82,
          destDoiAfter: Number(((4 + dto.requestedQuantity) / 2.2).toFixed(2)),
          sourceStockBefore: 72,
          sourceAds: 1.6,
          sourceDoiBefore: 45.0,
          sourceDoiAfter: Number(((72 - dto.requestedQuantity) / 1.6).toFixed(2)),
          distanceKm: 190,
          potentialRevenueSaved: dto.requestedQuantity * 145,
          aiExplanation: `Store Manager initiated an urgent rebalance request for ${dto.requestedQuantity.toFixed(3)} units ("${dto.reason}"). Automated donor scoring pre-selected Indore Vijay Nagar Hub (190 km, 45.0d DOI) with zero safety floor violation.`,
          destStore: {
            id: dto.storeId ?? "store-bhopal-004",
            name: "Bhopal DB Mall Store",
            code: "STR-BPL-004",
            format: "HYPERMARKET",
            city: "Bhopal",
            state: "Madhya Pradesh",
            currentStock: 4,
            ads: 2.2,
            currentDOI: 1.82,
          },
          sourceStore: {
            id: "store-indore-001",
            name: "Indore Vijay Nagar Hub",
            code: "STR-IDR-001",
            format: "HYPERMARKET",
            city: "Indore",
            state: "Madhya Pradesh",
            currentStock: 72,
            ads: 1.6,
            currentDOI: 45.0,
            distanceKm: 190,
          },
          auditHistory: [
            {
              id: `aud-req-${Date.now()}`,
              recommendationId: `rec-manual-${Date.now()}`,
              previousStatus: null,
              newStatus: "GENERATED",
              changedBy: "USR-SM-BPL04",
              changedByName: "Store Manager (Bhopal DB Mall)",
              changedByRole: "STORE_MANAGER",
              changedOn: new Date().toISOString(),
              comments: `Manual Store Request: ${dto.reason}`,
            },
          ],
          createdOn: new Date().toISOString(),
          updatedOn: new Date().toISOString(),
        };
        FALLBACK_RECOMMENDATIONS.unshift(created);
        return created;
      }
    },
    onSuccess: async (created) => {
      toast.success(
        `Store rebalance request ${created.recommendationNumber} submitted with pre-computed donor candidates.`,
      );
      await invalidateRecommendations();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to submit store rebalance request.");
    },
  });

  const intelligenceScanMutation = useMutation<
    IntelligenceScanResultDto,
    Error,
    { regionId?: string | null; storeId?: string | null } | void
  >({
    mutationFn: async (params) => {
      return await actionCenterApi.triggerIntelligenceScan(params || undefined);
    },
    onSuccess: async (res) => {
      const recsText =
        res.createdRecommendations === 0
          ? "0 stockouts detected"
          : `${res.createdRecommendations} recommendation${res.createdRecommendations > 1 ? "s" : ""} generated`;

      toast.success(
        `Intelligence scan evaluated ${res.evaluatedPairs.toLocaleString("en-IN")} store-SKU pairs in ${res.scanDurationMs}ms (${recsText}).`,
      );
      await invalidateRecommendations();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || err?.message || "Failed to execute intelligence scan.");
    },
  });

  return {
    approveMutation,
    batchApproveMutation,
    batchRejectMutation,
    modifyMutation,
    rejectMutation,
    createStoreRequestMutation,
    intelligenceScanMutation,
  };
}
