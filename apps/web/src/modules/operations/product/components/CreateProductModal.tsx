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
} from "../api/product.api";
import { useCreateProductMutation } from "../hooks/useProducts";

export const createProductSchema = z
  .object({
    sku: z
      .string()
      .min(3)
      .regex(/^[A-Z0-9-]+$/, "Must be uppercase alphanumeric"),
    productCode: z.string().min(8, "Barcode must be at least 8 digits"),
    name: z.string().min(2, "Product name is required"),
    description: z.string().optional(),
    brandId: z.string().uuid("Please select a brand"),
    categoryId: z.string().uuid("Please select a category"),
    unitOfMeasure: z.enum(["PIECE", "LITRE", "KG", "PACK"]),
    costPrice: z.coerce.number().positive("Cost price must be positive"),
    sellingPrice: z.coerce.number().positive("Selling price must be positive"),
    mrp: z.coerce.number().positive("MRP must be positive"),
  })
  .refine((data) => data.sellingPrice <= data.mrp, {
    message: "Store selling price cannot exceed MRP",
    path: ["sellingPrice"],
  });

export type CreateProductFormValues = z.infer<typeof createProductSchema>;

export interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandItem[];
  categories: CategoryNode[];
  onSuccess?: (product: CreateProductDto) => void;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  open,
  onOpenChange,
  brands,
  categories,
  onSuccess,
}) => {
  const [mrpManuallyEdited, setMrpManuallyEdited] = React.useState(false);
  const createMutation = useCreateProductMutation();

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
      costPrice: 0,
      sellingPrice: 0,
      mrp: 0,
    },
  });

  const watchedSellingPrice = form.watch("sellingPrice");

  // Auto-calculate default MRP to sellingPrice if MRP hasn't been manually edited
  React.useEffect(() => {
    if (!mrpManuallyEdited && watchedSellingPrice > 0) {
      form.setValue("mrp", watchedSellingPrice, { shouldValidate: true });
    }
  }, [watchedSellingPrice, mrpManuallyEdited, form]);

  const brandOptions = React.useMemo(
    () =>
      brands.map((b) => ({
        value: b.id,
        label: `${b.name} (${b.brandCode})`,
      })),
    [brands],
  );

  const uomOptions = [
    { value: "PIECE", label: "PIECE (Individual Unit)" },
    { value: "LITRE", label: "LITRE (Liquid Volume)" },
    { value: "KG", label: "KG (Weight)" },
    { value: "PACK", label: "PACK (Multi-Pack)" },
  ];

  const handleSubmit = async (values: CreateProductFormValues) => {
    try {
      await createMutation.mutateAsync(values);
      toast.success(`SKU ${values.sku} created in catalog`);
      onSuccess?.(values);
      form.reset();
      setMrpManuallyEdited(false);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create product";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full h-dvh sm:h-auto sm:max-w-2xl overflow-y-auto pb-24 sm:pb-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Create Master Catalog SKU
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Register a new SKU with barcode indexing, hierarchical leaf
            category, and D-Mart value pricing spread.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="SKU-1045"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                        className="font-mono"
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
                    <FormLabel>EAN / Barcode (8+ digits) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="8901234567890"
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure *</FormLabel>
                    <FormControl>
                      <DropSearch
                        options={uomOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select UOM"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <FormControl>
                      <DropSearch
                        options={brandOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Search & select brand..."
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
                    <FormLabel>Category (Drill-Down Leaf) *</FormLabel>
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
            </div>

            {/* Pricing Row: Cost Price, Store Selling Price, MRP */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-lg border bg-muted/20 p-3.5">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        className="font-mono"
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
                    <FormLabel>Store Selling Price (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        className="font-mono font-semibold text-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          setMrpManuallyEdited(true);
                          field.onChange(e);
                        }}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Pack specifications, case size, or shelf placement notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background flex justify-end gap-2 sm:static sm:border-t-0 sm:p-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <StandardButton
                type="submit"
                isLoading={createMutation.isPending}
              >
                Create Product
              </StandardButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
