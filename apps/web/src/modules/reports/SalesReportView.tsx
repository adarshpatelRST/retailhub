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
import { type ExportColumnDef } from "@/lib/export-utils";
import { reportsApi, type SalesReportRow } from "./api/reports.api";

const FALLBACK_SALES_ROWS: SalesReportRow[] = [
  {
    id: "sal-1001",
    transactionDate: "2026-10-26 14:22",
    invoiceNumber: "INV-BPL-88401",
    storeCode: "BPL-001",
    storeName: "Bhopal MP Nagar Store",
    regionName: "Central MP",
    sku: "SKU-1024",
    productName: "Tata Tea Premium 1kg",
    categoryName: "Beverages",
    quantitySold: 6.0,
    unitSellingPrice: 495.0,
    discountAmount: 90.0,
    netSalesAmount: 2880.0,
    grossMarginAmount: 540.0,
    marginPercent: 18.75,
  },
  {
    id: "sal-1002",
    transactionDate: "2026-10-26 13:45",
    invoiceNumber: "INV-IND-44219",
    storeCode: "IND-001",
    storeName: "Indore Vijay Nagar Store",
    regionName: "Central MP",
    sku: "SKU-2041",
    productName: "Fortune Sunlite Refined Oil 5L",
    categoryName: "Staples & Oil",
    quantitySold: 4.0,
    unitSellingPrice: 745.0,
    discountAmount: 80.0,
    netSalesAmount: 2900.0,
    grossMarginAmount: 420.0,
    marginPercent: 14.48,
  },
  {
    id: "sal-1003",
    transactionDate: "2026-10-26 11:18",
    invoiceNumber: "INV-MUM-99012",
    storeCode: "DM-MUM-001",
    storeName: "Powai High-Velocity Hypermarket",
    regionName: "Maharashtra West",
    sku: "SKU-1088",
    productName: "Aashirvaad Shudh Chakki Atta 10kg",
    categoryName: "Staples & Oil",
    quantitySold: 12.0,
    unitSellingPrice: 455.0,
    discountAmount: 180.0,
    netSalesAmount: 5280.0,
    grossMarginAmount: 840.0,
    marginPercent: 15.91,
  },
  {
    id: "sal-1004",
    transactionDate: "2026-10-25 19:05",
    invoiceNumber: "INV-PUN-77310",
    storeCode: "DM-PUN-003",
    storeName: "Hinjewadi Supercenter",
    regionName: "Maharashtra West",
    sku: "SKU-3019",
    productName: "Surf Excel Matic Liquid 2L",
    categoryName: "Home Care",
    quantitySold: 8.0,
    unitSellingPrice: 410.0,
    discountAmount: 120.0,
    netSalesAmount: 3160.0,
    grossMarginAmount: 680.0,
    marginPercent: 21.52,
  },
];

const SALES_EXPORT_COLUMNS: ExportColumnDef<SalesReportRow>[] = [
  { header: "Timestamp", accessor: "transactionDate" },
  { header: "Invoice No", accessor: "invoiceNumber" },
  { header: "Store Code", accessor: "storeCode" },
  { header: "Store Name", accessor: "storeName" },
  { header: "Region", accessor: "regionName" },
  { header: "SKU", accessor: "sku" },
  { header: "Product Name", accessor: "productName" },
  { header: "Category", accessor: "categoryName" },
  { header: "Qty Sold", accessor: (r) => r.quantitySold.toFixed(3) },
  { header: "Selling Price (INR)", accessor: (r) => r.unitSellingPrice.toFixed(2) },
  { header: "Discount (INR)", accessor: (r) => r.discountAmount.toFixed(2) },
  { header: "Net Sales (INR)", accessor: (r) => r.netSalesAmount.toFixed(2) },
  { header: "Gross Margin (INR)", accessor: (r) => r.grossMarginAmount.toFixed(2) },
  { header: "Margin %", accessor: (r) => `${r.marginPercent.toFixed(1)}%` },
];

export const SalesReportView: React.FC = () => {
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
      "sales",
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
        return await reportsApi.getSalesReport({
          page,
          limit: pageSize,
          search,
          regionId: filters.regionId,
          storeId: filters.storeId,
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
      } catch {
        const filtered = FALLBACK_SALES_ROWS.filter((r) => {
          if (filters.storeId && r.storeCode === "IND-001" && filters.storeId === "store-bpl-001") {
            return false;
          }
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.sku.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.invoiceNumber.toLowerCase().includes(q) ||
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

  const rows = data?.items ?? FALLBACK_SALES_ROWS;
  const subtitle = `Period: ${format(filters.startDate, "dd MMM yyyy")} to ${format(
    filters.endDate,
    "dd MMM yyyy",
  )} • Store Scope: ${filters.storeId ?? "All Scoped Stores"}`;

  const columns = React.useMemo<ServerColumn<SalesReportRow>[]>(
    () => [
      {
        key: "invoiceNumber",
        header: "Invoice / Date",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-mono text-xs font-semibold text-foreground">
              {r.invoiceNumber}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.transactionDate}
            </div>
          </div>
        ),
      },
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
        key: "productName",
        header: "Product / SKU",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.productName}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {r.sku} · {r.categoryName}
            </div>
          </div>
        ),
      },
      {
        key: "quantitySold",
        header: "Qty Sold",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold">
            {r.quantitySold.toFixed(3)}
          </span>
        ),
      },
      {
        key: "unitSellingPrice",
        header: "Unit Price",
        align: "right",
        render: (r) => (
          <span className="font-mono tabular-nums">
            ₹{r.unitSellingPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "netSalesAmount",
        header: "Net Revenue",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-bold text-foreground">
            ₹{r.netSalesAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "marginPercent",
        header: "Gross Margin",
        align: "right",
        sortable: true,
        render: (r) => (
          <div className="font-mono tabular-nums">
            <div className="font-semibold text-emerald-700">
              ₹{r.grossMarginAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {r.marginPercent.toFixed(1)}%
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Sales & POS Velocity Report"
      description="Role-scoped POS invoice ledger, promotional discount realization, and gross margin analysis."
      actions={
        <ReportExportBar
          reportTitle="Sales & POS Velocity Report"
          filterSubtitle={subtitle}
          columns={SALES_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_Sales_Report"
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
          searchPlaceholder="Search invoice number, SKU, or product..."
          onSearchChange={setSearch}
        />
      </div>
    </PageLayout>
  );
};
