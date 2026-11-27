import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  ArrowLeft,
  Inbox,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const PageContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn("flex min-h-screen flex-col bg-background", className)}
    {...props}
  >
    {children}
  </div>
);

export const PageContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn(
      "flex-1 min-w-0 px-4 sm:px-6 py-4 sm:py-5 space-y-4",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backButton?: {
    label?: string;
    onClick: () => void;
  };
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backButton,
  actions,
  className,
}) => (
  <div
    className={cn(
      "mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between",
      className,
    )}
  >
    <div className="space-y-1">
      {backButton && (
        <div className="mb-2">
          <Button
            type="button"
            variant="back"
            size="sm"
            onClick={backButton.onClick}
            className="h-8 px-2.5 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 size-3.5 shrink-0" />
            <span>{backButton.label ?? "Back"}</span>
          </Button>
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>

    {actions && (
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {actions}
      </div>
    )}
  </div>
);

export const LoadingSpinner: React.FC<{
  label?: string;
  className?: string;
}> = ({ label = "Loading...", className }) => (
  <div
    role="status"
    className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
  >
    <Loader2 className="h-4 w-4 size-4 animate-spin text-primary shrink-0" />
    <span>{label}</span>
  </div>
);

export const LoadingPage: React.FC<{ label?: string }> = ({
  label = "Loading RepleniQ™ workspace...",
}) => (
  <div className="flex min-h-[360px] w-full flex-col items-center justify-center gap-3 p-8 text-center">
    <Loader2 className="h-8 w-8 size-8 animate-spin text-primary shrink-0" />
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
  </div>
);

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      "flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center",
      className,
    )}
  >
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon ?? <Inbox className="h-5 w-5 size-5 shrink-0" />}
    </div>
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>
    {actionLabel && onAction && (
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onAction}
        className="mt-4"
      >
        {actionLabel}
      </Button>
    )}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  message: string;
  correlationId?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Unable to load operational data",
  message,
  correlationId,
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      "rounded-lg border border-red-200 bg-red-50/70 p-6 text-red-900",
      className,
    )}
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 size-5 text-red-600 shrink-0" />
      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-red-800">{message}</p>
        {correlationId && (
          <p className="font-mono text-[11px] text-red-700">
            Correlation ID: {correlationId}
          </p>
        )}
        {onRetry && (
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 bg-white text-red-800 hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5 size-3.5 shrink-0" />
              <span>Try Again</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  </div>
);

const dashboardCardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-xs",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "default",
    },
  },
);

export interface DashboardCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dashboardCardVariants> {}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  padding,
  className,
  children,
  ...props
}) => (
  <div
    className={cn(dashboardCardVariants({ padding }), className)}
    {...props}
  >
    {children}
  </div>
);
