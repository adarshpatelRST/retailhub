import * as React from "react";
import {
  ArrowRight,
  Clock,
  Factory,
  IndianRupee,
  Navigation,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";

export interface SideBySideDestinationStore {
  name: string;
  code: string;
  format: string;
  currentStock: number;
  ads: number;
  currentDOI: number;
}

export interface SideBySideSourceStore {
  name: string;
  code: string;
  format: string;
  currentStock: number;
  ads: number;
  currentDOI: number;
  distanceKm?: number;
}

export interface SideBySideStoreCardProps {
  destStore: SideBySideDestinationStore;
  sourceStore: SideBySideSourceStore | null;
  transferQty: number;
  unitCost: number;
  className?: string;
}

export const SideBySideStoreCard: React.FC<SideBySideStoreCardProps> = ({
  destStore,
  sourceStore,
  transferQty,
  unitCost,
  className,
}) => {
  const safeQty = Number.isFinite(transferQty) ? Math.max(0, transferQty) : 0;
  const safeCost = Number.isFinite(unitCost) ? Math.max(0, unitCost) : 0;

  const destStock = Number(destStore?.currentStock) || 0;
  const destAds = Number(destStore?.ads) || 0;
  const destDoi = Number(destStore?.currentDOI) || 0;

  const destStockAfter = destStock + safeQty;
  const destDOIAfter = destAds > 0 ? destStockAfter / destAds : 999;

  const srcStock = Number(sourceStore?.currentStock) || 0;
  const srcAds = Number(sourceStore?.ads) || 0;
  const srcDoi = Number(sourceStore?.currentDOI) || 0;
  const srcDistance = Number(sourceStore?.distanceKm) || 0;

  const srcStockAfter = sourceStore ? Math.max(0, srcStock - safeQty) : 0;
  const srcDOIAfter = sourceStore && srcAds > 0 ? srcStockAfter / srcAds : 999;

  const estTransitHours = sourceStore
    ? Math.max(0.5, Number((srcDistance / 50).toFixed(1)))
    : 0;

  const transferValue = safeQty * safeCost;

  const isDonorFloorViolated =
    sourceStore !== null && srcDOIAfter <= 7.0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-xs overflow-hidden",
        className,
      )}
    >
      {/* Top Logistics Route Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          {sourceStore ? (
            <>
              <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                {sourceStore.code}
              </span>
              <span className="truncate max-w-[140px]">{sourceStore.name}</span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-purple-300 bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-900">
              <span>[🏭 Central Supply / Mother Hub]</span>
            </span>
          )}
          <ArrowRight className="h-3.5 w-3.5 size-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
            {destStore.code}
          </span>
          <span className="truncate max-w-[140px]">{destStore.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
          {sourceStore ? (
            <>
              <span
                className="inline-flex items-center gap-1 text-muted-foreground"
                title="Haversine + Road Tortuosity (1.35x) Distance"
              >
                <Navigation className="h-3.5 w-3.5 size-3.5 text-primary shrink-0" />
                <strong className="text-foreground">
                  {srcDistance.toFixed(0)} km
                </strong>
              </span>
              <span
                className="inline-flex items-center gap-1 text-muted-foreground"
                title="Estimated Line-Haul Road Transit Time"
              >
                <Clock className="h-3.5 w-3.5 size-3.5 text-primary shrink-0" />
                <strong className="text-foreground">
                  ~{estTransitHours.toFixed(1)} hrs
                </strong>
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-purple-800 font-medium">
              <Clock className="h-3.5 w-3.5 size-3.5 shrink-0" />
              <span> Mother Hub Line-Haul (~12.0 hrs)</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 font-semibold text-primary">
            <IndianRupee className="h-3 w-3 size-3 shrink-0" />
            <span>
              Est. Value ₹
              {transferValue.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </span>
          </span>
        </div>
      </div>

      {/* 2-Column Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {/* LEFT COLUMN: Destination Store (Stockout Risk / Receiver) */}
        <div className="flex flex-col justify-between rounded-md border border-amber-200/80 bg-amber-50/20 p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                <TrendingUp className="h-3.5 w-3.5 size-3.5 shrink-0" />
                <span>Destination (Receiver)</span>
              </div>
              <h4 className="mt-1 text-sm font-semibold text-foreground leading-snug">
                {destStore.name}
              </h4>
              <p className="font-mono text-xs text-muted-foreground">
                {destStore.code} • ADS:{" "}
                <strong className="text-foreground">
                  {destAds.toFixed(2)}
                </strong>{" "}
                u/day
              </p>
            </div>
            <StatusBadge status={destStore.format} />
          </div>

          {/* Stock Before -> Delta -> Stock After */}
          <div className="rounded-md border bg-background p-2.5">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Physical Inventory Impact (Units)
            </div>
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  Before
                </span>
                <span className="font-semibold text-red-700">
                  {destStock.toFixed(3)}
                </span>
              </div>
              <div className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
                +{safeQty.toFixed(3)}
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-muted-foreground">
                  After
                </span>
                <span className="font-bold text-emerald-700">
                  {destStockAfter.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* Dual DOI Gauge Bars */}
          <div className="space-y-2 pt-1">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">DOI Before</span>
                <span className="font-mono font-semibold text-red-700">
                  {destDoi.toFixed(2)}d
                </span>
              </div>
              <RH_DOIGauge doi={destDoi} showLabel={false} />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground">Projected DOI After</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {destDOIAfter >= 999 ? "999d" : `${destDOIAfter.toFixed(2)}d`}
                </span>
              </div>
              <RH_DOIGauge doi={destDOIAfter} showLabel={false} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Source Store (Donor) or Central Supply Fallback */}
        {sourceStore ? (
          <div
            className={cn(
              "flex flex-col justify-between rounded-md border p-3.5 space-y-3",
              isDonorFloorViolated
                ? "border-red-300 bg-red-50/30"
                : "border-emerald-200/80 bg-emerald-50/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                  <TrendingDown className="h-3.5 w-3.5 size-3.5 shrink-0" />
                  <span>Source Store (Donor)</span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-foreground leading-snug">
                  {sourceStore.name}
                </h4>
                <p className="font-mono text-xs text-muted-foreground">
                  {sourceStore.code} • ADS:{" "}
                  <strong className="text-foreground">
                    {srcAds.toFixed(2)}
                  </strong>{" "}
                  u/day
                </p>
              </div>
              <StatusBadge status={sourceStore.format} />
            </div>

            {/* Stock Before -> Delta -> Stock After */}
            <div className="rounded-md border bg-background p-2.5">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">
                Physical Inventory Impact (Units)
              </div>
              <div className="flex items-center justify-between font-mono text-xs tabular-nums">
                <div>
                  <span className="block text-[10px] text-muted-foreground">
                    Before
                  </span>
                  <span className="font-semibold text-foreground">
                    {srcStock.toFixed(3)}
                  </span>
                </div>
                <div className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                  -{safeQty.toFixed(3)}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-muted-foreground">
                    After
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      isDonorFloorViolated
                        ? "text-red-700"
                        : "text-emerald-700",
                    )}
                  >
                    {srcStockAfter.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dual DOI Gauge Bars */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">DOI Before</span>
                  <span className="font-mono font-semibold text-purple-700">
                    {srcDoi.toFixed(2)}d
                  </span>
                </div>
                <RH_DOIGauge doi={srcDoi} showLabel={false} />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">
                    Projected DOI After (Min 7.0d)
                  </span>
                  <span
                    className={cn(
                      "font-mono font-semibold",
                      isDonorFloorViolated
                        ? "text-red-700"
                        : "text-emerald-700",
                    )}
                  >
                    {srcDOIAfter >= 999 ? "999d" : `${srcDOIAfter.toFixed(2)}d`}
                  </span>
                </div>
                <RH_DOIGauge doi={srcDOIAfter} showLabel={false} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between rounded-md border border-purple-300 bg-purple-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-900">
                  <Factory className="h-3.5 w-3.5 size-3.5 shrink-0" />
                  <span>[🏭 Central Supply / Mother Hub]</span>
                </span>
                <h4 className="pt-1 text-sm font-semibold text-purple-950">
                  Regional Distribution Center (Mother Hub)
                </h4>
              </div>
              <Store className="h-5 w-5 size-5 text-purple-700 shrink-0" />
            </div>

            <p className="text-xs text-purple-900/80 leading-relaxed">
              No regional peer store within 300 km currently holds excess stock
              (&gt; 30.0 days DOI) for this SKU. This replenishment is routed
              directly from Central Supply with unconstrained buffer capacity.
            </p>

            <div className="rounded-md border border-purple-200 bg-white/80 p-2.5 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dispatch Quantity:</span>
                <strong className="text-purple-950">
                  {safeQty.toFixed(3)} units
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Donor Safety Floor:</span>
                <strong className="text-emerald-700">
                  Exempt (Central Hub)
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
