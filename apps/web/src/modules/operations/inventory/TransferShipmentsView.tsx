import * as React from "react";
import { ScanLine, Truck, CheckCircle2 } from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StandardButton } from "@/components/ui/button";
import { type TransferShipmentRecord } from "./api/inventory.api";
import { useTransfers } from "./hooks/useTransfers";
import { ReceiveTransferModal } from "./components/ReceiveTransferModal";

export interface TransferShipmentsViewProps {
  fallbackTransfers?: TransferShipmentRecord[];
}

export const TransferShipmentsView: React.FC<TransferShipmentsViewProps> = ({
  fallbackTransfers,
}) => {
  const [activeTab, setActiveTab] = React.useState<"INCOMING" | "COMPLETED">(
    "INCOMING",
  );
  const [page, setPage] = React.useState(1);
  const [selectedTransfer, setSelectedTransfer] =
    React.useState<TransferShipmentRecord | null>(null);

  const { data, isLoading, error, refetch } = useTransfers({
    status:
      activeTab === "INCOMING" ? "APPROVED_IN_TRANSIT" : "COMPLETED",
    page,
    limit: 20,
  });

  const shipments = React.useMemo(() => {
    const raw = fallbackTransfers ?? data?.items ?? [];
    return raw.filter((item) =>
      activeTab === "INCOMING"
        ? item.status === "APPROVED_IN_TRANSIT"
        : item.status === "COMPLETED",
    );
  }, [fallbackTransfers, data?.items, activeTab]);

  const columns = React.useMemo<ServerColumn<TransferShipmentRecord>[]>(
    () => [
      {
        key: "transferNumber",
        header: "Transfer Number",
        sortable: true,
        widthClass: "min-w-[165px]",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-mono text-xs font-semibold text-foreground">
              {row.transferNumber}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.lines.length} SKU line(s)
            </span>
          </div>
        ),
      },
      {
        key: "sourceStoreName",
        header: "Source Store",
        widthClass: "min-w-[180px]",
        render: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.sourceStoreName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
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
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.destinationStoreName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {row.destinationStoreCode}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        widthClass: "min-w-[150px]",
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: "shippedDate",
        header: "Shipped Date",
        widthClass: "min-w-[140px]",
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
        widthClass: "min-w-[200px]",
        render: (row) =>
          row.status === "APPROVED_IN_TRANSIT" ? (
            <StandardButton
              type="button"
              variant="default"
              size="sm"
              onClick={() => setSelectedTransfer(row)}
              icon={<ScanLine className="h-3.5 w-3.5" />}
            >
              Receive &amp; Inward Scan
            </StandardButton>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              GRN Completed
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Stock Transfer Consignments"
      description="Inter-store replenishment manifests, carrier vehicle tracking, and dock inward barcode verification."
      error={fallbackTransfers ? null : (error as Error | null)}
      onRetry={() => refetch()}
    >
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="inline-flex items-center rounded-lg border bg-muted/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("INCOMING");
              setPage(1);
            }}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "INCOMING"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Incoming Shipments (In-Transit)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("COMPLETED");
              setPage(1);
            }}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "COMPLETED"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed Shipments
          </button>
        </div>

        <ServerDataTable
          data={shipments}
          columns={columns}
          loading={isLoading && !fallbackTransfers}
          page={page}
          totalPages={data?.meta?.totalPages ?? 1}
          pageSize={20}
          totalItems={shipments.length}
          onPageChange={setPage}
          emptyMessage={
            activeTab === "INCOMING"
              ? "No incoming inter-store shipments currently in transit."
              : "No completed transfer consignments found."
          }
        />
      </div>

      <ReceiveTransferModal
        isOpen={Boolean(selectedTransfer)}
        onClose={() => setSelectedTransfer(null)}
        transfer={selectedTransfer}
      />
    </PageLayout>
  );
};
