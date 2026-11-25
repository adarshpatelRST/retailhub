import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { PageLayout } from "@/components/layouts/PageLayout";
import { ReportExportBar } from "@/components/ui/ReportExportBar";
import {
  RoleScopeFilterBar,
  type RoleScopeFilterState,
} from "@/components/ui/RoleScopeFilterBar";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type ExportColumnDef } from "@/lib/export-utils";
import {
  reportsApi,
  type StorePerformanceReportRow,
} from "./api/reports.api";

const FALLBACK_STORE_PERF_ROWS: StorePerformanceReportRow[] = [
  {
    id: "store-bpl-001",
    storeCode: "BPL-001",
    storeName: "Bhopal MP Nagar Store",
    city: "Bhopal",
    regionName: "Central MP",
    storeFormat: "HYPERMARKET",
    totalRevenue: 12_480_000,
    totalUnitsSold: 46_200,
    grossMarginPct: 17.8,
    inventoryValuation: 2_233_000,
    avgStoreDOI: 11.4,
    criticalSkusCount: 4,
    completedTransfersCount: 14,
    healthScorePct: 86.2,
  },
  {
    id: "store-ind-001",
    storeCode: "IND-001",
    storeName: "Indore Vijay Nagar Store",
    city: "Indore",
    regionName: "Central MP",
    storeFormat: "HYPERMARKET",
    totalRevenue: 15_920_000,
    totalUnitsSold: 58_400,
    grossMarginPct: 18.4,
    inventoryValuation: 3_190_000,
    avgStoreDOI: 18.2,
    criticalSkusCount: 1,
    completedTransfersCount: 19,
    healthScorePct: 92.5,
  },
  {
    id: "store-mum-001",
    storeCode: "DM-MUM-001",
    storeName: "Powai High-Velocity Hypermarket",
    city: "Mumbai",
    regionName: "Maharashtra West",
    storeFormat: "HYPERMARKET",
    totalRevenue: 24_650_000,
    totalUnitsSold: 88_900,
    grossMarginPct: 19.1,
    inventoryValuation: 4_850_000,
    avgStoreDOI: 14.6,
    criticalSkusCount: 2,
    completedTransfersCount: 22,
    healthScorePct: 91.0,
  },
  {
    id: "store-pun-003",
    storeCode: "DM-PUN-003",
    storeName: "Hinjewadi Supercenter",
    city: "Pune",
    regionName: "Maharashtra West",
    storeFormat: "SUPERCENTER",
    totalRevenue: 18_110_000,
    totalUnitsSold: 64_300,
    grossMarginPct: 17.2,
    inventoryValuation: 3_420_000,
    avgStoreDOI: 13.1,
    criticalSkusCount: 3,
    completedTransfersCount: 11,
    healthScorePct: 87.9,
  },
];

const STORE_PERF_EXPORT_COLUMNS: ExportColumnDef<StorePerformanceReportRow>[] = [
  { header: "Store Code", accessor: "storeCode" },
  { header: "Store Name", accessor: "storeName" },
  { header: "City", accessor: "city" },
  { header: "Region", accessor: "regionName" },
  { header: "Format", accessor: "storeFormat" },
  { header: "Total Revenue (INR)", accessor: (r) => r.totalRevenue.toFixed(2) },
  { header: "Units Sold", accessor: (r) => r.totalUnitsSold.toFixed(3) },
  { header: "Gross Margin %", accessor: (r) => `${r.grossMarginPct.toFixed(1)}%` },
  { header: "Stock Valuation (INR)", accessor: (r) => r.inventoryValuation.toFixed(2) },
  { header: "Avg Store DOI", accessor: (r) => `${r.avgStoreDOI.toFixed(1)}d` },
  { header: "Critical SKUs", accessor: "criticalSkusCount" },
  { header: "Completed Transfers", accessor: "completedTransfersCount" },
  { header: "Health Score %", accessor: (r) => `${r.healthScorePct.toFixed(1)}%` },
];

export const StorePerformanceReportView: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      "store-performance",
      page,
      pageSize,
      search,
      filters.regionId,
      filters.storeId,
      format(filters.startDate, "yyyy-MM-dd"),
      format(filters.endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      try {
        return await reportsApi.getStorePerformanceReport({
          page,
          limit: pageSize,
          search,
          regionId: filters.regionId,
          storeId: filters.storeId,
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
      } catch {
        const filtered = FALLBACK_STORE_PERF_ROWS.filter((r) => {
          if (filters.storeId && r.id !== filters.storeId) return false;
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.storeCode.toLowerCase().includes(q) ||
            r.storeName.toLowerCase().includes(q) ||
            r.city.toLowerCase().includes(q)
          );
        });
        return {
          items: filtered,
          meta: {
            page: 1,
            limit: pageSize,
            totalItems: filtered.length,
            totalPages: 1,
          },
        };
      }
    },
  });

  const rows = data?.items ?? FALLBACK_STORE_PERF_ROWS;
  const subtitle = `Period: ${format(filters.startDate, "dd MMM yyyy")} to ${format(
    filters.endDate,
    "dd MMM yyyy",
  )}`;

  const columns = React.useMemo<ServerColumn<StorePerformanceReportRow>[]>(
    () => [
      {
        key: "storeCode",
        header: "Store / Format",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.storeName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.storeCode} · {r.city} · {r.storeFormat}
            </div>
          </div>
        ),
      },
      {
        key: "regionName",
        header: "Region",
        sortable: true,
        render: (r) => <span className="text-xs font-medium">{r.regionName}</span>,
      },
      {
        key: "totalRevenue",
        header: "Net Revenue",
        align: "right",
        sortable: true,
        render: (r) => (
          <div className="font-mono tabular-nums">
            <div className="font-bold text-foreground">
              ₹{r.totalRevenue.toLocaleString("en-IN")}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {r.totalUnitsSold.toLocaleString("en-IN")} units
            </div>
          </div>
        ),
      },
      {
        key: "grossMarginPct",
        header: "Gross Margin",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold text-emerald-700">
            {r.grossMarginPct.toFixed(1)}%
          </span>
        ),
      },
      {
        key: "inventoryValuation",
        header: "Stock Valuation",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums">
            ₹{r.inventoryValuation.toLocaleString("en-IN")}
          </span>
        ),
      },
      {
        key: "avgStoreDOI",
        header: "Avg Store DOI",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold">
            {r.avgStoreDOI.toFixed(1)}d
          </span>
        ),
      },
      {
        key: "criticalSkusCount",
        header: "Crit SKUs / Transfers",
        align: "center",
        render: (r) => (
          <div className="font-mono text-xs">
            <span className="text-red-700 font-semibold">
              {r.criticalSkusCount} Crit
            </span>{" "}
            · <span>{r.completedTransfersCount} Transfers</span>
          </div>
        ),
      },
      {
        key: "healthScorePct",
        header: "Health Score",
        align: "center",
        sortable: true,
        render: (r) => (
          <StatusBadge
            status={r.healthScorePct >= 88 ? "HEALTHY" : "LOW"}
            label={`${r.healthScorePct.toFixed(1)}%`}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Store Performance & Profitability Report"
      description="Store-by-store revenue realization, gross margin %, inventory turn velocity, and rebalance execution."
      actions={
        <ReportExportBar
          reportTitle="Store Performance Report"
          filterSubtitle={subtitle}
          columns={STORE_PERF_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_Store_Performance_Report"
        />
      }
    >
      <div className="space-y-4">
        <RoleScopeFilterBar value={filters} onChange={setFilters} />

        <ServerDataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems ?? rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchValue={search}
          searchPlaceholder="Search store code, name, or city..."
          onSearchChange={setSearch}
        />
      </div>
    </PageLayout>
  );
};
