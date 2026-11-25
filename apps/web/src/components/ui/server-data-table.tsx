import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface ServerColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  widthClass?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export interface ServerDataTableProps<T extends { id: string }> {
  data: T[];
  columns: ServerColumn<T>[];
  loading?: boolean;
  page: number;
  totalPages: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string, direction: "asc" | "desc") => void;
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyMessage?: string;
  toolbarActions?: React.ReactNode;
  className?: string;
}

export function ServerDataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  page,
  totalPages,
  pageSize = 20,
  totalItems,
  onPageChange,
  onPageSizeChange,
  searchValue = "",
  searchPlaceholder = "Search by barcode, SKU, or name...",
  onSearchChange,
  sortKey: controlledSortKey,
  sortDirection: controlledSortDir,
  onSortChange,
  enableSelection = false,
  selectedIds = [],
  onSelectionChange,
  emptyMessage = "No matching records found.",
  toolbarActions,
  className,
}: ServerDataTableProps<T>) {
  const [internalSearch, setInternalSearch] = React.useState(searchValue);
  const [internalSortKey, setInternalSortKey] = React.useState<string | null>(
    controlledSortKey ?? null,
  );
  const [internalSortDir, setInternalSortDir] = React.useState<"asc" | "desc">(
    controlledSortDir ?? "asc",
  );

  const activeSortKey = controlledSortKey ?? internalSortKey;
  const activeSortDir = controlledSortDir ?? internalSortDir;

  const allRowIds = React.useMemo(() => data.map((row) => row.id), [data]);
  const isAllSelected =
    data.length > 0 && allRowIds.every((id) => selectedIds.includes(id));

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const merged = Array.from(new Set([...selectedIds, ...allRowIds]));
      onSelectionChange(merged);
    } else {
      onSelectionChange(selectedIds.filter((id) => !allRowIds.includes(id)));
    }
  };

  const handleToggleRow = (rowId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, rowId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
    }
  };

  const handleColumnSort = (key: string) => {
    const nextDir: "asc" | "desc" =
      activeSortKey === key && activeSortDir === "asc" ? "desc" : "asc";
    setInternalSortKey(key);
    setInternalSortDir(nextDir);
    onSortChange?.(key, nextDir);
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      {/* Top Search & Bulk Action Toolbar */}
      {(onSearchChange || toolbarActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b p-4">
          {onSearchChange ? (
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 size-4 -translate-y-1/2 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <Input
                value={internalSearch}
                onChange={(e) => {
                  setInternalSearch(e.target.value);
                  onSearchChange(e.target.value);
                }}
                placeholder={searchPlaceholder}
                className="pl-9 h-9 text-sm"
              />
            </div>
          ) : (
            <div />
          )}

          {toolbarActions && (
            <div className="flex flex-wrap items-center gap-2">
              {toolbarActions}
            </div>
          )}
        </div>
      )}

      {/* Data Grid Container */}
      <div className="relative overflow-x-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium shadow-xs">
              <Loader2 className="h-4 w-4 size-4 animate-spin text-primary shrink-0" />
              <span>Loading records...</span>
            </div>
          </div>
        )}

        <table className="w-full caption-bottom text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {enableSelection && (
                <th className="h-10 w-10 px-4 text-left align-middle">
                  <Checkbox
                    aria-label="Select all rows on page"
                    checked={isAllSelected}
                    onCheckedChange={(val) => handleToggleAll(Boolean(val))}
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = activeSortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "h-10 px-4 align-middle text-xs font-semibold text-muted-foreground select-none",
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left",
                      col.widthClass,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleColumnSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          activeSortDir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 size-3.5 text-foreground shrink-0" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 size-3.5 text-foreground shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 size-3.5 opacity-40 shrink-0" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (enableSelection ? 1 : 0)}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    {enableSelection && (
                      <td className="px-4 py-3 align-middle">
                        <Checkbox
                          aria-label={`Select row ${row.id}`}
                          checked={isSelected}
                          onCheckedChange={(val) =>
                            handleToggleRow(row.id, Boolean(val))
                          }
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle",
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                              ? "text-center"
                              : "text-left",
                          col.widthClass,
                        )}
                      >
                        {col.render(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums">
            Page <strong className="text-foreground">{page}</strong> of{" "}
            <strong className="text-foreground">
              {Math.max(1, totalPages)}
            </strong>
          </span>
          {typeof totalItems === "number" && (
            <span>· {totalItems.toLocaleString("en-IN")} total rows</span>
          )}
          {enableSelection && selectedIds.length > 0 && (
            <span className="font-medium text-primary">
              · {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                aria-label="Items per page"
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground"
              >
                {[10, 20, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 size-3.5 shrink-0" />
              <span>Previous</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-2.5 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5 size-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
