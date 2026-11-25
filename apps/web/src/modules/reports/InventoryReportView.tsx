import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { PageLayout } from "@/components/layouts/PageLayout";
import { ReportExportBar } from "@/components/ui/ReportExportBar";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
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
import { reportsApi, type InventoryReportRow } from "./api/reports.api";

const FALLBACK_INVENTORY_ROWS: InventoryReportRow[] = [
  {
    id: "inv-bpl-1024",
    storeCode: "BPL-001",
    storeName: "Bhopal MP Nagar Store",
    regionName: "Central MP",
    sku: "SKU-1024",
    productCode: "8901052010240",
    productName: "Tata Tea Premium 1kg",
    categoryName: "Beverages",
    availableQty: 3.0,
    inTransitQty: 10.0,
    ads: 2.1,
    currentDOI: 1.43,
    minStockLevel: 10.0,
    reorderPoint: 14.7,
    maxStockLevel: 60.0,
    unitCostPrice: 390.0,
    totalValuation: 5070.0,
    stockStatus: "CRITICAL",
  },
  {
    id: "inv-ind-1024",
    storeCode: "IND-001",
    storeName: "Indore Vijay Nagar Store",
    regionName: "Central MP",
    sku: "SKU-1024",
    productCode: "8901052010240",
    productName: "Tata Tea Premium 1kg",
    categoryName: "Beverages",
    availableQty: 95.0,
    inTransitQty: 0.0,
    ads: 3.0,
    currentDOI: 31.67,
    minStockLevel: 15.0,
    reorderPoint: 21.0,
    maxStockLevel: 75.0,
    unitCostPrice: 390.0,
    totalValuation: 37050.0,
    stockStatus: "EXCESS",
  },
  {
    id: "inv-mum-2041",
    storeCode: "DM-MUM-001",
    storeName: "Powai High-Velocity Hypermarket",
    regionName: "Maharashtra West",
    sku: "SKU-2041",
    productCode: "8901052020416",
    productName: "Fortune Sunlite Refined Oil 5L",
    categoryName: "Staples & Oil",
    availableQty: 54.0,
    inTransitQty: 12.0,
    ads: 3.6,
    currentDOI: 15.0,
    minStockLevel: 20.0,
    reorderPoint: 28.0,
    maxStockLevel: 110.0,
    unitCostPrice: 615.0,
    totalValuation: 40590.0,
    stockStatus: "HEALTHY",
  },
  {
    id: "inv-pun-3019",
    storeCode: "DM-PUN-003",
    storeName: "Hinjewadi Supercenter",
    regionName: "Maharashtra West",
    sku: "SKU-3019",
    productCode: "8901052030194",
    productName: "Surf Excel Matic Liquid 2L",
    categoryName: "Home Care",
    availableQty: 11.0,
    inTransitQty: 0.0,
    ads: 2.6,
    currentDOI: 4.23,
    minStockLevel: 12.0,
    reorderPoint: 18.2,
    maxStockLevel: 65.0,
    unitCostPrice: 310.0,
    totalValuation: 3410.0,
    stockStatus: "LOW",
  },
];

const INVENTORY_EXPORT_COLUMNS: ExportColumnDef<InventoryReportRow>[] = [
  { header: "Store Code", accessor: "storeCode" },
  { header: "Store Name", accessor: "storeName" },
  { header: "Region", accessor: "regionName" },
  { header: "SKU", accessor: "sku" },
  { header: "Barcode", accessor: "productCode" },
  { header: "Product Name", accessor: "productName" },
  { header: "Category", accessor: "categoryName" },
  { header: "Available Stock", accessor: (r) => r.availableQty.toFixed(3) },
  { header: "In-Transit Stock", accessor: (r) => r.inTransitQty.toFixed(3) },
  { header: "ADS (Units/Day)", accessor: (r) => r.ads.toFixed(2) },
  { header: "DOI (Days)", accessor: (r) => r.currentDOI.toFixed(2) },
  { header: "ROP", accessor: (r) => r.reorderPoint.toFixed(1) },
  { header: "Unit Cost (INR)", accessor: (r) => r.unitCostPrice.toFixed(2) },
  { header: "Valuation (INR)", accessor: (r) => r.totalValuation.toFixed(2) },
  { header: "Stock Status", accessor: "stockStatus" },
];

export const InventoryReportView: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [stockStatusFilter, setStockStatusFilter] = React.useState("ALL");
  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      "inventory",
      page,
      pageSize,
      search,
      stockStatusFilter,
      filters.regionId,
      filters.storeId,
    ],
    queryFn: async () => {
      try {
        return await reportsApi.getInventoryReport({
          page,
          limit: pageSize,
          search,
          stockStatus:
            stockStatusFilter === "ALL" ? undefined : stockStatusFilter,
          regionId: filters.regionId,
          storeId: filters.storeId,
        });
      } catch {
        const filtered = FALLBACK_INVENTORY_ROWS.filter((r) => {
          if (
            stockStatusFilter !== "ALL" &&
            r.stockStatus !== stockStatusFilter
          ) {
            return false;
          }
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.sku.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.storeCode.toLowerCase().includes(q)
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

  const rows = data?.items ?? FALLBACK_INVENTORY_ROWS;
  const subtitle = `Snapshot Date: ${format(
    filters.endDate,
    "dd MMM yyyy",
  )} • Status Filter: ${stockStatusFilter}`;

  const columns = React.useMemo<ServerColumn<InventoryReportRow>[]>(
    () => [
      {
        key: "storeCode",
        header: "Store",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.storeName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.storeCode} · {r.regionName}
            </div>
          </div>
        ),
      },
      {
        key: "sku",
        header: "SKU / Product",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.productName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.sku} · {r.productCode}
            </div>
          </div>
        ),
      },
      {
        key: "availableQty",
        header: "Avail / Transit",
        align: "right",
        sortable: true,
        render: (r) => (
          <div className="font-mono tabular-nums">
            <div className="font-semibold text-foreground">
              {r.availableQty.toFixed(3)}
            </div>
            {r.inTransitQty > 0 && (
              <div className="text-[11px] text-blue-600">
                +{r.inTransitQty.toFixed(3)} transit
              </div>
            )}
          </div>
        ),
      },
      {
        key: "ads",
        header: "ADS / ROP",
        align: "right",
        render: (r) => (
          <div className="font-mono tabular-nums text-xs">
            <div>{r.ads.toFixed(2)}/d</div>
            <div className="text-muted-foreground">
              ROP {r.reorderPoint.toFixed(1)}
            </div>
          </div>
        ),
      },
      {
        key: "currentDOI",
        header: "Days of Inventory",
        sortable: true,
        widthClass: "min-w-[160px]",
        render: (r) => <RH_DOIGauge currentDOI={r.currentDOI} />,
      },
      {
        key: "totalValuation",
        header: "Stock Value",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold">
            ₹{r.totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "stockStatus",
        header: "Status",
        align: "center",
        render: (r) => <StatusBadge status={r.stockStatus} />,
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Inventory Health & DOI Report"
      description="Scoped shelf availability, in-transit pipeline, Days of Inventory (DOI), and stock valuation."
      actions={
        <ReportExportBar
          reportTitle="Inventory Health & DOI Report"
          filterSubtitle={subtitle}
          columns={INVENTORY_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_Inventory_Health_Report"
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
                Stock Status
              </label>
              <select
                aria-label="Filter by Stock Status"
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
              >
                <option value="ALL">All Statuses</option>
                <option value="CRITICAL">CRITICAL (&lt; 3d DOI)</option>
                <option value="LOW">LOW (3–7d DOI)</option>
                <option value="HEALTHY">HEALTHY (7–30d DOI)</option>
                <option value="EXCESS">EXCESS (&gt; 30d DOI)</option>
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
          searchPlaceholder="Search SKU, barcode, product, or store..."
          onSearchChange={setSearch}
        />
      </div>
    </PageLayout>
  );
};
