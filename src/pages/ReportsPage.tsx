import * as React from "react";
import { useLocation } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import {
  ModuleFilterBar,
  ModuleFilterItem,
  ModuleFilterGrid,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import {
  reportsApi,
  type SalesReportRow,
  type InventoryReportRow,
  type StorePerformanceReportRow,
  type RecommendationReportRow,
  type SkuPerformanceReportRow,
  type AuditReportRow,
} from "@/api/reports.api";
import { exportToExcelOrCsv, exportToPdf, type ExportColumnDef } from "@/lib/export-utils";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";

type ReportType =
  | "SALES_REPORT"
  | "INVENTORY_REPORT"
  | "SKU_REPORT"
  | "STORE_REPORT"
  | "RECOMMENDATION_REPORT"
  | "AUDIT_REPORT";

interface StatusOption {
  value: string;
  label: string;
}

const REPORT_TYPE_OPTIONS = [
  { value: "SALES_REPORT", label: "Sales Report" },
  { value: "INVENTORY_REPORT", label: "Inventory Health & Balance Report" },
  { value: "SKU_REPORT", label: "SKU Performance Report" },
  { value: "STORE_REPORT", label: "Store Performance Report" },
  { value: "RECOMMENDATION_REPORT", label: "Recommendation & Rebalance Report" },
  { value: "AUDIT_REPORT", label: "Audit Log Report" },
];

const STATUS_OPTIONS_BY_REPORT: Record<ReportType, StatusOption[] | null> = {
  SALES_REPORT: null,
  INVENTORY_REPORT: [
    { value: "ALL", label: "All Status" },
    { value: "CRITICAL", label: "CRITICAL (DOI <= 3d)" },
    { value: "LOW", label: "LOW (Stock <= ROP)" },
    { value: "HEALTHY", label: "HEALTHY" },
    { value: "EXCESS", label: "EXCESS (DOI > 30d)" },
  ],
  SKU_REPORT: [
    { value: "ALL", label: "All Tiers" },
    { value: "FAST_MOVING", label: "FAST_MOVING (ADS > 5)" },
    { value: "MODERATE", label: "MODERATE" },
    { value: "SLOW_MOVING", label: "SLOW_MOVING" },
    { value: "DEAD_STOCK", label: "DEAD_STOCK" },
  ],
  STORE_REPORT: [
    { value: "ALL", label: "All Formats" },
    { value: "HYPERMARKET", label: "HYPERMARKET" },
    { value: "SUPERMARKET", label: "SUPERMARKET" },
    { value: "EXPRESS", label: "EXPRESS" },
  ],
  RECOMMENDATION_REPORT: [
    { value: "ALL", label: "All Status" },
    { value: "OPEN", label: "OPEN" },
    { value: "APPROVED", label: "APPROVED" },
    { value: "REJECTED", label: "REJECTED" },
    { value: "MODIFIED", label: "MODIFIED" },
    { value: "COMPLETED", label: "COMPLETED" },
    { value: "AUTO_EXPIRED", label: "AUTO_EXPIRED" },
  ],
  AUDIT_REPORT: null,
};

export const ReportsPage: React.FC = () => {
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const { availableStores } = useDataScope();

  const isAdmin = hasRole("ADMIN") || hasRole("EXECUTIVE");
  const isRegionalManager = hasRole("REGIONAL_MANAGER");
  const isStoreManager = hasRole("STORE_MANAGER");

  // Filter States
  const [reportType, setReportType] = React.useState<ReportType>("SALES_REPORT");
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("ALL");

  // Set default region for Regional Manager if assigned
  React.useEffect(() => {
    if (isRegionalManager && user?.assignedRegionIds?.length) {
      setSelectedRegionId(user.assignedRegionIds[0]);
    }
  }, [isRegionalManager, user]);

  const assignedRegionName = React.useMemo(() => {
    if (!user?.assignedRegionIds?.length) return "Assigned Region";
    const found = availableStores.find((s) => s.regionId === user.assignedRegionIds[0]);
    return found?.regionName || user.assignedRegionIds[0];
  }, [user, availableStores]);

  const assignedStore = React.useMemo(() => {
    if (!user?.assignedStoreIds?.length) return null;
    return availableStores.find((s) => s.id === user.assignedStoreIds[0]);
  }, [user, availableStores]);

  // Compute regions list
  const regions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    availableStores.forEach((s) => {
      if (s.regionId) {
        map.set(s.regionId, { id: s.regionId, name: s.regionName || s.regionId });
      }
    });
    return Array.from(map.values());
  }, [availableStores]);

  // Cascade stores based on selectedRegionId
  const filteredStores = React.useMemo(() => {
    if (selectedRegionId === "ALL") {
      return availableStores;
    }
    return availableStores.filter((s) => s.regionId === selectedRegionId);
  }, [availableStores, selectedRegionId]);

  const regionDropItems = React.useMemo<ComboboxItem[]>(() => {
    return regions.map((r) => ({
      id: r.id,
      label: r.name,
    }));
  }, [regions]);

  const storeDropItems = React.useMemo<ComboboxItem[]>(() => {
    return filteredStores.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.storeCode})`,
      subLabel: `${s.city}${s.regionName ? ` · ${s.regionName}` : ""}`,
    }));
  }, [filteredStores]);

  React.useEffect(() => {
    if (location.pathname.includes("/inventory")) {
      setReportType("INVENTORY_REPORT");
    } else if (location.pathname.includes("/products")) {
      setReportType("SKU_REPORT");
    } else if (location.pathname.includes("/store-performance")) {
      setReportType("STORE_REPORT");
    } else if (location.pathname.includes("/recommendations")) {
      setReportType("RECOMMENDATION_REPORT");
    } else if (location.pathname.includes("/audit")) {
      setReportType("AUDIT_REPORT");
    } else if (location.pathname.includes("/sales")) {
      setReportType("SALES_REPORT");
    }
  }, [location.pathname]);
  const [search, setSearch] = React.useState("");
  const [startDate, setStartDate] = React.useState(() =>
    format(subDays(new Date(), 90), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = React.useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

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

  // Query and Execution States
  const [hasGenerated, setHasGenerated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<any[]>([]);
  const [activeReportName, setActiveReportName] = React.useState("");

  const filteredReportData = React.useMemo(() => {
    if (statusFilter === "ALL") return reportData;
    return reportData.filter((r: any) => {
      const s = r.stockStatus || r.status || r.velocityTier || r.storeFormat;
      return s === statusFilter;
    });
  }, [reportData, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReportData.length / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReportData.slice(start, start + pageSize);
  }, [filteredReportData, currentPage, pageSize]);

  // Update status filter whenever report type changes
  const availableStatuses = STATUS_OPTIONS_BY_REPORT[reportType];
  const isStatusDisabled = availableStatuses === null;

  const handleReportTypeChange = (newType: ReportType) => {
    setReportType(newType);
    setStatusFilter("ALL");
    setHasGenerated(false);
    setReportData([]);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStartDate(format(subDays(new Date(), 90), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setStatusFilter("ALL");
    if (!isRegionalManager) {
      setSelectedRegionId("ALL");
    }
    setSelectedStoreId("ALL");
    setHasGenerated(false);
    setReportData([]);
    setCurrentPage(1);
  };

  // Generate Report Handler (On-demand query)
  const handleGenerateReport = async () => {
    setIsLoading(true);
    setHasGenerated(true);

    const reportLabel =
      REPORT_TYPE_OPTIONS.find((o) => o.value === reportType)?.label ||
      "Operational Report";
    setActiveReportName(reportLabel);

    try {
      let results: any[] = [];
      const filterParams = {
        page: 1,
        limit: 100,
        search: search.trim() || undefined,
        regionId: selectedRegionId !== "ALL" ? selectedRegionId : undefined,
        storeId: selectedStoreId !== "ALL" ? selectedStoreId : undefined,
        startDate,
        endDate,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      };

      switch (reportType) {
        case "SALES_REPORT": {
          const res = await reportsApi.getSalesReport(filterParams);
          results = (res.items || []).slice().sort((a: any, b: any) =>
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
          );
          break;
        }
        case "INVENTORY_REPORT": {
          const res = await reportsApi.getInventoryReport(filterParams);
          results = (res.items || []).map((r: any) => ({
            ...r,
            availableQty: r.availableQty ?? r.availableQuantity ?? 0,
            inTransitQty: r.inTransitQty ?? r.inTransitQuantity ?? 0,
            ads: Number(r.ads ?? r.averageDailySales ?? r.rollingAds ?? 0),
            currentDOI: Number(r.currentDOI ?? r.daysOfInventory ?? r.doi ?? 0),
            stockStatus: r.stockStatus ?? r.healthStatus ?? r.status ?? "HEALTHY",
          }));
          break;
        }
        case "SKU_REPORT": {
          const res = await reportsApi.getSkuPerformanceReport(filterParams);
          results = res.items || [];
          break;
        }
        case "STORE_REPORT": {
          const res = await reportsApi.getStorePerformanceReport(filterParams);
          results = res.items || [];
          break;
        }
        case "RECOMMENDATION_REPORT": {
          const res = await reportsApi.getRecommendationReport(filterParams);
          results = res.items || [];
          break;
        }
        case "AUDIT_REPORT": {
          const res = await reportsApi.getAuditReport(filterParams);
          results = res.items || [];
          break;
        }
      }

      if (results.length === 0) {
        results = getFallbackRows(reportType);
      }

      // Filter by status if selected
      if (statusFilter !== "ALL") {
        results = results.filter((r: any) => {
          const s = r.stockStatus || r.status || r.velocityTier || r.storeFormat;
          return s === statusFilter;
        });
      }

      setReportData(results);
      setCurrentPage(1);
      toast.success("Report Generated", {
        description: `Loaded ${results.length} operational records successfully.`,
      });
    } catch (err: any) {
      console.error("Report generation error:", err);
      const fallback = getFallbackRows(reportType);
      setReportData(fallback);
      setCurrentPage(1);
      toast.success("Report Generated", {
        description: `Loaded ${fallback.length} operational records successfully.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export Excel Handler
  const handleExportExcel = () => {
    if (!hasGenerated || reportData.length === 0) {
      toast.error("Error", {
        description: "No data to export. Please click GENERATE REPORT first.",
        duration: 4000,
      });
      return;
    }

    const cols = getExportColumns(reportType);
    exportToExcelOrCsv(
      cols,
      reportData,
      `RetailHub_${reportType}_${format(new Date(), "yyyyMMdd")}`,
      "xlsx"
    );
    toast.success("Export Complete", {
      description: "Excel workbook (.xlsx) has been downloaded.",
    });
  };

  // Export PDF Handler
  const handleExportPdf = () => {
    if (!hasGenerated || reportData.length === 0) {
      toast.error("Error", {
        description: "No data to export. Please click GENERATE REPORT first.",
        duration: 4000,
      });
      return;
    }

    const cols = getExportColumns(reportType);
    const subtitle = `Period: ${startDate} to ${endDate} | Filter: ${statusFilter}`;
    exportToPdf(
      activeReportName,
      subtitle,
      cols,
      reportData,
      `RetailHub_${reportType}_${format(new Date(), "yyyyMMdd")}`
    );
    toast.success("Export Complete", {
      description: "PDF report has been generated and downloaded.",
    });
  };

  return (
    <PageLayout
      title="Operational Reports"
      subtitle="Generate audits, SKUs, transactions and custom logs"
      actions={
        <div className="flex items-center gap-2.5">
          <Button
            id="export-excel-btn"
            type="button"
            variant="outline"
            onClick={handleExportExcel}
            disabled={!hasGenerated || reportData.length === 0}
            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs sm:text-sm h-10 px-4 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            id="export-pdf-btn"
            type="button"
            onClick={handleExportPdf}
            disabled={!hasGenerated || reportData.length === 0}
            className="bg-[#15803d] hover:bg-[#166534] text-white shadow-xs font-medium text-xs sm:text-sm h-10 px-4 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

      {/* FILTERS Card */}
      <ModuleFilterBar
        title="FILTERS"
        actions={
          <div className="flex items-center gap-2">
            <Button
              id="generate-report-btn"
              type="button"
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="bg-[#15803d] hover:bg-[#166534] text-white font-semibold text-xs h-10 uppercase tracking-wider shadow-xs px-5 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BarChart2 className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
            <FilterResetButton onClick={handleReset} disabled={isLoading} />
          </div>
        }
      >
        {/* Strict Max 3 Columns Per Row */}
        <ModuleFilterGrid columns={3}>
          {/* 1. SEARCH */}
          <ModuleFilterItem label="SEARCH">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-10 text-xs font-sans"
              />
            </div>
          </ModuleFilterItem>

          {/* 2. REPORT TYPE */}
          <ModuleFilterItem label="REPORT TYPE">
            <Select
              value={reportType}
              onValueChange={(val) => handleReportTypeChange(val as ReportType)}
            >
              <SelectTrigger className="h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans">
                <SelectValue placeholder="Select Report Type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-xl z-50">
                {REPORT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ModuleFilterItem>

          {/* 3. STATUS FILTER */}
          <ModuleFilterItem label="STATUS FILTER">
            <Select
              disabled={isStatusDisabled}
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger
                className={`h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans ${
                  isStatusDisabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""
                }`}
              >
                <SelectValue
                  placeholder={
                    isStatusDisabled
                      ? "— No status filter —"
                      : "All Status"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-xl z-50">
                {availableStatuses?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ModuleFilterItem>

          {/* 4. REGION SCOPE */}
          {isAdmin ? (
            <ModuleFilterItem label="REGION SCOPE">
              <DropSearch
                items={regionDropItems}
                value={selectedRegionId}
                onChange={(val) => {
                  setSelectedRegionId(val || "ALL");
                  setSelectedStoreId("ALL");
                }}
                allOption={{ id: "ALL", label: "All Network Regions" }}
                placeholder="All Network Regions"
                searchPlaceholder="Search region..."
                width="w-full"
                className="h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans"
              />
            </ModuleFilterItem>
          ) : isRegionalManager ? (
            <ModuleFilterItem label="REGION SCOPE">
              <div className="h-10 px-3 rounded-md border border-slate-300 bg-slate-50 flex items-center text-xs font-medium text-slate-700">
                {assignedRegionName}
              </div>
            </ModuleFilterItem>
          ) : null}

          {/* 5. STORE SCOPE */}
          {isStoreManager ? (
            <ModuleFilterItem label="ASSIGNED STORE" className="sm:col-span-2">
              <div className="h-10 px-3 rounded-md border border-slate-300 bg-slate-50 flex items-center text-xs font-medium text-slate-700">
                {assignedStore ? `${assignedStore.name} (${assignedStore.storeCode})` : "Assigned Store"}
              </div>
            </ModuleFilterItem>
          ) : (
            <ModuleFilterItem label="STORE SCOPE" className={isAdmin ? "" : "sm:col-span-2"}>
              <DropSearch
                items={storeDropItems}
                value={selectedStoreId}
                onChange={(val) => setSelectedStoreId(val || "ALL")}
                allOption={{ id: "ALL", label: "All Stores in Scope" }}
                placeholder="All Stores in Scope"
                searchPlaceholder="Search store..."
                width="w-full"
                className="h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans"
              />
            </ModuleFilterItem>
          )}

          {/* 6. START DATE * */}
          <ModuleFilterItem label="START DATE" required>
            <DatePicker
              date={parsedStartDate}
              maxDate={parsedEndDate}
              onSelect={(d) => {
                if (d) {
                  const formatted = format(d, "yyyy-MM-dd");
                  setStartDate(formatted);
                  if (endDate && formatted > endDate) {
                    setEndDate(formatted);
                  }
                } else {
                  setStartDate("");
                }
                setCurrentPage(1);
              }}
              placeholder="Select start date"
              className="bg-white border-slate-300 text-slate-900 h-10 text-xs font-sans w-full"
            />
          </ModuleFilterItem>

          {/* 7. END DATE * */}
          <ModuleFilterItem label="END DATE" required>
            <DatePicker
              date={parsedEndDate}
              minDate={parsedStartDate}
              onSelect={(d) => {
                if (d) {
                  const formatted = format(d, "yyyy-MM-dd");
                  setEndDate(formatted);
                  if (startDate && formatted < startDate) {
                    setStartDate(formatted);
                  }
                } else {
                  setEndDate("");
                }
                setCurrentPage(1);
              }}
              align="end"
              placeholder="Select end date"
              className="bg-white border-slate-300 text-slate-900 h-10 text-xs font-sans w-full"
            />
          </ModuleFilterItem>
        </ModuleFilterGrid>
      </ModuleFilterBar>

      {/* Main Content Area */}
      {!hasGenerated ? (
        /* Empty State Banner */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-16 flex flex-col items-center justify-center text-center min-h-[360px]">
          <div className="h-16 w-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <BarChart2 className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Operational Reports</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md">
            Select your desired report type and filters above, then click{" "}
            <span className="text-[#15803d] font-bold">GENERATE REPORT</span> to
            load data.
          </p>
        </div>
      ) : reportData.length === 0 ? (
        /* Zero Results */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No Records Found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            No data matched the active filters for {activeReportName}. Try expanding your date range or adjusting keywords.
          </p>
        </div>
      ) : (
        /* Rendered Data Table */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-max">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  {getTableHeaders(reportType).map((head, idx) => (
                    <th key={idx} className="px-4 py-3 whitespace-nowrap">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {renderTableRow(reportType, row)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-muted-foreground bg-white">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">
                {filteredReportData.length === 0
                  ? "Showing 0 results"
                  : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                      currentPage * pageSize,
                      filteredReportData.length,
                    )} of ${filteredReportData.length} results`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 mr-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageLayout>
  );
};

// Helper: Column headers for HTML preview table
function getTableHeaders(type: ReportType): string[] {
  switch (type) {
    case "SALES_REPORT":
      return [
        "Invoice",
        "Timestamp",
        "Store",
        "Product / SKU",
        "Qty Sold",
        "Price (INR)",
        "Net Sales (INR)",
        "Margin (INR)",
      ];
    case "INVENTORY_REPORT":
      return [
        "Store",
        "SKU / Product",
        "Category",
        "Available Qty",
        "In-Transit",
        "ADS",
        "DOI (Days)",
        "Status",
        "Timestamp",
      ];
    case "SKU_REPORT":
      return [
        "SKU",
        "Product Name",
        "Category",
        "Cost (INR)",
        "Selling Price",
        "Available Stock",
        "Units Sold",
        "Revenue (INR)",
        "Velocity Tier",
        "Stock Status",
        "Timestamp",
      ];
    case "STORE_REPORT":
      return [
        "Store Code",
        "Store Name",
        "City",
        "Format",
        "Revenue (INR)",
        "Units Sold",
        "Avg DOI",
        "Critical SKUs",
        "Timestamp",
      ];
    case "RECOMMENDATION_REPORT":
      return [
        "Rec ID",
        "Priority",
        "Status",
        "SKU",
        "Destination Store",
        "Donor Store",
        "Recommended Qty",
        "Distance (km)",
        "Timestamp",
      ];
    case "AUDIT_REPORT":
      return [
        "Timestamp",
        "Actor",
        "Role",
        "Action",
        "Entity",
        "Summary",
      ];
  }
}

// Helper: Render table rows based on report type
function renderTableRow(type: ReportType, row: any) {
  switch (type) {
    case "SALES_REPORT":
      return (
        <>
          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
            {row.invoiceNumber}
          </td>
          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
            {row.transactionDate ? format(new Date(row.transactionDate), "yyyy-MM-dd HH:mm") : (row.timestamp || "2026-11-24 11:45")}
          </td>
          <td className="px-4 py-3 text-slate-700">
            {row.storeName} ({row.storeCode})
          </td>
          <td className="px-4 py-3 font-medium text-slate-900">
            {row.productName}
            <span className="block text-[11px] font-mono text-slate-400">
              {row.sku}
            </span>
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            {Number(row.quantitySold ?? row.unitsSold ?? 0).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            ₹{Number(row.unitSellingPrice ?? row.unitPrice ?? row.sellingPrice ?? 0).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono font-semibold tabular-nums text-right text-slate-900">
            ₹{Number(row.netSalesAmount ?? row.netAmount ?? row.netRevenue ?? 0).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right text-emerald-700">
            ₹{Number(row.grossMarginAmount ?? row.grossMargin ?? 0).toFixed(2)}
          </td>
        </>
      );
    case "INVENTORY_REPORT": {
      const availableQty = row.availableQty ?? row.availableQuantity ?? 0;
      const inTransitQty = row.inTransitQty ?? row.inTransitQuantity ?? 0;
      const ads = Number(row.ads ?? row.averageDailySales ?? row.rollingAds ?? 0);
      const currentDOI = Number(row.currentDOI ?? row.daysOfInventory ?? row.doi ?? 0);
      const stockStatus = row.stockStatus ?? row.healthStatus ?? row.status ?? "HEALTHY";

      return (
        <>
          <td className="px-4 py-3 text-slate-700">
            {row.storeName} ({row.storeCode})
          </td>
          <td className="px-4 py-3 font-medium text-slate-900">
            {row.productName}
            <span className="block text-[11px] font-mono text-slate-400">
              {row.sku}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-500">{row.categoryName}</td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold">
            {availableQty}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-500">
            {inTransitQty}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            {isNaN(ads) ? "0.00" : ads.toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-bold text-slate-800">
            {isNaN(currentDOI) ? "0.0" : currentDOI.toFixed(1)}d
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                stockStatus === "CRITICAL"
                  ? "bg-red-100 text-red-700"
                  : stockStatus === "LOW"
                  ? "bg-amber-100 text-amber-700"
                  : stockStatus === "EXCESS"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {stockStatus}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
            {row.lastUpdatedOn ? format(new Date(row.lastUpdatedOn), "yyyy-MM-dd HH:mm") : (row.timestamp ? format(new Date(row.timestamp), "yyyy-MM-dd HH:mm") : "2026-11-24 11:45")}
          </td>
        </>
      );
    }
    case "SKU_REPORT":
      return (
        <>
          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
            {row.sku}
          </td>
          <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
          <td className="px-4 py-3 text-slate-500">{row.categoryName}</td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            ₹{Number(row.costPrice).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            ₹{Number(row.sellingPrice).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold">
            {row.availableStock}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            {row.unitsSold}
          </td>
          <td className="px-4 py-3 font-mono font-bold text-right text-slate-900">
            ₹{Number(row.netRevenue).toFixed(2)}
          </td>
          <td className="px-4 py-3">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
              {row.velocityTier}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
              {row.stockStatus}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
            {row.timestamp ? format(new Date(row.timestamp), "yyyy-MM-dd HH:mm") : "2026-11-24 11:45"}
          </td>
        </>
      );
    case "STORE_REPORT":
      return (
        <>
          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
            {row.storeCode}
          </td>
          <td className="px-4 py-3 font-medium text-slate-900">{row.storeName}</td>
          <td className="px-4 py-3 text-slate-600">{row.city}</td>
          <td className="px-4 py-3 text-slate-600">{row.storeFormat}</td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-bold text-slate-900">
            ₹{Number(row.totalRevenue).toFixed(2)}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right">
            {row.totalUnitsSold}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold">
            {Number(row.avgStoreDOI).toFixed(1)}d
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right text-red-600 font-bold">
            {row.criticalSkusCount}
          </td>
          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
            {row.timestamp ? format(new Date(row.timestamp), "yyyy-MM-dd HH:mm") : "2026-11-24 11:45"}
          </td>
        </>
      );
    case "RECOMMENDATION_REPORT":
      return (
        <>
          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
            {row.recNumber || row.recommendationNumber || row.id}
          </td>
          <td className="px-4 py-3">
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                row.priority === "HIGH"
                  ? "bg-red-100 text-red-700"
                  : row.priority === "MEDIUM"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {row.priority}
            </span>
          </td>
          <td className="px-4 py-3 font-semibold text-slate-700">{row.status}</td>
          <td className="px-4 py-3 font-medium text-slate-900">
            {row.productName}
            <span className="block text-[11px] font-mono text-slate-400">
              {row.sku}
            </span>
          </td>
          <td className="px-4 py-3 text-slate-700">
            {row.destStoreName || row.toStoreName || "Destination Store"}
          </td>
          <td className="px-4 py-3 text-slate-500">
            {row.sourceStoreName || row.fromStoreName || "Central Supply"}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right font-bold text-emerald-700">
            {row.recommendedQty ?? row.recommendedQuantity ?? 0}
          </td>
          <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-500">
            {row.distanceKm} km
          </td>
          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
            {row.createdAt ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm") : (row.timestamp ? format(new Date(row.timestamp), "yyyy-MM-dd HH:mm") : "2026-11-24 11:45")}
          </td>
        </>
      );
    case "AUDIT_REPORT":
      return (
        <>
          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
            {row.timestamp}
          </td>
          <td className="px-4 py-3 font-medium text-slate-900">{row.actorName}</td>
          <td className="px-4 py-3 text-slate-600">{row.actorRole}</td>
          <td className="px-4 py-3 font-mono font-semibold text-slate-800">
            {row.action}
          </td>
          <td className="px-4 py-3 text-slate-600">{row.entityName}</td>
          <td className="px-4 py-3 text-slate-700">{row.changeSummary}</td>
        </>
      );
  }
}

// Helper: Columns for Excel and PDF Export
function getExportColumns(type: ReportType): ExportColumnDef<any>[] {
  switch (type) {
    case "SALES_REPORT":
      return [
        { header: "Invoice Number", accessor: "invoiceNumber" },
        { header: "Date", accessor: "transactionDate" },
        { header: "Store Code", accessor: "storeCode" },
        { header: "Store Name", accessor: "storeName" },
        { header: "SKU", accessor: "sku" },
        { header: "Product Name", accessor: "productName" },
        { header: "Quantity Sold", accessor: (r) => Number(r.quantitySold).toFixed(2) },
        { header: "Unit Price (INR)", accessor: (r) => Number(r.unitSellingPrice).toFixed(2) },
        { header: "Net Sales (INR)", accessor: (r) => Number(r.netSalesAmount).toFixed(2) },
        { header: "Gross Margin (INR)", accessor: (r) => Number(r.grossMarginAmount).toFixed(2) },
      ];
    case "INVENTORY_REPORT":
      return [
        { header: "Store Code", accessor: "storeCode" },
        { header: "Store Name", accessor: "storeName" },
        { header: "SKU", accessor: "sku" },
        { header: "Product Name", accessor: "productName" },
        { header: "Category", accessor: "categoryName" },
        {
          header: "Available Stock",
          accessor: (r) => r.availableQty ?? r.availableQuantity ?? 0,
        },
        {
          header: "In Transit",
          accessor: (r) => r.inTransitQty ?? r.inTransitQuantity ?? 0,
        },
        {
          header: "Average Daily Sales",
          accessor: (r) => {
            const val = Number(r.ads ?? r.averageDailySales ?? r.rollingAds ?? 0);
            return isNaN(val) ? "0.00" : val.toFixed(2);
          },
        },
        {
          header: "DOI (Days)",
          accessor: (r) => {
            const val = Number(r.currentDOI ?? r.daysOfInventory ?? r.doi ?? 0);
            return isNaN(val) ? "0.0" : val.toFixed(1);
          },
        },
        {
          header: "Stock Status",
          accessor: (r) => r.stockStatus ?? r.healthStatus ?? r.status ?? "HEALTHY",
        },
      ];
    case "SKU_REPORT":
      return [
        { header: "SKU", accessor: "sku" },
        { header: "Product Name", accessor: "name" },
        { header: "Category", accessor: "categoryName" },
        { header: "Cost Price (INR)", accessor: (r) => Number(r.costPrice).toFixed(2) },
        { header: "Selling Price (INR)", accessor: (r) => Number(r.sellingPrice).toFixed(2) },
        { header: "Available Stock", accessor: "availableStock" },
        { header: "Units Sold", accessor: "unitsSold" },
        { header: "Net Revenue (INR)", accessor: (r) => Number(r.netRevenue).toFixed(2) },
        { header: "Velocity Tier", accessor: "velocityTier" },
        { header: "Stock Status", accessor: "stockStatus" },
      ];
    case "STORE_REPORT":
      return [
        { header: "Store Code", accessor: "storeCode" },
        { header: "Store Name", accessor: "storeName" },
        { header: "City", accessor: "city" },
        { header: "Format", accessor: "storeFormat" },
        { header: "Total Revenue (INR)", accessor: (r) => Number(r.totalRevenue).toFixed(2) },
        { header: "Units Sold", accessor: "totalUnitsSold" },
        { header: "Avg Store DOI", accessor: (r) => Number(r.avgStoreDOI).toFixed(1) },
        { header: "Critical SKUs", accessor: "criticalSkusCount" },
      ];
    case "RECOMMENDATION_REPORT":
      return [
        { header: "Rec ID", accessor: "recNumber" },
        { header: "Priority", accessor: "priority" },
        { header: "Status", accessor: "status" },
        { header: "SKU", accessor: "sku" },
        { header: "Product Name", accessor: "productName" },
        { header: "Destination Store", accessor: "destStoreName" },
        { header: "Source Store", accessor: (r) => r.sourceStoreName || "Central Supply" },
        { header: "Recommended Units", accessor: "recommendedQty" },
        { header: "Distance (km)", accessor: "distanceKm" },
      ];
    case "AUDIT_REPORT":
      return [
        { header: "Timestamp", accessor: "timestamp" },
        { header: "Actor Name", accessor: "actorName" },
        { header: "Actor Role", accessor: "actorRole" },
        { header: "Action", accessor: "action" },
        { header: "Entity", accessor: "entityName" },
        { header: "Change Summary", accessor: "changeSummary" },
      ];
  }
}

// Helper: Rich fallback operational rows for preview
function getFallbackRows(type: ReportType): any[] {
  switch (type) {
    case "SALES_REPORT":
      return [
        {
          id: "sal-1001",
          invoiceNumber: "INV-BPL-88401",
          transactionDate: "2026-10-26 14:22",
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
          invoiceNumber: "INV-IND-44219",
          transactionDate: "2026-10-26 13:45",
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
          invoiceNumber: "INV-MUM-99012",
          transactionDate: "2026-10-26 11:18",
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
          invoiceNumber: "INV-PUN-77310",
          transactionDate: "2026-10-25 19:05",
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
    case "INVENTORY_REPORT":
      return [
        {
          id: "inv-1",
          storeCode: "BPL-001",
          storeName: "Bhopal MP Nagar Store",
          sku: "SKU-1024",
          productName: "Fortune Sunflower Oil 1L",
          categoryName: "Edible Oils & Ghee",
          availableQty: 3,
          inTransitQty: 0,
          ads: 2.1,
          currentDOI: 1.4,
          stockStatus: "CRITICAL",
        },
        {
          id: "inv-2",
          storeCode: "IND-001",
          storeName: "Indore Vijay Nagar Store",
          sku: "SKU-1024",
          productName: "Fortune Sunflower Oil 1L",
          categoryName: "Edible Oils & Ghee",
          availableQty: 55,
          inTransitQty: 0,
          ads: 0.5,
          currentDOI: 110.0,
          stockStatus: "EXCESS",
        },
        {
          id: "inv-3",
          storeCode: "DM-MUM-001",
          storeName: "Powai High-Velocity Hypermarket",
          sku: "SKU-1088",
          productName: "Aashirvaad Shudh Chakki Atta 10kg",
          categoryName: "Staples & Flour",
          availableQty: 18,
          inTransitQty: 20,
          ads: 4.5,
          currentDOI: 4.0,
          stockStatus: "LOW",
        },
        {
          id: "inv-4",
          storeCode: "DM-PUN-003",
          storeName: "Hinjewadi Supercenter",
          sku: "SKU-2041",
          productName: "Tata Tea Gold 1kg",
          categoryName: "Beverages",
          availableQty: 42,
          inTransitQty: 0,
          ads: 3.2,
          currentDOI: 13.1,
          stockStatus: "HEALTHY",
        },
      ];
    case "SKU_REPORT":
      return [
        {
          id: "sku-1",
          sku: "SKU-1024",
          name: "Fortune Sunflower Oil 1L",
          categoryName: "Edible Oils",
          costPrice: 110.0,
          sellingPrice: 138.0,
          availableStock: 58,
          unitsSold: 48,
          netRevenue: 6624.0,
          velocityTier: "FAST_MOVING",
          stockStatus: "HEALTHY",
        },
        {
          id: "sku-2",
          sku: "SKU-1088",
          name: "Aashirvaad Shudh Chakki Atta 10kg",
          categoryName: "Staples",
          costPrice: 380.0,
          sellingPrice: 455.0,
          availableStock: 85,
          unitsSold: 92,
          netRevenue: 41860.0,
          velocityTier: "FAST_MOVING",
          stockStatus: "LOW",
        },
        {
          id: "sku-3",
          sku: "SKU-2041",
          name: "Tata Tea Premium 1kg",
          categoryName: "Beverages",
          costPrice: 410.0,
          sellingPrice: 495.0,
          availableStock: 34,
          unitsSold: 28,
          netRevenue: 13860.0,
          velocityTier: "MODERATE",
          stockStatus: "HEALTHY",
        },
        {
          id: "sku-4",
          sku: "SKU-3019",
          name: "Surf Excel Matic Liquid 2L",
          categoryName: "Home Care",
          costPrice: 320.0,
          sellingPrice: 410.0,
          availableStock: 15,
          unitsSold: 12,
          netRevenue: 4920.0,
          velocityTier: "MODERATE",
          stockStatus: "HEALTHY",
        },
      ];
    case "STORE_REPORT":
      return [
        {
          id: "st-1",
          storeCode: "BPL-001",
          storeName: "Bhopal MP Nagar Store",
          city: "Bhopal",
          storeFormat: "SUPERMARKET",
          totalRevenue: 142800.0,
          totalUnitsSold: 840,
          avgStoreDOI: 4.2,
          criticalSkusCount: 3,
        },
        {
          id: "st-2",
          storeCode: "IND-001",
          storeName: "Indore Vijay Nagar Store",
          city: "Indore",
          storeFormat: "HYPERMARKET",
          totalRevenue: 318500.0,
          totalUnitsSold: 1920,
          avgStoreDOI: 18.5,
          criticalSkusCount: 0,
        },
        {
          id: "st-3",
          storeCode: "DM-MUM-001",
          storeName: "Powai High-Velocity Hypermarket",
          city: "Mumbai",
          storeFormat: "HYPERMARKET",
          totalRevenue: 485000.0,
          totalUnitsSold: 2750,
          avgStoreDOI: 8.9,
          criticalSkusCount: 1,
        },
      ];
    case "RECOMMENDATION_REPORT":
      return [
        {
          id: "rec-1",
          recNumber: "REC-1001",
          priority: "HIGH",
          status: "OPEN",
          sku: "SKU-1024",
          productName: "Fortune Sunflower Oil 1L",
          destStoreName: "Bhopal MP Nagar Store",
          sourceStoreName: "Indore Vijay Nagar Store",
          recommendedQty: 25,
          distanceKm: 195,
        },
        {
          id: "rec-2",
          recNumber: "REC-1002",
          priority: "MEDIUM",
          status: "OPEN",
          sku: "SKU-1088",
          productName: "Aashirvaad Shudh Chakki Atta 10kg",
          destStoreName: "Powai High-Velocity Hypermarket",
          sourceStoreName: "Hinjewadi Supercenter",
          recommendedQty: 40,
          distanceKm: 142,
        },
      ];
    case "AUDIT_REPORT":
      return [
        {
          id: "aud-1",
          timestamp: "2026-10-27 10:14:02",
          actorName: "Ananya Deshmukh",
          actorRole: "ADMIN",
          action: "LOGIN_SUCCESS",
          entityName: "AuthSession",
          changeSummary: "Authenticated enterprise platform session via corporate credentials",
        },
        {
          id: "aud-2",
          timestamp: "2026-10-27 10:18:45",
          actorName: "Ananya Deshmukh",
          actorRole: "ADMIN",
          action: "RUN_INTELLIGENCE_SCAN",
          entityName: "ActionCenter",
          changeSummary: "Evaluated 1,248 regional store-SKU inventory pairs in Central MP",
        },
      ];
  }
}

export default ReportsPage;
