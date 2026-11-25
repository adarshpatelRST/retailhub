import * as React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface ModuleFilterBarProps {
  title?: string;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ModuleFilterBar: React.FC<ModuleFilterBarProps> = ({
  title = "Filters",
  icon,
  headerExtra,
  children,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-800">
          {icon || <Filter className="h-3.5 w-3.5 text-emerald-700" />}
          <span>{title}</span>
        </div>
        {headerExtra && <div>{headerExtra}</div>}
      </div>

      <div className="space-y-4">{children}</div>

      {actions && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export interface ModuleFilterItemProps {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const ModuleFilterItem: React.FC<ModuleFilterItemProps> = ({
  label,
  required = false,
  className,
  children,
}) => {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
        {label}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
};

export const ModuleFilterGrid: React.FC<{
  columns?: 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}> = ({ columns = 3, className, children }) => {
  const colClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return <div className={cn("grid gap-4", colClass, className)}>{children}</div>;
};

export interface FilterResetButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const FilterResetButton: React.FC<FilterResetButtonProps> = ({
  onClick,
  label = "Reset",
  disabled = false,
  className,
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "text-xs text-rose-600 border-rose-200 bg-rose-50/40 hover:bg-rose-100/60 hover:text-rose-700 hover:border-rose-300 gap-1.5 transition-colors",
        className,
      )}
    >
      <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
      <span>{label}</span>
    </Button>
  );
};

export default ModuleFilterBar;
