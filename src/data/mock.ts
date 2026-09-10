import { addMonths, padId, todayISO, toISO, addDays, generateEmiDates } from "@/lib/format";
import type {
  Account,
  AdminProfile,
  AppNotification,
  CreditLimitChange,
  Customer,
  DailyClosing,
  DocumentFile,
  Emi,
  Loan,
  Payment,
  Receipt,
  Settings,
  Visit,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Deterministic pseudo random so the demo data is stable across loads */
/* ------------------------------------------------------------------ */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(20260903);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!;
const between = (a: number, b: number) => Math.floor(rand() * (b - a + 1)) + a;
const round = (n: number, to = 100) => Math.round(n / to) * to;

const FIRST = [
  "Ravi",
  "Sunita",
  "Mahesh",
  "Lakshmi",
  "Anil",
  "Prakash",
  "Kavitha",
  "Srinivas",
  "Padma",
  "Venkatesh",
  "Rajesh",
  "Bhavani",
  "Naveen",
  "Swapna",
  "Gopal",
  "Rekha",
  "Suresh",
  "Manjula",
  "Krishna",
  "Deepa",
  "Ramesh",
  "Vijaya",
  "Harish",
  "Sarita",
];
const LAST = [
  "Kumar",
  "Reddy",
  "Sharma",
  "Naidu",
  "Rao",
  "Patel",
  "Yadav",
  "Verma",
  "Chowdary",
  "Prasad",
  "Devi",
  "Singh",
];
const OCCUPATIONS = [
  "Vegetable Vendor",
  "Tailor",
  "Auto Driver",
  "Kirana Store Owner",
  "Dairy Farmer",
  "Carpenter",
  "Tea Stall Owner",
  "Electrician",
  "Milk Vendor",
  "Flower Seller",
  "Mechanic",
  "Fruit Vendor",
];
const AREAS = [
  "Gandhi Nagar",
  "Balaji Colony",
  "Market Road",
  "Sai Nagar",
  "Kothapeta",
  "Vinayaka Street",
  "Ram Nagar",
  "Bus Stand Road",
  "Shivalayam Street",
  "New Colony",
];
const CITIES = [
  ["Kadapa", "YSR Kadapa", "Andhra Pradesh", "516001"],
  ["Nellore", "SPSR Nellore", "Andhra Pradesh", "524001"],
  ["Kurnool", "Kurnool", "Andhra Pradesh", "518001"],
  ["Tirupati", "Chittoor", "Andhra Pradesh", "517501"],
  ["Guntur", "Guntur", "Andhra Pradesh", "522001"],
];
const PURPOSES = [
  "Working capital for shop",
  "Vehicle repair",
  "Household expenses",
  "Stock purchase",
  "Medical expenses",
  "Education fees",
  "Equipment purchase",
  "Festival expenses",
];

const TODAY = todayISO();

/* ---------------------------- Customers ---------------------------- */
export function buildCustomers(): Customer[] {
  const out: Customer[] = [];
  for (let i = 1; i <= 22; i++) {
    const name = `${FIRST[(i * 5) % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
    const city = CITIES[i % CITIES.length]!;
    const status = i === 19 ? "Blocked" : i === 21 ? "Inactive" : "Active";
    out.push({
      id: padId("CUS", 100 + i),
      name,
      guardianName: `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
      mobile: `9${between(100000000, 899999999)}`,
      altMobile: i % 3 === 0 ? `8${between(100000000, 899999999)}` : "",
      dob: `19${between(70, 95)}-${String(between(1, 12)).padStart(2, "0")}-${String(between(1, 28)).padStart(2, "0")}`,
      gender: i % 4 === 0 ? "Female" : "Male",
      occupation: pick(OCCUPATIONS),
      monthlyIncome: round(between(14000, 60000), 500),
      address: {
        house: `${between(1, 9)}-${between(10, 199)}`,
        area: pick(AREAS),
        city: city[0]!,
        district: city[1]!,
        state: city[2]!,
        pin: city[3]!,
        landmark: pick(["Near Water Tank", "Opp. Temple", "Beside School", "Near Bus Stop"]),
      },
      kycType: i % 5 === 0 ? "Voter ID" : "Aadhaar",
      kycNumber: i % 5 === 0 ? `ABC${between(1000000, 9999999)}` : `${between(2000, 9999)} ${between(1000, 9999)} ${between(1000, 9999)}`,
      nominee: {
        name: `${pick(FIRST)} ${LAST[(i * 3) % LAST.length]}`,
        relationship: pick(["Wife", "Husband", "Son", "Daughter", "Brother"]),
        mobile: `9${between(100000000, 899999999)}`,
        address: "Same as customer address",
      },
      guarantor: {
        name: `${pick(FIRST)} ${pick(LAST)}`,
        relationship: pick(["Neighbour", "Friend", "Relative", "Shop Owner"]),
        mobile: `9${between(100000000, 899999999)}`,
        address: `${pick(AREAS)}, ${city[0]}`,
      },
      status: status as Customer["status"],
      createdAt: addMonths(TODAY, -between(3, 30)),
      photoHue: (i * 37) % 360,
    });
  }
  return out;
}

/* ---------------------------- Accounts ----------------------------- */
export function buildAccounts(customers: Customer[]): Account[] {
  return customers.map((c, i) => ({
    id: padId("ACC", 101 + i),
    customerId: c.id,
    creditLimit: round(between(80000, 300000), 10000),
    status: c.status === "Blocked" ? "Suspended" : "Active",
    openedAt: c.createdAt,
  }));
}

/* ------------------------------ Loans ------------------------------ */
export { computeSchedule } from "@/utils/amortization";
import { computeSchedule } from "@/utils/amortization";

export function buildLoans(customers: Customer[], accounts: Account[]): Loan[] {
  const loans: Loan[] = [];
  let n = 100;
  customers.forEach((c, idx) => {
    if (c.status === "Blocked") return;
    const count = idx < 4 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      n += 1;
      const acc = accounts.find((a) => a.customerId === c.id)!;
      const principal = round(between(30000, 150000), 5000);
      const rate = pick([14, 16, 18, 20, 24]);
      const method: Loan["interestMethod"] = idx % 3 === 0 ? "Reducing Balance" : "Flat";

      // Diverse frequencies across loans to demonstrate Monthly, Weekly, Daily
      let frequency: Loan["frequency"] = "Monthly";
      let tenure = pick([6, 10, 12, 12, 18, 24]);
      let startDate: string;
      let firstEmiDate: string;

      if (n === 103 || n === 107) {
        frequency = "Weekly";
        tenure = pick([12, 20, 26]);
        const elapsed = Math.min(tenure - 2, 6);
        startDate = addDays(TODAY, -elapsed * 7 - 7);
        firstEmiDate = addDays(startDate, 7);
      } else if (n === 105) {
        frequency = "Daily";
        tenure = pick([30, 45, 60]);
        const elapsed = Math.min(tenure - 5, 15);
        startDate = addDays(TODAY, -elapsed - 1);
        firstEmiDate = addDays(startDate, 1);
      } else {
        const elapsed = Math.min(tenure - 1, between(1, Math.max(1, tenure - 1)));
        startDate = addMonths(TODAY, -elapsed - 1);
        firstEmiDate = addMonths(startDate, 1);
      }

      const { totalInterest, totalPayable, emiAmount } = computeSchedule({
        principal,
        rate,
        method,
        tenure,
        frequency,
      });

      const emiDates = generateEmiDates(firstEmiDate, frequency, tenure);
      const endDate = emiDates[emiDates.length - 1] ?? firstEmiDate;

      loans.push({
        id: padId("LN", n),
        customerId: c.id,
        accountId: acc.id,
        principal,
        interestRate: rate,
        interestMethod: method,
        processingFee: round(principal * 0.01, 50),
        insurance: round(principal * 0.005, 50),
        tenure,
        frequency,
        emiAmount,
        totalInterest,
        totalPayable,
        startDate,
        firstEmiDate,
        endDate,
        status: "Active",
        purpose: pick(PURPOSES),
        disbursementMethod: "Cash",
        bankTransactionId: "",
      });
    }
  });
  // a few closed loans
  loans.slice(0, 3).forEach((l) => (l.status = "Closed"));
  return loans;
}

/* --------------------------- EMIs & Payments ------------------------ */
export function buildLedger(loans: Loan[]) {
  const emis: Emi[] = [];
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];
  let emiN = 800;
  let payN = 1200;
  let rcpN = 100;
  const year = new Date().getFullYear();

  loans.forEach((loan, li) => {
    // behaviour profile
    const profile = loan.status === "Closed" ? "closed" : li % 7 === 0 ? "overdue" : li % 5 === 0 ? "partial" : "good";
    const emiDates = generateEmiDates(loan.firstEmiDate, loan.frequency, loan.tenure);
    for (let i = 1; i <= loan.tenure; i++) {
      emiN += 1;
      const dueDate = emiDates[i - 1]!;
      const isPast = dueDate < TODAY;
      const isToday = dueDate === TODAY;
      const emi: Emi = {
        id: padId("EMI", emiN),
        loanId: loan.id,
        customerId: loan.customerId,
        emiNo: i,
        dueDate,
        amount: loan.emiAmount,
        paid: 0,
        status: "Upcoming",
      };

      if (profile === "closed") {
        emi.paid = loan.emiAmount;
        emi.status = "Paid";
      } else if (isPast) {
        if (profile === "overdue" && i > loan.tenure - 3) {
          emi.paid = 0;
          emi.status = "Overdue";
        } else if (profile === "partial" && i > loan.tenure - 2) {
          emi.paid = round(loan.emiAmount * 0.6, 100);
          emi.status = "Partial";
        } else {
          emi.paid = loan.emiAmount;
          emi.status = "Paid";
        }
      } else if (isToday) {
        emi.status = "Due";
        if (li % 3 === 0) {
          emi.paid = loan.emiAmount;
          emi.status = "Paid";
        }
      }

      if (emi.paid > 0) {
        payN += 1;
        rcpN += 1;
        const receiptId = `${"RCP"}-${year}-${String(rcpN).padStart(5, "0")}`;
        const paymentId = padId("PAY", payN);
        const method = (["Cash", "Cash", "Cash", "UPI", "UPI", "Bank"] as const)[payN % 6]!;
        const paidOn = isToday ? new Date().toISOString() : `${dueDate}T11:${String(payN % 60).padStart(2, "0")}:00.000Z`;
        payments.push({
          id: paymentId,
          receiptId,
          customerId: loan.customerId,
          loanId: loan.id,
          emiId: emi.id,
          amount: emi.paid,
          method,
          date: paidOn,
          notes: emi.status === "Partial" ? "Part payment collected at doorstep" : "",
          collectedBy: "Admin User",
          reversed: false,
          reversalReason: "",
        });
        receipts.push({
          id: receiptId,
          paymentId,
          customerId: loan.customerId,
          loanId: loan.id,
          amount: emi.paid,
          method,
          date: paidOn,
          status: "Issued",
        });
      }
      emis.push(emi);
    }
  });

  // mark loans overdue when they carry an overdue EMI
  loans.forEach((l) => {
    if (l.status === "Closed") return;
    const hasOverdue = emis.some((e) => e.loanId === l.id && e.status === "Overdue");
    l.status = hasOverdue ? "Overdue" : "Active";
  });

  return { emis, payments, receipts };
}

/* ------------------------------ Visits ------------------------------ */
export function buildVisits(emis: Emi[], loans: Loan[]): Visit[] {
  const visits: Visit[] = [];
  let n = 500;
  const dueToday = emis.filter((e) => e.dueDate === TODAY);
  dueToday.forEach((e, i) => {
    n += 1;
    const paidFull = e.status === "Paid";
    visits.push({
      id: padId("VIS", n),
      customerId: e.customerId,
      loanId: e.loanId,
      date: TODAY,
      dueAmount: e.amount,
      collected: e.paid,
      status: paidFull ? "Paid" : e.paid > 0 ? "Partially Paid" : i % 3 === 0 ? "Planned" : "Visited",
      reason: !paidFull && e.paid === 0 && i % 3 !== 0 ? "Requested more time" : undefined,
      nextVisit: paidFull ? undefined : addDays(TODAY, 2),
      notes: "",
    });
  });
  emis
    .filter((e) => e.status === "Overdue")
    .slice(0, 10)
    .forEach((e, i) => {
      n += 1;
      visits.push({
        id: padId("VIS", n),
        customerId: e.customerId,
        loanId: e.loanId,
        date: addDays(TODAY, -(i + 1)),
        dueAmount: e.amount - e.paid,
        collected: 0,
        status: "Not Paid",
        reason: ["Customer unavailable", "House locked", "Insufficient money", "Requested more time"][i % 4],
        nextVisit: addDays(TODAY, (i % 4) + 1),
        notes: "",
      });
    });
  void loans;
  return visits;
}

/* ---------------------------- Misc seeds ---------------------------- */
export function buildLimitHistory(accounts: Account[], customers: Customer[]): CreditLimitChange[] {
  return accounts.slice(0, 8).map((a, i) => ({
    id: `CLH-${1000 + i}`,
    accountId: a.id,
    customerId: a.customerId,
    oldLimit: a.creditLimit - 20000,
    newLimit: a.creditLimit,
    reason: pick([
      "Consistent on-time repayment history",
      "Income increase verified",
      "Festival season working capital",
      "Requested by customer, field verified",
    ]),
    date: addMonths(TODAY, -(i + 1)),
    changedBy: "Admin User",
    ...(customers.length ? {} : {}),
  }));
}

export function buildDocuments(customers: Customer[], loans: Loan[] = []): DocumentFile[] {
  const docs: DocumentFile[] = [];
  customers.slice(0, 12).forEach((c, i) => {
    const custLoans = loans.filter((l) => l.customerId === c.id);
    const hasLoan = custLoans.length > 0;
    const types: string[] = hasLoan
      ? ["Aadhaar Card", "Address Proof", "Customer Photo", "Loan Agreement"]
      : ["Aadhaar Card", "Address Proof", "Customer Photo"];
    types.slice(0, 2 + (i % 3)).forEach((t, k) => {
      const fileName = `${c.id}-${t.toLowerCase().replace(/ /g, "-")}.pdf`;
      docs.push({
        id: `DOC-${1000 + i * 10 + k}`,
        customerId: c.id,
        loanId: t === "Loan Agreement" && custLoans[0] ? custLoans[0].id : undefined,
        category: k === 0 ? "IDENTITY_KYC" : k === 1 ? "ADDRESS_PROOF" : k === 2 ? "CUSTOMER_PERSONAL" : "LOAN_DOCUMENTS",
        type: t,
        name: `${t} - ${c.name}`,
        fileName,
        sizeKb: between(120, 2400),
        uploadedAt: addMonths(TODAY, -between(1, 12)),
        verificationStatus: i % 2 === 0 ? "Verified" : "Pending",
      });
    });
  });
  return docs;
}

export const defaultAdmin: AdminProfile = {
  accountUniqueId: "ARG-ACC-88204",
  employeeCode: "EMP-001",
  name: "Vikram Sharma",
  role: "Owner",
  email: "admin@aarigocapital.com",
  mobile: "9848012345",
  altPhone: "9848099887",
  department: "Executive & Risk Management",
  branch: "Kadapa Main Branch",
  designation: "Managing Director & Principal Officer",
  joinedDate: "2022-04-01",
  address: "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001",
};

export const defaultSettings: Settings = {
  businessName: "Aarigo Capital",
  businessAddress: "12-4-88, Market Road, Kadapa, Andhra Pradesh 516001",
  businessPhone: "9848012345",
  businessEmail: "admin@aarigocapital.com",
  defaultInterestRate: 18,
  defaultTenure: 12,
  defaultFrequency: "Monthly",
  gracePeriodDays: 0,
  lateFeePerDay: 20,
  methods: { Cash: true, UPI: true, Bank: true },
  receiptFooter: "Thank you for your payment. This is a computer generated receipt.",
  receiptPrefix: `RCP-${new Date().getFullYear()}`,
  notifyOverdue: true,
  notifyDailySummary: true,
};

export function buildNotifications(counts: {
  overdueEmis: number;
  dueToday: number;
  collectedToday: number;
  partialCustomer?: string | undefined;
  partialAmount?: number | undefined;
}): AppNotification[] {
  const now = new Date();
  const iso = (mins: number) => new Date(now.getTime() - mins * 60000).toISOString();
  const list: AppNotification[] = [
    {
      id: "NTF-1",
      title: "Overdue EMIs need attention",
      body: `${counts.overdueEmis} EMIs are overdue.`,
      createdAt: iso(15),
      read: false,
      tone: "danger",
    },
    {
      id: "NTF-2",
      title: "Today's due list ready",
      body: `${counts.dueToday} customers have EMI due today.`,
      createdAt: iso(90),
      read: false,
      tone: "info",
    },
    {
      id: "NTF-3",
      title: "Collection update",
      body: `₹${new Intl.NumberFormat("en-IN").format(counts.collectedToday)} collected today.`,
      createdAt: iso(160),
      read: false,
      tone: "success",
    },
  ];
  if (counts.partialCustomer) {
    list.push({
      id: "NTF-4",
      title: "Partial EMI pending",
      body: `Customer ${counts.partialCustomer} has a pending ₹${new Intl.NumberFormat("en-IN").format(counts.partialAmount ?? 0)} partial EMI.`,
      createdAt: iso(240),
      read: false,
      tone: "warning",
    });
  }
  return list;
}

export function buildDailyClosings(
  emis: Emi[],
  payments: Payment[],
  visits: Visit[],
): DailyClosing[] {
  const closings: DailyClosing[] = [];
  // Build for past 14 days (index 0 = today, index 1 = yesterday, ..., 13 = 13 days ago)
  for (let d = 0; d < 14; d++) {
    const targetDate = addDays(TODAY, -d);
    const dayPayments = payments.filter(
      (p) => p.date.slice(0, 10) === targetDate && !p.reversed,
    );
    const dayEmis = emis.filter((e) => e.dueDate === targetDate);
    const dayVisits = visits.filter((v) => v.date === targetDate);

    // Actual ledger sums for this day
    const actualDue = dayEmis.reduce((s, e) => s + e.amount, 0);
    const actualCollected = dayPayments.reduce((s, p) => s + p.amount, 0);

    const cashPayments = dayPayments.filter((p) => p.method === "Cash");
    const upiPayments = dayPayments.filter((p) => p.method === "UPI");
    const bankPayments = dayPayments.filter((p) => p.method === "Bank");

    const cashAmount = cashPayments.reduce((s, p) => s + p.amount, 0);
    const upiAmount = upiPayments.reduce((s, p) => s + p.amount, 0);
    const bankAmount = bankPayments.reduce((s, p) => s + p.amount, 0);

    // If a day had scheduled EMIs or payments, use exact values.
    // If it was a quiet past day with 0 EMIs, generate realistic historical closing figures
    // so all past days have rich closing audit trails.
    const isToday = d === 0;
    const fallbackDue = 32000 + ((d * 4700) % 28000);
    const fallbackColl = Math.round((fallbackDue * (0.82 + ((d * 7) % 16) / 100)) / 100) * 100;

    const totalDue = actualDue > 0 ? actualDue : (isToday ? actualDue : fallbackDue);
    const totalCollected = actualCollected > 0 ? actualCollected : (isToday ? actualCollected : fallbackColl);
    const shortfall = Math.max(0, totalDue - totalCollected);
    const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalCollected / totalDue) * 100)) : 100;

    const cAmount = cashAmount > 0 ? cashAmount : (isToday ? 0 : Math.round(totalCollected * 0.65));
    const cCount = cashPayments.length > 0 ? cashPayments.length : (isToday ? 0 : 5 + (d % 6));
    const uAmount = upiAmount > 0 ? upiAmount : (isToday ? 0 : Math.round(totalCollected * 0.25));
    const uCount = upiPayments.length > 0 ? upiPayments.length : (isToday ? 0 : 2 + (d % 4));
    const bAmount = bankAmount > 0 ? bankAmount : (isToday ? 0 : totalCollected - cAmount - uAmount);
    const bCount = bankPayments.length > 0 ? bankPayments.length : (isToday ? 0 : 1 + (d % 2));

    const status: "Closed" | "Audited" | "Open" = isToday ? "Open" : d % 4 === 0 ? "Audited" : "Closed";

    closings.push({
      id: `DCL-${targetDate.replace(/-/g, "")}`,
      date: targetDate,
      totalDue,
      totalCollected,
      shortfall,
      collectionRate,
      cashAmount: cAmount,
      cashCount: cCount,
      upiAmount: uAmount,
      upiCount: uCount,
      bankAmount: bAmount,
      bankCount: bCount,
      transactionsCount: dayPayments.length > 0 ? dayPayments.length : cCount + uCount + bCount,
      visitsCount: dayVisits.length > 0 ? dayVisits.length : 8 + (d % 8),
      status,
      closedBy: isToday
        ? "Pending Closing"
        : d % 2 === 0
        ? "Admin User (Cashier Register)"
        : "Rajesh Kumar (Field Supervisor)",
      closedAt: isToday ? "" : `${targetDate}T19:30:00.000Z`,
      notes: isToday
        ? undefined
        : d % 3 === 0
        ? "Physical cash verified with denomination sheet. Bank/UPI settled."
        : "Reconciled with field collector receipts and cash vault handover.",
    });
  }

  return closings;
}

export function buildAll() {
  const customers = buildCustomers();
  const accounts = buildAccounts(customers);
  const loans = buildLoans(customers, accounts);
  const { emis, payments, receipts } = buildLedger(loans);
  const visits = buildVisits(emis, loans);
  const limitHistory = buildLimitHistory(accounts, customers);
  const documents = buildDocuments(customers, loans);
  const dailyClosings = buildDailyClosings(emis, payments, visits);
  return { customers, accounts, loans, emis, payments, receipts, visits, limitHistory, documents, dailyClosings };
}

export const TODAY_ISO = TODAY;
export const YESTERDAY_ISO = toISO(new Date(Date.now() - 86400000));
