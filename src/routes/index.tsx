import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Users,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  UserPlus,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Calendar,
  Receipt as ReceiptIcon,
  ShieldAlert,
  Phone,
  MessageCircle,
  FileSpreadsheet,
  Footprints,
  Coins,
  Percent,
  Filter,
  RotateCcw,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, inrShort, fmtDate, fmtDateTime, addDays } from "@/lib/format";
import { computeAmortizationSchedule, calculateLateFee } from "@/utils/amortization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { customers, loans, emis, payments, visits, today, settings } = useStore();
  const navigate = useNavigate();

  // Day & Frequency Filter state: 'all' or specific ISO date string
  const [selectedDay, setSelectedDay] = useState<string | "all">(today);
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  // Filtered dataset according to selected repayment frequency
  const filteredLoans = useMemo(() => {
    if (frequencyFilter === "all") return loans;
    return loans.filter((l) => l.frequency === frequencyFilter);
  }, [loans, frequencyFilter]);

  const filteredLoanIds = useMemo(() => new Set(filteredLoans.map((l) => l.id)), [filteredLoans]);

  const filteredEmis = useMemo(() => {
    if (frequencyFilter === "all") return emis;
    return emis.filter((e) => filteredLoanIds.has(e.loanId));
  }, [emis, filteredLoanIds]);

  const filteredPayments = useMemo(() => {
    if (frequencyFilter === "all") return payments;
    return payments.filter((p) => filteredLoanIds.has(p.loanId));
  }, [payments, filteredLoanIds]);

  // Financial calculations on filtered dataset
  const activeLoans = useMemo(() => filteredLoans.filter((l) => l.status === "Active"), [filteredLoans]);
  const overdueLoans = useMemo(() => filteredLoans.filter((l) => l.status === "Overdue"), [filteredLoans]);
  
  const portfolioOutstanding = useMemo(() => {
    let principal = 0;
    let interest = 0;
    let total = 0;

    filteredLoans
      .filter((l) => l.status !== "Closed" && l.status !== "Closed Early")
      .forEach((l) => {
        const sched = computeAmortizationSchedule(l, emis, payments);
        const remP = Math.max(0, l.principal - sched.totalPrincipalPaid);
        const loanEmis = emis.filter((e) => e.loanId === l.id);
        const loanTotalRem = loanEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
        const remI = Math.max(0, loanTotalRem - remP);

        principal += remP;
        interest += remI;
        total += loanTotalRem;
      });

    return {
      principal,
      interest,
      total,
    };
  }, [filteredLoans, emis, payments]);

  const totalOutstanding = portfolioOutstanding.total;

  // Day calculations (support 'all' and day-wise)
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

  const dueSelectedDayEmis = useMemo(() => {
    if (isAll) return filteredEmis;
    return filteredEmis.filter((e) => e.dueDate === selectedDay);
  }, [filteredEmis, selectedDay, isAll]);

  const totalDueSelectedDay = useMemo(
    () => dueSelectedDayEmis.reduce((sum, e) => sum + e.amount, 0),
    [dueSelectedDayEmis]
  );

  const selectedDayPayments = useMemo(() => {
    if (isAll) return filteredPayments.filter((p) => !p.reversed);
    return filteredPayments.filter((p) => p.date.slice(0, 10) === selectedDay && !p.reversed);
  }, [filteredPayments, selectedDay, isAll]);

  const totalCollectedSelectedDay = useMemo(
    () => selectedDayPayments.reduce((sum, p) => sum + p.amount, 0),
    [selectedDayPayments]
  );

  const pendingSelectedDay = isAll
    ? filteredEmis.reduce((sum, e) => sum + Math.max(0, e.amount - e.paid), 0)
    : Math.max(0, totalDueSelectedDay - totalCollectedSelectedDay);

  // Month-to-date calculation for selected day's month
  const currentMonthPrefix = (isAll ? today : selectedDay).slice(0, 7);
  const monthPayments = useMemo(
    () => filteredPayments.filter((p) => p.date.slice(0, 7) === currentMonthPrefix && !p.reversed),
    [filteredPayments, currentMonthPrefix]
  );
  const totalCollectedMonth = useMemo(
    () => monthPayments.reduce((sum, p) => sum + p.amount, 0),
    [monthPayments]
  );

  const overdueEmis = useMemo(() => filteredEmis.filter((e) => e.status === "Overdue"), [filteredEmis]);
  const totalOverdueAmount = useMemo(
    () => overdueEmis.reduce((sum, e) => sum + (e.amount - e.paid), 0),
    [overdueEmis]
  );

  const totalAccruedLateFees = useMemo(() => {
    const nowIso = new Date().toISOString();
    return overdueEmis.reduce((sum, e) => {
      const lateCalc = calculateLateFee(e.dueDate, nowIso, settings, e.lateFeeWaived, 1);
      return sum + lateCalc.lateFeeAmount;
    }, 0);
  }, [overdueEmis, settings]);

  const collectionPct =
    totalDueSelectedDay > 0 ? Math.min(100, Math.round((totalCollectedSelectedDay / totalDueSelectedDay) * 100)) : 0;

  // Overdue customers ranked
  const topOverdueBorrowers = useMemo(() => {
    const map = new Map<string, { customer: (typeof customers)[0]; overdueCount: number; overdueTotal: number; lateFeeTotal: number; loanId: string }>();
    const nowIso = new Date().toISOString();
    overdueEmis.forEach((e) => {
      const c = customers.find((cust) => cust.id === e.customerId);
      if (!c) return;
      const existing = map.get(c.id) ?? { customer: c, overdueCount: 0, overdueTotal: 0, lateFeeTotal: 0, loanId: e.loanId };
      existing.overdueCount += 1;
      existing.overdueTotal += (e.amount - e.paid);
      const lateCalc = calculateLateFee(e.dueDate, nowIso, settings, e.lateFeeWaived, 1);
      existing.lateFeeTotal += lateCalc.lateFeeAmount;
      map.set(c.id, existing);
    });
    return Array.from(map.values()).sort((a, b) => (b.overdueTotal + b.lateFeeTotal) - (a.overdueTotal + a.lateFeeTotal)).slice(0, 4);
  }, [overdueEmis, customers, settings]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Aarigo Capital – Executive Operations Hub
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Real-time portfolio metrics, daily recovery progress, and field operations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => void navigate({
              to: "/collection",
              search: {
                day: selectedDay,
                frequency: frequencyFilter !== "all" ? frequencyFilter : undefined,
              },
            })}
            className="text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
          >
            <Banknote className="h-4 w-4 mr-1.5" />
            Collect EMI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/customers" })}
            className="text-xs h-9 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Customer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigate({ to: "/loans/new" })}
            className="text-xs h-9 cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            New Loan
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void navigate({
              to: "/visits",
              search: { date: selectedDay },
            })}
            className="text-xs h-9 cursor-pointer"
          >
            <Footprints className="h-3.5 w-3.5 mr-1.5" />
            Field Visits
          </Button>
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Repayment Frequency:</span>
          </div>
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="h-8 text-xs w-[145px] bg-background">
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

      {/* Overdue Warning Alert if any */}
      {overdueEmis.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive gap-2">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">{overdueEmis.length} Overdue EMIs</span> totaling{" "}
              <span className="font-bold">{inr(totalOverdueAmount)}</span> across {overdueLoans.length} loans require field follow-up.
            </div>
          </div>
          <Link
            to="/emi"
            className="font-semibold underline hover:text-destructive/80 text-[11px] shrink-0 self-end sm:self-center"
          >
            Manage Overdue EMIs &rarr;
          </Link>
        </div>
      )}

      {/* 10 Comprehensive Operations & Portfolio KPI Cards */}
      <div className="space-y-3 md:space-y-4">
        {/* Row 1: Daily Recovery Operations */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* KPI 1: Day's Collection */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isToday ? "Today's Collected" : `${dayNameLabel} Collected`}
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground font-mono">
                {inr(totalCollectedSelectedDay)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5">
                <span>Target: {inr(totalDueSelectedDay)}</span>
                <span className="font-semibold text-emerald-600">{collectionPct}%</span>
              </div>
              <Progress value={collectionPct} className="h-1.5 mt-1.5 bg-muted" />
            </CardContent>
          </Card>

          {/* KPI 2: Day's Due */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isToday ? "Today's Due" : `${dayNameLabel} Due`}
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground font-mono">
                {inr(totalDueSelectedDay)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Across <span className="font-semibold text-foreground">{dueSelectedDayEmis.length}</span> borrower EMIs
              </p>
            </CardContent>
          </Card>

          {/* KPI 3: Pending for Day */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {isToday ? "Pending Today" : `Pending (${dayNameLabel})`}
              </CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
                <Calendar className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground font-mono">
                {inr(pendingSelectedDay)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isToday ? "Remaining to reach target" : `Uncollected for ${dayNameLabel}`}
              </p>
            </CardContent>
          </Card>

          {/* KPI 4: Month's Collection */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Month Collection</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-2xl font-bold tracking-tight text-foreground font-mono">
                {inr(totalCollectedMonth)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {monthPayments.length} receipts in {new Date(selectedDay).toLocaleDateString("en-IN", { month: "short" })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Portfolio Outstanding & Risk Exposure */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {/* KPI 5: Total Portfolio Outstanding */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Outstanding</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CreditCard className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-foreground font-mono">
                {inr(portfolioOutstanding.total)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Active principal + interest
              </p>
            </CardContent>
          </Card>

          {/* KPI 6: Outstanding Principal */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding Principal</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Coins className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono">
                {inr(portfolioOutstanding.principal)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Active principal to recover
              </p>
            </CardContent>
          </Card>

          {/* KPI 7: Outstanding Interest */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding Interest</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Percent className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
                {inr(portfolioOutstanding.interest)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Scheduled interest receivables
              </p>
            </CardContent>
          </Card>

          {/* KPI 8: Overdue Risk */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Overdue Risk</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-destructive font-mono">
                {inr(totalOverdueAmount + totalAccruedLateFees)}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                <span className="font-semibold text-destructive">{overdueLoans.length}</span> overdue contracts
                {totalAccruedLateFees > 0 && (
                  <span className="block text-[10px] text-destructive/80 font-medium">
                    (incl. {inr(totalAccruedLateFees)} late fees)
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          {/* KPI 9: Active Loans */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active Loans</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-foreground font-mono">
                {activeLoans.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Of {loans.length} total disbursed
              </p>
            </CardContent>
          </Card>

          {/* KPI 10: Total Customers */}
          <Card className="shadow-xs border-border/70 hover:border-border transition-colors">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Customers</CardTitle>
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/10 text-teal-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg md:text-xl font-bold tracking-tight text-foreground font-mono">
                {customers.length}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {customers.filter((c) => c.status === "Active").length} active accounts
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Grid: Today's Due Table + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's EMIs needing collection */}
        <Card className="lg:col-span-2 shadow-xs border-border">
          <CardHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm md:text-base font-semibold">
                {isAll ? "All Scheduled EMIs" : isToday ? "Today's EMIs to Collect" : `EMIs to Collect (${dayNameLabel})`}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {isAll
                  ? `Borrowers with scheduled repayments across all dates`
                  : `Borrowers with repayments scheduled for ${isToday ? "today" : dayNameLabel} (${fmtDate(selectedDay)})`}
                {frequencyFilter !== "all" && ` • ${frequencyFilter} loans only`}
              </CardDescription>
            </div>
            <Link to="/emi" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {dueSelectedDayEmis.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {isAll ? "No EMIs found in portfolio." : `No EMIs are due on ${isToday ? "today" : dayNameLabel} (${fmtDate(selectedDay)}).`}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {dueSelectedDayEmis.slice(0, 8).map((e) => {
                  const customer = customers.find((c) => c.id === e.customerId);
                  const isPaid = e.status === "Paid";
                  const isPartial = e.status === "Partial";

                  return (
                    <div
                      key={e.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: `hsl(${customer?.photoHue ?? 200}, 65%, 45%)` }}
                        >
                          {customer?.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{customer?.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">({e.loanId})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>EMI #{e.emiNo}</span>
                            <span>•</span>
                            <span>{customer?.address.area}, {customer?.address.city}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                        <div className="text-right">
                          <div className="text-xs font-bold font-mono text-foreground">
                            {inr(e.amount)}
                          </div>
                          {isPartial && (
                            <div className="text-[10px] text-emerald-600 font-medium">
                              Paid {inr(e.paid)} • Rem {inr(e.amount - e.paid)}
                            </div>
                          )}
                        </div>

                        <Badge
                          variant={
                            isPaid ? "default" : isPartial ? "secondary" : "outline"
                          }
                          className={
                            isPaid
                              ? "bg-emerald-600 text-white text-[10px]"
                              : isPartial
                              ? "bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {e.status}
                        </Badge>

                        {!isPaid && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => void navigate({
                              to: "/collection",
                              search: {
                                customerId: customer?.id,
                                loanId: e.loanId,
                                emiId: e.id,
                                day: selectedDay,
                              },
                            })}
                            className="h-7 text-[11px] px-2.5 cursor-pointer"
                          >
                            Collect
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

        {/* Right 1 Col: Recent Payments Log */}
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm md:text-base font-semibold">Recent Receipts</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Latest verified collections
              </CardDescription>
            </div>
            <Link to="/receipts" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No payments recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {payments.slice(0, 5).map((p) => {
                  const customer = customers.find((c) => c.id === p.customerId);
                  return (
                    <div key={p.id} className="p-3.5 text-xs hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{customer?.name}</span>
                        <span className="font-bold font-mono text-emerald-600">+{inr(p.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                        <span className="font-mono text-[10px]">{p.receiptId}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {p.method}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 mt-1">
                        {fmtDateTime(p.date)} • Collected by {p.collectedBy}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* High-Risk Delinquency Intervention Table */}
      {topOverdueBorrowers.length > 0 && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-border/60">
            <div>
              <CardTitle className="text-sm md:text-base font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Priority Delinquency Follow-Up
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Borrowers requiring immediate recovery officer contact or home visit
              </CardDescription>
            </div>
            <Link to="/emi" className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
              View All Overdue <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {topOverdueBorrowers.map((item) => (
                <div
                  key={item.customer.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-muted/40 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: `hsl(${item.customer.photoHue ?? 0}, 65%, 45%)` }}
                    >
                      {item.customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{item.customer.name}</span>
                        <Badge variant="destructive" className="text-[10px]">
                          {item.overdueCount} Overdue EMIs
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.customer.address.area}, {item.customer.address.city} • Loan {item.loanId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pl-12 sm:pl-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-destructive text-sm">
                        {inr(item.overdueTotal + item.lateFeeTotal)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.lateFeeTotal > 0 ? (
                          <span>Due {inr(item.overdueTotal)} + Fee {inr(item.lateFeeTotal)}</span>
                        ) : (
                          "Total Default"
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${item.customer.mobile}`}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-muted text-foreground transition-colors"
                        title="Call Borrower"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary" />
                      </a>
                      <a
                        href={`https://wa.me/91${item.customer.mobile}?text=${encodeURIComponent(`Dear ${item.customer.name}, your loan payment of ${inr(item.overdueTotal + item.lateFeeTotal)} (overdue EMI + late charges) is pending. Kindly clear it at the earliest.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-muted text-foreground transition-colors"
                        title="WhatsApp Notice"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </a>
                      <Button
                        size="sm"
                        onClick={() => void navigate({
                          to: "/collection",
                          search: {
                            customerId: item.customer.id,
                            loanId: item.loanId,
                            day: selectedDay,
                          },
                        })}
                        className="h-8 text-xs cursor-pointer px-2.5"
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
