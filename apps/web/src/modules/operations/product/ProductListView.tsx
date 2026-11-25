import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Barcode,
  Eye,
  FileSpreadsheet,
  Filter,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServerDataTable } from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DropSearch } from "@/components/ui/DropSearch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { type ProductItem } from "./api/product.api";
import { useProducts, useBrands } from "./hooks/useProducts";
import { useCategoriesTree } from "./hooks/useCategoriesTree";
import { CategoryTreeCombobox } from "./components/CategoryTreeCombobox";
import { ProductDetailModal } from "./components/ProductDetailModal";
import { CreateProductModal } from "./components/CreateProductModal";
import { CsvUploadModal } from "./components/CsvUploadModal";
import { ProductCardMobile } from "./components/ProductCardMobile";

export const ProductListView: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["ADMIN"]);

  // Query filter state
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [selectedBrandId, setSelectedBrandId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [sortBy, setSortBy] = React.useState<string>("sku");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");

  // Modal & Mobile Filter Drawer State
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [csvModalOpen, setCsvModalOpen] = React.useState(false);
  const [inspectedProduct, setInspectedProduct] =
    React.useState<ProductItem | null>(null);

  const { data: productsResponse, isLoading } = useProducts({
    page,
    limit,
    search,
    brandId: selectedBrandId || undefined,
    categoryId: selectedCategoryId || undefined,
    sortBy,
    sortOrder,
  });

  const { data: brands = [] } = useBrands();
  const { categoriesTree } = useCategoriesTree();

  const products = productsResponse?.items ?? [];
  const totalItems = productsResponse?.meta?.total ?? products.length;

  const brandOptions = React.useMemo(
    () =>
      brands.map((b) => ({
        id: b.id,
        value: b.id,
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

  const columns = React.useMemo<ColumnDef<ProductItem>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.sku}
          </span>
        ),
      },
      {
        accessorKey: "productCode",
        header: "Barcode",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
            {row.original.productCode}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Product Name",
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-foreground">
              {row.original.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.brandName ?? row.original.brandCode ?? "Brand"} ·{" "}
              {row.original.categoryName ??
                row.original.categoryCode ??
                "Category"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "unitOfMeasure",
        header: "UOM",
        cell: ({ row }) => (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium">
            {row.original.unitOfMeasure}
          </span>
        ),
      },
      {
        id: "pricing",
        header: "D-Mart Value Pricing",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs line-through text-muted-foreground font-mono">
              MRP {formatCurrency(row.original.mrp)}
            </span>
            <span className="font-semibold text-primary font-mono text-sm">
              {formatCurrency(row.original.sellingPrice)}
            </span>
          </div>
        ),
      },
      {
        id: "totalStock",
        header: "Total Stock",
        cell: ({ row }) => {
          const stock = row.original.totalStockUnits ?? 0;
          const badgeStatus =
            stock <= 0 ? "CRITICAL" : stock < 25 ? "LOW" : "HEALTHY";
          return (
            <StatusBadge
              status={badgeStatus}
              label={`${formatNumber(stock)} ${row.original.unitOfMeasure}`}
            />
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.isActive ? "HEALTHY" : "REJECTED"}
            label={row.original.isActive ? "ACTIVE" : "INACTIVE"}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInspectedProduct(row.original)}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Inspect
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Master Product Catalog & SKU Management"
      subtitle="High-velocity D-Mart / JioMart catalog with barcode-first lookup, drill-down category taxonomy, and value pricing."
      breadcrumbs={[
        { label: "Operations", href: "/operations" },
        { label: "Product Catalog" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCsvModalOpen(true)}
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            <span>Import SKUs (CSV)</span>
          </Button>
          {isAdmin && (
            <StandardButton
              type="button"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setCreateModalOpen(true)}
            >
              Add Product
            </StandardButton>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Desktop & Tablet Filter Bar (>= 640px) */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-3 rounded-lg border bg-card p-3.5">
          {/* RH_SearchBox with Barcode-First Search */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Scan barcode (8+ digits) or search SKU / name..."
              className="pl-9 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <DropSearch
              options={brandOptions}
              value={selectedBrandId}
              onSelect={(val) => {
                setSelectedBrandId(val);
                setPage(1);
              }}
              placeholder="Filter by Brand..."
            />
          </div>

          <div className="sm:col-span-3">
            <CategoryTreeCombobox
              categories={categoriesTree}
              value={selectedCategoryId}
              onSelect={(catId) => {
                setSelectedCategoryId(catId);
                setPage(1);
              }}
              allowClear
              placeholder="Filter by Category..."
            />
          </div>

          <div className="sm:col-span-1 flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleResetFilters}
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Search + Bottom Sheet Filter Trigger (< 640px) */}
        <div className="flex sm:hidden items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Barcode or SKU search..."
              className="pl-9 font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
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
            totalPages={productsResponse?.meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / limit))}
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
          {products.map((product) => (
            <ProductCardMobile
              key={product.id}
              product={product}
              onInspect={setInspectedProduct}
            />
          ))}
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
                onSelect={(val) => {
                  setSelectedBrandId(val);
                  setPage(1);
                }}
                placeholder="Select Brand..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <CategoryTreeCombobox
                categories={categoriesTree}
                value={selectedCategoryId}
                onSelect={(catId) => {
                  setSelectedCategoryId(catId);
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
        onOpenChange={(open) => {
          if (!open) setInspectedProduct(null);
        }}
      />

      <CreateProductModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        brands={brands}
        categories={categoriesTree}
      />

      <CsvUploadModal open={csvModalOpen} onOpenChange={setCsvModalOpen} />
    </PageLayout>
  );
};
