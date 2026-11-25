import * as React from "react";
import { cn } from "@/lib/utils";

export interface RH_DOIGaugeProps {
  doi?: number;
  currentDOI?: number;
  showLabel?: boolean;
  className?: string;
}

export interface DoiGaugeClassification {
  zone: "CRITICAL" | "LOW" | "HEALTHY" | "EXCESS";
  barColorClass: string;
  textColorClass: string;
  fillPercent: number;
  displayText: string;
}

/**
 * Classifies Days of Inventory (DOI) into 4 deterministic visual zones:
 * - <= 3.0d: Red (bg-red-500)
 * - 3.1 - 7.0d: Amber (bg-amber-500)
 * - 7.1 - 30.0d: Green (bg-emerald-500)
 * - > 30.0d: Purple (bg-purple-500)
 */
export function classifyDoiGauge(doi: number): DoiGaugeClassification {
  const safeDoi = Number.isFinite(doi) ? Math.max(0, doi) : 0;
  const fillPercent = Math.min(100, Math.max(6, Math.round((safeDoi / 45) * 100)));
  const displayText = safeDoi >= 999 ? "999d (Dormant)" : `${safeDoi.toFixed(1)}d`;

  if (safeDoi <= 3.0) {
    return {
      zone: "CRITICAL",
      barColorClass: "bg-red-500",
      textColorClass: "text-red-700",
      fillPercent,
      displayText,
    };
  }
  if (safeDoi <= 7.0) {
    return {
      zone: "LOW",
      barColorClass: "bg-amber-500",
      textColorClass: "text-amber-700",
      fillPercent,
      displayText,
    };
  }
  if (safeDoi <= 30.0) {
    return {
      zone: "HEALTHY",
      barColorClass: "bg-emerald-500",
      textColorClass: "text-emerald-700",
      fillPercent,
      displayText,
    };
  }
  return {
    zone: "EXCESS",
    barColorClass: "bg-purple-500",
    textColorClass: "text-purple-700",
    fillPercent: 100,
    displayText,
  };
}

export const RH_DOIGauge: React.FC<RH_DOIGaugeProps> = ({
  doi,
  currentDOI,
  showLabel = true,
  className,
}) => {
  const effectiveDoi = doi ?? currentDOI ?? 0;
  const meta = React.useMemo(() => classifyDoiGauge(effectiveDoi), [effectiveDoi]);

  const tooltipText =
    meta.displayText === "999d (Dormant)"
      ? "Dormant Stock: Available stock exists on hand with 0 daily sales velocity. Replenishment is suppressed to prevent capital over-allocation."
      : meta.zone === "CRITICAL"
      ? "Critical Stockout (≤ 3.0d): Available stock is depleted or nearing stockout. Autonomous rebalance agent will generate replenishment transfer."
      : `Days of Inventory: ${meta.displayText} (${meta.zone})`;

  return (
    <div
      className={cn("flex items-center gap-2.5 min-w-[140px] cursor-help", className)}
      title={tooltipText}
    >
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-secondary"
        aria-label={`Days of Inventory ${meta.displayText} (${meta.zone})`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            meta.barColorClass,
          )}
          style={{ width: `${meta.fillPercent}%` }}
        />
      </div>

      {showLabel && (
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs tabular-nums">
          <span className="font-semibold text-foreground">
            {meta.displayText}
          </span>
          <span className={cn("text-[10px] font-semibold", meta.textColorClass)}>
            {meta.zone}
          </span>
        </div>
      )}
    </div>
  );
};
