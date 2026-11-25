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
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DropSearch } from "@/components/ui/DropSearch";
import {
  type RegionItem,
  type CreateStoreDto,
  type StoreDirectoryItem,
} from "@/api/store.api";
import {
  useCreateStoreMutation,
  useUpdateStoreMutation,
} from "@/hooks/useStores";

export const createStoreSchema = z.object({
  storeCode: z
    .string()
    .min(3, "Store code must be at least 3 characters")
    .regex(/^[A-Z0-9-]+$/, "Store code must be uppercase alphanumeric (e.g. BPL-001)"),
  name: z.string().min(2, "Store name is required"),
  regionId: z.string().min(1, "Please select an operational region"),
  storeTypeId: z.string().min(1, "Please select a store format"),
  city: z.string().min(2, "City is required"),
  address: z.string().min(5, "Full street address is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  isActive: z.boolean().default(true),
});

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>;

export interface CreateStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: RegionItem[];
  storeToEdit?: StoreDirectoryItem | null;
  onSuccess?: (dto: CreateStoreDto) => void;
}

const STORE_TYPE_OPTIONS = [
  {
    id: "HYPERMARKET",
    value: "HYPERMARKET",
    label: "HYPERMARKET (Large Format 40,000+ sq.ft)",
  },
  {
    id: "SUPERMARKET",
    value: "SUPERMARKET",
    label: "SUPERMARKET (Neighborhood Core)",
  },
  {
    id: "EXPRESS",
    value: "EXPRESS",
    label: "EXPRESS (High-Velocity Pick & Go)",
  },
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  open,
  onOpenChange,
  regions,
  storeToEdit,
  onSuccess,
}) => {
  const isEditing = Boolean(storeToEdit);
  const createStoreMutation = useCreateStoreMutation();
  const updateStoreMutation = useUpdateStoreMutation();

  const form = useForm<CreateStoreFormValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      storeCode: "",
      name: "",
      regionId: "",
      storeTypeId: "HYPERMARKET",
      city: "",
      address: "",
      openingDate: new Date().toISOString().slice(0, 10),
      latitude: undefined,
      longitude: undefined,
      isActive: true,
    },
  });

  // Reset form when opening or when storeToEdit changes
  React.useEffect(() => {
    if (open) {
      if (storeToEdit) {
        form.reset({
          storeCode: storeToEdit.storeCode,
          name: storeToEdit.name,
          regionId: storeToEdit.regionId || storeToEdit.region?.id || "",
          storeTypeId:
            storeToEdit.storeFormat || storeToEdit.storeTypeId || "HYPERMARKET",
          city: storeToEdit.city,
          address: storeToEdit.address || "",
          openingDate: storeToEdit.openingDate
            ? storeToEdit.openingDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
          latitude: storeToEdit.latitude ?? undefined,
          longitude: storeToEdit.longitude ?? undefined,
          isActive: storeToEdit.isActive ?? true,
        });
      } else {
        form.reset({
          storeCode: "",
          name: "",
          regionId: "",
          storeTypeId: "HYPERMARKET",
          city: "",
          address: "",
          openingDate: new Date().toISOString().slice(0, 10),
          latitude: undefined,
          longitude: undefined,
          isActive: true,
        });
      }
    }
  }, [open, storeToEdit, form]);

  const regionOptions = React.useMemo(
    () =>
      regions.map((r: any) => ({
        id: r.id,
        value: r.id,
        label: `${r.name} (${r.regionCode ?? r.name})`,
      })),
    [regions],
  );

  const handleSubmit = async (values: CreateStoreFormValues) => {
    try {
      if (isEditing && storeToEdit) {
        await updateStoreMutation.mutateAsync({
          id: storeToEdit.id,
          dto: values,
        });
        toast.success(`Store ${values.storeCode} updated successfully`);
      } else {
        await createStoreMutation.mutateAsync(values);
        toast.success(`Store ${values.storeCode} onboarded successfully`);
      }
      onSuccess?.(values);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEditing
            ? "Failed to update store"
            : "Failed to onboard store";
      toast.error(msg);
    }
  };

  const isPending =
    createStoreMutation.isPending || updateStoreMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Operational Store" : "Onboard Operational Store"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isEditing
              ? `Update store profile, regional classification, and location coordinates for ${storeToEdit?.storeCode}.`
              : "Register a new store node in the regional network hierarchy."}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 pt-2"
          >
            {/* Row 1: Store Code & Store Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="storeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Store Code <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. BPL-001"
                        disabled={isEditing}
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                        className="font-mono text-xs h-9 bg-white"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Store Name <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Bhopal MP Nagar Flagship"
                        className="text-xs h-9 bg-white"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Operational Region & Store Format */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Operational Region <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <DropSearch
                        options={regionOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select Region..."
                        searchPlaceholder="Search region name or code..."
                        width="w-full"
                        className="h-9 bg-white text-xs"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      Store Format <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <DropSearch
                        options={STORE_TYPE_OPTIONS}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select Store Format..."
                        searchPlaceholder="Search store format..."
                        width="w-full"
                        className="h-9 bg-white text-xs"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: City & Opening Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      City <span className="text-red-500 font-bold">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Bhopal"
                        className="text-xs h-9 bg-white"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openingDate"
                render={({ field }) => {
                  const dateValue = field.value
                    ? new Date(`${field.value}T00:00:00`)
                    : undefined;

                  return (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">
                        Opening Date <span className="text-red-500 font-bold">*</span>
                      </FormLabel>
                      <FormControl>
                        <DatePicker
                          date={dateValue}
                          onSelect={(d) => {
                            if (d) {
                              field.onChange(format(d, "yyyy-MM-dd"));
                            }
                          }}
                          placeholder="Select opening date..."
                          className="w-full h-9 bg-white text-xs font-normal justify-start"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Row 4: Street Address (Textarea with min 2 rows and scroll) */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">
                    Street Address <span className="text-red-500 font-bold">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      autoResize={false}
                      placeholder="Plot 14, Zone-II, Maharana Pratap Nagar, Bhopal..."
                      className="min-h-[56px] max-h-32 text-xs overflow-y-auto resize-y bg-white"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Row 5: Latitude & Longitude (Optional, clean 2-column inputs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">
                      Latitude (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 23.2599"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        className="font-mono text-xs h-9 bg-white"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-600">
                      Longitude (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="e.g. 77.4126"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        className="font-mono text-xs h-9 bg-white"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Operational Status (Active Toggle) */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-3.5 bg-slate-50/80">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel className="text-xs font-semibold text-slate-900 cursor-pointer">
                      Store Operational Status ({field.value ? "Active Node" : "Inactive / Decommissioned"})
                    </FormLabel>
                    <p className="text-[11px] text-muted-foreground">
                      {field.value
                        ? "Store is open and active for replenishment transfers, sales, and catalog audits."
                        : "Store is inactive. It will be restricted from replenishment transfers & network routines."}
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

            <DialogFooter className="pt-3 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <StandardButton
                type="submit"
                size="sm"
                isLoading={isPending}
                className="text-xs h-9 font-semibold"
              >
                {isEditing ? "Save Store Changes" : "Onboard Store"}
              </StandardButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
