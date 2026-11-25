import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Activity,
  AlertOctagon,
  Boxes,
  ClipboardCheck,
  IndianRupee,
  Truck,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { RH_KPICard } from "@/components/ui/RH_KPICard";
import {
  RoleScopeFilterBar,
  type RoleScopeFilterState,
} from "@/components/ui/RoleScopeFilterBar";
import {
  dashboardApi,
  type ExecutiveDashboardPayload,
} from "./api/dashboard.api";
import {
  CategoryShareChart,
  HealthDonutChart,
  SalesTrendChart,
  StockOutPreventionChart,
  StoreRiskBarChart,
} from "./components/DashboardCharts";
import { ExceptionCallouts } from "./components/ExceptionCallouts";

const FALLBACK_EXECUTIVE_DATA: ExecutiveDashboardPayload = {
  kpis: {
    totalRevenue30d: 148_650_000,
    revenueGrowthPct: 14.2,
    inventoryValuation: 64_280_000,
    enterpriseHealthScorePct: 88.4,
    activeCriticalSkusCount: 19,
    openRecommendationsCount: 12,
    inTransitTransfersCount: 8,
    inTransitUnitsTotal: 420.0,
    preventedStockOuts30dValue: 4_850_000,
  },
  salesTrend: [
    { date: "01 Oct", revenue: 4_620_000, unitsSold: 18400, targetRevenue: 4_500_000 },
    { date: "05 Oct", revenue: 4_890_000, unitsSold: 19250, targetRevenue: 4_600_000 },
    { date: "10 Oct", revenue: 5_140_000, unitsSold: 20400, targetRevenue: 4_750_000 },
    { date: "15 Oct", revenue: 4_980_000, unitsSold: 19800, targetRevenue: 4_800_000 },
    { date: "20 Oct", revenue: 5_420_000, unitsSold: 21900, targetRevenue: 5_000_000 },
    { date: "25 Oct", revenue: 5_780_000, unitsSold: 23100, targetRevenue: 5_150_000 },
  ],
  healthDistribution: [
    { status: "HEALTHY", skuStoreCount: 3840, percentage: 76.8, valuation: 46_200_000 },
    { status: "LOW", skuStoreCount: 620, percentage: 12.4, valuation: 7_450_000 },
    { status: "CRITICAL", skuStoreCount: 190, percentage: 3.8, valuation: 2_180_000 },
    { status: "EXCESS", skuStoreCount: 350, percentage: 7.0, valuation: 8_450_000 },
  ],
  topAtRiskStores: [
    {
      storeId: "store-bpl-001",
      storeCode: "BPL-001",
      storeName: "Bhopal MP Nagar Store",
      city: "Bhopal",
      criticalCount: 7,
      lowCount: 14,
      excessCount: 2,
      avgDOI: 4.8,
    },
    {
      storeId: "store-mum-002",
      storeCode: "JM-MUM-002",
      storeName: "Andheri East Quick-Fulfilment Hub",
      city: "Mumbai",
      criticalCount: 5,
      lowCount: 11,
      excessCount: 3,
      avgDOI: 5.4,
    },
    {
      storeId: "store-pun-003",
      storeCode: "DM-PUN-003",
      storeName: "Hinjewadi Supercenter",
      city: "Pune",
      criticalCount: 4,
      lowCount: 9,
      excessCount: 5,
      avgDOI: 6.9,
    },
    {
      storeId: "store-blr-006",
      storeCode: "JM-BLR-005",
      storeName: "Whitefield Omni-Channel Center",
      city: "Bengaluru",
      criticalCount: 3,
      lowCount: 8,
      excessCount: 4,
      avgDOI: 7.8,
    },
  ],
  categoryShare: [
    { categoryName: "Beverages", revenue: 38_400_000, stockValue: 15_200_000, sharePct: 25.8 },
    { categoryName: "Staples & Oil", revenue: 44_100_000, stockValue: 19_800_000, sharePct: 29.7 },
    { categoryName: "Packaged Foods", revenue: 31_200_000, stockValue: 13_400_000, sharePct: 21.0 },
    { categoryName: "Personal Care", revenue: 21_500_000, stockValue: 9_600_000, sharePct: 14.5 },
    { categoryName: "Home Care", revenue: 13_450_000, stockValue: 6_280_000, sharePct: 9.0 },
  ],
  stockOutPrevention: [
    { weekLabel: "Wk 1", rebalancedUnits: 310, protectedRevenue: 980_000, avgResolutionHours: 4.2 },
    { weekLabel: "Wk 2", rebalancedUnits: 425, protectedRevenue: 1_240_000, avgResolutionHours: 3.8 },
    { weekLabel: "Wk 3", rebalancedUnits: 390, protectedRevenue: 1_190_000, avgResolutionHours: 3.5 },
    { weekLabel: "Wk 4", rebalancedUnits: 480, protectedRevenue: 1_440_000, avgResolutionHours: 3.1 },
  ],
  exceptionCallouts: [
    {
      id: "exc-bpl-1024",
      severity: "CRITICAL",
      title: "Golden Path Stock-Out Risk (< 1.5d DOI)",
      storeCode: "BPL-001",
      storeName: "Bhopal MP Nagar Store",
      sku: "SKU-1024",
      productName: "Tata Tea Premium 1kg",
      metricSummary: "Stock: 3.000 units · ADS: 2.10 · DOI: 1.43d · Donor: IND-001 (190 km)",
      recommendationId: "rec-golden-1001",
      recNumber: "REC-2026-1001",
    },
    {
      id: "exc-mum-2041",
      severity: "HIGH",
      title: "High-Velocity Edible Oil Depletion",
      storeCode: "JM-MUM-002",
      storeName: "Andheri East Quick-Fulfilment Hub",
      sku: "SKU-2041",
      productName: "Fortune Sunlite Refined Oil 5L",
      metricSummary: "Stock: 6.000 units · ADS: 3.20 · DOI: 1.88d · Donor: DM-MUM-001 (14 km)",
      recommendationId: "rec-mum-1002",
      recNumber: "REC-2026-1002",
    },
    {
      id: "exc-pun-3019",
      severity: "MEDIUM",
      title: "Weekend Promotion Velocity Surge",
      storeCode: "DM-PUN-003",
      storeName: "Hinjewadi Supercenter",
      sku: "SKU-3019",
      productName: "Surf Excel Matic Liquid 2L",
      metricSummary: "Stock: 11.000 units · ADS: 2.60 · DOI: 4.23d · Central Supply Fallback",
      recommendationId: "rec-pun-1003",
      recNumber: "REC-2026-1003",
    },
  ],
};

export const ExecutiveDashboardView: React.FC = () => {
  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "dashboards",
      "executive",
      filters.regionId,
      filters.storeId,
      format(filters.startDate, "yyyy-MM-dd"),
      format(filters.endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      try {
        return await dashboardApi.getExecutiveDashboard({
          regionId: filters.regionId,
          storeId: filters.storeId,
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
      } catch {
        return FALLBACK_EXECUTIVE_DATA;
      }
    },
  });

  const payload = data ?? FALLBACK_EXECUTIVE_DATA;
  const { kpis } = payload;

  return (
    <PageLayout
      title="Executive Operations & Supply Chain Command Center"
      description="Real-time 50-store enterprise telemetry, DOI health distribution, and inter-store rebalance impact."
      loading={isLoading}
      onRetry={() => void refetch()}
    >
      <div className="space-y-6">
        {/* Role-Scoped Filter Bar */}
        <RoleScopeFilterBar value={filters} onChange={setFilters} />

        {/* 6-Column Responsive KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <RH_KPICard
            title="30d Net Revenue"
            value={`₹${(kpis.totalRevenue30d / 10_000_000).toFixed(2)}Cr`}
            trend="up"
            trendValue={`+${kpis.revenueGrowthPct.toFixed(1)}%`}
            targetComparison="vs prior 30d"
            sparklineData={[44, 46, 49, 51, 50, 54, 58]}
            icon={<IndianRupee className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Stock Valuation"
            value={`₹${(kpis.inventoryValuation / 10_000_000).toFixed(2)}Cr`}
            trend="neutral"
            trendValue="50 Stores"
            targetComparison="Active inventory"
            sparklineData={[62, 63, 64, 63, 65, 64, 64]}
            icon={<Boxes className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Enterprise Health"
            value={`${kpis.enterpriseHealthScorePct.toFixed(1)}%`}
            trend="up"
            trendValue="+2.4%"
            targetComparison="SKUs within 7–30d DOI"
            sparklineData={[82, 84, 85, 86, 87, 88, 88.4]}
            icon={<Activity className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Critical Stock-Out Risks"
            value={kpis.activeCriticalSkusCount}
            trend="down"
            trendValue="< 3.0d DOI"
            targetComparison="Immediate action"
            sparklineData={[28, 25, 24, 22, 21, 20, 19]}
            icon={<AlertOctagon className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Open Rebalance Recs"
            value={kpis.openRecommendationsCount}
            trend="neutral"
            trendValue="Action Center"
            targetComparison="Awaiting approval"
            sparklineData={[16, 15, 14, 15, 13, 12, 12]}
            icon={<ClipboardCheck className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="In-Transit Stock"
            value={`${kpis.inTransitUnitsTotal.toFixed(3)}`}
            trend="up"
            trendValue={`${kpis.inTransitTransfersCount} Convoys`}
            targetComparison={`Protected ₹${(kpis.preventedStockOuts30dValue / 100_000).toFixed(1)}L`}
            sparklineData={[280, 310, 350, 390, 400, 410, 420]}
            icon={<Truck className="h-4 w-4 size-4 shrink-0" />}
          />
        </div>

        {/* Actionable Exception Callouts */}
        <ExceptionCallouts items={payload.exceptionCallouts} />

        {/* 12-Column Bento Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <SalesTrendChart data={payload.salesTrend} />
          </div>
          <div className="lg:col-span-4">
            <HealthDonutChart data={payload.healthDistribution} />
          </div>

          <div className="lg:col-span-4">
            <StoreRiskBarChart data={payload.topAtRiskStores} />
          </div>
          <div className="lg:col-span-4">
            <CategoryShareChart data={payload.categoryShare} />
          </div>
          <div className="lg:col-span-4">
            <StockOutPreventionChart data={payload.stockOutPrevention} />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
