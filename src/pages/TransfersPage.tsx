import * as React from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Eye,
  Filter,
  MapPin,
  RotateCcw,
  ScanLine,
  Search,
  Truck,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { PageLayout } from "@/components/layouts/PageLayout";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button, StandardButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DropSearch, type ComboboxItem } from "@/components/ui/DropSearch";
import { DatePicker } from "@/components/ui/date-picker";
import {
  ModuleFilterBar,
  ModuleFilterGrid,
  ModuleFilterItem,
  FilterResetButton,
} from "@/components/ui/ModuleFilterBar";
import { type TransferShipmentRecord } from "@/api/inventory.api";
import { useTransfers } from "@/hooks/useTransfers";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { useDataScope } from "@/hooks/useDataScope";
import { ReceiveTransferModal } from "@/components/inventory/ReceiveTransferModal";

export interface TransferShipmentsViewProps {
  fallbackTransfers?: TransferShipmentRecord[];
}

export const TransferShipmentsView: React.FC<TransferShipmentsViewProps> = ({
  fallbackTransfers,
}) => {
  const { user } = useAuth();
  const { availableStores } = useDataScope();

  // Role Checks
  const isStoreManager = user?.role === "STORE_MANAGER";
  const isRegionalManager = user?.role === "REGIONAL_MANAGER";
  const isAdminOrExec = user?.role === "ADMIN" || user?.role === "EXECUTIVE";

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [shipmentType, setShipmentType] = React.useState<
    "INCOMING" | "COMPLETED" | "ALL"
  >("ALL");
  const [selectedRegionId, setSelectedRegionId] = React.useState<string>("ALL");
  const [selectedStoreId, setSelectedStoreId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = React.useState<Date>(() => new Date());
  const [page, setPage] = React.useState(1);

  // Reset page to 1 on debounced search change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Modal State
  const [selectedTransfer, setSelectedTransfer] =
    React.useState<TransferShipmentRecord | null>(null);
  const [isModalReadOnly, setIsModalReadOnly] = React.useState(false);

  // Cascading Region Options for Admin / Executive
  const regionOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const store of availableStores) {
      if (store.regionId && store.regionName) {
        map.set(store.regionId, store.regionName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [availableStores]);

  // Cascading Stores Dropdown List
  const storesForDropdown = React.useMemo(() => {
    if (isAdminOrExec && selectedRegionId !== "ALL") {
      return availableStores.filter((s) => s.regionId === selectedRegionId);
    }
    return availableStores;
  }, [availableStores, isAdminOrExec, selectedRegionId]);

  const regionDropItems = React.useMemo<ComboboxItem[]>(() => {
    return regionOptions.map((reg) => ({
      id: reg.id,
      label: reg.name,
    }));
  }, [regionOptions]);

  const storeDropItems = React.useMemo<ComboboxItem[]>(() => {
    return storesForDropdown.map((st) => ({
      id: st.id,
      label: `${st.storeCode} — ${st.name}`,
      subLabel: `${st.city}${st.regionName ? ` · ${st.regionName}` : ""}`,
    }));
  }, [storesForDropdown]);

  // Handle Region Change: If current store not in selected region, reset store to "ALL"
  const handleRegionChange = (newRegionId: string) => {
    setSelectedRegionId(newRegionId);
    setPage(1);
    if (newRegionId !== "ALL") {
      const match = availableStores.find(
        (s) => s.id === selectedStoreId && s.regionId === newRegionId,
      );
      if (!match) {
        setSelectedStoreId("ALL");
      }
    }
  };

  const handleStartDateSelect = (d: Date | undefined) => {
    if (!d) return;
    setStartDate(d);
    if (d > endDate) {
      setEndDate(d);
    }
    setPage(1);
  };

  const handleEndDateSelect = (d: Date | undefined) => {
    if (!d) return;
    setEndDate(d);
    if (d < startDate) {
      setStartDate(d);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setShipmentType("INCOMING");
    setSelectedRegionId("ALL");
    setSelectedStoreId("ALL");
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
    setPage(1);
  };

  // Derive Effective Store ID based on Role
  const effectiveStoreId = isStoreManager
    ? user?.assignedStoreIds?.[0]
    : selectedStoreId === "ALL"
      ? undefined
      : selectedStoreId;

  const effectiveRegionId =
    isAdminOrExec && selectedRegionId !== "ALL" ? selectedRegionId : undefined;

  // Query Backend with Full Filters
  const { data, isLoading, error, refetch } = useTransfers({
    storeId: effectiveStoreId,
    regionId: effectiveRegionId,
    status: shipmentType,
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    search: debouncedSearch.trim() || undefined,
    page,
    limit: 10,
  });

  const rawShipments = React.useMemo(() => {
    return fallbackTransfers ?? data?.items ?? [];
  }, [fallbackTransfers, data?.items]);

  // Additional Client-side search & status guard for instant responsiveness
  const shipments = React.useMemo(() => {
    let filtered = rawShipments;

    if (shipmentType === "INCOMING") {
      filtered = filtered.filter(
        (item: any) =>
          item.status === "APPROVED_IN_TRANSIT" ||
          item.status === "DISPATCHED" ||
          item.status === "PENDING_APPROVAL" ||
          item.status === "IN_TRANSIT",
      );
    } else if (shipmentType === "COMPLETED") {
      filtered = filtered.filter(
        (item: any) =>
          item.status === "COMPLETED" || item.status === "RECEIVED",
      );
    }

    if (effectiveStoreId) {
      filtered = filtered.filter(
        (item: any) =>
          item.destinationStoreId === effectiveStoreId ||
          item.sourceStoreId === effectiveStoreId,
      );
    }

    if (startDate) {
      const s = new Date(startDate).setHours(0, 0, 0, 0);
      filtered = filtered.filter((item: any) => {
        const d = new Date(item.dispatchedAt || item.createdAt || item.estimatedArrival || Date.now()).getTime();
        return d >= s;
      });
    }
    if (endDate) {
      const e = new Date(endDate).setHours(23, 59, 59, 999);
      filtered = filtered.filter((item: any) => {
        const d = new Date(item.dispatchedAt || item.createdAt || item.estimatedArrival || Date.now()).getTime();
        return d <= e;
      });
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      filtered = filtered.filter((s) => {
        const trfNo = (s.transferNumber || "").toLowerCase();
        const srcCode = (s.sourceStoreCode || "").toLowerCase();
        const dstCode = (s.destinationStoreCode || "").toLowerCase();
        const carrier = (s.carrierName || "").toLowerCase();
        const vehicle = (s.vehicleNumber || "").toLowerCase();
        const lineMatch = (s.lines || []).some(
          (l) =>
            l.sku.toLowerCase().includes(q) ||
            l.productName.toLowerCase().includes(q),
        );
        return (
          trfNo.includes(q) ||
          srcCode.includes(q) ||
          dstCode.includes(q) ||
          carrier.includes(q) ||
          vehicle.includes(q) ||
          lineMatch
        );
      });
    }

    return filtered;
  }, [rawShipments, shipmentType, debouncedSearch]);

  const paginatedShipments = React.useMemo(() => {
    if (shipments.length <= 10) return shipments;
    const start = (page - 1) * 10;
    return shipments.slice(start, start + 10);
  }, [shipments, page]);

  const userAssignedStoreId = user?.assignedStoreIds?.[0];

  const columns = React.useMemo<ServerColumn<TransferShipmentRecord>[]>(
    () => [
      {
        key: "transferNumber",
        header: "Transfer Number",
        sortable: true,
        widthClass: "min-w-[170px]",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">
              {row.transferNumber}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.lines.length} SKU line(s) ·{" "}
              {row.lines
                .reduce(
                  (acc, l) =>
                    acc + Number(l.shippedQty || l.requestedQty || 0),
                  0,
                )
                .toFixed(1)}{" "}
              units
            </span>
          </div>
        ),
      },
      {
        key: "sourceStoreName",
        header: "Source Store",
        widthClass: "min-w-[180px]",
        render: (row) => (
          <div className="flex flex-col min-w-0 max-w-[210px] pr-2">
            <span
              className="font-medium text-foreground text-xs truncate"
              title={row.sourceStoreName}
            >
              {row.sourceStoreName}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.sourceStoreCode}
            </span>
          </div>
        ),
      },
      {
        key: "destinationStoreName",
        header: "Destination Store",
        widthClass: "min-w-[180px]",
        render: (row) => (
          <div className="flex flex-col min-w-0 max-w-[210px] pr-2">
            <span
              className="font-medium text-foreground text-xs truncate"
              title={row.destinationStoreName}
            >
              {row.destinationStoreName}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.destinationStoreCode}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        widthClass: "min-w-[140px]",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "shippedDate",
        header: "Shipped Date",
        widthClass: "min-w-[130px]",
        render: (row) => (
          <span className="font-mono text-xs text-foreground">
            {new Date(row.shippedDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        key: "vehicleNumber",
        header: "Carrier & Vehicle Number",
        widthClass: "min-w-[190px]",
        render: (row) => (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground text-xs">
              <Truck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              {row.carrierName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.vehicleNumber}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Action",
        align: "right",
        widthClass: "min-w-[210px]",
        render: (row) => {
          const isTransferCompleted =
            row.status === "COMPLETED" || (row.status as string) === "RECEIVED";

          if (!isTransferCompleted) {
            const isDestinationStoreManager =
              user?.role === "STORE_MANAGER" &&
              (userAssignedStoreId === row.destinationStoreId ||
                user?.assignedStoreIds?.includes(row.destinationStoreId));

            if (isDestinationStoreManager || user?.role === "ADMIN") {
              return (
                <StandardButton
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedTransfer(row);
                    setIsModalReadOnly(false);
                  }}
                  leftIcon={<ScanLine className="h-3.5 w-3.5" />}
                  className="font-semibold text-xs"
                >
                  Receive &amp; Inward Scan
                </StandardButton>
              );
            }

            // Read-Only Manifest View for Regional Manager, Executive, or Donor Store
            return (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTransfer(row);
                  setIsModalReadOnly(true);
                }}
                className="h-8 gap-1.5 text-xs text-slate-700"
              >
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span>View Manifest</span>
              </Button>
            );
          }

          // Completed Shipments: Check if any scrap / shortfall occurred across lines
          const totalScrap = row.lines.reduce(
            (acc, l) => acc + Number(l.shortfallQty || 0),
            0,
          );

          return (
            <div className="flex items-center justify-end gap-2">
              {totalScrap > 0 ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                  {totalScrap.toFixed(1)} Scrap
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  100% Inwarded
                </span>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTransfer(row);
                  setIsModalReadOnly(true);
                }}
                className="h-8 gap-1 text-xs"
              >
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span>View GRN</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [user?.role, userAssignedStoreId, user?.assignedStoreIds],
  );

  return (
    <PageLayout
      title="Stock Transfer Consignments & Inward Dock"
      description="Inter-store replenishment manifests, carrier fleet tracking, and barcode-verified dock receiving."
      error={fallbackTransfers ? null : (error as Error | null)}
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        {/* Standard Module Filter Bar with Role Scoping */}
        <ModuleFilterBar
          title="Stock Transfer & Inward Dock Filters"
          icon={<Filter className="h-4 w-4 text-emerald-700" />}
          actions={<FilterResetButton onClick={handleResetFilters} />}
        >
          {/* Store Manager: Max 3 Columns per row (Search, Shipment Type, Start Date, End Date) */}
          {isStoreManager && (
            <ModuleFilterGrid columns={3}>
              <ModuleFilterItem label="Search Transfer / SKU">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Transfer #, vehicle, SKU..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                  />
                </div>
              </ModuleFilterItem>

              <ModuleFilterItem label="Shipment Type">
                <Select
                  value={shipmentType}
                  onValueChange={(val: any) => {
                    setShipmentType(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white text-xs font-sans border-slate-300">
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-50">
                    <SelectItem value="INCOMING" className="text-xs">
                      Incoming Shipments (In-Transit)
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">
                      Completed Shipments (GRN Archives)
                    </SelectItem>
                    <SelectItem value="ALL" className="text-xs">
                      All Shipments
                    </SelectItem>
                  </SelectContent>
                </Select>
              </ModuleFilterItem>

              <ModuleFilterItem label="Start Date">
                <DatePicker
                  date={startDate}
                  maxDate={endDate}
                  onSelect={handleStartDateSelect}
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="End Date">
                <DatePicker
                  date={endDate}
                  minDate={startDate}
                  align="end"
                  onSelect={handleEndDateSelect}
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          )}

          {/* Regional Manager: 3 Columns x 2 Rows (Search, Shipment Type, Assigned Store, Start Date, End Date) */}
          {isRegionalManager && (
            <ModuleFilterGrid columns={3}>
              <ModuleFilterItem label="Search Transfer / SKU">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Transfer #, vehicle, SKU..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                  />
                </div>
              </ModuleFilterItem>

              <ModuleFilterItem label="Shipment Type">
                <Select
                  value={shipmentType}
                  onValueChange={(val: any) => {
                    setShipmentType(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white text-xs font-sans border-slate-300">
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-50">
                    <SelectItem value="INCOMING" className="text-xs">
                      Incoming Shipments (In-Transit)
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">
                      Completed Shipments (GRN Archives)
                    </SelectItem>
                    <SelectItem value="ALL" className="text-xs">
                      All Shipments
                    </SelectItem>
                  </SelectContent>
                </Select>
              </ModuleFilterItem>

              <ModuleFilterItem label="Assigned Regional Store">
                <DropSearch
                  items={storeDropItems}
                  value={selectedStoreId}
                  onChange={(val) => {
                    setSelectedStoreId(val || "ALL");
                    setPage(1);
                  }}
                  allOption={{ id: "ALL", label: "All Assigned Stores" }}
                  placeholder="All Assigned Stores"
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="Start Date">
                <DatePicker
                  date={startDate}
                  maxDate={endDate}
                  onSelect={handleStartDateSelect}
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="End Date">
                <DatePicker
                  date={endDate}
                  minDate={startDate}
                  align="end"
                  onSelect={handleEndDateSelect}
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          )}

          {/* Admin / Executive: 3 Columns x 2 Rows (Search, Shipment Type, Region, Store, Start Date, End Date) */}
          {isAdminOrExec && (
            <ModuleFilterGrid columns={3}>
              <ModuleFilterItem label="Search Transfer / SKU">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Transfer #, vehicle, SKU..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9 h-10 text-xs font-sans bg-white border-slate-300"
                  />
                </div>
              </ModuleFilterItem>

              <ModuleFilterItem label="Shipment Type">
                <Select
                  value={shipmentType}
                  onValueChange={(val: any) => {
                    setShipmentType(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 bg-white text-xs font-sans border-slate-300">
                    <SelectValue placeholder="Select shipment type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-50">
                    <SelectItem value="INCOMING" className="text-xs">
                      Incoming Shipments (In-Transit)
                    </SelectItem>
                    <SelectItem value="COMPLETED" className="text-xs">
                      Completed Shipments (GRN Archives)
                    </SelectItem>
                    <SelectItem value="ALL" className="text-xs">
                      All Shipments
                    </SelectItem>
                  </SelectContent>
                </Select>
              </ModuleFilterItem>

              <ModuleFilterItem label="Operational Region">
                <DropSearch
                  items={regionDropItems}
                  value={selectedRegionId}
                  onChange={(val) => handleRegionChange(val || "ALL")}
                  allOption={{ id: "ALL", label: "All Operational Regions" }}
                  placeholder="All Operational Regions"
                  searchPlaceholder="Search region..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="Assigned Store">
                <DropSearch
                  items={storeDropItems}
                  value={selectedStoreId}
                  onChange={(val) => {
                    setSelectedStoreId(val || "ALL");
                    setPage(1);
                  }}
                  allOption={{
                    id: "ALL",
                    label:
                      selectedRegionId !== "ALL"
                        ? "All Stores in Selected Region"
                        : "All Network Stores",
                  }}
                  placeholder={
                    selectedRegionId !== "ALL"
                      ? "All Stores in Selected Region"
                      : "All Network Stores"
                  }
                  searchPlaceholder="Search store code or city..."
                  width="w-full"
                  className="h-10 text-xs font-sans"
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="Start Date">
                <DatePicker
                  date={startDate}
                  maxDate={endDate}
                  onSelect={handleStartDateSelect}
                />
              </ModuleFilterItem>

              <ModuleFilterItem label="End Date">
                <DatePicker
                  date={endDate}
                  minDate={startDate}
                  align="end"
                  onSelect={handleEndDateSelect}
                />
              </ModuleFilterItem>
            </ModuleFilterGrid>
          )}
        </ModuleFilterBar>

        {/* Server Data Table */}
        <ServerDataTable
          data={paginatedShipments}
          columns={columns}
          loading={isLoading && !fallbackTransfers}
          page={page}
          totalPages={Math.max(1, Math.ceil((data?.meta?.total ?? shipments.length) / 10))}
          pageSize={10}
          totalItems={data?.meta?.total ?? shipments.length}
          onPageChange={setPage}
          emptyMessage={
            shipmentType === "INCOMING"
              ? "No incoming inter-store shipments currently in transit matching the selected filters."
              : shipmentType === "COMPLETED"
                ? "No completed transfer consignments found matching the selected filters."
                : "No stock transfer records found matching the selected filters."
          }
        />
      </div>

      <ReceiveTransferModal
        isOpen={Boolean(selectedTransfer)}
        onClose={() => setSelectedTransfer(null)}
        transfer={selectedTransfer}
        readOnly={isModalReadOnly}
      />
    </PageLayout>
  );
};

export const TransfersPage = TransferShipmentsView;
export default TransferShipmentsView;
