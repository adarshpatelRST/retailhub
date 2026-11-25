import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ComboboxItem {
  id: string;
  label: string;
  subLabel?: string;
  badgeText?: string;
}

export interface DropSearchProps {
  items?: ComboboxItem[];
  options?: ComboboxItem[];
  value: string | null;
  onChange?: (value: string | null) => void;
  onSelect?: (value: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allOption?: { id: string; label: string };
  width?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}

export const DropSearch: React.FC<DropSearchProps> = ({
  items,
  options,
  value,
  onChange,
  onSelect,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No matching items found.",
  allOption,
  width = "w-[280px]",
  disabled = false,
  align = "start",
  className,
}) => {
  const effectiveItems = React.useMemo(() => {
    const raw = items ?? options ?? [];
    if (!allOption) return raw;
    return raw.filter(
      (item) =>
        item.id !== allOption.id &&
        item.label.trim().toLowerCase() !== allOption.label.trim().toLowerCase(),
    );
  }, [items, options, allOption]);
  const effectiveChange = onChange ?? onSelect ?? (() => {});
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return effectiveItems;
    const q = search.trim().toLowerCase();
    return effectiveItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.subLabel && item.subLabel.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q)
    );
  }, [effectiveItems, search]);

  const selectedLabel = React.useMemo(() => {
    if (allOption && (value === null || value === allOption.id)) {
      return allOption.label;
    }
    const found = effectiveItems.find((item) => item.id === value);
    return found ? found.label : null;
  }, [effectiveItems, value, allOption]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between font-normal text-left h-10 bg-white border border-slate-300 text-slate-900 shadow-2xs hover:bg-slate-50 hover:border-slate-400 text-xs font-sans px-3 transition-colors",
            width,
            !selectedLabel && "text-slate-400",
            className,
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 size-4 shrink-0 text-slate-400"
            aria-hidden="true"
          />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
          className={cn(
            "z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            width === "w-full" ? "w-[var(--radix-popover-trigger-width)]" : width,
          )}
        >
          <Command shouldFilter={false} className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
            <div
              className="flex items-center border-b px-3"
              cmdk-input-wrapper=""
            >
              <Search
                className="mr-2 h-4 w-4 size-4 shrink-0 opacity-50"
                aria-hidden="true"
              />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={searchPlaceholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Command.List className="max-h-[280px] overflow-y-auto overflow-x-hidden p-1">
              {filteredItems.length === 0 && (
                <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
                  {emptyMessage}
                </Command.Empty>
              )}

              <Command.Group>
                {allOption && (
                  <Command.Item
                    value={allOption.label}
                    onSelect={() => {
                      effectiveChange(null);
                      handleOpenChange(false);
                    }}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 size-4 shrink-0",
                        value === null || value === allOption.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="font-medium">{allOption.label}</span>
                  </Command.Item>
                )}

                {filteredItems.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <Command.Item
                      key={item.id}
                      value={item.id}
                      onSelect={() => {
                        effectiveChange(item.id);
                        handleOpenChange(false);
                      }}
                      className="relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 size-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="min-w-0 flex-1 text-left py-0.5">
                          <div className="font-medium text-slate-900 leading-snug whitespace-normal break-words">
                            {item.label}
                          </div>
                          {item.subLabel && (
                            <div className="text-xs text-muted-foreground leading-tight mt-0.5 whitespace-normal break-words">
                              {item.subLabel}
                            </div>
                          )}
                        </div>
                      </div>
                      {item.badgeText && (
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                          {item.badgeText}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
