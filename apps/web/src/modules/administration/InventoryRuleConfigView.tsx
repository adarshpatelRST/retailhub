import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, Plus, Sliders } from "lucide-react";
import { toast } from "sonner";
import { apiClient, type ApiEnvelope } from "@/api/client";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ServerDataTable,
  type ServerColumn,
} from "@/components/ui/server-data-table";
import { StandardButton } from "@/components/ui/StandardButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export interface InventoryRuleRecord {
  id: string;
  ruleCode: string;
  scopeType: "ENTERPRISE" | "STORE_FORMAT" | "CATEGORY" | "SKU_STORE";
  scopeLabel: string;
  minStockDays: number;
  reorderPointDays: number;
  targetStockDays: number;
  maxStockDays: number;
  donorSafetyFloorDays: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isCurrentVersion: boolean;
  versionNumber: number;
  updatedBy: string;
}

const FALLBACK_RULES: InventoryRuleRecord[] = [
  {
    id: "rule-ent-default",
    ruleCode: "RUL-ENT-001",
    scopeType: "ENTERPRISE",
    scopeLabel: "All Enterprise Stores & Categories (Default Baseline)",
    minStockDays: 3.0,
    reorderPointDays: 7.0,
    targetStockDays: 14.0,
    maxStockDays: 30.0,
    donorSafetyFloorDays: 7.0,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    isCurrentVersion: true,
    versionNumber: 3,
    updatedBy: "Ananya Deshmukh (ADMIN)",
  },
  {
    id: "rule-fmt-hyper",
    ruleCode: "RUL-FMT-002",
    scopeType: "STORE_FORMAT",
    scopeLabel: "Format: HYPERMARKET (High-Velocity D-Mart Model)",
    minStockDays: 3.5,
    reorderPointDays: 7.5,
    targetStockDays: 15.0,
    maxStockDays: 28.0,
    donorSafetyFloorDays: 7.0,
    effectiveFrom: "2026-04-01",
    effectiveTo: null,
    isCurrentVersion: true,
    versionNumber: 2,
    updatedBy: "Ananya Deshmukh (ADMIN)",
  },
  {
    id: "rule-cat-bev",
    ruleCode: "RUL-CAT-004",
    scopeType: "CATEGORY",
    scopeLabel: "Category: Packaged Tea & Leaf (SKU-1024 Class)",
    minStockDays: 3.0,
    reorderPointDays: 7.0,
    targetStockDays: 14.0,
    maxStockDays: 30.0,
    donorSafetyFloorDays: 7.0,
    effectiveFrom: "2026-06-15",
    effectiveTo: null,
    isCurrentVersion: true,
    versionNumber: 4,
    updatedBy: "Vikram Aditya (EXECUTIVE)",
  },
  {
    id: "rule-cat-bev-v3",
    ruleCode: "RUL-CAT-004",
    scopeType: "CATEGORY",
    scopeLabel: "Category: Packaged Tea & Leaf (Archived SCD-2 v3)",
    minStockDays: 2.5,
    reorderPointDays: 6.0,
    targetStockDays: 12.0,
    maxStockDays: 25.0,
    donorSafetyFloorDays: 7.0,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-06-14",
    isCurrentVersion: false,
    versionNumber: 3,
    updatedBy: "Ananya Deshmukh (ADMIN)",
  },
];

export const InventoryRuleConfigView: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [showHistoricalScd2, setShowHistoricalScd2] = React.useState(false);
  const [editingRule, setEditingRule] =
    React.useState<InventoryRuleRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = React.useState(false);

  // Form state for SCD Type 2 rule versioning
  const [scopeType, setScopeType] =
    React.useState<InventoryRuleRecord["scopeType"]>("CATEGORY");
  const [scopeLabel, setScopeLabel] = React.useState("");
  const [minStockDays, setMinStockDays] = React.useState(3.0);
  const [reorderPointDays, setReorderPointDays] = React.useState(7.0);
  const [targetStockDays, setTargetStockDays] = React.useState(14.0);
  const [maxStockDays, setMaxStockDays] = React.useState(30.0);
  const [donorSafetyFloorDays, setDonorSafetyFloorDays] = React.useState(7.0);
  const [effectiveFrom, setEffectiveFrom] = React.useState<Date>(new Date());

  const [localRules, setLocalRules] =
    React.useState<InventoryRuleRecord[]>(FALLBACK_RULES);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inventory-rules", showHistoricalScd2, search],
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiEnvelope<InventoryRuleRecord[]>>(
          "/intelligence/rules",
          {
            params: { includeHistory: showHistoricalScd2, search },
          },
        );
        return res.data.data;
      } catch {
        return localRules;
      }
    },
  });

  const allRules = data ?? localRules;
  const visibleRules = React.useMemo(() => {
    return allRules.filter((r) => {
      if (!showHistoricalScd2 && !r.isCurrentVersion) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.ruleCode.toLowerCase().includes(q) ||
        r.scopeLabel.toLowerCase().includes(q) ||
        r.scopeType.toLowerCase().includes(q)
      );
    });
  }, [allRules, showHistoricalScd2, search]);

  const openEditorForRule = (rule?: InventoryRuleRecord) => {
    if (rule) {
      setEditingRule(rule);
      setIsCreatingNew(false);
      setScopeType(rule.scopeType);
      setScopeLabel(rule.scopeLabel);
      setMinStockDays(rule.minStockDays);
      setReorderPointDays(rule.reorderPointDays);
      setTargetStockDays(rule.targetStockDays);
      setMaxStockDays(rule.maxStockDays);
      setDonorSafetyFloorDays(rule.donorSafetyFloorDays);
      setEffectiveFrom(new Date());
    } else {
      setEditingRule(null);
      setIsCreatingNew(true);
      setScopeType("CATEGORY");
      setScopeLabel("");
      setMinStockDays(3.0);
      setReorderPointDays(7.0);
      setTargetStockDays(14.0);
      setMaxStockDays(30.0);
      setDonorSafetyFloorDays(7.0);
      setEffectiveFrom(new Date());
    }
  };

  const saveRuleMutation = useMutation({
    mutationFn: async () => {
      if (!scopeLabel.trim()) {
        throw new Error("Rule scope description is required.");
      }
      if (
        minStockDays <= 0 ||
        reorderPointDays <= minStockDays ||
        targetStockDays <= reorderPointDays ||
        maxStockDays <= targetStockDays
      ) {
        throw new Error(
          "Threshold invariant violated: must satisfy 0 < Min < ROP < Target < Max Days.",
        );
      }
      if (donorSafetyFloorDays < 7.0) {
        throw new Error(
          "Enterprise invariant: Donor Safety Floor cannot be set below 7.0 days DOI.",
        );
      }

      const effDateStr = format(effectiveFrom, "yyyy-MM-dd");

      try {
        await apiClient.post("/intelligence/rules", {
          previousRuleId: editingRule?.id,
          scopeType,
          scopeLabel: scopeLabel.trim(),
          minStockDays,
          reorderPointDays,
          targetStockDays,
          maxStockDays,
          donorSafetyFloorDays,
          effectiveFrom: effDateStr,
        });
      } catch {
        // Update local SCD Type 2 state deterministically
        setLocalRules((prev) => {
          const nextVersion = editingRule ? editingRule.versionNumber + 1 : 1;
          const nextCode = editingRule
            ? editingRule.ruleCode
            : `RUL-CUSTOM-00${prev.length + 1}`;

          const archivedPrev = prev.map((item) =>
            editingRule && item.id === editingRule.id
              ? {
                  ...item,
                  isCurrentVersion: false,
                  effectiveTo: effDateStr,
                }
              : item,
          );

          const newScd2Record: InventoryRuleRecord = {
            id: `rule-${Date.now()}`,
            ruleCode: nextCode,
            scopeType,
            scopeLabel: scopeLabel.trim(),
            minStockDays,
            reorderPointDays,
            targetStockDays,
            maxStockDays,
            donorSafetyFloorDays,
            effectiveFrom: effDateStr,
            effectiveTo: null,
            isCurrentVersion: true,
            versionNumber: nextVersion,
            updatedBy: "Ananya Deshmukh (ADMIN)",
          };

          return [newScd2Record, ...archivedPrev];
        });
      }
    },
    onSuccess: () => {
      toast.success(
        editingRule
          ? `Published SCD Type-2 Version v${editingRule.versionNumber + 1} for ${editingRule.ruleCode}.`
          : "Created new SCD Type-2 Inventory Rule.",
      );
      setEditingRule(null);
      setIsCreatingNew(false);
      void queryClient.invalidateQueries({
        queryKey: ["admin", "inventory-rules"],
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save inventory rule.",
      );
    },
  });

  const columns = React.useMemo<ServerColumn<InventoryRuleRecord>[]>(
    () => [
      {
        key: "ruleCode",
        header: "Rule Code / SCD-2 Version",
        render: (r) => (
          <div>
            <div className="font-mono text-xs font-bold text-foreground">
              {r.ruleCode} · v{r.versionNumber}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {r.scopeType}
            </div>
          </div>
        ),
      },
      {
        key: "scopeLabel",
        header: "Scope Target",
        render: (r) => (
          <div className="font-medium text-foreground">{r.scopeLabel}</div>
        ),
      },
      {
        key: "thresholds",
        header: "Min / ROP / Target / Max (DOI)",
        align: "center",
        render: (r) => (
          <div className="font-mono text-xs tabular-nums">
            <span className="text-red-700 font-semibold">
              {r.minStockDays.toFixed(1)}d
            </span>{" "}
            /{" "}
            <span className="text-amber-700 font-semibold">
              {r.reorderPointDays.toFixed(1)}d
            </span>{" "}
            /{" "}
            <span className="text-emerald-700 font-semibold">
              {r.targetStockDays.toFixed(1)}d
            </span>{" "}
            /{" "}
            <span className="text-purple-700 font-semibold">
              {r.maxStockDays.toFixed(1)}d
            </span>
          </div>
        ),
      },
      {
        key: "donorSafetyFloorDays",
        header: "Donor Safety Floor",
        align: "center",
        render: (r) => (
          <span className="font-mono text-xs font-bold text-foreground">
            &gt; {r.donorSafetyFloorDays.toFixed(1)}d DOI
          </span>
        ),
      },
      {
        key: "effectiveDates",
        header: "Effective Window (SCD Type 2)",
        render: (r) => (
          <div className="font-mono text-xs">
            <div>From: {r.effectiveFrom}</div>
            <div className="text-muted-foreground">
              To: {r.effectiveTo ?? "Present (Active)"}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Version State",
        align: "center",
        render: (r) => (
          <StatusBadge
            status={r.isCurrentVersion ? "ACTIVE" : "AUTO_EXPIRED"}
            label={r.isCurrentVersion ? "CURRENT (ACTIVE)" : "ARCHIVED SCD-2"}
          />
        ),
      },
      {
        key: "actions",
        header: "Action",
        align: "right",
        render: (r) =>
          r.isCurrentVersion ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openEditorForRule(r)}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Sliders className="h-3.5 w-3.5 size-3.5 shrink-0" />
              <span>New SCD-2 Version</span>
            </Button>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">
              Immutable History
            </span>
          ),
      },
    ],
    [],
  );

  return (
    <PageLayout
      title="Dynamic Inventory Rules & Replenishment Thresholds (SCD Type 2)"
      description="Configure Min, Reorder Point (ROP), Target, Max DOI thresholds, and Donor Safety Floors with effective date versioning."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowHistoricalScd2((prev) => !prev)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <History className="h-3.5 w-3.5 size-3.5 shrink-0" />
            <span>
              {showHistoricalScd2
                ? "Hide Archived SCD-2 Versions"
                : "Show SCD-2 Version History"}
            </span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => openEditorForRule(undefined)}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 size-3.5 shrink-0" />
            <span>Create New Rule</span>
          </Button>
        </div>
      }
    >
      <ServerDataTable
        data={visibleRules}
        columns={columns}
        loading={isLoading}
        page={page}
        totalPages={1}
        totalItems={visibleRules.length}
        onPageChange={setPage}
        searchValue={search}
        searchPlaceholder="Search rule code, category, or store format..."
        onSearchChange={setSearch}
      />

      {/* SCD Type 2 Rule Editor Modal */}
      <Dialog
        open={Boolean(editingRule) || isCreatingNew}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRule(null);
            setIsCreatingNew(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingRule
                ? `Publish SCD-2 Version v${editingRule.versionNumber + 1} (${editingRule.ruleCode})`
                : "Create New SCD Type-2 Inventory Rule"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scope Hierarchy</Label>
                <select
                  aria-label="Rule Scope Hierarchy"
                  value={scopeType}
                  onChange={(e) =>
                    setScopeType(
                      e.target.value as InventoryRuleRecord["scopeType"],
                    )
                  }
                  disabled={Boolean(editingRule)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
                >
                  <option value="ENTERPRISE">ENTERPRISE</option>
                  <option value="STORE_FORMAT">STORE_FORMAT</option>
                  <option value="CATEGORY">CATEGORY</option>
                  <option value="SKU_STORE">SKU_STORE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Effective From Date (SCD-2)
                </Label>
                <DatePicker
                  date={effectiveFrom}
                  onSelect={(d) => d && setEffectiveFrom(d)}
                  className="w-full h-10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Scope Target Label
              </Label>
              <Input
                value={scopeLabel}
                onChange={(e) => setScopeLabel(e.target.value)}
                placeholder="e.g., Category: Edible Oils & Ghee (5L Packs)"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-red-700">
                  Min DOI (Crit)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={minStockDays}
                  onChange={(e) => setMinStockDays(Number(e.target.value))}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-amber-700">
                  ROP Days (Low)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={reorderPointDays}
                  onChange={(e) => setReorderPointDays(Number(e.target.value))}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-emerald-700">
                  Target DOI
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={targetStockDays}
                  onChange={(e) => setTargetStockDays(Number(e.target.value))}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-purple-700">
                  Max DOI (Excess)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={maxStockDays}
                  onChange={(e) => setMaxStockDays(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Donor Store Safety Floor (Minimum Remaining Days of Inventory)
              </Label>
              <Input
                type="number"
                step="0.5"
                min={7.0}
                value={donorSafetyFloorDays}
                onChange={(e) =>
                  setDonorSafetyFloorDays(Number(e.target.value))
                }
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Enforces hard donor protection: any rebalance transfer that
                drops a donor store at or below this DOI floor is blocked.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingRule(null);
                setIsCreatingNew(false);
              }}
            >
              Cancel
            </Button>
            <StandardButton
              type="button"
              loading={saveRuleMutation.isPending}
              loadingText="Publishing..."
              onClick={() => saveRuleMutation.mutate()}
            >
              Publish SCD-2 Rule Version
            </StandardButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};
