import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Banknote, ChevronDown, FileSpreadsheet, Info } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, safe, fmtDate } from "@/lib/format";
import { computeAmortizationSchedule, calculateEarlyClosure } from "@/utils/amortization";
import type { Loan, Customer, PaymentMethod } from "@/types";

interface EarlyCloseDialogProps {
  loan: Loan | null;
  customer?: Customer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EarlyCloseDialog({
  loan,
  customer,
  open,
  onOpenChange,
  onSuccess,
}: EarlyCloseDialogProps) {
  const { emis, payments, earlyCloseLoan } = useStore();

  const [chargePercentStr, setChargePercentStr] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [bankTxId, setBankTxId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Calculate live financial schedule
  const sched = useMemo(() => {
    if (!loan) return null;
    return computeAmortizationSchedule(loan, emis, payments);
  }, [loan, emis, payments]);

  const parsedPercent = useMemo(() => {
    const p = parseFloat(chargePercentStr);
    if (isNaN(p) || p < 0) return 0;
    return p;
  }, [chargePercentStr]);

  const closureCalc = useMemo(() => {
    const outstandingP = sched ? sched.outstandingPrincipal : 0;
    return calculateEarlyClosure(outstandingP, parsedPercent);
  }, [sched, parsedPercent]);

  // Derived financial figures for Part 1 items 1 to 9
  const financialDetails = useMemo(() => {
    if (!loan || !sched) return null;

    // Paid breakdown
    const principalPaid = sched.totalPrincipalPaid;
    const interestPaid = sched.totalInterestPaid;
    const lateChargesPaid = 0;
    const otherChargesPaid = 0;
    const totalPaid = sched.totalPaid;

    // Current Pending breakdown
    const principalPending = closureCalc.outstandingPrincipal;
    const accruedInterestPending = sched.outstandingInterest;
    const overdueEmis = sched.rows.filter((r) => r.status === "Overdue");
    const overdueAmount = overdueEmis.reduce((sum, r) => sum + r.remainingAmount, 0);
    const lateChargesPending = 0;
    const otherChargesPending = 0;
    const currentDues = principalPending + accruedInterestPending + lateChargesPending + otherChargesPending;

    // Future Interest breakdown
    const futureInterestRemaining = sched.futureInterestWaived;
    const futureInterestWaived = sched.futureInterestWaived;
    const futureInterestCharged = 0;

    // Final calculation
    const finalClosureAmount = closureCalc.finalClosureAmount + accruedInterestPending;

    return {
      principalPaid,
      interestPaid,
      lateChargesPaid,
      otherChargesPaid,
      totalPaid,
      principalPending,
      accruedInterestPending,
      overdueAmount,
      lateChargesPending,
      otherChargesPending,
      currentDues,
      futureInterestRemaining,
      futureInterestWaived,
      futureInterestCharged,
      finalClosureAmount,
    };
  }, [loan, sched, closureCalc]);

  if (!loan || !sched || !financialDetails) return null;

  const handleChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setErrorMsg("");
    if (val === "") {
      setChargePercentStr("");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    if (num < 0) {
      setErrorMsg("Early closure charge cannot be negative.");
      return;
    }
    if (num > 100) {
      setErrorMsg("Early closure charge percentage cannot exceed 100%.");
      return;
    }
    setChargePercentStr(val);
  };

  const handleProceedToConfirm = () => {
    if (closureCalc.outstandingPrincipal <= 0) {
      toast.error("This loan has no outstanding principal balance to close early.");
      return;
    }
    if (paymentMethod === "Bank" && !bankTxId.trim()) {
      setErrorMsg("Bank Transaction ID / UTR reference is required for Bank Transfer.");
      return;
    }
    setErrorMsg("");
    setConfirmStep(true);
  };

  const handleFinalConfirm = () => {
    if (paymentMethod === "Bank" && !bankTxId.trim()) {
      setErrorMsg("Bank Transaction ID is required for Bank Transfer.");
      return;
    }

    try {
      const result = earlyCloseLoan({
        loanId: loan.id,
        chargePercent: closureCalc.chargePercent,
        method: paymentMethod,
        bankTransactionId: bankTxId.trim(),
        notes: notes.trim() || `Early foreclosure closure at ${closureCalc.chargePercent}% charge`,
      });

      toast.success(`Loan ${loan.id} closed early successfully!`, {
        description: `Final settlement of ${inr(result.payment.amount)} collected. Receipt ${result.receipt.id} generated.`,
      });

      setConfirmStep(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to close loan early.";
      toast.error(msg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setConfirmStep(false);
          setErrorMsg("");
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {confirmStep ? "Confirm Early Loan Foreclosure" : "Early Loan Settlement Statement"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Loan ID: {loan.id} • Customer: {customer?.name ?? "Customer"}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/30">
              Foreclosure Statement
            </Badge>
          </div>
        </DialogHeader>

        {!confirmStep ? (
          /* STEP 1: Full Itemized Settlement Statement */
          <div className="space-y-4 py-2 text-xs">
            {/* Policy Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-xs">Principal-Only Foreclosure Policy</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Early closure is calculated <strong>strictly on Outstanding Principal</strong>. Future/unearned interest is <strong>waived (₹0 charged)</strong>.
                </p>
              </div>
            </div>

            {/* 1. LOAN SUMMARY */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                <span className="font-bold uppercase tracking-wider text-[11px] text-primary">1. Loan Summary</span>
                <Badge variant="secondary" className="text-[10px]">{loan.interestMethod}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Original Loan Amount</span>
                  <span className="font-mono font-bold text-foreground">{inr(loan.principal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Interest Rate</span>
                  <span className="font-semibold text-foreground">{loan.interestRate}% p.a.</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Interest Type</span>
                  <span className="font-semibold text-foreground">{loan.interestMethod}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Scheduled Interest</span>
                  <span className="font-mono font-semibold text-foreground">{inr(loan.totalInterest)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Total Scheduled Payable</span>
                  <span className="font-mono font-semibold text-foreground">{inr(loan.totalPayable)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">EMI Amount</span>
                  <span className="font-mono font-bold text-primary">{inr(loan.emiAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Loan Tenure</span>
                  <span className="font-semibold text-foreground">{loan.tenure} {loan.frequency}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Start Date</span>
                  <span className="font-medium text-foreground">{fmtDate(loan.startDate)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">End Date</span>
                  <span className="font-medium text-foreground">{fmtDate(loan.endDate)}</span>
                </div>
              </div>
            </div>

            {/* 2 & 3: AMOUNT PAID SO FAR & CURRENT PENDING */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 2. AMOUNT PAID SO FAR */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-emerald-700 dark:text-emerald-400 block border-b border-emerald-500/20 pb-1">
                  2. Amount Paid So Far
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Principal Paid</span>
                    <span className="font-semibold">{inr(financialDetails.principalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Interest Paid</span>
                    <span className="font-semibold">{inr(financialDetails.interestPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Late Charges Paid</span>
                    <span className="font-semibold">{inr(financialDetails.lateChargesPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Other Charges Paid</span>
                    <span className="font-semibold">{inr(financialDetails.otherChargesPaid)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-emerald-500/30 font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    <span className="font-sans">TOTAL AMOUNT PAID</span>
                    <span>{inr(financialDetails.totalPaid)}</span>
                  </div>
                </div>
              </div>

              {/* 3. CURRENT PENDING AMOUNT */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400 block border-b border-amber-500/20 pb-1">
                  3. Current Pending
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Principal Pending</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{inr(financialDetails.principalPending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Accrued Interest Pending</span>
                    <span className="font-semibold">{inr(financialDetails.accruedInterestPending)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Overdue Amount</span>
                    <span className="font-semibold">{inr(financialDetails.overdueAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Late Charges Pending</span>
                    <span className="font-semibold">{inr(financialDetails.lateChargesPending)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-amber-500/30 font-bold text-amber-700 dark:text-amber-400 text-sm">
                    <span className="font-sans">CURRENT DUES</span>
                    <span>{inr(financialDetails.currentDues)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4 & 5: FUTURE INTEREST & FORECLOSURE CHARGE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 4. FUTURE / UNEARNED INTEREST */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-purple-700 dark:text-purple-400 block border-b border-purple-500/20 pb-1">
                  4. Future / Unearned Interest
                </span>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans text-[11px]">Future Interest Remaining</span>
                    <span className="font-semibold">{inr(financialDetails.futureInterestRemaining)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="font-sans text-[11px]">Future Interest Waived</span>
                    <span className="font-bold">-{inr(financialDetails.futureInterestWaived)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-purple-500/20 font-bold">
                    <span className="font-sans text-[11px]">Future Interest Charged</span>
                    <span className="text-emerald-600">₹0</span>
                  </div>
                </div>
              </div>

              {/* 5. FORECLOSURE / EARLY CLOSURE CHARGE */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-purple-700 dark:text-purple-400 block border-b border-purple-500/20 pb-1">
                  5. Early Closure Charge
                </span>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="chargePercent" className="text-[10px] text-muted-foreground">Charge %</Label>
                      <div className="relative">
                        <Input
                          id="chargePercent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={chargePercentStr}
                          onChange={handleChargeChange}
                          placeholder="0"
                          className="font-mono font-bold text-xs h-8 pr-6"
                        />
                        <span className="absolute right-2 top-1.5 text-xs font-bold text-muted-foreground pointer-events-none">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Charge Amount</Label>
                      <div className="h-8 px-2.5 rounded-md bg-muted/60 border border-border flex items-center font-mono font-bold text-xs text-purple-700 dark:text-purple-400">
                        {inr(closureCalc.chargeAmount)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {inr(financialDetails.principalPending)} × {closureCalc.chargePercent}% = {inr(closureCalc.chargeAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* 6. FINAL EARLY CLOSURE CALCULATION */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
              <span className="font-bold uppercase tracking-wider text-[11px] text-primary block border-b border-border/60 pb-1">
                6. Transparent Settlement Math
              </span>
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="font-sans text-muted-foreground">Principal Pending</span>
                  <span>{inr(financialDetails.principalPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-muted-foreground">+ Accrued Interest Pending</span>
                  <span>{inr(financialDetails.accruedInterestPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-muted-foreground">+ Overdue / Late Charges</span>
                  <span>{inr(financialDetails.lateChargesPending)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-muted-foreground">+ Foreclosure Charge ({closureCalc.chargePercent}%)</span>
                  <span>{inr(closureCalc.chargeAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="font-sans">- Applicable Interest Waivers</span>
                  <span>-{inr(financialDetails.futureInterestWaived)}</span>
                </div>
              </div>
            </div>

            {/* Final Amount Callout Banner */}
            <div className="p-4 rounded-xl bg-purple-600 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-purple-200">
                  FINAL EARLY CLOSURE AMOUNT
                </p>
                <p className="text-xs text-purple-100 mt-0.5">
                  Principal Pending ({inr(financialDetails.principalPending)}) + Charge ({inr(closureCalc.chargeAmount)})
                </p>
              </div>
              <p className="font-mono text-xl sm:text-2xl font-black tracking-tight">
                {inr(closureCalc.finalClosureAmount)}
              </p>
            </div>

            {/* 7. PAYMENT / EMI BREAKDOWN (Collapsible) */}
            <Accordion type="single" collapsible className="w-full border border-border rounded-xl px-3 bg-card">
              <AccordionItem value="payment-breakdown" className="border-none">
                <AccordionTrigger className="text-xs font-bold py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                    <span>7. View Complete Payment / EMI Breakdown</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{sched.rows.length} EMIs</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-3 space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-muted/60 text-muted-foreground uppercase text-[9px] font-bold">
                        <tr>
                          <th className="p-2 text-center">#</th>
                          <th className="p-2">Due Date</th>
                          <th className="p-2 text-right">EMI Amt</th>
                          <th className="p-2 text-right">Principal</th>
                          <th className="p-2 text-right">Interest</th>
                          <th className="p-2 text-right">Paid</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono">
                        {sched.rows.map((r) => (
                          <tr key={r.emiId} className="hover:bg-muted/30">
                            <td className="p-2 text-center font-bold">{r.emiNo}</td>
                            <td className="p-2 font-sans">{fmtDate(r.dueDate)}</td>
                            <td className="p-2 text-right">{inr(r.emiAmount)}</td>
                            <td className="p-2 text-right text-muted-foreground">{inr(r.principalComponent)}</td>
                            <td className="p-2 text-right text-muted-foreground">{inr(r.interestComponent)}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">{inr(r.paidAmount)}</td>
                            <td className="p-2 text-center font-sans">
                              <Badge
                                variant="outline"
                                className={`text-[9px] py-0 h-4 ${
                                  r.status === "Paid"
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                                    : r.status === "Overdue"
                                    ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="p-2 font-sans text-muted-foreground">{r.paymentDetails?.receiptId ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/40 font-mono font-bold text-[10px] border-t border-border">
                        <tr>
                          <td colSpan={3} className="p-2 uppercase font-sans">Total Schedule Breakdown</td>
                          <td className="p-2 text-right">{inr(loan.principal)}</td>
                          <td className="p-2 text-right">{inr(loan.totalInterest)}</td>
                          <td className="p-2 text-right text-emerald-600">{inr(financialDetails.totalPaid)}</td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Payment Mode & Bank Tx Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="payMethod" className="text-xs font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger id="payMethod" className="h-9 text-xs">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "Bank" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bankTx" className="text-xs font-semibold text-foreground">
                    Bank Transaction ID / UTR <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankTx"
                    value={bankTxId}
                    onChange={(e) => setBankTxId(e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="closureNotes" className="text-xs font-semibold">Settlement Notes (Optional)</Label>
                  <Input
                    id="closureNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Customer foreclosed early by cash"
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {errorMsg}
              </p>
            )}
          </div>
        ) : (
          /* STEP 8 & 9: FINAL CLOSURE SUMMARY & CONFIRMATION */
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 font-mono">
              <div className="text-center pb-2 border-b border-border">
                <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  ------------------------------------------
                </p>
                <p className="font-bold text-sm tracking-wider text-foreground">
                  8. FINAL CLOSURE SUMMARY
                </p>
                <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  ------------------------------------------
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Loan ID</span>
                <span className="font-bold text-right text-foreground">{loan.id}</span>

                <span className="text-muted-foreground">Original Loan Amount</span>
                <span className="font-bold text-right text-foreground">{inr(loan.principal)}</span>

                <span className="text-muted-foreground">Total Paid So Far</span>
                <span className="font-bold text-right text-emerald-600">{inr(financialDetails.totalPaid)}</span>

                <span className="text-muted-foreground">Principal Paid</span>
                <span className="font-bold text-right text-foreground">{inr(financialDetails.principalPaid)}</span>

                <span className="text-muted-foreground">Interest Paid</span>
                <span className="font-bold text-right text-foreground">{inr(financialDetails.interestPaid)}</span>

                <span className="text-muted-foreground">Principal Pending</span>
                <span className="font-bold text-right text-amber-600">{inr(financialDetails.principalPending)}</span>

                <span className="text-muted-foreground">Interest Pending</span>
                <span className="font-bold text-right text-foreground">{inr(financialDetails.accruedInterestPending)}</span>

                <span className="text-muted-foreground">Future Interest Remaining</span>
                <span className="font-bold text-right text-foreground">{inr(financialDetails.futureInterestRemaining)}</span>

                <span className="text-muted-foreground">Future Interest Waived</span>
                <span className="font-bold text-right text-emerald-600">-{inr(financialDetails.futureInterestWaived)}</span>

                <span className="text-muted-foreground">Foreclosure Charge ({closureCalc.chargePercent}%)</span>
                <span className="font-bold text-right text-purple-600">{inr(closureCalc.chargeAmount)}</span>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-black text-foreground">
                <span>FINAL AMOUNT TO CLOSE LOAN</span>
                <span className="text-purple-700 dark:text-purple-400 font-mono text-base">
                  {inr(closureCalc.finalClosureAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] grid grid-cols-2 gap-1 font-sans">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold text-right">{paymentMethod}</span>
                {paymentMethod === "Bank" && (
                  <>
                    <span className="text-muted-foreground">Bank Tx Ref:</span>
                    <span className="font-mono text-right">{bankTxId}</span>
                  </>
                )}
              </div>
            </div>

            {/* 9. CONFIRM EARLY CLOSURE WARNING */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Confirm Early Closure Notice:</p>
                <p className="text-[11px] mt-0.5">
                  Confirming early closure will close this loan and cancel all remaining future EMIs according to the existing early-closure rules. Future/unearned interest will be waived where applicable.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Loan status will change to <strong>Closed Early</strong>, outstanding balance will become <strong>₹0</strong>, and future scheduled EMIs will become <strong>Cancelled</strong>. Historical payment history is preserved.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border/60 pt-3 gap-2">
          {!confirmStep ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                onClick={handleProceedToConfirm}
              >
                Review Settlement Summary
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => setConfirmStep(false)}
              >
                Back to Statement
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer font-bold"
                onClick={handleFinalConfirm}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm Early Closure ({inr(closureCalc.finalClosureAmount)})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

