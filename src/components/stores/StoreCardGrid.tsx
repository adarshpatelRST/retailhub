import * as React from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  ArrowUpRight,
  Eye,
  ShieldCheck,
  Edit,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import {
  type StoreDirectoryItem,
  type StoreFormat,
} from "@/api/store.api";
import { groupStoresByRegion } from "@/hooks/useStores";

export interface StoreCardGridProps {
  stores: StoreDirectoryItem[];
  assignedStoreId?: string | null;
  readOnlyPeerView?: boolean;
  isAdmin?: boolean;
  onInspectStore: (store: StoreDirectoryItem) => void;
  onEditStore?: (store: StoreDirectoryItem) => void;
}

const FORMAT_BADGE_MAP: Record<
  StoreFormat,
  { status: string; label: string }
> = {
  HYPERMARKET: { status: "HEALTHY", label: "Hypermarket" },
  SUPERMARKET: { status: "APPROVED_IN_TRANSIT", label: "Supermarket" },
  EXPRESS: { status: "LOW", label: "Express" },
};

export const StoreCardGrid: React.FC<StoreCardGridProps> = ({
  stores,
  assignedStoreId,
  readOnlyPeerView = false,
  isAdmin = false,
  onInspectStore,
  onEditStore,
}) => {
  const regionalGroups = React.useMemo(
    () => groupStoresByRegion(stores),
    [stores],
  );

  if (stores.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground font-mono">
        No operational stores match the current filter criteria.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {regionalGroups.map((group: any) => (
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
            {group.stores.map((store: any) => {
              const isAssigned = Boolean(
                assignedStoreId && store.id === assignedStoreId,
              );
              const formatBadge =
                FORMAT_BADGE_MAP[store.storeFormat as StoreFormat] ??
                FORMAT_BADGE_MAP.SUPERMARKET;

              return (
                <Card
                  key={store.id}
                  className={cn(
                    "flex flex-col justify-between transition-all duration-200 hover:shadow-md",
                    store.isActive === false && "opacity-80 bg-slate-50 border-dashed border-slate-300",
                    isAssigned
                      ? "border-2 border-primary ring-1 ring-primary/20 shadow-xs"
                      : "border-border",
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-primary">
                            {store.storeCode}
                          </span>
                          {isAssigned && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              <ShieldCheck className="h-3 w-3" />
                              Assigned
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground text-sm break-words leading-snug mt-1">
                          {store.name}
                        </h4>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge
                          status={formatBadge.status}
                          label={formatBadge.label}
                        />
                        {store.isActive === false && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 tracking-wider">
                            INACTIVE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          {store.city}
                          {store.state ? `, ${store.state}` : ""}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground/80 pl-5">
                        {store.address || "Address not registered."}
                      </p>
                    </div>

                    {store.managerName && (
                      <div className="rounded bg-muted/40 p-2 text-[11px] font-mono text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Manager:
                        </span>{" "}
                        {store.managerName}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => onInspectStore(store)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Details
                      </Button>

                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="flex-1 text-xs h-8 gap-1.5"
                          onClick={() => onEditStore?.(store)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit Store</span>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant="default"
                          size="sm"
                          className="flex-1 text-xs h-8 gap-1.5"
                        >
                          <Link to={`/dashboard/store?storeId=${store.id}`}>
                            <span>Dashboard</span>
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
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

export default StoreCardGrid;
