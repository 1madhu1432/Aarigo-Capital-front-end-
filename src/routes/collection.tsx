import { useState, useMemo, useCallback, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Printer,
  ArrowRight,
  Info,
  Calendar,
  Compass,
  FileCheck,
  RotateCcw,
  Filter,
  History,
  ArrowLeft,
  Lock,
  Unlock,
} from "lucide-react";
import { collectionPriorityScore, resolveCurrentEmi, useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, todayISO, addDays } from "@/lib/format";
import type { PaymentMethod, Receipt, VisitStatus } from "@/types";
import { computeAmortizationSchedule, calculateLateFee } from "@/utils/amortization";
import { PaymentReceiptModal } from "@/components/loans/PaymentReceiptModal";
import {
  DEFAULT_TEMPLATES,
  renderTemplate,
  printHtmlDocument,
} from "@/utils/template-engine";
import { WhatsAppBrandIcon } from "@/components/common/WhatsAppIcon";
import { shareReceiptOnWhatsApp } from "@/utils/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface CollectionSearch {
  customerId?: string;
  loanId?: string;
  emiId?: string;
  day?: string;
  frequency?: string;
  tab?: string;
  sub?: string;
}

export const Route = createFileRoute("/collection")({
  validateSearch: (search: Record<string, unknown>): CollectionSearch => ({
    customerId: typeof search.customerId === "string" ? search.customerId : undefined,
    loanId: typeof search.loanId === "string" ? search.loanId : undefined,
    emiId: typeof search.emiId === "string" ? search.emiId : undefined,
    day: typeof search.day === "string" ? search.day : undefined,
    frequency: typeof search.frequency === "string" ? search.frequency : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined,
    sub: typeof search.sub === "string" ? search.sub : undefined,
  }),
  component: CollectionPage,
});

const VISIT_REASONS = [
  "Customer Not Available",
  "Refused to Pay",
  "Promised to Pay Later",
  "Business Loss / Financial Crunch",
  "Medical Emergency",
  "Customer Shifted / Relocated",
  "Dispute on Interest / Balance",
  "Other Reason",
];

function CollectionPage() {
  const {
    customers,
    loans,
    emis,
    recordPayment,
    upsertVisit,
    addPromiseToPay,
    today,
    payments,
    visits,
    dailyClosings,
    closeDay,
    reopenDay,
    settings,
    admin,
  } = useStore();
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  // Tab state: "collect", "route", "today", "closing"
  const [activeTab, setActiveTab] = useState<string>(searchParams.tab ?? "collect");

  // Day & Frequency Filter state: 'all' or specific ISO date
  const [selectedDay, setSelectedDay] = useState<string | "all">(searchParams.day ?? today);
  const [frequencyFilter, setFrequencyFilter] = useState<string>(searchParams.frequency ?? "all");
  const [routeFilter, setRouteFilter] = useState<"all" | "pending" | "overdue">("all");

  const isAll = selectedDay === "all";
  const isToday = selectedDay === today;
  const isYesterday = selectedDay === addDays(today, -1);
  const isTomorrow = selectedDay === addDays(today, 1);
  const dayNameLabel = isAll
    ? "All Time"
    : isToday
    ? "Today's"
    : isYesterday
    ? "Yesterday's"
    : isTomorrow
    ? "Tomorrow's"
    : `${fmtDate(selectedDay)}`;

  // Closing tab sub-view: "history" (All Days) or "audit" (Selected Day)
  const [closingSubView, setClosingSubView] = useState<"history" | "audit">(
    searchParams.sub === "audit" ? "audit" : "history",
  );
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [closingNotesInput, setClosingNotesInput] = useState<string>("");

  // Step state: 1=search, 2=customer, 3=payment, 5=success
  const [step, setStep] = useState(searchParams.customerId ? 2 : 1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(searchParams.customerId ?? "");
  const [selectedLoanId, setSelectedLoanId] = useState<string>(searchParams.loanId ?? "");
  const [selectedEmiId, setSelectedEmiId] = useState<string>(searchParams.emiId ?? "");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Cash");
  const [payNotes, setPayNotes] = useState<string>("");
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [waiveLateFee, setWaiveLateFee] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync search parameters when navigated with customerId / loanId / emiId / day / tab / sub
  useEffect(() => {
    if (searchParams.customerId) {
      setSelectedCustomerId(searchParams.customerId);
      if (searchParams.loanId) setSelectedLoanId(searchParams.loanId);
      if (searchParams.emiId) setSelectedEmiId(searchParams.emiId);
      setStep(2);
      setActiveTab("collect");
    }
    if (searchParams.day) {
      setSelectedDay(searchParams.day);
    }
    if (searchParams.frequency) {
      setFrequencyFilter(searchParams.frequency);
    }
    if (searchParams.tab) {
      setActiveTab(searchParams.tab === "routes" ? "route" : searchParams.tab);
    }
    if (searchParams.sub === "history" || searchParams.sub === "audit") {
      setClosingSubView(searchParams.sub);
    }
  }, [
    searchParams.customerId,
    searchParams.loanId,
    searchParams.emiId,
    searchParams.day,
    searchParams.frequency,
    searchParams.tab,
    searchParams.sub,
  ]);

  // Overpayment dialog state
  const [showOverpayDialog, setShowOverpayDialog] = useState(false);
  const [excessAction, setExcessAction] = useState<"next" | "advance">("next");

  // No Payment / Visit dialog state
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [visitReason, setVisitReason] = useState<string>(VISIT_REASONS[0] ?? "Customer Not Available");
  const [visitNextDate, setVisitNextDate] = useState<string>(addDays(today, 2));
  const [visitNotes, setVisitNotes] = useState<string>("");
  const [includePtp, setIncludePtp] = useState<boolean>(true);
  const [ptpAmount, setPtpAmount] = useState<string>("");

  // Daily Closing confirmation modal
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.address.area.toLowerCase().includes(q) ||
          c.address.city.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerLoans = useMemo(
    () => loans.filter((l) => l.customerId === selectedCustomerId && l.status !== "Closed" && l.status !== "Closed Early"),
    [loans, selectedCustomerId],
  );
  const activeLoan = customerLoans.find((l) => l.id === selectedLoanId) ?? customerLoans[0];

  const allLoanEmis = useMemo(() => {
    if (!activeLoan) return [];
    return emis.filter((e) => e.loanId === activeLoan.id).sort((a, b) => a.emiNo - b.emiNo);
  }, [activeLoan, emis]);

  // Target EMI resolution: priority order (Partial > Overdue > Due today > Next)
  const targetEmi = useMemo(() => {
    if (!activeLoan) return null;
    if (selectedEmiId) {
      const found = allLoanEmis.find((e) => e.id === selectedEmiId);
      if (found) return found;
    }
    return resolveCurrentEmi(allLoanEmis, today);
  }, [activeLoan, allLoanEmis, selectedEmiId, today]);

  // Determine previous and next EMI relative to targetEmi
  const prevEmi = useMemo(() => {
    if (!targetEmi) return null;
    return allLoanEmis.find((e) => e.emiNo === targetEmi.emiNo - 1) ?? null;
  }, [allLoanEmis, targetEmi]);

  const nextEmi = useMemo(() => {
    if (!targetEmi) return null;
    return allLoanEmis.find((e) => e.emiNo === targetEmi.emiNo + 1) ?? null;
  }, [allLoanEmis, targetEmi]);

  const targetRemaining = targetEmi ? Math.max(0, targetEmi.amount - targetEmi.paid) : 0;

  const lateFeeCalc = useMemo(() => {
    if (!targetEmi) {
      return {
        daysOverdue: 0,
        gracePeriodDays: settings.gracePeriodDays ?? 0,
        chargeableDays: 0,
        lateFeePerDay: settings.lateFeePerDay ?? 20,
        lateFeeAmount: 0,
        isWaived: false,
      };
    }
    const isOverdue = targetEmi.status === "Overdue";
    const minDays = isOverdue ? 1 : 0;
    return calculateLateFee(targetEmi.dueDate, today, settings, waiveLateFee || Boolean(targetEmi.lateFeeWaived), minDays);
  }, [targetEmi, today, settings, waiveLateFee]);

  const accruedLateFee = lateFeeCalc.lateFeeAmount;
  const totalDueWithLateFee = targetRemaining + accruedLateFee;
  const totalPayableTarget = accruedLateFee > 0 && !waiveLateFee ? totalDueWithLateFee : targetRemaining;

  const parsedAmount = parseFloat(payAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const isOverpayment = isValidAmount && parsedAmount > totalPayableTarget;
  const willPartial = isValidAmount && parsedAmount < totalPayableTarget;

  const [receiptModalId, setReceiptModalId] = useState<string | null>(null);

  const loanSched = useMemo(() => {
    if (!activeLoan) return null;
    return computeAmortizationSchedule(activeLoan, emis, payments);
  }, [activeLoan, emis, payments]);

  const targetRow = useMemo(() => {
    if (!loanSched || !targetEmi) return null;
    return loanSched.rows.find((r) => r.emiNo === targetEmi.emiNo);
  }, [loanSched, targetEmi]);

  const itemizedSplit = useMemo(() => {
    if (!isValidAmount || !targetRow) return { pComp: 0, iComp: 0, lateFeePaid: 0 };

    let lateFeeAllocated = 0;
    let emiAvailable = parsedAmount;

    if (accruedLateFee > 0 && !waiveLateFee) {
      lateFeeAllocated = Math.min(accruedLateFee, parsedAmount);
      emiAvailable = Math.max(0, parsedAmount - lateFeeAllocated);
    }

    const ratio = targetRow.emiAmount > 0 ? emiAvailable / targetRow.emiAmount : 1;
    const iComp = Math.round(targetRow.interestComponent * Math.min(1, ratio));
    const pComp = Math.max(0, emiAvailable - iComp);
    return { pComp, iComp, lateFeePaid: lateFeeAllocated };
  }, [isValidAmount, targetRow, parsedAmount, accruedLateFee, waiveLateFee]);

  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setSelectedLoanId("");
    setSelectedEmiId("");
    setPayAmount("");
    setWaiveLateFee(false);
    setLastReceipt(null);
    setStep(2);
    setSearchQuery("");
  }, []);

  const handleInitiateCollect = () => {
    if (!isValidAmount) return;
    if (isOverpayment) {
      setShowOverpayDialog(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleRecordPayment = useCallback(() => {
    if (!selectedCustomer || !activeLoan || !targetEmi) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;

    setIsSubmitting(true);
    const res = recordPayment({
      customerId: selectedCustomer.id,
      loanId: activeLoan.id,
      emiId: targetEmi.id,
      amount: amt,
      method: payMethod,
      notes: payNotes,
      excessAction,
      lateFeePaid: itemizedSplit.lateFeePaid,
      lateFeeWaived: waiveLateFee,
    });

    setLastReceipt(res.receipt);
    setShowConfirm(false);
    setShowOverpayDialog(false);
    setStep(5);
    setIsSubmitting(false);
  }, [selectedCustomer, activeLoan, targetEmi, payAmount, payMethod, payNotes, excessAction, itemizedSplit.lateFeePaid, waiveLateFee, recordPayment]);

  const handleSaveNoPaymentVisit = useCallback(() => {
    if (!selectedCustomer || !activeLoan) return;
    const dueAmt = targetRemaining;

    // 1. Save doorstep visit
    const visit = upsertVisit({
      customerId: selectedCustomer.id,
      loanId: activeLoan.id,
      date: today,
      dueAmount: dueAmt,
      collected: 0,
      status: "Not Paid" as VisitStatus,
      reason: visitReason,
      nextVisit: visitNextDate,
      notes: visitNotes,
    });

    // 2. If PTP enabled, save promise to pay
    if (includePtp && targetEmi) {
      const pAmt = parseFloat(ptpAmount) || dueAmt;
      addPromiseToPay({
        customerId: selectedCustomer.id,
        loanId: activeLoan.id,
        emiId: targetEmi.id,
        promiseDate: visitNextDate,
        promiseAmount: pAmt,
        notes: visitNotes || `Promise recorded during doorstep visit: ${visitReason}`,
        visitId: visit.id,
      });
    }

    setShowVisitDialog(false);
    setStep(1);
    setSelectedCustomerId("");
  }, [selectedCustomer, activeLoan, targetRemaining, upsertVisit, today, visitReason, visitNextDate, visitNotes, includePtp, targetEmi, ptpAmount, addPromiseToPay]);

  const handlePrintVisitSlip = () => {
    if (!selectedCustomer || !activeLoan) return;
    const templateHtml = settings.documentTemplates?.visit_slip || DEFAULT_TEMPLATES.visit_slip.defaultHtml;
    const fullAddress = `${selectedCustomer.address.house}, ${selectedCustomer.address.area}, ${selectedCustomer.address.city}, ${selectedCustomer.address.district} - ${selectedCustomer.address.pin}`;

    const rendered = renderTemplate(templateHtml, {
      business_name: settings.businessName || "AARIGO CAPITAL",
      business_address: settings.businessAddress || "",
      business_phone: settings.businessPhone || "",
      business_email: settings.businessEmail || "",
      visit_id: `VIS-${Date.now().toString().slice(-6)}`,
      visit_date: fmtDate(today),
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_mobile: selectedCustomer.mobile,
      customer_address: fullAddress,
      loan_id: activeLoan.id,
      overdue_amount: inr(targetRemaining),
      visit_reason: visitReason,
      next_visit_date: fmtDate(visitNextDate),
      officer_name: admin?.name || "Field Recovery Officer",
      officer_phone: settings.businessPhone || "+91 98765 43210",
      officer_remarks: visitNotes || `Customer contacted regarding overdue EMI on loan ${activeLoan.id}.`,
      receipt_footer: settings.receiptFooter || "Field visit recovery notice. Please clear outstanding dues promptly.",
    });

    printHtmlDocument(rendered, `Visit-Slip-${selectedCustomer.id}`);
  };

  const handleNextCustomer = () => {
    setStep(1);
    setSelectedCustomerId("");
    setSelectedLoanId("");
    setSelectedEmiId("");
    setPayAmount("");
    setPayNotes("");
    setWaiveLateFee(false);
    setLastReceipt(null);
    setSearchQuery("");
  };

  // ── Metrics for selected day & frequency ──────────────────────────────────
  const frequencyFilteredEmis = useMemo(() => {
    if (frequencyFilter === "all") return emis;
    return emis.filter((e) => {
      const loan = loans.find((l) => l.id === e.loanId);
      return loan?.frequency === frequencyFilter;
    });
  }, [emis, loans, frequencyFilter]);

  const dueDayEmis = useMemo(() => {
    return frequencyFilteredEmis.filter((e) => {
      if (isAll) return true;
      if (isToday) {
        return (e.dueDate === selectedDay || e.status === "Overdue") && e.paid < e.amount;
      }
      return e.dueDate === selectedDay;
    });
  }, [frequencyFilteredEmis, selectedDay, isToday, isAll]);

  const dayPayments = useMemo(() => {
    return payments.filter((p) => {
      if (p.reversed) return false;
      if (!isAll && p.date.slice(0, 10) !== selectedDay) return false;
      if (frequencyFilter === "all") return true;
      const loan = loans.find((l) => l.id === p.loanId);
      return loan?.frequency === frequencyFilter;
    });
  }, [payments, selectedDay, frequencyFilter, loans, isAll]);

  const totalDayCollected = useMemo(() => dayPayments.reduce((s, p) => s + p.amount, 0), [dayPayments]);
  const cashDay = useMemo(() => dayPayments.filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0), [dayPayments]);
  const upiDay = useMemo(() => dayPayments.filter((p) => p.method === "UPI").reduce((s, p) => s + p.amount, 0), [dayPayments]);
  const bankDay = useMemo(() => dayPayments.filter((p) => p.method === "Bank").reduce((s, p) => s + p.amount, 0), [dayPayments]);

  const totalDueForDay = useMemo(() => dueDayEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0), [dueDayEmis]);
  const collectionPctDay = totalDueForDay > 0 ? Math.min(100, Math.round((totalDayCollected / totalDueForDay) * 100)) : 0;

  // Backward-compatible aliases for other components/tabs
  const todayPayments = dayPayments;
  const totalToday = totalDayCollected;
  const cashToday = cashDay;
  const upiToday = upiDay;
  const bankToday = bankDay;
  const dueTodayEmis = dueDayEmis;
  const totalDue = totalDueForDay;
  const collectionPct = collectionPctDay;

  // ── Daily Closing and Historical Analysis (All Days) ───────────────────────
  const filteredHistory = useMemo(() => {
    return dailyClosings
      .filter((c) => {
        if (historyStatusFilter !== "all" && c.status !== historyStatusFilter) return false;
        if (historySearchQuery.trim()) {
          const q = historySearchQuery.toLowerCase();
          const dateMatch = c.date.toLowerCase().includes(q) || fmtDate(c.date).toLowerCase().includes(q);
          const userMatch = c.closedBy.toLowerCase().includes(q);
          const notesMatch = c.notes ? c.notes.toLowerCase().includes(q) : false;
          if (!dateMatch && !userMatch && !notesMatch) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyClosings, historyStatusFilter, historySearchQuery]);

  const historicalAggregates = useMemo(() => {
    const totalTarget = dailyClosings.reduce((s, c) => s + c.totalDue, 0);
    const totalCollected = dailyClosings.reduce((s, c) => s + c.totalCollected, 0);
    const totalCash = dailyClosings.reduce((s, c) => s + c.cashAmount, 0);
    const totalDigital = dailyClosings.reduce((s, c) => s + (c.upiAmount + c.bankAmount), 0);
    const closedCount = dailyClosings.filter((c) => c.status === "Closed" || c.status === "Audited").length;
    const avgRate = dailyClosings.length > 0
      ? Math.round(dailyClosings.reduce((s, c) => s + c.collectionRate, 0) / dailyClosings.length)
      : 0;

    return {
      totalTarget,
      totalCollected,
      totalCash,
      totalDigital,
      closedCount,
      avgRate,
    };
  }, [dailyClosings]);

  const selectedDayClosingRecord = useMemo(() => {
    return dailyClosings.find((c) => c.date === selectedDay);
  }, [dailyClosings, selectedDay]);

  const isSelectedDayClosed =
    selectedDayClosingRecord?.status === "Closed" ||
    selectedDayClosingRecord?.status === "Audited" ||
    dayClosed;

  // ── Route planner stops ───────────────────────────────────────────────────
  const routeStops = useMemo(() => {
    const stops: Array<{
      customer: (typeof customers)[0];
      loan: (typeof loans)[0];
      emi: (typeof emis)[0];
      priority: number;
    }> = [];

    dueDayEmis.forEach((emi) => {
      if (routeFilter === "pending" && (emi.status === "Paid" || emi.paid >= emi.amount)) return;
      if (routeFilter === "overdue" && emi.status !== "Overdue") return;

      const cust = customers.find((c) => c.id === emi.customerId);
      const loan = loans.find((l) => l.id === emi.loanId);
      if (cust && loan) {
        stops.push({
          customer: cust,
          loan,
          emi,
          priority: collectionPriorityScore(emi, today),
        });
      }
    });

    return stops.sort((a, b) => b.priority - a.priority);
  }, [dueDayEmis, customers, loans, today, routeFilter]);

  // Group route stops by Area
  const stopsByArea = useMemo(() => {
    const map = new Map<string, typeof routeStops>();
    routeStops.forEach((stop) => {
      const area = stop.customer.address.area || "General Area";
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(stop);
    });
    return Array.from(map.entries());
  }, [routeStops]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Field Collection</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Day-wise doorstep EMI recovery, route planning, overpayment handling & instant receipts
          </p>
        </div>
      </div>

      {/* Day & Frequency Filter Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mr-1">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Day / All Filter:</span>
          </div>

          <div className="inline-flex rounded-lg border border-border/80 p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => setSelectedDay("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isAll
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(today)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isToday
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(addDays(today, -1))}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isYesterday
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setSelectedDay(addDays(today, 1))}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                isTomorrow
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tomorrow
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={isAll ? "" : selectedDay}
              onChange={(e) => {
                if (e.target.value) setSelectedDay(e.target.value);
              }}
              placeholder="Custom Date"
              className="h-8 text-xs w-[140px] px-2 bg-background"
            />
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDay(today)}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Reset to today"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Today
              </Button>
            )}
          </div>
        </div>

        {/* Frequency & Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Frequency:</span>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="h-8 text-xs w-[145px] bg-background">
                <SelectValue placeholder="All Frequencies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Frequencies</SelectItem>
                <SelectItem value="Daily" className="text-xs">Daily (Day)</SelectItem>
                <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select value={routeFilter} onValueChange={(v) => setRouteFilter(v as typeof routeFilter)}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
              <SelectValue placeholder="All Stops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Repayments</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending Only</SelectItem>
              <SelectItem value="overdue" className="text-xs">Overdue Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day Overview Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{dayNameLabel} Collected</p>
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                {collectionPctDay}% Target
              </Badge>
            </div>
            <p className="text-lg font-bold font-mono text-emerald-600 mt-1">{inr(totalDayCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{dayPayments.length} receipts</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{dayNameLabel} Due</p>
            <p className="text-lg font-bold font-mono text-foreground mt-1">{inr(totalDueForDay)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{dueDayEmis.length} installments</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cash Collections</p>
            <p className="text-lg font-bold font-mono text-amber-600 mt-1">{inr(cashDay)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Physical cash in hand</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Digital / UPI / Bank</p>
            <p className="text-lg font-bold font-mono text-blue-600 mt-1">{inr(upiDay + bankDay)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Verified digital credits</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-lg">
          <TabsTrigger value="collect" className="text-xs">Collect EMI</TabsTrigger>
          <TabsTrigger value="route" className="text-xs">Route ({routeStops.length})</TabsTrigger>
          <TabsTrigger value="today" className="text-xs">Log ({dayPayments.length})</TabsTrigger>
          <TabsTrigger value="closing" className="text-xs">Daily Closing ({dailyClosings.length})</TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: COLLECT EMI */}
        {/* ==================================================================== */}
        <TabsContent value="collect" className="m-0 space-y-4">
          {/* STEP 1: SEARCH */}
          {step === 1 && (
            <Card className="shadow-xs border-border">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold">Search Customer</CardTitle>
                <CardDescription className="text-xs">Search by Name, CUS-ID, Mobile number, or Area</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. CUS-000125, Ramesh, 9876543210, Gandhi Nagar..."
                    className="pl-11 h-12 text-sm font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
                    {searchResults.map((c) => {
                      const custEmis = emis.filter((e) => e.customerId === c.id && e.paid < e.amount);
                      const hasOverdue = custEmis.some((e) => e.status === "Overdue");
                      const hasPartial = custEmis.some((e) => e.status === "Partial");
                      const hasDueToday = custEmis.some((e) => e.dueDate === today);
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: `hsl(${c.photoHue}, 65%, 45%)` }}
                            >
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground group-hover:text-primary">{c.name}</div>
                              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{c.id} • {c.mobile}</div>
                              <div className="text-[10px] text-muted-foreground">{c.address.area}, {c.address.city}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasOverdue && <Badge variant="destructive" className="text-[9px]">Overdue</Badge>}
                            {hasPartial && <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">Partial</Badge>}
                            {hasDueToday && !hasOverdue && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Due Today</Badge>}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim() && searchResults.length === 0 && (
                  <EmptyState
                    icon={User}
                    title="No customers found"
                    description={`No matching records for "${searchQuery}"`}
                    className="py-8"
                  />
                )}

                {!searchQuery && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <div>
                        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {dayNameLabel} Scheduled Repayments ({dueDayEmis.length})
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          Installments due on {fmtDate(selectedDay)} {frequencyFilter !== "all" ? `• ${frequencyFilter} frequency` : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Target: {inr(totalDueForDay)}
                      </Badge>
                    </div>

                    {dueDayEmis.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No EMIs scheduled for {fmtDate(selectedDay)}. Use the Day Filter above or search for a customer.
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden max-h-[420px] overflow-y-auto">
                        {dueDayEmis.map((e) => {
                          const cust = customers.find((c) => c.id === e.customerId);
                          const loan = loans.find((l) => l.id === e.loanId);
                          const isPaid = e.status === "Paid";
                          const isOverdue = e.status === "Overdue";
                          const rem = Math.max(0, e.amount - e.paid);
                          const lateCalc = isOverdue ? calculateLateFee(e.dueDate, today, settings, false, 1) : null;

                          return (
                            <div
                              key={e.id}
                              className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ backgroundColor: `hsl(${cust?.photoHue ?? 200}, 65%, 45%)` }}
                                >
                                  {cust?.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground">{cust?.name}</span>
                                    <span className="text-[10px] font-mono text-muted-foreground">({e.loanId})</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                    <span>EMI #{e.emiNo}</span>
                                    <span>•</span>
                                    <span>{cust?.address.area}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right font-mono">
                                  <div className="font-bold text-foreground">{inr(rem)}</div>
                                  {lateCalc && lateCalc.lateFeeAmount > 0 && (
                                    <div className="text-[9px] text-destructive font-medium">+{inr(lateCalc.lateFeeAmount)} fee</div>
                                  )}
                                </div>

                                <StatusBadge status={e.status} size="sm" />

                                <Button
                                  size="sm"
                                  disabled={isPaid}
                                  onClick={() => {
                                    if (cust) {
                                      handleSelectCustomer(cust.id);
                                      if (loan) setSelectedLoanId(loan.id);
                                      setSelectedEmiId(e.id);
                                      setStep(2);
                                    }
                                  }}
                                  className="h-7 text-[10px] px-2.5 cursor-pointer"
                                >
                                  Collect
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {step === 2 && selectedCustomer && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                ← Back to Search
              </button>

              {/* Customer Profile Card */}
              <Card className="shadow-xs border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                        style={{ backgroundColor: `hsl(${selectedCustomer.photoHue}, 65%, 45%)` }}
                      >
                        {selectedCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{selectedCustomer.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{selectedCustomer.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{selectedCustomer.mobile}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedCustomer.address.house}, {selectedCustomer.address.area},{" "}
                          {selectedCustomer.address.city}
                          {selectedCustomer.address.landmark && ` — Near ${selectedCustomer.address.landmark}`}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={selectedCustomer.status} />
                  </div>

                  {/* Contact Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => window.open(`tel:${selectedCustomer.mobile}`, "_self")}
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => window.open(`https://wa.me/91${selectedCustomer.mobile}`, "_blank")}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => {
                        const addr = [selectedCustomer.address.house, selectedCustomer.address.area, selectedCustomer.address.city].join(", ");
                        window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
                      }}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Loan Selector & Multi-EMI Context Strip */}
              {customerLoans.length === 0 ? (
                <EmptyState icon={Banknote} title="No active loans" description="This customer has no active loans." />
              ) : (
                <div className="space-y-3">
                  {customerLoans.length > 1 && (
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="text-xs text-muted-foreground">Select Loan:</span>
                      {customerLoans.map((l) => (
                        <Button
                          key={l.id}
                          size="sm"
                          variant={l.id === activeLoan?.id ? "default" : "outline"}
                          className="text-xs h-8 cursor-pointer"
                          onClick={() => {
                            setSelectedLoanId(l.id);
                            setSelectedEmiId("");
                          }}
                        >
                          {l.id} ({l.frequency})
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Previous / Current / Next EMI Timeline Strip */}
                  <Card className="shadow-xs border-border">
                    <CardHeader className="p-4 pb-2 border-b border-border/60">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold">Installment Context (Loan {activeLoan?.id})</CardTitle>
                        <Badge variant="outline" className="text-[10px]">{activeLoan?.frequency} EMI</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Previous EMI */}
                        <div
                          className={`p-2.5 rounded-lg border border-border/60 text-center transition-colors ${
                            prevEmi ? "cursor-pointer hover:border-primary/60 hover:bg-muted/40" : "bg-muted/20"
                          }`}
                          onClick={() => {
                            if (prevEmi) setSelectedEmiId(prevEmi.id);
                          }}
                          title={prevEmi ? "Click to switch to this installment" : undefined}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Previous</span>
                          {prevEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-medium">#{prevEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(prevEmi.dueDate)}</p>
                              <StatusBadge status={prevEmi.status} size="sm" className="mt-1" />
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-2">None (First)</p>
                          )}
                        </div>

                        {/* Current Target EMI */}
                        <div className="p-2.5 rounded-lg border-2 border-primary bg-primary/5 text-center">
                          <span className="text-[10px] text-primary uppercase font-bold">Selected Due</span>
                          {targetEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-bold text-foreground">#{targetEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(targetEmi.dueDate)}</p>
                              <StatusBadge status={targetEmi.status} size="sm" className="mt-1" />
                              <p className="font-mono font-bold text-primary text-xs mt-1">{inr(targetRemaining)}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-semibold mt-2">All Cleared</p>
                          )}
                        </div>

                        {/* Next EMI */}
                        <div
                          className={`p-2.5 rounded-lg border border-border/60 text-center transition-colors ${
                            nextEmi ? "cursor-pointer hover:border-primary/60 hover:bg-muted/40" : "bg-muted/20"
                          }`}
                          onClick={() => {
                            if (nextEmi) setSelectedEmiId(nextEmi.id);
                          }}
                          title={nextEmi ? "Click to switch to this installment" : undefined}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Next</span>
                          {nextEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-medium">#{nextEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(nextEmi.dueDate)}</p>
                              <StatusBadge status={nextEmi.status} size="sm" className="mt-1" />
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-2">Final EMI</p>
                          )}
                        </div>
                      </div>

                      {allLoanEmis.length > 1 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                          <span className="text-muted-foreground text-[11px]">Pick Installment:</span>
                          <select
                            value={targetEmi?.id ?? ""}
                            onChange={(e) => setSelectedEmiId(e.target.value)}
                            className="text-xs font-mono bg-background border border-border rounded px-2 py-1 max-w-[260px]"
                          >
                            {allLoanEmis.map((e) => (
                              <option key={e.id} value={e.id}>
                                EMI #{e.emiNo} ({fmtDate(e.dueDate)}) - {e.status} • Rem {inr(Math.max(0, e.amount - e.paid))}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {targetEmi && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">EMI Installment #{targetEmi.emiNo}:</span>
                            <span className="font-mono font-bold">{inr(targetEmi.amount)}</span>
                          </div>
                          {targetEmi.paid > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Previously Paid:</span>
                              <span className="font-mono font-semibold">-{inr(targetEmi.paid)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">EMI Balance Due:</span>
                            <span className="font-mono font-semibold text-foreground">{inr(targetRemaining)}</span>
                          </div>
                          {accruedLateFee > 0 && !waiveLateFee && (
                            <div className="flex justify-between text-destructive">
                              <span>Late EMI Charges ({lateFeeCalc.chargeableDays}d @ {inr(lateFeeCalc.lateFeePerDay)}/d):</span>
                              <span className="font-mono font-bold">+{inr(accruedLateFee)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-border/50 pt-1.5 font-bold">
                            <span>Total Collectible:</span>
                            <span className="font-mono text-primary text-sm">{inr(totalPayableTarget)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dual Actions: Collect vs No Payment */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-12 text-xs font-semibold cursor-pointer border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        setPtpAmount(String(totalPayableTarget));
                        setShowVisitDialog(true);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-1.5" />
                      No Payment / PTP
                    </Button>
                    <Button
                      className="h-12 text-xs font-semibold cursor-pointer"
                      disabled={!targetEmi}
                      onClick={() => {
                        setPayAmount(String(totalPayableTarget));
                        setStep(3);
                      }}
                    >
                      <Banknote className="h-4 w-4 mr-1.5" />
                      Collect Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PAYMENT FORM */}
          {step === 3 && selectedCustomer && activeLoan && targetEmi && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                ← Back to Customer
              </button>

              <Card className="shadow-xs border-border">
                <CardHeader className="p-4 pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{selectedCustomer.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">
                        {selectedCustomer.id} • {activeLoan.id} • EMI #{targetEmi.emiNo}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total Collectible</div>
                      <div className="text-base font-bold font-mono text-primary">{inr(totalPayableTarget)}</div>
                      {accruedLateFee > 0 && !waiveLateFee && (
                        <div className="text-[10px] text-destructive font-medium">Includes {inr(accruedLateFee)} late penalty</div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Late EMI Charges & Waiver Box if overdue */}
                  {(targetEmi.status === "Overdue" || targetEmi.dueDate < today || lateFeeCalc.daysOverdue > 0) && (
                    <div className={`p-3 rounded-lg border text-xs space-y-2.5 transition-colors ${
                      waiveLateFee
                        ? "bg-muted/30 border-border/80"
                        : "bg-destructive/5 border-destructive/30"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 shrink-0 ${waiveLateFee ? "text-muted-foreground" : "text-destructive"}`} />
                          <div>
                            <span className="font-semibold text-foreground">
                              {waiveLateFee ? "Late Fee Waived" : "Late EMI Penalty Applicable"}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {lateFeeCalc.daysOverdue} days past due • Grace period: {lateFeeCalc.gracePeriodDays} days
                              {lateFeeCalc.chargeableDays > 0 && ` • Chargeable: ${lateFeeCalc.chargeableDays} days @ ${inr(lateFeeCalc.lateFeePerDay)}/day`}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold text-sm ${waiveLateFee ? "line-through text-muted-foreground" : "text-destructive"}`}>
                            {inr(lateFeeCalc.lateFeeAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-border/40">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-[11px] text-foreground">
                          <input
                            type="checkbox"
                            checked={waiveLateFee}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setWaiveLateFee(checked);
                              setPayAmount(String(checked ? targetRemaining : totalDueWithLateFee));
                            }}
                            className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                          />
                          <span>Waive Late Fee Charges (Officer Override)</span>
                        </label>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setWaiveLateFee(false);
                              setPayAmount(String(totalDueWithLateFee));
                            }}
                            className="text-[10px] px-2 py-0.5 rounded border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold cursor-pointer"
                          >
                            Full (+Late Fee)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWaiveLateFee(true);
                              setPayAmount(String(targetRemaining));
                            }}
                            className="text-[10px] px-2 py-0.5 rounded border border-border bg-background hover:bg-muted text-foreground font-semibold cursor-pointer"
                          >
                            EMI Only
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="collect-amount" className="text-xs font-medium">Payment Amount (₹)</Label>
                      <div className="flex items-center gap-2">
                        {accruedLateFee > 0 && !waiveLateFee ? (
                          <button
                            type="button"
                            onClick={() => setPayAmount(String(totalDueWithLateFee))}
                            className="text-[11px] text-destructive hover:underline font-semibold cursor-pointer"
                          >
                            Full Due ({inr(totalDueWithLateFee)})
                          </button>
                        ) : targetRemaining > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPayAmount(String(targetRemaining))}
                            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Exact Due ({inr(targetRemaining)})
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <Input
                      id="collect-amount"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter amount received..."
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="h-12 text-lg font-mono font-bold"
                    />

                    {/* Amount validation indicator */}
                    {isValidAmount && (
                      <div className="space-y-2 mt-1">
                        <div
                          className={`flex items-center gap-1.5 text-xs p-2 rounded-md ${
                            isOverpayment
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : willPartial
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {isOverpayment ? (
                            <>
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              <span>
                                Overpayment by {inr(parsedAmount - totalPayableTarget)}. Click Record Payment to choose how to allocate excess.
                              </span>
                            </>
                          ) : willPartial ? (
                            <>
                              <Info className="h-4 w-4 shrink-0" />
                              <span>
                                Part payment of {inr(parsedAmount)}. Balance remaining: {inr(totalPayableTarget - parsedAmount)}.
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>Full dues cleared ({inr(parsedAmount)}).</span>
                            </>
                          )}
                        </div>

                        {/* Itemized Payment Split Preview */}
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1.5">
                          <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                            Live Payment Allocation Split
                          </div>
                          {itemizedSplit.lateFeePaid > 0 && (
                            <div className="flex justify-between text-destructive font-medium">
                              <span>Applied to Late Fee Penalty:</span>
                              <span className="font-mono font-bold text-destructive">+{inr(itemizedSplit.lateFeePaid)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Applied to Principal Component:</span>
                            <span className="font-mono font-bold text-foreground">{inr(itemizedSplit.pComp)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Applied to Interest Component:</span>
                            <span className="font-mono font-bold text-foreground">{inr(itemizedSplit.iComp)}</span>
                          </div>
                          {loanSched && (
                            <div className="flex justify-between border-t border-border/50 pt-1.5 font-bold">
                              <span>New Principal Balance:</span>
                              <span className="font-mono text-primary">
                                {inr(Math.max(0, loanSched.outstandingPrincipal - itemizedSplit.pComp))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Cash", "UPI", "Bank"] as PaymentMethod[]).map((m) => (
                        <Button
                          key={m}
                          type="button"
                          variant={payMethod === m ? "default" : "outline"}
                          onClick={() => setPayMethod(m)}
                          className="h-11 text-sm font-medium cursor-pointer"
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="collect-notes" className="text-xs font-medium">Notes (optional)</Label>
                    <Input
                      id="collect-notes"
                      placeholder="e.g. Collected at doorstep, QR paid, paid by nominee..."
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full h-12 text-base font-semibold cursor-pointer"
                    disabled={!isValidAmount}
                    onClick={handleInitiateCollect}
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Record {isValidAmount ? inr(parsedAmount) : "Payment"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && lastReceipt && selectedCustomer && (
            <div className="space-y-4">
              <Card className="shadow-xs border-emerald-500/40 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 text-emerald-600 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-bold">Payment Collected!</div>
                      <div className="text-xs text-muted-foreground">Receipt issued and doorstep visit recorded</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background border border-border space-y-2.5 text-xs">
                    {[
                      { label: "Receipt Number", value: lastReceipt.id, bold: true, mono: true },
                      { label: "Customer", value: selectedCustomer.name, bold: false, mono: false },
                      { label: "Customer ID", value: selectedCustomer.id, bold: false, mono: true },
                      { label: "Loan ID", value: lastReceipt.loanId, bold: false, mono: true },
                      { label: "Amount Paid", value: inr(lastReceipt.amount), bold: true, mono: true, className: "text-emerald-600 text-sm" },
                      { label: "Method", value: lastReceipt.method, bold: false, mono: false },
                      { label: "Date & Time", value: fmtDateTime(lastReceipt.date), bold: false, mono: false },
                    ].map(({ label, value, bold, mono, className }) => (
                      <div key={label} className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`${bold ? "font-bold" : "font-medium"} ${mono ? "font-mono" : ""} text-foreground ${className ?? ""}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <Button
                      variant="outline"
                      className="text-xs h-10 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                      onClick={() => {
                        const payment = payments.find((p) => p.id === lastReceipt.paymentId);
                        shareReceiptOnWhatsApp({
                          receipt: lastReceipt,
                          customer: selectedCustomer,
                          payment,
                          loan: activeLoan,
                          settings,
                          adminName: admin?.name,
                          remainingBalance: Math.max(0, (activeLoan?.principal ?? 0) - (targetEmi?.paid ?? 0)),
                        });
                      }}
                    >
                      <WhatsAppBrandIcon className="h-4 w-4 mr-2 text-emerald-600 fill-emerald-600" />
                      Share on WhatsApp
                    </Button>
                    <Button
                      className="text-xs h-10 cursor-pointer"
                      onClick={() => setReceiptModalId(lastReceipt.id)}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      View & Print Receipt
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-xs h-9 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={handleNextCustomer}
                  >
                    Next Customer →
                  </Button>
                </CardFooter>
              </Card>

              {/* Itemized Payment Receipt Modal */}
              <PaymentReceiptModal
                open={!!receiptModalId}
                onOpenChange={(open) => {
                  if (!open) setReceiptModalId(null);
                }}
                receiptId={receiptModalId}
              />
            </div>
          )}
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: ROUTE PLANNER */}
        {/* ==================================================================== */}
        <TabsContent value="route" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Today's Field Collection Route
                </CardTitle>
                <CardDescription className="text-xs">
                  Prioritized by overdue severity and doorstep proximity
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {routeStops.length} stops
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {routeStops.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No pending collections today!"
                  description="All scheduled EMIs for today are collected."
                  className="py-10"
                />
              ) : (
                stopsByArea.map(([area, stops]) => (
                  <div key={area} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{area} ({stops.length})</span>
                    </div>

                    <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
                      {stops.map(({ customer, loan, emi, priority }) => {
                        const rem = emi.amount - emi.paid;
                        const isOverdue = emi.status === "Overdue";
                        const isPartial = emi.status === "Partial";
                        return (
                          <div key={emi.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5"
                                style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
                              >
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-foreground">{customer.name}</span>
                                  {isOverdue && <Badge variant="destructive" className="text-[9px]">Overdue</Badge>}
                                  {isPartial && <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">Partial</Badge>}
                                  {!isOverdue && !isPartial && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Due Today</Badge>}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {customer.address.house}, {customer.address.area}
                                  {customer.address.landmark ? ` (Near ${customer.address.landmark})` : ""}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {customer.mobile} • EMI #{emi.emiNo} ({loan.id})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                              <div className="text-left sm:text-right">
                                <div className="font-mono font-bold text-xs text-foreground">{inr(rem)}</div>
                                <div className="text-[10px] text-muted-foreground">{fmtDate(emi.dueDate)}</div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 cursor-pointer"
                                  title="Call Customer"
                                  onClick={() => window.open(`tel:${customer.mobile}`, "_self")}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 cursor-pointer"
                                  title="Navigate"
                                  onClick={() => {
                                    const addr = [customer.address.house, customer.address.area, customer.address.city].join(", ");
                                    window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
                                  }}
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs cursor-pointer px-3"
                                  onClick={() => {
                                    handleSelectCustomer(customer.id);
                                    setSelectedLoanId(loan.id);
                                    setSelectedEmiId(emi.id);
                                    setActiveTab("collect");
                                  }}
                                >
                                  Collect
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: TODAY'S LOG */}
        {/* ==================================================================== */}
        <TabsContent value="today" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Collected", value: inr(totalToday), color: "text-emerald-600" },
              { label: "Due Today", value: inr(totalDue), color: "" },
              { label: "Cash", value: inr(cashToday), color: "text-amber-600" },
              { label: "UPI / Bank", value: inr(upiToday + bankToday), color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="shadow-xs border-border">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-sm font-semibold">Today's Collections Log</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{fmtDate(today)} • {todayPayments.length} transaction{todayPayments.length === 1 ? "" : "s"}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-emerald-600">{inr(totalToday)}</div>
                <div className="text-[10px] text-muted-foreground">{collectionPct}% of due ({inr(totalDue)})</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {todayPayments.length === 0 ? (
                <EmptyState icon={Banknote} title="No collections today" description="Start collecting by searching a customer." className="py-10" />
              ) : (
                <div className="divide-y divide-border/60">
                  {todayPayments.map((p) => {
                    const c = customers.find((cust) => cust.id === p.customerId);
                    const loan = loans.find((l) => l.id === p.loanId);
                    const emi = emis.find((e) => e.id === p.emiId);
                    // Compute principal / interest split for this payment
                    const loanSched2 = loan ? computeAmortizationSchedule(loan, emis, payments) : null;
                    const emiRow = loanSched2 && emi ? loanSched2.rows.find((r) => r.emiNo === emi.emiNo) : null;
                    let pPaid = 0;
                    let iPaid = 0;
                    if (emiRow) {
                      const ratio = emiRow.emiAmount > 0 ? p.amount / emiRow.emiAmount : 1;
                      iPaid = Math.round(emiRow.interestComponent * Math.min(1, ratio));
                      pPaid = Math.max(0, p.amount - iPaid);
                    }
                    return (
                      <div key={p.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                        {/* Row 1: Customer avatar + name + receipt + amount */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {c && (
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: `hsl(${c.photoHue}, 65%, 45%)` }}
                              >
                                {c.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-sm text-foreground">{c?.name ?? "Unknown"}</div>
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {c?.id} • {p.loanId} • EMI #{emi?.emiNo ?? "—"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-emerald-600 text-base">+{inr(p.amount)}</div>
                            <div className="text-[10px] text-muted-foreground">{fmtDateTime(p.date)}</div>
                          </div>
                        </div>

                        {/* Row 2: Itemized split + method + receipt */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
                          <div>
                            <p className="text-[9px] uppercase text-muted-foreground font-semibold">Principal Paid</p>
                            <p className="font-mono font-bold text-foreground mt-0.5">{inr(pPaid)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-muted-foreground font-semibold">Interest Paid</p>
                            <p className="font-mono font-bold text-foreground mt-0.5">{inr(iPaid)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-muted-foreground font-semibold">Method</p>
                            <Badge variant="outline" className="text-[9px] mt-0.5">{p.method}</Badge>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-muted-foreground font-semibold">Receipt No.</p>
                            <p className="font-mono text-[10px] font-semibold text-foreground mt-0.5 truncate">{p.receiptId ?? "—"}</p>
                          </div>
                        </div>

                        {/* Row 3: Loan summary + View Receipt */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="text-muted-foreground">
                            {loan && (
                              <span>
                                {inr(loan.principal)} loan • {loan.interestRate}% {loan.interestMethod} • {loan.tenure} EMIs ({loan.frequency})
                              </span>
                            )}
                          </div>
                          {p.receiptId && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-3 cursor-pointer"
                              onClick={() => setReceiptModalId(p.receiptId ?? null)}
                            >
                              <Printer className="h-3 w-3 mr-1" />
                              View Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt modal for Today Log */}
          <PaymentReceiptModal
            open={!!receiptModalId}
            onOpenChange={(open) => { if (!open) setReceiptModalId(null); }}
            receiptId={receiptModalId}
          />
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: DAILY CLOSING & ALL DAYS HISTORY */}
        {/* ==================================================================== */}
        <TabsContent value="closing" className="m-0 space-y-4">
          {/* Sub-view Switcher Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-card/60 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cashier Daily Closing & Audit History</h3>
                <p className="text-xs text-muted-foreground">Multi-day reconciliation register, physical vault handovers, and audit logs.</p>
              </div>
            </div>

            {/* Sub-view toggle pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 self-stretch sm:self-auto">
              <Button
                type="button"
                size="sm"
                variant={closingSubView === "history" ? "default" : "ghost"}
                className="h-8 text-xs font-medium px-3 flex-1 sm:flex-initial cursor-pointer"
                onClick={() => setClosingSubView("history")}
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                Closing History ({dailyClosings.length} Days)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={closingSubView === "audit" ? "default" : "ghost"}
                className="h-8 text-xs font-medium px-3 flex-1 sm:flex-initial cursor-pointer"
                onClick={() => setClosingSubView("audit")}
              >
                <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                Selected Day Audit ({fmtDate(selectedDay)})
                {isSelectedDayClosed ? (
                  <Badge className="ml-1.5 text-[9px] bg-emerald-500/20 text-emerald-600 border-emerald-500/40">Closed</Badge>
                ) : (
                  <Badge variant="outline" className="ml-1.5 text-[9px] border-amber-500/50 text-amber-600">Open</Badge>
                )}
              </Button>
            </div>
          </div>

          {closingSubView === "history" ? (
            /* ============================================================== */
            /* SUB-VIEW 1: ALL DAYS CLOSING HISTORY */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Aggregated KPI Metrics Across All Days */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">All Days Collected</p>
                    <p className="text-base font-bold font-mono text-emerald-600 mt-1">{inr(historicalAggregates.totalCollected)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Target: {inr(historicalAggregates.totalTarget)}</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Physical Cash Handover</p>
                    <p className="text-base font-bold font-mono text-amber-600 mt-1">{inr(historicalAggregates.totalCash)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Cash drawer vault</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Digital / UPI / Bank</p>
                    <p className="text-base font-bold font-mono text-blue-600 mt-1">{inr(historicalAggregates.totalDigital)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Direct bank deposits</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Collection Rate</p>
                    <p className="text-base font-bold font-mono text-foreground mt-1">{historicalAggregates.avgRate}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Across all recorded days</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-border/80 col-span-2 sm:col-span-1">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Days Closed & Audited</p>
                    <p className="text-base font-bold font-mono text-foreground mt-1">
                      {historicalAggregates.closedCount} / {dailyClosings.length}
                    </p>
                    <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                      {dailyClosings.length - historicalAggregates.closedCount === 0 ? "All closed" : `${dailyClosings.length - historicalAggregates.closedCount} open day(s)`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* History Search and Filter Controls */}
              <Card className="shadow-xs border-border/80">
                <CardHeader className="p-4 pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold">Daily Closing History Records</CardTitle>
                    <CardDescription className="text-xs">Showing {filteredHistory.length} of {dailyClosings.length} total closing registers</CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search date, auditor, remarks..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                      {historySearchQuery && (
                        <button
                          onClick={() => setHistorySearchQuery("")}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                      <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                        <SelectItem value="Closed" className="text-xs">Closed</SelectItem>
                        <SelectItem value="Audited" className="text-xs">Audited</SelectItem>
                        <SelectItem value="Open" className="text-xs">Open</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => {
                        setSelectedDay(today);
                        setClosingSubView("audit");
                      }}
                    >
                      <FileCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                      Audit Today
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No closing records match your filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b border-border text-[11px] font-medium text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-3.5 font-semibold">Date & Day</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Target Due</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Collected</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Shortfall</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Rate</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Cash Handover</th>
                            <th className="py-2.5 px-3 font-semibold text-right">UPI / Bank</th>
                            <th className="py-2.5 px-2.5 font-semibold text-center">Txns / Visits</th>
                            <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                            <th className="py-2.5 px-3 font-semibold">Audited By / Notes</th>
                            <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredHistory.map((closing) => {
                            const isRowToday = closing.date === today;
                            const isRowYesterday = closing.date === addDays(today, -1);
                            const isClosed = closing.status === "Closed" || closing.status === "Audited";
                            const dateObj = new Date(closing.date + "T00:00:00");
                            const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "short" });

                            return (
                              <tr
                                key={closing.id}
                                className={`hover:bg-muted/30 transition-colors ${
                                  closing.date === selectedDay ? "bg-primary/5 font-medium" : ""
                                }`}
                              >
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground">{fmtDate(closing.date)}</span>
                                    <span className="text-[10px] text-muted-foreground">({dayOfWeek})</span>
                                    {isRowToday && (
                                      <Badge className="text-[9px] bg-primary/20 text-primary border-primary/40 px-1 py-0">
                                        Today
                                      </Badge>
                                    )}
                                    {isRowYesterday && (
                                      <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0">
                                        Yesterday
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{closing.id}</div>
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-muted-foreground whitespace-nowrap">
                                  {inr(closing.totalDue)}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                                  {inr(closing.totalCollected)}
                                </td>

                                <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                                  {closing.shortfall > 0 ? (
                                    <span className="text-amber-600 font-semibold">{inr(closing.shortfall)}</span>
                                  ) : (
                                    <span className="text-emerald-600">₹0</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <Badge
                                    className={`text-[10px] font-mono ${
                                      closing.collectionRate >= 85
                                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                        : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                                    }`}
                                  >
                                    {closing.collectionRate}%
                                  </Badge>
                                </td>

                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <div className="font-mono font-semibold text-foreground">{inr(closing.cashAmount)}</div>
                                  <div className="text-[10px] text-muted-foreground">{closing.cashCount} cash txns</div>
                                </td>

                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <div className="font-mono font-semibold text-foreground">
                                    {inr(closing.upiAmount + closing.bankAmount)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {closing.upiCount + closing.bankCount} digital txns
                                  </div>
                                </td>

                                <td className="py-3 px-2.5 text-center whitespace-nowrap text-[11px]">
                                  <span className="font-mono">{closing.transactionsCount} txns</span>
                                  <span className="text-muted-foreground mx-1">•</span>
                                  <span className="text-muted-foreground">{closing.visitsCount} visits</span>
                                </td>

                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <StatusBadge status={closing.status} />
                                </td>

                                <td className="py-3 px-3 max-w-[220px]">
                                  <div className="truncate font-medium text-foreground text-[11px]">{closing.closedBy}</div>
                                  {closing.closedAt ? (
                                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                                      {fmtDateTime(closing.closedAt)}
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-amber-600 italic">Pending end-of-day closing</div>
                                  )}
                                  {closing.notes && (
                                    <div className="text-[10px] text-muted-foreground italic truncate mt-0.5">
                                      "{closing.notes}"
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] px-2.5 cursor-pointer"
                                      onClick={() => {
                                        setSelectedDay(closing.date);
                                        setClosingSubView("audit");
                                      }}
                                    >
                                      View Audit →
                                    </Button>

                                    {isClosed ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] px-2 text-muted-foreground hover:text-amber-600 cursor-pointer"
                                        title="Re-open this day for adjustments"
                                        onClick={() => {
                                          reopenDay(closing.date);
                                          setDayClosed(false);
                                        }}
                                      >
                                        <Unlock className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="h-7 text-[10px] px-2.5 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                        onClick={() => {
                                          setSelectedDay(closing.date);
                                          setShowCloseDayModal(true);
                                        }}
                                      >
                                        <Lock className="h-3 w-3 mr-1" />
                                        Close
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            /* ============================================================== */
            /* SUB-VIEW 2: SELECTED DAY AUDIT & CLOSING */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Selected Day Header with Back button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs cursor-pointer"
                    onClick={() => setClosingSubView("history")}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Back to All Days History
                  </Button>
                  <div className="font-semibold text-sm text-foreground">
                    Auditing Day: <span className="text-primary">{fmtDate(selectedDay)}</span> ({dayNameLabel})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Change Day:</Label>
                  <Input
                    type="date"
                    value={selectedDay}
                    max={addDays(today, 30)}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDay(e.target.value);
                    }}
                    className="h-8 text-xs w-[140px]"
                  />
                </div>
              </div>

              {/* Status Alert Banner */}
              {isSelectedDayClosed ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Daily Closing Completed & Locked
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Cashier register for {fmtDate(selectedDay)} was locked by{" "}
                        <span className="font-semibold">{selectedDayClosingRecord?.closedBy || admin.name}</span>
                        {selectedDayClosingRecord?.closedAt && ` on ${fmtDateTime(selectedDayClosingRecord.closedAt)}`}.
                      </p>
                      {selectedDayClosingRecord?.notes && (
                        <p className="text-[10px] text-muted-foreground italic mt-1">
                          Remarks: "{selectedDayClosingRecord.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
                      onClick={() => {
                        reopenDay(selectedDay);
                        setDayClosed(false);
                      }}
                    >
                      <Unlock className="h-3 w-3 mr-1.5" />
                      Re-open Day for Adjustment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs cursor-pointer"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-3 w-3 mr-1.5" />
                      Print Sheet
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Cashier Register Is Open
                      </h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Collections are actively being received. Complete your physical cash count and lock daily closing when done.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    onClick={() => setShowCloseDayModal(true)}
                  >
                    <FileCheck className="h-3.5 w-3.5 mr-1.5" />
                    Confirm & Lock Day Closing
                  </Button>
                </div>
              )}

              {/* 4 Summary Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Target / Expected", value: inr(totalDue) },
                  { label: "Total Collected", value: inr(totalToday), color: "text-emerald-600" },
                  {
                    label: "Pending Shortfall",
                    value: inr(Math.max(0, totalDue - totalToday)),
                    color: totalDue - totalToday > 0 ? "text-amber-600" : "",
                  },
                  {
                    label: "Collection Rate",
                    value: `${collectionPct}%`,
                    color: collectionPct >= 80 ? "text-emerald-600" : "text-amber-600",
                  },
                ].map(({ label, value, color }) => (
                  <Card key={label} className="shadow-xs border-border">
                    <CardContent className="p-3.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className={`text-sm font-bold mt-0.5 ${color ?? ""}`}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Method Breakdown */}
                <Card className="shadow-xs border-border">
                  <CardHeader className="p-4 pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold">{dayNameLabel} Payment Method Audit</CardTitle>
                    <CardDescription className="text-xs">{fmtDate(selectedDay)}: Physical cash vs digital bank transfer</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    {[
                      { method: "Cash (Handover Required)", amount: cashToday, count: todayPayments.filter((p) => p.method === "Cash").length },
                      { method: "UPI (Direct to Account)", amount: upiToday, count: todayPayments.filter((p) => p.method === "UPI").length },
                      { method: "Bank Transfer", amount: bankToday, count: todayPayments.filter((p) => p.method === "Bank").length },
                    ].map(({ method, amount, count }) => (
                      <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <div className="font-semibold text-foreground">{method}</div>
                          <div className="text-[10px] text-muted-foreground">{count} transaction{count === 1 ? "" : "s"}</div>
                        </div>
                        <span className="font-mono font-bold text-xs">{inr(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-border/60 pt-3 font-bold text-sm">
                      <span>Grand Total</span>
                      <span className="font-mono text-emerald-600">{inr(totalToday)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Doorstep Visit Audit */}
                <Card className="shadow-xs border-border">
                  <CardHeader className="p-4 pb-3 border-b border-border/60">
                    <CardTitle className="text-sm font-semibold">{dayNameLabel} Doorstep Visit Audit</CardTitle>
                    <CardDescription className="text-xs">{fmtDate(selectedDay)}: Visits performed vs unvisited customers</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    {(() => {
                      const todayVisits = visits.filter((v) => v.date === selectedDay);
                      const paidVisits = todayVisits.filter((v) => v.status === "Paid" || v.status === "Partially Paid").length;
                      const notPaidVisits = todayVisits.filter((v) => v.status === "Not Paid").length;
                      return (
                        <div className="space-y-2.5">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Scheduled Stops:</span>
                            <span className="font-mono font-semibold">{routeStops.length + todayVisits.length}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600">
                            <span>Collections Recorded:</span>
                            <span className="font-mono font-semibold">{paidVisits}</span>
                          </div>
                          <div className="flex justify-between text-amber-600">
                            <span>Unpaid Visits / PTP Taken:</span>
                            <span className="font-mono font-semibold">{notPaidVisits}</span>
                          </div>
                          <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                            <span>Pending Unvisited Stops:</span>
                            <span className="font-mono text-destructive">{routeStops.length}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
                      {isSelectedDayClosed ? (
                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <div>
                            <strong>Day Closed & Audited!</strong>
                            <p className="text-[10px] mt-0.5">Summary locked by {selectedDayClosingRecord?.closedBy || admin.name}.</p>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full text-xs h-10 cursor-pointer"
                          onClick={() => setShowCloseDayModal(true)}
                        >
                          <FileCheck className="h-4 w-4 mr-2" />
                          Close & Audit Day
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full text-xs h-9 cursor-pointer"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Daily Closing Sheet
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* DIALOG 1: OVERPAYMENT RESOLUTION (Requirement 3 & 4) */}
      {/* ==================================================================== */}
      <Dialog open={showOverpayDialog} onOpenChange={setShowOverpayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Overpayment Detected
            </DialogTitle>
            <DialogDescription className="text-xs">
              The entered payment of <strong className="text-foreground">{inr(parsedAmount || 0)}</strong> exceeds the target EMI balance of{" "}
              <strong className="text-foreground">{inr(targetRemaining)}</strong> by{" "}
              <strong className="text-emerald-600">{inr(Math.max(0, (parsedAmount || 0) - targetRemaining))}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="font-semibold text-foreground">Select how you would like to handle the excess amount:</p>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  excessAction === "next" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="excess-action"
                  className="mt-1"
                  checked={excessAction === "next"}
                  onChange={() => setExcessAction("next")}
                />
                <div>
                  <div className="font-semibold text-foreground">1. Apply Excess to Next EMI(s)</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Clear EMI #{targetEmi?.emiNo} ({inr(targetRemaining)}) and spill the excess {inr(Math.max(0, (parsedAmount || 0) - targetRemaining))} into subsequent unpaid EMI(s).
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  excessAction === "advance" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="excess-action"
                  className="mt-1"
                  checked={excessAction === "advance"}
                  onChange={() => setExcessAction("advance")}
                />
                <div>
                  <div className="font-semibold text-foreground">2. Keep as Advance Credit</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cap current payment at {inr(targetRemaining)} for EMI #{targetEmi?.emiNo}, and hold remainder in customer ledger.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs cursor-pointer"
              onClick={() => {
                setShowOverpayDialog(false);
                setPayAmount(String(targetRemaining));
              }}
            >
              Re-enter Exact Amount ({inr(targetRemaining)})
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => {
                setShowOverpayDialog(false);
                setShowConfirm(true);
              }}
            >
              Continue with Selection →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 2: NO PAYMENT & PROMISE-TO-PAY (Requirement 7 & 8) */}
      {/* ==================================================================== */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Record Doorstep Visit / No Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record why collection could not be completed and schedule next visit or Promise-to-Pay (PTP).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Reason for Non-Payment *</Label>
              <Select value={visitReason} onValueChange={setVisitReason}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Next Visit Date *</Label>
              <Input
                type="date"
                value={visitNextDate}
                min={today}
                onChange={(e) => setVisitNextDate(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2.5">
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePtp}
                  onChange={(e) => setIncludePtp(e.target.checked)}
                />
                Record Formal Promise-to-Pay (PTP)
              </label>

              {includePtp && (
                <div className="space-y-2 pt-1">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Promised Amount (₹)</Label>
                    <Input
                      type="number"
                      value={ptpAmount}
                      onChange={(e) => setPtpAmount(e.target.value)}
                      placeholder={String(targetRemaining)}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Doorstep Notes / Remarks</Label>
              <Textarea
                rows={2}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="e.g. Spoke with borrower spouse; promised full payment on Friday afternoon..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap sm:justify-end">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowVisitDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="outline" className="text-xs cursor-pointer border-primary/30 text-primary hover:bg-primary/10" onClick={handlePrintVisitSlip}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Visit Slip
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={handleSaveNoPaymentVisit}>
              Save Visit & Schedule Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 3: CONFIRM PAYMENT */}
      {/* ==================================================================== */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs py-2">
            <div className="rounded-lg border border-border p-3.5 space-y-1.5">
              {selectedCustomer && [
                { label: "Customer", value: selectedCustomer.name },
                { label: "Customer ID", value: selectedCustomer.id },
                { label: "Loan ID", value: activeLoan?.id ?? "" },
                { label: "EMI #", value: targetEmi ? `${targetEmi.emiNo} (${targetEmi.id})` : "" },
                ...(itemizedSplit.lateFeePaid > 0 ? [{ label: "Late Fee Charges", value: inr(itemizedSplit.lateFeePaid), className: "text-destructive font-mono font-bold" }] : []),
                ...(waiveLateFee && accruedLateFee > 0 ? [{ label: "Late Fee Status", value: "Waived by Officer", className: "text-emerald-600 font-semibold" }] : []),
                { label: "Amount Received", value: inr(parsedAmount || 0), bold: true, className: "text-emerald-600 font-mono text-sm" },
                { label: "Method", value: payMethod },
                ...(isOverpayment ? [{ label: "Allocation", value: excessAction === "next" ? "Spill to next EMI" : "Keep as advance" }] : []),
              ].map(({ label, value, bold, className }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className={`font-medium text-foreground ${bold ? "font-bold" : ""} ${className ?? ""}`}>{value}</span>
                </div>
              ))}
            </div>
            {willPartial && (
              <p className="text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                This is a partial payment. Remaining: {inr(Math.max(0, totalPayableTarget - parsedAmount))}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={handleRecordPayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm & Issue Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 4: CLOSE DAY MODAL */}
      {/* ==================================================================== */}
      <Dialog open={showCloseDayModal} onOpenChange={setShowCloseDayModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Audit & Close Day
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify total collections collected today before closing the cashier register.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 text-xs py-2">
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Cash to Hand Over:</span>
                <span className="font-mono font-bold text-foreground">{inr(cashToday)}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI / Bank Received:</span>
                <span className="font-mono font-bold text-foreground">{inr(upiToday + bankToday)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600">{inr(totalToday)}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs">Closing Remarks / Audit Notes</Label>
              <Textarea
                rows={2}
                value={closingNotesInput}
                onChange={(e) => setClosingNotesInput(e.target.value)}
                placeholder="Physical cash verified against denomination sheet..."
                className="mt-1 text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Closing will timestamp this audit into the permanent multi-day closing register.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowCloseDayModal(false)}>
              Back
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                closeDay({
                  date: selectedDay,
                  notes: closingNotesInput || "Cash drawer reconciled and closed.",
                  status: "Closed",
                });
                setDayClosed(true);
                setShowCloseDayModal(false);
              }}
            >
              Confirm & Lock Daily Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
