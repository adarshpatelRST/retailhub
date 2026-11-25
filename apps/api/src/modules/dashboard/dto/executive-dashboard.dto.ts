export interface ExecutiveKpiSummaryDto {
  totalSales: number;
  salesTarget: number;
  salesAchievementPercent: number;
  totalInventoryValue: number;
  stockOutSKUsCount: number;
  trappedExcessCapital: number;
  openRecommendationsCount: number;
}

export interface SalesTrendPointDto {
  date: string;
  actualRevenue: number;
  targetRevenue: number;
}

export interface InventoryHealthDistributionDto {
  healthy: number;
  low: number;
  critical: number;
  excess: number;
}

export interface TopStockOutProneStoreDto {
  storeId: string;
  storeCode: string;
  storeName: string;
  city: string;
  activeStockOutCount: number;
}

export interface CategoryPerformanceItemDto {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  revenue: number;
  revenueSharePercent: number;
  estimatedMarginPercent: number;
}

export interface StockOutTrendPointDto {
  weekLabel: string;
  preventedByTransfers: number;
  activeStockOutAlerts: number;
}

export class ExecutiveDashboardDto {
  dateRange!: {
    startDate: string;
    endDate: string;
  };
  cached!: boolean;
  generatedAt!: string;
  kpis!: ExecutiveKpiSummaryDto;
  charts!: {
    salesTrend: SalesTrendPointDto[];
    inventoryHealthDistribution: InventoryHealthDistributionDto;
    topStockOutProneStores: TopStockOutProneStoreDto[];
    categoryPerformance: CategoryPerformanceItemDto[];
    stockOutTrend: StockOutTrendPointDto[];
  };
  exceptionCallouts!: string[];
}
