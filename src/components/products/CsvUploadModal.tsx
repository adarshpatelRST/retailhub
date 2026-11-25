import * as React from "react";
import { Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, StandardButton } from "@/components/ui/button";
import {
  productApi,
  type CsvBatchProductRow,
  type UnitOfMeasure,
} from "@/api/product.api";
import { PRODUCT_QUERY_KEYS } from "@/hooks/useProducts";

export interface CsvUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface CsvBatchSummary {
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: Array<{ rowNumber: number; sku: string; reason: string }>;
}

const CHUNK_SIZE = 1000;

const SAMPLE_CSV_CONTENT = [
  "sku,productCode,name,brandCode,categoryCode,unitOfMeasure,costPrice,sellingPrice,mrp",
  "SKU-1024,8901024000011,UltraSoft Cotton Bath Towel White,BRD-HOME,CAT-TEXTILES,PIECE,180,249,299",
  "SKU-2048,8901024000028,Fortune Sunlite Sunflower Oil 1L,BRD-FORTUNE,CAT-COOKING-OIL,LITRE,112,135,160",
  "SKU-3072,8901024000035,Tata Sampann Toor Dal 1Kg,BRD-TATA,CAT-PULSES,KG,118,145,165",
].join("\n");

export function parseCsvProducts(csvText: string): CsvBatchProductRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: CsvBatchProductRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = cols[idx] ?? "";
    });

    const uomRaw = (record.unitOfMeasure || "PIECE").toUpperCase();
    const uom: UnitOfMeasure =
      uomRaw === "LITRE" || uomRaw === "KG" || uomRaw === "PACK"
        ? uomRaw
        : "PIECE";

    rows.push({
      sku: record.sku || `SKU-ROW-${i}`,
      productCode: record.productCode || "",
      name: record.name || "",
      brandCode: record.brandCode || "",
      categoryCode: record.categoryCode || "",
      unitOfMeasure: uom,
      costPrice: Number(record.costPrice || 0),
      sellingPrice: Number(record.sellingPrice || 0),
      mrp: Number(record.mrp || record.sellingPrice || 0),
    });
  }

  return rows;
}

export function chunkArray<T>(items: T[], chunkSize = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();
  const [parsedRows, setParsedRows] = React.useState<CsvBatchProductRow[]>([]);
  const [fileName, setFileName] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [currentChunkIndex, setCurrentChunkIndex] = React.useState(0);
  const [totalChunks, setTotalChunks] = React.useState(0);
  const [summary, setSummary] = React.useState<CsvBatchSummary | null>(null);

  // Cleanly reset upload state whenever modal opens
  React.useEffect(() => {
    if (open) {
      setParsedRows([]);
      setFileName("");
      setIsUploading(false);
      setCurrentChunkIndex(0);
      setTotalChunks(0);
      setSummary(null);
    }
  }, [open]);

  const handleDownloadSampleTemplate = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "retailhub-sku-batch-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSummary(null);
    if (!file) {
      setParsedRows([]);
      setFileName("");
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const rows = parseCsvProducts(text);
    setParsedRows(rows);
    setTotalChunks(Math.ceil(rows.length / CHUNK_SIZE));
    setCurrentChunkIndex(0);
  };

  const handleExecuteChunkedUpload = async () => {
    if (parsedRows.length === 0) return;
    setIsUploading(true);
    setSummary(null);

    const batches = chunkArray(parsedRows, CHUNK_SIZE);
    setTotalChunks(batches.length);

    const cumulative: CsvBatchSummary = {
      totalRows: parsedRows.length,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      for (let i = 0; i < batches.length; i++) {
        setCurrentChunkIndex(i + 1);
        const batchResult = await productApi.uploadBatchProducts(batches[i]);
        cumulative.insertedCount += batchResult.insertedCount;
        cumulative.updatedCount += batchResult.updatedCount;
        cumulative.failedCount += batchResult.failedCount;
        if (batchResult.errors?.length) {
          cumulative.errors.push(...batchResult.errors);
        }
      }

      setSummary(cumulative);
      queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      toast.success(
        `Processed ${cumulative.totalRows} SKUs across ${batches.length} batch(es)`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Batch CSV upload failed";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const progressPercent =
    totalChunks > 0 ? Math.round((currentChunkIndex / totalChunks) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold break-words">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
            <span>CSV Bulk SKU Import</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground break-words">
            Import and update multiple product SKUs using a standard CSV spreadsheet.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template Download Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 min-w-0">
            <div className="text-xs min-w-0 flex-1">
              <div className="font-semibold text-foreground">
                Standard 9-Column CSV Schema
              </div>
              <div className="font-mono text-[11px] text-muted-foreground break-all whitespace-normal mt-0.5">
                sku,productCode,name,brandCode,categoryCode,unitOfMeasure,costPrice,sellingPrice,mrp
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSampleTemplate}
              className="shrink-0 self-start sm:self-auto gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Template</span>
            </Button>
          </div>

          {/* Native File Input */}
          <div className="space-y-2">
            <label
              htmlFor="csv-bulk-file-input"
              className="block text-xs font-medium text-foreground"
            >
              Select Catalog CSV File
            </label>
            <input
              id="csv-bulk-file-input"
              type="file"
              accept=".csv"
              disabled={isUploading}
              onChange={handleFileChange}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary/20"
            />
            {fileName && (
              <div className="text-xs text-muted-foreground font-mono">
                <span>File: {fileName}</span>
              </div>
            )}
          </div>

          {/* Final Upsert Summary */}
          {summary && (
            <div className="rounded-md border bg-emerald-500/5 border-emerald-500/30 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Batch Import Complete</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                <div className="rounded border bg-background p-2">
                  <div className="text-[10px] text-muted-foreground">Total</div>
                  <div className="font-bold">{summary.totalRows}</div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-[10px] text-emerald-600">Inserted</div>
                  <div className="font-bold text-emerald-600">
                    {summary.insertedCount}
                  </div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-[10px] text-blue-600">
                    Updated/Skipped
                  </div>
                  <div className="font-bold text-blue-600">
                    {summary.updatedCount}
                  </div>
                </div>
                <div className="rounded border bg-background p-2">
                  <div className="text-[10px] text-red-600">Failed</div>
                  <div className="font-bold text-red-600">
                    {summary.failedCount}
                  </div>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded border bg-background p-2 text-[11px] font-mono text-red-600 space-y-1">
                  {summary.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>
                        Row {err.rowNumber} ({err.sku}): {err.reason}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background flex justify-end gap-2 sm:static sm:border-t-0 sm:p-0">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <StandardButton
            type="button"
            isLoading={isUploading}
            disabled={parsedRows.length === 0}
            onClick={handleExecuteChunkedUpload}
          >
            Upload {parsedRows.length > 0 ? `(${parsedRows.length} SKUs)` : ""}
          </StandardButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
