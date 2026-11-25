import * as React from "react";
import {
  Factory,
  PackagePlus,
  Radar,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { RH_SearchBox } from "@/components/ui/RH_SearchBox";
import { Button, StandardButton } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import {
  type RecommendationDto,
  type RecommendationPriority,
  type RecommendationQueryParams,
} from "./api/action-center.api";
import { useRecommendations } from "./hooks/useRecommendations";
import { useActionMutations } from "./hooks/useActionMutations";
import { BatchApproveBar } from "./components/BatchApproveBar";
import { ActionCenterDrawer } from "./components/ActionCenterDrawer";
import { StoreRequestModal } from "./components/StoreRequestModal";
import { ActionCenterCardMobile } from "./components/ActionCenterCardMobile";
import { cn } from "@/lib/utils";

type ActionCenterFilterTab =
  | "ALL_OPEN"
  | "HIGH_PRIORITY"
  | "STORE_REQUESTS"
  | "COMPLETED_REJECTED";

const FILTER_TABS: Array<{ id: ActionCenterFilterTab; label: string }> = [
  { id: "ALL_OPEN", label: "All Open" },
  { id: "HIGH_PRIORITY", label: "High Priority" },
  { id: "STORE_REQUESTS", label: "Store Requests" },
  { id: "COMPLETED_REJECTED", label: "Completed / Rejected" },
];

export const ActionCenterListView: React.FC = () => {
  const { hasRole } = useAuth();
  const { selectedStoreId, selectedRegionId } = useDataScope();

  const canCreateStoreRequest = hasRole(["STORE_MANAGER", "ADMIN"]);
  const canRunIntelligenceScan = hasRole([
    "REGIONAL_MANAGER",
    "EXECUTIVE",
    "ADMIN",
  ]);

  const [activeTab, setActiveTab] =
    React.useState<ActionCenterFilterTab>("ALL_OPEN");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [search, setSearch] = React.useState<string>("");
  const [priorityFilter, setPriorityFilter] = React.useState<
    RecommendationPriority | ""
  >("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [activeRecommendationId, setActiveRecommendationId] = React.useState<
    string | null
  >(null);
  const [drawerOpen, setDrawerOpen] = React.useState<boolean>(false);
  const [storeRequestModalOpen, setStoreRequestModalOpen] =
    React.useState<boolean>(false);

  const queryParams: RecommendationQueryParams = React.useMemo(
    () => ({
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      priority: priorityFilter || undefined,
      tab: activeTab,
      toStoreId: selectedStoreId ?? undefined,
      regionId: selectedRegionId ?? undefined,
    }),
    [
      page,
      pageSize,
      search,
      priorityFilter,
      activeTab,
      selectedStoreId,
      selectedRegionId,
    ],
  );

  const { data, isLoading, error, refetch } = useRecommendations(queryParams);
  const { batchApproveMutation, intelligenceScanMutation } =
    useActionMutations();

  const recommendations = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const totalItems = data?.meta.total ?? recommendations.length;

  const handleOpenReview = (recId: string) => {
    setActiveRecommendationId(recId);
    setDrawerOpen(true);
  };

  const columns: ServerColumn<RecommendationDto>[] = React.useMemo(
    () => [
      {
        key: "recommendationNumber",
        header: "Rec Number",
        sortable: true,
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
        sortable: true,
        render: (row) => <StatusBadge status={row.priority} />,
      },
      {
        key: "productName",
        header: "Product (Name + SKU)",
        sortable: true,
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
          <div className="space-y-1 min-w-[180px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground text-xs truncate">
                {row.toStoreName}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
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
            <div className="space-y-0.5">
              <div className="font-medium text-foreground text-xs">
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
        sortable: true,
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
              loading={intelligenceScanMutation.isPending}
              onClick={() =>
                intelligenceScanMutation.mutate({ regionId: selectedRegionId })
              }
              className="h-9 text-xs font-semibold"
            >
              <Radar className="h-4 w-4 size-4 mr-1.5 shrink-0" />
              <span>Run Intelligence Scan</span>
            </StandardButton>
          )}
        </div>
      }
    >
      {/* Filter Tabs + Search & Priority Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Recommendation Status Tabs"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-1"
        >
          {FILTER_TABS.map((tab) => {
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
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
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

        <div className="flex flex-wrap items-center gap-2">
          <RH_SearchBox
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search Rec #, SKU, product, or store..."
            className="w-full sm:w-72"
          />

          <div className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 size-3.5 text-muted-foreground shrink-0" />
            <select
              aria-label="Filter by Priority"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(
                  e.target.value as RecommendationPriority | "",
                );
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground"
            >
              <option value="">All Priorities</option>
              <option value="HIGH">HIGH Priority</option>
              <option value="MEDIUM">MEDIUM Priority</option>
              <option value="LOW">LOW Priority</option>
            </select>
          </div>
        </div>
      </div>

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
          onPageSizeChange={(sz) => {
            setPageSize(sz);
            setPage(1);
          }}
          enableSelection={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No inventory rebalance recommendations match the active filters."
          toolbarActions={
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 size-3.5 text-indigo-600 shrink-0" />
              <span>
                Select 2+ rows to trigger atomic Batch Approval, or click{" "}
                <strong className="text-foreground">Review ➔</strong> for
                side-by-side donor simulation.
              </span>
            </div>
          }
        />
      </div>

      {/* Mobile Touch-Friendly Card List (< 640px) */}
      <div className="block sm:hidden space-y-3">
        {recommendations.map((rec) => (
          <ActionCenterCardMobile
            key={rec.id}
            recommendation={rec}
            selected={selectedIds.includes(rec.id)}
            onSelectChange={(checked) => {
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

      {/* Floating Multi-Row Batch Approval Bar (selectedIds.length >= 2) */}
      <BatchApproveBar
        selectedIds={selectedIds}
        recommendations={recommendations}
        isSubmitting={batchApproveMutation.isPending}
        onConfirmBatchApprove={async (ids) => {
          await batchApproveMutation.mutateAsync({ ids });
          setSelectedIds([]);
        }}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Slide-Over 600px Review Drawer */}
      <ActionCenterDrawer
        recommendationId={activeRecommendationId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Store Manager Custom Rebalance Request Modal */}
      <StoreRequestModal
        open={storeRequestModalOpen}
        onOpenChange={setStoreRequestModalOpen}
      />
    </PageLayout>
  );
};
