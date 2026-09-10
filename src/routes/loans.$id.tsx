import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  User,
  CreditCard,
  Calendar,
  BarChart2,
  FileText,
  MapPin,
  CheckCircle2,
  Printer,
  Download,
  ShieldCheck,
  Clock,
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  FileSignature,
  FileCode2,
  ChevronDown,
  FileSpreadsheet,
  ShieldAlert,
  Award,
  MessageSquare,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, safe, todayISO, generateNocNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { PaymentReceiptModal } from "@/components/loans/PaymentReceiptModal";
import { computeAmortizationSchedule, calculateLateFee } from "@/utils/amortization";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { DocumentManager } from "@/components/customers/DocumentManager";
import { getCustomerCompliance } from "@/utils/document-compliance";
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  printHtmlDocument,
} from "@/utils/template-engine";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { shareReceiptOnWhatsApp } from "@/utils/whatsapp";

export const Route = createFileRoute("/loans/$id")({
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { id } = useParams({ from: "/loans/$id" });
  const navigate = useNavigate();
  const { loans, customers, emis, payments, receipts, visits, documents, settings, admin } = useStore();

  const [previewDocKey, setPreviewDocKey] = useState<string | null>(null);
  const [showEarlyCloseModal, setShowEarlyCloseModal] = useState(false);
  const [showPrintScheduleModal, setShowPrintScheduleModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const loan = loans.find((l) => l.id === id);
  const customer = loan ? customers.find((c) => c.id === loan.customerId) : undefined;
  const loanEmis = useMemo(() => emis.filter((e) => e.loanId === id), [emis, id]);
  const loanPayments = useMemo(() => payments.filter((p) => p.loanId === id), [payments, id]);
  const loanVisits = useMemo(() => visits.filter((v) => v.loanId === id), [visits, id]);
  const loanDocs = useMemo(() => {
    return documents.filter(
      (d) => d.loanId === id || (d.customerId === loan?.customerId && d.category === "LOAN_DOCUMENTS")
    );
  }, [documents, id, loan?.customerId]);

  const loanCompliance = useMemo(() => {
    if (!customer || !loan) return null;
    return getCustomerCompliance(customer, documents, loans, id);
  }, [customer, loan, documents, loans, id]);

  const isClosedEarly = loan?.status === "Closed Early" || Boolean(loan?.earlyClosure);
  const sched = useMemo(() => (loan ? computeAmortizationSchedule(loan, emis, payments) : null), [loan, emis, payments]);

  const totalPaid = useMemo(() => loanPayments.filter((p) => !p.reversed).reduce((s, p) => s + p.amount, 0), [loanPayments]);
  const outstanding = isClosedEarly ? 0 : loan ? Math.max(0, loan.totalPayable - totalPaid) : 0;
  
  const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
  const partialEmis = loanEmis.filter((e) => e.status === "Partial").length;
  const pendingEmis = loanEmis.filter((e) => e.status !== "Paid").length;
  const overdueEmis = loanEmis.filter((e) => e.status === "Overdue").length;

  const paidEmiAmount = loanEmis.reduce((s, e) => s + e.paid, 0);
  const pendingEmiAmount = isClosedEarly ? 0 : loanEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
  const overdueEmiAmount = loanEmis.filter((e) => e.status === "Overdue").reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);

  const principalPaid = isClosedEarly
    ? (loan?.principal ?? 0)
    : (sched?.totalPrincipalPaid ?? 0);
  const principalPending = isClosedEarly
    ? 0
    : (sched?.outstandingPrincipal ?? Math.max(0, (loan?.principal ?? 0) - principalPaid));
  const principalPaidPct = loan && loan.principal > 0
    ? Math.min(100, Math.round((principalPaid / loan.principal) * 100))
    : 0;

  const interestPaid = sched?.totalInterestPaid ?? 0;
  const interestPending = isClosedEarly
    ? 0
    : Math.max(0, (loan?.totalInterest ?? 0) - interestPaid);

  const progress = loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
  const canEarlyClose = Boolean(loan && loan.status !== "Closed" && !isClosedEarly && (sched?.outstandingPrincipal ?? 0) > 0);

  const netDisbursed = loan ? Math.max(0, loan.principal - safe(loan.processingFee) - safe(loan.insurance)) : 0;

  const [emiScheduleFilter, setEmiScheduleFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");

  const filteredSchedRows = useMemo(() => {
    if (!sched?.rows) return [];
    if (emiScheduleFilter === "all") return sched.rows;
    if (emiScheduleFilter === "paid") return sched.rows.filter((r) => r.status === "Paid");
    if (emiScheduleFilter === "pending") return sched.rows.filter((r) => r.status !== "Paid");
    if (emiScheduleFilter === "overdue") return sched.rows.filter((r) => r.status === "Overdue");
    return sched.rows;
  }, [sched?.rows, emiScheduleFilter]);

  const scheduleExportData = useMemo(() => {
    const headers = [
      "Installment No",
      "Due Date",
      "EMI Amount",
      "Principal Component",
      "Interest Component",
      "Remaining Balance",
      "Late Fee Paid",
      "Status",
    ];

    const rows = filteredSchedRows.map((r) => [
      r.emiNo,
      fmtDate(r.dueDate),
      r.emiAmount,
      r.principalComponent,
      r.interestComponent,
      r.remainingAmount,
      r.lateFeePaid || 0,
      r.status,
    ]);

    return { headers, rows };
  }, [filteredSchedRows]);

  const getLoanTemplateData = (templateKey: string) => {
    if (!loan || !customer) return {};
    const fullAddress = customer.address
      ? `${customer.address.house || ""}, ${customer.address.area || ""}, ${customer.address.city || ""}, ${customer.address.district || ""} - ${customer.address.pin || ""}`
      : "";
    const guarantorAddress = customer.guarantor?.address || fullAddress;
    const paidPrincipal = isClosedEarly ? loan.principal : (sched?.totalPrincipalPaid ?? 0);
    const unpaidPrincipal = isClosedEarly ? 0 : Math.max(0, loan.principal - paidPrincipal);
    const disbGross = loan.disbursement?.grossPrincipal || loan.principal;
    const disbProcFee = loan.disbursement?.processingFeeDeducted ?? loan.processingFee;
    const disbDocFee = loan.disbursement?.documentationChargesDeducted ?? 0;
    const disbNet = loan.disbursement?.netDisbursedAmount || (disbGross - disbProcFee - disbDocFee);
    const nocCertNumber = loan.earlyClosure?.nocReferenceNumber || generateNocNumber(loan.id);

    return {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "",
      business_email: settings.businessEmail || "",
      receipt_footer: settings.receiptFooter || "Authorized and certified lending documentation.",
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      customer_address: fullAddress,
      loan_id: loan.id,
      principal: inr(loan.principal),
      principal_words: `${inr(loan.principal)} only`,
      interest_rate: `${loan.interestRate}% p.a.`,
      tenure_months: `${loan.tenure} ${loan.frequency} installments`,
      frequency: loan.frequency,
      emi_amount: inr(loan.emiAmount),
      processing_fee: inr(loan.processingFee),
      total_payable: inr(loan.totalPayable),
      sanction_date: fmtDate(loan.startDate),
      collateral_details: loan.collateral || "Unsecured Micro-Enterprise Loan",
      purpose: loan.purpose || "Business Working Capital",
      loan_date: fmtDate(loan.startDate),
      repayment_terms: `${loan.tenure} ${loan.frequency} payments of ${inr(loan.emiAmount)}`,
      guarantor_name: customer.guarantor?.name || "Guarantor",
      guarantor_relation: customer.guarantor?.relationship || "Relative",
      guarantor_mobile: customer.guarantor?.mobile || "—",
      guarantor_address: guarantorAddress,
      liability_clause: "Jointly and severally liable for all repayment obligations.",
      gross_principal: inr(disbGross),
      documentation_fee: inr(disbDocFee),
      net_disbursed: inr(disbNet),
      disbursement_date: fmtDate(loan.disbursement?.disbursedAt || loan.startDate),
      payment_mode: loan.disbursement?.paymentMode || "Bank Transfer",
      bank_utr: loan.disbursement?.bankUtr || "UTR-INTERNAL-SYS",
      disbursed_by: loan.disbursement?.disbursedBy || "Branch Cashier",
      closure_date: fmtDate(loan.earlyClosure?.closureDate || loan.endDate || todayISO()),
      principal_paid: inr(paidPrincipal),
      unpaid_principal: inr(loan.earlyClosure?.principalOutstandingAtClosure ?? unpaidPrincipal),
      foreclosure_fee: inr(loan.earlyClosure?.earlyClosureCharge ?? 0),
      interest_rebate: inr(loan.earlyClosure?.rebateInterest ?? 0),
      final_settlement_amount: inr(loan.earlyClosure?.finalClosureAmount ?? unpaidPrincipal),
      noc_reference: nocCertNumber,
      certificate_no: nocCertNumber,
      issue_date: fmtDate(todayISO()),
      sanctioned_amount: inr(loan.principal),
      closure_type: loan.status === "Closed Early" ? "Early Settlement (Foreclosed)" : "Full Term Repaid (Maturity)",
      notice_date: fmtDate(todayISO()),
      overdue_installments: overdueEmis.toString(),
      overdue_amount: inr(overdueEmiAmount),
      late_fee_amount: inr(loanEmis.reduce((s, e) => s + (e.lateFee || 0), 0)),
      total_due_now: inr(overdueEmiAmount + loanEmis.reduce((s, e) => s + (e.lateFee || 0), 0)),
      due_by_date: fmtDate(new Date(Date.now() + 7 * 86400000).toISOString()),
    };
  };

  const printLoanDocument = (templateKey: string) => {
    if (!loan || !customer) return;
    const templateDef = DEFAULT_TEMPLATES[templateKey];
    if (!templateDef) return;

    const templateHtml = settings.documentTemplates?.[templateKey] || templateDef.defaultHtml;
    const data = getLoanTemplateData(templateKey);
    const rendered = renderTemplate(templateHtml, data);
    printHtmlDocument(rendered, `${templateDef.name}-${loan.id}`);
  };

  const renderedPreviewDocHtml = useMemo(() => {
    if (!previewDocKey || !loan || !customer) return "";
    const templateDef = DEFAULT_TEMPLATES[previewDocKey];
    if (!templateDef) return "";
    const templateHtml = settings.documentTemplates?.[previewDocKey] || templateDef.defaultHtml;
    const data = getLoanTemplateData(previewDocKey);
    return renderTemplate(templateHtml, data);
  }, [previewDocKey, loan, customer, settings, isClosedEarly, sched, overdueEmis, overdueEmiAmount, loanEmis]);

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Loan not found.</p>
        <Button size="sm" onClick={() => void navigate({ to: "/loans" })} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate({ to: "/loans" })}
          className="text-xs h-8 -ml-2 w-fit cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Loans
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export & Print EMI Schedule */}
          <ExportDropdown
            label="Export Schedule"
            filename={`loan_${loan.id}_schedule`}
            sheetName="Repayment Schedule"
            headers={scheduleExportData.headers}
            rows={scheduleExportData.rows}
            onPrint={() => setShowPrintScheduleModal(true)}
          />

          {/* Early Close Loan (User Req Part A) */}
          {canEarlyClose && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-9 cursor-pointer border-purple-500/40 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 font-medium"
              onClick={() => setShowEarlyCloseModal(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
              Early Close Loan
            </Button>
          )}

          {/* Print Official Lending Documents Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs h-9 cursor-pointer">
                <FileText className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Print Documents
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 text-xs">
              <DropdownMenuItem onClick={() => setPreviewDocKey("sanction_agreement")} className="cursor-pointer">
                <FileText className="h-3.5 w-3.5 mr-2 text-primary" />
                Sanction Agreement & Letter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewDocKey("promissory_note")} className="cursor-pointer">
                <FileSignature className="h-3.5 w-3.5 mr-2 text-amber-600" />
                Demand Promissory Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewDocKey("disbursement_voucher")} className="cursor-pointer">
                <Banknote className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                Disbursement Voucher
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewDocKey("guarantor_undertaking")} className="cursor-pointer">
                <ShieldCheck className="h-3.5 w-3.5 mr-2 text-blue-600" />
                Guarantor Undertaking
              </DropdownMenuItem>
              {overdueEmis > 0 && (
                <DropdownMenuItem onClick={() => setPreviewDocKey("demand_notice")} className="cursor-pointer">
                  <AlertTriangle className="h-3.5 w-3.5 mr-2 text-rose-600" />
                  Overdue Demand Notice
                </DropdownMenuItem>
              )}
              {(isClosedEarly || loan.status === "Closed") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPreviewDocKey("noc_certificate")} className="cursor-pointer">
                    <Award className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                    No Objection Certificate (NOC)
                  </DropdownMenuItem>
                  {isClosedEarly && (
                    <DropdownMenuItem onClick={() => setPreviewDocKey("foreclosure_statement")} className="cursor-pointer">
                      <ShieldAlert className="h-3.5 w-3.5 mr-2 text-purple-600" />
                      Foreclosure Settlement
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isClosedEarly && loan.status !== "Closed" && (
            <Button
              size="sm"
              className="text-xs h-9 cursor-pointer"
              onClick={() => void navigate({ to: "/collection" })}
            >
              <Banknote className="h-3.5 w-3.5 mr-1.5" />
              Collect EMI
            </Button>
          )}
        </div>
      </div>

      {/* Loan Header */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-foreground">{loan.id}</span>
                <StatusBadge status={loan.status} size="sm" />
                {isClosedEarly && (
                  <Badge className="text-xs bg-purple-500/15 text-purple-700 border-purple-500/30">
                    Foreclosed
                  </Badge>
                )}
                {(loan.status === "Closed" || isClosedEarly) && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 cursor-pointer"
                    onClick={() => {
                      const tab = document.querySelector('[value="docs"]') as HTMLButtonElement;
                      tab?.click();
                    }}
                    title="Click to view No Objection Certificate in Documents tab"
                  >
                    <Award className="h-3 w-3 mr-1 text-emerald-600" />
                    NOC Available
                  </Badge>
                )}
                {loanCompliance && (
                  loanCompliance.isCompliant ? (
                    <Badge className="text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Agreement On File
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-xs bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 animate-pulse cursor-pointer"
                      onClick={() => {
                        const tab = document.querySelector('[value="docs"]') as HTMLButtonElement;
                        tab?.click();
                      }}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Doc Missing ({loanCompliance.missingCount})
                    </Badge>
                  )
                )}
              </div>
              {customer && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
                  >
                    {customer.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{customer.name}</span>
                  <span
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                    onClick={() => void navigate({ to: "/customers/$id", params: { id: customer.id } })}
                  >
                    {customer.id}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Repayment Progress</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {isClosedEarly ? "100% Settled" : `${progress}% Complete`}
              </p>
              <Progress value={isClosedEarly ? 100 : progress} className="h-2 mt-1.5 w-44 ml-auto" />
              <div className="flex flex-col items-end gap-0.5 mt-1.5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Principal:</span>
                  <span className="text-emerald-600 font-bold">{inr(principalPaid)}</span>
                  <span className="text-muted-foreground">paid</span>
                  <span className="text-muted-foreground">•</span>
                  <span className={principalPending > 0 ? "text-amber-600 font-bold" : "text-muted-foreground"}>
                    {inr(principalPending)}
                  </span>
                  <span className="text-muted-foreground">pending</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>EMI: {inr(totalPaid)} paid ({paidEmis})</span>
                  <span>•</span>
                  <span>{inr(outstanding)} pending ({pendingEmis})</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Loan & Repayment Metrics: Principal Paid/Pending & EMI Paid/Pending */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Loan Amount */}
        <Card className="shadow-xs border-border/80 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Loan Amount</span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">Principal</Badge>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground mt-1.5">{inr(loan.principal)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Net Disbursed:</span>
              <span className="font-mono font-semibold text-foreground">{inr(netDisbursed)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Principal Paid */}
        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Principal Paid</span>
              <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {principalPaidPct}% Settled
              </Badge>
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5">{inr(principalPaid)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Interest Paid:</span>
              <span className="font-mono font-semibold text-emerald-600">{inr(interestPaid)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Principal Pending */}
        <Card className={`shadow-xs bg-gradient-to-br from-card ${principalPending > 0 ? "border-amber-500/40 to-amber-500/5" : "border-border/80 to-muted/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${principalPending > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                Principal Pending
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  principalPending > 0
                    ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {100 - principalPaidPct}% Left
              </Badge>
            </div>
            <p className={`text-2xl font-bold font-mono mt-1.5 ${principalPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
              {inr(principalPending)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Interest Pending:</span>
              <span className="font-mono font-semibold text-foreground">{inr(interestPending)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: EMI Amount Paid */}
        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">EMI Amount Paid</span>
              <Badge className="text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {paidEmis} of {loanEmis.length} EMIs
              </Badge>
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1.5">{inr(totalPaid)}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>Repaid Ratio:</span>
              <span className="font-semibold text-emerald-600">{progress}% {partialEmis > 0 ? `(${partialEmis} partial)` : "cleared"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: EMI Amount Pending */}
        <Card className={`shadow-xs bg-gradient-to-br from-card ${outstanding > 0 ? "border-amber-500/40 to-amber-500/5" : "border-border/80 to-muted/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${outstanding > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                EMI Amount Pending
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  overdueEmis > 0
                    ? "border-destructive/40 text-destructive bg-destructive/10"
                    : outstanding > 0
                    ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10"
                    : "border-border text-muted-foreground"
                }`}
              >
                {pendingEmis} of {loanEmis.length} Pending
              </Badge>
            </div>
            <p className={`text-2xl font-bold font-mono mt-1.5 ${outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
              {inr(outstanding)}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
              <span>{overdueEmis > 0 ? "Overdue Due:" : "Next Due Date:"}</span>
              <span className={`font-semibold ${overdueEmis > 0 ? "text-destructive font-mono" : "text-foreground"}`}>
                {overdueEmis > 0 ? `${overdueEmis} EMI (${inr(overdueEmiAmount)})` : fmtDate(loanEmis.find(e => e.status !== "Paid")?.dueDate ?? "") || "Completed"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Early Closure History Card (User Req A7) */}
      {isClosedEarly && loan.earlyClosure && (
        <Card className="shadow-xs border-purple-500/30 bg-purple-500/5">
          <CardHeader className="p-4 pb-2 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  Early Closure & Foreclosure Record
                </CardTitle>
              </div>
              <Badge className="text-[10px] bg-purple-600 text-white font-bold">
                Settled in Full
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Closure Date</p>
              <p className="font-semibold text-foreground mt-0.5">{fmtDate(loan.earlyClosure.closureDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Outstanding Principal</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{inr(loan.earlyClosure.outstandingPrincipal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Closure Charge ({loan.earlyClosure.earlyClosureChargePercent}%)</p>
              <p className="font-mono font-bold text-purple-700 dark:text-purple-400 mt-0.5">{inr(loan.earlyClosure.earlyClosureCharge)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Future Interest Charged</p>
              <p className="font-mono font-bold text-emerald-600 mt-0.5">₹0</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Final Settlement</p>
              <p className="font-mono font-bold text-sm text-purple-700 dark:text-purple-400 mt-0.5">{inr(loan.earlyClosure.finalClosureAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Payment Mode</p>
              <p className="font-medium text-foreground mt-0.5">{loan.earlyClosure.paymentMethod}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Payment ID</p>
              <p className="font-mono text-muted-foreground mt-0.5">{loan.earlyClosure.paymentId}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Receipt ID</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{loan.earlyClosure.receiptId}</p>
            </div>
            {loan.earlyClosure.bankTransactionId && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Bank Tx Ref</p>
                <p className="font-mono text-foreground mt-0.5">{loan.earlyClosure.bankTransactionId}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase">Settlement Notes</p>
              <p className="text-muted-foreground mt-0.5 truncate">{loan.earlyClosure.notes || "Foreclosed early"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Financial Summary Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Loan Amount", value: inr(loan.principal), color: "" },
          { label: "Principal Paid", value: inr(principalPaid), color: "text-emerald-600 dark:text-emerald-400 font-bold" },
          { label: "Principal Pending", value: inr(principalPending), color: principalPending > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 font-bold" },
          { label: "Net Disbursed", value: inr(netDisbursed), color: "text-blue-600 dark:text-blue-400" },
          { label: "Total Interest", value: inr(loan.totalInterest), color: "" },
          { label: "Total Payable", value: inr(loan.totalPayable), color: "" },
          { label: "EMI Amount Paid", value: inr(totalPaid), color: "text-emerald-600 dark:text-emerald-400 font-bold" },
          { label: "EMI Amount Pending", value: inr(outstanding), color: outstanding > 0 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-emerald-600 font-bold" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-xs border-border">
            <CardContent className="p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
              <p className={`text-xs font-bold mt-0.5 font-mono ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loan Terms & Disbursement */}
      <Card className="shadow-xs border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-xs font-semibold">Terms & Disbursement Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            { label: "Interest Rate", value: `${loan.interestRate}% p.a.` },
            { label: "Interest Method", value: loan.interestMethod },
            { label: "Tenure", value: `${loan.tenure} ${loan.frequency === "Monthly" ? "months" : loan.frequency === "Weekly" ? "weeks" : "days"}` },
            { label: "EMI Frequency", value: loan.frequency },
            { label: "Disbursement Method", value: loan.disbursementMethod || "Cash" },
            { label: "Bank Tx / Ref", value: loan.bankTransactionId || "—" },
            { label: "EMI Amount", value: inr(loan.emiAmount) },
            { label: "Start Date", value: fmtDate(loan.startDate) },
            { label: "First EMI Date", value: fmtDate(loan.firstEmiDate) },
            { label: "End Date", value: fmtDate(loan.endDate) },
            { label: "Purpose", value: loan.purpose || "General Purpose" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule" className="text-xs">EMI Schedule ({loanEmis.length})</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments ({loanPayments.length})</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs">Visits ({loanVisits.length})</TabsTrigger>
          <TabsTrigger value="docs" className="text-xs flex items-center gap-1.5">
            <span>Documents & Agreement ({loanDocs.length})</span>
            {loanCompliance && !loanCompliance.isCompliant && (
              <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="m-0 mt-4 space-y-3">
          {/* Quick Filter Bar for EMI Schedule */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground font-medium mr-1">Filter EMIs:</span>
              <Button
                type="button"
                size="sm"
                variant={emiScheduleFilter === "all" ? "default" : "outline"}
                className="h-7 text-xs px-2.5 cursor-pointer"
                onClick={() => setEmiScheduleFilter("all")}
              >
                All ({loanEmis.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={emiScheduleFilter === "paid" ? "default" : "outline"}
                className={`h-7 text-xs px-2.5 cursor-pointer ${
                  emiScheduleFilter === "paid" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-emerald-600 hover:bg-emerald-500/10"
                }`}
                onClick={() => setEmiScheduleFilter("paid")}
              >
                Paid ({paidEmis}) • EMI: {inr(totalPaid)} (Prin: {inr(principalPaid)})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={emiScheduleFilter === "pending" ? "default" : "outline"}
                className={`h-7 text-xs px-2.5 cursor-pointer ${
                  emiScheduleFilter === "pending" ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-amber-600 hover:bg-amber-500/10"
                }`}
                onClick={() => setEmiScheduleFilter("pending")}
              >
                Pending ({pendingEmis}) • EMI: {inr(outstanding)} (Prin: {inr(principalPending)})
              </Button>
              {overdueEmis > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant={emiScheduleFilter === "overdue" ? "default" : "outline"}
                  className={`h-7 text-xs px-2.5 cursor-pointer ${
                    emiScheduleFilter === "overdue" ? "bg-destructive hover:bg-destructive/90 text-white" : "text-destructive hover:bg-destructive/10"
                  }`}
                  onClick={() => setEmiScheduleFilter("overdue")}
                >
                  Overdue ({overdueEmis}) • {inr(overdueEmiAmount)}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                Showing <span className="font-semibold text-foreground">{filteredSchedRows.length}</span> of {loanEmis.length} EMIs
              </div>
              <ExportDropdown
                label="Export Table"
                filename={`loan_${loan.id}_schedule_${emiScheduleFilter}`}
                sheetName="Schedule"
                headers={scheduleExportData.headers}
                rows={scheduleExportData.rows}
                onPrint={() => setShowPrintScheduleModal(true)}
              />
            </div>
          </div>

          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["No.", "Due Date", "Amount", "Principal Component", "Interest", "Remaining", "Late Fee", "Status", "Remarks"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" || h === "Principal Component" || h === "Interest" || h === "Remaining" || h === "Late Fee" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSchedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-muted-foreground text-xs">
                        No EMIs found matching the "{emiScheduleFilter}" filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedRows.map((r) => {
                      const isUnpaid = (r.status as string) === "Overdue" || (r.status as string) === "Pending" || r.status === "Partial" || r.status === "Due";
                      const minDays = (r.status as string) === "Overdue" ? 1 : 0;
                      const lateCalc = isUnpaid
                        ? calculateLateFee(r.dueDate, new Date().toISOString(), settings, r.lateFeeWaived, minDays)
                        : null;

                      return (
                        <tr key={r.emiId} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono font-bold">{r.emiNo}</td>
                          <td className="p-3 font-mono">{fmtDate(r.dueDate)}</td>
                          <td className="p-3 text-right font-mono font-bold">{inr(r.emiAmount)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">{inr(r.principalComponent)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">{inr(r.interestComponent)}</td>
                          <td className="p-3 text-right font-mono font-semibold">{inr(r.remainingAmount)}</td>
                          <td className="p-3 text-right font-mono text-xs">
                            {r.lateFeePaid && r.lateFeePaid > 0 ? (
                              <span className="text-emerald-600 font-semibold">Paid {inr(r.lateFeePaid)}</span>
                            ) : r.lateFeeWaived ? (
                              <span className="text-muted-foreground line-through text-[11px]">Waived</span>
                            ) : lateCalc && lateCalc.lateFeeAmount > 0 ? (
                              <span className="text-destructive font-bold">+{inr(lateCalc.lateFeeAmount)}</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="p-3"><StatusBadge status={r.status} /></td>
                          <td className="p-3 text-muted-foreground text-[11px] truncate max-w-[150px]">{r.remarks}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="m-0 mt-4">
          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Payment ID", "Receipt", "Amount", "Method", "Date", "Collector", "Status", "Actions"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanPayments.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    loanPayments.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${p.reversed ? "opacity-60 line-through" : ""}`}>
                        <td className="p-3 font-mono text-[10px]">{p.id}</td>
                        <td className="p-3 font-mono text-[10px] font-semibold">{p.receiptId}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">+{inr(p.amount)}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                        <td className="p-3 whitespace-nowrap">{fmtDateTime(p.date)}</td>
                        <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
                        <td className="p-3">
                          {p.reversed ? (
                            <Badge variant="destructive" className="text-[9px]">Reversed ({p.reversalReason})</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Success</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 cursor-pointer"
                              onClick={() => {
                                const r = receipts.find((rec) => rec.id === p.receiptId || rec.paymentId === p.id);
                                setSelectedReceiptId(r ? r.id : p.receiptId);
                              }}
                              title="View Itemized Receipt"
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              Receipt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-medium"
                              onClick={() => {
                                const r = receipts.find((rec) => rec.id === p.receiptId || rec.paymentId === p.id) || {
                                  id: p.receiptId,
                                  paymentId: p.id,
                                  customerId: p.customerId,
                                  loanId: p.loanId,
                                  amount: p.amount,
                                  method: p.method,
                                  date: p.date,
                                  status: p.reversed ? "Cancelled" as const : "Issued" as const,
                                };
                                shareReceiptOnWhatsApp({
                                  receipt: r,
                                  customer,
                                  payment: p,
                                  loan,
                                  settings,
                                  adminName: admin?.name,
                                  remainingBalance: Math.max(0, (loan?.principal ?? 0) - p.amount),
                                });
                              }}
                              title="Share Receipt on WhatsApp"
                            >
                              <WhatsAppBrandIcon className="h-3 w-3 mr-1 text-emerald-600 fill-emerald-600" />
                              WhatsApp
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="m-0 mt-4">
          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Visit ID", "Date", "Due Amount", "Collected", "Status", "Reason / Notes", "Next Visit"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Due Amount" || h === "Collected" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanVisits.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No visits recorded</td></tr>
                  ) : (
                    loanVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{v.id}</td>
                        <td className="p-3">{fmtDate(v.date)}</td>
                        <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                        <td className="p-3 text-muted-foreground">{v.reason || v.notes || "—"}</td>
                        <td className="p-3 text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="docs" className="m-0 mt-4">
          {customer && <DocumentManager customerId={customer.id} loanId={loan.id} />}
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* UNIFIED TEMPLATE DOCUMENT PREVIEW MODAL */}
      {/* ==================================================================== */}
      <Dialog open={Boolean(previewDocKey)} onOpenChange={(open) => !open && setPreviewDocKey(null)}>
        <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-5">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <DialogTitle className="text-sm font-bold">
                  {previewDocKey ? DEFAULT_TEMPLATES[previewDocKey]?.name || "Official Lending Document" : "Official Lending Document"}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Loan #{loan.id} • Borrower: {customer?.name} ({customer?.id})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {previewDocKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/templates?key=${previewDocKey}`, "_blank")}
                  className="h-8 text-xs cursor-pointer border-border font-medium hover:bg-muted"
                  title="Edit this document HTML template in template studio"
                >
                  <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Edit Template
                </Button>
              )}

              <Button
                size="sm"
                className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground font-semibold"
                onClick={() => {
                  if (previewDocKey) printLoanDocument(previewDocKey);
                }}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Document
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>Official document preview (Live rendered from HTML Template)</span>
              {previewDocKey && (
                <button
                  onClick={() => window.open(`/templates?key=${previewDocKey}`, "_blank")}
                  className="text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  <FileCode2 className="h-3 w-3" />
                  Customize layout in HTML &rarr;
                </button>
              )}
            </div>

            <iframe
              title="Official Document Preview"
              srcDoc={renderedPreviewDocHtml}
              className="w-full flex-1 min-h-[500px] h-[580px] bg-white rounded-lg border border-border/80 shadow-xs"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Close Loan Dialog (Part A) */}
      <EarlyCloseDialog
        loan={loan}
        customer={customer}
        open={showEarlyCloseModal}
        onOpenChange={setShowEarlyCloseModal}
      />

      {/* Print EMI Schedule Modal (Part B) */}
      <EmiSchedulePrintModal
        loan={loan}
        customer={customer}
        open={showPrintScheduleModal}
        onOpenChange={setShowPrintScheduleModal}
      />

      {/* Itemized Payment Receipt Modal */}
      <PaymentReceiptModal
        open={Boolean(selectedReceiptId)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null);
        }}
        receiptId={selectedReceiptId}
      />
    </div>
  );
}
