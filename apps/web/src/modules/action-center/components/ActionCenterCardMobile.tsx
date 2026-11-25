import * as React from "react";
import { ArrowRight, Factory, UserCheck } from "lucide-react";
import { type RecommendationDto } from "../api/action-center.api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RH_DOIGauge } from "@/components/ui/RH_DOIGauge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionCenterCardMobileProps {
  recommendation: RecommendationDto;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  onReview: (id: string) => void;
  className?: string;
}

export const ActionCenterCardMobile: React.FC<ActionCenterCardMobileProps> = ({
  recommendation,
  selected,
  onSelectChange,
  onReview,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 text-card-foreground shadow-xs space-y-3 transition-colors",
        selected && "border-primary bg-primary/5",
        className,
      )}
    >
      {/* Top Row: Checkbox + Rec Number + Priority & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Checkbox
            aria-label={`Select ${recommendation.recommendationNumber}`}
            checked={selected}
            onCheckedChange={(val) => onSelectChange(Boolean(val))}
          />
          <span className="font-mono text-xs font-bold text-foreground">
            {recommendation.recommendationNumber}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <StatusBadge status={recommendation.priority} />
          <StatusBadge status={recommendation.status} />
        </div>
      </div>

      {/* Product Info */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-primary">
            {recommendation.sku}
          </span>
          {recommendation.isManualRequest && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-900 border border-blue-200">
              <UserCheck className="h-3 w-3 size-3 shrink-0" />
              <span>Store Request</span>
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold text-foreground mt-0.5">
          {recommendation.productName}
        </h4>
      </div>

      {/* Source -> Destination Summary */}
      <div className="rounded-md border bg-muted/30 p-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[10px] uppercase text-muted-foreground">
              Source Donor
            </span>
            {recommendation.fromStoreId ? (
              <span className="font-medium text-foreground truncate block">
                {recommendation.fromStoreName} ({recommendation.distanceKm} km)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-purple-300 bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-900">
                <Factory className="h-3 w-3 size-3 shrink-0" />
                <span>[🏭 Central Supply / Mother Hub]</span>
              </span>
            )}
          </div>

          <ArrowRight className="h-4 w-4 size-4 text-muted-foreground shrink-0" />

          <div className="text-right min-w-0">
            <span className="block text-[10px] uppercase text-muted-foreground">
              Destination
            </span>
            <span className="font-medium text-foreground truncate block">
              {recommendation.toStoreName}
            </span>
          </div>
        </div>

        <div className="pt-1 border-t flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Dest. DOI Before:
          </span>
          <RH_DOIGauge
            doi={recommendation.destDoiBefore}
            className="min-w-[130px]"
          />
        </div>
      </div>

      {/* Footer: Transfer Qty + Review Action */}
      <div className="flex items-center justify-between pt-1">
        <div className="font-mono text-xs">
          <span className="text-muted-foreground">Qty: </span>
          <strong className="text-foreground">
            {recommendation.recommendedQty.toFixed(3)} u
          </strong>
          <span className="text-muted-foreground ml-2">
            (₹
            {(
              recommendation.recommendedQty * recommendation.unitCost
            ).toLocaleString("en-IN")}
            )
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onReview(recommendation.id)}
          className="h-8 text-xs font-semibold"
        >
          Review ➔
        </Button>
      </div>
    </div>
  );
};
