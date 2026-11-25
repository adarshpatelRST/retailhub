import * as React from "react";
import {
  ArrowRight,
  Clock,
  Factory,
  IndianRupee,
  Navigation,
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
      {/* Top Logistics Route Bar: 2 dedicated clean micro-rows */}
      <div className="border-b bg-muted/30 px-3.5 py-2 space-y-1.5 text-xs">
        {/* Row 1: Source -> Destination Route */}
        <div className="flex items-center gap-2 font-medium text-foreground min-w-0">
          {sourceStore ? (
            <span className="inline-flex items-center gap-1.5 min-w-0 truncate max-w-[48%]">
              <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded px-1.5 py-0.5 shrink-0">
                {sourceStore.code}
              </span>
              <span className="font-semibold text-slate-800 truncate text-xs" title={sourceStore.name}>
                {sourceStore.name}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-900 shrink-0">
              <Factory className="h-3.5 w-3.5 shrink-0" />
              <span>Central Supply (Mother Hub)</span>
            </span>
          )}
          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="inline-flex items-center gap-1.5 min-w-0 truncate flex-1">
            <span className="font-mono text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 shrink-0">
              {destStore.code}
            </span>
            <span className="font-semibold text-slate-800 truncate text-xs" title={destStore.name}>
              {destStore.name}
            </span>
          </span>
        </div>

        {/* Row 2: Transit Distance / Time + Est. Value */}
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-slate-200/50">
          <div className="flex items-center gap-3">
            {sourceStore ? (
              <>
                <span className="inline-flex items-center gap-1" title="Road Transit Distance">
                  <Navigation className="h-3 w-3 text-primary shrink-0" />
                  <strong className="text-slate-800">{srcDistance.toFixed(0)} km</strong>
                </span>
                <span className="inline-flex items-center gap-1" title="Estimated Line-Haul Transit Time">
                  <Clock className="h-3 w-3 text-primary shrink-0" />
                  <strong className="text-slate-800">~{estTransitHours.toFixed(1)} hrs</strong>
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-purple-800 font-semibold">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Central DC Transit (~12.0h)</span>
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 text-xs">
            <IndianRupee className="h-3 w-3 shrink-0" />
            <span>Est. Value ₹{transferValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
          </span>
        </div>
      </div>

      {/* 2-Column Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {/* LEFT COLUMN: Destination Store (Stockout Risk / Receiver) */}
        <div className="flex flex-col justify-between rounded-md border border-amber-200/80 bg-amber-50/20 p-3.5 space-y-3 min-w-0 overflow-hidden">
          <div className="space-y-2">
            {/* Row 1: Role Tag + Format Badge */}
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="inline-flex items-center rounded-md bg-amber-100/90 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 shrink-0 whitespace-nowrap">
                Destination
              </span>
              <StatusBadge status={destStore.format} className="text-[10px] px-2 py-0.5 shrink-0" />
            </div>

            {/* Row 2: Full-width Store Name (line-clamp-2) & Metadata */}
            <div className="min-h-[48px] flex flex-col justify-center min-w-0 pr-1">
              <h4
                className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 [overflow-wrap:anywhere] break-words"
                title={destStore.name}
              >
                {destStore.name}
              </h4>
              <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground pt-0.5">
                <span className="font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                  {destStore.code}
                </span>
                <span>•</span>
                <span className="truncate">
                  ADS: <strong className="text-foreground">{destAds.toFixed(2)}</strong> u/day
                </span>
              </div>
            </div>
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
              "flex flex-col justify-between rounded-md border p-3.5 space-y-3 min-w-0 overflow-hidden",
              isDonorFloorViolated
                ? "border-red-300 bg-red-50/30"
                : "border-emerald-200/80 bg-emerald-50/20",
            )}
          >
            <div className="space-y-2">
              {/* Row 1: Role Tag + Format Badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="inline-flex items-center rounded-md bg-emerald-100/90 border border-emerald-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900 shrink-0 whitespace-nowrap">
                  Source Donor
                </span>
                <StatusBadge status={sourceStore.format} className="text-[10px] px-2 py-0.5 shrink-0" />
              </div>

              {/* Row 2: Full-width Store Name (line-clamp-2) & Metadata */}
              <div className="min-h-[48px] flex flex-col justify-center min-w-0 pr-1">
                <h4
                  className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 [overflow-wrap:anywhere] break-words"
                  title={sourceStore.name}
                >
                  {sourceStore.name}
                </h4>
                <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground pt-0.5">
                  <span className="font-semibold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                    {sourceStore.code}
                  </span>
                  <span>•</span>
                  <span className="truncate">
                    ADS: <strong className="text-foreground">{srcAds.toFixed(2)}</strong> u/day
                  </span>
                </div>
              </div>
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
          <div className="flex flex-col justify-between rounded-md border border-purple-300 bg-purple-50/40 p-3.5 space-y-3 min-w-0 overflow-hidden">
            <div className="space-y-2">
              {/* Row 1: Role Tag + Format Badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="inline-flex items-center rounded-md border border-purple-300 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 uppercase tracking-wider shrink-0 whitespace-nowrap">
                  Central Supply
                </span>
                <span className="rounded-md border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-900 uppercase shrink-0 whitespace-nowrap">
                  Mother Hub
                </span>
              </div>

              {/* Row 2: Full-width Distribution Center Title & Subtitle */}
              <div className="min-h-[48px] flex flex-col justify-center">
                <h4 className="text-sm font-bold text-purple-950 leading-snug">
                  Regional Distribution Center (Mother Hub)
                </h4>
                <div className="flex items-center gap-1.5 font-mono text-xs text-purple-800/80 pt-0.5">
                  <span className="font-semibold text-purple-900 bg-white border border-purple-200 px-1.5 py-0.5 rounded text-[11px]">
                    DC-CENTRAL
                  </span>
                  <span>•</span>
                  <span>Direct Line-Haul Replenishment</span>
                </div>
              </div>
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
