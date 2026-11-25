import { apiClient, type ApiResponseEnvelope, type PaginatedResponse } from "@/api/client";

export type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

export type RecommendationStatus =
  | "GENERATED"
  | "REVIEWED"
  | "APPROVED"
  | "MODIFIED"
  | "REJECTED"
  | "EXECUTED"
  | "EXPIRED";

export type StoreFormat = "HYPERMARKET" | "SUPERMARKET" | "EXPRESS";

export interface StoreComparisonMetricsDto {
  id: string;
  name: string;
  code: string;
  format: StoreFormat;
  city: string;
  state: string;
  currentStock: number;
  ads: number;
  currentDOI: number;
  distanceKm?: number;
}

export interface ActionHistoryItemDto {
  id: string;
  recommendationId: string;
  previousStatus: RecommendationStatus | null;
  newStatus: RecommendationStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: string;
  changedOn: string;
  comments: string | null;
}

export interface RecommendationDto {
  id: string;
  recommendationNumber: string;
  recommendationType: "REBALANCE_TRANSFER" | "CENTRAL_REPLENISHMENT" | "MANUAL_STORE_REQUEST";
  priority: RecommendationPriority;
  status: RecommendationStatus;
  isManualRequest: boolean;
  requestedByStoreManagerName?: string | null;
  storeRequestReason?: string | null;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  categoryName: string;
  unitCost: number;
  mrp: number;
  toStoreId: string;
  toStoreName: string;
  toStoreCode: string;
  toStoreFormat: StoreFormat;
  fromStoreId: string | null;
  fromStoreName: string | null;
  fromStoreCode: string | null;
  fromStoreFormat: StoreFormat | null;
  recommendedQty: number;
  approvedQty?: number | null;
  destStockBefore: number;
  destAds: number;
  destDoiBefore: number;
  destDoiAfter: number;
  sourceStockBefore: number | null;
  sourceAds: number | null;
  sourceDoiBefore: number | null;
  sourceDoiAfter: number | null;
  distanceKm: number | null;
  potentialRevenueSaved: number;
  aiExplanation: string | null;
  destStore: StoreComparisonMetricsDto;
  sourceStore: (StoreComparisonMetricsDto & { distanceKm: number }) | null;
  auditHistory: ActionHistoryItemDto[];
  createdOn: string;
  updatedOn: string;
}

export interface CandidateStoreDto {
  rank: number;
  storeId: string;
  storeName: string;
  storeCode: string;
  storeFormat: StoreFormat;
  city: string;
  distanceKm: number;
  estTransitHours: number;
  availableStock: number;
  ads: number;
  currentDOI: number;
  excessUnitsAboveSafety: number;
  compositeScore: number;
}

export interface AiExplanationDto {
  recommendationId: string;
  narrative: string;
  model: string;
  generatedAt: string;
  fallbackUsed: boolean;
  confidenceScore: number;
  keyDrivers: string[];
}

export interface RecommendationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  priority?: RecommendationPriority | "";
  status?: RecommendationStatus | "";
  tab?: "ALL_OPEN" | "HIGH_PRIORITY" | "STORE_REQUESTS" | "COMPLETED_REJECTED";
  toStoreId?: string | null;
  fromStoreId?: string | null;
  regionId?: string | null;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApproveRecommendationDto {
  dispatchNow?: boolean;
  carrierName?: string;
  vehicleNumber?: string;
  driverPhone?: string;
  comments?: string;
}

export interface BatchApproveRecommendationsDto {
  ids: string[];
  comments?: string;
}

export interface BatchApproveResultDto {
  approvedCount: number;
  skippedCount: number;
  totalUnitsApproved: number;
  totalValuationInr: number;
  generatedTransferIds: string[];
}

export interface ModifyRecommendationDto {
  fromStoreId?: string | null;
  modifiedQuantity: number;
  comments: string;
  dispatchNow?: boolean;
  carrierName?: string;
  vehicleNumber?: string;
}

export interface RejectRecommendationDto {
  comments: string;
}

export interface CreateStoreRequestDto {
  storeId?: string;
  productId: string;
  requestedQuantity: number;
  reason: string;
}

export interface IntelligenceScanResultDto {
  evaluatedPairs: number;
  createdRecommendations: number;
  highPriorityCount: number;
  scanDurationMs: number;
}

export const actionCenterApi = {
  /**
   * Lists paginated inventory rebalance recommendations with priority, status, tab, and store filters.
   */
  async getRecommendations(
    params: RecommendationQueryParams = {},
  ): Promise<PaginatedResponse<RecommendationDto>> {
    const response = await apiClient.get<
      ApiResponseEnvelope<PaginatedResponse<RecommendationDto>>
    >("/recommendations", { params });
    return response.data.data;
  },

  /**
   * Retrieves a single recommendation with destination/source metrics and audit trail.
   */
  async getRecommendationById(id: string): Promise<RecommendationDto> {
    const response = await apiClient.get<ApiResponseEnvelope<RecommendationDto>>(
      `/recommendations/${encodeURIComponent(id)}`,
    );
    return response.data.data;
  },

  /**
   * Retrieves ranked candidate donor stores for a given recommendation.
   */
  async getCandidates(recommendationId: string): Promise<CandidateStoreDto[]> {
    const response = await apiClient.get<ApiResponseEnvelope<CandidateStoreDto[]>>(
      `/intelligence/candidates/${encodeURIComponent(recommendationId)}`,
    );
    return response.data.data;
  },

  /**
   * Retrieves or generates the LangChain/Gemini AI executive explanation for a recommendation.
   */
  async getAiExplanation(id: string): Promise<AiExplanationDto> {
    const response = await apiClient.get<ApiResponseEnvelope<AiExplanationDto>>(
      `/recommendations/${encodeURIComponent(id)}/explain`,
    );
    return response.data.data;
  },

  /**
   * Approves a single recommendation and auto-creates aStockTransfer (`TRF-YYYYMMDD-XXXX`).
   */
  async approveRecommendation(
    id: string,
    dto: ApproveRecommendationDto = {},
  ): Promise<RecommendationDto> {
    const response = await apiClient.post<ApiResponseEnvelope<RecommendationDto>>(
      `/recommendations/${encodeURIComponent(id)}/approve`,
      dto,
    );
    return response.data.data;
  },

  /**
   * Batch approves multiple selected recommendations in a single atomic transaction.
   */
  async batchApproveRecommendations(
    ids: string[],
    comments?: string,
  ): Promise<BatchApproveResultDto> {
    const payload: BatchApproveRecommendationsDto = { ids, comments };
    const response = await apiClient.post<
      ApiResponseEnvelope<BatchApproveResultDto>
    >("/recommendations/batch-approve", payload);
    return response.data.data;
  },

  /**
   * Modifies the donor source store and/or transfer quantity with a mandatory audit comment.
   */
  async modifyRecommendation(
    id: string,
    dto: ModifyRecommendationDto,
  ): Promise<RecommendationDto> {
    const response = await apiClient.post<ApiResponseEnvelope<RecommendationDto>>(
      `/recommendations/${encodeURIComponent(id)}/modify`,
      dto,
    );
    return response.data.data;
  },

  /**
   * Rejects a recommendation with a mandatory audit reason (>= 5 chars).
   */
  async rejectRecommendation(
    id: string,
    dto: RejectRecommendationDto,
  ): Promise<RecommendationDto> {
    const response = await apiClient.post<ApiResponseEnvelope<RecommendationDto>>(
      `/recommendations/${encodeURIComponent(id)}/reject`,
      dto,
    );
    return response.data.data;
  },

  /**
   * Submits a Store Manager custom rebalance request (`POST /api/v1/recommendations/store-request`).
   */
  async createStoreRequest(
    dto: CreateStoreRequestDto,
  ): Promise<RecommendationDto> {
    const response = await apiClient.post<ApiResponseEnvelope<RecommendationDto>>(
      "/recommendations/store-request",
      dto,
    );
    return response.data.data;
  },

  /**
   * Triggers an on-demand intelligence scan across regional store-product pairs.
   */
  async triggerIntelligenceScan(regionId?: string | null): Promise<IntelligenceScanResultDto> {
    const response = await apiClient.post<
      ApiResponseEnvelope<IntelligenceScanResultDto>
    >("/intelligence/scan", { regionId: regionId ?? undefined });
    return response.data.data;
  },
};
