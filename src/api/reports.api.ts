import { apiClient, type ApiEnvelope, type PaginatedList } from "@/api/client";

export interface ReportFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  regionId?: string | null;
  storeId?: string | null;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  brandName?: string;
  velocityTier?: string;
  stockStatus?: string;
  priority?: string;
  status?: string;
  action?: string;
  entityName?: string;
}

/** 1. Sales Report Row */
export interface SalesReportRow {
  id: string;
  transactionDate: string;
  invoiceNumber: string;
  storeCode: string;
  storeName: string;
  regionName: string;
  sku: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  unitSellingPrice: number;
  discountAmount: number;
  netSalesAmount: number;
  grossMarginAmount: number;
  marginPercent: number;
}

/** 2. Inventory Health Report Row */
export interface InventoryReportRow {
  id: string;
  storeCode: string;
  storeName: string;
  regionName: string;
  sku: string;
  productCode: string;
  productName: string;
  categoryName: string;
  availableQty: number;
  inTransitQty: number;
  ads: number;
  currentDOI: number;
  minStockLevel: number;
  reorderPoint: number;
  maxStockLevel: number;
  unitCostPrice: number;
  totalValuation: number;
  stockStatus: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";
}

/** 3. Store Performance Report Row */
export interface StorePerformanceReportRow {
  id: string;
  storeCode: string;
  storeName: string;
  city: string;
  regionName: string;
  storeFormat: string;
  totalRevenue: number;
  totalUnitsSold: number;
  grossMarginPct: number;
  inventoryValuation: number;
  avgStoreDOI: number;
  criticalSkusCount: number;
  completedTransfersCount: number;
  healthScorePct: number;
}

/** 4. Recommendation & Rebalance Report Row */
export interface RecommendationReportRow {
  id: string;
  recNumber: string;
  createdOn: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  sku: string;
  productName: string;
  destStoreCode: string;
  destStoreName: string;
  sourceStoreCode: string | null;
  sourceStoreName: string | null;
  recommendedQty: number;
  approvedQty: number | null;
  distanceKm: number;
  transferValuation: number;
  destDOIBefore: number;
  destDOIAfter: number;
  reviewedBy: string | null;
}

/** 5. 16-Column SKU / Product Performance Report Row */
export interface SkuPerformanceReportRow {
  id: string;
  sku: string;
  productCode: string;
  name: string;
  categoryName: string;
  brandName: string;
  unitOfMeasure: string;
  costPrice: number;
  mrp: number;
  sellingPrice: number;
  marginPercent: number;
  availableStock: number;
  inTransitStock: number;
  stockValuation: number;
  unitsSold: number;
  netRevenue: number;
  ads: number;
  currentDOI: number;
  velocityTier: "FAST_MOVING" | "MODERATE" | "SLOW_MOVING" | "DEAD_STOCK";
  stockStatus: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";
}

/** 6. Scoped Audit Report Row */
export interface AuditReportRow {
  id: string;
  correlationId: string;
  timestamp: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  storeCode: string | null;
  storeName: string;
  regionName: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changeSummary: string;
  remarks: string;
}

export const reportsApi = {
  async getSalesReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<SalesReportRow>> {
    const res = await apiClient.get<ApiEnvelope<PaginatedList<SalesReportRow>>>(
      "/sales/transactions",
      { params },
    );
    return res.data.data;
  },

  async getInventoryReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<InventoryReportRow>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedList<InventoryReportRow>>
    >("/inventory", { params });
    return res.data.data;
  },

  async getStorePerformanceReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<StorePerformanceReportRow>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedList<StorePerformanceReportRow>>
    >("/dashboards/store-performance", { params });
    return res.data.data;
  },

  async getRecommendationReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<RecommendationReportRow>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedList<RecommendationReportRow>>
    >("/recommendations", { params });
    return res.data.data;
  },

  async getSkuPerformanceReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<SkuPerformanceReportRow>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedList<SkuPerformanceReportRow>>
    >("/products/performance-report", { params });
    return res.data.data;
  },

  async getAuditReport(
    params: ReportFilterParams,
  ): Promise<PaginatedList<AuditReportRow>> {
    const res = await apiClient.get<
      ApiEnvelope<PaginatedList<AuditReportRow>>
    >("/audit-logs", { params });
    return res.data.data;
  },
};
