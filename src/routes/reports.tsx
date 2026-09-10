import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Banknote,
  Calendar,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  Users,
  CreditCard,
  ArrowDownRight,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import type { EarlyClosureRecord } from "@/types";
import {
  inr,
  inrShort,
  pct,
  fmtDate,
  fmtDateTime,
  safe,
  todayISO,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  prevMonthStart,
  prevMonthEnd,
  prevWeekStart,
  prevWeekEnd,
} from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { exportMultiSheetExcel, exportToJson, exportToCsv } from "@/utils/export";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "custom";

function ReportsPage() {
  const { loans, emis, payments, customers, earlyClosures, today, settings } = useStore();
  const { location } = useRouterState();
  const [activeTab, setActiveTab] = useState("collections");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customFrom, setCustomFrom] = useState(today.slice(0, 8) + "01");
  const [customTo, setCustomTo] = useState(today);
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const tabFromUrl = useMemo(() => {
    const p = new URLSearchParams(location.searchStr);
    const raw = (p.get("tab") || "").toLowerCase();
    if (raw === "analytics") return "delinquency";
    return raw;
  }, [location.searchStr]);

  useEffect(() => {
    if (tabFromUrl && ["collections", "disbursements", "early_closures", "delinquency", "emis"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // ── Calculate Active Date Range Bounds ────────────────────────────────────
  const { fromDate, toDate } = useMemo(() => {
    switch (datePreset) {
      case "today":
        return { fromDate: today, toDate: today };
      case "yesterday": {
        const y = addDays(today, -1);
        return { fromDate: y, toDate: y };
      }
      case "this_week":
        return { fromDate: startOfWeek(today), toDate: endOfWeek(today) };
      case "last_week":
        return { fromDate: prevWeekStart(today), toDate: prevWeekEnd(today) };
      case "this_month":
        return { fromDate: startOfMonth(today), toDate: endOfMonth(today) };
      case "last_month":
        return { fromDate: prevMonthStart(today), toDate: prevMonthEnd(today) };
      case "custom":
        return { fromDate: customFrom, toDate: customTo };
      case "all":
      default:
        return { fromDate: "2000-01-01", toDate: "2099-12-31" };
    }
  }, [datePreset, today, customFrom, customTo]);

  // ── Filtered Collections ──────────────────────────────────────────────────
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = p.date.slice(0, 10);
      if (pDate < fromDate || pDate > toDate) return false;
      if (methodFilter !== "all" && p.method !== methodFilter) return false;

      const c = customers.find((cust) => cust.id === p.customerId);
      const l = loans.find((loan) => loan.id === p.loanId);

      if (frequencyFilter !== "all" && l?.frequency !== frequencyFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCust = c?.name.toLowerCase().includes(q) || c?.id.toLowerCase().includes(q);
        const matchPay = p.id.toLowerCase().includes(q) || p.receiptId.toLowerCase().includes(q);
        if (!matchCust && !matchPay) return false;
      }
      return true;
    });
  }, [payments, fromDate, toDate, methodFilter, frequencyFilter, searchQuery, customers, loans]);

  const totalFilteredCollected = useMemo(
    () => filteredPayments.filter((p) => !p.reversed).reduce((s, p) => s + p.amount, 0),
    [filteredPayments],
  );

  // ── Filtered Disbursements ────────────────────────────────────────────────
  const filteredLoans = useMemo(() => {
    return loans.filter((l) => {
      if (l.startDate < fromDate || l.startDate > toDate) return false;
      if (frequencyFilter !== "all" && l.frequency !== frequencyFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const c = customers.find((cust) => cust.id === l.customerId);
        const matchCust = c?.name.toLowerCase().includes(q) || c?.id.toLowerCase().includes(q);
        const matchLoan = l.id.toLowerCase().includes(q);
        if (!matchCust && !matchLoan) return false;
      }
      return true;
    });
  }, [loans, fromDate, toDate, frequencyFilter, statusFilter, searchQuery, customers]);

  const totalSanctioned = useMemo(() => filteredLoans.reduce((s, l) => s + l.principal, 0), [filteredLoans]);
  const totalFees = useMemo(() => filteredLoans.reduce((s, l) => s + safe(l.processingFee), 0), [filteredLoans]);
  const totalInsurance = useMemo(() => filteredLoans.reduce((s, l) => s + safe(l.insurance), 0), [filteredLoans]);
  const totalNetDisbursed = useMemo(
    () => filteredLoans.reduce((s, l) => s + Math.max(0, l.principal - safe(l.processingFee) - safe(l.insurance)), 0),
    [filteredLoans],
  );

  // ── Filtered EMIs ─────────────────────────────────────────────────────────
  const filteredEmis = useMemo(() => {
    return emis.filter((e) => {
      if (e.dueDate < fromDate || e.dueDate > toDate) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;

      const l = loans.find((loan) => loan.id === e.loanId);
      if (frequencyFilter !== "all" && l?.frequency !== frequencyFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const c = customers.find((cust) => cust.id === e.customerId);
        const matchCust = c?.name.toLowerCase().includes(q) || c?.id.toLowerCase().includes(q);
        const matchEmi = e.id.toLowerCase().includes(q) || e.loanId.toLowerCase().includes(q);
        if (!matchCust && !matchEmi) return false;
      }
      return true;
    });
  }, [emis, fromDate, toDate, statusFilter, frequencyFilter, searchQuery, loans, customers]);

  const totalEmiDueAmount = useMemo(() => filteredEmis.reduce((s, e) => s + e.amount, 0), [filteredEmis]);
  const totalEmiPaidAmount = useMemo(() => filteredEmis.reduce((s, e) => s + e.paid, 0), [filteredEmis]);
  const totalEmiRemaining = useMemo(() => filteredEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0), [filteredEmis]);

  // ── Delinquent Customer Ranking ───────────────────────────────────────────
  const overdueEmis = useMemo(() => emis.filter((e) => e.status === "Overdue"), [emis]);
  const delinquentCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        customer: (typeof customers)[0];
        overdueCount: number;
        overdueTotal: number;
        oldestDueDate: string;
        loanIds: Set<string>;
      }
    >();

    overdueEmis.forEach((e) => {
      const c = customers.find((cust) => cust.id === e.customerId);
      if (!c) return;
      const existing = map.get(c.id) ?? {
        customer: c,
        overdueCount: 0,
        overdueTotal: 0,
        oldestDueDate: e.dueDate,
        loanIds: new Set(),
      };
      existing.overdueCount += 1;
      existing.overdueTotal += e.amount - e.paid;
      existing.loanIds.add(e.loanId);
      if (e.dueDate < existing.oldestDueDate) existing.oldestDueDate = e.dueDate;
      map.set(c.id, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.overdueTotal - a.overdueTotal);
  }, [overdueEmis, customers]);

  const totalDelinquentAmount = useMemo(
    () => delinquentCustomers.reduce((s, d) => s + d.overdueTotal, 0),
    [delinquentCustomers],
  );

  // ── Early Closure Records & Aggregations (User Req A10) ────────────────────
  const allEarlyClosures = useMemo(() => {
    const map = new Map<string, EarlyClosureRecord>();
    (earlyClosures ?? []).forEach((ec) => map.set(ec.id, ec));
    loans.forEach((l) => {
      if (l.earlyClosure) map.set(l.earlyClosure.id, l.earlyClosure);
    });
    return Array.from(map.values()).sort((a, b) => b.closureDate.localeCompare(a.closureDate));
  }, [earlyClosures, loans]);

  const filteredEarlyClosures = useMemo(() => {
    return allEarlyClosures.filter((ec) => {
      const cDate = ec.closureDate.slice(0, 10);
      if (cDate < fromDate || cDate > toDate) return false;
      if (methodFilter !== "all" && ec.paymentMethod !== methodFilter) return false;

      const cust = customers.find((c) => c.id === ec.customerId);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const m =
          ec.loanId.toLowerCase().includes(q) ||
          ec.id.toLowerCase().includes(q) ||
          ec.customerId.toLowerCase().includes(q) ||
          (cust?.name ?? "").toLowerCase().includes(q);
        if (!m) return false;
      }
      return true;
    });
  }, [allEarlyClosures, fromDate, toDate, methodFilter, searchQuery, customers]);

  const totalEcPrincipal = useMemo(
    () => filteredEarlyClosures.reduce((s, ec) => s + ec.outstandingPrincipal, 0),
    [filteredEarlyClosures],
  );
  const totalEcCharges = useMemo(
    () => filteredEarlyClosures.reduce((s, ec) => s + ec.earlyClosureCharge, 0),
    [filteredEarlyClosures],
  );
  const totalEcSettlement = useMemo(
    () => filteredEarlyClosures.reduce((s, ec) => s + ec.finalClosureAmount, 0),
    [filteredEarlyClosures],
  );

  // ── Export Datasets ───────────────────────────────────────────────────────
  const collectionsData = useMemo(() => {
    const headers = ["Payment ID", "Receipt ID", "Date", "Customer ID", "Customer Name", "Loan ID", "Amount", "Method", "Collector", "Reversed"];
    const rows = filteredPayments.map((p) => {
      const c = customers.find((cust) => cust.id === p.customerId);
      return [p.id, p.receiptId, p.date, p.customerId, c?.name ?? "—", p.loanId, p.amount, p.method, p.collectedBy, p.reversed ? "Yes" : "No"];
    });
    return { headers, rows };
  }, [filteredPayments, customers]);

  const disbursementsData = useMemo(() => {
    const headers = ["Loan ID", "Customer ID", "Customer Name", "Start Date", "Sanctioned Principal", "Processing Fee", "Insurance", "Net Disbursed", "Frequency", "Tenure", "Disbursement Method", "Bank Tx Ref"];
    const rows = filteredLoans.map((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      return [
        l.id,
        l.customerId,
        c?.name ?? "—",
        l.startDate,
        l.principal,
        l.processingFee,
        l.insurance,
        Math.max(0, l.principal - safe(l.processingFee) - safe(l.insurance)),
        l.frequency,
        l.tenure,
        l.disbursementMethod || "Cash",
        l.bankTransactionId || "",
      ];
    });
    return { headers, rows };
  }, [filteredLoans, customers]);

  const earlyClosuresData = useMemo(() => {
    const headers = [
      "Closure Date",
      "Customer ID",
      "Customer Name",
      "Account ID",
      "Loan ID",
      "Original Loan Amount",
      "Outstanding Principal",
      "Early Closure Charge %",
      "Early Closure Charge",
      "Future Interest Charged",
      "Final Closure Amount",
      "Payment Method",
      "Payment ID",
      "Receipt ID",
      "Transaction ID",
      "Status",
    ];
    const rows = filteredEarlyClosures.map((ec) => {
      const c = customers.find((cust) => cust.id === ec.customerId);
      return [
        fmtDate(ec.closureDate),
        ec.customerId,
        c?.name ?? "—",
        ec.accountId,
        ec.loanId,
        ec.originalLoanAmount,
        ec.outstandingPrincipal,
        `${ec.earlyClosureChargePercent}%`,
        ec.earlyClosureCharge,
        0,
        ec.finalClosureAmount,
        ec.paymentMethod,
        ec.paymentId,
        ec.receiptId,
        ec.bankTransactionId || "—",
        ec.status,
      ];
    });
    return { headers, rows };
  }, [filteredEarlyClosures, customers]);

  const delinquencyData = useMemo(() => {
    const headers = ["Customer ID", "Customer Name", "Mobile", "Area", "City", "Overdue EMIs", "Total Overdue Amount", "Oldest Due Date"];
    const rows = delinquentCustomers.map((d) => [
      d.customer.id,
      d.customer.name,
      d.customer.mobile,
      d.customer.address.area,
      d.customer.address.city,
      d.overdueCount,
      d.overdueTotal,
      d.oldestDueDate,
    ]);
    return { headers, rows };
  }, [delinquentCustomers]);

  const emisData = useMemo(() => {
    const headers = ["EMI ID", "Due Date", "Loan ID", "EMI No", "Customer ID", "Customer Name", "Installment Amount", "Paid Amount", "Remaining Balance", "Status"];
    const rows = filteredEmis.map((e) => {
      const c = customers.find((cust) => cust.id === e.customerId);
      return [
        e.id,
        fmtDate(e.dueDate),
        e.loanId,
        e.emiNo,
        e.customerId,
        c?.name ?? "—",
        e.amount,
        e.paid,
        Math.max(0, e.amount - e.paid),
        e.status,
      ];
    });
    return { headers, rows };
  }, [filteredEmis, customers]);

  const exportAllExcel = () => {
    exportMultiSheetExcel(`audit_report_${fromDate}_to_${toDate}`, [
      { name: "Collections", headers: collectionsData.headers, rows: collectionsData.rows },
      { name: "Disbursements", headers: disbursementsData.headers, rows: disbursementsData.rows },
      { name: "Early Closures", headers: earlyClosuresData.headers, rows: earlyClosuresData.rows },
      { name: "NPA Delinquency", headers: delinquencyData.headers, rows: delinquencyData.rows },
      { name: "EMI Register", headers: emisData.headers, rows: emisData.rows },
    ]);
  };

  const exportAllJson = () => {
    exportToJson(`audit_report_${fromDate}_to_${toDate}`, {
      report: "Comprehensive Financial & Operational Audit Report",
      generatedAt: new Date().toISOString(),
      period: { from: fromDate, to: toDate },
      summary: {
        totalCollected: totalFilteredCollected,
        totalDisbursed: totalNetDisbursed,
        delinquentAccounts: delinquentCustomers.length,
        earlyClosuresCount: filteredEarlyClosures.length,
        emisCount: filteredEmis.length,
      },
      collections: collectionsData.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        collectionsData.headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      }),
      disbursements: disbursementsData.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        disbursementsData.headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      }),
      earlyClosures: earlyClosuresData.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        earlyClosuresData.headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      }),
      delinquency: delinquencyData.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        delinquencyData.headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      }),
      emis: emisData.rows.map((r) => {
        const obj: Record<string, unknown> = {};
        emisData.headers.forEach((h, i) => { obj[h] = r[i]; });
        return obj;
      }),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Financial & Operational Reports
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Audit registers, collections, disbursements, NPA delinquency tracking and CSV export
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ExportDropdown
            label="Export All Reports"
            size="sm"
            variant="default"
            className="text-xs h-9 font-medium shadow-xs"
            onExportExcel={exportAllExcel}
            onExportJson={exportAllJson}
            onPrint={() => window.print()}
          />
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by customer, ID or loan..."
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Date Preset */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Period:</span>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today" className="text-xs">Today</SelectItem>
                  <SelectItem value="yesterday" className="text-xs">Yesterday</SelectItem>
                  <SelectItem value="this_week" className="text-xs">This Week</SelectItem>
                  <SelectItem value="last_week" className="text-xs">Last Week</SelectItem>
                  <SelectItem value="this_month" className="text-xs">This Month</SelectItem>
                  <SelectItem value="last_month" className="text-xs">Last Month</SelectItem>
                  <SelectItem value="all" className="text-xs">All Time</SelectItem>
                  <SelectItem value="custom" className="text-xs">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frequency Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Freq:</span>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Freq</SelectItem>
                  <SelectItem value="Daily" className="text-xs">Daily</SelectItem>
                  <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                  <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Method Filter (for collections) */}
            {activeTab === "collections" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Method:</span>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                    <SelectItem value="UPI" className="text-xs">UPI</SelectItem>
                    <SelectItem value="Bank" className="text-xs">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Custom Date Range Pickers */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs">
              <span className="text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 max-w-2xl">
          <TabsTrigger value="collections" className="text-xs">Collections</TabsTrigger>
          <TabsTrigger value="disbursements" className="text-xs">Disbursements</TabsTrigger>
          <TabsTrigger value="early_closures" className="text-xs font-semibold">
            Early Closures ({filteredEarlyClosures.length})
          </TabsTrigger>
          <TabsTrigger value="delinquency" className="text-xs">NPA / Delinquency</TabsTrigger>
          <TabsTrigger value="emis" className="text-xs">EMI Register</TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: COLLECTIONS */}
        {/* ==================================================================== */}
        <TabsContent value="collections" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Filtered Transactions</p>
                <p className="text-base font-bold font-mono mt-0.5">{filteredPayments.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Total Collected</p>
                <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">{inr(totalFilteredCollected)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Period Range</p>
                <p className="text-xs font-semibold mt-0.5">{fmtDate(fromDate)} → {fmtDate(toDate)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Collection Receipts Register</CardTitle>
                <CardDescription className="text-xs">Every repayment received across all collection channels</CardDescription>
              </div>
              <ExportDropdown
                filename={`collections_${fromDate}_to_${toDate}`}
                sheetName="Collections"
                headers={collectionsData.headers}
                rows={collectionsData.rows}
              />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Receipt No.</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Date & Time</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Customer</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Loan ID</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Collector</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Amount (₹)</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No collections matching active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const c = customers.find((cust) => cust.id === p.customerId);
                      return (
                        <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${p.reversed ? "opacity-60 line-through" : ""}`}>
                          <td className="p-2.5 font-mono text-[10px]">{p.receiptId}</td>
                          <td className="p-2.5 whitespace-nowrap">{fmtDateTime(p.date)}</td>
                          <td className="p-2.5 font-medium">{c?.name}</td>
                          <td className="p-2.5 font-mono text-[10px]">{p.loanId}</td>
                          <td className="p-2.5"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                          <td className="p-2.5 text-muted-foreground">{p.collectedBy}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-600">+{inr(p.amount)}</td>
                          <td className="p-2.5">
                            {p.reversed ? (
                              <Badge variant="destructive" className="text-[9px]">Reversed</Badge>
                            ) : (
                              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Valid</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                    <td colSpan={6} className="p-2.5 text-right uppercase text-[10px] tracking-wide">
                      Total Filtered Collections:
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 text-sm">
                      {inr(totalFilteredCollected)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: DISBURSEMENTS */}
        {/* ==================================================================== */}
        <TabsContent value="disbursements" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Loans Sanctioned</p>
                <p className="text-base font-bold font-mono mt-0.5">{filteredLoans.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Gross Sanctioned</p>
                <p className="text-base font-bold font-mono mt-0.5">{inr(totalSanctioned)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Fees & Insurance</p>
                <p className="text-base font-bold font-mono text-amber-600 mt-0.5">{inr(totalFees + totalInsurance)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Net Disbursed Cash</p>
                <p className="text-base font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{inr(totalNetDisbursed)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Disbursement & Sanctions Register</CardTitle>
                <CardDescription className="text-xs">Contracts, upfront deductions and borrower payouts</CardDescription>
              </div>
              <ExportDropdown
                filename={`disbursements_${fromDate}_to_${toDate}`}
                sheetName="Disbursements"
                headers={disbursementsData.headers}
                rows={disbursementsData.rows}
              />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Loan ID</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Borrower</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Freq / Tenure</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Principal (₹)</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Fees (₹)</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Insurance (₹)</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Net Disbursed (₹)</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-muted-foreground">
                        No loans sanctioned in selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((l) => {
                      const c = customers.find((cust) => cust.id === l.customerId);
                      const net = Math.max(0, l.principal - safe(l.processingFee) - safe(l.insurance));
                      return (
                        <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-mono text-[10px]">{l.id}</td>
                          <td className="p-2.5 whitespace-nowrap">{fmtDate(l.startDate)}</td>
                          <td className="p-2.5 font-medium">{c?.name}</td>
                          <td className="p-2.5">{l.tenure} {l.frequency === "Monthly" ? "Months" : l.frequency === "Weekly" ? "Weeks" : "Days"}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{inr(l.principal)}</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">{inr(l.processingFee)}</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">{inr(l.insurance)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{inr(net)}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[9px]">
                              {l.disbursementMethod || "Cash"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                    <td colSpan={4} className="p-2.5 text-right uppercase text-[10px] tracking-wide">
                      Total Filtered Disbursements:
                    </td>
                    <td className="p-2.5 text-right font-mono">{inr(totalSanctioned)}</td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">{inr(totalFees)}</td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">{inr(totalInsurance)}</td>
                    <td className="p-2.5 text-right font-mono text-blue-600 dark:text-blue-400 text-sm">{inr(totalNetDisbursed)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: NPA / DELINQUENCY */}
        {/* ==================================================================== */}
        <TabsContent value="delinquency" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Delinquent Borrowers</p>
                <p className="text-base font-bold font-mono text-destructive mt-0.5">{delinquentCustomers.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Total Portfolio at Risk (PAR)</p>
                <p className="text-base font-bold font-mono text-destructive mt-0.5">{inr(totalDelinquentAmount)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Total Overdue Installments</p>
                <p className="text-base font-bold font-mono mt-0.5">{overdueEmis.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Delinquency & NPA Ranked Watchlist</CardTitle>
                <CardDescription className="text-xs">Prioritized by total overdue balance</CardDescription>
              </div>
              <ExportDropdown
                filename={`delinquency_npa_${today}`}
                sheetName="Delinquency NPA"
                headers={delinquencyData.headers}
                rows={delinquencyData.rows}
              />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Customer</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Mobile</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Area / City</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Overdue EMIs</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Oldest Due Date</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Total Overdue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {delinquentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        Excellent! Zero overdue borrowers in the portfolio.
                      </td>
                    </tr>
                  ) : (
                    delinquentCustomers.map((d) => (
                      <tr key={d.customer.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5">
                          <span className="font-semibold text-foreground">{d.customer.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground ml-2">({d.customer.id})</span>
                        </td>
                        <td className="p-2.5 font-mono">{d.customer.mobile}</td>
                        <td className="p-2.5 text-muted-foreground">{d.customer.address.area}, {d.customer.address.city}</td>
                        <td className="p-2.5 font-mono font-semibold text-destructive">{d.overdueCount} EMIs</td>
                        <td className="p-2.5">{fmtDate(d.oldestDueDate)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-destructive">{inr(d.overdueTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                    <td colSpan={5} className="p-2.5 text-right uppercase text-[10px] tracking-wide">
                      Total Delinquent Amount (PAR):
                    </td>
                    <td className="p-2.5 text-right font-mono text-destructive text-sm">
                      {inr(totalDelinquentAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: EMI REGISTER */}
        {/* ==================================================================== */}
        <TabsContent value="emis" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Scheduled EMI Installment Register</CardTitle>
                <CardDescription className="text-xs">Individual installment status and payment tracking ({filteredEmis.length} records)</CardDescription>
              </div>
              <ExportDropdown
                filename={`emi_register_${fromDate}_to_${toDate}`}
                sheetName="EMI Register"
                headers={emisData.headers}
                rows={emisData.rows}
              />
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">EMI ID</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Due Date</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Loan</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Customer</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Amount</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Paid</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Balance</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEmis.slice(0, 100).map((e) => {
                    const c = customers.find((cust) => cust.id === e.customerId);
                    return (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-mono text-[10px] text-muted-foreground">{e.id}</td>
                        <td className="p-2.5">{fmtDate(e.dueDate)}</td>
                        <td className="p-2.5 font-mono text-[10px]">{e.loanId} #{e.emiNo}</td>
                        <td className="p-2.5 font-medium">{c?.name}</td>
                        <td className="p-2.5 text-right font-mono">{inr(e.amount)}</td>
                        <td className="p-2.5 text-right font-mono text-emerald-600">{inr(e.paid)}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{inr(Math.max(0, e.amount - e.paid))}</td>
                        <td className="p-2.5"><StatusBadge status={e.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                    <td colSpan={4} className="p-2.5 text-right uppercase text-[10px] tracking-wide">
                      Total for {filteredEmis.length} EMIs:
                    </td>
                    <td className="p-2.5 text-right font-mono">{inr(totalEmiDueAmount)}</td>
                    <td className="p-2.5 text-right font-mono text-emerald-600">{inr(totalEmiPaidAmount)}</td>
                    <td className="p-2.5 text-right font-mono">{inr(totalEmiRemaining)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB: EARLY CLOSURES REPORT (User Req A10) */}
        {/* ==================================================================== */}
        <TabsContent value="early_closures" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Closed Early Count</p>
                <p className="text-base font-bold font-mono mt-0.5">{filteredEarlyClosures.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Principal Collected</p>
                <p className="text-base font-bold font-mono text-foreground mt-0.5">{inr(totalEcPrincipal)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Closure Charges</p>
                <p className="text-base font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5">{inr(totalEcCharges)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border bg-purple-500/5 border-purple-500/20">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-purple-700 dark:text-purple-400 font-semibold uppercase">Total Settled</p>
                <p className="text-base font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5">{inr(totalEcSettlement)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase">Future Interest Charged</p>
                <p className="text-base font-bold font-mono text-emerald-600 mt-0.5">₹0 (Waived)</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Early Loan Foreclosure & Settlement Register</CardTitle>
                <CardDescription className="text-xs">
                  Separates principal collected, early closure charges, and waived unearned future interest
                </CardDescription>
              </div>
              <ExportDropdown
                filename={`early_closures_${fromDate}_to_${toDate}`}
                sheetName="Early Closures"
                headers={earlyClosuresData.headers}
                rows={earlyClosuresData.rows}
              />
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Closure Date</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Customer</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Loan ID</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Original Loan</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Outstanding Principal</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Charge %</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Closure Charge</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Future Interest</th>
                    <th className="text-right p-2.5 text-[10px] text-muted-foreground font-medium">Final Amount</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Receipt ID</th>
                    <th className="text-left p-2.5 text-[10px] text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEarlyClosures.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-muted-foreground">
                        No early closure settlements recorded for this filter range.
                      </td>
                    </tr>
                  ) : (
                    filteredEarlyClosures.map((ec) => {
                      const c = customers.find((cust) => cust.id === ec.customerId);
                      return (
                        <tr key={ec.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 font-mono text-[11px]">{fmtDate(ec.closureDate)}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-foreground">{c?.name ?? "—"}</span>
                            <span className="text-[10px] text-muted-foreground font-mono ml-1">({ec.customerId})</span>
                          </td>
                          <td className="p-2.5 font-mono text-[11px]">{ec.loanId}</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">{inr(ec.originalLoanAmount)}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">{inr(ec.outstandingPrincipal)}</td>
                          <td className="p-2.5 text-right font-mono">{ec.earlyClosureChargePercent}%</td>
                          <td className="p-2.5 text-right font-mono text-purple-700 dark:text-purple-400 font-medium">
                            {inr(ec.earlyClosureCharge)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-600 font-medium">₹0</td>
                          <td className="p-2.5 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                            {inr(ec.finalClosureAmount)}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[9px] font-mono">
                              {ec.paymentMethod}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-mono text-[10px]">{ec.receiptId}</td>
                          <td className="p-2.5">
                            <StatusBadge status={ec.status} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredEarlyClosures.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border/80 bg-muted/40 font-bold">
                      <td colSpan={4} className="p-2.5 text-right uppercase text-[10px] tracking-wide">
                        Totals ({filteredEarlyClosures.length} settlements):
                      </td>
                      <td className="p-2.5 text-right font-mono">{inr(totalEcPrincipal)}</td>
                      <td></td>
                      <td className="p-2.5 text-right font-mono text-purple-700 dark:text-purple-400">{inr(totalEcCharges)}</td>
                      <td className="p-2.5 text-right font-mono text-emerald-600">₹0</td>
                      <td className="p-2.5 text-right font-mono text-purple-700 dark:text-purple-400 font-bold">{inr(totalEcSettlement)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
