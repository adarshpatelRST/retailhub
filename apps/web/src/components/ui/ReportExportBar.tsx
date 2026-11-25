import * as React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportToExcelOrCsv,
  exportToPdf,
  type ExportColumnDef,
} from "@/lib/export-utils";

export interface ReportExportBarProps<T> {
  reportTitle: string;
  filterSubtitle: string;
  columns: ExportColumnDef<T>[];
  data: T[];
  filenamePrefix: string;
  disabled?: boolean;
}

export function ReportExportBar<T>({
  reportTitle,
  filterSubtitle,
  columns,
  data,
  filenamePrefix,
  disabled = false,
}: ReportExportBarProps<T>) {
  const isDisabled = disabled || data.length === 0;

  const handleExportPdf = () => {
    try {
      exportToPdf(reportTitle, filterSubtitle, columns, data, filenamePrefix);
      toast.success(`Exported ${data.length} rows to PDF (${filenamePrefix}.pdf)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate PDF report.",
      );
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcelOrCsv(columns, data, filenamePrefix, "xlsx");
      toast.success(
        `Exported ${data.length} rows to Excel (${filenamePrefix}.xlsx)`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate Excel workbook.",
      );
    }
  };

  const handleExportCsv = () => {
    try {
      exportToExcelOrCsv(columns, data, filenamePrefix, "csv");
      toast.success(`Exported ${data.length} rows to CSV (${filenamePrefix}.csv)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate CSV file.",
      );
    }
  };

  return (
    <div
      role="group"
      aria-label="Export report formats"
      className="flex flex-wrap items-center gap-2"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={handleExportPdf}
        className="h-9 gap-1.5 text-xs font-semibold"
      >
        <FileText className="h-3.5 w-3.5 size-3.5 text-red-600 shrink-0" />
        <span>Export PDF</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={handleExportExcel}
        className="h-9 gap-1.5 text-xs font-semibold"
      >
        <FileSpreadsheet className="h-3.5 w-3.5 size-3.5 text-emerald-600 shrink-0" />
        <span>Export Excel (.xlsx)</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isDisabled}
        onClick={handleExportCsv}
        className="h-9 gap-1.5 text-xs font-semibold"
      >
        <Download className="h-3.5 w-3.5 size-3.5 text-blue-600 shrink-0" />
        <span>Export CSV</span>
      </Button>
    </div>
  );
}
