import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  MapPin,
  Search,
  X,
  Phone,
  CalendarCheck,
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  RotateCcw,
  Banknote,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, todayISO, addDays } from "@/lib/format";
import type { VisitStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportDropdown } from "@/components/common/ExportDropdown";

export const Route = createFileRoute("/visits")({
  component: VisitsPage,
});

const NON_PAYMENT_REASONS = [
  "Customer unavailable",
  "Payment promised for later",
  "Insufficient funds",
  "Requested later date",
  "Disputed amount",
  "Other",
];

function VisitsPage() {
  const { customers, visits, loans, emis, upsertVisit } = useStore();
  const navigate = useNavigate();
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordForm, setRecordForm] = useState({
    customerId: "",
    loanId: "",
    date: today,
    dueAmount: 0,
    collected: 0,
    status: "Visited" as VisitStatus,
    reason: "",
    nextVisit: "",
    notes: "",
  });

  const activeDate = useMemo(() => {
    if (dayFilter === "today") return today;
    if (dayFilter === "yesterday") return addDays(today, -1);
    if (dayFilter === "custom") return selectedDate;
    return null;
  }, [dayFilter, today, selectedDate]);

  const visitsWithData = useMemo(() => {
    return visits.map((v) => {
      const cust = customers.find((c) => c.id === v.customerId);
      const loan = loans.find((l) => l.id === v.loanId);
      return { v, cust, loan };
    });
  }, [visits, customers, loans]);

  const filtered = useMemo(() => {
    return visitsWithData.filter(({ v, cust }) => {
      if (activeDate && v.date !== activeDate) return false;
      const q = query.toLowerCase();
      const matchesQ =
        !q ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.id.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        false;
      const matchesStatus = filterStatus === "all" || v.status === filterStatus;
      return matchesQ && matchesStatus;
    });
  }, [visitsWithData, query, filterStatus, activeDate]);

  // Aggregate metrics for cards
  const totalCollectedOnVisits = useMemo(() => filtered.reduce((s, { v }) => s + (v.collected || 0), 0), [filtered]);
  const paidVisitsCount = useMemo(() => filtered.filter(({ v }) => v.status === "Paid" || v.status === "Partially Paid").length, [filtered]);
  const pendingVisitsCount = useMemo(() => filtered.filter(({ v }) => v.status === "Not Paid" || v.status === "Planned" || v.status === "Visited").length, [filtered]);

  const visitsExportData = useMemo(() => {
    const headers = [
      "Visit ID",
      "Date",
      "Customer ID",
      "Customer Name",
      "Loan ID",
      "Due Amount",
      "Collected Amount",
      "Status",
      "Collector",
      "Non-Payment Reason",
      "Next Visit Date",
      "Notes",
    ];

    const rows = filtered.map(({ v, cust }) => [
      v.id,
      fmtDate(v.date),
      v.customerId,
      cust?.name ?? "—",
      v.loanId,
      v.dueAmount,
      v.collected,
      v.status,
      v.collector,
      v.reason || "—",
      v.nextVisit ? fmtDate(v.nextVisit) : "—",
      v.notes || "",
    ]);

    return { headers, rows };
  }, [filtered]);

  const handleRecordVisit = () => {
    upsertVisit({
      customerId: recordForm.customerId,
      loanId: recordForm.loanId,
      date: recordForm.date,
      dueAmount: recordForm.dueAmount,
      collected: recordForm.collected,
      status: recordForm.status,
      reason: recordForm.reason || undefined,
      nextVisit: recordForm.nextVisit || undefined,
      notes: recordForm.notes || undefined,
    });
    setShowRecordDialog(false);
    setRecordForm({
      customerId: "",
      loanId: "",
      date: today,
      dueAmount: 0,
      collected: 0,
      status: "Visited",
      reason: "",
      nextVisit: "",
      notes: "",
    });
  };

  const selectedCustomer = customers.find((c) => c.id === recordForm.customerId);
  const customerLoans = loans.filter((l) => l.customerId === recordForm.customerId && l.status !== "Closed" && l.status !== "Closed Early");

  const statusColors: Record<VisitStatus, string> = {
    Planned: "text-blue-600",
    Visited: "text-emerald-600",
    Paid: "text-emerald-600",
    "Partially Paid": "text-amber-600",
    "Not Paid": "text-destructive",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Field Visits & Verification</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Door-to-door borrower verification, collection visits and Promise-to-Pay tracking
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportDropdown
            label="Export Visits"
            filename={`field_visits_${activeDate || "all"}`}
            sheetName="Visits"
            headers={visitsExportData.headers}
            rows={visitsExportData.rows}
          />
          <Button size="sm" className="text-xs h-9 cursor-pointer w-fit" onClick={() => setShowRecordDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Visit
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, visit ID..."
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

        {/* Day / All Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Visit Day:</span>
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
      </div>

      {/* Summary KPI Cards (Filter Day & All) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {dayFilter === "all" ? "All Visits" : `Visits (${fmtDate(activeDate!)})`}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">
                {filtered.length} Visits
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{filtered.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {dayFilter === "all" ? "All scheduled visits" : `Scheduled for ${fmtDate(activeDate!)}`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wide font-semibold">
                Collected on Doorstep
              </span>
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Direct
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{inr(totalCollectedOnVisits)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Field recovery collection
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Successful Visits</span>
              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Paid
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 mt-1">{paidVisitsCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Paid or partially collected
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Follow-ups / PTP</span>
              <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                Pending
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-amber-600 mt-1">{pendingVisitsCount}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Unpaid / promise to pay
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-muted-foreground mr-1">Status Filter:</span>
        {["all", "Planned", "Visited", "Paid", "Partially Paid", "Not Paid"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filterStatus === s ? "default" : "outline"}
            onClick={() => setFilterStatus(s)}
            className="text-xs h-8 cursor-pointer"
          >
            {s === "all" ? "All Statuses" : s}
          </Button>
        ))}
      </div>

      {/* Visits List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No visits found"
          description={query ? `No visits match "${query}"` : "No visits in this category."}
          action={{ label: "Record Visit", onClick: () => setShowRecordDialog(true) }}
        />
      ) : (
        <Card className="shadow-xs border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Visit ID", "Customer", "Address", "Date", "Due", "Collected", "Status", "Reason", "Next Visit", "Actions"].map((h) => (
                    <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium whitespace-nowrap ${h === "Due" || h === "Collected" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(({ v, cust, loan }) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{v.id}</td>
                    <td className="p-3">
                      <div>
                        <div className="font-semibold text-foreground">{cust?.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{cust?.id}</div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[120px] truncate text-[11px]">
                      {cust?.address.area}, {cust?.address.city}
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(v.date)}</td>
                    <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                    <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                    <td className="p-3"><StatusBadge status={v.status} /></td>
                    <td className="p-3 text-muted-foreground text-[10px] max-w-[100px] truncate">{v.reason ?? "—"}</td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 cursor-pointer"
                          onClick={() => { window.open(`tel:${cust?.mobile}`, "_self"); }}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 cursor-pointer"
                          onClick={() => void navigate({ to: "/collection" })}
                        >
                          Collect
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Visit Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Record Field Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs">Customer *</Label>
              <Select value={recordForm.customerId} onValueChange={(v) => setRecordForm((f) => ({ ...f, customerId: v, loanId: "" }))}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} ({c.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {customerLoans.length > 0 && (
              <div>
                <Label className="text-xs">Loan</Label>
                <Select value={recordForm.loanId} onValueChange={(v) => {
                  const loan = loans.find((l) => l.id === v);
                  const dueEmis = emis.filter((e) => e.loanId === v && e.paid < e.amount);
                  const dueAmount = dueEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
                  setRecordForm((f) => ({ ...f, loanId: v, dueAmount }));
                }}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select loan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customerLoans.map((l) => (
                      <SelectItem key={l.id} value={l.id} className="text-xs">{l.id} — {inr(l.principal)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Visit Date</Label>
                <Input type="date" value={recordForm.date} onChange={(e) => setRecordForm((f) => ({ ...f, date: e.target.value }))} className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Next Visit Date</Label>
                <Input type="date" value={recordForm.nextVisit} onChange={(e) => setRecordForm((f) => ({ ...f, nextVisit: e.target.value }))} className="mt-1 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Due Amount (₹)</Label>
                <Input type="number" min="0" value={recordForm.dueAmount || ""} onChange={(e) => setRecordForm((f) => ({ ...f, dueAmount: parseFloat(e.target.value) || 0 }))} className="mt-1 h-9 text-xs font-mono" placeholder="0" />
              </div>
              <div>
                <Label className="text-xs">Collected (₹)</Label>
                <Input type="number" min="0" value={recordForm.collected || ""} onChange={(e) => setRecordForm((f) => ({ ...f, collected: parseFloat(e.target.value) || 0 }))} className="mt-1 h-9 text-xs font-mono" placeholder="0" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Visit Outcome *</Label>
              <Select value={recordForm.status} onValueChange={(v) => setRecordForm((f) => ({ ...f, status: v as VisitStatus }))}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Planned", "Visited", "Paid", "Partially Paid", "Not Paid"] as VisitStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(recordForm.status === "Not Paid" || recordForm.status === "Partially Paid") && (
              <div>
                <Label className="text-xs">Non-payment Reason</Label>
                <Select value={recordForm.reason} onValueChange={(v) => setRecordForm((f) => ({ ...f, reason: v }))}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NON_PAYMENT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={recordForm.notes} onChange={(e) => setRecordForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." className="mt-1 h-9 text-xs" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowRecordDialog(false)}>Cancel</Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={handleRecordVisit} disabled={!recordForm.customerId}>
              Record Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
