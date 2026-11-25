import * as React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export interface RH_KPICardProps {
  title: string;
  value: string | number;
  targetComparison?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export const RH_KPICard: React.FC<RH_KPICardProps> = ({
  title,
  value,
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

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {title}
            </p>
            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {value}
            </div>
          </div>

          {icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {trendValue && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                  trend === "up"
                    ? "bg-emerald-50 text-emerald-700"
                    : trend === "down"
                      ? "bg-red-50 text-red-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {trend === "up" && (
                  <ArrowUpRight className="h-3 w-3 size-3 shrink-0" />
                )}
                {trend === "down" && (
                  <ArrowDownRight className="h-3 w-3 size-3 shrink-0" />
                )}
                {trend === "neutral" && (
                  <ArrowRight className="h-3 w-3 size-3 shrink-0" />
                )}
                <span>{trendValue}</span>
              </span>
            )}

            {targetComparison && (
              <span className="text-xs text-muted-foreground">
                {targetComparison}
              </span>
            )}
          </div>

          {sparklinePoints && (
            <svg
              width={96}
              height={28}
              viewBox="0 0 96 28"
              className="shrink-0 overflow-visible"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke={
                  trend === "down"
                    ? "#dc2626"
                    : trend === "up"
                      ? "#059669"
                      : "#2563eb"
                }
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
