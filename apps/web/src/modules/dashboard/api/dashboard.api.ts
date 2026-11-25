import { apiClient, type ApiEnvelope } from "@/api/client";

export interface ExecutiveKpiMetrics {
  totalRevenue30d: number;
  revenueGrowthPct: number;
  inventoryValuation: number;
  enterpriseHealthScorePct: number;
  activeCriticalSkusCount: number;
  openRecommendationsCount: number;
  inTransitTransfersCount: number;
  inTransitUnitsTotal: number;
  preventedStockOuts30dValue: number;
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  unitsSold: number;
  targetRevenue: number;
}

export interface HealthDistributionSlice {
  status: "HEALTHY" | "LOW" | "CRITICAL" | "EXCESS";
  skuStoreCount: number;
  percentage: number;
  valuation: number;
}

export interface StoreRiskBarItem {
  storeId: string;
  storeCode: string;
  storeName: string;
  city: string;
  criticalCount: number;
  lowCount: number;
  excessCount: number;
  avgDOI: number;
}

export interface CategoryShareItem {
  categoryName: string;
  revenue: number;
  stockValue: number;
  sharePct: number;
}

export interface StockOutPreventionPoint {
  weekLabel: string;
  rebalancedUnits: number;
  protectedRevenue: number;
  avgResolutionHours: number;
}

export interface ExceptionCalloutItem {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  storeCode: string;
  storeName: string;
  sku: string;
  productName: string;
  metricSummary: string;
  recommendationId?: string;
  recNumber?: string;
}

export interface ExecutiveDashboardPayload {
  kpis: ExecutiveKpiMetrics;
  salesTrend: SalesTrendPoint[];
  healthDistribution: HealthDistributionSlice[];
  topAtRiskStores: StoreRiskBarItem[];
  categoryShare: CategoryShareItem[];
  stockOutPrevention: StockOutPreventionPoint[];
  exceptionCallouts: ExceptionCalloutItem[];
}

export interface StoreWatchlistItem {
  id: string;
  productId: string;
  sku: string;
  productCode: string;
  productName: string;
  categoryName: string;
  availableQty: number;
  inTransitQty: number;
  ads: number;
  currentDOI: number;
  rop: number;
  stockStatus: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";
  openRecNumber?: string | null;
}

export interface IncomingDockShipmentItem {
  transferId: string;
  transferNumber: string;
  sourceStoreCode: string;
  sourceStoreName: string;
  sku: string;
  productName: string;
  quantity: number;
  status: "APPROVED_IN_TRANSIT" | "DISPATCHED" | "RECEIVED";
  carrierName: string;
  vehicleNumber: string;
  dispatchedAt: string;
  etaHours: number;
}

export interface StoreDashboardPayload {
  store: {
    id: string;
    storeCode: string;
    name: string;
    city: string;
    regionName: string;
    storeFormat: string;
  };
  kpis: {
    dailyRevenue: number;
    monthlyRevenue: number;
    totalActiveSkus: number;
    criticalSkuCount: number;
    lowSkuCount: number;
    incomingShipmentsCount: number;
    incomingUnitsTotal: number;
    storeHealthScorePct: number;
  };
  salesTrend: SalesTrendPoint[];
  healthDistribution: HealthDistributionSlice[];
  immediateRiskWatchlist: StoreWatchlistItem[];
  incomingDockShipments: IncomingDockShipmentItem[];
}

export const dashboardApi = {
  /**
   * GET /api/v1/dashboards/executive
   * Retrieves enterprise/regional KPIs, 5 Recharts datasets, and actionable exception callouts.
   */
  async getExecutiveDashboard(params?: {
    regionId?: string | null;
    storeId?: string | null;
    startDate?: string;
    endDate?: string;
  }): Promise<ExecutiveDashboardPayload> {
    const response = await apiClient.get<
      ApiEnvelope<ExecutiveDashboardPayload>
    >("/dashboards/executive", { params });
    return response.data.data;
  },

  /**
   * GET /api/v1/dashboards/store/:storeId
   * Retrieves single-store KPIs, Immediate Risk Watchlist, and Incoming Shipments Dock Tracker.
   */
  async getStoreDashboard(storeId: string): Promise<StoreDashboardPayload> {
    const response = await apiClient.get<ApiEnvelope<StoreDashboardPayload>>(
      `/dashboards/store/${storeId}`,
    );
    return response.data.data;
  },
};
