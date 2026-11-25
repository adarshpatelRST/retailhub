import * as React from "react";
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileSpreadsheet,
  Filter,
  Package,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DropSearch } from "@/components/ui/DropSearch";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { type ProductItem, productApi } from "@/api/product.api";
import { useProducts, useBrands } from "@/hooks/useProducts";
import { useCategoriesTree } from "@/hooks/useCategoriesTree";
import { CategoryTreeCombobox } from "@/components/products/CategoryTreeCombobox";
import { ProductDetailModal } from "@/components/products/ProductDetailModal";
import { CreateProductModal } from "@/components/products/CreateProductModal";
import { CsvUploadModal } from "@/components/products/CsvUploadModal";
import { ProductCardMobile } from "@/components/products/ProductCardMobile";

export const ProductListView: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  // Query filter state
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [selectedBrandId, setSelectedBrandId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("sku");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Modal & Mobile Filter Drawer State
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const [inspectedProduct, setInspectedProduct] =
    React.useState<ProductItem | null>(null);
  const [productToEdit, setProductToEdit] =
    React.useState<ProductItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [csvModalOpen, setCsvModalOpen] = React.useState(false);

  // Queries
  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
  } = useProducts({
    page,
    limit,
    search: search.trim() || undefined,
    brandId: selectedBrandId || undefined,
    categoryId: selectedCategoryId || undefined,
    sortBy,
    sortOrder,
  });

  const { data: brands = [] } = useBrands();
  const { data: categoriesTree = [] } = useCategoriesTree();

  const products = productsResponse?.items ?? [];
  const totalItems = productsResponse?.meta?.total ?? products.length;
  const totalPages =
    productsResponse?.meta?.totalPages ??
    Math.max(1, Math.ceil(totalItems / limit));

  const brandOptions = React.useMemo(
    () =>
      brands.map((b: any) => ({
        id: b.id,
        label: `${b.name} (${b.brandCode})`,
      })),
    [brands],
  );

  const handleResetFilters = () => {
    setSearch("");
    setSelectedBrandId("");
    setSelectedCategoryId("");
    setPage(1);
  };

  const handleEditProduct = (product: ProductItem) => {
    setProductToEdit(product);
    setCreateModalOpen(true);
  };

  const handleToggleStatus = async (product: ProductItem, newActive: boolean) => {
    try {
      await productApi.updateProduct(product.id, { isActive: newActive });
      toast.success(
        `Product "${product.name}" is now ${newActive ? "active" : "inactive"}.`,
      );
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product status.");
    }
  };

  const columns = React.useMemo<ServerColumn<ProductItem>[]>(
    () => [
      {
        key: "sku",
        header: "SKU",
        sortable: false,
        widthClass: "min-w-[120px]",
        render: (row) => (
          <button
            type="button"
            onClick={() => setInspectedProduct(row)}
            className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {row.sku}
          </button>
        ),
      },
      {
        key: "productCode",
        header: "Barcode",
        sortable: false,
        widthClass: "min-w-[150px]",
        render: (row) => (
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700 whitespace-nowrap">
            <span className="font-serif tracking-tighter text-slate-400 select-none text-xs">||||</span>
            <span>{row.productCode}</span>
          </div>
        ),
      },
      {
        key: "name",
        header: "Product Name",
        sortable: false,
        widthClass: "min-w-[260px]",
        render: (row) => (
          <div className="flex flex-col min-w-0 max-w-[340px]">
            <span className="font-semibold text-slate-900 text-xs truncate" title={row.name}>
              {row.name}
            </span>
            <span
              className="text-[11px] text-muted-foreground truncate"
              title={`${row.brandName ?? row.brandCode ?? "Brand"} · ${row.categoryName ?? row.categoryCode ?? "Category"}`}
            >
              {row.brandName ?? row.brandCode ?? "Brand"} · {row.categoryName ?? row.categoryCode ?? "Category"}
            </span>
          </div>
        ),
      },
      {
        key: "unitOfMeasure",
        header: "UOM",
        sortable: false,
        widthClass: "min-w-[90px]",
        render: (row) => (
          <span className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
            {row.unitOfMeasure}
          </span>
        ),
      },
      {
        key: "pricing",
        header: "Pricing (MRP & Selling Price)",
        sortable: false,
        widthClass: "min-w-[170px]",
        render: (row) => (
          <div className="flex flex-col font-mono text-xs">
            <span className="text-[10px] line-through text-muted-foreground">
              MRP {formatCurrency(row.mrp)}
            </span>
            <span className="font-semibold text-blue-600">
              {formatCurrency(row.sellingPrice)}
            </span>
          </div>
        ),
      },
      {
        key: "totalStockUnits",
        header: "Total Stock",
        sortable: false,
        widthClass: "min-w-[120px]",
        render: (row) => {
          const qty = row.totalStockUnits ?? 0;
          const badgeClass =
            qty <= 0
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : qty <= 15
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700";
          return (
            <span
              className={cn(
                "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold",
                badgeClass,
              )}
            >
              {formatNumber(qty)} {row.unitOfMeasure}
            </span>
          );
        },
      },
      {
        key: "isActive",
        header: "Status",
        sortable: false,
        widthClass: "min-w-[130px]",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.isActive}
              onCheckedChange={(val) => handleToggleStatus(row, val)}
              aria-label={`Toggle status for ${row.name}`}
              className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-slate-200 border-2 border-transparent cursor-pointer"
            />
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider", row.isActive ? "text-emerald-700" : "text-slate-400")}>
              {row.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        sortable: false,
        widthClass: "min-w-[90px]",
        render: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setInspectedProduct(row)}
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              aria-label="Inspect product details"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleEditProduct(row)}
                className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                aria-label="Edit product"
                title="Edit Product"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [isAdmin],
  );

  return (
    <PageLayout
      title="Master Product & Pricing Catalog"
      subtitle="Enterprise SKU repository, D-Mart value pricing tiers, and real-time network stock visibility."
      breadcrumbs={[
        { label: "Operations", href: "/operations" },
        { label: "Product Catalog" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <StandardButton
                type="button"
                variant="outline"
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                onClick={() => setCsvModalOpen(true)}
              >
                Import CSV
              </StandardButton>
              <StandardButton
                type="button"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setProductToEdit(null);
                  setCreateModalOpen(true);
                }}
              >
                New Product
              </StandardButton>
            </>
          )}
        </div>
      }
      error={error as Error | null}
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        {/* Module Filter Bar with Search, Brand, and Category Tree */}
        <div className="hidden sm:block">
          <ModuleFilterBar
            title="Product Catalog & Master SKU Filters"
            icon={<Filter className="h-4 w-4 text-emerald-700" />}
            actions={<FilterResetButton onClick={handleResetFilters} />}
          >
            <ModuleFilterGrid columns={3}>
              {/* Filter 1: Search */}
              <ModuleFilterItem label="Search SKU / Barcode / Name">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Scan barcode (8+ digits) or search SKU / name..."
                    className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                  />
                </div>
              </ModuleFilterItem>

              {/* Filter 2: Brand DropSearch */}
              <ModuleFilterItem label="Brand">
                <DropSearch
                  options={brandOptions}
                  value={selectedBrandId}
                  onSelect={(val: any) => {
                    setSelectedBrandId(val || "");
                    setPage(1);
                  }}
                  allOption={{ id: "", label: "All Brands" }}
                  placeholder="All Brands"
                  searchPlaceholder="Search brand name or code..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>

              {/* Filter 3: Category Tree Combobox */}
              <ModuleFilterItem label="Category">
                <CategoryTreeCombobox
                  categories={categoriesTree}
                  value={selectedCategoryId}
                  onSelect={(catId: any) => {
                    setSelectedCategoryId(catId || "");
                    setPage(1);
                  }}
                  allowClear
                  placeholder="Filter by Category..."
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          </ModuleFilterBar>
        </div>

        {/* Mobile Filter Trigger (< 640px) */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search SKU or scan..."
              className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileFilterOpen(true)}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Desktop & Tablet ServerDataTable (>= 640px) */}
        <div className="hidden sm:block">
          <ServerDataTable
            columns={columns}
            data={products}
            totalItems={totalItems}
            totalPages={totalPages}
            page={page}
            pageSize={limit}
            isLoading={isLoading}
            onPageChange={setPage}
            onSortChange={(field, direction) => {
              setSortBy(field);
              setSortOrder(direction);
            }}
          />
        </div>

        {/* Mobile Responsive Card List (< 640px) */}
        <div className="grid grid-cols-1 gap-3 sm:hidden">
          {products.map((product: any) => (
            <ProductCardMobile
              key={product.id}
              product={product}
              onInspect={setInspectedProduct}
              onEdit={isAdmin ? handleEditProduct : undefined}
            />
          ))}

          {/* Mobile Pagination Toolbar */}
          {products.length > 0 && (
            <div className="flex items-center justify-between border-t pt-3 mt-1 text-xs text-muted-foreground">
              <span className="font-mono">
                {totalItems} records
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    value={page}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                      if (!isNaN(val)) {
                        setPage(Math.max(1, Math.min(totalPages, val)));
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
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next Page"
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Sheet Filters */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="h-[80dvh] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Filter Product Catalog</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <DropSearch
                options={brandOptions}
                value={selectedBrandId}
                onSelect={(val: any) => {
                  setSelectedBrandId(val || "");
                  setPage(1);
                }}
                allOption={{ id: "", label: "All Brands" }}
                placeholder="All Brands"
                searchPlaceholder="Search brand name or code..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <CategoryTreeCombobox
                categories={categoriesTree}
                value={selectedCategoryId}
                onSelect={(catId: any) => {
                  setSelectedCategoryId(catId || "");
                  setPage(1);
                }}
                allowClear
                placeholder="Select Category..."
              />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
      <ProductDetailModal
        product={inspectedProduct}
        open={Boolean(inspectedProduct)}
        onOpenChange={(open: boolean) => {
          if (!open) setInspectedProduct(null);
        }}
      />

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setProductToEdit(null);
        }}
        productToEdit={productToEdit}
        brands={brands}
        categories={categoriesTree}
        onSuccess={() => refetch()}
      />

      <CsvUploadModal open={csvModalOpen} onOpenChange={setCsvModalOpen} />
    </PageLayout>
  );
};

export const ProductsPage = ProductListView;
export default ProductListView;
