import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CreditCard,
  Search,
  X,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/accounts")({
  component: AccountsPage,
});

function AccountsPage() {
  const { customers, accounts, loans, emis, payments, limitHistory, updateCreditLimit } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [newLimit, setNewLimit] = useState<string>("");
  const [limitReason, setLimitReason] = useState<string>("");
  const [limitError, setLimitError] = useState<string>("");

  const accountsWithData = useMemo(() => {
    return accounts.map((acc) => {
      const cust = customers.find((c) => c.id === acc.customerId);
      const activeLoans = loans.filter((l) => l.customerId === acc.customerId && l.status !== "Closed" && l.status !== "Closed Early");
      const usedLimit = activeLoans.reduce((sum, l) => {
        const lEmis = emis.filter((e) => e.loanId === l.id);
        return sum + lEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
      }, 0);
      const overdueEmis = emis.filter((e) => e.customerId === acc.customerId && e.status === "Overdue");
      const overdueAmount = overdueEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
      const totalPaid = payments.filter((p) => p.customerId === acc.customerId).reduce((s, p) => s + p.amount, 0);
      const availableLimit = Math.max(0, acc.creditLimit - usedLimit);
      const usedPct = acc.creditLimit > 0 ? Math.min(100, Math.round((usedLimit / acc.creditLimit) * 100)) : 0;
      return { acc, cust, usedLimit, overdueAmount, totalPaid, availableLimit, usedPct, activeLoansCount: activeLoans.length };
    }).filter(({ cust, acc }) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        acc.id.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.id.toLowerCase().includes(q) ||
        cust?.mobile.includes(q) ||
        false
      );
    });
  }, [accounts, customers, loans, emis, payments, query]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const selectedCustomer = selectedAccount ? customers.find((c) => c.id === selectedAccount.customerId) : undefined;
  const selectedAccountData = accountsWithData.find((d) => d.acc.id === selectedAccountId);

  const handleUpdateLimit = () => {
    const parsed = parseFloat(newLimit);
    if (!parsed || parsed < 0) { setLimitError("Please enter a valid positive credit limit"); return; }
    if (!limitReason.trim()) { setLimitError("Please provide a reason for changing the limit"); return; }
    if (selectedAccountData && parsed < selectedAccountData.usedLimit) {
      setLimitError(`New limit cannot be less than current used amount (${inr(selectedAccountData.usedLimit)})`);
      return;
    }
    updateCreditLimit(selectedAccountId, parsed, limitReason);
    setShowLimitDialog(false);
    setNewLimit("");
    setLimitReason("");
    setLimitError("");
  };

  const selectedAccountHistory = limitHistory.filter((h) => h.accountId === selectedAccountId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Customer Accounts & Credit Limits</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Institutional credit lines, headroom limits, balance ledgers and risk exposure
          </p>
        </div>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs w-fit">{accounts.length} Accounts</Badge>
      </div>

      {/* Account Analytics KPIs */}
      {(() => {
        const totalLimit = accounts.reduce((s, a) => s + a.creditLimit, 0);
        const totalUsed = accountsWithData.reduce((s, d) => s + d.usedLimit, 0);
        const totalAvailable = Math.max(0, totalLimit - totalUsed);
        const totalOverdue = accountsWithData.reduce((s, d) => s + d.overdueAmount, 0);
        const portfolioUtilPct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
        const atRiskCount = accountsWithData.filter((d) => d.usedPct >= 90 || d.overdueAmount > 0).length;

        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Sanctioned Limit</p>
                <p className="text-base font-bold text-foreground mt-0.5 font-mono">{inr(totalLimit)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Across {accounts.length} active borrower accounts</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credit Utilized</p>
                <p className="text-base font-bold text-foreground mt-0.5 font-mono">{inr(totalUsed)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={portfolioUtilPct} className="h-1.5 flex-1" />
                  <span className="text-[10px] font-semibold">{portfolioUtilPct}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Available Headroom</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5 font-mono">{inr(totalAvailable)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Available for new loan sanctions</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardContent className="p-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">At-Risk / Overdue</p>
                <p className={`text-base font-bold mt-0.5 font-mono ${totalOverdue > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {inr(totalOverdue)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{atRiskCount} account{atRiskCount === 1 ? "" : "s"} &gt;90% limit or overdue</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by Account Unique ID (ACC-xxx), name, mobile..."
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

      {/* Accounts List */}
      {accountsWithData.length === 0 ? (
        <EmptyState icon={CreditCard} title="No accounts found" description={query ? `No accounts match "${query}"` : "No accounts in the system."} />
      ) : (
        <div className="space-y-3">
          {accountsWithData.map(({ acc, cust, usedLimit, overdueAmount, availableLimit, usedPct, activeLoansCount }) => (
            <Card key={acc.id} className="shadow-xs border-border hover:border-primary/30 transition-colors group">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {cust && (
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: `hsl(${cust.photoHue}, 65%, 45%)` }}
                      >
                        {cust.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div
                        className="font-semibold text-sm text-foreground group-hover:text-primary cursor-pointer transition-colors"
                        onClick={() => cust && void navigate({ to: "/customers/$id", params: { id: cust.id } })}
                      >
                        {cust?.name ?? "Unknown"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {acc.id} • {cust?.id} • {activeLoansCount} active loan{activeLoansCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Credit Limit</p>
                      <p className="font-mono font-semibold">{inr(acc.creditLimit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Used</p>
                      <p className="font-mono font-semibold">{inr(usedLimit)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Available</p>
                      <p className={`font-mono font-bold ${availableLimit > 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {inr(availableLimit)}
                      </p>
                    </div>
                    {overdueAmount > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Overdue</p>
                        <p className="font-mono font-bold text-destructive">{inr(overdueAmount)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={acc.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 cursor-pointer"
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        setNewLimit(String(acc.creditLimit));
                        setShowLimitDialog(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Limit
                    </Button>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Credit Utilization</span>
                    <span>{usedPct}%</span>
                  </div>
                  <Progress value={usedPct} className={`h-1.5 ${usedPct > 85 ? "[&>div]:bg-destructive" : usedPct > 60 ? "[&>div]:bg-amber-500" : ""}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Credit Limit Update Dialog */}
      <Dialog open={showLimitDialog} onOpenChange={(open) => { if (!open) { setShowLimitDialog(false); setLimitError(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Update Credit Limit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs py-1">
            {selectedCustomer && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-semibold">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-mono">{selectedAccountId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Limit:</span>
                  <span className="font-mono font-semibold">{inr(selectedAccount?.creditLimit ?? 0)}</span>
                </div>
                {selectedAccountData && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used Amount:</span>
                    <span className="font-mono">{inr(selectedAccountData.usedLimit)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">New Credit Limit (₹)</Label>
              <Input
                type="number"
                min="0"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Enter new limit"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Change</Label>
              <Input
                value={limitReason}
                onChange={(e) => setLimitReason(e.target.value)}
                placeholder="e.g. Good repayment history, KYC verified..."
                className="h-9 text-xs"
              />
            </div>
            {limitError && (
              <div className="flex items-center gap-1.5 text-destructive text-[10px]">
                <AlertTriangle className="h-3.5 w-3.5" />
                {limitError}
              </div>
            )}
            {selectedAccountHistory.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Change History</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selectedAccountHistory.map((h) => (
                    <div key={h.id} className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{fmtDate(h.date)}: {inr(h.oldLimit)} → {inr(h.newLimit)}</span>
                      <span className="text-muted-foreground/70 truncate max-w-[100px]">{h.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowLimitDialog(false)}>Cancel</Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={handleUpdateLimit}>Update Limit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
