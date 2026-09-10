import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, FileCode2, Calendar, Filter } from "lucide-react";
import { inr, fmtDate } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { computeAmortizationSchedule } from "@/utils/amortization";
import { DEFAULT_TEMPLATES, renderTemplate, printHtmlDocument } from "@/utils/template-engine";
import type { Loan, Customer } from "@/types";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { shareEmiSchedulePdfOnWhatsApp, downloadEmiSchedulePdf } from "@/utils/pdf-generator";

interface EmiSchedulePrintModalProps {
  loan: Loan | null;
  customer?: Customer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmiSchedulePrintModal({
  loan,
  customer,
  open,
  onOpenChange,
}: EmiSchedulePrintModalProps) {
  const { emis, payments, settings } = useStore();
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const sched = useMemo(() => {
    if (!loan) return null;
    return computeAmortizationSchedule(loan, emis, payments);
  }, [loan, emis, payments]);

  const displayedRows = useMemo(() => {
    if (!sched) return [];
    if (statusFilter === "All") return sched.rows;
    return sched.rows.filter((r) => {
      if (statusFilter === "Pending") {
        return r.status === "Due" || r.status === "Upcoming" || r.status === "Overdue" || r.status === "Partial";
      }
      return r.status === statusFilter;
    });
  }, [sched, statusFilter]);

  const paidCount = sched?.rows.filter((r) => r.status === "Paid").length || 0;
  const partialCount = sched?.rows.filter((r) => r.status === "Partial").length || 0;
  const overdueCount = sched?.rows.filter((r) => r.status === "Overdue").length || 0;
  const upcomingCount = sched?.rows.filter((r) => r.status === "Upcoming" || r.status === "Due").length || 0;
  const cancelledCount = sched?.rows.filter((r) => r.status === "Cancelled").length || 0;

  const targetRows = statusFilter === "All" ? (sched?.rows || []) : displayedRows;

  const scheduleExportData = useMemo(() => {
    if (!sched || !sched.rows) return { headers: [], rows: [] };
    const headers = [
      "Installment No",
      "EMI ID",
      "Due Date",
      "EMI Amount",
      "Principal Component",
      "Interest Component",
      "Paid Amount",
      "Closing Balance",
      "Status",
      "Payment Date",
      "Payment ID",
      "Receipt ID",
      "Payment Method",
      "Remarks",
    ];

    const rows = targetRows.map((r) => [
      r.emiNo,
      r.emiId,
      r.dueDate,
      r.emiAmount,
      r.principalComponent,
      r.interestComponent,
      r.paidAmount,
      r.closingBalance,
      r.status,
      r.paymentDetails?.date ? fmtDate(r.paymentDetails.date) : "—",
      r.paymentDetails?.paymentId ?? "—",
      r.paymentDetails?.receiptId ?? "—",
      r.paymentDetails?.method ?? "—",
      r.remarks || "",
    ]);

    return { headers, rows };
  }, [sched, targetRows]);

  const templateHtml = settings.documentTemplates?.emi_schedule || DEFAULT_TEMPLATES.emi_schedule.defaultHtml;

  const renderedHtml = useMemo(() => {
    if (!loan || !sched) return "";

    const scheduleRowsHtml = targetRows.map((r) => {
      const statusColor =
        r.status === "Paid" ? "#16a34a" :
        r.status === "Overdue" ? "#dc2626" :
        r.status === "Partial" ? "#d97706" :
        r.status === "Cancelled" ? "#9333ea" : "#2563eb";
      const statusBg =
        r.status === "Paid" ? "#f0fdf4" :
        r.status === "Overdue" ? "#fef2f2" :
        r.status === "Partial" ? "#fffbeb" :
        r.status === "Cancelled" ? "#faf5ff" : "#eff6ff";

      return `<tr>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: 600;">${r.emiNo}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${fmtDate(r.dueDate)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-family: monospace;">${inr(r.emiAmount)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${inr(r.principalComponent)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-family: monospace;">${inr(r.interestComponent)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; font-family: monospace;">${inr(r.closingBalance)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusColor}33;">
            ${r.status}
          </span>
        </td>
      </tr>`;
    }).join("\n");

    const totalScheduled = targetRows.reduce((s, r) => s + r.emiAmount, 0);
    const totalPrinc = targetRows.reduce((s, r) => s + r.principalComponent, 0);
    const totalInt = targetRows.reduce((s, r) => s + r.interestComponent, 0);
    const totalPending = targetRows.reduce((s, r) => s + (r.status !== "Cancelled" ? r.remainingAmount : 0), 0);

    const totalSummaryRow = `
      <tr style="font-weight: bold; background: #f8fafc; border-top: 2px solid #0f172a;">
        <td style="padding: 8px; border: 1px solid #cbd5e1;" colspan="2">TOTAL (${targetRows.length} Installments)</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${inr(totalScheduled)}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${inr(totalPrinc)}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace;">${inr(totalInt)}</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-family: monospace; color: #2563eb;">${inr(totalPending)} Pending</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${paidCount}/${sched.rows.length} Paid</td>
      </tr>
    `;

    return renderTemplate(templateHtml, {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "+91 98480 12345",
      business_email: settings.businessEmail || "support@aarigo.com",
      loan_id: loan.id,
      customer_name: customer?.name || "Customer",
      customer_id: loan.customerId,
      principal: inr(loan.principal),
      emi_amount: inr(loan.emiAmount),
      tenure: `${loan.tenure} ${loan.frequency === "Monthly" ? "Months" : loan.frequency === "Weekly" ? "Weeks" : "Days"}`,
      frequency: loan.frequency,
      start_date: fmtDate(loan.startDate),
      maturity_date: fmtDate(loan.endDate),
      schedule_rows_html: scheduleRowsHtml + totalSummaryRow,
    });
  }, [loan, sched, targetRows, settings, customer, templateHtml, paidCount]);

  const handlePrint = () => {
    if (!loan || !renderedHtml) return;
    printHtmlDocument(renderedHtml, `EMI-Schedule-${loan.id}`);
  };

  if (!open || !loan || !sched) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-5">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary shrink-0" />
            <div>
              <DialogTitle className="text-sm font-bold">Amortization & Repayment Schedule</DialogTitle>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Loan #{loan.id} • {sched.rows.length} Total Installments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Filter */}
            <div className="flex items-center gap-1">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[125px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All ({sched.rows.length})</SelectItem>
                  <SelectItem value="Paid">Paid ({paidCount})</SelectItem>
                  <SelectItem value="Partial">Partial ({partialCount})</SelectItem>
                  <SelectItem value="Pending">Pending ({upcomingCount + overdueCount})</SelectItem>
                  <SelectItem value="Overdue">Overdue ({overdueCount})</SelectItem>
                  <SelectItem value="Cancelled">Cancelled ({cancelledCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Edit HTML Template in /templates */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("/templates?key=emi_schedule", "_blank")}
              className="h-8 text-xs cursor-pointer border-border font-medium hover:bg-muted"
              title="Edit EMI Schedule HTML template in template studio"
            >
              <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Edit Template
            </Button>

            <ExportDropdown
              label="Export"
              filename={`EMI_Schedule_${loan.id}_${loan.customerId}`}
              sheetName="EMI Schedule"
              headers={scheduleExportData.headers}
              rows={scheduleExportData.rows}
              hidePrint={true}
            />

            {/* Share PDF to WhatsApp */}
            <Button
              size="sm"
              className="text-xs h-8 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              onClick={() => {
                shareEmiSchedulePdfOnWhatsApp({
                  loan,
                  customer,
                  sched,
                  settings,
                });
              }}
              title="Share verified EMI Schedule PDF via WhatsApp"
            >
              <WhatsAppBrandIcon className="h-3.5 w-3.5 mr-1.5 fill-white" />
              Share PDF
            </Button>

            {/* Direct Download PDF */}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 cursor-pointer border-border font-medium"
              onClick={() => {
                downloadEmiSchedulePdf({
                  loan,
                  customer,
                  sched,
                  settings,
                });
              }}
              title="Download official EMI Schedule PDF file"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
              PDF
            </Button>

            <Button
              size="sm"
              className="text-xs h-8 cursor-pointer bg-primary text-primary-foreground font-semibold"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Schedule
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>Official template preview (Live rendered from HTML Template)</span>
            <button
              onClick={() => window.open("/templates?key=emi_schedule", "_blank")}
              className="text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <FileCode2 className="h-3 w-3" />
              Customize layout in HTML &rarr;
            </button>
          </div>

          <iframe
            title="EMI Schedule Preview"
            srcDoc={renderedHtml}
            className="w-full flex-1 min-h-[500px] h-[580px] bg-white rounded-lg border border-border/80 shadow-xs"
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
