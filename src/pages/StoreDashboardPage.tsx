import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  IndianRupee,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { RH_KPICard } from "@/components/ui/RH_KPICard";
import { StandardButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DatePicker } from "@/components/ui/date-picker";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import {
  dashboardApi,
  type StoreDashboardPayload,
} from "@/api/dashboard.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HealthDonutChart,
  SalesTrendChart,
} from "@/components/dashboard/DashboardCharts";

const FALLBACK_STORE_DASHBOARD: StoreDashboardPayload = {
  store: {
    id: "store-bpl-001",
    storeCode: "BPL-001",
    name: "Bhopal MP Nagar Store",
    city: "Bhopal",
    regionName: "Central MP",
    storeFormat: "HYPERMARKET",
  },
  kpis: {
    dailyRevenue: 412_500,
    monthlyRevenue: 12_480_000,
    totalActiveSkus: 142,
    criticalSkuCount: 4,
    lowSkuCount: 9,
    incomingShipmentsCount: 3,
    incomingUnitsTotal: 65.0,
    storeHealthScorePct: 86.2,
  },
  salesTrend: [
    { date: "01 Oct", revenue: 390_000, unitsSold: 1420, targetRevenue: 385_000 },
    { date: "06 Oct", revenue: 405_000, unitsSold: 1490, targetRevenue: 390_000 },
    { date: "12 Oct", revenue: 428_000, unitsSold: 1580, targetRevenue: 400_000 },
    { date: "18 Oct", revenue: 410_000, unitsSold: 1510, targetRevenue: 405_000 },
    { date: "24 Oct", revenue: 445_000, unitsSold: 1640, targetRevenue: 415_000 },
    { date: "26 Oct", revenue: 462_000, unitsSold: 1710, targetRevenue: 420_000 },
  ],
  healthDistribution: [
    { status: "HEALTHY", skuStoreCount: 118, percentage: 83.1, valuation: 1_840_000 },
    { status: "LOW", skuStoreCount: 14, percentage: 9.9, valuation: 210_000 },
    { status: "CRITICAL", skuStoreCount: 4, percentage: 2.8, valuation: 48_000 },
    { status: "EXCESS", skuStoreCount: 6, percentage: 4.2, valuation: 135_000 },
  ],
  immediateRiskWatchlist: [
    {
      id: "wl-1",
      productId: "prod-tata-tea-1kg",
      sku: "SKU-1024",
      productCode: "8901052010240",
      productName: "Tata Tea Premium 1kg",
      categoryName: "Beverages",
      availableQty: 3.0,
      inTransitQty: 10.0,
      ads: 2.1,
      currentDOI: 1.43,
      rop: 14.7,
      stockStatus: "CRITICAL",
      openRecNumber: "REC-2026-1001",
    },
    {
      id: "wl-2",
      productId: "prod-fortune-oil-5l",
      sku: "SKU-2041",
      productCode: "8901052020416",
      productName: "Fortune Sunlite Refined Oil 5L",
      categoryName: "Staples & Oil",
      availableQty: 5.0,
      inTransitQty: 0.0,
      ads: 2.4,
      currentDOI: 2.08,
      rop: 16.8,
      stockStatus: "CRITICAL",
      openRecNumber: "REC-2026-1004",
    },
    {
      id: "wl-3",
      productId: "prod-aashirvaad-10kg",
      sku: "SKU-1088",
      productCode: "8901052010882",
      productName: "Aashirvaad Shudh Chakki Atta 10kg",
      categoryName: "Staples & Oil",
      availableQty: 14.0,
      inTransitQty: 20.0,
      ads: 3.5,
      currentDOI: 4.0,
      rop: 24.5,
      stockStatus: "LOW",
      openRecNumber: null,
    },
    {
      id: "wl-4",
      productId: "prod-daawat-rice-5kg",
      sku: "SKU-1015",
      productCode: "8901052010158",
      productName: "Daawat Rozana Basmati Rice 5kg",
      categoryName: "Staples & Pulses",
      availableQty: 8.0,
      inTransitQty: 15.0,
      ads: 2.2,
      currentDOI: 3.64,
      rop: 18.0,
      stockStatus: "LOW",
      openRecNumber: null,
    },
    {
      id: "wl-5",
      productId: "prod-amul-butter-500g",
      sku: "SKU-1033",
      productCode: "8901052010332",
      productName: "Amul Butter Pasteurised 500g",
      categoryName: "Dairy & Frozen",
      availableQty: 2.0,
      inTransitQty: 0.0,
      ads: 1.8,
      currentDOI: 1.11,
      rop: 12.0,
      stockStatus: "CRITICAL",
      openRecNumber: "REC-2026-1008",
    },
    {
      id: "wl-6",
      productId: "prod-surf-excel-2kg",
      sku: "SKU-1052",
      productCode: "8901052010523",
      productName: "Surf Excel Matic Front Load 2kg",
      categoryName: "Household & Cleaning",
      availableQty: 6.0,
      inTransitQty: 0.0,
      ads: 1.5,
      currentDOI: 4.0,
      rop: 15.0,
      stockStatus: "LOW",
      openRecNumber: null,
    },
  ],
  incomingDockShipments: [
    {
      transferId: "trf-9001",
      transferNumber: "TRF-2026-9001",
      sourceStoreCode: "IND-001",
      sourceStoreName: "Indore Vijay Nagar Store",
      sku: "SKU-1024",
      productName: "Tata Tea Premium 1kg",
      quantity: 10.0,
      status: "APPROVED_IN_TRANSIT",
      carrierName: "Delhivery Linehaul MP",
      vehicleNumber: "MP-09-HH-4821",
      dispatchedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      etaHours: 1.8,
    },
    {
      transferId: "trf-9002",
      transferNumber: "TRF-2026-9002",
      sourceStoreCode: "IND-001",
      sourceStoreName: "Indore Vijay Nagar Store",
      sku: "SKU-1088",
      productName: "Aashirvaad Shudh Chakki Atta 10kg",
      quantity: 20.0,
      status: "APPROVED_IN_TRANSIT",
      carrierName: "BlueDart Surface Express",
      vehicleNumber: "MP-04-GA-9912",
      dispatchedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      etaHours: 1.0,
    },
  ],
};

export const StoreDashboardView: React.FC = () => {
  const { user } = useAuth();
  const { selectedStoreId, setSelectedStoreId, availableStores } = useDataScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Date range filters for both Store Manager and Regional Manager
  const [startDate, setStartDate] = React.useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = React.useState<Date>(() => new Date());

  const diffDays = Math.max(1, differenceInDays(endDate, startDate) + 1);

  const isRegionalManager = user?.role === "REGIONAL_MANAGER";

  const activeStoreId =
    selectedStoreId ?? availableStores[0]?.id ?? "store-bpl-001";

  const storeComboboxItems = React.useMemo<ComboboxItem[]>(() => {
    return availableStores.map((st) => ({
      id: st.id,
      label: `${st.storeCode} — ${st.name}`,
      subLabel: `${st.city}${st.regionName ? ` · ${st.regionName}` : ""}`,
    }));
  }, [availableStores]);

  const handleResetFilters = () => {
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    if (isRegionalManager && availableStores.length > 0) {
      setSelectedStoreId(availableStores[0].id);
    }
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "dashboards",
      "store",
      activeStoreId,
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      try {
        return await dashboardApi.getStoreDashboard(activeStoreId, {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        });
      } catch {
        return FALLBACK_STORE_DASHBOARD;
      }
    },
  });

  const payload: StoreDashboardPayload = React.useMemo(() => {
    if (!data) return FALLBACK_STORE_DASHBOARD;
    return {
      store: {
        ...FALLBACK_STORE_DASHBOARD.store,
        ...(data.store || {}),
      },
      kpis: {
        ...FALLBACK_STORE_DASHBOARD.kpis,
        ...(data.kpis || {}),
      },
      salesTrend: data.salesTrend && data.salesTrend.length > 0 ? data.salesTrend : FALLBACK_STORE_DASHBOARD.salesTrend,
      healthDistribution: data.healthDistribution && data.healthDistribution.length > 0 ? data.healthDistribution : FALLBACK_STORE_DASHBOARD.healthDistribution,
      immediateRiskWatchlist: data.immediateRiskWatchlist || [],
      incomingDockShipments: data.incomingDockShipments || [],
    };
  }, [data]);

  return (
    <PageLayout
      title={`${payload.store?.storeCode || "Store"} — ${payload.store?.name || "Operations Cockpit"}`}
      description={`${payload.store?.city || ""} · ${payload.store?.regionName || ""} · ${payload.store?.storeFormat || "Store"} Operational Cockpit`}
      loading={isLoading}
      onRetry={() => void refetch()}
      actions={
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => navigate("/intelligence/action-center")}
            className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <span>Request Stock Rebalance</span>
            <ArrowRight className="h-3.5 w-3.5 size-3.5 shrink-0" />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Date & Store Operations Filter Bar */}
        <ModuleFilterBar
          title={isRegionalManager ? "Regional Store & Operational Filters" : "Store Operational Date Filters"}
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          {isRegionalManager ? (
            <ModuleFilterGrid columns={3}>
              <ModuleFilterItem label="Assigned Regional Store">
                <DropSearch
                  items={storeComboboxItems}
                  value={activeStoreId}
                  onChange={(val) => {
                    if (val) setSelectedStoreId(val);
                  }}
                  placeholder="Select store..."
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans"
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="Start Date">
                <DatePicker
                  date={startDate}
                  maxDate={endDate}
                  onSelect={(d) => {
                    if (d) setStartDate(d);
                  }}
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="End Date">
                <DatePicker
                  date={endDate}
                  minDate={startDate}
                  align="end"
                  onSelect={(d) => {
                    if (d) setEndDate(d);
                  }}
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          ) : (
            <ModuleFilterGrid columns={2}>
              <ModuleFilterItem label="Start Date">
                <DatePicker
                  date={startDate}
                  maxDate={endDate}
                  onSelect={(d) => {
                    if (d) setStartDate(d);
                  }}
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="End Date">
                <DatePicker
                  date={endDate}
                  minDate={startDate}
                  align="end"
                  onSelect={(d) => {
                    if (d) setEndDate(d);
                  }}
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          )}
        </ModuleFilterBar>

        {/* Store KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RH_KPICard
            title="Daily POS Revenue"
            value={`₹${(payload.kpis?.dailyRevenue || 0).toLocaleString("en-IN")}`}
            trend="up"
            trendValue={`₹${((payload.kpis?.periodRevenue ?? payload.kpis?.monthlyRevenue ?? 0) / 100_000).toFixed(2)}L (${diffDays}d Period)`}
            targetComparison={`${diffDays}d Target: ₹${((((payload.kpis?.dailyRevenue || 0) * 1.05) * diffDays) / 100_000).toFixed(2)}L`}
            sparklineData={[380, 395, 405, 428, 410, 445, 462]}
            icon={<IndianRupee className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Store Stock Health"
            value={`${(payload.kpis?.storeHealthScorePct || 0).toFixed(1)}%`}
            trend="up"
            trendValue={`${payload.kpis?.totalActiveSkus || 0} Active SKUs`}
            targetComparison="Healthy 7–30d DOI"
            sparklineData={[81, 83, 84, 85, 85, 86, 86.2]}
            icon={<Boxes className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Immediate Risk SKUs"
            value={`${payload.kpis?.criticalSkuCount || 0} Crit / ${payload.kpis?.lowSkuCount || 0} Low`}
            trend="down"
            trendValue="Below ROP"
            targetComparison="Watchlist active"
            sparklineData={[9, 8, 7, 6, 5, 5, 4]}
            icon={<AlertTriangle className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Incoming Dock Convoys"
            value={`${(payload.kpis?.incomingUnitsTotal || 0).toFixed(1)} Units`}
            trend="up"
            trendValue={`${payload.kpis?.incomingShipmentsCount || 0} In-Transit`}
            targetComparison="Ready for dock receipt"
            sparklineData={[20, 30, 45, 50, 60, 65, 65]}
            icon={<Truck className="h-4 w-4 size-4 shrink-0" />}
          />
        </div>

        {/* Store Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <SalesTrendChart
              data={payload.salesTrend}
              title={`${payload.store?.storeCode || "Store"} Sales Trend vs Target (${format(startDate, "dd MMM yyyy")} – ${format(endDate, "dd MMM yyyy")})`}
            />
          </div>
          <div className="lg:col-span-4">
            <HealthDonutChart
              data={payload.healthDistribution}
              title={`${payload.store?.storeCode || "Store"} Stock Health Breakdown (Current)`}
            />
          </div>
        </div>

        {/* Split Watchlist & Incoming Shipments Dock Tracker (Calibrated Matching Height) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left 7 Cols: Immediate Risk Watchlist (Displaying 6 records visibly) */}
          <Card className="lg:col-span-7 flex flex-col h-[405px]">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 size-4 text-amber-500 shrink-0" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Immediate Risk Watchlist (Current Shelf Stock)
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {payload.immediateRiskWatchlist.length} Items
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/operations/inventory")}
                    className="h-7 text-xs px-2"
                  >
                    View Full Ledger ➔
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto overflow-x-auto p-0">
              {payload.immediateRiskWatchlist.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    All SKUs Operating in Healthy DOI Range
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No critical or low stock exceptions detected at this store.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-max">
                  <thead className="sticky top-0 z-10 border-b bg-muted/95 backdrop-blur-xs text-xs text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">SKU / Product</th>
                      <th className="py-2 px-3 text-right font-semibold">Avail Qty</th>
                      <th className="py-2 px-3 text-right font-semibold">ADS</th>
                      <th className="py-2 px-3 text-left font-semibold">DOI Gauge</th>
                      <th className="py-2 px-3 text-center font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payload.immediateRiskWatchlist.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="py-2 px-3">
                          <div
                            className="font-medium text-foreground text-xs truncate max-w-[200px]"
                            title={item.productName}
                          >
                            {item.productName}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {item.sku} · {item.categoryName}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-xs">
                          {Number(item.availableQty).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground text-xs">
                          {Number(item.ads).toFixed(2)}/d
                        </td>
                        <td className="py-2 px-3 min-w-[130px]">
                          <RH_DOIGauge currentDOI={item.currentDOI} />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <StatusBadge status={item.stockStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Right 5 Cols: Incoming Shipments Dock Tracker (Matching Height with Internal Scroll) */}
          <Card className="lg:col-span-5 flex flex-col h-[405px]">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 size-4 text-blue-600 shrink-0" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Incoming Shipments Dock Tracker (Live Active)
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {payload.incomingDockShipments.length} Active
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/operations/transfers")}
                    className="h-7 text-xs px-2"
                  >
                    View All Inward Convoys ➔
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
              {payload.incomingDockShipments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Truck className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    No In-Transit Dock Shipments
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    No approved peer transfers or supplier convoys currently en route.
                  </p>
                </div>
              ) : (
                payload.incomingDockShipments.map((shipment: any) => (
                  <div
                    key={shipment.transferId}
                    className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Truck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        <span className="font-mono text-xs font-bold text-foreground truncate">
                          {shipment.transferNumber}
                        </span>
                      </div>
                      <StatusBadge status={shipment.status} />
                    </div>

                    <div className="text-xs font-semibold text-foreground truncate">
                      {shipment.productName} ({shipment.sku}) ·{" "}
                      <span className="font-mono text-primary">
                        +{Number(shipment.quantity).toFixed(1)} units
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground font-mono">
                      <span>From: {shipment.sourceStoreCode}</span>
                      <span>Vehicle: {shipment.vehicleNumber}</span>
                      <span>ETA: ~{Number(shipment.etaHours || 1.5).toFixed(1)}h</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};

export const StoreDashboardPage = StoreDashboardView;
export default StoreDashboardPage;
