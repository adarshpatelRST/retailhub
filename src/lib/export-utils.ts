import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumnDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number);
}

/**
 * Generates a vector multi-page PDF table using `jspdf` + `jspdf-autotable`
 * with RetailHub enterprise branding, active filter subtitle, repeating headers,
 * and `Page X of Y` footers.
 */
export function exportToPdf<T>(
  title: string,
  subtitle: string,
  columns: ExportColumnDef<T>[],
  data: T[],
  filename: string,
): void {
  const doc = new jsPDF({
    orientation: columns.length > 7 ? "landscape" : "portrait",
  });
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((c) => {
      const val =
        typeof c.accessor === "function" ? c.accessor(row) : row[c.accessor];
      return val !== null && val !== undefined ? String(val) : "-";
    }),
  );

  doc.setFontSize(16);
  doc.text(`RepleniQ™ — ${title}`, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didDrawPage: (dataArg) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Powered by RustyStick Technologies LLP • Generated on ${new Date().toLocaleString()} • Page ${dataArg.pageNumber} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10,
      );
    },
  });

  doc.save(`${filename}_${Date.now()}.pdf`);
}

/**
 * Exports any report dataset to native Excel (`.xlsx`) with auto-fitted column widths
 * or UTF-8 comma-separated values (`.csv`) using SheetJS (`xlsx`).
 */
export function exportToExcelOrCsv<T>(
  columns: ExportColumnDef<T>[],
  data: T[],
  filename: string,
  format: "xlsx" | "csv",
): void {
  const formattedRows = data.map((row) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((c) => {
      const rawVal =
        typeof c.accessor === "function" ? c.accessor(row) : row[c.accessor];
      obj[c.header] =
        rawVal !== null && rawVal !== undefined ? (rawVal as string | number) : "-";
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  // Auto-fit column widths for native Excel workbooks
  const colWidths = columns.map((c) => {
    const maxCellLength = formattedRows.reduce((maxLen, rowObj) => {
      const cellStr = String(rowObj[c.header] ?? "");
      return Math.max(maxLen, cellStr.length);
    }, c.header.length);
    return { wch: Math.min(48, Math.max(12, maxCellLength + 3)) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  if (format === "csv") {
    XLSX.writeFile(workbook, `${filename}_${Date.now()}.csv`, {
      bookType: "csv",
    });
  } else {
    XLSX.writeFile(workbook, `${filename}_${Date.now()}.xlsx`, {
      bookType: "xlsx",
    });
  }
}
