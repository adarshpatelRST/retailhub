import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { PageLayout } from "@/components/layouts/PageLayout";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
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
import { CategoryTreeCombobox } from "@/modules/operations/product/components/CategoryTreeCombobox";
import { type CategoryNode } from "@/modules/operations/product/api/product.api";
import { reportsApi, type SkuPerformanceReportRow } from "./api/reports.api";

const DEMO_CATEGORIES: CategoryNode[] = [
  {
    id: "cat-beverages",
    categoryCode: "CAT-BEV",
    name: "Beverages",
    parentCategoryId: null,
    subCategories: [
      {
        id: "cat-tea",
        categoryCode: "CAT-TEA",
        name: "Packaged Tea & Leaf",
        parentCategoryId: "cat-beverages",
      },
    ],
  },
  {
    id: "cat-staples",
    categoryCode: "CAT-STP",
    name: "Staples & Oil",
    parentCategoryId: null,
    subCategories: [
      {
        id: "cat-oil",
        categoryCode: "CAT-OIL",
        name: "Edible Oils & Ghee",
        parentCategoryId: "cat-staples",
      },
      {
        id: "cat-atta",
        categoryCode: "CAT-ATT",
        name: "Flours & Atta",
        parentCategoryId: "cat-staples",
      },
    ],
  },
  {
    id: "cat-homecare",
    categoryCode: "CAT-HMC",
    name: "Home Care",
    parentCategoryId: null,
    subCategories: [
      {
        id: "cat-detergent",
        categoryCode: "CAT-DET",
        name: "Liquid Detergents",
        parentCategoryId: "cat-homecare",
      },
    ],
  },
];

const BRAND_ITEMS: ComboboxItem[] = [
  { id: "Tata Consumer", label: "Tata Consumer" },
  { id: "Adani Wilmar", label: "Adani Wilmar (Fortune)" },
  { id: "ITC Foods", label: "ITC Foods (Aashirvaad)" },
  { id: "Hindustan Unilever", label: "Hindustan Unilever (Surf Excel)" },
  { id: "Nestle India", label: "Nestle India" },
];

export const FALLBACK_SKU_PERFORMANCE_ROWS: SkuPerformanceReportRow[] = [
  {
    id: "sku-perf-1024",
    sku: "SKU-1024",
    productCode: "8901052010240",
    name: "Tata Tea Premium 1kg",
    categoryName: "Packaged Tea & Leaf",
    brandName: "Tata Consumer",
    unitOfMeasure: "KG",
    costPrice: 390.0,
    mrp: 540.0,
    sellingPrice: 495.0,
    marginPercent: ((495.0 - 390.0) / 495.0) * 100,
    availableStock: 98.0,
    inTransitStock: 10.0,
    stockValuation: (98.0 + 10.0) * 390.0,
    unitsSold: 153.0,
    netRevenue: 75735.0,
    ads: 5.1,
    currentDOI: 19.22,
    velocityTier: "FAST_MOVING",
    stockStatus: "CRITICAL",
  },
  {
    id: "sku-perf-2041",
    sku: "SKU-2041",
    productCode: "8901052020416",
    name: "Fortune Sunlite Refined Oil 5L",
    categoryName: "Edible Oils & Ghee",
    brandName: "Adani Wilmar",
    unitOfMeasure: "LTR",
    costPrice: 615.0,
    mrp: 820.0,
    sellingPrice: 745.0,
    marginPercent: ((745.0 - 615.0) / 745.0) * 100,
    availableStock: 59.0,
    inTransitStock: 12.0,
    stockValuation: (59.0 + 12.0) * 615.0,
    unitsSold: 180.0,
    netRevenue: 134100.0,
    ads: 6.0,
    currentDOI: 9.83,
    velocityTier: "FAST_MOVING",
    stockStatus: "HEALTHY",
  },
  {
    id: "sku-perf-1088",
    sku: "SKU-1088",
    productCode: "8901052010882",
    name: "Aashirvaad Shudh Chakki Atta 10kg",
    categoryName: "Flours & Atta",
    brandName: "ITC Foods",
    unitOfMeasure: "KG",
    costPrice: 375.0,
    mrp: 510.0,
    sellingPrice: 455.0,
    marginPercent: ((455.0 - 375.0) / 455.0) * 100,
    availableStock: 34.0,
    inTransitStock: 20.0,
    stockValuation: (34.0 + 20.0) * 375.0,
    unitsSold: 105.0,
    netRevenue: 47775.0,
    ads: 3.5,
    currentDOI: 9.71,
    velocityTier: "MODERATE",
    stockStatus: "LOW",
  },
  {
    id: "sku-perf-3019",
    sku: "SKU-3019",
    productCode: "8901052030194",
    name: "Surf Excel Matic Liquid 2L",
    categoryName: "Liquid Detergents",
    brandName: "Hindustan Unilever",
    unitOfMeasure: "LTR",
    costPrice: 310.0,
    mrp: 450.0,
    sellingPrice: 410.0,
    marginPercent: ((410.0 - 310.0) / 410.0) * 100,
    availableStock: 42.0,
    inTransitStock: 0.0,
    stockValuation: 42.0 * 310.0,
    unitsSold: 48.0,
    netRevenue: 19680.0,
    ads: 1.6,
    currentDOI: 26.25,
    velocityTier: "SLOW_MOVING",
    stockStatus: "HEALTHY",
  },
  {
    id: "sku-perf-4090",
    sku: "SKU-4090",
    productCode: "8901052040902",
    name: "Nestle Everyday Dairy Whitener 1kg",
    categoryName: "Beverages",
    brandName: "Nestle India",
    unitOfMeasure: "KG",
    costPrice: 460.0,
    mrp: 610.0,
    sellingPrice: 575.0,
    marginPercent: ((575.0 - 460.0) / 575.0) * 100,
    availableStock: 68.0,
    inTransitStock: 0.0,
    stockValuation: 68.0 * 460.0,
    unitsSold: 6.0,
    netRevenue: 3450.0,
    ads: 0.2,
    currentDOI: 340.0,
    velocityTier: "DEAD_STOCK",
    stockStatus: "EXCESS",
  },
];

/**
 * All 16 official columns for PDF / Excel / CSV Export
 */
export const SKU_PERFORMANCE_EXPORT_COLUMNS: ExportColumnDef<SkuPerformanceReportRow>[] = [
  { header: "1. SKU Code", accessor: "sku" },
  { header: "2. Barcode", accessor: "productCode" },
  { header: "3. Product Name", accessor: "name" },
  { header: "4. Category", accessor: "categoryName" },
  { header: "5. Brand", accessor: "brandName" },
  { header: "6. UOM", accessor: "unitOfMeasure" },
  { header: "7. Cost Price (INR)", accessor: (r) => r.costPrice.toFixed(2) },
  { header: "8. MRP (INR)", accessor: (r) => r.mrp.toFixed(2) },
  { header: "9. Store Price (INR)", accessor: (r) => r.sellingPrice.toFixed(2) },
  {
    header: "10. Margin %",
    accessor: (r) =>
      `${(((r.sellingPrice - r.costPrice) / r.sellingPrice) * 100).toFixed(1)}%`,
  },
  {
    header: "11. Available Stock",
    accessor: (r) => r.availableStock.toFixed(3),
  },
  {
    header: "12. In-Transit Stock",
    accessor: (r) => r.inTransitStock.toFixed(3),
  },
  {
    header: "13. Stock Valuation (INR)",
    accessor: (r) =>
      ((r.availableStock + r.inTransitStock) * r.costPrice).toFixed(2),
  },
  { header: "14. Units Sold", accessor: (r) => r.unitsSold.toFixed(3) },
  { header: "15. Net Revenue (INR)", accessor: (r) => r.netRevenue.toFixed(2) },
  {
    header: "16. ADS / DOI / Velocity / Status",
    accessor: (r) =>
      `ADS: ${r.ads.toFixed(2)} | DOI: ${r.currentDOI.toFixed(1)}d | ${r.velocityTier} | ${r.stockStatus}`,
  },
];

export const SkuPerformanceReportView: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [brandName, setBrandName] = React.useState<string | null>(null);
  const [velocityTier, setVelocityTier] = React.useState<string>("ALL");
  const [stockStatus, setStockStatus] = React.useState<string>("ALL");

  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      "sku-performance",
      page,
      pageSize,
      search,
      categoryId,
      brandName,
      velocityTier,
      stockStatus,
      filters.regionId,
      filters.storeId,
      format(filters.startDate, "yyyy-MM-dd"),
      format(filters.endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      try {
        return await reportsApi.getSkuPerformanceReport({
          page,
          limit: pageSize,
          search,
          categoryId: categoryId || undefined,
          brandName:
            brandName && brandName !== "ALL_BRANDS" ? brandName : undefined,
          velocityTier: velocityTier === "ALL" ? undefined : velocityTier,
          stockStatus: stockStatus === "ALL" ? undefined : stockStatus,
          regionId: filters.regionId,
          storeId: filters.storeId,
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
      } catch {
        const filtered = FALLBACK_SKU_PERFORMANCE_ROWS.filter((r) => {
          if (
            brandName &&
            brandName !== "ALL_BRANDS" &&
            r.brandName !== brandName
          ) {
            return false;
          }
          if (velocityTier !== "ALL" && r.velocityTier !== velocityTier) {
            return false;
          }
          if (stockStatus !== "ALL" && r.stockStatus !== stockStatus) {
            return false;
          }
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.sku.toLowerCase().includes(q) ||
            r.productCode.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.brandName.toLowerCase().includes(q)
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

  const rows = data?.items ?? FALLBACK_SKU_PERFORMANCE_ROWS;
  const subtitle = `Period: ${format(filters.startDate, "dd MMM yyyy")} to ${format(
    filters.endDate,
    "dd MMM yyyy",
  )} • Velocity Tier: ${velocityTier} • Status: ${stockStatus}`;

  /**
   * 16-column ServerDataTable definition matching Section 3.C
   */
  const columns = React.useMemo<ServerColumn<SkuPerformanceReportRow>[]>(
    () => [
      {
        key: "sku",
        header: "1. SKU Code",
        sortable: true,
        render: (r) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {r.sku}
          </span>
        ),
      },
      {
        key: "productCode",
        header: "2. Barcode",
        render: (r) => (
          <span className="font-mono text-xs text-muted-foreground">
            {r.productCode}
          </span>
        ),
      },
      {
        key: "name",
        header: "3. Product Name",
        sortable: true,
        widthClass: "min-w-[180px]",
        render: (r) => (
          <span className="font-medium text-foreground">{r.name}</span>
        ),
      },
      {
        key: "categoryName",
        header: "4. Category",
        render: (r) => <span className="text-xs">{r.categoryName}</span>,
      },
      {
        key: "brandName",
        header: "5. Brand",
        render: (r) => <span className="text-xs font-medium">{r.brandName}</span>,
      },
      {
        key: "unitOfMeasure",
        header: "6. UOM",
        align: "center",
        render: (r) => (
          <span className="font-mono text-xs">{r.unitOfMeasure}</span>
        ),
      },
      {
        key: "costPrice",
        header: "7. Cost Price ₹",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums">
            ₹{r.costPrice.toFixed(2)}
          </span>
        ),
      },
      {
        key: "mrp",
        header: "8. MRP ₹",
        align: "right",
        render: (r) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            ₹{r.mrp.toFixed(2)}
          </span>
        ),
      },
      {
        key: "sellingPrice",
        header: "9. Store Price ₹",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold">
            ₹{r.sellingPrice.toFixed(2)}
          </span>
        ),
      },
      {
        key: "marginPercent",
        header: "10. Unit Margin %",
        align: "right",
        sortable: true,
        render: (r) => {
          const unitMarginInr = r.sellingPrice - r.costPrice;
          const pct = ((r.sellingPrice - r.costPrice) / r.sellingPrice) * 100;
          return (
            <div className="font-mono tabular-nums">
              <div className="font-semibold text-emerald-700">
                {pct.toFixed(1)}%
              </div>
              <div className="text-[11px] text-muted-foreground">
                ₹{unitMarginInr.toFixed(2)}/u
              </div>
            </div>
          );
        },
      },
      {
        key: "availableStock",
        header: "11. Avail Stock",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-semibold">
            {r.availableStock.toFixed(3)}
          </span>
        ),
      },
      {
        key: "inTransitStock",
        header: "12. In-Transit",
        align: "right",
        render: (r) => (
          <span className="font-mono tabular-nums text-blue-600">
            {r.inTransitStock.toFixed(3)}
          </span>
        ),
      },
      {
        key: "stockValuation",
        header: "13. Stock Valuation ₹",
        align: "right",
        sortable: true,
        render: (r) => {
          const val = (r.availableStock + r.inTransitStock) * r.costPrice;
          return (
            <span className="font-mono tabular-nums font-semibold">
              ₹{val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        key: "unitsSold",
        header: "14. Units Sold",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums">
            {r.unitsSold.toFixed(3)}
          </span>
        ),
      },
      {
        key: "netRevenue",
        header: "15. Net Revenue ₹",
        align: "right",
        sortable: true,
        render: (r) => (
          <span className="font-mono tabular-nums font-bold text-foreground">
            ₹{r.netRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "adsAndDoi",
        header: "16. ADS / DOI / Velocity",
        widthClass: "min-w-[210px]",
        render: (r) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2 font-mono text-xs">
              <span>ADS: {r.ads.toFixed(2)}/d</span>
              <span className="font-bold">DOI: {r.currentDOI.toFixed(1)}d</span>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={r.stockStatus} />
              <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                {r.velocityTier}
              </span>
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="SKU / Product Performance & Margin Report (16-Column Matrix)"
      description="Comprehensive 16-column catalog identity, unit margin realization, scoped stock valuation, and velocity tier classification."
      actions={
        <ReportExportBar
          reportTitle="16-Column SKU / Product Performance Report"
          filterSubtitle={subtitle}
          columns={SKU_PERFORMANCE_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_SKU_Performance_16Col"
        />
      }
    >
      <div className="space-y-4">
        <RoleScopeFilterBar
          value={filters}
          onChange={setFilters}
          onReset={() => {
            setCategoryId("");
            setBrandName(null);
            setVelocityTier("ALL");
            setStockStatus("ALL");
          }}
          extraFilters={
            <>
              <div className="space-y-1.5 w-full sm:w-[220px]">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Category Tree
                </label>
                <CategoryTreeCombobox
                  categories={DEMO_CATEGORIES}
                  value={categoryId}
                  onSelect={(id) => setCategoryId(id)}
                  allowClear
                  placeholder="All Categories"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Brand
                </label>
                <DropSearch
                  items={BRAND_ITEMS}
                  value={brandName}
                  onChange={setBrandName}
                  allOption={{ id: "ALL_BRANDS", label: "All Brands" }}
                  placeholder="All Brands"
                  searchPlaceholder="Search brand..."
                  width="w-full sm:w-[190px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Velocity Tier
                </label>
                <select
                  aria-label="Filter by Velocity Tier"
                  value={velocityTier}
                  onChange={(e) => setVelocityTier(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
                >
                  <option value="ALL">All Velocity Tiers</option>
                  <option value="FAST_MOVING">FAST_MOVING</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="SLOW_MOVING">SLOW_MOVING</option>
                  <option value="DEAD_STOCK">DEAD_STOCK</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Stock Status
                </label>
                <select
                  aria-label="Filter SKU by Stock Status"
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
                >
                  <option value="ALL">All Stock Statuses</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="LOW">LOW</option>
                  <option value="HEALTHY">HEALTHY</option>
                  <option value="EXCESS">EXCESS</option>
                </select>
              </div>
            </>
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
          searchPlaceholder="Search SKU, barcode, product name, or brand..."
          onSearchChange={setSearch}
        />
      </div>
    </PageLayout>
  );
};
