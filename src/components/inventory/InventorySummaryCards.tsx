import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Boxes,
  IndianRupee,
} from "lucide-react";
import { RH_KPICard } from "@/components/ui/RH_KPICard";
import { type InventoryRecord } from "@/api/inventory.api";

export interface InventorySummaryCardsProps {
  items: InventoryRecord[];
  isLoading?: boolean;
}

export function formatIndianCompactCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "₹0";
  }
  if (amount >= 10_000_000) {
    return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    return `₹${(amount / 100_000).toFixed(2)} Lakhs`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function computeInventorySummaryMetrics(items: InventoryRecord[]) {
  let totalValuation = 0;
  let criticalCount = 0;
  let lowStockCount = 0;
  let excessCapital = 0;

  for (const item of items) {
    const avail = Number(item.availableQuantity) || 0;
    const cost = Number(item.costPrice) || 0;
    const maxStock = Number(item.maximumStock) || 0;
    const reorder = Number(item.reorderLevel) || 0;

    if (avail > 0) {
      totalValuation += avail * cost;
    }

    if (avail <= 0 || item.status === "CRITICAL") {
      criticalCount += 1;
    } else if (avail <= reorder || item.status === "LOW") {
      lowStockCount += 1;
    }

    if (avail > maxStock && maxStock > 0) {
      excessCapital += (avail - maxStock) * cost;
    } else if (item.status === "EXCESS" && avail > reorder * 2) {
      excessCapital += (avail - reorder * 2) * cost;
    }
  }

  return {
    totalValuation,
    criticalCount,
    lowStockCount,
    excessCapital,
  };
}

export const InventorySummaryCards: React.FC<InventorySummaryCardsProps> = ({
  items,
}) => {
  const metrics = React.useMemo(
    () => computeInventorySummaryMetrics(items),
    [items],
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <RH_KPICard
        title="Total Inventory Value"
        value={formatIndianCompactCurrency(metrics.totalValuation)}
        subtitle={`Across ${items.length} active store SKUs`}
        trend={{ value: 4.2, label: "vs last cycle", isPositiveGood: true }}
        icon={<IndianRupee className="h-4 w-4 text-primary" />}
        sparklineData={[14.2, 15.1, 15.8, 16.4, 17.9, 18.4]}
      />

      <RH_KPICard
        title="Critical / Stock-Out SKUs"
        value={String(metrics.criticalCount)}
        subtitle="Available stock ≤ 0.000 or DOI ≤ 3.0d"
        trend={{
          value: metrics.criticalCount > 0 ? -12.5 : 0,
          label: "Immediate action required",
          isPositiveGood: false,
        }}
        icon={<AlertOctagon className="h-4 w-4 text-red-600" />}
        className="border-red-500/30"
      />

      <RH_KPICard
        title="Low Stock SKUs"
        value={String(metrics.lowStockCount)}
        subtitle="At or below reorder threshold"
        trend={{
          value: 2.1,
          label: "Replenishment queue",
          isPositiveGood: false,
        }}
        icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        className="border-amber-500/30"
      />

      <RH_KPICard
        title="Trapped Excess Capital"
        value={formatIndianCompactCurrency(metrics.excessCapital)}
        subtitle="Surplus stock exceeding max threshold"
        trend={{
          value: -6.4,
          label: "Eligible for donor transfer",
          isPositiveGood: true,
        }}
        icon={<Boxes className="h-4 w-4 text-purple-600" />}
        className="border-purple-500/30"
      />
    </div>
  );
};
