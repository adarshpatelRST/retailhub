import * as React from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  ArrowUpRight,
  Eye,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import {
  type StoreDirectoryItem,
  type StoreFormat,
} from "../api/store.api";
import { groupStoresByRegion } from "../hooks/useStores";

export interface StoreCardGridProps {
  stores: StoreDirectoryItem[];
  assignedStoreId?: string | null;
  readOnlyPeerView?: boolean;
  onInspectStore: (store: StoreDirectoryItem) => void;
}

const FORMAT_BADGE_MAP: Record<
  StoreFormat,
  { status: string; label: string }
> = {
  HYPERMARKET: { status: "EXCESS", label: "HYPERMARKET" },
  SUPERMARKET: { status: "APPROVED_IN_TRANSIT", label: "SUPERMARKET" },
  EXPRESS: { status: "HEALTHY", label: "EXPRESS" },
};

export const StoreCardGrid: React.FC<StoreCardGridProps> = ({
  stores,
  assignedStoreId,
  readOnlyPeerView = false,
  onInspectStore,
}) => {
  const regionalGroups = React.useMemo(
    () => groupStoresByRegion(stores),
    [stores],
  );

  if (stores.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No operational stores match the current filter criteria.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {regionalGroups.map((group) => (
        <section key={group.regionId} className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-foreground">
                {group.regionName}
              </h3>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {group.stores.length}{" "}
              {group.stores.length === 1 ? "Store" : "Stores"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.stores.map((store) => {
              const isAssigned = Boolean(
                assignedStoreId && store.id === assignedStoreId,
              );
              const formatBadge =
                FORMAT_BADGE_MAP[store.storeFormat] ??
                FORMAT_BADGE_MAP.SUPERMARKET;

              return (
                <Card
                  key={store.id}
                  className={cn(
                    "transition-all hover:shadow-md",
                    isAssigned
                      ? "border-2 border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border",
                  )}
                >
                  <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {store.storeCode}
                        </span>
                        <StatusBadge
                          status={formatBadge.status}
                          label={formatBadge.label}
                        />
                      </div>

                      <div>
                        <h4 className="font-semibold text-sm text-foreground line-clamp-1">
                          {store.name}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{store.city}</span>
                        </div>
                      </div>

                      {isAssigned && (
                        <div className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Assigned Home Store</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onInspectStore(store)}
                        className="text-xs px-2"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Profile
                      </Button>

                      {(!readOnlyPeerView || isAssigned) ? (
                        <Link
                          to={`/inventory?storeId=${encodeURIComponent(store.id)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <span>View Local Inventory</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          Peer Store (Read-Only)
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
