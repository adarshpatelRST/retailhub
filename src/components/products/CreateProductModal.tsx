import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DropSearch } from "@/components/ui/DropSearch";
import { CategoryTreeCombobox } from "./CategoryTreeCombobox";
import {
  type BrandItem,
  type CategoryNode,
  type CreateProductDto,
  type ProductItem,
} from "@/api/product.api";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "@/hooks/useProducts";

export const createProductSchema = z
  .object({
    sku: z
      .string()
      .min(3, "SKU must be at least 3 characters")
      .regex(/^[A-Z0-9-]+$/, "Must be uppercase alphanumeric"),
    productCode: z.string().min(8, "Barcode must be at least 8 digits"),
    name: z.string().min(2, "Product name is required"),
    description: z
      .string()
      .max(100, "Description cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    brandId: z.string().uuid("Please select a brand"),
    categoryId: z.string().uuid("Please select a category"),
    unitOfMeasure: z.enum(["PIECE", "LITRE", "KG", "PACK"]),
    costPrice: z
      .string()
      .min(1, "Cost price is required")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, "Cost price must be greater than 0"),
    sellingPrice: z
      .string()
      .min(1, "Selling price is required")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, "Selling price must be greater than 0"),
    mrp: z
      .string()
      .min(1, "MRP is required")
      .refine((val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num > 0;
      }, "MRP must be greater than 0"),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      const sp = parseFloat(data.sellingPrice);
      const mrp = parseFloat(data.mrp);
      if (!isNaN(sp) && !isNaN(mrp)) {
        return sp <= mrp;
      }
      return true;
    },
    {
      message: "Store selling price cannot exceed MRP",
      path: ["sellingPrice"],
    },
  );

export type CreateProductFormValues = z.infer<typeof createProductSchema>;

export interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandItem[];
  categories: CategoryNode[];
  productToEdit?: ProductItem | null;
  onSuccess?: (product: CreateProductDto) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  open,
  onOpenChange,
  brands,
  categories,
  productToEdit,
  onSuccess,
}) => {
  const [mrpManuallyEdited, setMrpManuallyEdited] = React.useState(false);
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();
  const isEditing = Boolean(productToEdit);

  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      sku: "",
      productCode: "",
      name: "",
      description: "",
      brandId: "",
      categoryId: "",
      unitOfMeasure: "PIECE",
      costPrice: "",
      sellingPrice: "",
      mrp: "",
      isActive: true,
    },
  });

  const watchedSellingPrice = form.watch("sellingPrice");

  // Synchronize form values whenever modal opens or edited product changes
  React.useEffect(() => {
    if (open) {
      if (productToEdit) {
        form.reset({
          sku: productToEdit.sku,
          productCode: productToEdit.productCode,
          name: productToEdit.name,
          description: productToEdit.description || "",
          brandId: productToEdit.brandId,
          categoryId: productToEdit.categoryId,
          unitOfMeasure: productToEdit.unitOfMeasure,
          costPrice:
            productToEdit.costPrice != null ? String(productToEdit.costPrice) : "",
          sellingPrice:
            productToEdit.sellingPrice != null ? String(productToEdit.sellingPrice) : "",
          mrp: productToEdit.mrp != null ? String(productToEdit.mrp) : "",
          isActive: productToEdit.isActive ?? true,
        });
        setMrpManuallyEdited(true); // Don't auto-calculate MRP in edit mode
      } else {
        form.reset({
          sku: "",
          productCode: "",
          name: "",
          description: "",
          brandId: "",
          categoryId: "",
          unitOfMeasure: "PIECE",
          costPrice: "",
          sellingPrice: "",
          mrp: "",
          isActive: true,
        });
        setMrpManuallyEdited(false);
      }
    }
  }, [open, productToEdit, form]);

  // Auto-calculate default MRP to sellingPrice for new products if MRP hasn't been manually edited
  React.useEffect(() => {
    if (!isEditing && !mrpManuallyEdited && watchedSellingPrice) {
      const num = parseFloat(watchedSellingPrice);
      if (!isNaN(num) && num > 0) {
        form.setValue("mrp", watchedSellingPrice, {
          shouldValidate: form.formState.isSubmitted,
        });
      }
    }
  }, [watchedSellingPrice, mrpManuallyEdited, isEditing, form]);

  const brandOptions = React.useMemo(
    () =>
      brands.map((b: any) => ({
        id: b.id,
        value: b.id,
        label: `${b.name} (${b.brandCode})`,
      })),
    [brands],
  );

  const uomOptions = [
    { id: "PIECE", value: "PIECE", label: "PIECE (Individual Unit)" },
    { id: "LITRE", value: "LITRE", label: "LITRE (Liquid Volume)" },
    { id: "KG", value: "KG", label: "KG (Weight)" },
    { id: "PACK", value: "PACK", label: "PACK (Multi-Pack)" },
  ];

  const handleSubmit = async (values: CreateProductFormValues) => {
    try {
      const payload: CreateProductDto = {
        sku: values.sku.trim(),
        productCode: values.productCode.trim(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        brandId: values.brandId,
        categoryId: values.categoryId,
        unitOfMeasure: values.unitOfMeasure,
        costPrice: parseFloat(values.costPrice),
        sellingPrice: parseFloat(values.sellingPrice),
        mrp: parseFloat(values.mrp),
        isActive: values.isActive,
      };

      if (isEditing && productToEdit) {
        await updateMutation.mutateAsync({
          id: productToEdit.id,
          dto: payload,
        });
        toast.success(`Product "${values.name}" updated successfully`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`SKU ${values.sku} created in catalog`);
      }

      onSuccess?.(payload);
      form.reset();
      setMrpManuallyEdited(false);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEditing
            ? "Failed to update product"
            : "Failed to create product";
      toast.error(msg);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Master Catalog SKU" : "Create Master Catalog SKU"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isEditing
              ? "Update pricing tiers, category assignment, and operational status for this catalog product."
              : "Register a new SKU with barcode indexing, hierarchical leaf category, and pricing spread."}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Row 1: SKU & Barcode */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      SKU Code <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isEditing}
                        placeholder="SKU-1045"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                        className="font-mono disabled:opacity-70 disabled:bg-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      EAN / Barcode (8+ digits) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isEditing}
                        placeholder="8901234567890"
                        className="font-mono disabled:opacity-70 disabled:bg-slate-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 2: Product Name & Unit of Measure */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Product Name <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Fortune Sunlite Refined Sunflower Oil 1L"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit of Measure <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <DropSearch
                        options={uomOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select UOM"
                        width="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 3: Brand & Category */}
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Brand <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <DropSearch
                        options={brandOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Search & select brand..."
                        width="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Category (Drill-Down Leaf) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <CategoryTreeCombobox
                        categories={categories}
                        value={field.value}
                        onSelect={(catId) => field.onChange(catId)}
                        placeholder="Drill down or search category..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 4: Cost Price & Store Selling Price */}
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Cost Price (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 50.00"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            field.onChange(val);
                          }
                        }}
                        className="font-mono text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Store Selling Price (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 75.00"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            field.onChange(val);
                            if (!mrpManuallyEdited && !isEditing) {
                              form.setValue("mrp", val, {
                                shouldValidate: form.formState.isSubmitted,
                              });
                            }
                          }
                        }}
                        className="font-mono text-xs font-semibold text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 5: MRP */}
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      MRP (₹) <span className="text-red-500 font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 80.00"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            setMrpManuallyEdited(true);
                            field.onChange(val);
                          }
                        }}
                        className="font-mono text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Empty placeholder for alignment if needed, or description spanning 2 columns below */}
              <div className="hidden sm:block" />

              {/* Row 6: Description spanning 2 columns */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <FormLabel>Description (Optional)</FormLabel>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {(field.value || "").length}/100
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.length <= 100) {
                            field.onChange(val);
                          }
                        }}
                        rows={2}
                        autoResize={false}
                        maxLength={100}
                        placeholder="Enter product description, pack specifications, shelf notes (max 100 characters)..."
                        className="min-h-[56px] max-h-[56px] resize-none overflow-y-auto text-xs bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Row 7: Active Toggle Switch spanning 2 columns */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-lg border border-slate-200 p-3.5 bg-slate-50/80">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel className="text-xs font-semibold text-slate-900 cursor-pointer">
                        Product Active Status (
                        {field.value ? "Active Catalog SKU" : "Inactive SKU"})
                      </FormLabel>
                      <p className="text-[11px] text-muted-foreground">
                        {field.value
                          ? "Product is active for store replenishment transfers, POS sales, and inventory audits."
                          : "Product is inactive. It will be restricted from store ordering and sales."}
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 flex justify-end gap-2 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <StandardButton
                type="submit"
                isLoading={isPending}
              >
                {isEditing ? "Save Product Changes" : "Create Product"}
              </StandardButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
