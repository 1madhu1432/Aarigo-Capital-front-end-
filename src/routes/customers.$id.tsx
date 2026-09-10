import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  Phone,
  MessageSquare,
  MapPin,
  Banknote,
  PlusCircle,
  ArrowLeft,
  User,
  CreditCard,
  FileText,
  Eye,
  CalendarCheck,
  BarChart2,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Layers,
  History,
  TrendingDown,
  ShieldCheck,
  Edit3,
  Copy,
  Check,
  Fingerprint,
  Save,
  FileCode2,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, safe, todayISO } from "@/lib/format";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { PaymentReceiptModal } from "@/components/loans/PaymentReceiptModal";
import { CustomerPhotoUpload } from "@/components/customers/CustomerPhotoUpload";
import { DocumentManager } from "@/components/customers/DocumentManager";
import { BankDetailsForm } from "@/components/customers/BankDetailsForm";
import { DisbursementForm } from "@/components/loans/DisbursementForm";
import { getCustomerCompliance } from "@/utils/document-compliance";
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  printHtmlDocument,
} from "@/utils/template-engine";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { shareReceiptOnWhatsApp } from "@/utils/whatsapp";
import type { Loan } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/$id")({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { id } = useParams({ from: "/customers/$id" });
  const {
    customers,
    accounts,
    loans,
    emis,
    payments,
    receipts,
    visits,
    documents,
    limitHistory,
    promiseToPay,
    settings,
    admin,
    updateCustomer,
    updateCreditLimit,
  } = useStore();
  const navigate = useNavigate();
  const today = todayISO();

  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedPrintLoan, setSelectedPrintLoan] = useState<Loan | null>(null);
  const [selectedEarlyCloseLoan, setSelectedEarlyCloseLoan] = useState<Loan | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    mobile: string;
    altMobile: string;
    guardianName: string;
    dob: string;
    gender: "Male" | "Female" | "Other";
    occupation: string;
    monthlyIncome: number;
    status: "Active" | "Inactive" | "Blocked";
    kycType: "Aadhaar" | "PAN" | "Voter ID" | "Driving Licence";
    kycNumber: string;
    address: {
      house: string;
      area: string;
      city: string;
      district: string;
      state: string;
      pin: string;
      landmark: string;
    };
    nominee: { name: string; relationship: string; mobile: string; address: string };
    guarantor: { name: string; relationship: string; mobile: string; address: string };
    creditLimit: number;
  } | null>(null);

  const [editGuarantorSameAsNominee, setEditGuarantorSameAsNominee] = useState(true);

  const customer = customers.find((c) => c.id === id);
  const account = accounts.find((a) => a.customerId === id);

  const openEditModal = () => {
    if (!customer) return;
    const isGuarantorSame = Boolean(
      customer.guarantor?.name &&
      customer.nominee?.name &&
      customer.guarantor.name.trim().toLowerCase() === customer.nominee.name.trim().toLowerCase()
    );
    setEditGuarantorSameAsNominee(isGuarantorSame);
    setEditForm({
      name: customer.name,
      mobile: customer.mobile,
      altMobile: customer.altMobile || "",
      guardianName: customer.guardianName || "",
      dob: customer.dob || "",
      gender: customer.gender,
      occupation: customer.occupation || "",
      monthlyIncome: customer.monthlyIncome || 0,
      status: customer.status,
      kycType: customer.kycType,
      kycNumber: customer.kycNumber,
      address: { ...customer.address },
      nominee: { ...customer.nominee },
      guarantor: { ...customer.guarantor },
      creditLimit: account?.creditLimit ?? 0,
    });
    setShowEditProfileModal(true);
  };

  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !editForm) return;
    if (!editForm.name.trim()) {
      toast.error("Customer full name cannot be empty");
      return;
    }
    if (!editForm.mobile.trim()) {
      toast.error("Primary mobile number cannot be empty");
      return;
    }

    const finalGuarantor = editGuarantorSameAsNominee
      ? { ...editForm.nominee }
      : editForm.guarantor;

    updateCustomer(customer.id, {
      name: editForm.name,
      mobile: editForm.mobile,
      altMobile: editForm.altMobile,
      guardianName: editForm.guardianName,
      dob: editForm.dob,
      gender: editForm.gender,
      occupation: editForm.occupation,
      monthlyIncome: Number(editForm.monthlyIncome) || 0,
      status: editForm.status,
      kycType: editForm.kycType,
      kycNumber: editForm.kycNumber,
      address: editForm.address,
      nominee: editForm.nominee,
      guarantor: finalGuarantor,
    });

    if (account && Number(editForm.creditLimit) !== account.creditLimit) {
      updateCreditLimit(account.id, Number(editForm.creditLimit), "Updated via Customer Profile Edit");
    }

    toast.success(`Profile & account details for ${editForm.name} updated successfully!`);
    setShowEditProfileModal(false);
  };
  const customerLoans = useMemo(() => loans.filter((l) => l.customerId === id), [loans, id]);
  const activeLoans = useMemo(() => customerLoans.filter((l) => l.status === "Active"), [customerLoans]);
  const customerEmis = useMemo(() => emis.filter((e) => e.customerId === id), [emis, id]);
  const customerPayments = useMemo(() => payments.filter((p) => p.customerId === id), [payments, id]);
  const customerVisits = useMemo(() => visits.filter((v) => v.customerId === id), [visits, id]);
  const customerDocs = useMemo(() => documents.filter((d) => d.customerId === id), [documents, id]);
  const customerPtp = useMemo(() => promiseToPay.filter((ptp) => ptp.customerId === id), [promiseToPay, id]);

  const compliance = useMemo(() => {
    if (!customer) return null;
    return getCustomerCompliance(customer, documents, loans);
  }, [customer, documents, loans]);

  const usedLimit = useMemo(() => {
    return activeLoans.reduce((sum, l) => {
      const lEmis = emis.filter((e) => e.loanId === l.id);
      const remaining = lEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
      return sum + remaining;
    }, 0);
  }, [activeLoans, emis]);

  const creditLimit = account?.creditLimit ?? 0;
  const availableLimit = Math.max(0, creditLimit - usedLimit);
  const usedPct = creditLimit > 0 ? Math.min(100, Math.round((usedLimit / creditLimit) * 100)) : 0;

  const overdueEmis = customerEmis.filter((e) => e.status === "Overdue");
  const overdueAmount = overdueEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);

  // ── Unified Chronological Timeline Events ────────────────────────────────
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      type: "loan" | "payment" | "visit" | "ptp";
      title: string;
      desc: string;
      amount?: number | undefined;
      status?: string | undefined;
    }> = [];

    // Loans
    customerLoans.forEach((l) => {
      events.push({
        id: `evt-loan-${l.id}`,
        date: l.startDate,
        type: "loan",
        title: `Loan Disbursed: ${l.id}`,
        desc: `${l.frequency} EMI of ${inr(l.emiAmount)} • Tenure: ${l.tenure} installments`,
        amount: l.principal,
        status: l.status,
      });

      if (l.status === "Closed Early" || l.earlyClosure) {
        events.push({
          id: `evt-early-close-${l.id}`,
          date: (l.earlyClosure?.closureDate || l.startDate).slice(0, 10),
          type: "payment",
          title: `Loan Closed Early: ${l.id}`,
          desc: `Foreclosed with settlement of ${inr(l.earlyClosure?.finalClosureAmount ?? 0)}. Charge: ${inr(l.earlyClosure?.earlyClosureCharge ?? 0)} (${l.earlyClosure?.earlyClosureChargePercent ?? 0}%). Future interest waived (₹0).`,
          amount: l.earlyClosure?.finalClosureAmount,
          status: "Closed Early",
        });
      }
    });

    // Payments
    customerPayments.forEach((p) => {
      events.push({
        id: `evt-pay-${p.id}`,
        date: p.date ? String(p.date).slice(0, 10) : today,
        type: "payment",
        title: p.reversed ? `Payment Reversed: ${p.receiptId}` : `EMI Repayment Received: ${p.receiptId}`,
        desc: `${p.method} • Collected by ${p.collectedBy}${p.notes ? ` • "${p.notes}"` : ""}`,
        amount: p.amount,
        status: p.reversed ? "Reversed" : "Completed",
      });
    });

    // Visits
    customerVisits.forEach((v) => {
      events.push({
        id: `evt-vis-${v.id}`,
        date: v.date ? String(v.date).slice(0, 10) : today,
        type: "visit",
        title: `Doorstep Field Visit: ${v.id}`,
        desc: v.status === "Paid" ? `Collected ${inr(v.collected)}` : `Reason: ${v.reason || "Not Paid"}${v.nextVisit ? ` • Next visit: ${fmtDate(v.nextVisit)}` : ""}`,
        amount: v.collected > 0 ? v.collected : undefined,
        status: v.status,
      });
    });

    // PTPs
    customerPtp.forEach((ptp) => {
      events.push({
        id: `evt-ptp-${ptp.id}`,
        date: ptp.createdAt ? String(ptp.createdAt).slice(0, 10) : today,
        type: "ptp",
        title: `Promise-to-Pay Registered (${ptp.status})`,
        desc: `Promised ${inr(ptp.promiseAmount)} on ${fmtDate(ptp.promiseDate)}${ptp.notes ? ` • "${ptp.notes}"` : ""}`,
        amount: ptp.promiseAmount,
        status: ptp.status,
      });
    });

    // Sort descending by date
    return events.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [customerLoans, customerPayments, customerVisits, customerPtp]);

  // ── Customer Ledger Statement Entries ─────────────────────────────────────
  const ledgerEntries = useMemo(() => {
    type LedgerRow = {
      date: string;
      ref: string;
      desc: string;
      debit: number; // loan disbursed
      credit: number; // payment received
      balance: number;
    };

    const rows: LedgerRow[] = [];
    let runningBalance = 0;

    // Collect all transactions in chronological order
    const raw: Array<{
      date: string;
      ref: string;
      desc: string;
      debit: number;
      credit: number;
    }> = [];

    customerLoans.forEach((l) => {
      raw.push({
        date: l.startDate,
        ref: l.id,
        desc: `Loan Sanctioned & Disbursed (${l.tenure} ${l.frequency} EMIs)`,
        debit: l.totalPayable,
        credit: 0,
      });
    });

    customerPayments.forEach((p) => {
      if (!p.reversed) {
        raw.push({
          date: p.date.slice(0, 10),
          ref: p.receiptId,
          desc: `EMI Repayment via ${p.method} (${p.loanId})`,
          debit: 0,
          credit: p.amount,
        });
      }
    });

    raw.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    raw.forEach((item) => {
      runningBalance += item.debit - item.credit;
      rows.push({
        ...item,
        balance: Math.max(0, runningBalance),
      });
    });

    return rows;
  }, [customerLoans, customerPayments]);

  const renderedApplicationHtml = useMemo(() => {
    if (!customer) return "";
    const templateHtml = settings.documentTemplates?.customer_application || DEFAULT_TEMPLATES.customer_application.defaultHtml;
    const a = customer.address || { house: "", area: "", city: "", district: "", state: "", pin: "", landmark: "" };
    const fullAddress = [a.house, a.area, a.city, a.district, a.pin].filter(Boolean).join(", ") + (a.landmark ? ` (Landmark: ${a.landmark})` : "");
    const nomineeInfo = customer.nominee?.name ? `${customer.nominee.name} (${customer.nominee.relationship || "Nominee"}) - ${customer.nominee.mobile || ""}` : "Not Assigned";
    const guarantorInfo = customer.guarantor?.name ? `${customer.guarantor.name} (${customer.guarantor.relationship || "Guarantor"}) - ${customer.guarantor.mobile || ""}` : "Not Assigned";

    return renderTemplate(templateHtml, {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "",
      business_email: settings.businessEmail || "",
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      customer_address: fullAddress,
      guardian_name: customer.guardianName || "—",
      dob: fmtDate(customer.dob),
      gender: customer.gender,
      occupation: customer.occupation || "Self-Employed",
      monthly_income: inr(customer.monthlyIncome),
      kyc_type: customer.kycType || "Aadhaar",
      kyc_number: customer.kycNumber || "—",
      account_id: account?.id || "ACC-001",
      credit_limit: inr(creditLimit),
      nominee_name: customer.nominee?.name || "—",
      nominee_relation: customer.nominee?.relationship || "—",
      nominee_mobile: customer.nominee?.mobile || "—",
      nominee_details: nomineeInfo,
      guarantor_name: customer.guarantor?.name || "—",
      guarantor_relation: customer.guarantor?.relationship || "—",
      guarantor_mobile: customer.guarantor?.mobile || "—",
      guarantor_address: customer.guarantor?.address || "—",
      guarantor_details: guarantorInfo,
      application_date: fmtDate(customer.createdAt),
      receipt_footer: settings.receiptFooter || "Verified and certified official copy.",
    });
  }, [customer, account, creditLimit, settings]);

  const renderedStatementHtml = useMemo(() => {
    if (!customer) return "";
    const templateHtml = settings.documentTemplates?.account_statement || DEFAULT_TEMPLATES.account_statement.defaultHtml;
    const a = customer.address || { house: "", area: "", city: "", district: "", state: "", pin: "", landmark: "" };
    const fullAddress = [a.house, a.area, a.city, a.district, a.pin].filter(Boolean).join(", ");
    const totalBorrowed = customerLoans.reduce((sum, l) => sum + l.principal, 0);
    const totalRepaid = customerPayments.filter((p) => !p.reversed).reduce((sum, p) => sum + p.amount, 0);
    const totalBalance = Math.max(0, customerEmis.reduce((sum, e) => sum + Math.max(0, e.amount - e.paid), 0));

    const ledgerRowsHtml = ledgerEntries.map((row) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${fmtDate(row.date)}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace;">${row.ref}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${row.desc}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-family: monospace;">${row.debit > 0 ? inr(row.debit) : "—"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-family: monospace;">${row.credit > 0 ? inr(row.credit) : "—"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-family: monospace;">${inr(row.balance)}</td>
      </tr>
    `).join("");

    return renderTemplate(templateHtml, {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "",
      business_email: settings.businessEmail || "",
      customer_id: customer.id,
      customer_name: customer.name,
      customer_mobile: customer.mobile,
      customer_address: fullAddress,
      credit_limit: inr(creditLimit),
      active_loans_count: activeLoans.length.toString(),
      total_outstanding: inr(usedLimit),
      overdue_balance: inr(overdueAmount),
      ledger_rows_html: ledgerRowsHtml,
      loan_id: customerLoans[0]?.id || "N/A",
      statement_date: fmtDate(todayISO()),
      period_start: fmtDate(customer.createdAt),
      period_end: fmtDate(todayISO()),
      total_borrowed: inr(totalBorrowed),
      total_repaid: inr(totalRepaid),
      outstanding_balance: inr(totalBalance),
      account_status: totalBalance > 0 ? "Active / Repaying" : "Cleared",
      total_loans_count: customerLoans.length.toString(),
      receipt_footer: settings.receiptFooter || "Computer generated customer account statement.",
    });
  }, [customer, settings, customerLoans, customerPayments, customerEmis, ledgerEntries, creditLimit, activeLoans, usedLimit, overdueAmount]);

  const handlePrintApplicationTemplate = () => {
    if (!customer || !renderedApplicationHtml) return;
    printHtmlDocument(renderedApplicationHtml, `Customer-Application-${customer.id}`);
  };

  const handlePrintStatementTemplate = () => {
    if (!customer || !renderedStatementHtml) return;
    printHtmlDocument(renderedStatementHtml, `Statement-${customer.id}`);
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button size="sm" onClick={() => void navigate({ to: "/customers" })} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back + Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate({ to: "/customers" })}
          className="text-xs h-8 -ml-2 cursor-pointer w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Customers
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => setShowApplicationModal(true)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Application Form
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => setShowStatementModal(true)}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Statement
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => window.open(`tel:${customer.mobile}`, "_self")}
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={openEditModal}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => window.open(`https://wa.me/91${customer.mobile}`, "_blank")}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/collection" })}
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Collect EMI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/loans/new" })}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {customer.photo ? (
              <img
                src={customer.photo}
                alt={customer.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-primary/30 shadow-sm"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
                style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
              >
                {customer.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-foreground truncate">{customer.name}</h1>
                <StatusBadge status={customer.status} size="sm" />
                {account && (
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                    <Fingerprint className="h-3 w-3" />
                    <span>Account: {account.id}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(account.id);
                        toast.success(`Account Unique ID ${account.id} copied!`);
                      }}
                      className="text-primary hover:text-foreground cursor-pointer ml-0.5 p-0.5"
                      title="Copy Account Unique ID"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <span className="font-mono text-xs text-muted-foreground">({customer.id})</span>
                {compliance && (
                  compliance.isCompliant ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      KYC Compliant
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-semibold animate-pulse"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {compliance.missingCount} Missing Required Doc{compliance.missingCount > 1 ? "s" : ""}
                    </Badge>
                  )
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span>{customer.mobile}</span>
                <span>{customer.occupation}</span>
                <span>Monthly Inc: {inr(customer.monthlyIncome)}</span>
                <span>KYC: {customer.kycType} ({customer.kycNumber})</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>
                  {customer.address.house}, {customer.address.area}, {customer.address.city},{" "}
                  {customer.address.district} — {customer.address.pin}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credit Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(creditLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Used Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
            <Progress value={usedPct} className="h-1 mt-1.5" />
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{inr(availableLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Outstanding</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Overdue Due</p>
            <p className={`text-base font-bold mt-0.5 ${overdueAmount > 0 ? "text-destructive" : "text-foreground"}`}>
              {inr(overdueAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-0">
            {[
              { value: "timeline", label: `Timeline (${timelineEvents.length})` },
              { value: "statement", label: "Statement / Ledger" },
              { value: "ptp", label: `Promise-to-Pay (${customerPtp.length})` },
              { value: "loans", label: `Loans (${customerLoans.length})` },
              { value: "emi", label: `EMI (${customerEmis.length})` },
              { value: "payments", label: `Payments (${customerPayments.length})` },
              { value: "visits", label: `Visits (${customerVisits.length})` },
              { value: "bank", label: "Bank Details" },
              { value: "personal", label: "Profile & KYC" },
              {
                value: "docs",
                label:
                  compliance && !compliance.isCompliant
                    ? `Docs (${customerDocs.length}) • ${compliance.missingCount} Missing`
                    : `Docs (${customerDocs.length})`,
              },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB 1: TIMELINE */}
        <TabsContent value="timeline" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Customer Payment & Activity Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Unified audit trail of loans disbursed, door-to-door visits, collections, and promise-to-pay commits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {timelineEvents.length === 0 ? (
                <EmptyState icon={History} title="No activity recorded" className="py-8" />
              ) : (
                <div className="relative border-l-2 border-border/80 ml-3 space-y-6 py-2">
                  {timelineEvents.map((evt) => {
                    const isLoan = evt.type === "loan";
                    const isPay = evt.type === "payment";
                    const isVisit = evt.type === "visit";
                    const isPtp = evt.type === "ptp";

                    return (
                      <div key={evt.id} className="relative pl-6 text-xs">
                        {/* Timeline dot icon */}
                        <div
                          className={`absolute -left-2.5 top-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-xs ${
                            isLoan
                              ? "bg-blue-600"
                              : isPay
                              ? "bg-emerald-600"
                              : isVisit
                              ? "bg-amber-600"
                              : "bg-purple-600"
                          }`}
                        >
                          {isLoan ? "L" : isPay ? "₹" : isVisit ? "V" : "P"}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{evt.title}</span>
                            {evt.status && (
                              <Badge variant="outline" className="text-[9px]">
                                {evt.status}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{fmtDate(evt.date)}</span>
                        </div>

                        <p className="text-muted-foreground text-[11px] mt-0.5">{evt.desc}</p>
                        {evt.amount && (
                          <p
                            className={`font-mono font-bold mt-1 ${
                              isPay ? "text-emerald-600" : isLoan ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                            }`}
                          >
                            {isPay ? `+${inr(evt.amount)}` : isLoan ? `Disbursed: ${inr(evt.amount)}` : inr(evt.amount)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: STATEMENT / LEDGER */}
        <TabsContent value="statement" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Account Statement & Repayment Ledger</CardTitle>
                <CardDescription className="text-xs">Chronological debit (disbursals) and credit (collections) register</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-8 cursor-pointer" onClick={() => setShowStatementModal(true)}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Statement
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Ref / Doc</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Description</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Debit (Charges)</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Credit (Paid)</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap">{fmtDate(row.date)}</td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">{row.ref}</td>
                        <td className="p-3">{row.desc}</td>
                        <td className="p-3 text-right font-mono text-destructive">
                          {row.debit > 0 ? inr(row.debit) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                          {row.credit > 0 ? inr(row.credit) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{inr(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: PROMISE-TO-PAY (PTP) */}
        <TabsContent value="ptp" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Promise-to-Pay (PTP) Register</CardTitle>
              <CardDescription className="text-xs">Track commitments given by borrower during doorstep field visits</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">PTP ID</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Created Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Promise Due Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Promised Amount</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerPtp.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        No Promise-to-Pay recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerPtp.map((ptp) => (
                      <tr key={ptp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{ptp.id}</td>
                        <td className="p-3">{fmtDate(ptp.createdAt)}</td>
                        <td className="p-3 font-medium">{fmtDate(ptp.promiseDate)}</td>
                        <td className="p-3 text-right font-mono font-semibold">{inr(ptp.promiseAmount)}</td>
                        <td className="p-3">
                          <Badge
                            className={`text-[9px] ${
                              ptp.status === "Kept"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : ptp.status === "Broken"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {ptp.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{ptp.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: LOANS */}
        <TabsContent value="loans" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Loan Contracts</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Loan ID", "Principal", "EMI", "Frequency", "Tenure", "Start Date", "Status", "Early Closure Info", "Actions"].map((h) => (
                      <th key={h} className="text-left p-3 text-[10px] text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerLoans.map((l) => {
                    const isClosedEarly = l.status === "Closed Early" || Boolean(l.earlyClosure);
                    const lEmis = emis.filter((e) => e.loanId === l.id);
                    const lPaid = payments.filter((p) => p.loanId === l.id && !p.reversed).reduce((s, p) => s + p.amount, 0);
                    const rem = isClosedEarly ? 0 : Math.max(0, l.totalPayable - lPaid);
                    const canEarlyClose = l.status !== "Closed" && !isClosedEarly && rem > 0;

                    return (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs font-medium">{l.id}</td>
                        <td className="p-3 font-mono">{inr(l.principal)}</td>
                        <td className="p-3 font-mono">{inr(l.emiAmount)}</td>
                        <td className="p-3">{l.frequency}</td>
                        <td className="p-3">{l.tenure}</td>
                        <td className="p-3">{fmtDate(l.startDate)}</td>
                        <td className="p-3">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="p-3">
                          {isClosedEarly && l.earlyClosure ? (
                            <div className="text-[10px] space-y-0.5 font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 p-1.5 rounded border border-purple-500/20">
                              <p className="font-bold">Closed Early: {fmtDate(l.earlyClosure.closureDate)}</p>
                              <p>Settlement: {inr(l.earlyClosure.finalClosureAmount)} (Charge: {inr(l.earlyClosure.earlyClosureCharge)})</p>
                              <p className="text-muted-foreground text-[9px]">Receipt: {l.earlyClosure.receiptId} • Pay: {l.earlyClosure.paymentId}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[11px] h-7 px-2 cursor-pointer"
                              title="Print EMI Schedule"
                              onClick={() => setSelectedPrintLoan(l)}
                            >
                              <Printer className="h-3 w-3 mr-1 text-primary" />
                              Print
                            </Button>

                            {canEarlyClose && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] h-7 px-2 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                                title="Early Close Loan"
                                onClick={() => setSelectedEarlyCloseLoan(l)}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Close Early
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 cursor-pointer"
                              onClick={() => void navigate({ to: "/loans/$id", params: { id: l.id } })}
                            >
                              View →
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: EMI SCHEDULE */}
        <TabsContent value="emi" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">All EMI Installments</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["EMI ID", "Loan", "#", "Due Date", "Amount", "Paid", "Remaining", "Status"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" || h === "Paid" || h === "Remaining" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerEmis.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.id}</td>
                      <td className="p-3 font-mono text-[10px]">{e.loanId}</td>
                      <td className="p-3">{e.emiNo}</td>
                      <td className="p-3">{fmtDate(e.dueDate)}</td>
                      <td className="p-3 text-right font-mono">{inr(e.amount)}</td>
                      <td className="p-3 text-right font-mono text-emerald-600">{inr(e.paid)}</td>
                      <td className="p-3 text-right font-mono">
                        {e.status === "Cancelled" ? (
                          <span className="text-muted-foreground">₹0</span>
                        ) : (
                          inr(Math.max(0, e.amount - e.paid))
                        )}
                      </td>
                      <td className="p-3">
                        {e.status === "Cancelled" ? (
                          <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-medium">
                            Cancelled (Closed Early)
                          </Badge>
                        ) : (
                          <StatusBadge status={e.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: PAYMENTS */}
        <TabsContent value="payments" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Repayment History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Receipt</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Loan</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Collector</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerPayments.length === 0 ? (
                    <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    customerPayments.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${p.reversed ? "opacity-60 line-through" : ""}`}>
                        <td className="p-3 font-mono text-[10px] font-semibold">{p.receiptId}</td>
                        <td className="p-3 font-mono text-[10px]">{p.loanId}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">+{inr(p.amount)}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                        <td className="p-3 whitespace-nowrap">{fmtDateTime(p.date)}</td>
                        <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
                        <td className="p-3">
                          {p.reversed ? (
                            <Badge variant="destructive" className="text-[9px]">Reversed</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Valid</Badge>
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
                                const linkedLoan = loans.find((l) => l.id === p.loanId);
                                shareReceiptOnWhatsApp({
                                  receipt: r,
                                  customer,
                                  payment: p,
                                  loan: linkedLoan,
                                  settings,
                                  adminName: admin?.name,
                                  remainingBalance: Math.max(0, (linkedLoan?.principal ?? 0) - p.amount),
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

        {/* TAB 7: VISITS */}
        <TabsContent value="visits" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Field Visits History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Visit ID</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Due</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Collected</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Reason / Remarks</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Next Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerVisits.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No visits recorded</td></tr>
                  ) : (
                    customerVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{v.id}</td>
                        <td className="p-3">{fmtDate(v.date)}</td>
                        <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{v.reason || v.notes || "—"}</td>
                        <td className="p-3 text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: BANK DETAILS */}
        <TabsContent value="bank" className="m-0">
          <BankDetailsForm customerId={customer.id} />
        </TabsContent>

        {/* TAB 8: PROFILE & KYC */}
        <TabsContent value="personal" className="m-0 space-y-4">
          <CustomerPhotoUpload customer={customer} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold">Personal & KYC Details</CardTitle>
                  <CardDescription className="text-[11px]">Identity records and verification data</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 cursor-pointer"
                  onClick={openEditModal}
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit Profile & KYC
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                {[
                  { label: "Father / Guardian", value: customer.guardianName },
                  { label: "Date of Birth", value: fmtDate(customer.dob) },
                  { label: "Gender", value: customer.gender },
                  { label: "Occupation", value: customer.occupation },
                  { label: "Monthly Income", value: inr(customer.monthlyIncome) },
                  { label: "KYC Document", value: `${customer.kycType} (${customer.kycNumber})` },
                  { label: "Primary Mobile", value: customer.mobile },
                  { label: "Alternate Mobile", value: customer.altMobile || "—" },
                  { label: "Registration Date", value: fmtDate(customer.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold">Nominee & Guarantor</CardTitle>
                {customer.guarantor?.name &&
                  customer.nominee?.name &&
                  customer.guarantor.name.trim().toLowerCase() === customer.nominee.name.trim().toLowerCase() && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-medium">
                      Guarantor & Nominee are Same
                    </Badge>
                  )}
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Nominee</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Name:</strong> {customer.nominee.name || "—"}</p>
                    <p><strong>Relationship:</strong> {customer.nominee.relationship || "—"}</p>
                    <p><strong>Mobile:</strong> {customer.nominee.mobile || "—"}</p>
                    <p><strong>Address:</strong> {customer.nominee.address || "—"}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Guarantor</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Name:</strong> {customer.guarantor.name || "—"}</p>
                    <p><strong>Relationship:</strong> {customer.guarantor.relationship || "—"}</p>
                    <p><strong>Mobile:</strong> {customer.guarantor.mobile || "—"}</p>
                    <p><strong>Address:</strong> {customer.guarantor.address || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 9: DOCS */}
        <TabsContent value="docs" className="m-0">
          <DocumentManager customerId={customer.id} />
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* CUSTOMER APPLICATION FORM MODAL (Template-Driven) */}
      {/* ==================================================================== */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-5">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <DialogTitle className="text-sm font-bold">Customer Enrollment & Account Application</DialogTitle>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Customer #{customer.id} • {customer.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("/templates?key=customer_application", "_blank")}
                className="h-8 text-xs cursor-pointer border-border font-medium hover:bg-muted"
                title="Edit Customer Application HTML template in template studio"
              >
                <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Edit Template
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground font-semibold"
                onClick={handlePrintApplicationTemplate}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Application
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>Official application preview (Live rendered from HTML Template)</span>
              <button
                onClick={() => window.open("/templates?key=customer_application", "_blank")}
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <FileCode2 className="h-3 w-3" />
                Customize layout in HTML &rarr;
              </button>
            </div>

            <iframe
              title="Customer Application Preview"
              srcDoc={renderedApplicationHtml}
              className="w-full flex-1 min-h-[500px] h-[580px] bg-white rounded-lg border border-border/80 shadow-xs"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* CUSTOMER ACCOUNT STATEMENT MODAL (Template-Driven) */}
      {/* ==================================================================== */}
      <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
        <DialogContent className="max-w-4xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-5">
          <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <DialogTitle className="text-sm font-bold">Statement of Loan Account & Ledger</DialogTitle>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Customer #{customer.id} • {customer.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open("/templates?key=account_statement", "_blank")}
                className="h-8 text-xs cursor-pointer border-border font-medium hover:bg-muted"
                title="Edit Account Statement HTML template in template studio"
              >
                <FileCode2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Edit Template
              </Button>

              <Button
                size="sm"
                className="h-8 text-xs cursor-pointer bg-primary text-primary-foreground font-semibold"
                onClick={handlePrintStatementTemplate}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Statement
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-2 flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>Official statement preview (Live rendered from HTML Template)</span>
              <button
                onClick={() => window.open("/templates?key=account_statement", "_blank")}
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <FileCode2 className="h-3 w-3" />
                Customize layout in HTML &rarr;
              </button>
            </div>

            <iframe
              title="Account Statement Preview"
              srcDoc={renderedStatementHtml}
              className="w-full flex-1 min-h-[500px] h-[580px] bg-white rounded-lg border border-border/80 shadow-xs"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Early Close Loan Dialog */}
      <EarlyCloseDialog
        loan={selectedEarlyCloseLoan}
        customer={customer}
        open={Boolean(selectedEarlyCloseLoan)}
        onOpenChange={(open) => {
          if (!open) setSelectedEarlyCloseLoan(null);
        }}
      />

      {/* Print EMI Schedule Modal */}
      <EmiSchedulePrintModal
        loan={selectedPrintLoan}
        customer={customer}
        open={Boolean(selectedPrintLoan)}
        onOpenChange={(open) => {
          if (!open) setSelectedPrintLoan(null);
        }}
      />

      {/* Itemized Payment Receipt Modal */}
      <PaymentReceiptModal
        open={Boolean(selectedReceiptId)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null);
        }}
        receiptId={selectedReceiptId}
      />

      {/* ==================================================================== */}
      {/* EDIT CUSTOMER PROFILE & ACCOUNT DETAILS MODAL */}
      {/* ==================================================================== */}
      <Dialog open={showEditProfileModal} onOpenChange={setShowEditProfileModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-primary" />
                  Edit Customer Profile & Account
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update customer demographics, address, KYC numbers, and account credit limits
                </p>
              </div>
              {account && (
                <Badge variant="outline" className="font-mono text-[11px] font-bold text-primary border-primary/30">
                  {account.id}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {editForm && (
            <form onSubmit={handleSaveEditProfile} className="space-y-4 pt-2">
              {/* Account IDs & Status Bar */}
              <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Account Unique ID</span>
                    <span className="font-mono font-bold text-primary text-sm">{account?.id || "N/A"}</span>
                  </div>
                  <div className="border-l border-border pl-3">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold block">Customer ID</span>
                    <span className="font-mono font-semibold text-foreground text-sm">{customer?.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="edit-status" className="text-xs font-medium">Status:</Label>
                  <select
                    id="edit-status"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="h-8 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Demographics & Identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-name" className="text-xs">Full Legal Name *</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-xs h-8"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-guardian" className="text-xs">Father / Guardian Name</Label>
                    <Input
                      id="edit-guardian"
                      value={editForm.guardianName}
                      onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-mobile" className="text-xs">Primary Mobile Number *</Label>
                    <Input
                      id="edit-mobile"
                      value={editForm.mobile}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                      className="text-xs h-8 font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-altMobile" className="text-xs">Alternate Mobile Number</Label>
                    <Input
                      id="edit-altMobile"
                      value={editForm.altMobile}
                      onChange={(e) => setEditForm({ ...editForm, altMobile: e.target.value })}
                      className="text-xs h-8 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-dob" className="text-xs">Date of Birth</Label>
                    <Input
                      id="edit-dob"
                      type="date"
                      value={editForm.dob}
                      onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-gender" className="text-xs">Gender</Label>
                    <select
                      id="edit-gender"
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-occupation" className="text-xs">Occupation / Profession</Label>
                    <Input
                      id="edit-occupation"
                      value={editForm.occupation}
                      onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-income" className="text-xs">Monthly Income (₹)</Label>
                    <Input
                      id="edit-income"
                      type="number"
                      value={editForm.monthlyIncome}
                      onChange={(e) => setEditForm({ ...editForm, monthlyIncome: Number(e.target.value) })}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* KYC Details */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">KYC Identification</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-kycType" className="text-xs">KYC Document Type</Label>
                    <select
                      id="edit-kycType"
                      value={editForm.kycType}
                      onChange={(e) => setEditForm({ ...editForm, kycType: e.target.value as any })}
                      className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Driving Licence">Driving Licence</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-kycNumber" className="text-xs">KYC Document Number *</Label>
                    <Input
                      id="edit-kycNumber"
                      value={editForm.kycNumber}
                      onChange={(e) => setEditForm({ ...editForm, kycNumber: e.target.value.toUpperCase() })}
                      className="text-xs h-8 font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Address Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-house" className="text-xs">House / Door No</Label>
                    <Input
                      id="edit-house"
                      value={editForm.address.house}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, house: e.target.value } })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-area" className="text-xs">Area / Street</Label>
                    <Input
                      id="edit-area"
                      value={editForm.address.area}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, area: e.target.value } })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-city" className="text-xs">City / Town</Label>
                    <Input
                      id="edit-city"
                      value={editForm.address.city}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, city: e.target.value } })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-district" className="text-xs">District</Label>
                    <Input
                      id="edit-district"
                      value={editForm.address.district}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, district: e.target.value } })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-state" className="text-xs">State</Label>
                    <Input
                      id="edit-state"
                      value={editForm.address.state}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, state: e.target.value } })}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-pin" className="text-xs">PIN Code</Label>
                    <Input
                      id="edit-pin"
                      value={editForm.address.pin}
                      onChange={(e) => setEditForm({ ...editForm, address: { ...editForm.address, pin: e.target.value } })}
                      className="text-xs h-8 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Nominee & Guarantor Details */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Nominee & Guarantor Details
                  </h4>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="editGuarantorSameAsNominee" className="text-xs font-medium cursor-pointer">
                      Guarantor is same as Nominee
                    </Label>
                    <Switch
                      id="editGuarantorSameAsNominee"
                      checked={editGuarantorSameAsNominee}
                      onCheckedChange={(checked) => {
                        setEditGuarantorSameAsNominee(checked);
                        if (checked) {
                          setEditForm((prev) => prev ? { ...prev, guarantor: { ...prev.nominee } } : null);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Nominee Fields */}
                <div className="p-3 border border-border/80 rounded-lg bg-muted/10 space-y-2.5">
                  <p className="text-[11px] font-semibold text-foreground">Nominee Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-nominee-name" className="text-xs">Nominee Name</Label>
                      <Input
                        id="edit-nominee-name"
                        value={editForm.nominee.name}
                        onChange={(e) => {
                          const updated = { ...editForm.nominee, name: e.target.value };
                          setEditForm({
                            ...editForm,
                            nominee: updated,
                            guarantor: editGuarantorSameAsNominee ? { ...editForm.guarantor, name: e.target.value } : editForm.guarantor,
                          });
                        }}
                        className="text-xs h-8"
                        placeholder="Nominee full name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-nominee-rel" className="text-xs">Relationship</Label>
                      <Input
                        id="edit-nominee-rel"
                        value={editForm.nominee.relationship}
                        onChange={(e) => {
                          const updated = { ...editForm.nominee, relationship: e.target.value };
                          setEditForm({
                            ...editForm,
                            nominee: updated,
                            guarantor: editGuarantorSameAsNominee ? { ...editForm.guarantor, relationship: e.target.value } : editForm.guarantor,
                          });
                        }}
                        className="text-xs h-8"
                        placeholder="e.g. Spouse, Son, Father"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-nominee-mobile" className="text-xs">Nominee Mobile</Label>
                      <Input
                        id="edit-nominee-mobile"
                        value={editForm.nominee.mobile}
                        onChange={(e) => {
                          const updated = { ...editForm.nominee, mobile: e.target.value };
                          setEditForm({
                            ...editForm,
                            nominee: updated,
                            guarantor: editGuarantorSameAsNominee ? { ...editForm.guarantor, mobile: e.target.value } : editForm.guarantor,
                          });
                        }}
                        className="text-xs h-8"
                        placeholder="10-digit mobile"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-nominee-address" className="text-xs">Nominee Address</Label>
                      <Input
                        id="edit-nominee-address"
                        value={editForm.nominee.address}
                        onChange={(e) => {
                          const updated = { ...editForm.nominee, address: e.target.value };
                          setEditForm({
                            ...editForm,
                            nominee: updated,
                            guarantor: editGuarantorSameAsNominee ? { ...editForm.guarantor, address: e.target.value } : editForm.guarantor,
                          });
                        }}
                        className="text-xs h-8"
                        placeholder="Residence address (or same as borrower)"
                      />
                    </div>
                  </div>
                </div>

                {/* Guarantor Fields */}
                <div className="p-3 border border-border/80 rounded-lg bg-muted/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-foreground">Guarantor Information</p>
                    {editGuarantorSameAsNominee ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-medium">
                        Auto-synced with Nominee
                      </Badge>
                    ) : null}
                  </div>
                  {!editGuarantorSameAsNominee ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="edit-guarantor-name" className="text-xs">Guarantor Name</Label>
                        <Input
                          id="edit-guarantor-name"
                          value={editForm.guarantor.name}
                          onChange={(e) => setEditForm({ ...editForm, guarantor: { ...editForm.guarantor, name: e.target.value } })}
                          className="text-xs h-8"
                          placeholder="Guarantor full name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-guarantor-rel" className="text-xs">Relationship</Label>
                        <Input
                          id="edit-guarantor-rel"
                          value={editForm.guarantor.relationship}
                          onChange={(e) => setEditForm({ ...editForm, guarantor: { ...editForm.guarantor, relationship: e.target.value } })}
                          className="text-xs h-8"
                          placeholder="e.g. Neighbour, Relative, Shop Owner"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-guarantor-mobile" className="text-xs">Guarantor Mobile</Label>
                        <Input
                          id="edit-guarantor-mobile"
                          value={editForm.guarantor.mobile}
                          onChange={(e) => setEditForm({ ...editForm, guarantor: { ...editForm.guarantor, mobile: e.target.value } })}
                          className="text-xs h-8"
                          placeholder="10-digit mobile"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-guarantor-address" className="text-xs">Guarantor Address</Label>
                        <Input
                          id="edit-guarantor-address"
                          value={editForm.guarantor.address}
                          onChange={(e) => setEditForm({ ...editForm, guarantor: { ...editForm.guarantor, address: e.target.value } })}
                          className="text-xs h-8"
                          placeholder="Guarantor residence address"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      Guarantor details will be saved identically to Nominee ({editForm.nominee.name || "None specified"}).
                    </p>
                  )}
                </div>
              </div>

              {/* Account Credit Limit */}
              <div className="space-y-3 pt-1 border-t border-border/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Account Credit Limit</h4>
                <div className="max-w-xs space-y-1">
                  <Label htmlFor="edit-creditLimit" className="text-xs">Account Credit Limit (₹)</Label>
                  <Input
                    id="edit-creditLimit"
                    type="number"
                    value={editForm.creditLimit}
                    onChange={(e) => setEditForm({ ...editForm, creditLimit: Number(e.target.value) })}
                    className="text-xs h-8 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Sets maximum borrowing ceiling for Account {account?.id}</p>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="text-xs h-8 cursor-pointer">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Customer & Account Details
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
