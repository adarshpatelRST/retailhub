import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Sliders, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";

const BHOPAL_STORE_ID = "store-bpl-001";
const GOLDEN_SKU_ID = "prod-tata-tea-1kg";

/**
 * Zero-reverse-dependency Demo Simulation Widget.
 * Rendered strictly behind `import.meta.env.VITE_ENABLE_DEMO_WIDGET === 'true'` in `RH_Header.tsx`.
 * No other module imports from this file.
 */
export const DemoControlWidget: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [isSpiking, setIsSpiking] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleTriggerBhopalSalesSpike = async () => {
    setIsSpiking(true);
    try {
      // 1. Trigger POS Sales Spike for SKU-1024 at Bhopal Store (BPL-001)
      await apiClient.post("/simulation/sales-spike", {
        storeId: BHOPAL_STORE_ID,
        productId: GOLDEN_SKU_ID,
        sku: "SKU-1024",
        spikeMultiplier: 4.5,
        quantitySold: 22.0,
      });

      // 2. Immediately evaluate Bhopal Store intelligence to emit REC_CREATED
      await apiClient.post(`/intelligence/evaluate/store/${BHOPAL_STORE_ID}`);

      toast.success(
        "POS Sales Spike triggered at Bhopal (BPL-001) for SKU-1024! New HIGH priority recommendation generated.",
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to trigger Bhopal POS Sales Spike.",
      );
    } finally {
      setIsSpiking(false);
    }
  };

  const handleResetGoldenPathDemoData = async () => {
    setIsResetting(true);
    try {
      await apiClient.post("/simulation/seed-demo", {
        cleanReset: true,
      });

      toast.success(
        "Golden Path Demo Data reset! Bhopal (3.000 units, 1.43d DOI) & Indore (95.000 units, 31.67d DOI) restored.",
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["recommendations"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset Golden Path demo data.",
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-amber-300 bg-amber-50/80 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          <Sliders className="h-3.5 w-3.5 size-3.5 shrink-0" />
          <span className="hidden sm:inline">Demo Simulator</span>
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-80 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none"
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-foreground">
                Live Golden Path Demo Controls
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                Simulate real-time POS velocity spikes at Bhopal (BPL-001) or
                restore the deterministic 50-store baseline.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isSpiking || isResetting}
                onClick={handleTriggerBhopalSalesSpike}
                className="w-full justify-start gap-2 text-xs font-semibold"
              >
                {isSpiking ? (
                  <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin shrink-0" />
                ) : (
                  <Zap className="h-3.5 w-3.5 size-3.5 shrink-0" />
                )}
                <span>⚡ Trigger Bhopal POS Sales Spike (SKU-1024)</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSpiking || isResetting}
                onClick={handleResetGoldenPathDemoData}
                className="w-full justify-start gap-2 text-xs font-semibold"
              >
                {isResetting ? (
                  <Loader2 className="h-3.5 w-3.5 size-3.5 animate-spin shrink-0" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 size-3.5 shrink-0" />
                )}
                <span>🔄 Reset Golden Path Demo Data</span>
              </Button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
