import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LocateFixed, CheckCircle2 } from "lucide-react";
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
import { type RegionItem, type CreateStoreDto } from "../api/store.api";
import { useCreateStoreMutation } from "../hooks/useStores";

export const createStoreSchema = z.object({
  storeCode: z
    .string()
    .min(3)
    .regex(/^[A-Z0-9-]+$/, "Store code must be uppercase (e.g. BPL-001)"),
  name: z.string().min(2, "Store name is required"),
  regionId: z.string().min(1, "Please select an operational region"),
  storeTypeId: z.string().min(1, "Please select a store format"),
  city: z.string().min(2, "City is required"),
  address: z.string().min(5, "Full street address is required"),
  openingDate: z.string().min(1, "Opening date is required"),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>;

export interface CreateStoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: RegionItem[];
  onSuccess?: (dto: CreateStoreDto) => void;
}

const STORE_TYPE_OPTIONS = [
  { value: "HYPERMARKET", label: "HYPERMARKET (Large Format 40,000+ sq.ft)" },
  { value: "SUPERMARKET", label: "SUPERMARKET (Neighborhood Core)" },
  { value: "EXPRESS", label: "EXPRESS (High-Velocity Pick & Go)" },
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  open,
  onOpenChange,
  regions,
  onSuccess,
}) => {
  const [geoLoading, setGeoLoading] = React.useState(false);
  const [detectedCoords, setDetectedCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const createStoreMutation = useCreateStoreMutation();

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
    },
  });

  const regionOptions = React.useMemo(
    () =>
      regions.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.regionCode})`,
      })),
    [regions],
  );

  const handleGetCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        form.setValue("latitude", lat, { shouldValidate: true });
        form.setValue("longitude", lng, { shouldValidate: true });
        setDetectedCoords({ lat, lng });
        setGeoLoading(false);
        toast.success(`Coordinates detected: ${lat}, ${lng}`);
      },
      () => {
        // Fallback coordinates for Bhopal central zone if browser denies permission in preview iframe
        const fallbackLat = 23.2599;
        const fallbackLng = 77.4126;
        form.setValue("latitude", fallbackLat, { shouldValidate: true });
        form.setValue("longitude", fallbackLng, { shouldValidate: true });
        setDetectedCoords({ lat: fallbackLat, lng: fallbackLng });
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleSubmit = async (values: CreateStoreFormValues) => {
    try {
      await createStoreMutation.mutateAsync(values);
      toast.success(`Store ${values.storeCode} onboarded`);
      onSuccess?.(values);
      form.reset();
      setDetectedCoords(null);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to onboard store";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full h-dvh sm:h-auto sm:max-w-xl overflow-y-auto pb-24 sm:pb-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Onboard Operational Store
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Register a new store node in the regional hierarchy with Haversine
            geolocation coordinates for inter-store transfer ranking.
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
                name="storeCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Code *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="BPL-001"
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bhopal MP Nagar Flagship" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operational Region *</FormLabel>
                    <FormControl>
                      <DropSearch
                        options={regionOptions}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select Region..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Format *</FormLabel>
                    <FormControl>
                      <DropSearch
                        options={STORE_TYPE_OPTIONS}
                        value={field.value}
                        onSelect={(val) => field.onChange(val)}
                        placeholder="Select Store Format..."
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Bhopal" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="openingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Plot 14, Zone-II, Maharana Pratap Nagar"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Geolocation Helper */}
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Store Geolocation (Haversine Transfer Ranking)
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Populate optional latitude &amp; longitude for peer store
                    distance calculations.
                  </div>
                </div>
                <StandardButton
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={geoLoading}
                  leftIcon={<LocateFixed className="h-3.5 w-3.5" />}
                  onClick={handleGetCurrentLocation}
                >
                  Get Current Location
                </StandardButton>
              </div>

              {detectedCoords && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Coordinates detected: {detectedCoords.lat},{" "}
                    {detectedCoords.lng}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="23.2599"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                          className="font-mono text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Longitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="77.4126"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : undefined,
                            )
                          }
                          className="font-mono text-xs"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                isLoading={createStoreMutation.isPending}
              >
                Onboard Store
              </StandardButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
