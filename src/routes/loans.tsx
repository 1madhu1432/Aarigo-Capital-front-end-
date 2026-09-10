import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  Search,
  X,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Calendar,
  RotateCcw,
  Filter,
  Coins,
  Award,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, todayISO, addDays } from "@/lib/format";
import { computeAmortizationSchedule } from "@/utils/amortization";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportDropdown } from "@/components/common/ExportDropdown";

export const Route = createFileRoute("/loans")({
  component: LoansRouteComponent,
});

function LoansRouteComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname !== "/loans" && pathname !== "/loans/";
  if (isChild) {
    return <Outlet />;
  }
  return <LoansPage />;
}

function LoansPage() {
  const { loans, customers, emis, payments } = useStore();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState("active");
  const [printLoan, setPrintLoan] = useState<(typeof loans)[0] | null>(null);
  const [earlyCloseLoan, setEarlyCloseLoan] = useState<(typeof loans)[0] | null>(null);

  const tabFromUrl = useMemo(() => {
    const p = new URLSearchParams(location.searchStr);
    return (p.get("tab") || p.get("status") || "").toLowerCase();
  }, [location.searchStr]);

  useEffect(() => {
    if (tabFromUrl && ["active", "overdue", "closed"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const activeDate = useMemo(() => {
    if (dayFilter === "today") return today;
    if (dayFilter === "yesterday") return addDays(today, -1);
    if (dayFilter === "custom") return selectedDate;
    return null;
  }, [dayFilter, today, selectedDate]);

  const filtered = useMemo(() => {
    let result = loans;
    if (frequencyFilter !== "all") {
      result = result.filter((l) => l.frequency === frequencyFilter);
    }
    if (activeDate) {
      result = result.filter((l) => {
        const matchesStart = l.startDate === activeDate;
        const matchesEmiDue = emis.some((e) => e.loanId === l.id && e.dueDate === activeDate);
        const matchesPayment = payments.some((p) => p.loanId === l.id && p.date.slice(0, 10) === activeDate && !p.reversed);
        return matchesStart || matchesEmiDue || matchesPayment;
      });
    }
    if (!query) return result;
    const q = query.toLowerCase();
    return result.filter((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      const matchesQ =
        l.id.toLowerCase().includes(q) ||
        (c?.name ?? "").toLowerCase().includes(q) ||
        l.customerId.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [loans, customers, emis, payments, query, frequencyFilter, activeDate]);

  const loanMetrics = useMemo(() => {
    let totalPrincipal = 0;
    let totalNetDisbursed = 0;
    let totalPrincipalPaid = 0;
    let totalPrincipalPending = 0;
    let totalEmiPaid = 0;
    let totalEmiPending = 0;
    let totalPaidEmisCount = 0;
    let totalPendingEmisCount = 0;

    filtered.forEach((l) => {
      const isClosedEarly = l.status === "Closed Early" || Boolean(l.earlyClosure);
      const sched = computeAmortizationSchedule(l, emis, payments);
      const loanEmis = emis.filter((e) => e.loanId === l.id);
      const loanPayments = payments.filter((p) => p.loanId === l.id && !p.reversed);

      const pPaid = isClosedEarly ? l.principal : (sched?.totalPrincipalPaid ?? 0);
      const pPend = isClosedEarly ? 0 : Math.max(0, l.principal - pPaid);
      const ePaid = loanPayments.reduce((s, p) => s + p.amount, 0);
      const ePend = isClosedEarly ? 0 : Math.max(0, l.totalPayable - ePaid);

      totalPrincipal += l.principal;
      totalNetDisbursed += Math.max(0, l.principal - (l.processingFee ?? 0) - (l.insurance ?? 0));
      totalPrincipalPaid += pPaid;
      totalPrincipalPending += pPend;
      totalEmiPaid += ePaid;
      totalEmiPending += ePend;

      totalPaidEmisCount += loanEmis.filter((e) => e.status === "Paid").length;
      totalPendingEmisCount += loanEmis.filter((e) => e.status !== "Paid").length;
    });

    const principalPaidPct = totalPrincipal > 0 ? Math.min(100, Math.round((totalPrincipalPaid / totalPrincipal) * 100)) : 0;

    return {
      totalPrincipal,
      totalNetDisbursed,
      totalPrincipalPaid,
      totalPrincipalPending,
      totalEmiPaid,
      totalEmiPending,
      totalPaidEmisCount,
      totalPendingEmisCount,
      principalPaidPct,
    };
  }, [filtered, emis, payments]);

  const byStatus = {
    active: filtered.filter((l) => l.status === "Active"),
    overdue: filtered.filter((l) => l.status === "Overdue"),
    closed: filtered.filter((l) => l.status === "Closed" || l.status === "Closed Early"),
  };

  const loansExportData = useMemo(() => {
    const headers = [
      "Loan ID",
      "Account ID",
      "Customer ID",
      "Customer Name",
      "Status",
      "Sanctioned Principal",
      "Processing Fee",
      "Insurance",
      "Net Disbursed",
      "Frequency",
      "Tenure",
      "Interest Rate (%)",
      "Interest Method",
      "Start Date",
      "Total EMIs",
      "Paid EMIs",
      "Total Paid Amount",
      "Disbursement Method",
    ];

    const currentList =
      activeTab === "all"
        ? filtered
        : activeTab in byStatus
          ? byStatus[activeTab as keyof typeof byStatus]
          : filtered;

    const rows = currentList.map((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      const loanEmis = emis.filter((e) => e.loanId === l.id);
      const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
      const loanPayments = payments.filter((p) => p.loanId === l.id && !p.reversed);
      const totalPaid = loanPayments.reduce((s, p) => s + p.amount, 0);
      const netDisbursed = Math.max(0, l.principal - (l.processingFee || 0) - (l.insurance || 0));

      return [
        l.id,
        l.accountId,
        l.customerId,
        c?.name ?? "—",
        l.status,
        l.principal,
        l.processingFee || 0,
        l.insurance || 0,
        netDisbursed,
        l.frequency,
        l.tenure,
        l.interestRate,
        l.interestMethod,
        fmtDate(l.startDate),
        loanEmis.length,
        paidEmis,
        totalPaid,
        l.disbursementMethod || "Cash",
      ];
    });

    return { headers, rows };
  }, [filtered, byStatus, activeTab, customers, emis, payments]);

  const LoanRow = ({ loan }: { loan: (typeof loans)[0] }) => {
    const cust = customers.find((c) => c.id === loan.customerId);
    const loanEmis = emis.filter((e) => e.loanId === loan.id);
    const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
    const totalPaid = payments.filter((p) => p.loanId === loan.id && !p.reversed).reduce((s, p) => s + p.amount, 0);
    const isClosedEarly = loan.status === "Closed Early" || Boolean(loan.earlyClosure);
    const outstanding = isClosedEarly ? 0 : Math.max(0, loan.totalPayable - totalPaid);
    const progress = isClosedEarly ? 100 : loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
    const nextEmi = loanEmis.find((e) => e.status !== "Paid" && e.status !== "Partial" && e.status !== "Cancelled");
    const canEarlyClose = loan.status !== "Closed" && !isClosedEarly && outstanding > 0;

    return (
      <div
        className="p-4 hover:bg-muted/30 cursor-pointer transition-colors group"
        onClick={() => void navigate({ to: "/loans/$id", params: { id: loan.id } })}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {cust && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: `hsl(${cust.photoHue}, 65%, 45%)` }}
              >
                {cust.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {cust?.name ?? "Unknown"}
                </span>
                <StatusBadge status={loan.status} />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {loan.id} • {cust?.id} • {loan.frequency}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Principal</p>
              <p className="font-mono font-medium">{inr(loan.principal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">EMI</p>
              <p className="font-mono font-medium">{inr(loan.emiAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Paid</p>
              <p className="font-mono font-medium text-emerald-600">{inr(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Outstanding</p>
              <p className={`font-mono font-bold ${outstanding > 0 ? "text-foreground" : "text-emerald-600"}`}>
                {inr(outstanding)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {isClosedEarly ? "Foreclosed" : `${paidEmis}/${loanEmis.length} EMIs`}
            </span>
            {nextEmi && !isClosedEarly && (
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                Next: {fmtDate(nextEmi.dueDate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              title="Print EMI Schedule"
              onClick={() => setPrintLoan(loan)}
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-primary" />
              <span className="hidden md:inline">Print</span>
            </Button>

            {canEarlyClose && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
                title="Early Close Loan"
                onClick={() => setEarlyCloseLoan(loan)}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                <span className="hidden md:inline">Early Close</span>
              </Button>
            )}

            {(loan.status === "Closed" || isClosedEarly) && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                title="View No Objection Certificate (NOC)"
                onClick={() => void navigate({ to: "/documents", search: { tab: "noc", query: loan.id } })}
              >
                <Award className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                <span className="hidden md:inline">NOC</span>
              </Button>
            )}

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors ml-1" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Loan Portfolio</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage all active, overdue, and closed loan contracts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs font-semibold">
              {byStatus.active.length} Active
            </Badge>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
              {byStatus.overdue.length} Overdue
            </Badge>
          </div>
          <ExportDropdown
            label="Export Loans"
            filename={`loans_portfolio_${activeTab}_${today}`}
            sheetName="Loans Portfolio"
            headers={loansExportData.headers}
            rows={loansExportData.rows}
          />
          <Button
            size="sm"
            className="text-xs h-9 cursor-pointer"
            onClick={() => void navigate({ to: "/loans/new" })}
          >
            + New Loan
          </Button>
        </div>
      </div>

      {/* Search, Day & Frequency Filter */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by loan ID, customer name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day / All Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Day:</span>
            <div className="inline-flex rounded-md border border-border/80 p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setDayFilter("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  dayFilter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setDayFilter("today");
                  setSelectedDate(today);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  dayFilter === "today" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setDayFilter("yesterday");
                  setSelectedDate(addDays(today, -1));
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  dayFilter === "yesterday" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yesterday
              </button>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                  setDayFilter("custom");
                }
              }}
              className="h-9 text-xs w-36"
            />
            {dayFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDayFilter("all")}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear day filter"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Frequency:</span>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Frequencies</SelectItem>
                <SelectItem value="Daily" className="text-xs">Daily (Day)</SelectItem>
                <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Primary Loan & Recovery Metric Cards (Filtered by Day & All) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Loan Amount */}
        <Card className="shadow-xs border-border/80 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {dayFilter === "all" ? "Total Portfolio" : `Disbursed / Due`}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                {filtered.length} Loans
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{inr(loanMetrics.totalPrincipal)}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50">
              <span>Net Disbursed:</span>
              <span className="font-mono font-semibold text-foreground">{inr(loanMetrics.totalNetDisbursed)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Principal Paid */}
        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Principal Paid
              </span>
              <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {loanMetrics.principalPaidPct}% Settled
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{inr(loanMetrics.totalPrincipalPaid)}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50">
              <span>Status:</span>
              <span className="font-semibold text-emerald-600">Principal recovered</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Principal Pending */}
        <Card className={`shadow-xs bg-gradient-to-br from-card ${loanMetrics.totalPrincipalPending > 0 ? "border-amber-500/40 to-amber-500/5" : "border-border/80"}`}>
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${loanMetrics.totalPrincipalPending > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                Principal Pending
              </span>
              <Badge variant="outline" className={`text-[9px] font-bold ${loanMetrics.totalPrincipalPending > 0 ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10" : "border-border text-muted-foreground"}`}>
                {100 - loanMetrics.principalPaidPct}% Left
              </Badge>
            </div>
            <p className={`text-xl font-bold font-mono mt-1 ${loanMetrics.totalPrincipalPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
              {inr(loanMetrics.totalPrincipalPending)}
            </p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50">
              <span>Status:</span>
              <span className="font-semibold text-foreground">Outstanding balance</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: EMI Amount Paid */}
        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                EMI Amount Paid
              </span>
              <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {loanMetrics.totalPaidEmisCount} EMIs
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{inr(loanMetrics.totalEmiPaid)}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50">
              <span>Collection:</span>
              <span className="font-semibold text-emerald-600">Total EMI received</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: EMI Amount Pending */}
        <Card className={`shadow-xs bg-gradient-to-br from-card ${loanMetrics.totalEmiPending > 0 ? "border-amber-500/40 to-amber-500/5" : "border-border/80"}`}>
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${loanMetrics.totalEmiPending > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                EMI Amount Pending
              </span>
              <Badge variant="outline" className={`text-[9px] font-bold ${loanMetrics.totalEmiPending > 0 ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10" : "border-border text-muted-foreground"}`}>
                {loanMetrics.totalPendingEmisCount} EMIs
              </Badge>
            </div>
            <p className={`text-xl font-bold font-mono mt-1 ${loanMetrics.totalEmiPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
              {inr(loanMetrics.totalEmiPending)}
            </p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/50">
              <span>Payable:</span>
              <span className="font-semibold text-foreground">Total remaining</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Active ({byStatus.active.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue ({byStatus.overdue.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Closed ({byStatus.closed.length})
          </TabsTrigger>
        </TabsList>

        {(["active", "overdue", "closed"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="m-0">
            <Card className="shadow-xs border-border">
              <CardContent className="p-0 divide-y divide-border/60">
                {byStatus[tab].length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title={`No ${tab} loans`}
                    description={query ? `No ${tab} loans match your search.` : `All ${tab} loans will appear here.`}
                    className="py-12"
                  />
                ) : (
                  byStatus[tab].map((loan) => <LoanRow key={loan.id} loan={loan} />)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Early Close Dialog */}
      <EarlyCloseDialog
        loan={earlyCloseLoan}
        customer={customers.find((c) => c.id === earlyCloseLoan?.customerId)}
        open={Boolean(earlyCloseLoan)}
        onOpenChange={(open) => {
          if (!open) setEarlyCloseLoan(null);
        }}
      />

      {/* Print EMI Schedule Modal */}
      <EmiSchedulePrintModal
        loan={printLoan}
        customer={customers.find((c) => c.id === printLoan?.customerId)}
        open={Boolean(printLoan)}
        onOpenChange={(open) => {
          if (!open) setPrintLoan(null);
        }}
      />
    </div>
  );
}
