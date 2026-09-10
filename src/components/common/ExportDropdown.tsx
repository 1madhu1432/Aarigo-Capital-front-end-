import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, FileCode, Printer, ChevronDown, FileCheck } from "lucide-react";
import { exportToCsv, exportToExcel, exportToJson, exportToPdf, ExportRow } from "@/utils/export";

export interface ExportDropdownProps {
  label?: string;
  filename?: string;
  sheetName?: string;
  headers?: string[];
  rows?: ExportRow[];
  jsonData?: unknown;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onExportJson?: () => void;
  onPrint?: () => void;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
  hidePrint?: boolean;
  align?: "start" | "center" | "end";
}

export function ExportDropdown({
  label = "Export",
  filename = "export_data",
  sheetName = "Sheet1",
  headers,
  rows,
  jsonData,
  onExportExcel,
  onExportCsv,
  onExportPdf,
  onExportJson,
  onPrint,
  disabled = false,
  size = "sm",
  variant = "outline",
  className = "text-xs h-8 cursor-pointer font-medium",
  hidePrint = false,
  align = "end",
}: ExportDropdownProps) {
  const handleExcel = () => {
    if (onExportExcel) {
      onExportExcel();
      return;
    }
    if (headers && rows) {
      exportToExcel(filename, sheetName, headers, rows);
    }
  };

  const handleCsv = () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    if (headers && rows) {
      exportToCsv(filename, headers, rows);
    }
  };

  const handlePdf = () => {
    if (onExportPdf) {
      onExportPdf();
      return;
    }
    if (headers && rows) {
      exportToPdf(filename, headers, rows, sheetName);
    }
  };

  const handleJson = () => {
    if (onExportJson) {
      onExportJson();
      return;
    }
    if (jsonData !== undefined) {
      exportToJson(filename, jsonData);
    } else if (headers && rows) {
      const formatted = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx];
        });
        return obj;
      });
      exportToJson(filename, formatted);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size={size}
          variant={variant}
          disabled={disabled}
          className={className}
        >
          <Download className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          <span>{label}</span>
          <ChevronDown className="h-3 w-3 ml-1.5 opacity-60 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52 shadow-md border-border/80">
        <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1 px-2.5">
          Available Export Formats
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleExcel}
          className="cursor-pointer text-xs flex items-center gap-2.5 py-2 px-2.5 hover:bg-emerald-500/10 focus:bg-emerald-500/10 dark:hover:bg-emerald-500/20"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Excel Spreadsheet</span>
            <span className="text-[10px] text-muted-foreground font-mono">.xlsx</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleCsv}
          className="cursor-pointer text-xs flex items-center gap-2.5 py-2 px-2.5 hover:bg-blue-500/10 focus:bg-blue-500/10 dark:hover:bg-blue-500/20"
        >
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">CSV Table</span>
            <span className="text-[10px] text-muted-foreground font-mono">.csv (UTF-8 BOM)</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handlePdf}
          className="cursor-pointer text-xs flex items-center gap-2.5 py-2 px-2.5 hover:bg-rose-500/10 focus:bg-rose-500/10 dark:hover:bg-rose-500/20"
        >
          <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">PDF Document</span>
            <span className="text-[10px] text-muted-foreground font-mono">.pdf vector format</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleJson}
          className="cursor-pointer text-xs flex items-center gap-2.5 py-2 px-2.5 hover:bg-amber-500/10 focus:bg-amber-500/10 dark:hover:bg-amber-500/20"
        >
          <FileCode className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">JSON Data</span>
            <span className="text-[10px] text-muted-foreground font-mono">.json structure</span>
          </div>
        </DropdownMenuItem>

        {!hidePrint && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handlePrint}
              className="cursor-pointer text-xs flex items-center gap-2.5 py-2 px-2.5 hover:bg-accent focus:bg-accent"
            >
              <Printer className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Print / Save as PDF</span>
                <span className="text-[10px] text-muted-foreground">Printer or PDF print dialog</span>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
