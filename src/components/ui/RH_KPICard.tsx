import * as React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type TrendDirection = "up" | "down" | "neutral";

export interface StructuredTrend {
  value?: number;
  label?: string;
  isPositiveGood?: boolean;
}

export interface RH_KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  targetComparison?: string;
  trend?: TrendDirection | StructuredTrend;
  trendValue?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export const RH_KPICard: React.FC<RH_KPICardProps> = ({
  title,
  value,
  subtitle,
  targetComparison,
  trend = "neutral",
  trendValue,
  sparklineData,
  icon,
  className,
}) => {
  const sparklinePoints = React.useMemo(() => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 96;
    const height = 28;

    return sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [sparklineData]);

  const resolvedTrend: TrendDirection = React.useMemo(() => {
    if (typeof trend === "string") return trend;
    if (typeof trend === "object" && trend !== null) {
      if ((trend.value ?? 0) > 0) return "up";
      if ((trend.value ?? 0) < 0) return "down";
    }
    return "neutral";
  }, [trend]);

  const resolvedTrendValue = React.useMemo(() => {
    if (trendValue) return trendValue;
    if (typeof trend === "object" && trend !== null && trend.label) {
      return trend.label;
    }
    return null;
  }, [trend, trendValue]);

  const trendColorClass = React.useMemo(() => {
    if (typeof trend === "object" && trend !== null) {
      const isPositiveGood = trend.isPositiveGood ?? true;
      if (resolvedTrend === "up") {
        return isPositiveGood ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50";
      }
      if (resolvedTrend === "down") {
        return isPositiveGood ? "text-red-700 bg-red-50" : "text-emerald-700 bg-emerald-50";
      }
      return "text-muted-foreground bg-muted";
    }
    if (resolvedTrend === "up") return "text-emerald-700 bg-emerald-50";
    if (resolvedTrend === "down") return "text-red-700 bg-red-50";
    return "text-muted-foreground bg-muted";
  }, [trend, resolvedTrend]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">
            {title}
          </span>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-2xl font-bold tracking-tight font-mono text-foreground">
              {value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>

          {sparklinePoints && (
            <svg
              className="h-7 w-24 shrink-0 overflow-visible"
              viewBox="0 0 96 28"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
                points={sparklinePoints}
              />
            </svg>
          )}
        </div>

        {(resolvedTrendValue || targetComparison) && (
          <div className="flex items-center gap-2 text-xs">
            {resolvedTrendValue && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                  trendColorClass,
                )}
              >
                {resolvedTrend === "up" && (
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                )}
                {resolvedTrend === "down" && (
                  <ArrowDownRight className="h-3 w-3 shrink-0" />
                )}
                {resolvedTrend === "neutral" && (
                  <ArrowRight className="h-3 w-3 shrink-0" />
                )}
                {resolvedTrendValue}
              </span>
            )}

            {targetComparison && (
              <span className="text-muted-foreground truncate">
                {targetComparison}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RH_KPICard;
