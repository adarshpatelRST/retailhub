import * as React from "react";
import { ShieldAlert, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type AdjustStockDto,
  type InventoryRecord,
} from "@/api/inventory.api";
import { useAdjustStockMutation } from "@/hooks/useInventory";

export type AdjustmentMode = "ADD" | "REDUCE";

export const CYCLE_COUNT_REASONS = [
  "Physical Count Audit",
  "Damaged Goods",
  "Cashier Scan Variance",
  "Other",
] as const;

export interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem?: InventoryRecord | null;
  inventory?: InventoryRecord | null;
  onReloadBalance?: (item: InventoryRecord) => void;
  onSubmitOverride?: (dto: AdjustStockDto) => Promise<void> | void;
  onSuccess?: (newBalance: number, newTier: string) => void;
}

export function calculateProjectedStock(
  currentStock: number,
  mode: AdjustmentMode,
  rawMagnitude: number,
) {
  const safeCurrent = Number.isFinite(Number(currentStock))
    ? Number(currentStock)
    : 0;
  const safeMag = Math.max(
    0,
    Number.isFinite(Number(rawMagnitude)) ? Number(rawMagnitude) : 0,
  );
  const signedDelta = mode === "ADD" ? safeMag : -safeMag;
  const projectedStock = Number((safeCurrent + signedDelta).toFixed(3));
  return {
    signedDelta: Number(signedDelta.toFixed(3)),
    projectedStock,
  };
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  inventoryItem: rawItem,
  inventory,
  onReloadBalance,
  onSubmitOverride,
  onSuccess,
}) => {
  const inventoryItem = rawItem ?? inventory ?? null;
  const [mode, setMode] = React.useState<AdjustmentMode>("ADD");
  const [quantityDeltaInput, setQuantityDeltaInput] =
    React.useState<string>("1.000");
  const [reason, setReason] = React.useState<string>(CYCLE_COUNT_REASONS[0]);
  const [notes, setNotes] = React.useState<string>("");

  const adjustMutation = useAdjustStockMutation();

  React.useEffect(() => {
    if (isOpen && inventoryItem) {
      setMode("ADD");
      setQuantityDeltaInput("1.000");
      setReason(CYCLE_COUNT_REASONS[0]);
      setNotes("");
    }
  }, [isOpen, inventoryItem]);

  if (!inventoryItem) return null;

  const parsedMagnitude = parseFloat(quantityDeltaInput);
  const { signedDelta, projectedStock } = calculateProjectedStock(
    inventoryItem.availableQuantity,
    mode,
    parsedMagnitude,
  );

  const isInvalid =
    !Number.isFinite(parsedMagnitude) ||
    parsedMagnitude <= 0 ||
    projectedStock < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) {
      toast.error(
        "Please enter a valid positive quantity delta that does not result in negative shelf stock.",
      );
      return;
    }

    const dto: AdjustStockDto = {
      storeId: inventoryItem.storeId,
      productId: inventoryItem.productId,
      quantityDelta: signedDelta,
      remarks: notes.trim() ? `${reason} — ${notes.trim()}` : reason,
      expectedVersion: inventoryItem.version,
    };

    try {
      if (onSubmitOverride) {
        await onSubmitOverride(dto);
      } else {
        await adjustMutation.mutateAsync(dto);
      }
      const ads = Number(inventoryItem.averageDailySales) || 1.0;
      const projDoi = ads > 0 ? projectedStock / ads : 99;
      let newTier = "HEALTHY";
      if (projDoi <= 3.0 || projectedStock <= 0) newTier = "CRITICAL";
      else if (projectedStock <= Number(inventoryItem.reorderLevel) || projDoi <= 7.0) newTier = "LOW";

      toast.success(
        `Cycle count adjustment posted (${signedDelta > 0 ? `+${signedDelta.toFixed(3)}` : signedDelta.toFixed(3)}). New balance: ${projectedStock.toFixed(3)} (Tier: ${newTier}).`,
      );
      onSuccess?.(projectedStock, newTier);
      onClose();
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      const isConflict =
        status === 409 ||
        (error instanceof Error && error.message.includes("409"));

      if (isConflict) {
        toast.error(
          "Stock was updated by another transaction. Reloading current balance.",
        );
        onReloadBalance?.(inventoryItem);
      } else {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to post stock adjustment.";
        toast.error(msg);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md sm:max-w-lg p-0 overflow-hidden rounded-xl shadow-2xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Cycle Count Manual Adjustment
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {inventoryItem.productName} ({inventoryItem.sku}) ·{" "}
            {inventoryItem.storeCode}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="px-6 py-4 space-y-4 max-h-[85vh] overflow-y-auto"
        >
          {/* Current Recorded Stock & Optimistic Lock Version */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
            <div>
              <span className="text-muted-foreground block">
                Current Recorded Stock
              </span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">
                {inventoryItem.availableQuantity.toFixed(3)}{" "}
                {inventoryItem.unitOfMeasure}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">
                Optimistic Lock Version
              </span>
              <span className="font-mono text-sm font-bold text-foreground">
                expectedVersion = {inventoryItem.version}
              </span>
            </div>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Adjustment Type <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as AdjustmentMode)}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD">Add Stock (+ delta)</SelectItem>
                <SelectItem value="REDUCE">
                  Reduce Stock / Write-off (- delta)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Delta */}
          <div className="space-y-1.5">
            <Label htmlFor="adjust-qty-delta" className="text-xs font-semibold">
              Quantity Delta ({inventoryItem.unitOfMeasure}) <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <Input
              id="adjust-qty-delta"
              type="number"
              step="0.001"
              min="0.001"
              value={quantityDeltaInput}
              onChange={(e) => setQuantityDeltaInput(e.target.value)}
              className="font-mono text-xs tabular-nums"
              required
            />
          </div>

          {/* Live Projected New Stock */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground block">
                Projected New Stock
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {inventoryItem.availableQuantity.toFixed(3)}{" "}
                {signedDelta >= 0
                  ? `+ ${signedDelta.toFixed(3)}`
                  : `- ${Math.abs(signedDelta).toFixed(3)}`}
              </span>
            </div>
            <span
              className={`font-mono text-base font-bold tabular-nums ${
                projectedStock < 0 ? "text-red-600" : "text-primary"
              }`}
            >
              {projectedStock.toFixed(3)} {inventoryItem.unitOfMeasure}
            </span>
          </div>

          {/* Reason Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Reason <span className="text-red-500 font-bold ml-0.5">*</span>
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CYCLE_COUNT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Remarks */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="adjust-remarks" className="text-xs font-semibold">
                Audit Notes (Optional)
              </Label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {notes.length}/200
              </span>
            </div>
            <textarea
              id="adjust-remarks"
              rows={3}
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="Shelf bay / bin location or supervisor sign-off..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary max-h-[80px] resize-none overflow-y-auto font-sans leading-relaxed"
            />
          </div>

          {projectedStock < 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 p-2.5 text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Projected shelf balance cannot drop below 0.000 units.
              </span>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex flex-row items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <StandardButton
              type="submit"
              variant="default"
              size="sm"
              disabled={isInvalid}
              loading={adjustMutation.isPending}
            >
              Post Cycle Count Adjustment
            </StandardButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
