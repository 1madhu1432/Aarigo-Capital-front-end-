import { useState, useMemo } from "react";
import { Printer, ShieldCheck, FileCode2, Download, FileText } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { computeAmortizationSchedule } from "@/utils/amortization";
import { DEFAULT_TEMPLATES, renderTemplate, printHtmlDocument } from "@/utils/template-engine";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { shareReceiptOnWhatsApp } from "@/utils/whatsapp";
import { shareReceiptPdfOnWhatsApp, downloadReceiptPdf } from "@/utils/pdf-generator";
import { WhatsAppShareModal } from "@/components/common/WhatsAppShareModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string | null;
}

export function PaymentReceiptModal({ open, onOpenChange, receiptId }: PaymentReceiptModalProps) {
  const { receipts, payments, customers, loans, emis, settings, admin } = useStore();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const receipt = receiptId ? receipts.find((r) => r.id === receiptId) : null;
  const payment = receipt ? payments.find((p) => p.id === receipt.paymentId) : null;
  const customer = receipt ? customers.find((c) => c.id === receipt.customerId) : null;
  const loan = receipt ? loans.find((l) => l.id === receipt.loanId) : null;
  const targetEmi = payment ? emis.find((e) => e.id === payment.emiId) : null;

  const receiptData = useMemo(() => {
    if (!receipt || !loan) return null;

    // Full amortization schedule for this loan
    const sched = computeAmortizationSchedule(loan, emis, payments);
    const targetRow = targetEmi ? sched.rows.find((r) => r.emiNo === targetEmi.emiNo) : null;

    // Calculate itemized payment split
    const totalPaid = receipt.amount;
    const isEarlyClosure = Boolean(payment?.isEarlyClosure || loan.status === "Closed Early");

    const lateFeePaid = payment?.lateFeePaid ?? receipt.lateFeePaid ?? 0;
    const emiOnlyPaid = Math.max(0, totalPaid - lateFeePaid);

    let principalPaid = 0;
    let interestPaid = 0;
    let earlyClosureCharge = 0;

    if (isEarlyClosure) {
      earlyClosureCharge = payment?.earlyClosureCharge ?? loan.earlyClosure?.earlyClosureCharge ?? 0;
      principalPaid = Math.max(0, totalPaid - earlyClosureCharge);
      interestPaid = 0; // Waived on early closure
    } else if (targetRow) {
      const ratio = targetRow.emiAmount > 0 ? emiOnlyPaid / targetRow.emiAmount : 1;
      interestPaid = Math.round(targetRow.interestComponent * Math.min(1, ratio));
      principalPaid = Math.max(0, emiOnlyPaid - interestPaid);
    } else {
      interestPaid = Math.round(emiOnlyPaid * 0.15);
      principalPaid = emiOnlyPaid - interestPaid;
    }

    // All loan payments for this loan (non-reversed), sorted by date
    const loanPayments = payments
      .filter((p) => p.loanId === loan.id && !p.reversed)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Cumulative loan stats
    const collectedTotal = sched.totalPaid;
    const principalCollectedTotal = sched.totalPrincipalPaid;
    const interestCollectedTotal = sched.totalInterestPaid;
    const outstandingPrincipal = sched.outstandingPrincipal;
    const outstandingInterest = sched.outstandingInterest;
    const paidEmiCount = sched.rows.filter((r) => r.status === "Paid" || r.status === "Partial").length;
    const collectionPct = loan.totalPayable > 0
      ? Math.min(100, Math.round((collectedTotal / loan.totalPayable) * 100))
      : 0;

    return {
      sched,
      targetRow,
      totalPaid,
      isEarlyClosure,
      lateFeePaid,
      emiOnlyPaid,
      principalPaid,
      interestPaid,
      earlyClosureCharge,
      loanPayments,
      collectedTotal,
      principalCollectedTotal,
      interestCollectedTotal,
      outstandingPrincipal,
      outstandingInterest,
      paidEmiCount,
      collectionPct,
    };
  }, [receipt, loan, targetEmi, payment, emis, payments]);

  const hasCustomTemplate = Boolean(settings.documentTemplates?.payment_receipt);
  const customHtmlTemplate = settings.documentTemplates?.payment_receipt || DEFAULT_TEMPLATES.payment_receipt.defaultHtml;

  const renderedCustomHtml = useMemo(() => {
    if (!receipt || !loan || !receiptData) return "";
    return renderTemplate(customHtmlTemplate, {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "",
      business_email: settings.businessEmail || "",
      receipt_id: receipt.id,
      payment_id: payment?.id || receipt.paymentId,
      date: fmtDate(receipt.date),
      time: fmtDateTime(receipt.date).split(" ").slice(-2).join(" "),
      customer_id: customer?.id || receipt.customerId,
      customer_name: customer?.name || "Customer",
      customer_mobile: customer?.mobile || "",
      loan_id: loan.id,
      emi_no: targetEmi ? `${targetEmi.emiNo} of ${loan.tenure}` : "Settlement",
      payment_method: payment?.method || "Cash",
      collector_name: payment?.collectedBy || admin?.name || "Officer",
      installment_amount: inr(receiptData.emiOnlyPaid),
      late_fee_paid: inr(receiptData.lateFeePaid),
      total_paid: inr(receiptData.totalPaid),
      total_paid_words: `${inr(receiptData.totalPaid)} only`,
      principal_component: inr(receiptData.principalPaid),
      interest_component: inr(receiptData.interestPaid),
      closing_balance: inr(receiptData.outstandingPrincipal),
      receipt_footer: settings.receiptFooter || "Thank you for your repayment.",
    });
  }, [customHtmlTemplate, settings, receipt, payment, customer, loan, targetEmi, receiptData, admin]);

  const handlePrint = () => {
    if (!receipt) return;
    printHtmlDocument(renderedCustomHtml, `Receipt-${receipt.id}`);
  };

  const handleDownloadPdf = () => {
    if (!receipt || !receiptData) return;
    downloadReceiptPdf({
      receipt,
      customer,
      payment,
      loan,
      settings,
      adminName: admin?.name,
      remainingBalance: receiptData.outstandingPrincipal,
      principalPaid: receiptData.principalPaid,
      interestPaid: receiptData.interestPaid,
      lateFeePaid: receiptData.lateFeePaid,
    });
  };

  const handleShareWhatsAppText = () => {
    if (!receipt || !customer || !loan || !receiptData) return;
    shareReceiptOnWhatsApp({
      receipt,
      customer,
      payment,
      loan,
      settings,
      adminName: admin?.name,
      remainingBalance: receiptData.outstandingPrincipal,
      principalPaid: receiptData.principalPaid,
      interestPaid: receiptData.interestPaid,
      lateFeePaid: receiptData.lateFeePaid,
    });
  };

  if (!open || !receipt || !loan || !receiptData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-5">
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div>
              <DialogTitle className="text-sm font-bold">Official Payment Receipt</DialogTitle>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Receipt #{receipt.id} • {fmtDate(receipt.date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("/templates?key=payment_receipt", "_blank")}
              className="h-8 text-xs cursor-pointer border-border font-medium hover:bg-muted"
              title="Edit Payment Receipt HTML template in template studio"
            >
              <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Edit Template
            </Button>
            <Button
              size="sm"
              onClick={() => setShareModalOpen(true)}
              className="h-8 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              title="Share verified PDF Receipt to customer's registered WhatsApp number"
            >
              <WhatsAppBrandIcon className="h-3.5 w-3.5 mr-1.5 fill-white" />
              Share PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              className="h-8 text-xs cursor-pointer border-border font-medium"
              title="Download official PDF receipt file"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShareWhatsAppText}
              className="h-8 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
              title="Share receipt summary as WhatsApp text"
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              Text
            </Button>
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs cursor-pointer font-semibold">
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
            <span>Official template preview (Live rendered from HTML Template)</span>
            <button
              onClick={() => window.open("/templates?key=payment_receipt", "_blank")}
              className="text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <FileCode2 className="h-3 w-3" />
              Customize layout in HTML &rarr;
            </button>
          </div>

          <iframe
            title="Payment Receipt Preview"
            srcDoc={renderedCustomHtml}
            className="w-full flex-1 min-h-[500px] h-[560px] bg-white rounded-lg border border-border/80 shadow-xs"
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>

      {/* Target Registered Phone WhatsApp Modal */}
      <WhatsAppShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        customerName={customer?.name}
        customerId={customer?.id || receipt.customerId}
        registeredPhone={customer?.mobile}
        altPhone={customer?.altMobile}
        guarantorPhone={customer?.guarantor?.mobile}
        documentTitle={`Official Payment Receipt #${receipt.id}`}
        documentFilename={`Receipt_${receipt.id}_${(customer?.name || "Customer").replace(/\s+/g, "_")}.pdf`}
        onSendWhatsApp={(phone) => {
          shareReceiptPdfOnWhatsApp({
            receipt,
            customer,
            payment,
            loan,
            settings,
            adminName: admin?.name,
            remainingBalance: receiptData.outstandingPrincipal,
            principalPaid: receiptData.principalPaid,
            interestPaid: receiptData.interestPaid,
            lateFeePaid: receiptData.lateFeePaid,
          }, phone);
        }}
        onDownloadPdf={handleDownloadPdf}
        onCopyText={handleShareWhatsAppText}
      />
    </Dialog>
  );
}
