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
} from "../api/inventory.api";
import { useAdjustStockMutation } from "../hooks/useInventory";

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
  inventoryItem: InventoryRecord | null;
  onReloadBalance?: (item: InventoryRecord) => void;
  onSubmitOverride?: (dto: AdjustStockDto) => Promise<void> | void;
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
  inventoryItem,
  onReloadBalance,
  onSubmitOverride,
}) => {
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
      toast.success(
        `Cycle count adjustment posted (${signedDelta > 0 ? `+${signedDelta.toFixed(3)}` : signedDelta.toFixed(3)}). New balance: ${projectedStock.toFixed(3)}.`,
      );
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
      <DialogContent className="w-full max-w-full sm:max-w-lg max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Cycle Count Manual Adjustment
            </DialogTitle>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
              v{inventoryItem.version}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {inventoryItem.productName} ({inventoryItem.sku}) ·{" "}
            {inventoryItem.storeCode}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
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
            <Label className="text-xs font-semibold">Adjustment Type</Label>
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
              Quantity Delta ({inventoryItem.unitOfMeasure})
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
            <Label className="text-xs font-semibold">Reason</Label>
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
            <Label htmlFor="adjust-remarks" className="text-xs font-semibold">
              Audit Notes (Optional)
            </Label>
            <Input
              id="adjust-remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shelf bay / bin location or supervisor sign-off..."
              className="text-xs"
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
