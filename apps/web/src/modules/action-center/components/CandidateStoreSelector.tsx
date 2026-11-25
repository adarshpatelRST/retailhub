import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Minus,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { type CandidateStoreDto } from "../api/action-center.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CandidateStoreSelectorProps {
  candidates: CandidateStoreDto[];
  selectedStoreId: string | null;
  onStoreChange: (storeId: string | null) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onValidationChange: (isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const CandidateStoreSelector: React.FC<CandidateStoreSelectorProps> = ({
  candidates,
  selectedStoreId,
  onStoreChange,
  quantity,
  onQuantityChange,
  onValidationChange,
  disabled = false,
  className,
}) => {
  const selectedCandidate = React.useMemo(
    () =>
      candidates.find((cand) => cand.storeId === selectedStoreId) ??
      candidates[0] ??
      null,
    [candidates, selectedStoreId],
  );

  const isCentralSupply = selectedStoreId === null || !selectedCandidate;

  const maxSafeTransfer = React.useMemo(() => {
    if (!selectedCandidate) return 9999;
    return Math.max(
      0,
      Math.floor(
        selectedCandidate.availableStock - 7.0 * selectedCandidate.ads,
      ),
    );
  }, [selectedCandidate]);

  const projectedDonorDOI = React.useMemo(() => {
    if (!selectedCandidate) return 999;
    if (selectedCandidate.ads <= 0) return 999;
    return (
      (selectedCandidate.availableStock - quantity) / selectedCandidate.ads
    );
  }, [selectedCandidate, quantity]);

  const isViolatingSafetyFloor =
    !isCentralSupply &&
    selectedCandidate !== null &&
    (projectedDonorDOI <= 7.0 || quantity <= 0);

  React.useEffect(() => {
    if (quantity <= 0) {
      onValidationChange(false);
      return;
    }
    if (isCentralSupply) {
      onValidationChange(true);
      return;
    }
    onValidationChange(projectedDonorDOI > 7.0);
  }, [isCentralSupply, projectedDonorDOI, quantity, onValidationChange]);

  const handleStep = (delta: number) => {
    const next = Math.max(1, Number((quantity + delta).toFixed(3)));
    onQuantityChange(next);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground shadow-xs space-y-4",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Source Donor Store & Transfer Quantity
          </h4>
          <p className="text-xs text-muted-foreground">
            Ranked by composite distance (60%) + excess inventory cover (40%).
            Enforces 7.0-day donor safety floor.
          </p>
        </div>
        {selectedCandidate && !isCentralSupply && (
          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
            Max Safe Transfer:{" "}
            <strong className="ml-1 text-emerald-700">
              {maxSafeTransfer} units
            </strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
        {/* Ranked Candidate Donor Dropdown */}
        <div className="sm:col-span-7 space-y-1.5">
          <Label htmlFor="candidate-donor-select" className="text-xs">
            Select Source Store (Ranked Candidates)
          </Label>
          <select
            id="candidate-donor-select"
            aria-label="Select Source Store"
            disabled={disabled}
            value={selectedStoreId ?? "__CENTRAL_SUPPLY__"}
            onChange={(e) => {
              const val = e.target.value;
              onStoreChange(val === "__CENTRAL_SUPPLY__" ? null : val);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {candidates.map((cand) => (
              <option key={cand.storeId} value={cand.storeId}>
                Rank {cand.rank}: {cand.storeName} ({(Number(cand.distanceKm) || 0).toFixed(0)}{" "}
                km • Avail: {(Number(cand.availableStock) || 0).toFixed(3)}u •{" "}
                {(Number(cand.currentDOI) || 0).toFixed(1)}d DOI)
              </option>
            ))}
            <option value="__CENTRAL_SUPPLY__">
              🏭 Central Supply / Mother Hub (Fallback Replenishment)
            </option>
          </select>
        </div>

        {/* Quantity Stepper [ - ] [ input ] [ + ] */}
        <div className="sm:col-span-5 space-y-1.5">
          <Label htmlFor="transfer-qty-input" className="text-xs">
            Transfer Quantity (Units)
          </Label>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled || quantity <= 1}
              onClick={() => handleStep(-1)}
              aria-label="Decrease transfer quantity"
              className="h-9 w-9 shrink-0"
            >
              <Minus className="h-3.5 w-3.5 size-3.5" />
            </Button>

            <Input
              id="transfer-qty-input"
              type="number"
              step="1"
              min="1"
              disabled={disabled}
              value={Number.isFinite(quantity) ? quantity : 0}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                onQuantityChange(Number.isFinite(parsed) ? parsed : 0);
              }}
              className={cn(
                "h-9 text-center font-mono text-sm font-semibold tabular-nums",
                isViolatingSafetyFloor &&
                  "border-red-500 bg-red-50/50 text-red-900 focus-visible:ring-red-500",
              )}
            />

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              onClick={() => handleStep(1)}
              aria-label="Increase transfer quantity"
              className="h-9 w-9 shrink-0"
            >
              <Plus className="h-3.5 w-3.5 size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Live 7-Day DOI Protection Banner */}
      {isCentralSupply ? (
        <div className="flex items-start gap-2.5 rounded-md border border-purple-300 bg-purple-50/70 p-3 text-xs text-purple-950">
          <Factory className="h-4 w-4 size-4 text-purple-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">
              [🏭 Central Supply / Mother Hub] Active:
            </span>{" "}
            Sourcing {quantity.toFixed(3)} units from Central Distribution Hub.
            Peer store 7-day donor DOI floor does not restrict Mother Hub
            allocations.
          </div>
        </div>
      ) : isViolatingSafetyFloor && selectedCandidate ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900"
        >
          <ShieldAlert className="h-4 w-4 size-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-950">
              Safety Violation: Sourcing {quantity} units drops{" "}
              {selectedCandidate.storeName} to {projectedDonorDOI.toFixed(1)}{" "}
              days DOI (Minimum required is 7.0 days). Maximum safe transfer is{" "}
              {maxSafeTransfer} units.
            </p>
            <p className="text-[11px] text-red-800">
              Violates 7-day safety floor: Donor store DOI would drop to{" "}
              {projectedDonorDOI.toFixed(1)} days. Max safe transfer is{" "}
              {maxSafeTransfer} units.
            </p>
            {maxSafeTransfer > 0 && !disabled && (
              <button
                type="button"
                onClick={() => onQuantityChange(maxSafeTransfer)}
                className="mt-1 inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-900 hover:bg-red-200 transition-colors"
              >
                <AlertTriangle className="h-3 w-3 size-3 shrink-0" />
                <span>Clamp to Max Safe ({maxSafeTransfer} units)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        selectedCandidate && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 size-4 text-emerald-600 shrink-0" />
              <span>
                <strong>7-Day Safety Floor Protected:</strong>{" "}
                {selectedCandidate.storeName} retains{" "}
                <strong className="font-mono">
                  {projectedDonorDOI.toFixed(1)} days DOI
                </strong>{" "}
                after dispatching{" "}
                <strong className="font-mono">{quantity.toFixed(3)}</strong>{" "}
                units (Min required: 7.0d).
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800 shrink-0">
              Score: {(Number(selectedCandidate.compositeScore) || 0).toFixed(1)}
            </span>
          </div>
        )
      )}
    </div>
  );
};
