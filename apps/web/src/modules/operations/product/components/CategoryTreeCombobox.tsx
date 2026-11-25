import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Check,
  Search,
  X,
  CornerUpLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type CategoryNode } from "../api/product.api";
import {
  flattenCategoryTree,
  findCategoryPathById,
  countTotalDescendants,
} from "../hooks/useCategoriesTree";

export interface CategoryTreeComboboxProps {
  categories: CategoryNode[];
  value?: string;
  onSelect: (categoryId: string, categoryNode?: CategoryNode) => void;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export const CategoryTreeCombobox: React.FC<CategoryTreeComboboxProps> = ({
  categories,
  value,
  onSelect,
  placeholder = "Select category...",
  disabled = false,
  allowClear = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPath, setCurrentPath] = React.useState<CategoryNode[]>([]);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(0);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const flattenedAll = React.useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );

  const selectedPath = React.useMemo(() => {
    if (!value) return null;
    return findCategoryPathById(categories, value);
  }, [categories, value]);

  const selectedLeaf = selectedPath
    ? selectedPath[selectedPath.length - 1]
    : null;

  // Visible nodes at the current drill-down level when not searching
  const currentLevelNodes = React.useMemo(() => {
    if (currentPath.length === 0) {
      return categories;
    }
    const activeParent = currentPath[currentPath.length - 1];
    return activeParent.subCategories ?? [];
  }, [categories, currentPath]);

  // Global leaf search results when user types in search box
  const searchResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return flattenedAll.filter(
      (item) =>
        item.isLeaf &&
        (item.name.toLowerCase().includes(q) ||
          item.categoryCode.toLowerCase().includes(q) ||
          item.breadcrumbTrail.some((seg) => seg.toLowerCase().includes(q))),
    );
  }, [flattenedAll, searchQuery]);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [currentPath, searchQuery, open]);

  React.useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
    } else {
      setSearchQuery("");
    }
  }, [open]);

  const handleDrillIntoFolder = (folder: CategoryNode) => {
    if (folder.subCategories && folder.subCategories.length > 0) {
      setCurrentPath((prev) => [...prev, folder]);
    } else {
      onSelect(folder.id, folder);
      setOpen(false);
    }
  };

  const handleJumpBreadcrumb = (index: number) => {
    if (index < 0) {
      setCurrentPath([]);
    } else {
      setCurrentPath((prev) => prev.slice(0, index + 1));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isSearching = searchQuery.trim().length > 0;
    const itemCount = isSearching
      ? searchResults.length
      : currentLevelNodes.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (itemCount > 0) {
        setHighlightedIndex((prev) => (prev + 1) % itemCount);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (itemCount > 0) {
        setHighlightedIndex((prev) => (prev - 1 + itemCount) % itemCount);
      }
    } else if (e.key === "ArrowRight" && !isSearching) {
      const targetNode = currentLevelNodes[highlightedIndex];
      if (
        targetNode &&
        targetNode.subCategories &&
        targetNode.subCategories.length > 0
      ) {
        e.preventDefault();
        setCurrentPath((prev) => [...prev, targetNode]);
      }
    } else if (e.key === "ArrowLeft" && !isSearching) {
      if (currentPath.length > 0) {
        e.preventDefault();
        setCurrentPath((prev) => prev.slice(0, prev.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isSearching) {
        const hit = searchResults[highlightedIndex];
        if (hit) {
          onSelect(hit.id, hit.node);
          setOpen(false);
        }
      } else {
        const targetNode = currentLevelNodes[highlightedIndex];
        if (targetNode) {
          handleDrillIntoFolder(targetNode);
        }
      }
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <span className="truncate text-left">
              {selectedLeaf && selectedPath ? (
                <span className="flex items-center gap-1.5 truncate">
                  <span className="font-medium text-foreground">
                    {selectedLeaf.name}
                  </span>
                  {selectedPath.length > 1 && (
                    <span className="truncate text-xs text-muted-foreground">
                      ({selectedPath.slice(0, -1).map((n) => n.name).join(" > ")})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverPrimitive.Trigger>

        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("");
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Clear category"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onKeyDown={handleKeyDown}
          className={cn(
            "z-50 w-[340px] sm:w-[400px] rounded-md border bg-popover text-popover-foreground shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        >
          {/* Instant Global Search Bar */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category or drill down..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Breadcrumb Trail Header */}
          {!searchQuery.trim() && (
            <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2.5 py-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (currentPath.length === 0 && allowClear) {
                    onSelect("");
                    setOpen(false);
                  } else {
                    handleJumpBreadcrumb(-1);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium transition-colors cursor-pointer",
                  currentPath.length === 0
                    ? (!value ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted")
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={allowClear && currentPath.length === 0 ? "Select All Categories" : "Navigate to All Categories"}
              >
                <span aria-hidden="true">🏠</span>
                <span>All</span>
              </button>

              {currentPath.map((crumb, idx) => {
                const isLast = idx === currentPath.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/70" />
                    <button
                      type="button"
                      onClick={() => handleJumpBreadcrumb(idx)}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium transition-colors truncate max-w-[130px]",
                        isLast
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                );
              })}

              {currentPath.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPath((prev) => prev.slice(0, prev.length - 1))
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Navigate up (ArrowLeft)"
                >
                  <CornerUpLeft className="h-3 w-3" />
                  <span>Up</span>
                </button>
              )}
            </div>
          )}

          {/* Category Node List or Search Results */}
          <div className="max-h-64 overflow-y-auto p-1">
            {searchQuery.trim().length > 0 ? (
              searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching leaf categories found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const isSelected = value === item.id;
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelect(item.id, item.node);
                        setOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                        isHighlighted
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/60",
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">
                            {item.name}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            ({item.parentTrailLabel})
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate">
                          {item.breadcrumbTrail.join(" > ")}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              )
            ) : (
              <>
                {allowClear && currentPath.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors border-b border-border/60 mb-1 cursor-pointer",
                      !value
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {!value ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                        )}
                      </div>
                      <span className="font-medium truncate">All Categories</span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">All</span>
                  </button>
                )}
                {currentLevelNodes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    No categories available at this level.
                  </div>
                ) : (
                  currentLevelNodes.map((node, idx) => {
                const hasSubCategories =
                  Array.isArray(node.subCategories) &&
                  node.subCategories.length > 0;
                const subCount = hasSubCategories
                  ? node.subCategories.length
                  : countTotalDescendants(node);
                const isSelected = value === node.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleDrillIntoFolder(node)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                      isHighlighted
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {hasSubCategories ? (
                        <Folder className="h-4 w-4 shrink-0 text-blue-500" />
                      ) : (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                          )}
                        </div>
                      )}
                      <span
                        className={cn(
                          "truncate",
                          isSelected && "font-semibold text-primary",
                        )}
                      >
                        {node.name}
                      </span>
                    </div>

                    {hasSubCategories ? (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                        <span>({subCount})</span>
                        <span aria-hidden="true">➔</span>
                      </span>
                    ) : (
                      <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                        {node.categoryCode}
                      </span>
                    )}
                  </button>
                );
              })
            )}
            </>
            )}
          </div>

          {/* Keyboard Navigation Hint Footer */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span>↑↓ Navigate · ➔ Drill In · ← Back</span>
            <span>Enter to select leaf</span>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
