import * as React from "react";
import {
  Building2,
  Calendar,
  Compass,
  MapPin,
  Phone,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { type StoreDirectoryItem } from "@/api/store.api";

export interface StoreDetailModalProps {
  store: StoreDirectoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  open,
  onOpenChange,
}) => {
  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full h-dvh sm:h-auto sm:max-w-lg overflow-y-auto pb-20 sm:pb-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
              {store.storeCode}
            </span>
            <StatusBadge
              status={store.isActive ? "HEALTHY" : "REJECTED"}
              label={store.storeFormat}
            />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight mt-1">
            {store.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {store.region?.name ?? "Regional Zone"} · {store.city}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm">
          <div className="flex items-start gap-2.5 rounded-md border p-3">
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-muted-foreground">
                Street Address &amp; City
              </div>
              <div className="font-medium text-foreground">
                {store.address}, {store.city}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Store Format
                </div>
                <div className="font-mono font-semibold">
                  {store.storeFormat}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Opening Date
                </div>
                <div className="font-mono font-semibold">
                  {store.openingDate
                    ? formatDateTime(store.openingDate)
                    : "Active Operations"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Store Manager
                </div>
                <div className="font-medium">
                  {store.managerName ?? "Assigned Operations Lead"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">
                  Dispatch Desk Contact
                </div>
                <div className="font-mono text-xs">
                  {store.contactPhone ?? "+91-755-2401001"}
                </div>
              </div>
            </div>
          </div>

          {(store.latitude != null || store.longitude != null) && (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3.5 py-2.5 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Compass className="h-4 w-4 text-primary" />
                <span>Haversine Routing Coordinates</span>
              </span>
              <span className="font-semibold text-foreground">
                {store.latitude?.toFixed(4)}, {store.longitude?.toFixed(4)}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background flex justify-end gap-2 sm:static sm:border-t-0 sm:p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
