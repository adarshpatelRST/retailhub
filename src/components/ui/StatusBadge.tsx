import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const statusBadgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        critical: "bg-red-50 text-red-700 border-red-200",
        low: "bg-amber-50 text-amber-700 border-amber-200",
        healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
        excess: "bg-purple-50 text-purple-700 border-purple-200",
        inTransit: "bg-blue-50 text-blue-700 border-blue-200",
        rejected: "bg-red-50 text-red-700 border-red-200",
        brand: "bg-blue-50 text-blue-700 border-blue-200",
        default: "bg-slate-100 text-slate-700 border-slate-200",
        info: "bg-sky-50 text-sky-700 border-sky-200",
        neutral: "bg-slate-100 text-slate-700 border-slate-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
      },
    },
    defaultVariants: {
      variant: "healthy",
    },
  },
);

export type StatusVariantKey = NonNullable<
  VariantProps<typeof statusBadgeVariants>["variant"]
>;

export function getStatusVariant(status?: string): StatusVariantKey {
  const normalized = (status || "").trim().toUpperCase();
  switch (normalized) {
    case "CRITICAL":
    case "HIGH":
    case "OUT_OF_STOCK":
      return "critical";
    case "LOW":
    case "MEDIUM":
    case "PENDING":
    case "PENDING_APPROVAL":
    case "OPEN":
      return "low";
    case "HEALTHY":
    case "APPROVED":
    case "RECEIVED":
    case "ACTIVE":
      return "healthy";
    case "EXCESS":
    case "OVERSTOCK":
      return "excess";
    case "APPROVED_IN_TRANSIT":
    case "IN_TRANSIT":
    case "MODIFIED":
      return "inTransit";
    case "REJECTED":
    case "CANCELLED":
    case "AUTO_EXPIRED":
    case "INACTIVE":
      return "rejected";
    default:
      return "neutral";
  }
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "",
  label,
  variant,
  className,
  ...props
}) => {
  const resolvedVariant = variant ?? getStatusVariant(status);
  return (
    <span
      className={cn(
        statusBadgeVariants({ variant: resolvedVariant }),
        className,
      )}
      {...props}
    >
      {label ?? status}
    </span>
  );
};
