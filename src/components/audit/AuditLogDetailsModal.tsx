import * as React from "react";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type AuditLogRecord } from "@/api/audit.api";
import { formatActionLabel, normalizeEntityName } from "@/pages/AuditLogsPage";

export interface AuditLogDetailsModalProps {
  log: AuditLogRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatJsonPretty(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

export const AuditLogDetailsModal: React.FC<AuditLogDetailsModalProps> = ({
  log,
  open,
  onOpenChange,
}) => {
  if (!log) return null;

  const oldJson = formatJsonPretty(log.oldValues);
  const newJson = formatJsonPretty(log.newValues);

  const formattedDate = new Date(log.timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Audit Log Details
                </DialogTitle>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">
                  ID: {log.id}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3">
          {/* Top 3-Column Metadata Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                PERFORMED AT
              </span>
              <span className="mt-1 block font-medium text-foreground">
                {formattedDate}
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                PERFORMED BY
              </span>
              <span className="mt-1 block font-medium text-foreground truncate" title={log.userEmail}>
                {log.userEmail}
              </span>
              <span className="text-[11px] text-muted-foreground block truncate">
                {log.userName} ({log.userRole})
              </span>
            </div>

            <div>
              <span className="block font-bold uppercase tracking-wider text-muted-foreground text-[10px]">
                RECORD ID / WHAT CHANGED
              </span>
              <span className="mt-1 block font-mono font-medium text-foreground truncate" title={log.entityId}>
                {log.entityId === "batch" ? (
                  <span className="italic text-muted-foreground">batch (bulk / unassigned)</span>
                ) : (
                  log.entityId
                )}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground block truncate">
                Table: <span className="font-semibold text-slate-700">{normalizeEntityName(log.entityName, log.action)}</span> · Action: <span className="font-semibold text-slate-700">{formatActionLabel(log.action)}</span>
              </span>
            </div>
          </div>

          {/* 2-Column Side-by-Side Old vs New JSON View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: OLD DATA */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="font-mono">&lt;&gt;</span>
                  <span>OLD DATA</span>
                </div>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                  JSON
                </span>
              </div>

              <div className="p-4 min-h-[220px] max-h-[340px] overflow-auto flex-1 font-mono text-xs">
                {oldJson ? (
                  <pre className="text-slate-800 whitespace-pre leading-relaxed select-text">
                    {oldJson}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                    <span className="font-mono text-sm italic">null</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      (No previous data for this operation)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: NEW DATA */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 bg-slate-50/50">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-mono">&lt;&gt;</span>
                  <span>NEW DATA</span>
                </div>
                <span className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                  JSON
                </span>
              </div>

              <div className="p-4 min-h-[220px] max-h-[340px] overflow-auto flex-1 font-mono text-xs">
                {newJson ? (
                  <pre className="text-slate-800 whitespace-pre leading-relaxed select-text">
                    {newJson}
                  </pre>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                    <span className="font-mono text-sm italic">null</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      (No payload captured)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-end">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-6 h-9"
          >
            CLOSE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

