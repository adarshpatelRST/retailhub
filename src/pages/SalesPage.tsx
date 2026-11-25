import * as React from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  IndianRupee,
  Receipt,
  RotateCcw,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { ServerDataTable, type ServerColumn } from "@/components/ui/server-data-table";
import { ModuleFilterBar, ModuleFilterItem, FilterResetButton } from "@/components/ui/ModuleFilterBar";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRegions, useStores } from "@/hooks/useStores";
import { apiClient } from "@/api/client";
import { useDebounce } from "@/hooks/useDebounce";
import { SimulateSaleModal } from "@/components/sales/SimulateSaleModal";

interface PosTransactionRow {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  transactionDate: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  regionName: string;
  sku: string;
  productName: string;
  categoryName: string;
  brandName: string;
  quantitySold: number;
  unitSellingPrice: number;
  discountAmount: number;
  netSalesAmount: number;
  grossMarginAmount: number;
  marginPercent: number;
}

interface PosSummary {
  totalRevenue: number;
  totalTransactions: number;
  totalUnitsSold: number;
  averageOrderValue: number;
}

export const SalesPage: React.FC = () => {
  const { user } = useAuth();

  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
  const isRegionalMgr = user?.role === "REGIONAL_MANAGER";
  const isStoreMgr = user?.role === "STORE_MANAGER";

  // Data sources for Region and Store filters
  const { data: regions = [] } = useRegions();
  const { stores: allStores = [] } = useStores();

  // Filters state
  const [search, setSearch] = React.useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const [regionId, setRegionId] = React.useState<string | null>("ALL");
  const [storeId, setStoreId] = React.useState<string | null>("ALL");
  const [startDate, setStartDate] = React.useState<string>(() =>
    format(subDays(new Date(), 30), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = React.useState<string>(() =>
    format(new Date(), "yyyy-MM-dd"),
  );
  const [page, setPage] = React.useState<number>(1);
  const pageSize = 10;

  // Reset to page 1 on debounced search change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Region options (Admin / Executive)
  const regionOptions = React.useMemo<ComboboxItem[]>(() => {
    return regions.map((r: any) => ({
      id: r.id,
      label: r.name,
      subLabel: r.code || r.regionCode,
    }));
  }, [regions]);

  // Store options cascading based on role and selected region
  const storeOptions = React.useMemo<ComboboxItem[]>(() => {
    let source = allStores;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      source = allStores.filter((s) => assigned.includes(s.regionId));
    } else if (regionId && regionId !== "ALL") {
      source = allStores.filter((s) => s.regionId === regionId);
    }
    return source.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.storeCode})`,
      subLabel: `${s.city || ""} · ${s.region?.name || ""}`,
    }));
  }, [allStores, isRegionalMgr, user, regionId]);

  // Simulate POS Sale Modal State
  const [isSimulateModalOpen, setIsSimulateModalOpen] = React.useState(false);

  // Query POS transactions reactively
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "sales",
      "transactions",
      isAdminOrExec ? regionId : undefined,
      isStoreMgr ? user?.assignedStoreIds?.[0] : storeId,
      debouncedSearch,
      startDate,
      endDate,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const activeStoreId = isStoreMgr
        ? user?.assignedStoreIds?.[0]
        : storeId && storeId !== "ALL"
          ? storeId
          : undefined;

      const activeRegionId =
        isAdminOrExec && regionId && regionId !== "ALL" ? regionId : undefined;

      const res = await apiClient.get<any>("/sales/transactions", {
        params: {
          storeId: activeStoreId,
          regionId: activeRegionId,
          search: debouncedSearch.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: pageSize,
        },
      });
      return res.data?.data || res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const rawItems: PosTransactionRow[] = data?.items || [];

  // Line-level search guard guaranteeing rows strictly match searched query
  const items: PosTransactionRow[] = React.useMemo(() => {
    let list = rawItems;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = rawItems.filter((row) => {
        const matchSku = (row.sku || "").toLowerCase().includes(q);
        const matchProd = (row.productName || "").toLowerCase().includes(q);
        const matchInv = (row.invoiceNumber || "").toLowerCase().includes(q);
        const matchStore =
          (row.storeName || "").toLowerCase().includes(q) ||
          (row.storeCode || "").toLowerCase().includes(q);

        if (q.includes("sku") || q.includes("ean")) {
          return matchSku || matchProd;
        }
        return matchSku || matchProd || matchInv || matchStore;
      });
    }

    // Ensure recent transactions are strictly displayed at the top (newest first)
    return [...list].sort(
      (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [rawItems, debouncedSearch]);
  const meta = data?.meta || { total: items.length, totalPages: 1 };
  const summary: PosSummary = data?.summary || {
    totalRevenue: items.reduce((sum, item) => sum + item.netSalesAmount, 0),
    totalTransactions: items.length,
    totalUnitsSold: items.reduce((sum, item) => sum + item.quantitySold, 0),
    averageOrderValue:
      items.length > 0
        ? Math.round(
            items.reduce((sum, item) => sum + item.netSalesAmount, 0) / items.length,
          )
        : 0,
  };

  const handleResetFilters = () => {
    setSearch("");
    setRegionId("ALL");
    setStoreId("ALL");
    setStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setPage(1);
  };

  // Helper to format values scaling to Lakhs and Crores safely
  const formatRevenueValue = (amount: number) => {
    if (amount >= 10_000_000) {
      return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
    }
    if (amount >= 100_000) {
      return `₹${(amount / 100_000).toFixed(2)} Lakhs`;
    }
    return `₹${formatNumber(amount, 0)}`;
  };

  const parsedStartDate = React.useMemo(() => {
    if (!startDate) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const [y, m, d] = startDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(startDate);
    return isNaN(d.getTime()) ? undefined : d;
  }, [startDate]);

  const parsedEndDate = React.useMemo(() => {
    if (!endDate) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const [y, m, d] = endDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(endDate);
    return isNaN(d.getTime()) ? undefined : d;
  }, [endDate]);

  const columns = React.useMemo<ServerColumn<PosTransactionRow>[]>(
    () => [
      {
        key: "invoiceNumber",
        header: "Invoice #",
        render: (row) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.invoiceNumber}
          </span>
        ),
      },
      {
        key: "transactionDate",
        header: "Date & Time",
        render: (row) => (
          <span className="text-xs text-slate-600 font-mono">
            {format(new Date(row.transactionDate), "dd MMM yyyy, HH:mm")}
          </span>
        ),
      },
      {
        key: "storeName",
        header: "Store Location",
        render: (row) => (
          <div>
            <div className="font-semibold text-xs text-slate-900">{row.storeName}</div>
            <div className="text-[11px] font-mono text-slate-400">
              {row.storeCode} · {row.regionName}
            </div>
          </div>
        ),
      },
      {
        key: "productName",
        header: "SKU / Line Item",
        render: (row) => (
          <div>
            <div className="font-medium text-xs text-slate-900">{row.productName}</div>
            <div className="text-[11px] font-mono text-slate-400">
              {row.sku} · {row.categoryName}
            </div>
          </div>
        ),
      },
      {
        key: "quantitySold",
        header: "Qty Sold",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-medium text-slate-800">
            {formatNumber(row.quantitySold)}
          </span>
        ),
      },
      {
        key: "unitSellingPrice",
        header: "Unit Price",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs text-slate-700">
            {formatCurrency(row.unitSellingPrice)}
          </span>
        ),
      },
      {
        key: "netSalesAmount",
        header: "Net Amount",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs font-bold text-emerald-700">
            {formatCurrency(row.netSalesAmount)}
          </span>
        ),
      },
      {
        key: "marginPercent",
        header: "Margin",
        align: "right",
        render: (row) => (
          <span className="font-mono text-xs text-slate-600">
            {row.marginPercent}% (₹{formatNumber(row.grossMarginAmount)})
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Point-of-Sale (POS) Transactions"
      description="Real-time retail register audit log, line-item basket analysis, and gross margin contribution across enterprise stores."
      loading={isLoading}
      actions={
        <Button
          type="button"
          size="sm"
          onClick={() => setIsSimulateModalOpen(true)}
          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 shadow-sm"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Simulate POS Sale</span>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 1. Dynamic Module Filter Bar (Top) */}
        <ModuleFilterBar
          title="POS Register Filters"
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search filter: Always First */}
            <ModuleFilterItem label="SEARCH">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Invoice #, SKU, or name..."
                  className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                />
              </div>
            </ModuleFilterItem>

            {/* Region Filter: Visible for Admin / Executive */}
            {isAdminOrExec && (
              <ModuleFilterItem label="REGION">
                <DropSearch
                  items={regionOptions}
                  value={regionId}
                  onChange={(val) => {
                    setRegionId(val);
                    setStoreId("ALL");
                    setPage(1);
                  }}
                  allOption={{ id: "ALL", label: "All Enterprise Regions" }}
                  placeholder="Select Region..."
                  searchPlaceholder="Search region name or code..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>
            )}

            {/* Store Filter: Visible for Admin / Executive & Regional Manager */}
            {!isStoreMgr && (
              <ModuleFilterItem label="STORE SCOPE">
                <DropSearch
                  items={storeOptions}
                  value={storeId}
                  onChange={(val) => {
                    setStoreId(val);
                    setPage(1);
                  }}
                  allOption={{ id: "ALL", label: "All Network Stores" }}
                  placeholder="Select Store..."
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>
            )}

            {/* Start Date: Reusable DatePicker */}
            <ModuleFilterItem label="START DATE">
              <DatePicker
                date={parsedStartDate}
                maxDate={parsedEndDate}
                onSelect={(d) => {
                  setStartDate(d ? format(d, "yyyy-MM-dd") : "");
                  setPage(1);
                }}
                placeholder="Select start date"
                className="h-10 text-xs font-sans border-slate-300 bg-white"
              />
            </ModuleFilterItem>

            {/* End Date: Reusable DatePicker */}
            <ModuleFilterItem label="END DATE">
              <DatePicker
                date={parsedEndDate}
                minDate={parsedStartDate}
                onSelect={(d) => {
                  setEndDate(d ? format(d, "yyyy-MM-dd") : "");
                  setPage(1);
                }}
                placeholder="Select end date"
                className="h-10 text-xs font-sans border-slate-300 bg-white"
              />
            </ModuleFilterItem>
          </div>
        </ModuleFilterBar>

        {/* 2. Metric KPI Cards (Middle) - Top-aligned header, robust dimensions for Lakhs/Crores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                POS Net Revenue
              </span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                <IndianRupee className="size-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div
                className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 truncate"
                title={formatCurrency(summary.totalRevenue)}
              >
                {formatRevenueValue(summary.totalRevenue)}
              </div>
              <p
                className="text-[11px] text-slate-400 mt-0.5 truncate"
                title={formatCurrency(summary.totalRevenue)}
              >
                {summary.totalRevenue >= 100_000
                  ? `Exact: ${formatCurrency(summary.totalRevenue)}`
                  : "Recorded in filtered window"}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Total Invoices
              </span>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                <Receipt className="size-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 truncate">
                {formatNumber(summary.totalTransactions, 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Customer checkout receipts
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Units Dispatched
              </span>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
                <ShoppingBag className="size-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 truncate">
                {formatNumber(summary.totalUnitsSold, 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Physical items sold</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                Avg Order Value
              </span>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 truncate">
                {formatRevenueValue(summary.averageOrderValue)}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Average checkout ticket size
              </p>
            </div>
          </div>
        </div>

        {/* 3. Transactions Table (Bottom) */}
        <ServerDataTable
          data={items}
          columns={columns}
          loading={isLoading || isFetching}
          page={page}
          totalPages={meta.totalPages}
          pageSize={pageSize}
          totalItems={meta.total}
          onPageChange={setPage}
          emptyMessage="No POS transactions recorded for this filter criteria."
        />
      </div>

      <SimulateSaleModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSaleSuccess={() => {
          setPage(1);
          void refetch();
        }}
        defaultStoreId={storeId}
      />
    </PageLayout>
  );
};

export default SalesPage;
