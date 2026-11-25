import * as React from "react";
import { ArrowRightLeft, Filter, RotateCcw, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "./api/inventory.api";
import { useInventory } from "./hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { useDataScope } from "@/context/DataScopeContext";
import { InventorySummaryCards } from "./components/InventorySummaryCards";
import { InventoryTable } from "./components/InventoryTable";
import { InventoryCardMobile } from "./components/InventoryCardMobile";
import { MovementLedgerModal } from "./components/MovementLedgerModal";
import { AdjustStockModal } from "./components/AdjustStockModal";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
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
  initialStoreId = null,
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
        return user?.assignedStoreIds?.[0] || availableStores[0]?.id || "store-bpl-001";
      }
      return initialStoreId ?? contextStoreId ?? (availableStores[0]?.id || "ALL");
    },
  );

  React.useEffect(() => {
    if (isStoreManager) {
      const storeId = user?.assignedStoreIds?.[0] || availableStores[0]?.id;
      if (storeId && selectedStoreId !== storeId) {
        setSelectedStoreId(storeId);
      }
    } else if (contextStoreId && (!selectedStoreId || selectedStoreId === "store-mum-01")) {
      setSelectedStoreId(contextStoreId);
    }
  }, [isStoreManager, user, availableStores, contextStoreId]);

  const effectiveStoreId = isStoreManager
    ? (user?.assignedStoreIds?.[0] || availableStores[0]?.id || selectedStoreId)
    : selectedStoreId;

  const [statusFilter, setStatusFilter] = React.useState<
    InventoryStockStatus | "ALL"
  >("ALL");
  const [riskFilter, setRiskFilter] = React.useState<DoiRiskTier | "ALL">(
    "ALL",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const [sortBy, setSortBy] = React.useState<string>("daysOfInventory");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  const [ledgerItem, setLedgerItem] = React.useState<InventoryRecord | null>(
    null,
  );
  const [adjustItem, setAdjustItem] = React.useState<InventoryRecord | null>(
    null,
  );

  const { data, isLoading, error, refetch } = useInventory({
    storeId: effectiveStoreId && effectiveStoreId !== "ALL" ? effectiveStoreId : undefined,
    status: statusFilter,
    risk: riskFilter,
    search: searchQuery,
    page: 1,
    limit: 400,
    sortBy,
    sortOrder,
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

  const filteredItems = React.useMemo(() => {
    const raw = fallbackItems ?? data?.items ?? [];
    return raw.filter((item) => {
      if (effectiveStoreId && effectiveStoreId !== "ALL" && item.storeId !== effectiveStoreId) {
        return false;
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (riskFilter !== "ALL" && item.riskTier !== riskFilter) return false;
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
        <div className="flex items-center gap-2">
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
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs gap-1.5"
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </Button>
          }
        >
          <ModuleFilterGrid columns={isStoreManager ? 3 : 4}>
            {/* Filter 1: Store Scope DropSearch (Hidden for STORE_MANAGER per RBAC) */}
            {!isStoreManager && (
              <ModuleFilterItem label="Store Scope">
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

            {/* Filter 2: Search SKU / Barcode / Name */}
            <ModuleFilterItem label="Search SKU / Barcode / Name">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Scan barcode (8+ digits) or search SKU / name..."
                  className="pl-9 h-9 text-xs font-mono bg-white"
                />
              </div>
            </ModuleFilterItem>

            {/* Filter 3: Stock Health Tier */}
            <ModuleFilterItem label="Stock Health Status">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
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
            <ModuleFilterItem label="DOI Risk Tier">
              <Select
                value={riskFilter}
                onValueChange={(val) => {
                  setRiskFilter(val as any);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
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
          </ModuleFilterGrid>
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
            sortKey={sortBy}
            sortDirection={sortOrder}
            onSortChange={(key: any, dir: any) => {
              setSortBy(key);
              setSortOrder(dir);
            }}
            onViewLedger={(item) => setLedgerItem(item)}
            onAdjustStock={(item) => setAdjustItem(item)}
          />
        </div>

        {/* Mobile Card Stack (< 640px) */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {paginatedItems.map((item) => (
            <InventoryCardMobile
              key={item.id}
              item={item}
              onViewLedger={(row) => setLedgerItem(row)}
              onAdjustStock={(row) => setAdjustItem(row)}
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

      {/* Double-Entry Movement History Ledger Modal */}
      {ledgerItem && (
        <MovementLedgerModal
          isOpen={Boolean(ledgerItem)}
          onClose={() => setLedgerItem(null)}
          storeId={ledgerItem.storeId}
          productId={ledgerItem.productId}
          productName={ledgerItem.productName}
          sku={ledgerItem.sku}
        />
      )}

      {/* Manual Stock Adjustment with Reason Code Modal */}
      {adjustItem && (
        <AdjustStockModal
          isOpen={Boolean(adjustItem)}
          onClose={() => setAdjustItem(null)}
          inventory={adjustItem}
        />
      )}
    </PageLayout>
  );
};

export default InventoryOverviewView;
