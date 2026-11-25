import * as React from "react";
import { Building2, Plus, Search, ShieldAlert } from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { type StoreDirectoryItem } from "./api/store.api";
import {
  useStores,
  useStoreNetworkDirectory,
  useRegions,
} from "./hooks/useStores";
import { StoreCardGrid } from "./components/StoreCardGrid";
import { StoreDetailModal } from "./components/StoreDetailModal";
import { CreateStoreModal } from "./components/CreateStoreModal";

export const StoreDirectoryView: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(["ADMIN"]);
  const isStoreManager = user?.role === "STORE_MANAGER";
  const assignedStoreId = user?.assignedStoreIds?.[0] ?? null;

  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [createStoreOpen, setCreateStoreOpen] = React.useState(false);
  const [inspectedStore, setInspectedStore] =
    React.useState<StoreDirectoryItem | null>(null);

  const { stores: scopedStores } = useStores({
    regionId: selectedRegionId === "ALL" ? undefined : selectedRegionId,
    search: searchQuery.trim() || undefined,
  });

  const { data: peerDirectoryStores = [] } =
    useStoreNetworkDirectory(isStoreManager);

  const { data: regions = [] } = useRegions();

  const displayedStores = React.useMemo(() => {
    const source =
      isStoreManager && peerDirectoryStores.length > 0
        ? peerDirectoryStores
        : scopedStores;

    return source.filter((store) => {
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
            onClick={() => setCreateStoreOpen(true)}
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
                store is highlighted with a primary border. Peer regional stores
                are displayed in read-only directory mode for inter-store
                transfer coordination.
              </span>
            </div>
          </div>
        )}

        {/* Region Filter Tabs + Search Input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border bg-card p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRegionId("ALL")}
              className={`rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                selectedRegionId === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Regions
            </button>
            {regions.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => setSelectedRegionId(region.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors ${
                  selectedRegionId === region.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>{region.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search store code, name, or city..."
              className="pl-9 font-mono text-xs"
            />
          </div>
        </div>

        {/* Regional Store Card Grid */}
        <StoreCardGrid
          stores={displayedStores}
          assignedStoreId={assignedStoreId}
          readOnlyPeerView={isStoreManager}
          onInspectStore={setInspectedStore}
        />
      </div>

      {/* Store Detail & Onboard Modals */}
      <StoreDetailModal
        store={inspectedStore}
        open={Boolean(inspectedStore)}
        onOpenChange={(open) => {
          if (!open) setInspectedStore(null);
        }}
      />

      <CreateStoreModal
        open={createStoreOpen}
        onOpenChange={setCreateStoreOpen}
        regions={regions}
      />
    </PageLayout>
  );
};
