import * as React from "react";
import { format, isAfter, subDays } from "date-fns";
import { Filter, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useDataScope } from "@/context/DataScopeContext";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface RoleScopeFilterState {
  regionId: string | null;
  storeId: string | null;
  startDate: Date;
  endDate: Date;
}

export interface RoleScopeFilterBarProps {
  value: RoleScopeFilterState;
  onChange: (next: RoleScopeFilterState) => void;
  extraFilters?: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

const ENTERPRISE_REGIONS: ComboboxItem[] = [
  {
    id: "reg-central-mp",
    label: "Central MP (Madhya Pradesh)",
    subLabel: "Bhopal · Indore · Jabalpur · Gwalior",
    badgeText: "MP-CENTRAL",
  },
  {
    id: "reg-west-mh",
    label: "Maharashtra West",
    subLabel: "Mumbai · Pune · Nashik · Thane",
    badgeText: "MH-WEST",
  },
  {
    id: "reg-south-ka",
    label: "Karnataka South",
    subLabel: "Bengaluru · Mysuru · Hubballi",
    badgeText: "KA-SOUTH",
  },
];

export const RoleScopeFilterBar: React.FC<RoleScopeFilterBarProps> = ({
  value,
  onChange,
  extraFilters,
  onReset,
  className,
}) => {
  const { user } = useAuth();
  const { availableStores, isStoreLocked } = useDataScope();
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  const role = user?.role ?? "EXECUTIVE";
  const isStoreManager = role === "STORE_MANAGER";
  const isRegionalManager = role === "REGIONAL_MANAGER";

  const assignedRegionId =
    user?.assignedRegionIds?.[0] ?? "reg-central-mp";
  const assignedStoreId =
    user?.assignedStoreIds?.[0] ?? availableStores[0]?.id ?? "store-bpl-001";

  // Keep filter state synchronized with the active user's RBAC authority
  React.useEffect(() => {
    if (isStoreManager && value.storeId !== assignedStoreId) {
      onChange({
        ...value,
        regionId: assignedRegionId,
        storeId: assignedStoreId,
      });
    } else if (isRegionalManager && value.regionId !== assignedRegionId) {
      onChange({
        ...value,
        regionId: assignedRegionId,
      });
    }
  }, [
    isStoreManager,
    isRegionalManager,
    assignedRegionId,
    assignedStoreId,
    value,
    onChange,
  ]);

  const scopedRegions = React.useMemo<ComboboxItem[]>(() => {
    if (isRegionalManager) {
      return ENTERPRISE_REGIONS.filter((r) =>
        user?.assignedRegionIds?.includes(r.id),
      );
    }
    return ENTERPRISE_REGIONS;
  }, [isRegionalManager, user?.assignedRegionIds]);

  const scopedStores = React.useMemo<ComboboxItem[]>(() => {
    const filtered = availableStores.filter((st) => {
      if (isRegionalManager) {
        return st.regionId === assignedRegionId;
      }
      if (value.regionId && value.regionId !== "ALL_REGIONS") {
        return st.regionId === value.regionId;
      }
      return true;
    });

    return filtered.map((st) => ({
      id: st.id,
      label: `${st.storeCode} — ${st.name}`,
      subLabel: `${st.city} · ${st.regionName}`,
      badgeText: st.storeCode,
    }));
  }, [availableStores, isRegionalManager, assignedRegionId, value.regionId]);

  const handleStartDateChange = (nextStart: Date | undefined) => {
    if (!nextStart) return;
    if (isAfter(nextStart, value.endDate)) {
      toast.error("Start Date cannot be after End Date.");
      onChange({
        ...value,
        startDate: nextStart,
        endDate: nextStart,
      });
      return;
    }
    onChange({
      ...value,
      startDate: nextStart,
    });
  };

  const handleEndDateChange = (nextEnd: Date | undefined) => {
    if (!nextEnd) return;
    if (isAfter(value.startDate, nextEnd)) {
      toast.error("End Date must be on or after Start Date.");
      return;
    }
    onChange({
      ...value,
      endDate: nextEnd,
    });
  };

  const handleResetFilters = () => {
    const defaultStart = subDays(new Date(), 30);
    const defaultEnd = new Date();
    onChange({
      regionId: isStoreManager || isRegionalManager ? assignedRegionId : null,
      storeId: isStoreManager ? assignedStoreId : null,
      startDate: defaultStart,
      endDate: defaultEnd,
    });
    onReset?.();
  };

  const renderFilterFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap items-end gap-3">
      {/* 1. Region Selector (Hidden for STORE_MANAGER, Locked for REGIONAL_MANAGER, Unrestricted for EXECUTIVE/ADMIN) */}
      {!isStoreManager && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Region Scope
            </Label>
            {isRegionalManager && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700">
                <Lock className="h-3 w-3 size-3 shrink-0" />
                <span>Assigned</span>
              </span>
            )}
          </div>
          <DropSearch
            items={scopedRegions}
            value={isRegionalManager ? assignedRegionId : value.regionId}
            onChange={(nextRegion) =>
              onChange({
                ...value,
                regionId: nextRegion === "ALL_REGIONS" ? null : nextRegion,
                storeId: null,
              })
            }
            allOption={
              isRegionalManager
                ? undefined
                : { id: "ALL_REGIONS", label: "All Enterprise Regions" }
            }
            disabled={isRegionalManager}
            placeholder="All Enterprise Regions"
            searchPlaceholder="Search region..."
            width="w-full xl:w-[230px]"
          />
        </div>
      )}

      {/* 2. Store Selector (Locked for STORE_MANAGER, Region-filtered for REGIONAL_MANAGER, Unrestricted for EXECUTIVE/ADMIN) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            Store Authority
          </Label>
          {(isStoreManager || isStoreLocked) && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700">
              <Lock className="h-3 w-3 size-3 shrink-0" />
              <span>Locked 🔒</span>
            </span>
          )}
        </div>
        <DropSearch
          items={scopedStores}
          value={isStoreManager ? assignedStoreId : value.storeId}
          onChange={(nextStore) =>
            onChange({
              ...value,
              storeId: nextStore === "ALL_STORES" ? null : nextStore,
            })
          }
          allOption={
            isStoreManager
              ? undefined
              : {
                  id: "ALL_STORES",
                  label: isRegionalManager
                    ? `All Stores in Region (${scopedStores.length})`
                    : `All Enterprise Stores (${scopedStores.length})`,
                }
          }
          disabled={isStoreManager || isStoreLocked}
          placeholder={
            isRegionalManager
              ? "All Stores in Region"
              : "All Enterprise Stores"
          }
          searchPlaceholder="Search store code or city..."
          width="w-full xl:w-[260px]"
        />
      </div>

      {/* 3. Start Date Picker */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">
          Start Date
        </Label>
        <DatePicker
          date={value.startDate}
          maxDate={value.endDate}
          onSelect={handleStartDateChange}
          placeholder="Select start date"
          className="w-full xl:w-[185px] h-10 text-xs"
        />
      </div>

      {/* 4. End Date Picker */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">
          End Date
        </Label>
        <DatePicker
          date={value.endDate}
          minDate={value.startDate}
          onSelect={handleEndDateChange}
          placeholder="Select end date"
          className="w-full xl:w-[185px] h-10 text-xs"
        />
      </div>

      {/* 5. Extra Report-Specific Filters */}
      {extraFilters}

      {/* 6. Reset Button */}
      <div className="flex items-center pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetFilters}
          className="h-10 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 size-3.5 shrink-0" />
          <span>Reset</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-xs",
        className,
      )}
    >
      {/* Mobile (< 640px) Collapsible Filter Trigger */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground truncate">
          <span className="font-semibold text-foreground">{role}</span> ·{" "}
          {format(value.startDate, "dd MMM")} – {format(value.endDate, "dd MMM yyyy")}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileFilterOpen(true)}
          className="h-8 gap-1.5 text-xs"
        >
          <Filter className="h-3.5 w-3.5 size-3.5 shrink-0" />
          <span>Filters</span>
        </Button>
      </div>

      {/* Desktop & Tablet (>= 640px) Filter Bar */}
      <div className="hidden sm:block">{renderFilterFields()}</div>

      {/* Mobile Filter Drawer */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto p-5">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-sm font-bold">
              Report Scope &amp; Date Filters
            </SheetTitle>
          </SheetHeader>
          {renderFilterFields()}
        </SheetContent>
      </Sheet>
    </div>
  );
};
