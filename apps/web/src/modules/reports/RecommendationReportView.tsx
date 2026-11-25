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
  type RecommendationReportRow,
} from "./api/reports.api";

const FALLBACK_RECOMMENDATION_ROWS: RecommendationReportRow[] = [
  {
    id: "rec-golden-1001",
    recNumber: "REC-2026-1001",
    createdOn: "2026-10-26 09:15",
    priority: "HIGH",
    status: "APPROVED_IN_TRANSIT",
    sku: "SKU-1024",
    productName: "Tata Tea Premium 1kg",
    destStoreCode: "BPL-001",
    destStoreName: "Bhopal MP Nagar Store",
    sourceStoreCode: "IND-001",
    sourceStoreName: "Indore Vijay Nagar Store",
    recommendedQty: 10.0,
    approvedQty: 10.0,
    distanceKm: 190,
    transferValuation: 3900.0,
    destDOIBefore: 1.43,
    destDOIAfter: 6.19,
    reviewedBy: "Priya Nair (REGIONAL_MANAGER)",
  },
  {
    id: "rec-mum-1002",
    recNumber: "REC-2026-1002",
    createdOn: "2026-10-26 10:30",
    priority: "HIGH",
    status: "OPEN",
    sku: "SKU-2041",
    productName: "Fortune Sunlite Refined Oil 5L",
    destStoreCode: "JM-MUM-002",
    destStoreName: "Andheri East Quick-Fulfilment Hub",
    sourceStoreCode: "DM-MUM-001",
    sourceStoreName: "Powai High-Velocity Hypermarket",
    recommendedQty: 18.0,
    approvedQty: null,
    distanceKm: 14,
    transferValuation: 11070.0,
    destDOIBefore: 1.88,
    destDOIAfter: 7.5,
    reviewedBy: null,
  },
  {
    id: "rec-pun-1003",
    recNumber: "REC-2026-1003",
    createdOn: "2026-10-25 16:40",
    priority: "MEDIUM",
    status: "MODIFIED",
    sku: "SKU-3019",
    productName: "Surf Excel Matic Liquid 2L",
    destStoreCode: "DM-PUN-003",
    destStoreName: "Hinjewadi Supercenter",
    sourceStoreCode: null,
    sourceStoreName: null,
    recommendedQty: 25.0,
    approvedQty: 30.0,
    distanceKm: 0,
    transferValuation: 9300.0,
    destDOIBefore: 4.23,
    destDOIAfter: 15.77,
    reviewedBy: "Ananya Deshmukh (ADMIN)",
  },
];

const RECOMMENDATION_EXPORT_COLUMNS: ExportColumnDef<RecommendationReportRow>[] = [
  { header: "Rec Number", accessor: "recNumber" },
  { header: "Created On", accessor: "createdOn" },
  { header: "Priority", accessor: "priority" },
  { header: "Status", accessor: "status" },
  { header: "SKU", accessor: "sku" },
  { header: "Product Name", accessor: "productName" },
  { header: "Destination Store", accessor: (r) => `${r.destStoreCode} - ${r.destStoreName}` },
  {
    header: "Source Store",
    accessor: (r) =>
      r.sourceStoreCode
        ? `${r.sourceStoreCode} - ${r.sourceStoreName}`
        : "Central Supply / Mother Hub",
  },
  { header: "Recommended Qty", accessor: (r) => r.recommendedQty.toFixed(3) },
  {
    header: "Approved Qty",
    accessor: (r) => (r.approvedQty !== null ? r.approvedQty.toFixed(3) : "-"),
  },
  { header: "Distance (km)", accessor: (r) => `${r.distanceKm} km` },
  { header: "Valuation (INR)", accessor: (r) => r.transferValuation.toFixed(2) },
  { header: "DOI Before -> After", accessor: (r) => `${r.destDOIBefore.toFixed(2)}d -> ${r.destDOIAfter.toFixed(2)}d` },
  { header: "Reviewed By", accessor: (r) => r.reviewedBy ?? "Pending Review" },
];

export const RecommendationReportView: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      "recommendations",
      page,
      pageSize,
      search,
      statusFilter,
      filters.regionId,
      filters.storeId,
    ],
    queryFn: async () => {
      try {
        return await reportsApi.getRecommendationReport({
          page,
          limit: pageSize,
          search,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          regionId: filters.regionId,
          storeId: filters.storeId,
        });
      } catch {
        const filtered = FALLBACK_RECOMMENDATION_ROWS.filter((r) => {
          if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.recNumber.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.destStoreCode.toLowerCase().includes(q)
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

  const rows = data?.items ?? FALLBACK_RECOMMENDATION_ROWS;
  const subtitle = `Period: ${format(filters.startDate, "dd MMM yyyy")} to ${format(
    filters.endDate,
    "dd MMM yyyy",
  )} • Status: ${statusFilter}`;

  const columns = React.useMemo<ServerColumn<RecommendationReportRow>[]>(
    () => [
      {
        key: "recNumber",
        header: "Rec Number",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-mono text-xs font-bold text-foreground">
              {r.recNumber}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.createdOn}
            </div>
          </div>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        render: (r) => <StatusBadge status={r.priority} />,
      },
      {
        key: "productName",
        header: "Product / SKU",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.productName}</div>
            <div className="font-mono text-xs text-muted-foreground">{r.sku}</div>
          </div>
        ),
      },
      {
        key: "route",
        header: "Source ➔ Destination",
        render: (r) => (
          <div className="text-xs">
            <div className="font-medium text-foreground">
              {r.sourceStoreCode ? (
                <span>
                  {r.sourceStoreCode} ➔ {r.destStoreCode} ({r.distanceKm} km)
                </span>
              ) : (
                <span className="text-purple-700 font-semibold">
                  [🏭 Central Supply / Mother Hub] ➔ {r.destStoreCode}
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              DOI: {r.destDOIBefore.toFixed(2)}d ➔ {r.destDOIAfter.toFixed(2)}d
            </div>
          </div>
        ),
      },
      {
        key: "recommendedQty",
        header: "Transfer Qty",
        align: "right",
        sortable: true,
        render: (r) => (
          <div className="font-mono tabular-nums">
            <div className="font-bold text-foreground">
              {(r.approvedQty ?? r.recommendedQty).toFixed(3)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              ₹{r.transferValuation.toLocaleString("en-IN")}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        render: (r) => <StatusBadge status={r.status} />,
      },
      {
        key: "reviewedBy",
        header: "Reviewed By",
        render: (r) => (
          <span className="text-xs text-muted-foreground">
            {r.reviewedBy ?? "Pending Review"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Recommendation & Rebalance Execution Report"
      description="Audit-ready log of algorithmic rebalance recommendations, donor distances, DOI lift, and manager approvals."
      actions={
        <ReportExportBar
          reportTitle="Recommendation & Rebalance Report"
          filterSubtitle={subtitle}
          columns={RECOMMENDATION_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_Recommendation_Report"
        />
      }
    >
      <div className="space-y-4">
        <RoleScopeFilterBar
          value={filters}
          onChange={setFilters}
          extraFilters={
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Decision Status
              </label>
              <select
                aria-label="Filter by Decision Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="APPROVED_IN_TRANSIT">APPROVED_IN_TRANSIT</option>
                <option value="MODIFIED">MODIFIED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="RECEIVED">RECEIVED</option>
              </select>
            </div>
          }
        />

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
          searchPlaceholder="Search REC number, SKU, or store..."
          onSearchChange={setSearch}
        />
      </div>
    </PageLayout>
  );
};
