import * as React from "react";
import { Search, Barcode, X } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface RH_SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showBarcodeIcon?: boolean;
  className?: string;
  autoFocus?: boolean;
  onEnter?: (value: string) => void;
}

export const RH_SearchBox: React.FC<RH_SearchBoxProps> = ({
  value,
  onChange,
  placeholder = "Scan barcode (8+ digits) or search SKU / product...",
  showBarcodeIcon = true,
  className,
  autoFocus = false,
  onEnter,
}) => {
  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter(value);
          }
        }}
        placeholder={placeholder}
        className="pl-9 pr-14 font-mono text-xs"
      />
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {showBarcodeIcon && (
          <Barcode
            className="h-4 w-4 text-muted-foreground/70"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};
