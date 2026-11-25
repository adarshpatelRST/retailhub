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
  items: ComboboxItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allOption?: { id: string; label: string };
  width?: string;
  disabled?: boolean;
  className?: string;
}

export const DropSearch: React.FC<DropSearchProps> = ({
  items,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No matching items found.",
  allOption,
  width = "w-[280px]",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const effectiveItems = React.useMemo(() => {
    if (!allOption) return items;
    return items.filter(
      (item) =>
        item.id !== allOption.id &&
        item.label.trim().toLowerCase() !== allOption.label.trim().toLowerCase(),
    );
  }, [items, allOption]);

  const selectedLabel = React.useMemo(() => {
    if (allOption && (value === null || value === allOption.id)) {
      return allOption.label;
    }
    const found = effectiveItems.find((item) => item.id === value);
    return found ? found.label : null;
  }, [effectiveItems, value, allOption]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "justify-between font-normal text-left",
            width,
            !selectedLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown
            className="ml-2 h-4 w-4 size-4 shrink-0 opacity-50"
            aria-hidden="true"
          />
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            width,
          )}
        >
          <Command className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
            <div
              className="flex items-center border-b px-3"
              cmdk-input-wrapper=""
            >
              <Search
                className="mr-2 h-4 w-4 size-4 shrink-0 opacity-50"
                aria-hidden="true"
              />
              <Command.Input
                placeholder={searchPlaceholder}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Command.List className="max-h-[280px] overflow-y-auto overflow-x-hidden p-1">
              <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </Command.Empty>

              <Command.Group>
                {allOption && (
                  <Command.Item
                    value={allOption.label}
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
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

                {effectiveItems.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.subLabel ?? ""} ${item.id}`}
                      onSelect={() => {
                        onChange(item.id);
                        setOpen(false);
                      }}
                      className="relative flex cursor-pointer select-none items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <div className="flex items-center min-w-0">
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 size-4 shrink-0",
                            isSelected ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="truncate">
                          <div className="truncate font-medium">
                            {item.label}
                          </div>
                          {item.subLabel && (
                            <div className="truncate text-xs text-muted-foreground">
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
