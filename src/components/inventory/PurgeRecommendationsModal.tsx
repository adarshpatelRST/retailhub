import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient, type ApiEnvelope } from "@/api/client";
import { Button } from "@/components/ui/button";
import { StandardButton } from "@/components/ui/StandardButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface PurgeRecommendationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PurgeRecommendationsModal: React.FC<PurgeRecommendationsModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const purgeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete<ApiEnvelope<any>>("/recommendations");
      return res.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["action-center"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "configurations", "scheduler"] });
      toast.success(
        data?.message || "All recommendations and decision actions have been permanently purged.",
      );
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.error?.message || err?.message || "Failed to purge recommendations.",
      );
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Purge All Recommendations (Test Utility)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Permanently clear recommendation records across all stores in the database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Reset to Clean Action Center Slate</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This will delete all open/pending recommendations, decision actions, and evidence logs from the database. Use this test utility whenever you want to reset and test the automated scan from scratch.
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-[11px]">
            Are you sure you want to proceed with clearing all recommendations?
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <StandardButton
            type="button"
            size="sm"
            loading={purgeMutation.isPending}
            loadingText="Purging..."
            onClick={() => purgeMutation.mutate()}
            className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Confirm Purge All Recs
          </StandardButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
