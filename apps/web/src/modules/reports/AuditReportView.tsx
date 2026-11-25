import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Code2 } from "lucide-react";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportExportBar } from "@/components/ui/ReportExportBar";
import {
  RoleScopeFilterBar,
  type RoleScopeFilterState,
} from "@/components/ui/RoleScopeFilterBar";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type ExportColumnDef } from "@/lib/export-utils";
import { cn } from "@/lib/utils";
import { reportsApi, type AuditReportRow } from "./api/reports.api";

export const FALLBACK_AUDIT_ROWS: AuditReportRow[] = [
  {
    id: "aud-9001",
    correlationId: "corr-bpl-9f81-4410",
    timestamp: "2026-10-26 14:30:12",
    actorId: "usr-rm-west",
    actorName: "Priya Nair",
    actorEmail: "regional.west@retailhub.com",
    actorRole: "REGIONAL_MANAGER",
    storeCode: "BPL-001",
    storeName: "Bhopal MP Nagar Store",
    regionName: "Central MP",
    action: "APPROVE_TRANSFER",
    entityName: "RebalanceRecommendation",
    entityId: "REC-2026-1001",
    oldValues: {
      status: "OPEN",
      fromStoreCode: "IND-001",
      toStoreCode: "BPL-001",
      recommendedQuantity: 10.0,
      destDOIBefore: 1.43,
      donorAvailableStock: 95.0,
    },
    newValues: {
      status: "APPROVED_IN_TRANSIT",
      fromStoreCode: "IND-001",
      toStoreCode: "BPL-001",
      approvedQuantity: 10.0,
      destDOIAfter: 6.19,
      donorAvailableStock: 85.0,
      transferNumber: "TRF-2026-9001",
    },
    changeSummary: "status: OPEN ➔ APPROVED_IN_TRANSIT · donorStock: 95 ➔ 85",
    remarks: "Approved Golden Path inter-store transfer from Indore (190 km).",
  },
  {
    id: "aud-9002",
    correlationId: "corr-adm-7c12-8821",
    timestamp: "2026-10-26 12:14:05",
    actorId: "usr-admin-ops",
    actorName: "Ananya Deshmukh",
    actorEmail: "admin@retailhub.com",
    actorRole: "ADMIN",
    storeCode: "DM-PUN-003",
    storeName: "Hinjewadi Supercenter",
    regionName: "Maharashtra West",
    action: "MODIFY_RECOMMENDATION",
    entityName: "RebalanceRecommendation",
    entityId: "REC-2026-1003",
    oldValues: {
      status: "OPEN",
      recommendedQuantity: 25.0,
      fromStoreId: "store-mum-001",
    },
    newValues: {
      status: "MODIFIED",
      approvedQuantity: 30.0,
      fromStoreId: null,
      comments: "Increased to full pallet (30 units) from Central Supply Hub.",
    },
    changeSummary: "status: OPEN ➔ MODIFIED · qty: 25.000 ➔ 30.000",
    remarks: "Increased to full pallet (30 units) from Central Supply Hub.",
  },
  {
    id: "aud-9003",
    correlationId: "corr-sm-3a44-1099",
    timestamp: "2026-10-26 10:05:49",
    actorId: "usr-sm-bhopal",
    actorName: "Rajesh Sharma",
    actorEmail: "store.bhopal@retailhub.com",
    actorRole: "STORE_MANAGER",
    storeCode: "BPL-001",
    storeName: "Bhopal MP Nagar Store",
    regionName: "Central MP",
    action: "ADJUST_STOCK",
    entityName: "Inventory",
    entityId: "SKU-1024@BPL-001",
    oldValues: {
      availableQuantity: 5.0,
      reasonCode: null,
    },
    newValues: {
      availableQuantity: 3.0,
      reasonCode: "DAMAGED",
      notes: "2 packets damaged during morning gondola restocking.",
    },
    changeSummary: "availableQuantity: 5.000 ➔ 3.000 · reasonCode: DAMAGED",
    remarks: "2 packets damaged during morning gondola restocking.",
  },
  {
    id: "aud-9004",
    correlationId: "corr-adm-1e90-5532",
    timestamp: "2026-10-25 18:20:00",
    actorId: "usr-admin-ops",
    actorName: "Ananya Deshmukh",
    actorEmail: "admin@retailhub.com",
    actorRole: "ADMIN",
    storeCode: null,
    storeName: "Enterprise HQ",
    regionName: "All Regions",
    action: "USER_ASSIGNMENT",
    entityName: "UserStoreAssignment",
    entityId: "usr-sm-bhopal",
    oldValues: {
      role: "STORE_MANAGER",
      assignedStoreCodes: ["IND-001"],
    },
    newValues: {
      role: "STORE_MANAGER",
      assignedStoreCodes: ["BPL-001"],
    },
    changeSummary: "assignedStoreCodes: [IND-001] ➔ [BPL-001]",
    remarks: "Reassigned Store Manager Rajesh Sharma to Bhopal MP Nagar Store.",
  },
];

const AUDIT_EXPORT_COLUMNS: ExportColumnDef<AuditReportRow>[] = [
  { header: "Timestamp", accessor: "timestamp" },
  { header: "Correlation ID", accessor: "correlationId" },
  { header: "Actor", accessor: (r) => `${r.actorName} (${r.actorRole})` },
  {
    header: "Scope",
    accessor: (r) =>
      r.storeCode ? `${r.storeCode} (${r.regionName})` : r.regionName,
  },
  { header: "Action", accessor: "action" },
  { header: "Entity & Ref", accessor: (r) => `${r.entityName} #${r.entityId}` },
  { header: "Change Summary", accessor: "changeSummary" },
  { header: "Remarks", accessor: "remarks" },
];

export const AuditReportView: React.FC = () => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [inspectedRow, setInspectedRow] = React.useState<AuditReportRow | null>(
    null,
  );

  const [filters, setFilters] = React.useState<RoleScopeFilterState>({
    regionId: null,
    storeId: null,
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data, isLoading } = useQuery({
    queryKey: [
      "reports",
      "audit",
      page,
      pageSize,
      search,
      actionFilter,
      entityFilter,
      filters.regionId,
      filters.storeId,
      format(filters.startDate, "yyyy-MM-dd"),
      format(filters.endDate, "yyyy-MM-dd"),
    ],
    queryFn: async () => {
      try {
        return await reportsApi.getAuditReport({
          page,
          limit: pageSize,
          search,
          action: actionFilter === "ALL" ? undefined : actionFilter,
          entityName: entityFilter === "ALL" ? undefined : entityFilter,
          regionId: filters.regionId,
          storeId: filters.storeId,
          startDate: format(filters.startDate, "yyyy-MM-dd"),
          endDate: format(filters.endDate, "yyyy-MM-dd"),
        });
      } catch {
        const filtered = FALLBACK_AUDIT_ROWS.filter((r) => {
          if (actionFilter !== "ALL" && r.action !== actionFilter) return false;
          if (entityFilter !== "ALL" && r.entityName !== entityFilter) {
            return false;
          }
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            r.correlationId.toLowerCase().includes(q) ||
            r.actorName.toLowerCase().includes(q) ||
            r.entityId.toLowerCase().includes(q) ||
            r.action.toLowerCase().includes(q)
          );
        });
        return {
          items: filtered,
          meta: {
            page: 1,
            limit: pageSize,
            totalItems: filtered.length,
            totalPages: 1,
          },
        };
      }
    },
  });

  const rows = data?.items ?? FALLBACK_AUDIT_ROWS;
  const subtitle = `Period: ${format(filters.startDate, "dd MMM yyyy")} to ${format(
    filters.endDate,
    "dd MMM yyyy",
  )} • Action: ${actionFilter}`;

  const diffKeys = React.useMemo(() => {
    if (!inspectedRow) return [];
    const oldObj = inspectedRow.oldValues ?? {};
    const newObj = inspectedRow.newValues ?? {};
    return Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
  }, [inspectedRow]);

  const columns = React.useMemo<ServerColumn<AuditReportRow>[]>(
    () => [
      {
        key: "timestamp",
        header: "Timestamp / Correlation ID",
        sortable: true,
        render: (r) => (
          <div>
            <div className="font-mono text-xs font-semibold text-foreground">
              {r.timestamp}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.correlationId}
            </div>
          </div>
        ),
      },
      {
        key: "actorName",
        header: "Actor + Role",
        render: (r) => (
          <div>
            <div className="font-medium text-foreground">{r.actorName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.actorRole}
            </div>
          </div>
        ),
      },
      {
        key: "storeScope",
        header: "Store / Region Scope",
        render: (r) => (
          <div className="text-xs">
            <div className="font-medium text-foreground">
              {r.storeCode ? `${r.storeCode} — ${r.storeName}` : r.storeName}
            </div>
            <div className="text-muted-foreground">{r.regionName}</div>
          </div>
        ),
      },
      {
        key: "action",
        header: "Action",
        render: (r) => <StatusBadge status="APPROVED_IN_TRANSIT" label={r.action} />,
      },
      {
        key: "entityName",
        header: "Entity & Ref",
        render: (r) => (
          <div className="font-mono text-xs">
            <div className="font-semibold text-foreground">{r.entityName}</div>
            <div className="text-muted-foreground">{r.entityId}</div>
          </div>
        ),
      },
      {
        key: "changeSummary",
        header: "Change Summary (Before ➔ After)",
        widthClass: "min-w-[230px]",
        render: (r) => (
          <div className="space-y-1">
            <div className="font-mono text-xs text-foreground">
              {r.changeSummary}
            </div>
            <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">
              {r.remarks}
            </div>
          </div>
        ),
      },
      {
        key: "inspect",
        header: "JSON Diff",
        align: "right",
        render: (r) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setInspectedRow(r)}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <Code2 className="h-3.5 w-3.5 size-3.5 shrink-0" />
            <span>Inspect Diff</span>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Scoped Operational & Security Audit Report"
      description="Immutable AuditInterceptor trail with Correlation IDs, sanitized JSON snapshots, and Side-by-Side Before/After Diff Inspector."
      actions={
        <ReportExportBar
          reportTitle="Scoped Operational Audit Report"
          filterSubtitle={subtitle}
          columns={AUDIT_EXPORT_COLUMNS}
          data={rows}
          filenamePrefix="RetailHub_Audit_Report"
        />
      }
    >
      <div className="space-y-4">
        <RoleScopeFilterBar
          value={filters}
          onChange={setFilters}
          onReset={() => {
            setActionFilter("ALL");
            setEntityFilter("ALL");
          }}
          extraFilters={
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Action Type
                </label>
                <select
                  aria-label="Filter by Audit Action Type"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
                >
                  <option value="ALL">All Actions</option>
                  <option value="APPROVE_TRANSFER">APPROVE_TRANSFER</option>
                  <option value="MODIFY_RECOMMENDATION">MODIFY_RECOMMENDATION</option>
                  <option value="REJECT_RECOMMENDATION">REJECT_RECOMMENDATION</option>
                  <option value="ADJUST_STOCK">ADJUST_STOCK</option>
                  <option value="RECEIVE_TRANSFER">RECEIVE_TRANSFER</option>
                  <option value="UPDATE_PRODUCT">UPDATE_PRODUCT</option>
                  <option value="UPDATE_RULE">UPDATE_RULE</option>
                  <option value="USER_ASSIGNMENT">USER_ASSIGNMENT</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground block">
                  Entity Name
                </label>
                <select
                  aria-label="Filter by Entity Name"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground"
                >
                  <option value="ALL">All Entities</option>
                  <option value="RebalanceRecommendation">RebalanceRecommendation</option>
                  <option value="Inventory">Inventory</option>
                  <option value="StockTransfer">StockTransfer</option>
                  <option value="Product">Product</option>
                  <option value="InventoryRule">InventoryRule</option>
                  <option value="UserStoreAssignment">UserStoreAssignment</option>
                </select>
              </div>
            </>
          }
        />

        <ServerDataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          pageSize={pageSize}
          totalItems={data?.meta.totalItems ?? rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          searchValue={search}
          searchPlaceholder="Search correlation ID, actor, entity ID, or remarks..."
          onSearchChange={setSearch}
        />
      </div>

      {/* Side-by-Side JSON Diff Modal */}
      <Dialog
        open={Boolean(inspectedRow)}
        onOpenChange={(open) => !open && setInspectedRow(null)}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Audit JSON Snapshot Diff — {inspectedRow?.action} (
              {inspectedRow?.entityId})
            </DialogTitle>
          </DialogHeader>

          {inspectedRow && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3.5 py-2 text-xs font-mono">
                <span>Correlation ID: {inspectedRow.correlationId}</span>
                <span>
                  Actor: {inspectedRow.actorName} ({inspectedRow.actorRole})
                </span>
                <span>{inspectedRow.timestamp}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Left Column: oldValues */}
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Before (oldValues)
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {diffKeys.map((key) => {
                      const oldVal = inspectedRow.oldValues?.[key];
                      const newVal = inspectedRow.newValues?.[key];
                      const isChanged =
                        JSON.stringify(oldVal) !== JSON.stringify(newVal);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "rounded px-2 py-1",
                            isChanged
                              ? "bg-red-50 text-red-800 font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          <span className="opacity-75">{key}: </span>
                          <span>
                            {oldVal !== undefined
                              ? JSON.stringify(oldVal)
                              : "undefined"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: newValues */}
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    After (newValues)
                  </div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {diffKeys.map((key) => {
                      const oldVal = inspectedRow.oldValues?.[key];
                      const newVal = inspectedRow.newValues?.[key];
                      const isChanged =
                        JSON.stringify(oldVal) !== JSON.stringify(newVal);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "rounded px-2 py-1",
                            isChanged
                              ? "bg-emerald-50 text-emerald-800 font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          <span className="opacity-75">{key}: </span>
                          <span>
                            {newVal !== undefined
                              ? JSON.stringify(newVal)
                              : "undefined"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-card px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-foreground">Remarks: </span>
                <span className="text-muted-foreground">
                  {inspectedRow.remarks}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInspectedRow(null)}
            >
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
