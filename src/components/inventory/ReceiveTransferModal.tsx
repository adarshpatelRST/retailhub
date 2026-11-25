import * as React from "react";
import {
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Minus,
  Plus,
  ScanLine,
} from "lucide-react";
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
  type ReceiveTransferDto,
  type TransferLineItem,
  type TransferShipmentRecord,
} from "@/api/inventory.api";
import { useReceiveTransferMutation } from "@/hooks/useTransfers";

export const SHORTFALL_DAMAGE_REASONS = [
  "Damaged in Transit / Leaking",
  "Missing / Short Shipped from Source",
  "Expired / Unusable",
] as const;

export interface ReceiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: TransferShipmentRecord | null;
  readOnly?: boolean;
  onConfirmOverride?: (
    transferId: string,
    dto: ReceiveTransferDto,
  ) => Promise<void> | void;
}

export function computeInwardReceiptSummary(
  lines: TransferLineItem[],
  scannedQuantities: Record<string, number>,
) {
  let totalReceived = 0;
  let totalShortfall = 0;

  for (const line of lines) {
    const requested = Number(line.requestedQty) || 0;
    const scanned = Math.max(
      0,
      Number(scannedQuantities[line.productId] ?? requested),
    );
    const shortfall = Math.max(0, requested - scanned);
    totalReceived += scanned;
    totalShortfall += shortfall;
  }

  return {
    totalReceived: Number(totalReceived.toFixed(3)),
    totalShortfall: Number(totalShortfall.toFixed(3)),
  };
}

export const ReceiveTransferModal: React.FC<ReceiveTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  readOnly = false,
  onConfirmOverride,
}) => {
  const [scannedQuantities, setScannedQuantities] = React.useState<
    Record<string, number>
  >({});
  const [shortfallReasons, setShortfallReasons] = React.useState<
    Record<string, string>
  >({});
  const [barcodeInput, setBarcodeInput] = React.useState("");
  const [remarks, setRemarks] = React.useState("");

  const receiveMutation = useReceiveTransferMutation();

  React.useEffect(() => {
    if (transfer && isOpen) {
      const initialCounts: Record<string, number> = {};
      const initialReasons: Record<string, string> = {};
      for (const line of transfer.lines) {
        initialCounts[line.productId] = Number(line.requestedQty);
        initialReasons[line.productId] = SHORTFALL_DAMAGE_REASONS[0];
      }
      setScannedQuantities(initialCounts);
      setShortfallReasons(initialReasons);
      setBarcodeInput("");
      setRemarks("");
    }
  }, [transfer, isOpen]);

  if (!transfer) return null;

  const handleBarcodeScan = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    const matchedLine = transfer.lines.find(
      (line) =>
        line.productCode.toLowerCase() === trimmed.toLowerCase() ||
        line.sku.toLowerCase() === trimmed.toLowerCase(),
    );

    if (!matchedLine) {
      toast.error(`Barcode / SKU "${trimmed}" is not part of this consignment.`);
      return;
    }

    setScannedQuantities((prev) => {
      const current = Number(prev[matchedLine.productId] ?? 0);
      const next = Number((current + 1).toFixed(3));
      return {
        ...prev,
        [matchedLine.productId]: next,
      };
    });

    setBarcodeInput("");
    toast.success(`Scanned +1.000 for ${matchedLine.productName}`);
  };

  const updateLineQuantity = (productId: string, nextValue: number) => {
    const sanitized = Math.max(0, Number.isFinite(nextValue) ? nextValue : 0);
    setScannedQuantities((prev) => ({
      ...prev,
      [productId]: Number(sanitized.toFixed(3)),
    }));
  };

  const summary = computeInwardReceiptSummary(
    transfer.lines,
    scannedQuantities,
  );

  const hasMissingShortfallReason = transfer.lines.some((line) => {
    const scanned = Number(scannedQuantities[line.productId] ?? 0);
    if (scanned < line.requestedQty) {
      return !shortfallReasons[line.productId];
    }
    return false;
  });

  const handleConfirmReceipt = async () => {
    if (hasMissingShortfallReason) {
      toast.error(
        "Please select a mandatory damage / shortfall reason for all short-received lines.",
      );
      return;
    }

    const dto: ReceiveTransferDto = {
      lines: transfer.lines.map((line) => {
        const receivedQty = Number(
          (scannedQuantities[line.productId] ?? line.requestedQty).toFixed(3),
        );
        const hasShortfall = receivedQty < line.requestedQty;
        return {
          productId: line.productId,
          receivedQty,
          shortfallReason: hasShortfall
            ? shortfallReasons[line.productId]
            : undefined,
        };
      }),
      remarks: remarks.trim() || undefined,
    };

    try {
      if (onConfirmOverride) {
        await onConfirmOverride(transfer.id, dto);
      } else {
        await receiveMutation.mutateAsync({ id: transfer.id, dto });
      }
      toast.success(
        `Inward Receipt Confirmed for ${transfer.transferNumber}. ${summary.totalReceived.toFixed(3)} units added to available stock.`,
      );
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to complete inward transfer receipt.";
      toast.error(msg);
    }
  };

  const isCompleted =
    transfer.status === "COMPLETED" || (transfer.status as string) === "RECEIVED";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-full sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-base sm:text-lg font-semibold">
              {isCompleted
                ? `Goods Receipt Note (GRN Archive) — ${transfer.transferNumber}`
                : readOnly
                  ? `Consignment Manifest — ${transfer.transferNumber}`
                  : `Inward Receiving Scan — ${transfer.transferNumber}`}
            </DialogTitle>
            <span className="rounded bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700">
              {transfer.sourceStoreCode} → {transfer.destinationStoreCode}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {isCompleted
              ? "Finalized dock inward receiving audit trail with accepted stock and transit scrap/damage write-offs."
              : readOnly
                ? "Inspect consignment line items and dispatched quantities. Physical dock confirmation is restricted to the destination Store Manager."
                : "Scan item barcodes or adjust physical counts. Any shortfall below dispatched quantity is automatically routed to Damaged Write-Off."}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Barcode Scanner Bar (Active receiving only) */}
          {!readOnly && !isCompleted && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <Label
                htmlFor="inward-barcode-input"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <ScanLine className="h-3.5 w-3.5 text-primary" />
                Scan Barcode or Enter SKU (Press Enter to Increment +1.000)
              </Label>
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inward-barcode-input"
                    autoFocus
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBarcodeScan(barcodeInput);
                      }
                    }}
                    placeholder="Scan EAN-13 barcode (e.g., 8901058851243) or SKU..."
                    className="pl-9 font-mono text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleBarcodeScan(barcodeInput)}
                >
                  Scan +1
                </Button>
              </div>
            </div>
          )}

          {/* Consignment Line Items */}
          <div className="space-y-3">
            {transfer.lines.map((line) => {
              const dispatchedQty = Number(
                line.shippedQty || line.requestedQty || 0,
              );
              const scannedQty = Number(
                scannedQuantities[line.productId] ?? dispatchedQty,
              );
              const shortfall = Math.max(
                0,
                Number((dispatchedQty - scannedQty).toFixed(3)),
              );
              const hasShortfall = shortfall > 0;

              const completedReceivedQty = Number(
                line.receivedQty ?? dispatchedQty,
              );
              const completedShortfallQty = Number(
                line.shortfallQty ??
                  Math.max(0, dispatchedQty - completedReceivedQty),
              );

              return (
                <div
                  key={line.id}
                  className="rounded-lg border bg-card p-3.5 space-y-3 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                          {line.sku}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          EAN: {line.productCode}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-foreground">
                        {line.productName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        Dispatched Expected Qty:{" "}
                        <strong className="text-foreground">
                          {line.requestedQty.toFixed(3)} {line.unitOfMeasure}
                        </strong>
                      </p>
                    </div>

                    {/* Stepper Controls or Completed Status */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {isCompleted ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Accepted: {completedReceivedQty.toFixed(3)} {line.unitOfMeasure}
                          </span>
                          {completedShortfallQty > 0 ? (
                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              Scrapped: {completedShortfallQty.toFixed(3)} {line.unitOfMeasure}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-emerald-600 font-medium">
                              100% Inwarded in Full
                            </span>
                          )}
                        </div>
                      ) : readOnly ? (
                        <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded bg-muted text-foreground">
                          {Number(line.requestedQty).toFixed(3)} units
                        </span>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Decrement ${line.sku}`}
                            onClick={() =>
                              updateLineQuantity(line.productId, scannedQty - 1)
                            }
                            className="h-9 w-9 p-0 font-mono"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>

                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            aria-label={`Received quantity for ${line.sku}`}
                            value={scannedQty}
                            onChange={(e) =>
                              updateLineQuantity(
                                line.productId,
                                parseFloat(e.target.value),
                              )
                            }
                            className="h-9 w-28 text-center font-mono text-xs font-semibold tabular-nums"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`Increment ${line.sku}`}
                            onClick={() =>
                              updateLineQuantity(line.productId, scannedQty + 1)
                            }
                            className="h-9 w-9 p-0 font-mono"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Shortfall & Damage Panel (Active receiving only) */}
                  {!readOnly && !isCompleted && hasShortfall && (
                    <div className="rounded-md border border-amber-300 bg-amber-50/90 p-3 space-y-2.5 text-amber-900">
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          Damaged / Scrapped Units Panel
                        </span>
                        <span className="font-mono text-amber-800">
                          Shortfall: {shortfall.toFixed(3)} units
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <Label className="text-xs text-amber-900">
                          Mandatory Discrepancy Reason:
                        </Label>
                        <Select
                          value={
                            shortfallReasons[line.productId] ||
                            SHORTFALL_DAMAGE_REASONS[0]
                          }
                          onValueChange={(val) =>
                            setShortfallReasons((prev) => ({
                              ...prev,
                              [line.productId]: val,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 bg-white text-xs text-foreground">
                            <SelectValue placeholder="Select reason..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SHORTFALL_DAMAGE_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Completed Discrepancy & Scrap Reason Banner */}
                  {isCompleted && completedShortfallQty > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-semibold text-amber-900">
                          Transit Shortfall / Scrapped Write-Off Reason:
                        </div>
                        <div className="font-medium">
                          {line.shortfallReason || "Damaged during transit / short-shipped from source"}
                        </div>
                        <div className="text-[11px] text-amber-800 font-mono">
                          {completedShortfallQty.toFixed(3)} units automatically written off as DAMAGED_WRITE_OFF in store ledger.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Panel */}
          {isCompleted ? (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase tracking-wider font-semibold">
                    Total Dispatched
                  </span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {transfer.lines
                      .reduce((acc, l) => acc + Number(l.shippedQty || l.requestedQty || 0), 0)
                      .toFixed(3)}{" "}
                    units
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 block text-[11px] uppercase tracking-wider font-semibold">
                    Good Stock Accepted
                  </span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    +{transfer.lines
                      .reduce((acc, l) => acc + Number(l.receivedQty ?? (l.shippedQty || l.requestedQty || 0)), 0)
                      .toFixed(3)}{" "}
                    units
                  </span>
                </div>
                <div>
                  <span className="text-red-700 block text-[11px] uppercase tracking-wider font-semibold">
                    Scrapped / Damaged
                  </span>
                  <span className="font-mono font-bold text-red-800 text-sm">
                    -{transfer.lines
                      .reduce(
                        (acc, l) =>
                          acc +
                          Number(
                            l.shortfallQty ??
                              Math.max(
                                0,
                                Number(l.shippedQty || l.requestedQty || 0) -
                                  Number(l.receivedQty ?? (l.shippedQty || l.requestedQty || 0)),
                              ),
                          ),
                        0,
                      )
                      .toFixed(3)}{" "}
                    units
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground font-mono">
                <span>
                  Finalized On:{" "}
                  {transfer.completedDate
                    ? new Date(transfer.completedDate).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Completed"}
                </span>
                <span>
                  Received By:{" "}
                  <strong className="text-foreground">
                    {transfer.receivedByName || "Store Receiving Manager"}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                {readOnly ? (
                  <p className="text-xs font-semibold font-mono text-foreground">
                    Total Dispatched Consignment Units: {summary.totalReceived.toFixed(3)}
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold font-mono text-emerald-700">
                      Units to Available Stock: {summary.totalReceived.toFixed(3)}
                    </p>
                    <p className="text-xs font-semibold font-mono text-red-600">
                      Units to Damaged Write-Off: {summary.totalShortfall.toFixed(3)}
                    </p>
                  </>
                )}
              </div>

              {!readOnly && (
                <div className="w-full sm:w-64">
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional GRN / Dock remarks..."
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-6 py-3 flex flex-row items-center justify-end gap-2">
          {readOnly || isCompleted ? (
            <Button type="button" variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <StandardButton
                type="button"
                variant="default"
                size="sm"
                loading={receiveMutation.isPending}
                onClick={handleConfirmReceipt}
                icon={<CheckCircle2 className="h-4 w-4" />}
              >
                Confirm Inward Receipt
              </StandardButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
