import type { Loan, Emi, Payment, EmiStatus } from "@/types";
import { inr, safe, fmtDate, daysBetween } from "@/lib/format";

export interface AmortizationRow {
  emiNo: number;
  emiId: string;
  dueDate: string;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
  paidAmount: number;
  remainingAmount: number;
  status: EmiStatus;
  remarks: string;
  lateFee?: number | undefined;
  lateFeePaid?: number | undefined;
  lateFeeWaived?: boolean | undefined;
  paymentDetails?: {
    paymentId: string;
    receiptId: string;
    date: string;
    method: string;
    amount: number;
  } | undefined;
}

export interface LoanFinancialSummary {
  originalPrincipal: number;
  interestRate: number;
  interestMethod: Loan["interestMethod"];
  tenure: number;
  frequency: Loan["frequency"];
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  outstandingInterest: number;
  futureInterestWaived: number;
  rows: AmortizationRow[];
  isClosedEarly: boolean;
  earlyClosureDetails?: Loan["earlyClosure"] | undefined;
}

/**
 * Computes exact principal/interest split, closing balance progression,
 * and live payment allocation for any loan schedule.
 */
export function computeAmortizationSchedule(
  loan: Loan,
  emis: Emi[],
  payments: Payment[],
): LoanFinancialSummary {
  const loanEmis = [...emis]
    .filter((e) => e.loanId === loan.id)
    .sort((a, b) => a.emiNo - b.emiNo);
  const loanPayments = payments.filter((p) => p.loanId === loan.id && !p.reversed);

  const tenure = Math.max(1, loan.tenure);
  const isReducing = loan.interestMethod === "Reducing Balance";

  // Rate per frequency period for reducing balance
  const periodRate =
    loan.frequency === "Daily"
      ? (loan.interestRate / 100) / 365
      : loan.frequency === "Weekly"
      ? (loan.interestRate / 100) / 52
      : (loan.interestRate / 100) / 12;

  // Track opening principal balance for reducing balance amortization
  let balance = loan.principal;

  // Step 1: Pre-calculate scheduled principal and interest components per EMI
  const components: { principal: number; interest: number }[] = [];
  let sumPrincipal = 0;
  let sumInterest = 0;

  for (let i = 0; i < tenure; i++) {
    const isLast = i === tenure - 1;
    let pComp = 0;
    let iComp = 0;

    if (isReducing) {
      if (isLast) {
        pComp = balance;
        iComp = Math.max(0, Math.round(balance * periodRate));
      } else {
        iComp = Math.max(0, Math.round(balance * periodRate));
        pComp = Math.max(0, Math.min(balance, loan.emiAmount - iComp));
        balance = Math.max(0, balance - pComp);
      }
    } else {
      // Flat Interest
      if (isLast) {
        iComp = Math.max(0, loan.totalInterest - sumInterest);
        pComp = Math.max(0, loan.principal - sumPrincipal);
      } else {
        iComp = Math.round(loan.totalInterest / tenure);
        pComp = Math.round(loan.principal / tenure);
      }
    }

    sumPrincipal += pComp;
    sumInterest += iComp;
    components.push({ principal: pComp, interest: iComp });
  }

  // Final reconciliation check
  if (!isReducing) {
    const pDiff = loan.principal - sumPrincipal;
    const iDiff = loan.totalInterest - sumInterest;
    if (components.length > 0) {
      const last = components[components.length - 1]!;
      last.principal = Math.max(0, last.principal + pDiff);
      last.interest = Math.max(0, last.interest + iDiff);
    }
  }

  // Step 2: Build table rows with closing balance and actual payment info
  let currentClosing = loan.principal;
  const rows: AmortizationRow[] = [];
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalPaidAmount = 0;

  for (let i = 0; i < tenure; i++) {
    const emi = loanEmis[i];
    const emiId = emi ? emi.id : `EMI-GEN-${i + 1}`;
    const dueDate = emi ? emi.dueDate : loan.firstEmiDate;
    const emiAmount = emi ? emi.amount : loan.emiAmount;
    const paid = emi ? safe(emi.paid) : 0;
    const status: EmiStatus = emi ? emi.status : "Upcoming";

    const comp = components[i] ?? {
      principal: Math.round(loan.principal / tenure),
      interest: Math.round(loan.totalInterest / tenure),
    };

    // Calculate closing balance:
    // Closing Balance represents the remaining scheduled principal after this EMI
    currentClosing = Math.max(0, currentClosing - comp.principal);
    if (i === tenure - 1) currentClosing = 0;

    // Allocate paid amount between principal and interest proportionally
    let pPaid = 0;
    let iPaid = 0;
    if (paid >= emiAmount && emiAmount > 0) {
      pPaid = comp.principal;
      iPaid = comp.interest;
    } else if (paid > 0 && emiAmount > 0) {
      const ratio = paid / emiAmount;
      pPaid = Math.min(comp.principal, Math.round(comp.principal * ratio));
      iPaid = Math.min(comp.interest, paid - pPaid);
    }

    totalPrincipalPaid += pPaid;
    totalInterestPaid += iPaid;
    totalPaidAmount += paid;

    // Remarks logic matching Part B specification
    let remarks = "";
    if (status === "Paid") {
      remarks = "Paid";
    } else if (status === "Partial") {
      const pending = Math.max(0, emiAmount - paid);
      remarks = `Partial - ${inr(pending)} Pending`;
    } else if (status === "Overdue") {
      remarks = "Overdue";
    } else if (status === "Due") {
      remarks = "Due Today";
    } else if (status === "Cancelled") {
      remarks = emi?.remarks || "Cancelled - Early Closure";
    } else {
      remarks = "Upcoming";
    }

    // Find linked payment
    const payment = loanPayments.find((p) => p.emiId === emiId);
    const paymentDetails = payment
      ? {
          paymentId: payment.id,
          receiptId: payment.receiptId,
          date: payment.date,
          method: payment.method,
          amount: payment.amount,
        }
      : undefined;

    rows.push({
      emiNo: i + 1,
      emiId,
      dueDate,
      emiAmount,
      principalComponent: comp.principal,
      interestComponent: comp.interest,
      principalPaid: pPaid,
      interestPaid: iPaid,
      closingBalance: currentClosing,
      paidAmount: paid,
      remainingAmount: Math.max(0, emiAmount - paid),
      status,
      remarks,
      paymentDetails,
    });
  }

  // Outstanding Principal is remaining principal to be collected
  const outstandingPrincipal = Math.max(0, loan.principal - totalPrincipalPaid);

  // Outstanding Interest is interest on past or pending EMIs
  const outstandingInterest = rows
    .filter((r) => r.status === "Overdue" || r.status === "Due" || r.status === "Partial")
    .reduce((sum, r) => sum + Math.max(0, r.interestComponent - r.interestPaid), 0);

  // Future unearned interest on upcoming / cancelled EMIs (waived in early closure)
  const futureInterestWaived = rows
    .filter((r) => r.status === "Upcoming" || r.status === "Cancelled")
    .reduce((sum, r) => sum + r.interestComponent, 0);

  const isClosedEarly = loan.status === "Closed Early" || Boolean(loan.earlyClosure);

  return {
    originalPrincipal: loan.principal,
    interestRate: loan.interestRate,
    interestMethod: loan.interestMethod,
    tenure: loan.tenure,
    frequency: loan.frequency,
    emiAmount: loan.emiAmount,
    totalInterest: loan.totalInterest,
    totalPayable: loan.totalPayable,
    totalPaid: totalPaidAmount,
    totalPrincipalPaid,
    totalInterestPaid,
    outstandingPrincipal: isClosedEarly ? 0 : outstandingPrincipal,
    outstandingInterest: isClosedEarly ? 0 : outstandingInterest,
    futureInterestWaived,
    rows,
    isClosedEarly,
    earlyClosureDetails: loan.earlyClosure,
  };
}

/**
 * Standard calculation for Early Loan Foreclosure.
 *
 * CRITICAL BUSINESS RULE:
 * Outstanding Principal + Early Closure Charge = Final Early Closure Amount
 * Early Closure Charge = Outstanding Principal * (Charge % / 100)
 * Future / unearned interest charged = ₹0 (Never added to early closure)
 */
export function calculateEarlyClosure(
  outstandingPrincipal: number,
  chargePercent: number,
): {
  outstandingPrincipal: number;
  chargePercent: number;
  chargeAmount: number;
  futureInterestCharged: 0;
  finalClosureAmount: number;
} {
  const p = Math.max(0, Math.round(safe(outstandingPrincipal)));
  const pctValid = Math.max(0, safe(chargePercent));
  const chargeAmount = Math.round((p * pctValid) / 100);
  const finalClosureAmount = p + chargeAmount;

  return {
    outstandingPrincipal: p,
    chargePercent: pctValid,
    chargeAmount,
    futureInterestCharged: 0,
    finalClosureAmount,
  };
}

export interface ComputeScheduleOptions {
  principal: number;
  rate: number;
  method: Loan["interestMethod"];
  tenure: number;
  frequency: Loan["frequency"];
}

export interface ScheduleCalculationResult {
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
}

/**
 * Computes exact EMI amount, total interest, and total payable for a loan schedule.
 * Accurately scales based on repayment frequency:
 * - Monthly: 12 periods/year (tenure in months)
 * - Weekly:  52 periods/year (tenure in weeks)
 * - Daily:   365 periods/year (tenure in days)
 */
export function computeSchedule(opts: ComputeScheduleOptions): ScheduleCalculationResult {
  const principal = Math.max(0, safe(opts.principal));
  const rate = Math.max(0, safe(opts.rate));
  const tenure = Math.max(0, Math.round(safe(opts.tenure)));
  const method = opts.method;
  const frequency = opts.frequency || "Monthly";

  if (principal <= 0 || tenure <= 0) {
    return { emiAmount: 0, totalInterest: 0, totalPayable: principal };
  }

  const periodsPerYear = frequency === "Daily" ? 365 : frequency === "Weekly" ? 52 : 12;
  const years = tenure / periodsPerYear;

  if (method === "Flat") {
    const totalInterest = Math.round(principal * (rate / 100) * years);
    const totalPayable = principal + totalInterest;
    const emiAmount = Math.round(totalPayable / tenure);
    return { emiAmount, totalInterest, totalPayable };
  } else {
    // Reducing Balance
    const r = (rate / 100) / periodsPerYear;
    if (r === 0) {
      const emiAmount = Math.round(principal / tenure);
      return { emiAmount, totalInterest: 0, totalPayable: principal };
    }
    const emi = (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    const emiAmount = Math.round(emi);
    const totalPayable = emiAmount * tenure;
    const totalInterest = Math.max(0, totalPayable - principal);
    return { emiAmount, totalInterest, totalPayable };
  }
}

export interface LateFeeCalculation {
  daysOverdue: number;
  gracePeriodDays: number;
  chargeableDays: number;
  lateFeePerDay: number;
  lateFeeAmount: number;
  isWaived: boolean;
}

/**
 * Calculates late EMI penalty charges based on days overdue and institution settings.
 * - If days overdue <= grace period, late fee is ₹0.
 * - Once grace period is exceeded, charges apply for overdue days past grace period.
 * - Can be marked as waived.
 */
export function calculateLateFee(
  dueDate: string,
  currentDate: string,
  settings: { gracePeriodDays?: number; lateFeePerDay?: number },
  isWaived = false,
  minDaysOverdue?: number
): LateFeeCalculation {
  const cleanDueDate = dueDate ? (dueDate.includes("T") ? dueDate.slice(0, 10) : dueDate.trim()) : "";
  const cleanCurrentDate = currentDate ? (currentDate.includes("T") ? currentDate.slice(0, 10) : currentDate.trim()) : "";
  const rawDays = Math.max(0, daysBetween(cleanDueDate, cleanCurrentDate));
  const daysOverdue = minDaysOverdue !== undefined ? Math.max(rawDays, minDaysOverdue) : rawDays;
  const gracePeriodDays = Math.max(0, safe(settings?.gracePeriodDays));
  // Default to 20 if unset or 0 so penalties calculate predictably
  const lateFeePerDay = Math.max(0, safe(settings?.lateFeePerDay) || 20);

  if (isWaived || daysOverdue <= gracePeriodDays || lateFeePerDay <= 0) {
    return {
      daysOverdue,
      gracePeriodDays,
      chargeableDays: 0,
      lateFeePerDay,
      lateFeeAmount: 0,
      isWaived: Boolean(isWaived),
    };
  }

  const chargeableDays = daysOverdue - gracePeriodDays;
  const lateFeeAmount = chargeableDays * lateFeePerDay;

  return {
    daysOverdue,
    gracePeriodDays,
    chargeableDays,
    lateFeePerDay,
    lateFeeAmount,
    isWaived: false,
  };
}

