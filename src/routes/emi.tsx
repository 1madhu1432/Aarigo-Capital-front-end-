import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Clock, Search, X, Banknote, AlertTriangle, CheckCircle2, Calendar, RotateCcw, ShieldCheck } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, todayISO, daysBetween, addDays } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateLateFee } from "@/utils/amortization";
import { ExportDropdown } from "@/components/common/ExportDropdown";

export const Route = createFileRoute("/emi")({
  component: EmiPage,
});

function EmiPage() {
  const { emis, customers, loans, settings } = useStore();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState<"all" | "today" | "yesterday" | "tomorrow" | "custom">("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [activeTab, setActiveTab] = useState("due-today");

  const tabFromUrl = useMemo(() => {
    const p = new URLSearchParams(location.searchStr);
    const raw = (p.get("tab") || p.get("status") || "").toLowerCase();
    if (raw === "today" || raw === "due" || raw === "due-today") return "due-today";
    if (raw === "overdue") return "overdue";
    if (raw === "pending" || raw === "partial") return "partial";
    if (raw === "upcoming") return "upcoming";
    if (raw === "paid") return "paid";
    if (raw === "closed-early" || raw === "cancelled" || raw === "closed") return "closed-early";
    return null;
  }, [location.searchStr]);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const activeDate = useMemo(() => {
    if (dayFilter === "today") return today;
    if (dayFilter === "yesterday") return addDays(today, -1);
    if (dayFilter === "tomorrow") return addDays(today, 1);
    if (dayFilter === "custom") return selectedDate;
    return null;
  }, [dayFilter, today, selectedDate]);

  const emiWithData = useMemo(() =>
    emis.map((e) => {
      const cust = customers.find((c) => c.id === e.customerId);
      const loan = loans.find((l) => l.id === e.loanId);
      const isClosedEarly = loan?.status === "Closed Early" || Boolean(loan?.earlyClosure);
      const isClosed = loan?.status === "Closed" || isClosedEarly;
      const isCancelled = e.status === "Cancelled" || (isClosed && e.status !== "Paid" && e.paid < e.amount);
      return { e, cust, loan, isClosedEarly, isClosed, isCancelled };
    }),
    [emis, customers, loans]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return emiWithData.filter(({ e, cust, loan }) => {
      if (frequencyFilter !== "all" && loan?.frequency !== frequencyFilter) return false;
      if (activeDate && e.dueDate !== activeDate) return false;
      if (!q) return true;
      return (
        e.id.toLowerCase().includes(q) ||
        e.loanId.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.id.toLowerCase().includes(q) ||
        false
      );
    });
  }, [emiWithData, query, frequencyFilter, activeDate]);

  const byTab = {
    "due-today": filtered.filter(({ e, isCancelled, isClosed }) => {
      if (isCancelled || isClosed) return false;
      const targetDate = activeDate ?? today;
      return e.dueDate === targetDate && e.paid < e.amount;
    }),
    upcoming: filtered.filter(({ e, isCancelled, isClosed }) => {
      if (isCancelled || isClosed) return false;
      return e.status === "Upcoming";
    }),
    partial: filtered.filter(({ e, isCancelled, isClosed }) => {
      if (isCancelled || isClosed) return false;
      return e.status === "Partial";
    }),
    overdue: filtered.filter(({ e, isCancelled, isClosed }) => {
      if (isCancelled || isClosed) return false;
      return e.status === "Overdue";
    }),
    paid: filtered.filter(({ e }) => e.status === "Paid" || e.paid >= e.amount),
    "closed-early": filtered.filter(({ isCancelled }) => isCancelled),
  };

  // Active scheduled EMIs (excludes cancelled EMIs from foreclosed/closed loans)
  const activeScheduledEmis = useMemo(
    () => filtered.filter(({ isCancelled }) => !isCancelled),
    [filtered]
  );

  // Summary KPI calculations for current filter (Day vs All)
  // Total Scheduled Amount = only active/payable schedules + paid amounts
  const filteredTotalAmount = useMemo(() => activeScheduledEmis.reduce((s, { e }) => s + e.amount, 0), [activeScheduledEmis]);
  const filteredPaidAmount = useMemo(() => filtered.reduce((s, { e }) => s + e.paid, 0), [filtered]);

  // Pending Amount = ONLY payable on active, uncancelled EMIs (₹0 for early-closed loans)
  const filteredPendingAmount = useMemo(
    () => activeScheduledEmis.reduce((s, { e, isClosed }) => {
      if (isClosed) return s;
      return s + Math.max(0, e.amount - e.paid);
    }, 0),
    [activeScheduledEmis]
  );
  const filteredOverdueAmount = useMemo(
    () => activeScheduledEmis.filter(({ e }) => e.status === "Overdue").reduce((s, { e }) => s + Math.max(0, e.amount - e.paid), 0),
    [activeScheduledEmis]
  );
  const filteredPaidCount = useMemo(() => filtered.filter(({ e }) => e.status === "Paid" || e.paid >= e.amount).length, [filtered]);
  const filteredPendingCount = useMemo(
    () => activeScheduledEmis.filter(({ e, isClosed }) => !isClosed && e.status !== "Paid" && e.paid < e.amount).length,
    [activeScheduledEmis]
  );
  const filteredOverdueCount = useMemo(() => activeScheduledEmis.filter(({ e }) => e.status === "Overdue").length, [activeScheduledEmis]);
  const filteredCollectionRate = filteredTotalAmount > 0
    ? Math.min(100, Math.round((filteredPaidAmount / filteredTotalAmount) * 100))
    : filteredPaidAmount > 0 ? 100 : 0;

  const totalOverdueLateFees = useMemo(() => {
    return byTab.overdue.reduce((sum, { e }) => {
      const calc = calculateLateFee(e.dueDate, today, settings, Boolean(e.lateFeeWaived), 1);
      return sum + calc.lateFeeAmount;
    }, 0);
  }, [byTab.overdue, today, settings]);

  const EmiRow = ({ e, cust, loan, isClosedEarly, isClosed, isCancelled }: (typeof emiWithData)[0]) => {
    const remaining = isCancelled || isClosed ? 0 : Math.max(0, e.amount - e.paid);
    const isPastDue = !isCancelled && !isClosed && (e.status === "Overdue" || ((e.status === "Partial" || e.status === "Due") && e.dueDate < today));
    const minDays = e.status === "Overdue" ? 1 : 0;
    const daysOverdue = isPastDue ? Math.max(minDays, daysBetween(e.dueDate, today)) : 0;
    const lateFeeCalc = isPastDue
      ? calculateLateFee(e.dueDate, today, settings, Boolean(e.lateFeeWaived), minDays)
      : null;
    const lateFeeAmount = lateFeeCalc?.lateFeeAmount ?? 0;
    const totalDue = remaining + lateFeeAmount;

    return (
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.id}</td>
        <td className="p-3">
          <div>
            <div className="font-semibold text-foreground text-xs">{cust?.name}</div>
            <div className="text-[10px] font-mono text-muted-foreground">{cust?.id}</div>
          </div>
        </td>
        <td className="p-3 font-mono text-[10px]">{e.loanId}</td>
        <td className="p-3 text-center text-xs">{e.emiNo}</td>
        <td className="p-3 whitespace-nowrap text-xs">
          <div className={isPastDue ? "text-destructive font-medium" : isCancelled ? "text-muted-foreground line-through opacity-70" : ""}>
            {fmtDate(e.dueDate)}
          </div>
          {daysOverdue > 0 && (
            <div className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
              <span>{daysOverdue}d overdue</span>
              {lateFeeAmount > 0 && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                  +{inr(lateFeeAmount)} fee
                </Badge>
              )}
            </div>
          )}
          {isCancelled && (
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Settled early
            </div>
          )}
        </td>
        <td className="p-3 text-right font-mono text-xs">{inr(e.amount)}</td>
        <td className="p-3 text-right font-mono text-xs text-emerald-600">{inr(e.paid)}</td>
        <td className="p-3 text-right font-mono text-xs">
          {isCancelled ? (
            <div>
              <span className="text-muted-foreground font-semibold">₹0</span>
              <span className="block text-[9px] text-purple-600 dark:text-purple-400 font-mono">Waived</span>
            </div>
          ) : (
            <>
              <div className="font-bold">{inr(remaining)}</div>
              {lateFeeAmount > 0 && (
                <div className="text-[10px] text-destructive font-medium">
                  +{inr(lateFeeAmount)} fee ({inr(totalDue)})
                </div>
              )}
            </>
          )}
        </td>
        <td className="p-3">
          {isCancelled ? (
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 font-medium whitespace-nowrap">
              <ShieldCheck className="h-2.5 w-2.5 mr-1 text-purple-600" />
              Cancelled (Closed Early)
            </Badge>
          ) : (
            <StatusBadge status={e.status} />
          )}
        </td>
        <td className="p-3">
          {isCancelled ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[10px] px-2 cursor-pointer text-purple-700 dark:text-purple-400 hover:bg-purple-500/10"
              onClick={() => void navigate({ to: "/loans/$id", params: { id: e.loanId } })}
            >
              View Loan →
            </Button>
          ) : e.status !== "Paid" && e.paid < e.amount ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 cursor-pointer"
              onClick={() => void navigate({
                to: "/collection",
                search: {
                  customerId: cust?.id,
                  loanId: e.loanId,
                  emiId: e.id,
                },
              })}
            >
              <Banknote className="h-3 w-3 mr-1" />
              Collect
            </Button>
          ) : null}
        </td>
      </tr>
    );
  };

  const dueTabLabel = activeDate
    ? activeDate === today
      ? "Due Today"
      : `Due (${fmtDate(activeDate)})`
    : "Due Today";

  const tabConfig = [
    { key: "due-today", label: dueTabLabel, icon: Clock, count: byTab["due-today"].length, urgent: byTab["due-today"].length > 0 },
    { key: "overdue", label: "Overdue", icon: AlertTriangle, count: byTab.overdue.length, urgent: byTab.overdue.length > 0 },
    { key: "partial", label: "Partial", icon: Calendar, count: byTab.partial.length, urgent: false },
    { key: "upcoming", label: "Upcoming", icon: Calendar, count: byTab.upcoming.length, urgent: false },
    { key: "paid", label: "Paid", icon: CheckCircle2, count: byTab.paid.length, urgent: false },
    { key: "closed-early", label: "Closed Early", icon: ShieldCheck, count: byTab["closed-early"].length, urgent: false },
  ] as const;

  const emiExportData = useMemo(() => {
    const headers = [
      "EMI ID",
      "Due Date",
      "Loan ID",
      "EMI No",
      "Customer ID",
      "Customer Name",
      "Loan Frequency",
      "Installment Amount",
      "Paid Amount",
      "Remaining Balance",
      "Status",
    ];

    const currentItems = activeTab in byTab ? byTab[activeTab as keyof typeof byTab] : filtered;

    const rows = currentItems.map(({ e, cust, loan, isCancelled }) => [
      e.id,
      fmtDate(e.dueDate),
      e.loanId,
      e.emiNo,
      e.customerId,
      cust?.name ?? "—",
      loan?.frequency ?? "Monthly",
      e.amount,
      e.paid,
      isCancelled ? 0 : Math.max(0, e.amount - e.paid),
      isCancelled ? "Cancelled (Closed Early)" : e.status,
    ]);

    return { headers, rows };
  }, [activeTab, byTab, filtered]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">EMI Schedule</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            All EMI installments across active and overdue loans
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {byTab.overdue.length > 0 && (
            <div className="text-[10px] text-destructive font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-3 w-3" />
              <span>{byTab.overdue.length} Overdue</span>
              {totalOverdueLateFees > 0 && (
                <span className="font-mono font-bold">({inr(totalOverdueLateFees)} Late Charges)</span>
              )}
            </div>
          )}
          {byTab["due-today"].length > 0 && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Clock className="h-3 w-3" />
              {byTab["due-today"].length} {dueTabLabel}
            </div>
          )}
          <ExportDropdown
            label="Export EMIs"
            filename={`emi_schedule_${activeTab}_${today}`}
            sheetName="EMI Schedule"
            headers={emiExportData.headers}
            rows={emiExportData.rows}
          />
        </div>
      </div>

      {/* Search, Frequency & Day Filter */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by EMI ID, loan, customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Day Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Due Day:</span>
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
              <button
                type="button"
                onClick={() => {
                  setDayFilter("tomorrow");
                  setSelectedDate(addDays(today, 1));
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  dayFilter === "tomorrow" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tomorrow
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

          {/* Frequency Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Frequency:</span>
            <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
              <SelectTrigger className="h-9 text-xs w-32">
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

      {/* EMI Schedule Summary Cards (Filter Day & All) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {dayFilter === "all" ? "Total Scheduled" : `Due (${dueTabLabel})`}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono border-border">
                {activeScheduledEmis.length} EMIs
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{inr(filteredTotalAmount)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {dayFilter === "all" ? "All active schedules" : `Due date: ${activeDate ? fmtDate(activeDate) : "Today"}`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                EMI Amount Paid
              </span>
              <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                {filteredPaidCount} Paid
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{inr(filteredPaidAmount)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <span className="font-semibold text-emerald-600">{filteredCollectionRate}%</span> recovered
            </p>
          </CardContent>
        </Card>

        <Card className={`shadow-xs bg-gradient-to-br from-card ${filteredPendingAmount > 0 ? "border-amber-500/40 to-amber-500/5" : "border-border/80"}`}>
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${filteredPendingAmount > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                EMI Amount Pending
              </span>
              <Badge variant="outline" className={`text-[9px] font-bold ${filteredPendingAmount > 0 ? "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10" : "border-border text-muted-foreground"}`}>
                {filteredPendingCount} Pend.
              </Badge>
            </div>
            <p className={`text-xl font-bold font-mono mt-1 ${filteredPendingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
              {inr(filteredPendingAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Remaining to collect
            </p>
          </CardContent>
        </Card>

        <Card className={`shadow-xs bg-gradient-to-br from-card ${filteredOverdueAmount > 0 ? "border-destructive/40 to-destructive/5" : "border-border/80"}`}>
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${filteredOverdueAmount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                Overdue EMIs
              </span>
              <Badge variant="outline" className={`text-[9px] font-bold ${filteredOverdueAmount > 0 ? "border-destructive/40 text-destructive bg-destructive/10" : "border-border text-muted-foreground"}`}>
                {filteredOverdueCount} Overdue
              </Badge>
            </div>
            <p className={`text-xl font-bold font-mono mt-1 ${filteredOverdueAmount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {inr(filteredOverdueAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Principal + EMI in arrears
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Late Fee Penalties
              </span>
              <Badge variant="outline" className="text-[9px] font-mono text-destructive border-destructive/30 bg-destructive/5">
                Auto
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-destructive mt-1">{inr(totalOverdueLateFees)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Accrued late charges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-0">
            {tabConfig.map(({ key, label, count, urgent }) => (
              <TabsTrigger key={key} value={key} className="text-xs whitespace-nowrap">
                {label} <span className={`ml-1.5 text-[10px] font-semibold ${urgent ? "text-destructive" : ""}`}>({count})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabConfig.map(({ key }) => (
          <TabsContent key={key} value={key} className="m-0">
            {byTab[key].length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={`No ${key.replace("-", " ")} EMIs`}
                description={query ? "Try clearing your search." : "All EMIs in this category will appear here."}
                className="py-12"
              />
            ) : (
              <Card className="shadow-xs border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30">
                        {["EMI ID", "Customer", "Loan", "#", "Due Date", "Amount", "Paid", "Remaining", "Status", "Action"].map((h) => (
                          <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium whitespace-nowrap ${["Amount", "Paid", "Remaining"].includes(h) ? "text-right" : h === "#" ? "text-center" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {byTab[key].map((data) => (
                        <EmiRow key={data.e.id} {...data} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
