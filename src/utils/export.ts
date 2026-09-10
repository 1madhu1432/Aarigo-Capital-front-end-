import * as XLSX from "xlsx";
import { toast } from "sonner";

export type ExportCellValue = string | number | boolean | null | undefined;
export type ExportRow = ExportCellValue[];

export interface ExportSheetData {
  name: string;
  headers: string[];
  rows: ExportRow[];
}

/**
 * Trigger browser file download for a Blob
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as UTF-8 CSV with BOM (Byte Order Mark)
 * BOM ensures Excel correctly identifies UTF-8, rendering ₹ currency symbols and international characters cleanly.
 */
export function exportToCsv(filename: string, headers: string[], rows: ExportRow[]) {
  const formattedRows = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null || cell === undefined) return '""';
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(","),
  );

  const csvContent = "\uFEFF" + [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","), ...formattedRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const finalFilename = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;

  triggerDownload(blob, finalFilename);
  toast.success(`Exported ${finalFilename}`);
}

/**
 * Calculate reasonable column widths based on headers and sample rows
 */
function calculateColWidths(headers: string[], rows: ExportRow[]): { wch: number }[] {
  return headers.map((header, colIdx) => {
    let maxLen = header.length;
    // Check first 100 rows for performance
    const sample = rows.slice(0, 100);
    for (const r of sample) {
      const val = r[colIdx];
      if (val !== undefined && val !== null) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
  });
}

/**
 * Export a single dataset as an Excel (.xlsx) file
 */
export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: ExportRow[],
) {
  const wb = XLSX.utils.book_new();
  const aoaData: (string | number | boolean | null | undefined)[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  ws["!cols"] = calculateColWidths(headers, rows);

  // Clean sheet name (Excel limits sheet names to 31 chars and bans certain characters)
  const cleanSheetName = sheetName.replace(/[:\\/?*[\]]/g, " ").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName || "Data");

  const finalFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
  toast.success(`Exported ${finalFilename}`);
}

/**
 * Export multiple datasets into a single multi-sheet Excel (.xlsx) workbook
 */
export function exportMultiSheetExcel(
  filename: string,
  sheets: ExportSheetData[],
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet, idx) => {
    const aoaData = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    ws["!cols"] = calculateColWidths(sheet.headers, sheet.rows);

    const safeName = (sheet.name || `Sheet${idx + 1}`)
      .replace(/[:\\/?*[\]]/g, " ")
      .slice(0, 31);

    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  const finalFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, finalFilename);
  toast.success(`Exported multi-sheet workbook ${finalFilename}`);
}

/**
 * Export data as formatted JSON (.json)
 */
export function exportToJson(filename: string, data: unknown) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const finalFilename = filename.toLowerCase().endsWith(".json") ? filename : `${filename}.json`;

  triggerDownload(blob, finalFilename);
  toast.success(`Exported ${finalFilename}`);
}

/**
 * Export tabular data directly as a formatted vector PDF document (.pdf)
 */
export async function exportToPdf(
  filename: string,
  headers: string[],
  rows: ExportRow[],
  title?: string
) {
  try {
    const { jsPDF } = await import("jspdf");
    const isLandscape = headers.length > 6;
    const doc = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;

    // Header brand bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 4, "F");
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 4, pageWidth, 1, "F");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text((title || filename).toUpperCase(), margin, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}  |  Total Records: ${rows.length}`, margin, 20);

    // Columns
    const colWidth = contentWidth / headers.length;
    let curY = 25;

    const drawHeaderRow = (y: number) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, i) => {
        const text = String(h);
        doc.text(text.slice(0, 22), margin + i * colWidth + 2, y + 4.8);
      });
    };

    drawHeaderRow(curY);
    curY += 7;

    rows.forEach((row, rIdx) => {
      if (curY > pageHeight - 16) {
        doc.addPage();
        curY = 15;
        drawHeaderRow(curY);
        curY += 7;
      }

      doc.setFillColor(rIdx % 2 === 0 ? 255 : 248, rIdx % 2 === 0 ? 255 : 250, rIdx % 2 === 0 ? 255 : 252);
      doc.rect(margin, curY, contentWidth, 6, "F");
      doc.setDrawColor(235, 238, 242);
      doc.line(margin, curY + 6, pageWidth - margin, curY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);

      headers.forEach((_, cIdx) => {
        const val = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : "";
        doc.text(val.slice(0, 26), margin + cIdx * colWidth + 2, curY + 4.2);
      });

      curY += 6;
    });

    const finalFilename = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    doc.save(finalFilename);
    toast.success(`Exported ${finalFilename}`);
  } catch (err) {
    console.error("PDF export error:", err);
    toast.error("Failed to export PDF");
  }
}

