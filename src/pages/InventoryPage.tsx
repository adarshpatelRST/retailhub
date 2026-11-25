import * as React from "react";
import { ArrowRightLeft, Filter, RotateCcw, Search, ChevronLeft, ChevronRight, Trash2, Zap } from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, StandardButton } from "@/components/ui/button";
import {
  type DoiRiskTier,
  type InventoryRecord,
  type InventoryStockStatus,
} from "@/api/inventory.api";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { useDataScope } from "@/context/DataScopeContext";
import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryCardMobile } from "@/components/inventory/InventoryCardMobile";
import { AdjustStockModal } from "@/components/inventory/AdjustStockModal";
import { SimulateStockoutModal } from "@/components/inventory/SimulateStockoutModal";
import { PurgeRecommendationsModal } from "@/components/inventory/PurgeRecommendationsModal";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";

export interface InventoryOverviewViewProps {
  initialStoreId?: string | null;
  storesList?: ComboboxItem[];
  fallbackItems?: InventoryRecord[];
  onNavigateToTransfers?: () => void;
}

const DEFAULT_STORES: ComboboxItem[] = [
  {
    id: "store-mum-01",
    label: "Powai Hypermarket (DM-MUM-01)",
    subLabel: "Mumbai · West Zone",
  },
  {
    id: "store-mum-02",
    label: "Andheri East Supercenter (DM-MUM-02)",
    subLabel: "Mumbai · West Zone",
  },
  {
    id: "store-blr-01",
    label: "Whitefield Mega Store (DM-BLR-01)",
    subLabel: "Bengaluru · South Zone",
  },
  {
    id: "store-del-01",
    label: "Noida Sector 18 Store (DM-DEL-01)",
    subLabel: "Delhi NCR · North Zone",
  },
];

export const InventoryOverviewView: React.FC<InventoryOverviewViewProps> = ({
  initialStoreId,
  storesList,
  fallbackItems,
  onNavigateToTransfers,
}) => {
  const { user } = useAuth();
  const isStoreManager = user?.role === "STORE_MANAGER";

  const {
    availableStores,
    selectedStoreId: contextStoreId,
  } = useDataScope();

  const realStoreItems = React.useMemo<ComboboxItem[]>(() => {
    if (availableStores && availableStores.length > 0) {
      return availableStores.map((s) => ({
        id: s.id,
        label: `${s.name} (${s.storeCode})`,
        subLabel: `${s.city} · ${s.regionName}`,
      }));
    }
    return DEFAULT_STORES;
  }, [availableStores]);

  const effectiveStoresList =
    storesList && storesList !== DEFAULT_STORES
      ? storesList
      : realStoreItems;

  const [selectedStoreId, setSelectedStoreId] = React.useState<string | null>(
    () => {
      if (isStoreManager) {
        return user?.assignedStoreIds?.[0] || "ALL";
      }
      return initialStoreId ?? contextStoreId ?? "ALL";
    },
  );

  React.useEffect(() => {
    if (isStoreManager) {
      const storeId = user?.assignedStoreIds?.[0];
      if (storeId && selectedStoreId !== storeId) {
        setSelectedStoreId(storeId);
      }
    } else if (contextStoreId && selectedStoreId !== contextStoreId && contextStoreId !== "ALL") {
      setSelectedStoreId(contextStoreId);
    }
  }, [isStoreManager, user, contextStoreId]);

  const effectiveStoreId = isStoreManager
    ? (user?.assignedStoreIds?.[0] || selectedStoreId || "ALL")
    : (selectedStoreId || "ALL");

  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | InventoryStockStatus>("ALL");
  const [riskFilter, setRiskFilter] = React.useState<"ALL" | DoiRiskTier>("ALL");
  const [page, setPage] = React.useState<number>(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = React.useState<string>("doi");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Inspection & Adjustment Modals
  const [adjustItem, setAdjustItem] = React.useState<InventoryRecord | null>(null);

  // Testing Utilities Modals
  const [isStockoutModalOpen, setIsStockoutModalOpen] = React.useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = React.useState(false);

  const { data, isLoading, error, refetch } = useInventory({
    storeId: effectiveStoreId && effectiveStoreId !== "ALL" ? effectiveStoreId : undefined,
    status: statusFilter,
    risk: riskFilter,
    search: searchQuery,
    page: 1,
    limit: 400,
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setRiskFilter("ALL");
    if (!isStoreManager) {
      setSelectedStoreId("ALL");
    }
    setPage(1);
  };

  // Filtered dataset reactive to store, search, health status, and risk tier
  const filteredItems = React.useMemo(() => {
    const raw = fallbackItems ?? data?.items ?? [];
    return raw.filter((item: any) => {
      if (effectiveStoreId && effectiveStoreId !== "ALL") {
        const matchesId = item.storeId === effectiveStoreId;
        const matchesCode = item.storeCode?.toUpperCase() === effectiveStoreId.toUpperCase();
        const matchesSlug = item.storeCode && effectiveStoreId.toUpperCase().includes(item.storeCode.toUpperCase());
        if (!matchesId && !matchesCode && !matchesSlug) {
          return false;
        }
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      if (riskFilter !== "ALL" && item.riskTier !== riskFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches =
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.productCode && item.productCode.toLowerCase().includes(q)) ||
          (item.productName && item.productName.toLowerCase().includes(q)) ||
          (item.storeName && item.storeName.toLowerCase().includes(q)) ||
          (item.storeCode && item.storeCode.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [
    fallbackItems,
    data?.items,
    effectiveStoreId,
    statusFilter,
    riskFilter,
    searchQuery,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Auto adjust page when filtered results shrink
  React.useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [page, totalPages]);

  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  return (
    <PageLayout
      title="Inventory Health & Movement Ledger"
      description="Real-time store shelf balances, Days of Inventory (DOI) velocity gauges, and double-entry movement audit trails."
      error={fallbackItems ? null : (error as Error | null)}
      onRetry={() => refetch()}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Testing Utility 1: Purge All Recommendations */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPurgeModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
            title="Purge all recommendations from the database table (Test Utility)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Purge All Recs</span>
          </Button>

          {/* Testing Utility 2: Simulate 0-Stock Out by Region & Store */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsStockoutModalOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-rose-700 border-rose-300 hover:bg-rose-50"
            title="Open modal with Region & Store DropSearch to set stock to 0 for testing"
          >
            <Zap className="h-3.5 w-3.5 fill-current" />
            <span>Simulate 0-Stock Out</span>
          </Button>

          {onNavigateToTransfers && (
            <StandardButton
              type="button"
              variant="default"
              size="sm"
              onClick={onNavigateToTransfers}
              leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
            >
              Stock Transfer Consignments
            </StandardButton>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. Top Section: Reusable Module Filter Bar */}
        <ModuleFilterBar
          title="Inventory Ledger & Shelf Stock Filters"
          icon={<Filter className="h-4 w-4 text-emerald-700" />}
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Filter 1: SEARCH */}
            <ModuleFilterItem label="SEARCH">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search SKU, Barcode, or Name..."
                  className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                />
              </div>
            </ModuleFilterItem>

            {/* Filter 2: Store Scope DropSearch (Hidden for STORE_MANAGER per RBAC) */}
            {!isStoreManager && (
              <ModuleFilterItem label="STORE SCOPE">
                <DropSearch
                  items={effectiveStoresList}
                  options={effectiveStoresList}
                  value={selectedStoreId}
                  onChange={(val) => {
                    setSelectedStoreId(val);
                    setPage(1);
                  }}
                  onSelect={(val) => {
                    setSelectedStoreId(val);
                    setPage(1);
                  }}
                  placeholder="Select Operational Store..."
                  searchPlaceholder="Search store code, name, city..."
                  allOption={{
                    id: "ALL",
                    label:
                      user?.role === "REGIONAL_MANAGER"
                        ? "All Regional Stores"
                        : "All Network Stores",
                  }}
                  width="w-full"
                />
              </ModuleFilterItem>
            )}

            {/* Filter 3: Stock Health Tier */}
            <ModuleFilterItem label="STOCK HEALTH STATUS">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs font-sans bg-white border-slate-300">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Health Tiers</SelectItem>
                  <SelectItem value="CRITICAL">Critical Stock (≤0 or ≤3d)</SelectItem>
                  <SelectItem value="LOW">Low Stock (≤ Reorder)</SelectItem>
                  <SelectItem value="HEALTHY">Healthy Balance</SelectItem>
                  <SelectItem value="EXCESS">Excess / Overstock</SelectItem>
                </SelectContent>
              </Select>
            </ModuleFilterItem>

            {/* Filter 4: DOI Risk Tier */}
            <ModuleFilterItem label="DOI RISK TIER">
              <Select
                value={riskFilter}
                onValueChange={(val) => {
                  setRiskFilter(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs font-sans bg-white border-slate-300">
                  <SelectValue placeholder="DOI Risk Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Risk Tiers</SelectItem>
                  <SelectItem value="HIGH">Stock-Out Risk (High ≤3d)</SelectItem>
                  <SelectItem value="MEDIUM">Reorder Buffer (Med 3-7d)</SelectItem>
                  <SelectItem value="LOW">Optimal Coverage (Low &gt;7d)</SelectItem>
                </SelectContent>
              </Select>
            </ModuleFilterItem>
          </div>
        </ModuleFilterBar>

        {/* 2. Middle Section: Dynamic KPI Summary Cards */}
        <InventorySummaryCards
          items={filteredItems}
          isLoading={isLoading && !fallbackItems}
        />

        {/* 3. Bottom Section: Table Data (Desktop >= 640px) */}
        <div className="hidden sm:block">
          <InventoryTable
            data={paginatedItems}
            loading={isLoading && !fallbackItems}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageChange={setPage}
            onAdjustStock={(item: any) => setAdjustItem(item)}
          />
        </div>

        {/* Mobile Card Stack (< 640px) */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {paginatedItems.map((item: any) => (
            <InventoryCardMobile
              key={item.id}
              item={item}
              onAdjustStock={(row: any) => setAdjustItem(row)}
            />
          ))}

          {/* Mobile pagination matching Left arrow -> input -> Right arrow */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-card p-3 rounded-lg text-xs text-muted-foreground">
              <span>{filteredItems.length} total records</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-mono text-xs">
                  {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Stock Adjustment with Reason Code Modal */}
      {adjustItem && (
        <AdjustStockModal
          isOpen={Boolean(adjustItem)}
          onClose={() => setAdjustItem(null)}
          inventory={adjustItem}
          onSuccess={() => {
            if (statusFilter !== "ALL" || riskFilter !== "ALL") {
              setStatusFilter("ALL");
              setRiskFilter("ALL");
            }
            refetch();
          }}
        />
      )}

      {/* Testing Utility 1: Simulate 0-Stockout Modal (Region & Store DropSearch) */}
      <SimulateStockoutModal
        open={isStockoutModalOpen}
        onOpenChange={setIsStockoutModalOpen}
        onSuccess={() => refetch()}
      />

      {/* Testing Utility 2: Purge All Recommendations Confirmation Modal */}
      <PurgeRecommendationsModal
        open={isPurgeModalOpen}
        onOpenChange={setIsPurgeModalOpen}
        onSuccess={() => refetch()}
      />
    </PageLayout>
  );
};

export const InventoryPage = InventoryOverviewView;
export default InventoryOverviewView;
