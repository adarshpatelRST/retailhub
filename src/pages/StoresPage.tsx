import * as React from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import { useAuth } from "@/context/AuthContext";
import { type StoreDirectoryItem } from "@/api/store.api";
import {
  useStores,
  useStoreNetworkDirectory,
  useRegions,
} from "@/hooks/useStores";
import { StoreCardGrid } from "@/components/stores/StoreCardGrid";
import { StoreDetailModal } from "@/components/stores/StoreDetailModal";
import { CreateStoreModal } from "@/components/stores/CreateStoreModal";

const PAGE_SIZE = 8;

export const StoreDirectoryView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");
  const isStoreManager = user?.role === "STORE_MANAGER";
  const assignedStoreId = user?.assignedStoreIds?.[0] ?? null;

  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [createStoreOpen, setCreateStoreOpen] = React.useState(false);
  const [storeToEdit, setStoreToEdit] =
    React.useState<StoreDirectoryItem | null>(null);
  const [inspectedStore, setInspectedStore] =
    React.useState<StoreDirectoryItem | null>(null);

  const { stores: scopedStores } = useStores({
    regionId: selectedRegionId === "ALL" ? undefined : selectedRegionId,
    search: searchQuery.trim() || undefined,
  });

  const { data: peerDirectoryStores = [] } =
    useStoreNetworkDirectory(isStoreManager);

  const { data: regions = [] } = useRegions();

  // Region options for DropSearch
  const regionDropItems = React.useMemo<ComboboxItem[]>(
    () =>
      regions.map((r: any) => ({
        id: r.id,
        label: r.name,
        subLabel: r.regionCode,
      })),
    [regions],
  );

  const handleRegionChange = (newRegionId: string) => {
    setSelectedRegionId(newRegionId);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedRegionId("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setStoreToEdit(null);
    setCreateStoreOpen(true);
  };

  const handleEditStore = (store: StoreDirectoryItem) => {
    setStoreToEdit(store);
    setCreateStoreOpen(true);
  };

  // Filter stores according to active query and region
  const displayedStores = React.useMemo(() => {
    const source =
      isStoreManager && peerDirectoryStores.length > 0
        ? peerDirectoryStores
        : scopedStores;

    return source.filter((store: any) => {
      const matchesRegion =
        selectedRegionId === "ALL" ||
        store.regionId === selectedRegionId ||
        store.region?.id === selectedRegionId;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        store.name.toLowerCase().includes(q) ||
        store.storeCode.toLowerCase().includes(q) ||
        store.city.toLowerCase().includes(q);
      return matchesRegion && matchesSearch;
    });
  }, [
    isStoreManager,
    peerDirectoryStores,
    scopedStores,
    selectedRegionId,
    searchQuery,
  ]);

  // Pagination calculation: active when a specific region is chosen
  const isRegionSelected = selectedRegionId !== "ALL";
  const totalStores = displayedStores.length;
  const totalPages = Math.max(1, Math.ceil(totalStores / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const [pageInput, setPageInput] = React.useState<string>("1");

  React.useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const handlePageCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const max = Math.max(1, totalPages);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(max, parsed));
      setCurrentPage(clamped);
      setPageInput(String(clamped));
    } else {
      setPageInput(String(safePage));
    }
  };

  const paginatedStores = React.useMemo(() => {
    if (!isRegionSelected) {
      return displayedStores;
    }
    const startIndex = (safePage - 1) * PAGE_SIZE;
    return displayedStores.slice(startIndex, startIndex + PAGE_SIZE);
  }, [displayedStores, isRegionSelected, safePage]);

  // Selected region display name for pagination banner
  const selectedRegionName = React.useMemo(() => {
    if (!isRegionSelected) return "";
    const reg = regions.find((r: any) => r.id === selectedRegionId);
    return reg ? reg.name : "Selected Region";
  }, [isRegionSelected, regions, selectedRegionId]);

  return (
    <PageLayout
      title="Operational Store Hierarchy & Regional Network"
      subtitle="Regional zone topology, store format classification (Hypermarket, Supermarket, Express), and peer transfer directory."
      breadcrumbs={[
        { label: "Operations", href: "/operations" },
        { label: "Store Directory" },
      ]}
      actions={
        isAdmin ? (
          <StandardButton
            type="button"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Onboard Store
          </StandardButton>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Role Context Banner for STORE_MANAGER */}
        {isStoreManager && (
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
              <span>
                <strong>Store Manager Scope Active:</strong> Your assigned home
                store is highlighted with an authority border. Peer regional stores
                are displayed in read-only directory mode for inter-store
                transfer coordination.
              </span>
            </div>
          </div>
        )}

        {/* Standard Module Filter Bar with Search & Region DropSearch */}
        <ModuleFilterBar
          title="Operational Store & Network Filters"
          icon={<Filter className="h-4 w-4 text-emerald-700" />}
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          <ModuleFilterGrid columns={2}>
            {/* Filter 1: Search */}
            <ModuleFilterItem label="Search Store / Code / City">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search store code, name, or city..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                />
              </div>
            </ModuleFilterItem>

            {/* Filter 2: Region DropSearch */}
            <ModuleFilterItem label="Operational Region">
              <DropSearch
                items={regionDropItems}
                value={selectedRegionId}
                onChange={(val) => handleRegionChange(val || "ALL")}
                allOption={{ id: "ALL", label: "All Operational Regions" }}
                placeholder="All Operational Regions"
                searchPlaceholder="Search region name or code..."
                width="w-full"
                className="h-10 text-xs font-sans"
              />
            </ModuleFilterItem>
          </ModuleFilterGrid>
        </ModuleFilterBar>

        {/* Regional Store Card Grid */}
        <StoreCardGrid
          stores={paginatedStores}
          assignedStoreId={assignedStoreId}
          readOnlyPeerView={isStoreManager}
          isAdmin={isAdmin}
          onInspectStore={setInspectedStore}
          onEditStore={handleEditStore}
        />

        {/* Pagination Toolbar: Displayed when a region is selected */}
        {isRegionSelected && totalStores > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t">
            <span className="text-xs font-medium text-slate-600">
              Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, totalStores)} of {totalStores} results
            </span>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous Page"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, totalPages)}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => handlePageCommit(pageInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handlePageCommit(pageInput);
                    }
                  }}
                  className="h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-center font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-500 font-medium">
                  of {Math.max(1, totalPages)}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                aria-label="Next Page"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Store Detail Modal */}
      <StoreDetailModal
        store={inspectedStore}
        open={Boolean(inspectedStore)}
        onOpenChange={(open: boolean) => {
          if (!open) setInspectedStore(null);
        }}
      />

      {/* Onboard / Edit Store Modal */}
      <CreateStoreModal
        open={createStoreOpen}
        onOpenChange={(isOpen) => {
          setCreateStoreOpen(isOpen);
          if (!isOpen) setStoreToEdit(null);
        }}
        regions={regions}
        storeToEdit={storeToEdit}
      />
    </PageLayout>
  );
};

export const StoresPage = StoreDirectoryView;
export default StoreDirectoryView;
