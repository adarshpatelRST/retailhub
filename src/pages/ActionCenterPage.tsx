import * as React from "react";
import { format, subDays } from "date-fns";
import {
  Factory,
  PackagePlus,
  Radar,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layouts/PageLayout";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import {
  type RecommendationDto,
  type RecommendationPriority,
  type RecommendationQueryParams,
} from "@/api/action-center.api";
import { apiClient } from "@/api/client";
import {
  useRecommendations,
  ACTION_CENTER_QUERY_KEYS,
} from "@/hooks/useRecommendations";
import { useActionMutations } from "@/hooks/useActionMutations";
import { useRegions, useStores } from "@/hooks/useStores";
import { BatchApproveBar } from "@/components/action-center/BatchApproveBar";
import { ActionCenterModal } from "@/components/action-center/ActionCenterModal";
import { StoreRequestModal } from "@/components/action-center/StoreRequestModal";
import { RunIntelligenceScanModal } from "@/components/action-center/RunIntelligenceScanModal";
import { ActionCenterCardMobile } from "@/components/action-center/ActionCenterCardMobile";
import { ModuleFilterBar, ModuleFilterItem, FilterResetButton } from "@/components/ui/ModuleFilterBar";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

type ActionCenterStatusTab = "ALL_OPEN" | "COMPLETED_REJECTED";

const STATUS_TABS: Array<{ id: ActionCenterStatusTab; label: string }> = [
  { id: "ALL_OPEN", label: "Active Recommendations" },
  { id: "COMPLETED_REJECTED", label: "Completed / Rejected" },
];

export const ActionCenterListView: React.FC = () => {
  const { user } = useAuth();
  const { selectedStoreId, selectedRegionId } = useDataScope();

  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";
  const isRegionalMgr = user?.role === "REGIONAL_MANAGER";
  const isStoreMgr = user?.role === "STORE_MANAGER";

  // Actions are available to all operational roles (with modal-level RBAC)
  const canCreateStoreRequest = true;
  const canRunIntelligenceScan = true;

  const { data: regions = [] } = useRegions();
  const { stores: allStores = [] } = useStores();

  // Filter accessible regions based on RBAC
  const accessibleRegions = React.useMemo(() => {
    if (isAdminOrExec) return regions;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      return regions.filter((r: any) => assigned.includes(r.id));
    }
    return [];
  }, [regions, isAdminOrExec, isRegionalMgr, user]);

  const regionOptions = React.useMemo<ComboboxItem[]>(() => {
    return accessibleRegions.map((r: any) => ({
      id: r.id,
      label: r.name,
      subLabel: r.code || r.regionCode,
    }));
  }, [accessibleRegions]);

  // Filter states
  const [search, setSearch] = React.useState<string>("");
  const debouncedSearch = useDebounce(search, 300);
  const [requestType, setRequestType] = React.useState<
    "ALL" | "AI_RECOMMENDED" | "STORE_REQUEST"
  >("ALL");
  const [regionId, setRegionId] = React.useState<string>("ALL");
  const [storeId, setStoreId] = React.useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState<
    RecommendationPriority | ""
  >("");
  const [startDate, setStartDate] = React.useState<string>(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [activeTab, setActiveTab] =
    React.useState<ActionCenterStatusTab>("ALL_OPEN");

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [activeRecommendationId, setActiveRecommendationId] = React.useState<
    string | null
  >(null);
  const [modalOpen, setModalOpen] = React.useState<boolean>(false);
  const [storeRequestModalOpen, setStoreRequestModalOpen] =
    React.useState<boolean>(false);
  const [intelligenceScanModalOpen, setIntelligenceScanModalOpen] =
    React.useState<boolean>(false);

  // Filter accessible stores cascading by selected region
  const storeOptions = React.useMemo<ComboboxItem[]>(() => {
    let source = allStores;
    if (isRegionalMgr) {
      const assigned = user?.assignedRegionIds || [];
      source = allStores.filter((s) => assigned.includes(s.regionId));
    }
    if (regionId && regionId !== "ALL") {
      source = source.filter((s) => s.regionId === regionId);
    }
    return source.map((s) => ({
      id: s.id,
      label: `${s.name} (${s.storeCode})`,
      subLabel: `${(s as any).city || ""} · ${s.region?.name || ""}`,
    }));
  }, [allStores, isRegionalMgr, user, regionId]);

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

  // Reset to page 1 on debounced search change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const queryParams: RecommendationQueryParams = React.useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      requestType: requestType !== "ALL" ? requestType : undefined,
      priority: priorityFilter || undefined,
      tab: activeTab,
      toStoreId: isStoreMgr
        ? user?.assignedStoreIds?.[0] || selectedStoreId || undefined
        : storeId !== "ALL"
          ? storeId
          : selectedStoreId || undefined,
      regionId: isAdminOrExec
        ? regionId !== "ALL"
          ? regionId
          : undefined
        : isRegionalMgr
          ? user?.assignedRegionIds?.[0] || selectedRegionId || undefined
          : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [
      page,
      pageSize,
      debouncedSearch,
      requestType,
      priorityFilter,
      activeTab,
      isStoreMgr,
      isAdminOrExec,
      isRegionalMgr,
      user,
      selectedStoreId,
      selectedRegionId,
      storeId,
      regionId,
      startDate,
      endDate,
    ],
  );

  const queryClient = useQueryClient();

  // Live telemetry sync with background rebalance engine
  const { data: schedulerData } = useQuery<any>({
    queryKey: ["admin", "configurations", "scheduler"],
    queryFn: async () => {
      const res = await apiClient.get("/configurations/scheduler");
      return res.data;
    },
    refetchInterval: (query) => (query.state.data?.data?.status?.isScanRunning ? 2000 : 8000),
  });

  const isScanRunning = !!schedulerData?.data?.status?.isScanRunning;

  // Reactively invalidate and refresh recommendation lists when a scan concludes
  const prevScanRunningRef = React.useRef(false);
  React.useEffect(() => {
    if (prevScanRunningRef.current && !isScanRunning) {
      // Scan just concluded! Immediately invalidate recommendation cache so all new records display
      queryClient.invalidateQueries({ queryKey: ACTION_CENTER_QUERY_KEYS.all });
    }
    prevScanRunningRef.current = isScanRunning;
  }, [isScanRunning, queryClient]);

  const { data, isLoading, error, refetch } = useRecommendations(queryParams, { isScanRunning });
  const { batchApproveMutation, batchRejectMutation, intelligenceScanMutation } =
    useActionMutations();

  const recommendations = Array.isArray(data) ? data : data?.items ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const totalItems = data?.meta?.total ?? recommendations.length;

  const handleOpenReview = (recId: string) => {
    setActiveRecommendationId(recId);
    setModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setRequestType("ALL");
    setRegionId("ALL");
    setStoreId("ALL");
    setPriorityFilter("");
    setStartDate("");
    setEndDate("");
    setActiveTab("ALL_OPEN");
    setPage(1);
    setSelectedIds([]);
  };

  const isRowSelectable = React.useCallback(
    (rec: RecommendationDto) =>
      rec.status === "OPEN" || rec.status === "GENERATED" || rec.status === "REVIEWED",
    [],
  );

  // Reusable columns with NO table column sorting indicators (sortable: false/omitted)
  const columns: ServerColumn<RecommendationDto>[] = React.useMemo(
    () => [
      {
        key: "recommendationNumber",
        header: "Rec Number",
        render: (row) => (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleOpenReview(row.id)}
              className="font-mono text-xs font-bold text-primary hover:underline text-left"
            >
              {row.recommendationNumber}
            </button>
            {row.isManualRequest && (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700">
                <UserCheck className="h-3 w-3 size-3 shrink-0" />
                <span>Manual Store Request</span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        render: (row) => <StatusBadge status={row.priority} />,
      },
      {
        key: "productName",
        header: "Product (Name + SKU)",
        render: (row) => (
          <div className="max-w-[230px]">
            <div className="font-medium text-foreground truncate">
              {row.productName}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {row.sku} • ₹{row.unitCost.toLocaleString("en-IN")}/u
            </div>
          </div>
        ),
      },
      {
        key: "toStoreName",
        header: "Destination Store (DOI Before)",
        render: (row) => (
          <div className="space-y-1 min-w-[180px] max-w-[220px]">
            <div className="flex items-center justify-between gap-2">
              <span
                className="font-medium text-foreground text-xs truncate"
                title={row.toStoreName}
              >
                {row.toStoreName}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                {row.toStoreCode}
              </span>
            </div>
            <RH_DOIGauge doi={row.destDoiBefore} />
          </div>
        ),
      },
      {
        key: "fromStoreName",
        header: "Source Store",
        render: (row) =>
          row.fromStoreId ? (
            <div className="space-y-0.5 min-w-[180px] max-w-[220px]">
              <div
                className="font-medium text-foreground text-xs truncate"
                title={row.fromStoreName ?? undefined}
              >
                {row.fromStoreName}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {row.fromStoreCode} • {row.distanceKm?.toFixed(0)} km •{" "}
                {row.sourceDoiBefore?.toFixed(1)}d DOI
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-900">
              <Factory className="h-3.5 w-3.5 size-3.5 shrink-0" />
              <span>[🏭 Central Supply / Mother Hub]</span>
            </span>
          ),
      },
      {
        key: "recommendedQty",
        header: "Transfer Qty",
        align: "right",
        render: (row) => (
          <div className="font-mono text-right tabular-nums">
            <div className="font-semibold text-foreground">
              {row.recommendedQty.toFixed(3)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              ₹{(row.recommendedQty * row.unitCost).toLocaleString("en-IN")}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "createdOn",
        header: "Date & Time",
        render: (row) => {
          const raw = row.createdOn || (row as any).createdAt;
          if (!raw) return <span className="text-xs text-muted-foreground">—</span>;
          const d = new Date(raw);
          return (
            <div className="flex flex-col text-xs whitespace-nowrap">
              <span className="font-medium text-slate-800">
                {format(d, "dd MMM yyyy")}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {format(d, "hh:mm a")}
              </span>
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "Action",
        align: "right",
        render: (row) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenReview(row.id)}
            className="h-8 px-3 text-xs font-semibold"
          >
            Review ➔
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Action Center — Inter-Store Rebalancing & Replenishment"
      description="Review automated stockout-prevention recommendations, compare destination vs. donor DOI gauges in real time, and dispatch inter-store transfers."
      error={error}
      onRetry={() => void refetch()}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canCreateStoreRequest && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStoreRequestModalOpen(true)}
              className="h-9 text-xs font-semibold"
            >
              <PackagePlus className="h-4 w-4 size-4 mr-1.5 text-primary shrink-0" />
              <span>Request Stock Rebalance</span>
            </Button>
          )}

          {canRunIntelligenceScan && (
            <StandardButton
              type="button"
              size="sm"
              disabled={intelligenceScanMutation.isPending}
              loading={intelligenceScanMutation.isPending}
              onClick={() => setIntelligenceScanModalOpen(true)}
              className="h-9 text-xs font-semibold"
            >
              <Radar className="h-4 w-4 size-4 mr-1.5 shrink-0" />
              <span>
                {intelligenceScanMutation.isPending
                  ? "Scanning..."
                  : "Run Intelligence Scan"}
              </span>
            </StandardButton>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Unified Module Filter Bar */}
        <ModuleFilterBar
          title="Action Center Filters"
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. SEARCH */}
            <ModuleFilterItem label="SEARCH">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search Rec #, SKU, product, store..."
                  className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                />
              </div>
            </ModuleFilterItem>

            {/* 2. REQUEST TYPE */}
            <ModuleFilterItem label="REQUEST TYPE">
              <select
                aria-label="Filter by Request Type"
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value as any);
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-sans font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Requests</option>
                <option value="AI_RECOMMENDED">AI Recommended</option>
                <option value="STORE_REQUEST">Store Requests</option>
              </select>
            </ModuleFilterItem>

            {/* 3. REGION (Admin / Executive only) */}
            {isAdminOrExec && (
              <ModuleFilterItem label="REGION">
                <DropSearch
                  items={regionOptions}
                  value={regionId}
                  onChange={(val) => {
                    setRegionId(val || "ALL");
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

            {/* 4. STORE SCOPE (Admin / Executive & Regional Manager) */}
            {!isStoreMgr && (
              <ModuleFilterItem label="STORE SCOPE">
                <DropSearch
                  items={storeOptions}
                  value={storeId}
                  onChange={(val) => {
                    setStoreId(val || "ALL");
                    setPage(1);
                  }}
                  allOption={{
                    id: "ALL",
                    label:
                      regionId === "ALL"
                        ? "All Network Stores"
                        : "All Stores in Selected Region",
                  }}
                  placeholder="Select Store..."
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>
            )}

            {/* 5. PRIORITY */}
            <ModuleFilterItem label="PRIORITY">
              <select
                aria-label="Filter by Priority"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(
                    e.target.value as RecommendationPriority | "",
                  );
                  setPage(1);
                }}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs font-sans font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Priorities</option>
                <option value="HIGH">HIGH Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="LOW">LOW Priority</option>
              </select>
            </ModuleFilterItem>

            {/* 6. START DATE */}
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

            {/* 7. END DATE */}
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
                placeholder="Select end date"
                className="h-10 text-xs font-sans border-slate-300 bg-white"
              />
            </ModuleFilterItem>
          </div>
        </ModuleFilterBar>

        {/* Clean 2-State Status Toggle (Active vs History) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Recommendation Status Tabs"
            className="inline-flex items-center gap-1 rounded-lg border bg-muted/50 p-1"
          >
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                    setSelectedIds([]);
                  }}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Autonomous Scan In Progress Banner */}
        {isScanRunning && (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs text-blue-900 shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-bold">Autonomous Rebalance Scan in Progress...</span>
              <span className="text-blue-700 hidden md:inline">
                Evaluating network stockouts and generating recommendations in real-time. Live auto-sync active.
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
              LIVE SYNC
            </span>
          </div>
        )}

        {/* Desktop & Tablet Data Table (>= 640px) */}
        <div className="hidden sm:block">
          <ServerDataTable
            data={recommendations}
            columns={columns}
            loading={isLoading}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            enableSelection={activeTab === "ALL_OPEN"}
            isRowSelectable={isRowSelectable}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyMessage="No inventory rebalance recommendations match the active filters."
            toolbarActions={
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 size-3.5 text-indigo-600 shrink-0" />
                <span>
                  {activeTab === "ALL_OPEN" ? (
                    <>
                      Select 2+ rows to trigger atomic Batch Approval / Rejection, or click{" "}
                      <strong className="text-foreground">Review ➔</strong> for
                      side-by-side donor simulation.
                    </>
                  ) : (
                    <>
                      Completed &amp; rejected historical records. Click{" "}
                      <strong className="text-foreground">Review ➔</strong> to inspect
                      audit history.
                    </>
                  )}
                </span>
              </div>
            }
          />
        </div>

        {/* Mobile Touch-Friendly Card List (< 640px) */}
        <div className="block sm:hidden space-y-3">
          {recommendations.map((rec: any) => (
            <ActionCenterCardMobile
              key={rec.id}
              recommendation={rec}
              selectable={activeTab === "ALL_OPEN" && isRowSelectable(rec)}
              selected={selectedIds.includes(rec.id)}
              onSelectChange={(checked: boolean) => {
                if (checked) {
                  setSelectedIds((prev) => [...prev, rec.id]);
                } else {
                  setSelectedIds((prev) => prev.filter((id) => id !== rec.id));
                }
              }}
              onReview={handleOpenReview}
            />
          ))}
        </div>
      </div>

      {/* Floating Multi-Row Batch Actions Bar (Only for Active Recommendations) */}
      {activeTab === "ALL_OPEN" && (
        <BatchApproveBar
          selectedIds={selectedIds}
          recommendations={recommendations}
          isSubmitting={
            batchApproveMutation.isPending || batchRejectMutation.isPending
          }
          onConfirmBatchApprove={async (ids: string[]) => {
            await batchApproveMutation.mutateAsync({ ids });
            setSelectedIds([]);
          }}
          onConfirmBatchReject={async (ids: string[], reason: string) => {
            await batchRejectMutation.mutateAsync({ ids, reason });
            setSelectedIds([]);
          }}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Centered Wide 900px+ Review Modal with Functional Controls */}
      <ActionCenterModal
        recommendationId={activeRecommendationId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Store Manager & Operational Roles Stock Rebalance Request Modal */}
      <StoreRequestModal
        open={storeRequestModalOpen}
        onOpenChange={setStoreRequestModalOpen}
      />

      {/* Scoped Intelligence Scan Modal with Spam Rate-Limiting */}
      <RunIntelligenceScanModal
        open={intelligenceScanModalOpen}
        onOpenChange={setIntelligenceScanModalOpen}
      />
    </PageLayout>
  );
};

export const ActionCenterPage = ActionCenterListView;
export default ActionCenterPage;
