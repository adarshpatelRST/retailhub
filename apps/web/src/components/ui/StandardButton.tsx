import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";

export interface StandardButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const StandardButton = React.forwardRef<
  HTMLButtonElement,
  StandardButtonProps
>(({ loading = false, loadingText, disabled, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2
          className="h-4 w-4 size-4 animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
    </Button>
  );
});

StandardButton.displayName = "StandardButton";
