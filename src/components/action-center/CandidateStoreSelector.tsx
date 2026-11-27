import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Factory,
  Minus,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { type CandidateStoreDto } from "@/api/action-center.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const selectedCandidate = React.useMemo(() => {
    if (selectedStoreId === "CENTRAL_SUPPLY") return null;
    if (selectedStoreId) {
      return candidates.find((cand) => cand.storeId === selectedStoreId) ?? null;
    }
    return candidates[0] ?? null;
  }, [candidates, selectedStoreId]);

  const isCentralSupply =
    selectedStoreId === "CENTRAL_SUPPLY" ||
    (selectedStoreId === null && candidates.length === 0);

  // Local string state allows user to freely clear the input and re-type
  const [inputValue, setInputValue] = React.useState<string>(
    quantity > 0 ? String(quantity) : "",
  );

  React.useEffect(() => {
    const parsed = parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed !== quantity) {
      setInputValue(quantity > 0 ? String(quantity) : "");
    }
  }, [quantity]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    if (raw.trim() === "") {
      onQuantityChange(0);
      return;
    }

    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed)) {
      onQuantityChange(parsed);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      const fallback = 1;
      setInputValue(String(fallback));
      onQuantityChange(fallback);
    } else {
      setInputValue(String(parsed));
      onQuantityChange(parsed);
    }
  };

  const handleStep = (delta: number) => {
    const current = parseFloat(inputValue) || quantity || 0;
    const next = Math.max(1, Number((current + delta).toFixed(3)));
    setInputValue(String(next));
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
        <p className="text-xs text-muted-foreground">
          Ranked by composite distance (60%) + excess inventory cover (40%). Enforces 7.0-day donor safety floor.
        </p>
        {selectedCandidate && !isCentralSupply && !disabled && (
          <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground shrink-0">
            Max Safe Transfer:{" "}
            <strong className="ml-1 text-emerald-700">
              {maxSafeTransfer} units
            </strong>
          </span>
        )}
      </div>

      {disabled ? (
        /* READ-ONLY FINALIZED VIEW: Clear, unclipped donor store summary */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 block">
              Assigned Source Donor Store
            </span>
            {isCentralSupply ? (
              <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-900">
                    <Factory className="h-3.5 w-3.5 shrink-0" />
                    <span>Central Supply / Mother Hub</span>
                  </span>
                  <span className="text-xs text-purple-800 font-medium">
                    Central Distribution Center Line-Haul
                  </span>
                </div>
                <p className="text-[11px] text-purple-700 pt-0.5">
                  Allocated directly from central mother warehouse. Regional donor safety floors do not constrain warehouse replenishment.
                </p>
              </div>
            ) : selectedCandidate ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded px-2 py-0.5 shrink-0">
                      {selectedCandidate.storeCode}
                    </span>
                    <span
                      className="font-bold text-sm text-slate-900 truncate max-w-[200px] sm:max-w-[280px]"
                      title={selectedCandidate.storeName}
                    >
                      {selectedCandidate.storeName}
                    </span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase shrink-0">
                      {selectedCandidate.storeFormat}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-600 shrink-0">
                    Rank #{selectedCandidate.rank} • Composite Score: {selectedCandidate.compositeScore.toFixed(1)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-mono text-slate-600 pt-0.5">
                  <span>
                    Transit Distance: <strong className="text-slate-800">{selectedCandidate.distanceKm} km</strong> (~{selectedCandidate.estTransitHours} hrs)
                  </span>
                  <span>
                    Available Stock: <strong className="text-slate-800">{selectedCandidate.availableStock.toFixed(0)} units</strong>
                  </span>
                  <span>
                    Current DOI: <strong className="text-slate-800">{selectedCandidate.currentDOI.toFixed(1)}d</strong>
                  </span>
                  <span>
                    Post-Transfer DOI:{" "}
                    <strong className="text-emerald-700">
                      {projectedDonorDOI >= 999 ? "999d" : `${projectedDonorDOI.toFixed(1)}d`}
                    </strong>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-semibold text-slate-700">
              Approved Transfer Quantity:
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 border border-slate-300 rounded px-3 py-1">
              {quantity.toFixed(3)} units
            </span>
          </div>
        </div>
      ) : (
        /* ACTIVE / EDITABLE VIEW: Full-width candidate dropdown and quantity controls */
        <div className="space-y-3.5">
          {/* Full-width Ranked Candidate Donor Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="candidate-donor-select" className="text-xs font-semibold text-slate-700">
              Select Source Store (Ranked Candidates) <span className="text-red-500 font-bold ml-1">*</span>
            </Label>
            <Select
              value={selectedStoreId || "CENTRAL_SUPPLY"}
              onValueChange={(val) => {
                onStoreChange(val);
              }}
              disabled={disabled}
            >
              <SelectTrigger
                id="candidate-donor-select"
                className="h-auto min-h-10 w-full py-2 px-3 text-xs font-sans text-left bg-white border-slate-300 [&>span]:text-left [&>span]:break-words [&>span]:whitespace-normal [&>span]:line-clamp-2"
              >
                <SelectValue placeholder="Select candidate donor store..." />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-3rem)] sm:max-w-xl bg-white border border-slate-200 shadow-xl z-50 p-1"
              >
                {candidates.map((cand) => {
                  if (cand.storeId === "CENTRAL_SUPPLY") {
                    return (
                      <SelectItem
                        key={cand.storeId}
                        value="CENTRAL_SUPPLY"
                        className="py-2.5 pl-8 pr-3 text-xs cursor-pointer focus:bg-slate-50 border-b border-slate-100 last:border-b-0 whitespace-normal break-words"
                      >
                        <div className="flex flex-col gap-0.5 w-full text-left break-words">
                          <div className="font-semibold text-slate-900 break-words flex items-center gap-1.5">
                            <span>Rank {cand.rank}:</span>
                            <span>🏭 Central Supply / Mother Hub</span>
                          </div>
                          <div className="text-[11px] text-slate-500 break-words">
                            Direct DC Line-Haul • Recommended
                          </div>
                        </div>
                      </SelectItem>
                    );
                  }
                  const isFloorViolated =
                    (cand.availableStock - quantity) / (cand.ads || 1.8) < 7.0 ||
                    cand.availableStock < quantity;

                  return (
                    <SelectItem
                      key={cand.storeId}
                      value={cand.storeId}
                      className="py-2.5 pl-8 pr-3 text-xs cursor-pointer focus:bg-slate-50 border-b border-slate-100 last:border-b-0 whitespace-normal break-words"
                    >
                      <div className="flex flex-col gap-0.5 w-full text-left break-words">
                        <div className="font-semibold text-slate-900 break-words">
                          Rank {cand.rank}: {cand.storeName}
                        </div>
                        <div className="text-[11px] text-slate-500 break-words flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="font-mono font-medium text-slate-700">{cand.storeCode}</span>
                          <span>•</span>
                          <span>{cand.distanceKm} km</span>
                          <span>•</span>
                          <span>Avail: {cand.availableStock.toFixed(0)}u</span>
                          <span>•</span>
                          {isFloorViolated ? (
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              ⚠️ DOI Floor Risk at {quantity.toFixed(0)}u (Safe ≤ {cand.excessUnitsAboveSafety}u)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">{cand.currentDOI.toFixed(1)}d DOI</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
                {!candidates.some((c) => c.storeId === "CENTRAL_SUPPLY") && (
                  <SelectItem
                    value="CENTRAL_SUPPLY"
                    className="py-2.5 pl-8 pr-3 text-xs cursor-pointer focus:bg-slate-50 border-b border-slate-100 last:border-b-0 whitespace-normal break-words"
                  >
                    <div className="flex flex-col gap-0.5 w-full text-left break-words">
                      <div className="font-semibold text-slate-900 break-words flex items-center gap-1.5">
                        <span>Rank {candidates.length + 1}:</span>
                        <span>🏭 Central Supply / Mother Hub</span>
                      </div>
                      <div className="text-[11px] text-slate-500 break-words">
                        Direct DC Line-Haul • Recommended fallback
                      </div>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Quantity Stepper with clean alignment */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <Label htmlFor="transfer-qty-input" className="text-xs font-semibold text-slate-700">
                Transfer Quantity (Units) <span className="text-red-500 font-bold ml-1">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={quantity <= 1}
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
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="Qty"
                  className={cn(
                    "h-9 w-28 text-center font-mono text-sm font-semibold tabular-nums",
                    isViolatingSafetyFloor &&
                      "border-red-500 bg-red-50/50 text-red-900 focus-visible:ring-red-500",
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStep(1)}
                  aria-label="Increase transfer quantity"
                  className="h-9 w-9 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 size-3.5" />
                </Button>
              </div>
            </div>

            {selectedCandidate && !isCentralSupply && (
              <div className="text-right text-xs">
                <span className="text-slate-500 block mb-0.5">Post-Transfer Donor DOI:</span>
                <span
                  className={cn(
                    "font-mono font-bold text-sm",
                    projectedDonorDOI <= 7.0 ? "text-red-600" : "text-emerald-700",
                  )}
                >
                  {projectedDonorDOI >= 999 ? "999d" : `${projectedDonorDOI.toFixed(1)}d`}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  (7.0d safety floor)
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
            <p className="font-semibold text-red-950 [overflow-wrap:anywhere] break-words pr-1">
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
                onClick={() => {
                  setInputValue(String(maxSafeTransfer));
                  onQuantityChange(maxSafeTransfer);
                }}
                className="mt-1 inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-900 hover:bg-red-200 transition-colors"
              >
                <AlertTriangle className="h-3.5 w-3.5 size-3.5 shrink-0" />
                <span>Clamp to Max Safe ({maxSafeTransfer} units)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        selectedCandidate && (
          <div className="flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-950">
            <span className="inline-flex items-center gap-1.5 font-medium min-w-0 pr-2">
              <CheckCircle2 className="h-3.5 w-3.5 size-3.5 text-emerald-600 shrink-0" />
              <span className="[overflow-wrap:anywhere] break-words">
                7-Day Safety Floor Protected: {selectedCandidate.storeName}{" "}
                retains {projectedDonorDOI.toFixed(1)} days DOI after
                dispatching {quantity.toFixed(3)} units (Min required: 7.0d).
              </span>
            </span>
            <span className="font-mono text-[11px] font-semibold text-emerald-800 shrink-0">
              Score: {selectedCandidate.compositeScore.toFixed(1)}
            </span>
          </div>
        )
      )}
    </div>
  );
};

export default CandidateStoreSelector;
