import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  FolderTree,
  Tag,
  Tags,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Edit3,
  Search,
  Building2,
  Layers,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  List,
  GitFork,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import {
  productApi,
  type CategoryFlatItem,
  type CategoryNode,
  type BrandItem,
} from "@/api/product.api";
import { useDebounce } from "@/hooks/useDebounce";

// Helper to filter Category Tree hierarchically
function filterCategoryTree(nodes: CategoryNode[], query: string): CategoryNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  return nodes
    .map((node) => {
      const matchesSelf =
        node.name.toLowerCase().includes(q) ||
        (node.categoryCode && node.categoryCode.toLowerCase().includes(q));
      const filteredChildren = filterCategoryTree(node.subCategories ?? [], query);
      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...node,
          subCategories: filteredChildren,
        };
      }
      return null;
    })
    .filter((n): n is CategoryNode => n !== null);
}

export const CategoriesBrandsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"CATEGORIES" | "BRANDS">("CATEGORIES");

  // Category State
  const [categorySearch, setCategorySearch] = useState("");
  const debouncedCategorySearch = useDebounce(categorySearch, 300);
  const [categoryViewMode, setCategoryViewMode] = useState<"TREE" | "TABLE">("TREE");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryFlatItem | null>(null);

  // New Category Form State & Errors
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>("ROOT");
  const [createCategoryErrors, setCreateCategoryErrors] = useState<{
    code?: string;
    name?: string;
    parent?: string;
  }>({});

  // Edit Category Form State & Errors
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryParentId, setEditCategoryParentId] = useState<string>("ROOT");
  const [editCategoryIsActive, setEditCategoryIsActive] = useState(true);
  const [editCategoryErrors, setEditCategoryErrors] = useState<{
    name?: string;
    parent?: string;
  }>({});

  // Brand State
  const [brandSearch, setBrandSearch] = useState("");
  const debouncedBrandSearch = useDebounce(brandSearch, 300);
  const [createBrandModalOpen, setCreateBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);

  // New Brand Form State & Errors
  const [newBrandCode, setNewBrandCode] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [createBrandErrors, setCreateBrandErrors] = useState<{
    code?: string;
    name?: string;
  }>({});

  // Edit Brand Form State & Errors
  const [editBrandName, setEditBrandName] = useState("");
  const [editBrandIsActive, setEditBrandIsActive] = useState(true);
  const [editBrandErrors, setEditBrandErrors] = useState<{
    name?: string;
  }>({});

  // Category Tree Hierarchy Pagination State
  const [treePage, setTreePage] = useState(1);
  const [treePageInput, setTreePageInput] = useState("1");
  const treePageSize = 5;

  // Queries
  const {
    data: categoriesTree = [],
    isLoading: categoriesTreeLoading,
    refetch: refetchCategoriesTree,
  } = useQuery({
    queryKey: ["categories-tree"],
    queryFn: () => productApi.getCategoriesTree(),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const {
    data: categoriesFlat = [],
    isLoading: categoriesFlatLoading,
    refetch: refetchCategoriesFlat,
  } = useQuery({
    queryKey: ["categories-flat"],
    queryFn: () => productApi.getCategoriesFlat(),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const {
    data: brands = [],
    isLoading: brandsLoading,
    refetch: refetchBrands,
  } = useQuery({
    queryKey: ["brands-list"],
    queryFn: () => productApi.getBrands(),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // Auto-expand all categories when tree loads
  React.useEffect(() => {
    if (categoriesFlat.length > 0 && expandedCategoryIds.size === 0) {
      const allIds = new Set(categoriesFlat.map((c) => c.id));
      setExpandedCategoryIds(allIds);
    }
  }, [categoriesFlat]);

  // Cleanly reset create modal inputs and errors whenever opened
  React.useEffect(() => {
    if (createCategoryModalOpen) {
      setNewCategoryCode("");
      setNewCategoryName("");
      setNewCategoryParentId("ROOT");
      setCreateCategoryErrors({});
    }
  }, [createCategoryModalOpen]);

  React.useEffect(() => {
    if (createBrandModalOpen) {
      setNewBrandCode("");
      setNewBrandName("");
      setCreateBrandErrors({});
    }
  }, [createBrandModalOpen]);

  // Tree search and pagination calculation
  const filteredTreeCategories = useMemo(
    () => filterCategoryTree(categoriesTree, debouncedCategorySearch),
    [categoriesTree, debouncedCategorySearch],
  );

  const totalTreePages = Math.max(1, Math.ceil(filteredTreeCategories.length / treePageSize));

  React.useEffect(() => {
    setTreePage(1);
    setTreePageInput("1");
  }, [debouncedCategorySearch]);

  React.useEffect(() => {
    setTreePageInput(String(treePage));
  }, [treePage]);

  const paginatedTreeNodes = useMemo(() => {
    const start = (treePage - 1) * treePageSize;
    return filteredTreeCategories.slice(start, start + treePageSize);
  }, [filteredTreeCategories, treePage, treePageSize]);

  // Mutations - Categories
  const createCategoryMutation = useMutation({
    mutationFn: (data: { code: string; name: string; parentCategoryId?: string | null }) =>
      productApi.createCategory(data),
    onSuccess: () => {
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["categories-tree"] });
      queryClient.invalidateQueries({ queryKey: ["categories-flat"] });
      setCreateCategoryModalOpen(false);
      resetCategoryForm();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || "Failed to create category";
      if (msg.includes("Category code already exists")) {
        setCreateCategoryErrors((prev) => ({ ...prev, code: msg }));
      } else if (msg.includes("subcategory with this name already exists")) {
        setCreateCategoryErrors((prev) => ({ ...prev, name: msg }));
      }
      toast.error(msg);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; parentCategoryId?: string | null; isActive?: boolean };
    }) => productApi.updateCategory(id, data),
    onSuccess: () => {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["categories-tree"] });
      queryClient.invalidateQueries({ queryKey: ["categories-flat"] });
      setEditingCategory(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || "Failed to update category";
      if (msg.includes("subcategory with this name already exists")) {
        setEditCategoryErrors((prev) => ({ ...prev, name: msg }));
      }
      toast.error(msg);
    },
  });

  // Mutations - Brands
  const createBrandMutation = useMutation({
    mutationFn: (data: { code: string; name: string }) => productApi.createBrand(data),
    onSuccess: () => {
      toast.success("Brand created successfully");
      queryClient.invalidateQueries({ queryKey: ["brands-list"] });
      setCreateBrandModalOpen(false);
      setNewBrandCode("");
      setNewBrandName("");
      setCreateBrandErrors({});
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || "Failed to create brand";
      if (msg.includes("Brand code already exists")) {
        setCreateBrandErrors((prev) => ({ ...prev, code: msg }));
      } else if (msg.includes("Brand name already exists")) {
        setCreateBrandErrors((prev) => ({ ...prev, name: msg }));
      }
      toast.error(msg);
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; isActive?: boolean };
    }) => productApi.updateBrand(id, data),
    onSuccess: () => {
      toast.success("Brand updated successfully");
      queryClient.invalidateQueries({ queryKey: ["brands-list"] });
      setEditingBrand(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || err.message || "Failed to update brand";
      if (msg.includes("Brand name already exists")) {
        setEditBrandErrors((prev) => ({ ...prev, name: msg }));
      }
      toast.error(msg);
    },
  });

  // Category helpers
  const resetCategoryForm = () => {
    setNewCategoryCode("");
    setNewCategoryName("");
    setNewCategoryParentId("ROOT");
    setCreateCategoryErrors({});
  };

  const toggleExpand = (id: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Build category ancestry breadcrumb for select options
  const categoryOptions = useMemo(() => {
    const map = new Map(categoriesFlat.map((c) => [c.id, c]));

    const getBreadcrumb = (cat: CategoryFlatItem): string => {
      const parts = [cat.name];
      let current = cat;
      while (current.parentCategoryId && map.has(current.parentCategoryId)) {
        current = map.get(current.parentCategoryId)!;
        parts.unshift(current.name);
      }
      return parts.join(" > ");
    };

    return categoriesFlat.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      breadcrumb: getBreadcrumb(c),
    }));
  }, [categoriesFlat]);

  // Prevent cycle in edit category parent selector (cannot select self or descendants)
  const validEditParentOptions = useMemo(() => {
    if (!editingCategory) return [];

    // Find all descendant IDs of editingCategory
    const descendantIds = new Set<string>();
    const collectDescendants = (parentId: string) => {
      categoriesFlat
        .filter((c) => c.parentCategoryId === parentId)
        .forEach((child) => {
          descendantIds.add(child.id);
          collectDescendants(child.id);
        });
    };
    collectDescendants(editingCategory.id);

    return categoryOptions.filter(
      (opt) => opt.id !== editingCategory.id && !descendantIds.has(opt.id),
    );
  }, [editingCategory, categoryOptions, categoriesFlat]);

  // DropSearch items for parent category selection
  const createParentCategoryDropItems = useMemo<ComboboxItem[]>(() => {
    return categoryOptions.map((opt) => ({
      id: opt.id,
      label: opt.name,
      subLabel: opt.breadcrumb !== opt.name ? opt.breadcrumb : undefined,
      badgeText: opt.code,
    }));
  }, [categoryOptions]);

  const editParentCategoryDropItems = useMemo<ComboboxItem[]>(() => {
    return validEditParentOptions.map((opt) => ({
      id: opt.id,
      label: opt.name,
      subLabel: opt.breadcrumb !== opt.name ? opt.breadcrumb : undefined,
      badgeText: opt.code,
    }));
  }, [validEditParentOptions]);

  // Filtered lists
  const filteredFlatCategories = useMemo(() => {
    if (!debouncedCategorySearch.trim()) return categoriesFlat;
    const query = debouncedCategorySearch.toLowerCase();
    return categoriesFlat.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        (c.parentName && c.parentName.toLowerCase().includes(query)),
    );
  }, [categoriesFlat, debouncedCategorySearch]);

  const filteredBrands = useMemo(() => {
    if (!debouncedBrandSearch.trim()) return brands;
    const query = debouncedBrandSearch.toLowerCase();
    return brands.filter(
      (b) =>
        b.brandCode?.toLowerCase().includes(query) ||
        b.name?.toLowerCase().includes(query),
    );
  }, [brands, debouncedBrandSearch]);

  // Metrics
  const totalCategories = categoriesFlat.length;
  const rootCategories = categoriesFlat.filter((c) => !c.parentCategoryId).length;
  const leafCategories = categoriesFlat.filter((c) => c.isLeaf).length;
  const totalBrandsCount = brands.length;

  const [categoryPage, setCategoryPage] = useState(1);
  const categoryPageSize = 10;
  const totalCategoryPages = Math.max(1, Math.ceil(filteredFlatCategories.length / categoryPageSize));
  const paginatedCategories = useMemo(() => {
    const start = (categoryPage - 1) * categoryPageSize;
    return filteredFlatCategories.slice(start, start + categoryPageSize);
  }, [filteredFlatCategories, categoryPage, categoryPageSize]);

  const [brandPage, setBrandPage] = useState(1);
  const brandPageSize = 10;
  const totalBrandPages = Math.max(1, Math.ceil(filteredBrands.length / brandPageSize));
  const paginatedBrands = useMemo(() => {
    const start = (brandPage - 1) * brandPageSize;
    return filteredBrands.slice(start, start + brandPageSize);
  }, [filteredBrands, brandPage, brandPageSize]);

  React.useEffect(() => {
    setCategoryPage(1);
  }, [debouncedCategorySearch]);

  React.useEffect(() => {
    setBrandPage(1);
  }, [debouncedBrandSearch]);

  const categoryColumns = useMemo<ServerColumn<CategoryFlatItem>[]>(
    () => [
      {
        key: "code",
        header: "CATEGORY CODE",
        sortable: false,
        render: (c) => (
          <span className="font-mono font-semibold text-slate-900">
            {c.code}
          </span>
        ),
      },
      {
        key: "name",
        header: "CATEGORY NAME",
        sortable: false,
        render: (c) => (
          <span className="font-medium text-slate-900 truncate max-w-[200px] inline-block">
            {c.name}
          </span>
        ),
      },
      {
        key: "parent",
        header: "PARENT HIERARCHY",
        sortable: false,
        render: (c) =>
          c.parentName ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="font-mono text-slate-500">{c.parentCode}</span>
              <span>({c.parentName})</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Root Category</span>
          ),
      },
      {
        key: "type",
        header: "TYPE",
        sortable: false,
        render: (c) =>
          c.isLeaf ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Leaf (Assignable)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Branch Node
            </span>
          ),
      },
      {
        key: "subCategoryCount",
        header: "SUBCATEGORIES",
        sortable: false,
        render: (c) => (
          <span className="text-slate-700 font-medium">
            {c.subCategoryCount}
          </span>
        ),
      },
      {
        key: "productCount",
        header: "LINKED SKUS",
        sortable: false,
        render: (c) => (
          <span className="text-slate-700 font-medium">
            {c.productCount} SKUs
          </span>
        ),
      },
      {
        key: "isActive",
        header: "STATUS",
        sortable: false,
        render: (c) => (
          <StatusBadge status={c.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        sortable: false,
        render: (c) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenCreateCategory(c.id)}
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="Add child subcategory"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleOpenEditCategory(c)}
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="Edit category"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const brandColumns = useMemo<ServerColumn<BrandItem>[]>(
    () => [
      {
        key: "brandCode",
        header: "BRAND CODE",
        sortable: false,
        render: (b) => (
          <span className="font-mono font-semibold text-slate-900">
            {b.brandCode}
          </span>
        ),
      },
      {
        key: "name",
        header: "BRAND NAME",
        sortable: false,
        render: (b) => (
          <span className="font-medium text-slate-900 truncate max-w-[240px] inline-block">
            {b.name}
          </span>
        ),
      },
      {
        key: "productCount",
        header: "ASSIGNED PRODUCTS",
        sortable: false,
        render: (b) => (
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
            <Boxes className="h-4 w-4 text-slate-400" />
            {(b as any).productCount ?? 0} SKUs
          </span>
        ),
      },
      {
        key: "isActive",
        header: "STATUS",
        sortable: false,
        render: (b) => (
          <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        sortable: false,
        render: (b) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => handleOpenEditBrand(b)}
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              title="Edit Brand"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  // Validation functions
  const validateCreateCategory = (): boolean => {
    const errors: { code?: string; name?: string; parent?: string } = {};
    const cleanCode = newCategoryCode.trim();
    const cleanName = newCategoryName.trim();
    const targetParent = newCategoryParentId === "ROOT" ? null : newCategoryParentId;

    // Code validation
    if (!cleanCode) {
      errors.code = "Category code is required.";
    } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      errors.code = "Code can only contain uppercase letters, numbers, and hyphens (e.g., CAT-BEVERAGES).";
    } else if (cleanCode.length < 3 || cleanCode.length > 50) {
      errors.code = "Code must be between 3 and 50 characters.";
    } else if (categoriesFlat.some((c) => c.code.toUpperCase() === cleanCode.toUpperCase())) {
      errors.code = "Category code already exists. Please choose a unique code.";
    }

    // Name validation
    if (!cleanName) {
      errors.name = "Category name is required.";
    } else if (cleanName.length < 2 || cleanName.length > 100) {
      errors.name = "Name must be between 2 and 100 characters.";
    } else if (!/^[a-zA-Z0-9\s&/\-()]+$/.test(cleanName)) {
      errors.name = "Name contains invalid characters.";
    } else if (
      categoriesFlat.some(
        (c) =>
          (c.parentCategoryId || null) === targetParent &&
          c.name.trim().toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      errors.name = "A subcategory with this name already exists under the selected parent.";
    }

    // Parent validation
    if (targetParent && !categoriesFlat.some((c) => c.id === targetParent)) {
      errors.parent = "Invalid parent category selected.";
    }

    setCreateCategoryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditCategory = (): boolean => {
    if (!editingCategory) return false;
    const errors: { name?: string; parent?: string } = {};
    const cleanName = editCategoryName.trim();
    const targetParent = editCategoryParentId === "ROOT" ? null : editCategoryParentId;

    // Name validation
    if (!cleanName) {
      errors.name = "Category name is required.";
    } else if (cleanName.length < 2 || cleanName.length > 100) {
      errors.name = "Name must be between 2 and 100 characters.";
    } else if (!/^[a-zA-Z0-9\s&/\-()]+$/.test(cleanName)) {
      errors.name = "Name contains invalid characters.";
    } else if (
      categoriesFlat.some(
        (c) =>
          c.id !== editingCategory.id &&
          (c.parentCategoryId || null) === targetParent &&
          c.name.trim().toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      errors.name = "A subcategory with this name already exists under the selected parent.";
    }

    // Parent validation / Circular check
    if (targetParent) {
      if (targetParent === editingCategory.id) {
        errors.parent = "A category cannot be its own parent, nor can it select any of its own child categories.";
      } else {
        const descendantIds = new Set<string>();
        const collectDescendants = (parentId: string) => {
          categoriesFlat
            .filter((c) => c.parentCategoryId === parentId)
            .forEach((child) => {
              descendantIds.add(child.id);
              collectDescendants(child.id);
            });
        };
        collectDescendants(editingCategory.id);
        if (descendantIds.has(targetParent)) {
          errors.parent = "A category cannot be its own parent, nor can it select any of its own child categories.";
        }
      }
    }

    setEditCategoryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCreateBrand = (): boolean => {
    const errors: { code?: string; name?: string } = {};
    const cleanCode = newBrandCode.trim();
    const cleanName = newBrandName.trim();

    // Code validation
    if (!cleanCode) {
      errors.code = "Brand code is required.";
    } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
      errors.code = "Code must contain only uppercase letters, numbers, and hyphens (e.g., BRD-AMUL).";
    } else if (cleanCode.length < 2 || cleanCode.length > 50) {
      errors.code = "Brand code must be between 2 and 50 characters.";
    } else if (
      brands.some(
        (b) =>
          ((b as any).code?.toUpperCase() ?? "") === cleanCode.toUpperCase() ||
          (b.brandCode?.toUpperCase() ?? "") === cleanCode.toUpperCase(),
      )
    ) {
      errors.code = "Brand code already exists. Please enter a unique code.";
    }

    // Name validation
    if (!cleanName) {
      errors.name = "Brand name is required.";
    } else if (cleanName.length < 2 || cleanName.length > 100) {
      errors.name = "Brand name must be between 2 and 100 characters.";
    } else if (!/^[a-zA-Z0-9\s&.'\-()]+$/.test(cleanName)) {
      errors.name = "Brand name contains invalid characters.";
    } else if (brands.some((b) => b.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      errors.name = "Brand name already exists. Please enter a unique name.";
    }

    setCreateBrandErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditBrand = (): boolean => {
    if (!editingBrand) return false;
    const errors: { name?: string } = {};
    const cleanName = editBrandName.trim();

    // Name validation
    if (!cleanName) {
      errors.name = "Brand name is required.";
    } else if (cleanName.length < 2 || cleanName.length > 100) {
      errors.name = "Brand name must be between 2 and 100 characters.";
    } else if (!/^[a-zA-Z0-9\s&.'\-()]+$/.test(cleanName)) {
      errors.name = "Brand name contains invalid characters.";
    } else if (
      brands.some(
        (b) =>
          b.id !== editingBrand.id &&
          b.name.trim().toLowerCase() === cleanName.toLowerCase(),
      )
    ) {
      errors.name = "Brand name already exists. Please enter a unique name.";
    }

    setEditBrandErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers - Categories
  const handleOpenCreateCategory = (prefillParentId?: string) => {
    resetCategoryForm();
    if (prefillParentId) {
      setNewCategoryParentId(prefillParentId);
    }
    setCreateCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryFlatItem) => {
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
    setEditCategoryParentId(cat.parentCategoryId || "ROOT");
    setEditCategoryIsActive(cat.isActive);
    setEditCategoryErrors({});
  };

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateCategory()) {
      return;
    }
    createCategoryMutation.mutate({
      code: newCategoryCode.trim().toUpperCase(),
      name: newCategoryName.trim(),
      parentCategoryId: newCategoryParentId === "ROOT" ? null : newCategoryParentId,
    });
  };

  const handleEditCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!validateEditCategory()) {
      return;
    }
    updateCategoryMutation.mutate({
      id: editingCategory.id,
      data: {
        name: editCategoryName.trim(),
        parentCategoryId: editCategoryParentId === "ROOT" ? null : editCategoryParentId,
        isActive: editCategoryIsActive,
      },
    });
  };

  // Handlers - Brands
  const handleOpenEditBrand = (brand: BrandItem) => {
    setEditingBrand(brand);
    setEditBrandName(brand.name);
    setEditBrandIsActive(brand.isActive);
    setEditBrandErrors({});
  };

  const handleCreateBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateBrand()) {
      return;
    }
    createBrandMutation.mutate({
      code: newBrandCode.trim().toUpperCase(),
      name: newBrandName.trim(),
    });
  };

  const handleEditBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    if (!validateEditBrand()) {
      return;
    }
    updateBrandMutation.mutate({
      id: editingBrand.id,
      data: {
        name: editBrandName.trim(),
        isActive: editBrandIsActive,
      },
    });
  };

  // Recursive Tree Node Component
  const renderTreeNode = (node: CategoryNode, depth: number = 0) => {
    const isExpanded = expandedCategoryIds.has(node.id);
    const hasChildren = node.subCategories && node.subCategories.length > 0;
    const flatItem = categoriesFlat.find((c) => c.id === node.id);

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
            hasChildren
              ? "bg-slate-50/70 border-slate-200 hover:bg-slate-100/70"
              : "bg-white border-slate-200/80 hover:bg-slate-50"
          } my-1`}
          style={{ marginLeft: `${depth * 24}px` }}
        >
          {/* Left info */}
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded hover:bg-slate-200 text-slate-600 focus:outline-none"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-700" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-700" />
                )}
              </button>
            ) : (
              <div className="w-6 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              </div>
            )}

            <div className="p-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700">
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-600" />
                )
              ) : (
                <Tag className="h-4 w-4 text-emerald-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm">{node.name}</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  {node.categoryCode}
                </span>
                {hasChildren ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 border border-blue-200 text-blue-700">
                    Branch ({node.subCategories.length})
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                    Leaf Node
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Depth Level {node.level} • {node.productCount || 0} Products attached
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateCategory(node.id)}
              className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-white"
              title="Add Subcategory under this category"
            >
              <Plus className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Subcategory
            </Button>
            {flatItem && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditCategory(flatItem)}
                className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-white"
                title="Edit Category"
              >
                <Edit3 className="h-3.5 w-3.5 mr-1 text-slate-600" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Subcategories */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-200 ml-6 pl-2">
            {node.subCategories.map((sub) => renderTreeNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout
      title="Category & Brand Governance"
      subtitle="Administer enterprise taxonomy hierarchies, leaf assignment constraints, and corporate brands."
    >
      <div className="space-y-6">
        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <FolderTree className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Categories
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{totalCategories}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              <GitFork className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Root Level Branches
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{rootCategories}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Leaf Nodes (Assignable)
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{leafCategories}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Brands
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{totalBrandsCount}</h3>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("CATEGORIES")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "CATEGORIES"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FolderTree className="h-4 w-4" />
              Category Tree Governance
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "CATEGORIES"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalCategories}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BRANDS")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "BRANDS"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Tags className="h-4 w-4" />
              Brand Directory
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === "BRANDS"
                    ? "bg-slate-800 text-slate-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalBrandsCount}
              </span>
            </button>
          </div>

          <div>
            {activeTab === "CATEGORIES" ? (
              <Button
                type="button"
                onClick={() => handleOpenCreateCategory()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Category
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setNewBrandCode("");
                  setNewBrandName("");
                  setCreateBrandModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Brand
              </Button>
            )}
          </div>
        </div>

        {/* TAB CONTENT: CATEGORIES */}
        {activeTab === "CATEGORIES" && (
          <div className="space-y-4">
            {/* Filter & View Switcher Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by category name or code..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode("TREE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      categoryViewMode === "TREE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    Tree Hierarchy
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryViewMode("TABLE")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      categoryViewMode === "TABLE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Directory Table
                  </button>
                </div>
              </div>
            </div>

            {/* Tree View */}
            {categoryViewMode === "TREE" ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4">
                  {categoriesTreeLoading ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      Loading category hierarchy tree...
                    </div>
                  ) : filteredTreeCategories.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      {categorySearch.trim()
                        ? "No categories match your search criteria."
                        : 'No categories found. Click "Add Category" to begin building your taxonomy tree.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {paginatedTreeNodes.map((node) => renderTreeNode(node, 0))}
                    </div>
                  )}
                </div>

                {/* Tree Pagination Footer */}
                {!categoriesTreeLoading && filteredTreeCategories.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t bg-slate-50/60 px-4 py-3 text-xs text-muted-foreground">
                    <div className="font-medium text-slate-600">
                      Showing {(treePage - 1) * treePageSize + 1}-
                      {Math.min(treePage * treePageSize, filteredTreeCategories.length)} of{" "}
                      {filteredTreeCategories.length} results
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={treePage <= 1}
                        onClick={() => setTreePage((p) => Math.max(1, p - 1))}
                        aria-label="Previous Page"
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1.5 font-mono text-xs text-slate-700">
                        <input
                          type="number"
                          min={1}
                          max={totalTreePages}
                          value={treePageInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            setTreePageInput(val);
                          }}
                          onBlur={() => {
                            const parsed = parseInt(treePageInput, 10);
                            if (!isNaN(parsed)) {
                              const clamped = Math.max(1, Math.min(totalTreePages, parsed));
                              setTreePage(clamped);
                              setTreePageInput(String(clamped));
                            } else {
                              setTreePageInput(String(treePage));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const parsed = parseInt(treePageInput, 10);
                              if (!isNaN(parsed)) {
                                const clamped = Math.max(1, Math.min(totalTreePages, parsed));
                                setTreePage(clamped);
                                setTreePageInput(String(clamped));
                              } else {
                                setTreePageInput(String(treePage));
                              }
                            }
                          }}
                          className="h-8 w-14 rounded-md border border-slate-300 bg-white px-1 text-center font-mono text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-slate-500 font-medium">of {totalTreePages}</span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={treePage >= totalTreePages}
                        onClick={() => setTreePage((p) => Math.min(totalTreePages, p + 1))}
                        aria-label="Next Page"
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Flat Table View using ServerDataTable */
              <ServerDataTable
                data={paginatedCategories}
                columns={categoryColumns}
                loading={categoriesFlatLoading}
                page={categoryPage}
                totalPages={totalCategoryPages}
                pageSize={categoryPageSize}
                totalItems={filteredFlatCategories.length}
                onPageChange={setCategoryPage}
                emptyMessage="No categories matching filter."
              />
            )}
          </div>
        )}

        {/* TAB CONTENT: BRANDS */}
        {activeTab === "BRANDS" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by brand name or brand code..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="pl-9 h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans"
                />
              </div>
            </div>

            {/* Brands Table using ServerDataTable */}
            <ServerDataTable
              data={paginatedBrands}
              columns={brandColumns}
              loading={brandsLoading}
              page={brandPage}
              totalPages={totalBrandPages}
              pageSize={brandPageSize}
              totalItems={filteredBrands.length}
              onPageChange={setBrandPage}
              emptyMessage="No brands matching search criteria."
            />
          </div>
        )}
      </div>

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={createCategoryModalOpen} onOpenChange={setCreateCategoryModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-6 text-slate-900 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Create Enterprise Category
            </DialogTitle>
          </DialogHeader>

          <form noValidate onSubmit={handleCreateCategorySubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Category Code
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. CAT-BEVERAGES"
                  value={newCategoryCode}
                  onChange={(e) => {
                    setNewCategoryCode(e.target.value.toUpperCase());
                    if (createCategoryErrors.code) {
                      setCreateCategoryErrors((prev) => ({ ...prev, code: undefined }));
                    }
                  }}
                  className={cn(
                    "bg-white border-slate-300 text-slate-900 font-mono text-sm",
                    createCategoryErrors.code && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                  )}
                />
                {createCategoryErrors.code && (
                  <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{createCategoryErrors.code}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Category Name
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Beverages & Cold Drinks"
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (createCategoryErrors.name) {
                      setCreateCategoryErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={cn(
                    "bg-white border-slate-300 text-slate-900 text-sm",
                    createCategoryErrors.name && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                  )}
                />
                {createCategoryErrors.name && (
                  <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{createCategoryErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Parent Category
                </Label>
                <DropSearch
                  items={createParentCategoryDropItems}
                  value={newCategoryParentId}
                  onChange={(val) => {
                    setNewCategoryParentId(val || "ROOT");
                    if (createCategoryErrors.parent || createCategoryErrors.name) {
                      setCreateCategoryErrors((prev) => ({
                        ...prev,
                        parent: undefined,
                        name: undefined,
                      }));
                    }
                  }}
                  allOption={{ id: "ROOT", label: "(None - Root Level Category)" }}
                  placeholder="Select parent category..."
                  searchPlaceholder="Search parent category name or code..."
                  width="w-full"
                  className={cn(
                    "h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans",
                    createCategoryErrors.parent && "border-rose-400 focus:ring-rose-400",
                  )}
                />
                {createCategoryErrors.parent && (
                  <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{createCategoryErrors.parent}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
              <Layers className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Taxonomy Rule:</strong> Products can only be assigned to leaf category nodes. Categories that contain subcategories act as organizational branches.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateCategoryModalOpen(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      <Dialog open={Boolean(editingCategory)} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-6 text-slate-900 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Edit Category: {editingCategory?.code}
            </DialogTitle>
          </DialogHeader>

          {editingCategory && (
            <form noValidate onSubmit={handleEditCategorySubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Category Code
                  </Label>
                  <Input
                    type="text"
                    value={editingCategory.code}
                    disabled
                    className="bg-slate-100 border-slate-300 text-slate-500 font-mono text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Category Name
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={editCategoryName}
                    onChange={(e) => {
                      setEditCategoryName(e.target.value);
                      if (editCategoryErrors.name) {
                        setEditCategoryErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    className={cn(
                      "bg-white border-slate-300 text-slate-900 text-sm",
                      editCategoryErrors.name && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                    )}
                  />
                  {editCategoryErrors.name && (
                    <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{editCategoryErrors.name}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Parent Category
                  </Label>
                  <DropSearch
                    items={editParentCategoryDropItems}
                    value={editCategoryParentId}
                    onChange={(val) => {
                      setEditCategoryParentId(val || "ROOT");
                      if (editCategoryErrors.parent || editCategoryErrors.name) {
                        setEditCategoryErrors((prev) => ({
                          ...prev,
                          parent: undefined,
                          name: undefined,
                        }));
                      }
                    }}
                    allOption={{ id: "ROOT", label: "(None - Root Level Category)" }}
                    placeholder="Select parent category..."
                    searchPlaceholder="Search parent category name or code..."
                    width="w-full"
                    className={cn(
                      "h-10 bg-white border-slate-300 text-slate-900 text-xs font-sans",
                      editCategoryErrors.parent && "border-rose-400 focus:ring-rose-400",
                    )}
                  />
                  {editCategoryErrors.parent && (
                    <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{editCategoryErrors.parent}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Active Status</p>
                    <p className="text-xs text-slate-500">Allow this category to appear in inventory and catalog</p>
                  </div>
                  <Switch
                    checked={editCategoryIsActive}
                    onCheckedChange={setEditCategoryIsActive}
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cycle Prevention:</strong> You cannot assign this category to itself or any of its own descendants.
                </span>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                  className="border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateCategoryMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE BRAND MODAL */}
      <Dialog open={createBrandModalOpen} onOpenChange={setCreateBrandModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-6 text-slate-900 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Create Enterprise Brand
            </DialogTitle>
          </DialogHeader>

          <form noValidate onSubmit={handleCreateBrandSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Brand Code
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. BRD-AMUL"
                  value={newBrandCode}
                  onChange={(e) => {
                    setNewBrandCode(e.target.value.toUpperCase());
                    if (createBrandErrors.code) {
                      setCreateBrandErrors((prev) => ({ ...prev, code: undefined }));
                    }
                  }}
                  className={cn(
                    "bg-white border-slate-300 text-slate-900 font-mono text-sm",
                    createBrandErrors.code && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                  )}
                />
                {createBrandErrors.code && (
                  <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{createBrandErrors.code}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Brand Name
                  <span className="text-red-500 font-bold ml-0.5">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Amul India"
                  value={newBrandName}
                  onChange={(e) => {
                    setNewBrandName(e.target.value);
                    if (createBrandErrors.name) {
                      setCreateBrandErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={cn(
                    "bg-white border-slate-300 text-slate-900 text-sm",
                    createBrandErrors.name && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                  )}
                />
                {createBrandErrors.name && (
                  <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>{createBrandErrors.name}</span>
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateBrandModalOpen(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBrandMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT BRAND MODAL */}
      <Dialog open={Boolean(editingBrand)} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent className="sm:max-w-xl bg-white border-slate-200 p-6 text-slate-900 overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Edit Brand: {editingBrand?.brandCode}
            </DialogTitle>
          </DialogHeader>

          {editingBrand && (
            <form noValidate onSubmit={handleEditBrandSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Brand Code
                  </Label>
                  <Input
                    type="text"
                    value={editingBrand.brandCode}
                    disabled
                    className="bg-slate-100 border-slate-300 text-slate-500 font-mono text-sm cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Brand Name
                    <span className="text-red-500 font-bold ml-0.5">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={editBrandName}
                    onChange={(e) => {
                      setEditBrandName(e.target.value);
                      if (editBrandErrors.name) {
                        setEditBrandErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    className={cn(
                      "bg-white border-slate-300 text-slate-900 text-sm",
                      editBrandErrors.name && "border-rose-400 focus-visible:ring-rose-400 focus-visible:border-rose-400",
                    )}
                  />
                  {editBrandErrors.name && (
                    <p className="text-xs text-rose-500 flex items-center gap-1.5 mt-1 font-medium">
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{editBrandErrors.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Active Status</p>
                    <p className="text-xs text-slate-500">Allow products of this brand in catalog</p>
                  </div>
                  <Switch
                    checked={editBrandIsActive}
                    onCheckedChange={setEditBrandIsActive}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingBrand(null)}
                  className="border-slate-300 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateBrandMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateBrandMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default CategoriesBrandsPage;
