import * as React from "react";
import {
  ErrorState,
  LoadingPage,
  PageContent,
  PageHeader,
} from "@/components/ui/DesignSystem";

export interface PageLayoutProps {
  title: string;
  description?: string;
  backButton?: {
    label?: string;
    onClick: () => void;
  };
  actions?: React.ReactNode;
  loading?: boolean;
  error?: (Error & { correlationId?: string }) | null;
  onRetry?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  description,
  backButton,
  actions,
  loading = false,
  error = null,
  onRetry,
  children,
  className,
}) => {
  return (
    <PageContent className={className}>
      {loading ? (
        <LoadingPage label={`Loading ${title}...`} />
      ) : error ? (
        <ErrorState
          title={`Failed to load ${title}`}
          message={error.message || "An unexpected error occurred."}
          correlationId={error.correlationId}
          onRetry={onRetry}
        />
      ) : (
        <>
          <PageHeader
            title={title}
            subtitle={description}
            backButton={backButton}
            actions={actions}
          />
          {children}
        </>
      )}
    </PageContent>
  );
};
