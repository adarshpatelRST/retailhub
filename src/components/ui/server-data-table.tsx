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
  columns: any[];
  loading?: boolean;
  isLoading?: boolean;
  page: number;
  totalPages?: number;
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
  isRowSelectable?: (row: T) => boolean;
  emptyMessage?: string;
  toolbarActions?: React.ReactNode;
  className?: string;
}

export function ServerDataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  isLoading = false,
  page,
  totalPages = 1,
  pageSize = 10,
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
  isRowSelectable,
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

  const [pageInput, setPageInput] = React.useState<string>(String(page));

  React.useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handlePageCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    const max = Math.max(1, totalPages);
    if (!isNaN(parsed)) {
      const clamped = Math.max(1, Math.min(max, parsed));
      onPageChange(clamped);
      setPageInput(String(clamped));
    } else {
      setPageInput(String(page));
    }
  };

  const selectableRows = React.useMemo(() => {
    if (!isRowSelectable) return data;
    return data.filter(isRowSelectable);
  }, [data, isRowSelectable]);

  const selectableRowIds = React.useMemo(
    () => selectableRows.map((row) => row.id),
    [selectableRows],
  );

  const isAllSelected =
    selectableRowIds.length > 0 &&
    selectableRowIds.every((id) => selectedIds.includes(id));

  const handleToggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      const merged = Array.from(new Set([...selectedIds, ...selectableRowIds]));
      onSelectionChange(merged);
    } else {
      onSelectionChange(selectedIds.filter((id) => !selectableRowIds.includes(id)));
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
        {(loading || isLoading) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium shadow-xs">
              <Loader2 className="h-4 w-4 size-4 animate-spin text-primary shrink-0" />
              <span>Loading records...</span>
            </div>
          </div>
        )}

        <table className="w-full caption-bottom text-sm min-w-max border-collapse">
          <thead className="border-b bg-slate-50/80">
            <tr>
              {enableSelection && (
                <th className="h-11 w-10 px-4 text-left align-middle whitespace-nowrap">
                  <Checkbox
                    aria-label="Select all rows on page"
                    checked={isAllSelected}
                    onCheckedChange={(val) => handleToggleAll(Boolean(val))}
                  />
                </th>
              )}

              {columns.map((col, colIndex) => {
                const colKey = col.key ?? col.accessorKey ?? col.id ?? `col-${colIndex}`;
                const isSorted = activeSortKey === colKey;
                return (
                  <th
                    key={colKey}
                    className={cn(
                      "h-11 px-4 align-middle text-xs font-bold uppercase tracking-wider text-slate-600 select-none whitespace-nowrap",
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
                        onClick={() => handleColumnSort(colKey)}
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
                  className="h-28 text-center text-sm text-muted-foreground whitespace-nowrap"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = row.id ?? (row as any)._id ?? `row-${rowIndex}`;
                const isSelected = selectedIds.includes(row.id);
                return (
                  <tr
                    key={rowKey}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    {enableSelection && (
                      <td className="px-4 py-3 align-middle whitespace-nowrap">
                        {(() => {
                          const canSelect = isRowSelectable ? isRowSelectable(row) : true;
                          return (
                            <Checkbox
                              aria-label={`Select row ${row.id}`}
                              checked={isSelected}
                              disabled={!canSelect}
                              className={!canSelect ? "opacity-30 cursor-not-allowed" : ""}
                              onCheckedChange={(val) => {
                                if (canSelect) {
                                  handleToggleRow(row.id, Boolean(val));
                                }
                              }}
                            />
                          );
                        })()}
                      </td>
                    )}
                    {columns.map((col, colIndex) => {
                      const colKey =
                        col.key ?? col.accessorKey ?? col.id ?? `col-${colIndex}`;
                      const cellContent =
                        typeof col.render === "function"
                          ? col.render(row, rowIndex)
                          : typeof col.cell === "function"
                            ? col.cell({ row: { original: row } })
                            : (row as any)[colKey] ?? null;

                      return (
                        <td
                          key={colKey}
                          className={cn(
                            "px-4 py-3 align-middle whitespace-nowrap",
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left",
                            col.widthClass,
                          )}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
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
          {(() => {
            const count = typeof totalItems === "number" ? totalItems : data.length;
            const startItem = count === 0 || data.length === 0 ? 0 : (page - 1) * pageSize + 1;
            const endItem = Math.min(page * pageSize, count);
            const computedTotalPages = Math.max(1, totalPages || Math.ceil(count / pageSize));

            return (
              <span className="font-medium text-slate-600">
                {count === 0
                  ? "Showing 0 results"
                  : `Showing ${startItem}-${endItem} of ${count} results`}
              </span>
            );
          })()}
          {enableSelection && selectedIds.length > 0 && (
            <span className="font-medium text-primary">
              · {selectedIds.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 1 || loading || isLoading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous Page"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
            <input
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={pageInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setPageInput(val);
              }}
              onBlur={() => handlePageCommit(pageInput)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePageCommit(pageInput);
                }
              }}
              className="h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-center font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-slate-500 font-medium">of {Math.max(1, totalPages)}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page >= totalPages || loading || isLoading}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next Page"
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
