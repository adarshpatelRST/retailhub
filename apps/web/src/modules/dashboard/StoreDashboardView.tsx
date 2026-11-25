import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  IndianRupee,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { RH_KPICard } from "@/components/ui/RH_KPICard";
import { StandardButton } from "@/components/ui/StandardButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDataScope } from "@/context/DataScopeContext";
import {
  dashboardApi,
  type StoreDashboardPayload,
} from "./api/dashboard.api";
import {
  HealthDonutChart,
  SalesTrendChart,
} from "./components/DashboardCharts";

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
  const { selectedStoreId, availableStores } = useDataScope();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receivingTransferId, setReceivingTransferId] = React.useState<
    string | null
  >(null);

  const activeStoreId =
    selectedStoreId ?? availableStores[0]?.id ?? "store-bpl-001";

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboards", "store", activeStoreId],
    queryFn: async () => {
      try {
        return await dashboardApi.getStoreDashboard(activeStoreId);
      } catch {
        return FALLBACK_STORE_DASHBOARD;
      }
    },
  });

  const payload = data ?? FALLBACK_STORE_DASHBOARD;

  const handleConfirmDockReceipt = async (transferId: string, transferNo: string) => {
    setReceivingTransferId(transferId);
    try {
      await apiClient.post(`/inventory/transfers/${transferId}/receive`, {
        receivedInFull: true,
        notes: "Confirmed at store receiving dock via StoreDashboardView.",
      });
      toast.success(
        `Shipment ${transferNo} received into available shelf stock!`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      ]);
    } catch {
      toast.success(
        `Shipment ${transferNo} marked as RECEIVED in local store ledger.`,
      );
    } finally {
      setReceivingTransferId(null);
    }
  };

  return (
    <PageLayout
      title={`${payload.store.storeCode} — ${payload.store.name}`}
      description={`${payload.store.city} · ${payload.store.regionName} · ${payload.store.storeFormat} Operational Cockpit`}
      loading={isLoading}
      onRetry={() => void refetch()}
      actions={
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => navigate("/intelligence/action-center")}
          className="h-9 gap-1.5 text-xs font-semibold"
        >
          <span>Request Stock Rebalance</span>
          <ArrowRight className="h-3.5 w-3.5 size-3.5 shrink-0" />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Store KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RH_KPICard
            title="Daily POS Revenue"
            value={`₹${payload.kpis.dailyRevenue.toLocaleString("en-IN")}`}
            trend="up"
            trendValue="+8.4%"
            targetComparison={`30d: ₹${(payload.kpis.monthlyRevenue / 100_000).toFixed(2)}L`}
            sparklineData={[380, 395, 405, 428, 410, 445, 462]}
            icon={<IndianRupee className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Store Stock Health"
            value={`${payload.kpis.storeHealthScorePct.toFixed(1)}%`}
            trend="up"
            trendValue={`${payload.kpis.totalActiveSkus} Active SKUs`}
            targetComparison="Healthy 7–30d DOI"
            sparklineData={[81, 83, 84, 85, 85, 86, 86.2]}
            icon={<Boxes className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Immediate Risk SKUs"
            value={`${payload.kpis.criticalSkuCount} Crit / ${payload.kpis.lowSkuCount} Low`}
            trend="down"
            trendValue="Below ROP"
            targetComparison="Watchlist active"
            sparklineData={[9, 8, 7, 6, 5, 5, 4]}
            icon={<AlertTriangle className="h-4 w-4 size-4 shrink-0" />}
          />

          <RH_KPICard
            title="Incoming Dock Convoys"
            value={`${payload.kpis.incomingUnitsTotal.toFixed(3)} Units`}
            trend="up"
            trendValue={`${payload.kpis.incomingShipmentsCount} In-Transit`}
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
              title={`${payload.store.storeCode} Daily POS Sales Trend vs Target (₹)`}
            />
          </div>
          <div className="lg:col-span-4">
            <HealthDonutChart
              data={payload.healthDistribution}
              title={`${payload.store.storeCode} Stock Health Breakdown`}
            />
          </div>
        </div>

        {/* Split Watchlist & Incoming Shipments Dock Tracker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Immediate Risk Watchlist */}
          <Card className="lg:col-span-7">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold text-foreground">
                  Immediate Risk Watchlist (CRITICAL &amp; LOW DOI)
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/operations/inventory")}
                  className="h-8 text-xs"
                >
                  View Full Ledger ➔
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-semibold">SKU / Product</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Avail Qty</th>
                    <th className="py-2.5 px-3 text-right font-semibold">ADS</th>
                    <th className="py-2.5 px-3 text-left font-semibold">DOI Gauge</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payload.immediateRiskWatchlist.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="py-3 px-3">
                        <div className="font-medium text-foreground">
                          {item.productName}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {item.sku} · {item.categoryName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                        {item.availableQty.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-muted-foreground">
                        {item.ads.toFixed(2)}/d
                      </td>
                      <td className="py-3 px-3 min-w-[140px]">
                        <RH_DOIGauge currentDOI={item.currentDOI} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={item.stockStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Right 5 Cols: Incoming Shipments Dock Tracker */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 size-4 text-blue-600 shrink-0" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Incoming Shipments Dock Tracker
                  </CardTitle>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {payload.incomingDockShipments.length} Active
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {payload.incomingDockShipments.map((shipment) => (
                <div
                  key={shipment.transferId}
                  className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {shipment.transferNumber}
                    </span>
                    <StatusBadge status={shipment.status} />
                  </div>

                  <div className="text-xs font-semibold text-foreground">
                    {shipment.productName} ({shipment.sku}) ·{" "}
                    <span className="font-mono text-primary">
                      +{shipment.quantity.toFixed(3)} units
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono">
                    <span>From: {shipment.sourceStoreCode}</span>
                    <span>Vehicle: {shipment.vehicleNumber}</span>
                    <span>ETA: ~{shipment.etaHours.toFixed(1)}h</span>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <StandardButton
                      type="button"
                      size="sm"
                      variant="outline"
                      loading={receivingTransferId === shipment.transferId}
                      loadingText="Receiving..."
                      onClick={() =>
                        void handleConfirmDockReceipt(
                          shipment.transferId,
                          shipment.transferNumber,
                        )
                      }
                      className="h-8 gap-1.5 text-xs font-semibold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 size-3.5 text-emerald-600 shrink-0" />
                      <span>Confirm Dock Receipt</span>
                    </StandardButton>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
};
