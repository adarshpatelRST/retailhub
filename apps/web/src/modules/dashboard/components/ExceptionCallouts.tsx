import * as React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type ExceptionCalloutItem } from "../api/dashboard.api";

export interface ExceptionCalloutsProps {
  items: ExceptionCalloutItem[];
  onInspectRecommendation?: (recId: string) => void;
}

export const ExceptionCallouts: React.FC<ExceptionCalloutsProps> = ({
  items,
  onInspectRecommendation,
}) => {
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 size-4 text-amber-600 shrink-0" />
            <CardTitle className="text-sm font-bold text-foreground">
              Actionable Supply Chain Exceptions ({items.length})
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/intelligence/action-center")}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <span>Open Action Center</span>
            <ArrowRight className="h-3.5 w-3.5 size-3.5 shrink-0" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-3.5 shadow-2xs"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={item.severity} />
                <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                  {item.storeCode} · {item.sku}
                </span>
              </div>

              <div className="text-xs font-bold text-foreground leading-snug">
                {item.title}
              </div>

              <div className="text-xs text-muted-foreground">
                {item.productName} at{" "}
                <strong className="text-foreground">{item.storeName}</strong>
              </div>

              <div className="font-mono text-[11px] text-red-700 bg-red-50/70 rounded px-2 py-1">
                {item.metricSummary}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <span className="font-mono text-[11px] text-muted-foreground">
                {item.recNumber ?? "Pending Scan"}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (item.recommendationId && onInspectRecommendation) {
                    onInspectRecommendation(item.recommendationId);
                  } else {
                    navigate(
                      item.recommendationId
                        ? `/intelligence/action-center?recId=${item.recommendationId}`
                        : "/intelligence/action-center",
                    );
                  }
                }}
                className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary"
              >
                <span>Review in Action Center</span>
                <ArrowRight className="ml-1 h-3 w-3 size-3 shrink-0" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
