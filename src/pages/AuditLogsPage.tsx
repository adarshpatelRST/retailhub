import * as React from "react";
import { format, subDays } from "date-fns";
import { Filter, Info, RotateCcw, Search } from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import {
  ModuleFilterBar,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import { useAuditLogs } from "@/hooks/useAudit";
import { useDebounce } from "@/hooks/useDebounce";
import { type AuditLogRecord } from "@/api/audit.api";
import { useRegions, useStores } from "@/hooks/useStores";
import { AuditLogDetailsModal } from "@/components/audit/AuditLogDetailsModal";

const ACTION_OPTIONS: ComboboxItem[] = [
  { id: "ALL", label: "All Actions" },
  { id: "CREATE_CATEGORY", label: "Create Category", subLabel: "Categories & Brands" },
  { id: "UPDATE_CATEGORY", label: "Update Category", subLabel: "Categories & Brands" },
  { id: "SOFT_DELETE_CATEGORY", label: "Deactivate Category", subLabel: "Categories & Brands" },
  { id: "CREATE_BRAND", label: "Create Brand", subLabel: "Categories & Brands" },
  { id: "UPDATE_BRAND", label: "Update Brand", subLabel: "Categories & Brands" },
  { id: "SOFT_DELETE_BRAND", label: "Deactivate Brand", subLabel: "Categories & Brands" },
  { id: "CREATE_USER", label: "Create User", subLabel: "Users & Roles" },
  { id: "UPDATE_USER", label: "Update User", subLabel: "Users & Roles" },
  { id: "UPDATE_USER_STATUS", label: "Update User Status", subLabel: "Users & Roles" },
  { id: "RESET_EMPLOYEE_PASSWORD", label: "Reset Employee Password", subLabel: "Users & Roles" },
  { id: "CHANGE_PASSWORD", label: "Change Password", subLabel: "Account Security" },
  { id: "ADJUST_STOCK", label: "Adjust Stock", subLabel: "Inventory" },
  { id: "TRANSFER_APPROVE", label: "Approve Transfer", subLabel: "Stock Transfers" },
  { id: "TRANSFER_RECEIVE", label: "Receive Transfer", subLabel: "Stock Transfers" },
  { id: "CREATE_TRANSFER", label: "Create Transfer", subLabel: "Stock Transfers" },
  { id: "CREATE_PRODUCT", label: "Create Product", subLabel: "Products & Catalog" },
  { id: "UPDATE_PRODUCT", label: "Update Product", subLabel: "Products & Catalog" },
  { id: "BULK_SKU_IMPORT", label: "Bulk SKU Import", subLabel: "Products & Catalog" },
  { id: "CREATE_STORE", label: "Create Store", subLabel: "Store Network" },
  { id: "UPDATE_STORE", label: "Update Store", subLabel: "Store Network" },
  { id: "APPROVE_RECOMMENDATION", label: "Approve Recommendation", subLabel: "Action Center" },
  { id: "REJECT_RECOMMENDATION", label: "Reject Recommendation", subLabel: "Action Center" },
  { id: "MODIFY_RECOMMENDATION", label: "Modify Recommendation", subLabel: "Action Center" },
  { id: "BATCH_APPROVE_RECOMMENDATIONS", label: "Batch Approve Recommendations", subLabel: "Action Center" },
  { id: "BATCH_REJECT_RECOMMENDATIONS", label: "Batch Reject Recommendations", subLabel: "Action Center" },
  { id: "SWITCH_AI_MODEL", label: "Switch AI Reasoning Model", subLabel: "Intelligence Engine" },
];

export function formatActionLabel(action: string): string {
  if (!action) return "Unknown Action";

  const map: Record<string, string> = {
    CREATE_CATEGORY: "Create Category",
    UPDATE_CATEGORY: "Update Category",
    SOFT_DELETE_CATEGORY: "Deactivate Category",
    CREATE_BRAND: "Create Brand",
    UPDATE_BRAND: "Update Brand",
    SOFT_DELETE_BRAND: "Deactivate Brand",
    CREATE_USER: "Create User",
    UPDATE_USER: "Update User",
    UPDATE_USER_STATUS: "Update User Status",
    RESET_EMPLOYEE_PASSWORD: "Reset Password",
    CHANGE_PASSWORD: "Change Password",
    ADJUST_STOCK: "Adjust Stock",
    TRANSFER_APPROVE: "Approve Transfer",
    TRANSFER_RECEIVE: "Receive Transfer",
    CREATE_TRANSFER: "Create Transfer",
    CREATE_PRODUCT: "Create Product",
    UPDATE_PRODUCT: "Update Product",
    BULK_SKU_IMPORT: "Bulk SKU Import",
    CREATE_STORE: "Create Store",
    UPDATE_STORE: "Update Store",
    APPROVE_RECOMMENDATION: "Approve Recommendation",
    REJECT_RECOMMENDATION: "Reject Recommendation",
    MODIFY_RECOMMENDATION: "Modify Recommendation",
    BATCH_APPROVE_RECOMMENDATIONS: "Batch Approve Recommendations",
    BATCH_REJECT_RECOMMENDATIONS: "Batch Reject Recommendations",
    SWITCH_AI_MODEL: "Switch AI Model",
    LOGIN: "User Login",
    LOGOUT: "User Logout",
  };

  if (map[action]) return map[action];

  // Gracefully normalize legacy raw HTTP endpoint strings
  const upper = action.toUpperCase();
  if (upper.includes("/CATEGORIES")) {
    if (upper.startsWith("POST")) return "Create Category";
    if (upper.startsWith("PUT") || upper.startsWith("PATCH")) return "Update Category";
    if (upper.startsWith("DELETE")) return "Deactivate Category";
  }
  if (upper.includes("/BRANDS")) {
    if (upper.startsWith("POST")) return "Create Brand";
    if (upper.startsWith("PUT") || upper.startsWith("PATCH")) return "Update Brand";
    if (upper.startsWith("DELETE")) return "Deactivate Brand";
  }
  if (upper.includes("/USERS")) {
    if (upper.includes("STATUS")) return "Update User Status";
    if (upper.includes("RESET-PASSWORD")) return "Reset Password";
    if (upper.startsWith("POST")) return "Create User";
    if (upper.startsWith("PATCH") || upper.startsWith("PUT")) return "Update User";
  }

  if (action.includes("_")) {
    return action
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return action;
}

export function normalizeEntityName(name: string | null | undefined, action?: string): string {
  if (name && name !== "v1" && name !== "Resource") return name;
  const act = (action || "").toUpperCase();
  if (act.includes("CATEGORY") || act.includes("/CATEGORIES")) return "Category";
  if (act.includes("BRAND") || act.includes("/BRANDS")) return "Brand";
  if (act.includes("USER") || act.includes("/USERS") || act.includes("PASSWORD")) return "User";
  if (act.includes("PRODUCT") || act.includes("/PRODUCTS") || act.includes("SKU")) return "Product";
  if (act.includes("TRANSFER") || act.includes("/TRANSFERS")) return "StockTransfer";
  if (act.includes("INVENTORY") || act.includes("STOCK") || act.includes("/INVENTORY")) return "Inventory";
  if (act.includes("STORE") || act.includes("/STORES")) return "Store";
  if (act.includes("RULE") || act.includes("/RULES")) return "InventoryRule";
  if (act.includes("RECOMMENDATION") || act.includes("/RECOMMENDATIONS")) return "Recommendation";
  return "System";
}

export const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const { availableStores } = useDataScope();

  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
  const isRegionalMgr = user?.role === "REGIONAL_MANAGER";
  const isStoreMgr = user?.role === "STORE_MANAGER";

  // Filter States
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Reset to page 1 on debounced search change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Modal State
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRecord | null>(null);

  // Region and Store query options
  const { data: regions = [] } = useRegions();
  const { stores: allStores = [] } = useStores();

  const regionOptions = React.useMemo<ComboboxItem[]>(() => {
    return regions.map((r: any) => ({
      id: r.id,
      label: r.name,
      subLabel: r.code || r.regionCode,
    }));
  }, [regions]);

  const storeOptions = React.useMemo<ComboboxItem[]>(() => {
    let source = allStores;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      source = allStores.filter((s) => assigned.includes(s.regionId));
    } else if (selectedRegionId && selectedRegionId !== "ALL") {
      source = allStores.filter((s) => s.regionId === selectedRegionId);
    }
    return source.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.storeCode})`,
      subLabel: `${(s as any).city || ""} · ${s.region?.name || ""}`,
    }));
  }, [allStores, isRegionalMgr, user, selectedRegionId]);

  // Query Audit Logs
  const { data: auditResponse, isLoading } = useAuditLogs({
    page,
    limit: pageSize,
    search: debouncedSearch.trim() || undefined,
    action: actionFilter !== "ALL" ? actionFilter : undefined,
    regionId: isAdminOrExec && selectedRegionId !== "ALL" ? selectedRegionId : undefined,
    storeId: !isStoreMgr && selectedStoreId !== "ALL" ? selectedStoreId : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const logs = auditResponse?.items || [];
  const meta = auditResponse?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleResetFilters = () => {
    setSearch("");
    setActionFilter("ALL");
    setSelectedRegionId("ALL");
    setSelectedStoreId("ALL");
    setStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setPage(1);
  };

  const getActionBadgeClass = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("APPROVE")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (act.includes("MODIFY") || act.includes("ADJUST") || act.includes("STOCK")) {
      return "bg-amber-50 text-amber-900 border-amber-200";
    }
    if (act.includes("DELETE") || act.includes("REJECT") || act.includes("CANCEL")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    if (act.includes("MODEL") || act.includes("AI")) {
      return "bg-purple-50 text-purple-900 border-purple-200";
    }
    if (act.includes("UPDATE") || act.includes("EDIT")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (act.includes("TRANSFER") || act.includes("DISPATCH")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (act.includes("CREATE") || act.includes("IMPORT")) {
      return "bg-purple-50 text-purple-900 border-purple-200";
    }
    if (act.includes("PASSWORD") || act.includes("AUTH") || act.includes("LOGIN")) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
    return "bg-slate-100 text-slate-800 border-slate-200";
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

  const renderRecordIdBadge = (id: string) => {
    if (id === "batch") {
      return (
        <span className="font-mono text-xs font-semibold text-slate-500 italic bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded">
          batch
        </span>
      );
    }

    if (id.length <= 16) {
      return (
        <span
          className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded select-all inline-block"
          title={id}
        >
          {id}
        </span>
      );
    }

    // Split long IDs into two balanced lines:
    // Search for a dash or underscore closest to the midpoint
    let splitIdx = -1;
    const mid = Math.round(id.length / 2);
    const minRange = Math.floor(id.length * 0.35);
    const maxRange = Math.ceil(id.length * 0.65);

    let closestDist = Infinity;
    for (let i = minRange; i <= maxRange; i++) {
      if (id[i] === "-" || id[i] === "_") {
        const dist = Math.abs(i - mid);
        if (dist < closestDist) {
          closestDist = dist;
          splitIdx = i;
        }
      }
    }

    let line1: string;
    let line2: string;

    if (splitIdx !== -1) {
      line1 = id.slice(0, splitIdx + 1);
      line2 = id.slice(splitIdx + 1);
    } else {
      line1 = id.slice(0, mid);
      line2 = id.slice(mid);
    }

    return (
      <div
        className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-1 rounded select-all inline-flex flex-col leading-tight max-w-[145px]"
        title={id}
      >
        <span className="whitespace-nowrap">{line1}</span>
        <span className="whitespace-nowrap">{line2}</span>
      </div>
    );
  };

  const columns = React.useMemo<ServerColumn<AuditLogRecord>[]>(
    () => [
      {
        key: "entityId",
        header: "RECORD ID",
        sortable: false,
        widthClass: "w-[150px] min-w-[145px] whitespace-normal",
        render: (row) => renderRecordIdBadge(row.entityId),
      },
      {
        key: "action",
        header: "ACTION",
        sortable: false,
        widthClass: "min-w-[170px]",
        render: (row) => (
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-medium text-xs shadow-2xs ${getActionBadgeClass(
              row.action,
            )}`}
            title={row.action}
          >
            {formatActionLabel(row.action)}
          </span>
        ),
      },
      {
        key: "userName",
        header: "USER NAME",
        sortable: false,
        widthClass: "min-w-[180px]",
        render: (row) => (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-slate-900 text-xs truncate" title={row.userName}>
              {row.userName}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {row.userRole}
            </span>
          </div>
        ),
      },
      {
        key: "userEmail",
        header: "PERFORMED BY",
        sortable: false,
        widthClass: "min-w-[190px]",
        render: (row) => (
          <span className="font-mono text-xs text-slate-700 truncate max-w-[200px] block" title={row.userEmail}>
            {row.userEmail}
          </span>
        ),
      },
      {
        key: "entityName",
        header: "TABLE NAME",
        sortable: false,
        widthClass: "min-w-[130px]",
        render: (row) => {
          const tableName = normalizeEntityName(row.entityName, row.action);
          return (
            <span className="font-mono text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium">
              {tableName}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "STATUS",
        sortable: false,
        align: "center",
        widthClass: "min-w-[100px]",
        render: () => (
          <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
            SUCCESS
          </span>
        ),
      },
      {
        key: "timestamp",
        header: "TIMESTAMP",
        sortable: false,
        widthClass: "min-w-[180px]",
        render: (row) => (
          <span className="font-mono text-xs text-slate-600 whitespace-nowrap">
            {new Date(row.timestamp).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </span>
        ),
      },
      {
        key: "details",
        header: "DETAILS",
        sortable: false,
        align: "center",
        widthClass: "min-w-[80px]",
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedLog(row)}
            className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            title="View Audit Log Details"
            aria-label="View Audit Log Details"
          >
            <Info className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Audit Logs"
      subtitle="Track system activity and data changes across the platform"
    >
      <div className="space-y-4">
        {/* Filter Section matching Reference Layout & RBAC */}
        <ModuleFilterBar
          title="FILTERS"
          icon={<Filter className="h-3.5 w-3.5 text-emerald-700" />}
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          {/* Responsive filter layout: capped at max 3 items per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filter 1: SEARCH */}
            <ModuleFilterItem label="SEARCH">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by performed by, table, record ID..."
                  className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                />
              </div>
            </ModuleFilterItem>

            {/* Filter 2: ACTION FILTER */}
            <ModuleFilterItem label="ACTION FILTER">
              <DropSearch
                items={ACTION_OPTIONS}
                options={ACTION_OPTIONS}
                value={actionFilter}
                onChange={(val) => {
                  setActionFilter(val || "ALL");
                  setPage(1);
                }}
                onSelect={(val) => {
                  setActionFilter(val || "ALL");
                  setPage(1);
                }}
                placeholder="All Actions"
                searchPlaceholder="Search actions..."
                allOption={{ id: "ALL", label: "All Actions" }}
                width="w-full"
                className="h-10 text-xs font-sans"
              />
            </ModuleFilterItem>

            {/* Filter 3: REGION (Only for Admin & Executive per RBAC) */}
            {isAdminOrExec && (
              <ModuleFilterItem label="REGION">
                <DropSearch
                  items={regionOptions}
                  options={regionOptions}
                  value={selectedRegionId}
                  onChange={(val) => {
                    setSelectedRegionId(val || "ALL");
                    setSelectedStoreId("ALL");
                    setPage(1);
                  }}
                  onSelect={(val) => {
                    setSelectedRegionId(val || "ALL");
                    setSelectedStoreId("ALL");
                    setPage(1);
                  }}
                  placeholder="All Regions"
                  searchPlaceholder="Search region name or code..."
                  allOption={{ id: "ALL", label: "All Regions" }}
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>
            )}

            {/* Filter 4: STORE (For Admin, Exec, and Regional Manager per RBAC) */}
            {!isStoreMgr && (
              <ModuleFilterItem label={isRegionalMgr ? "STORE (MY REGION)" : "STORE"}>
                <DropSearch
                  items={storeOptions}
                  options={storeOptions}
                  value={selectedStoreId}
                  onChange={(val) => {
                    setSelectedStoreId(val || "ALL");
                    setPage(1);
                  }}
                  onSelect={(val) => {
                    setSelectedStoreId(val || "ALL");
                    setPage(1);
                  }}
                  placeholder={isRegionalMgr ? "All Stores in My Region" : "All Stores"}
                  searchPlaceholder="Search store code, name, city..."
                  allOption={{
                    id: "ALL",
                    label: isRegionalMgr ? "All Stores in My Region" : "All Stores",
                  }}
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>
            )}

            {/* Filter 5: START DATE */}
            <ModuleFilterItem label="START DATE">
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
                  setPage(1);
                }}
                placeholder="Select start date"
                className="h-10 text-xs font-sans border-slate-300 bg-white"
              />
            </ModuleFilterItem>

            {/* Filter 6: END DATE */}
            <ModuleFilterItem label="END DATE">
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
                  setPage(1);
                }}
                align="end"
                placeholder="Select end date"
                className="h-10 text-xs font-sans border-slate-300 bg-white"
              />
            </ModuleFilterItem>
          </div>
        </ModuleFilterBar>

        {/* Audit Logs Table using Reusable ServerDataTable */}
        <ServerDataTable
          data={logs}
          columns={columns}
          loading={isLoading}
          page={page}
          totalPages={meta.totalPages}
          pageSize={pageSize}
          totalItems={meta.total}
          onPageChange={setPage}
          emptyMessage={
            isStoreMgr
              ? "No audit logs found for your assigned store."
              : isRegionalMgr
                ? "No audit logs found for your assigned region."
                : "No audit logs match the active filter criteria."
          }
        />
      </div>

      {/* Audit Log Details Modal */}
      <AuditLogDetailsModal
        log={selectedLog}
        open={Boolean(selectedLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      />
    </PageLayout>
  );
};

export default AuditLogsPage;
