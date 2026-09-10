import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildNotifications, computeSchedule, defaultAdmin, defaultSettings } from "@/data/mock";
import { authApi } from "@/services/api/auth.api";
import { customersApi as customerApi } from "@/services/api/customers.api";
import { loansApi as loanApi } from "@/services/api/loans.api";
import { paymentsApi as paymentApi } from "@/services/api/payments.api";
import { visitsApi } from "@/services/api/visits.api";
import { dailyClosingApi } from "@/services/api/daily-closing.api";
import { receiptsApi } from "@/services/api/receipts.api";
import { addMonths, generateEmiDates, padId, safe, todayISO } from "@/lib/format";
import {
  getCustomerCompliance,
  createSeedDocumentForRequirement,
  inferCategoryFromType,
} from "@/utils/document-compliance";
import type {
  Account,
  AdminProfile,
  AppNotification,
  BankDetail,
  CreditLimitChange,
  Customer,
  DailyClosing,
  DisbursementMethod,
  DisbursementRecord,
  DocumentCategory,
  DocumentFile,
  DocumentVerificationStatus,
  EarlyClosureRecord,
  Emi,
  Loan,
  Payment,
  PaymentMethod,
  PromiseToPay,
  Receipt,
  Settings,
  Visit,
} from "@/types";
import { computeAmortizationSchedule } from "@/utils/amortization";

// ─── Legacy localStorage cleanup ──────────────────────────────────────────
function cleanLegacyStorage(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.removeItem("loanflow-hub-store-v1");
    localStorage.removeItem("aarigo-capital-store-v2");
  } catch {
    // Ignore
  }
}
cleanLegacyStorage();

const EMPTY_STORE_DATA = {
  customers: [] as Customer[],
  accounts: [] as Account[],
  loans: [] as Loan[],
  emis: [] as Emi[],
  payments: [] as Payment[],
  receipts: [] as Receipt[],
  visits: [] as Visit[],
  limitHistory: [] as CreditLimitChange[],
  documents: [] as DocumentFile[],
  bankDetails: [] as BankDetail[],
  disbursements: [] as DisbursementRecord[],
  promiseToPay: [] as PromiseToPay[],
  earlyClosures: [] as EarlyClosureRecord[],
  dailyClosings: [] as DailyClosing[],
};

// ─── Counter shape ─────────────────────────────────────────────────────────
interface CounterState {
  customer: number;
  account: number;
  loan: number;
  emi: number;
  payment: number;
  receipt: number;
  visit: number;
  doc: number;
  ptp: number;
  ecl: number;
  bank: number;
  dsb: number;
}

const DEFAULT_COUNTERS: CounterState = {
  customer: 0,
  account: 0,
  loan: 0,
  emi: 0,
  payment: 0,
  receipt: 0,
  visit: 0,
  doc: 0,
  ptp: 0,
  ecl: 0,
  bank: 0,
  dsb: 0,
};

// ─── Input interfaces (exported for use in route files) ────────────────────
export interface NewCustomerInput {
  name: string;
  guardianName: string;
  mobile: string;
  altMobile: string;
  dob: string;
  gender: Customer["gender"];
  occupation: string;
  monthlyIncome: number;
  address: Customer["address"];
  kycType: Customer["kycType"];
  kycNumber: string;
  nominee: Customer["nominee"];
  guarantor: Customer["guarantor"];
  creditLimit: number;
  photo?: string;
}

export interface NewLoanInput {
  customerId: string;
  principal: number;
  interestRate: number;
  interestMethod: Loan["interestMethod"];
  processingFee: number;
  insurance: number;
  tenure: number;
  frequency: Loan["frequency"];
  startDate: string;
  firstEmiDate: string;
  purpose: string;
  disbursementMethod: DisbursementMethod;
  bankTransactionId: string;
}

export interface PaymentInput {
  customerId: string;
  loanId: string;
  emiId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  /** How to handle any amount exceeding the target EMI remaining:
   *  - "next"    → spill excess into subsequent unpaid EMIs
   *  - "advance" → cap at target EMI remaining, treat excess as advance
   *  - omitted   → treat same as "next" (safe default)
   */
  excessAction?: "next" | "advance";
  lateFeePaid?: number;
  lateFeeWaived?: boolean;
}

export interface EarlyCloseLoanInput {
  loanId: string;
  chargePercent: number;
  method: PaymentMethod;
  bankTransactionId?: string;
  notes?: string;
}

// ─── Store interface ───────────────────────────────────────────────────────
interface StoreValue {
  today: string;
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  customers: Customer[];
  accounts: Account[];
  loans: Loan[];
  emis: Emi[];
  payments: Payment[];
  receipts: Receipt[];
  visits: Visit[];
  limitHistory: CreditLimitChange[];
  documents: DocumentFile[];
  bankDetails: BankDetail[];
  disbursements: DisbursementRecord[];
  promiseToPay: PromiseToPay[];
  earlyClosures: EarlyClosureRecord[];
  dailyClosings: DailyClosing[];
  notifications: AppNotification[];
  admin: AdminProfile;
  settings: Settings;

  closeDay: (input: { date: string; notes?: string; status?: "Closed" | "Audited" }) => DailyClosing;
  reopenDay: (date: string) => void;

  addCustomer: (input: NewCustomerInput) => Promise<{ customer: Customer; account: Account }>;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  updateCustomerPhoto: (id: string, photoDataUrl: string) => void;
  addLoan: (input: NewLoanInput) => Promise<Loan>;
  recordPayment: (input: PaymentInput) => Promise<{ payment: Payment; receipt: Receipt }>;
  refreshData: () => Promise<void>;
  loading: boolean;
  reversePayment: (paymentId: string, reason: string) => void;
  updateCreditLimit: (accountId: string, newLimit: number, reason: string) => void;
  upsertVisit: (visit: Partial<Visit> & { id?: string; customerId: string; loanId: string }) => Visit;
  addDocument: (customerId: string, type: DocumentFile["type"], name: string) => void;
  addDocumentFull: (doc: Omit<DocumentFile, "id" | "uploadedAt" | "verificationStatus"> & { verificationStatus?: DocumentFile["verificationStatus"] }) => DocumentFile;
  updateDocumentStatus: (id: string, status: DocumentFile["verificationStatus"], notes?: string) => void;
  deleteDocument: (id: string) => void;
  seedMissingDocuments: (customerId: string, loanId?: string) => number;
  seedAllMissingDocuments: () => number;
  addBankDetail: (detail: Omit<BankDetail, "id" | "verified" | "createdAt">) => BankDetail;
  updateBankDetail: (id: string, patch: Partial<BankDetail>) => void;
  verifyBankDetail: (id: string, notes?: string) => void;
  recordDisbursement: (input: Omit<DisbursementRecord, "id" | "createdAt">) => DisbursementRecord;
  updateDisbursementStatus: (id: string, status: DisbursementRecord["status"], utr?: string, notes?: string) => void;
  updateAdmin: (patch: Partial<AdminProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  markNotificationsRead: () => void;
  closeLoan: (loanId: string) => void;
  earlyCloseLoan: (input: EarlyCloseLoanInput) => { earlyClosure: EarlyClosureRecord; payment: Payment; receipt: Receipt };
  addPromiseToPay: (input: Omit<PromiseToPay, "id" | "createdAt" | "status">) => PromiseToPay;
  updatePromiseToPay: (id: string, patch: Partial<PromiseToPay>) => void;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const today = todayISO();

  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  // Define logout function to clear auth and reset store
  const logout = useCallback(() => {
    // Remove token
    localStorage.removeItem('aarigo_auth_token');
    // Clear persisted store data
    localStorage.removeItem('aarigo-capital-store-v2');
    // Reset all state slices
    setCustomers([]);
    setAccounts([]);
    setLoans([]);
    setEmis([]);
    setPayments([]);
    setReceipts([]);
    setVisits([]);
    setLimitHistory([]);
    setDocuments([]);
    setBankDetails([]);
    setDisbursements([]);
    setPromiseToPay([]);
    setEarlyClosures([]);
    setDailyClosings([]);
    setCounters(DEFAULT_COUNTERS);
    setAdmin(defaultAdmin);
    setSettings(defaultSettings);
    setLoggedIn(false);
  }, []);

  // Listen for unauthorized events from http client
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('unauthorized', handler);
    return () => window.removeEventListener('unauthorized', handler);
  }, [logout]);

  // Restore authenticated session from backend token if present
  useEffect(() => {
    const rawToken = localStorage.getItem("aarigo_auth_token");
    const token =
      rawToken && rawToken !== "undefined" && rawToken !== "null" && rawToken.trim() !== ""
        ? rawToken.trim()
        : null;

    if (token) {
      authApi
        .getMe()
        .then((user) => {
          if (user) {
            // Reset store to clear any previous session data
            setCustomers([]);
            setAccounts([]);
            setLoans([]);
            setEmis([]);
            setPayments([]);
            setReceipts([]);
            setVisits([]);
            setLimitHistory([]);
            setDocuments([]);
            setBankDetails([]);
            setDisbursements([]);
            setPromiseToPay([]);
            setEarlyClosures([]);
            setDailyClosings([]);
            setCounters(DEFAULT_COUNTERS);
            setAdmin(defaultAdmin);
            setSettings(defaultSettings);
            setLoggedIn(true);
            setAdmin((prev) => ({
              ...prev,
              name: user.name || prev.name,
              email: user.email || prev.email,
            }));
          } else {
            localStorage.removeItem('aarigo_auth_token');
            setLoggedIn(false);
          }
        })
        .catch(() => {
          localStorage.removeItem("aarigo_auth_token");
          setLoggedIn(false);
        });
    } else {
      if (rawToken) localStorage.removeItem("aarigo_auth_token");
      setLoggedIn(false);
    }
  }, []);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [emis, setEmis] = useState<Emi[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [limitHistory, setLimitHistory] = useState<CreditLimitChange[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [promiseToPay, setPromiseToPay] = useState<PromiseToPay[]>([]);
  const [earlyClosures, setEarlyClosures] = useState<EarlyClosureRecord[]>([]);
  const [dailyClosings, setDailyClosings] = useState<DailyClosing[]>([]);
  const [admin, setAdmin] = useState<AdminProfile>(defaultAdmin);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [counters, setCounters] = useState<CounterState>(DEFAULT_COUNTERS);

  // ── Authoritative Backend Synchronization ─────────────────────────────────
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, loanRes, payRes, visitRes, closingRes, rctRes] = await Promise.allSettled([
        customerApi.getCustomers({ limit: 1000 }),
        loanApi.getLoans({ limit: 1000 }),
        paymentApi.getPayments({ limit: 1000 }),
        visitsApi.getVisits({ limit: 1000 }),
        dailyClosingApi.getDailyClosings({ limit: 100 }),
        receiptsApi.getReceipts({ limit: 1000 }),
      ]);

      // 1. Sync Customers & Accounts
      if (custRes.status === "fulfilled" && Array.isArray(custRes.value.data)) {
        const rawCustomers = custRes.value.data as any[];
        const mappedCustomers: Customer[] = rawCustomers.map((c, idx) => ({
          id: c.customerCode || c.id,
          name: c.fullName || c.name || "Unnamed",
          guardianName: c.guardianName || "",
          mobile: c.mobile || "",
          altMobile: c.alternateMobile || c.altMobile || "",
          dob: c.dateOfBirth || c.dob || "",
          gender: c.gender === "FEMALE" ? "Female" : c.gender === "OTHER" ? "Other" : "Male",
          occupation: c.occupation || "Employed",
          monthlyIncome: Number(c.monthlyIncome) || 0,
          address: {
            house: c.addressHouse || "",
            area: c.addressArea || (typeof c.address === "string" ? c.address : ""),
            city: c.city || "Pune",
            district: c.district || "Pune",
            state: c.state || "Maharashtra",
            pin: c.pincode || "411001",
            pincode: c.pincode || "411001",
            landmark: c.addressLandmark || "",
          },
          kycType: c.kycType === "PAN" ? "PAN" : c.kycType === "VOTER_ID" ? "Voter ID" : c.kycType === "DRIVING_LICENCE" ? "Driving Licence" : "Aadhaar",
          kycNumber: c.kycNumber || "",
          nominee: {
            name: c.nomineeName || "",
            relationship: c.nomineeRelationship || "",
            mobile: c.nomineeMobile || "",
            address: c.nomineeAddress || "",
          },
          guarantor: {
            name: c.guarantorName || "",
            relationship: c.guarantorRelationship || "",
            mobile: c.guarantorMobile || "",
            address: c.guarantorAddress || "",
          },
          status: c.status === "BLOCKED" ? "Blocked" : c.status === "INACTIVE" ? "Inactive" : "Active",
          createdAt: c.createdAt ? String(c.createdAt).slice(0, 10) : today,
          photoHue: (idx * 37) % 360,
        }));
        setCustomers(mappedCustomers);

        const mappedAccounts: Account[] = mappedCustomers.map((c, idx) => ({
          id: `ACC-${String(idx + 1).padStart(6, "0")}`,
          customerId: c.id,
          creditLimit: Math.max(50000, c.monthlyIncome * 3),
          status: "Active",
          openedAt: c.createdAt,
        }));
        setAccounts(mappedAccounts);
      }

      // 2. Sync Loans & EMIs
      if (loanRes.status === "fulfilled" && Array.isArray(loanRes.value.data)) {
        const rawLoans = loanRes.value.data as any[];
        const mappedLoans: Loan[] = [];
        const mappedEmis: Emi[] = [];

        rawLoans.forEach((l, idx) => {
          const loanId = l.loanNumber || l.id;
          const customerId = l.customer?.customerCode || l.customerId;
          const emiAmt = Number(l.emiAmount) || 0;
          const prin = Number(l.principalAmount) || 0;
          const totPay = Number(l.totalPayable) || 0;
          const totInt = Number(l.totalInterest) || (totPay - prin);

          mappedLoans.push({
            id: loanId,
            customerId,
            accountId: `ACC-${String(idx + 1).padStart(6, "0")}`,
            principal: prin,
            interestRate: Number(l.interestRate) || 0,
            interestMethod: l.interestType === "REDUCING" ? "Reducing Balance" : "Flat",
            processingFee: Number(l.processingFee) || 0,
            insurance: Number(l.insurance) || 0,
            tenure: Number(l.tenure) || 12,
            frequency: l.frequency === "DAILY" ? "Daily" : l.frequency === "WEEKLY" ? "Weekly" : "Monthly",
            emiAmount: emiAmt,
            totalInterest: totInt,
            totalPayable: totPay,
            startDate: l.startDate ? String(l.startDate).slice(0, 10) : today,
            firstEmiDate: l.firstDueDate ? String(l.firstDueDate).slice(0, 10) : today,
            endDate: l.maturityDate ? String(l.maturityDate).slice(0, 10) : today,
            status: l.status === "CLOSED" ? "Closed" : l.status === "OVERDUE" ? "Overdue" : "Active",
            purpose: l.purpose || "Personal / Business",
            disbursementMethod: (l.disbursementMethod as any) || "Bank Transfer",
            bankTransactionId: l.bankTransactionId || undefined,
          });

          if (Array.isArray(l.installments)) {
            l.installments.forEach((inst: any) => {
              mappedEmis.push({
                id: inst.id,
                loanId,
                customerId,
                emiNo: inst.installmentNumber,
                dueDate: inst.dueDate ? String(inst.dueDate).slice(0, 10) : today,
                amount: Number(inst.totalAmount) || 0,
                paid: Number(inst.paidAmount) || 0,
                status: inst.status === "PAID" ? "Paid" : inst.status === "PARTIAL" ? "Partial" : inst.status === "OVERDUE" ? "Overdue" : "Due",
                lateFee: Number(inst.lateFee) || 0,
                lateFeePaid: Number(inst.lateFeePaid) || 0,
                lateFeeWaived: Boolean(inst.lateFeeWaived),
              });
            });
          }
        });

        setLoans(mappedLoans);
        setEmis(mappedEmis);
      }

      // 3. Sync Payments
      if (payRes.status === "fulfilled" && Array.isArray(payRes.value.data)) {
        const rawPayments = payRes.value.data as any[];
        const mappedPayments: Payment[] = rawPayments.map((p) => ({
          id: p.paymentNumber || p.id,
          receiptId: p.receipt?.receiptNumber || `RCP-${p.paymentNumber || p.id}`,
          loanId: p.loan?.loanNumber || p.loanId,
          customerId: p.customer?.customerCode || p.customerId,
          emiId: p.emiId || "",
          amount: Number(p.amount) || 0,
          date: p.paymentDate ? String(p.paymentDate).slice(0, 10) : today,
          method: (p.paymentMethod === "UPI" ? "UPI" : p.paymentMethod === "BANK_TRANSFER" ? "Bank" : "Cash") as PaymentMethod,
          notes: p.notes || "",
          collectedBy: p.createdBy?.name || "Operations Staff",
          reversed: Boolean(p.isReversed),
          reversalReason: p.reversalReason || "",
        }));
        setPayments(mappedPayments);
      }

      // 4. Sync Receipts
      if (rctRes.status === "fulfilled" && Array.isArray(rctRes.value.data)) {
        const rawReceipts = rctRes.value.data as any[];
        const mappedReceipts: Receipt[] = rawReceipts.map((r, idx) => ({
          id: r.receiptNumber || r.id || `RCT-${String(idx + 1).padStart(6, "0")}`,
          paymentId: r.payment?.paymentNumber || r.paymentId,
          loanId: r.loan?.loanNumber || r.loanId,
          customerId: r.payment?.customer?.customerCode || r.loan?.customer?.customerCode || "",
          amount: Number(r.payment?.amount) || 0,
          date: r.generatedAt ? String(r.generatedAt).slice(0, 10) : today,
          method: (r.payment?.paymentMethod === "UPI" ? "UPI" : r.payment?.paymentMethod === "BANK_TRANSFER" ? "Bank" : "Cash") as PaymentMethod,
          status: (r.status === "CANCELLED" ? "Cancelled" : "Issued") as "Cancelled" | "Issued",
        }));
        setReceipts(mappedReceipts);
      }

      // 5. Sync Visits
      if (visitRes.status === "fulfilled" && Array.isArray(visitRes.value.data)) {
        const rawVisits = visitRes.value.data as any[];
        const mappedVisits: Visit[] = rawVisits.map((v) => ({
          id: v.id,
          customerId: v.customer?.customerCode || v.customerId,
          loanId: v.loan?.loanNumber || v.loanId,
          date: v.visitDate ? String(v.visitDate).slice(0, 10) : today,
          status: v.status === "VISITED" ? "Visited" : v.status === "PAID" ? "Paid" : v.status === "PARTIALLY_PAID" ? "Partially Paid" : v.status === "NOT_PAID" ? "Not Paid" : "Planned",
          purpose: v.purpose || "Collection Follow-up",
          notes: v.notes || "",
          location: v.location || "",
          dueAmount: Number(v.dueAmount) || 0,
          collected: Number(v.collected) || 0,
          nextVisit: v.nextVisit || undefined,
        }));
        setVisits(mappedVisits);
      }

      // 6. Sync Daily Closings
      if (closingRes.status === "fulfilled" && Array.isArray(closingRes.value.data)) {
        const rawClosings = closingRes.value.data as any[];
        const mappedClosings: DailyClosing[] = rawClosings.map((dc) => ({
          id: dc.id,
          date: dc.closingDate ? String(dc.closingDate).slice(0, 10) : today,
          totalDue: Number(dc.totalDue || dc.totalCollections) || 0,
          totalCollected: Number(dc.totalCollected || dc.totalCollections) || 0,
          shortfall: Number(dc.shortfall) || 0,
          collectionRate: Number(dc.collectionRate) || 100,
          cashAmount: Number(dc.cashAmount) || 0,
          cashCount: Number(dc.cashCount) || 0,
          upiAmount: Number(dc.upiAmount) || 0,
          upiCount: Number(dc.upiCount) || 0,
          bankAmount: Number(dc.bankAmount) || 0,
          bankCount: Number(dc.bankCount) || 0,
          transactionsCount: Number(dc.transactionsCount || dc.totalTransactions) || 0,
          visitsCount: Number(dc.visitsCount) || 0,
          status: (dc.status === "CLOSED" ? "Closed" : "Open") as "Closed" | "Open",
          closedAt: dc.closedAt || undefined,
          closedBy: dc.closedBy || "Admin",
          notes: dc.notes || undefined,
        }));
        setDailyClosings(mappedClosings);
      }
    } catch (err) {
      console.warn("Could not sync authoritative backend data:", err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    if (loggedIn) {
      void refreshData();
    }
  }, [loggedIn, refreshData]);

  // ── Notifications (computed from live state) ──────────────────────────────
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const notifications = useMemo(() => {
    const overdueEmis = emis.filter((e) => e.status === "Overdue").length;
    const dueToday = new Set(emis.filter((e) => e.dueDate === today).map((e) => e.customerId)).size;
    const collectedToday = payments
      .filter((p) => p.date.slice(0, 10) === today)
      .reduce((s, p) => s + p.amount, 0);
    const partial = emis.find((e) => e.status === "Partial");
    const partialCustomer = partial
      ? customers.find((c) => c.id === partial.customerId)?.name.split(" ")[0]
      : undefined;
    const raw = buildNotifications({
      overdueEmis,
      dueToday,
      collectedToday,
      partialCustomer,
      partialAmount: partial ? partial.amount - partial.paid : 0,
    });
    return raw.map((n) => ({
      ...n,
      read: readNotifIds.has(n.id) || n.read,
    }));
  }, [emis, payments, customers, today, readNotifIds]);

  // ── ID helpers ────────────────────────────────────────────────────────────
  const nextId = useCallback((key: keyof CounterState) => {
    let value = 0;
    setCounters((c) => {
      value = c[key] + 1;
      return { ...c, [key]: value };
    });
    return value;
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const addCustomer = useCallback<StoreValue["addCustomer"]>(
    async (input) => {
      const cleanAddress = [input.address.house, input.address.area, input.address.landmark]
        .map((s) => (s || "").trim())
        .filter(Boolean)
        .join(", ") || "Main Street";

      // 1. Persist directly to backend MySQL database first
      const res = await customerApi.createCustomer({
        fullName: input.name.trim(),
        mobile: input.mobile.trim(),
        alternateMobile: input.altMobile?.trim() || undefined,
        address: cleanAddress,
        city: (input.address.city || "Pune").trim(),
        state: (input.address.state || "Maharashtra").trim(),
        pincode: (input.address.pincode || input.address.pin || "411001").trim(),
        occupation: input.occupation?.trim() || undefined,
        monthlyIncome: input.monthlyIncome || undefined,
        kycType: input.kycType as any,
        kycNumber: input.kycNumber?.trim() || undefined,
        guarantorName: input.guarantor?.name?.trim() || undefined,
        guarantorMobile: input.guarantor?.mobile?.trim() || undefined,
        guarantorRelationship: input.guarantor?.relationship?.trim() || undefined,
        guarantorAddress: input.guarantor?.address?.trim() || undefined,
      });

      const dbCust = res?.data as any;
      const realId = dbCust?.customerCode || dbCust?.id || padId("CUS", counters.customer + 1);

      const customer: Customer = {
        id: realId,
        name: input.name,
        guardianName: input.guardianName,
        mobile: input.mobile,
        altMobile: input.altMobile,
        dob: input.dob,
        gender: input.gender,
        occupation: input.occupation,
        monthlyIncome: safe(input.monthlyIncome),
        address: input.address,
        kycType: input.kycType,
        kycNumber: input.kycNumber,
        nominee: input.nominee,
        guarantor: input.guarantor,
        status: "Active",
        createdAt: today,
        photoHue: ((counters.customer + 1) * 37) % 360,
      };

      const account: Account = {
        id: padId("ACC", counters.account + 1),
        customerId: customer.id,
        creditLimit: Math.max(0, safe(input.creditLimit)),
        status: "Active",
        openedAt: today,
      };

      setCustomers((prev) => [customer, ...prev]);
      setAccounts((prev) => [account, ...prev]);
      setCounters((c) => ({ ...c, customer: c.customer + 1, account: c.account + 1 }));

      void refreshData();

      return { customer, account };
    },
    [counters.customer, counters.account, today, refreshData],
  );

  const updateCustomer = useCallback<StoreValue["updateCustomer"]>((id, patch) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addLoan = useCallback<StoreValue["addLoan"]>(
    async (input) => {
      // 1. Persist directly to backend MySQL database first
      const res = await loanApi.createLoan({
        customerId: input.customerId,
        principalAmount: input.principal,
        interestRate: input.interestRate,
        interestType: String(input.interestMethod).toLowerCase().includes("reduc") ? "REDUCING" : "FLAT",
        tenure: input.tenure,
        frequency: (input.frequency ? input.frequency.toUpperCase() : "MONTHLY") as any,
        startDate: input.startDate,
        firstDueDate: input.firstEmiDate,
        processingFee: safe(input.processingFee),
        purpose: input.purpose,
        disbursementMethod: input.disbursementMethod,
        bankTransactionId: input.bankTransactionId,
      });

      const dbLoan = res?.data as any;
      const realLoanId = dbLoan?.loanNumber || dbLoan?.id || padId("LN", counters.loan + 1);

      const account = accounts.find((a) => a.customerId === input.customerId);
      const { totalInterest, totalPayable, emiAmount } = computeSchedule({
        principal: input.principal,
        rate: input.interestRate,
        method: input.interestMethod,
        tenure: input.tenure,
        frequency: input.frequency,
      });

      const emiDates = generateEmiDates(input.firstEmiDate, input.frequency, input.tenure);
      const endDate = emiDates[emiDates.length - 1] ?? input.firstEmiDate;

      const loan: Loan = {
        id: realLoanId,
        customerId: input.customerId,
        accountId: account?.id ?? "",
        principal: input.principal,
        interestRate: input.interestRate,
        interestMethod: input.interestMethod,
        processingFee: safe(input.processingFee),
        insurance: safe(input.insurance),
        tenure: input.tenure,
        frequency: input.frequency,
        emiAmount: Number(dbLoan?.emiAmount) || emiAmount,
        totalInterest: Number(dbLoan?.totalInterest) || totalInterest,
        totalPayable: Number(dbLoan?.totalPayable) || totalPayable,
        startDate: input.startDate,
        firstEmiDate: input.firstEmiDate,
        endDate,
        status: "Active",
        purpose: input.purpose,
        disbursementMethod: input.disbursementMethod,
        bankTransactionId: input.bankTransactionId,
      };

      setLoans((prev) => [loan, ...prev]);
      setCounters((c) => ({ ...c, loan: c.loan + 1 }));

      await refreshData();

      return loan;
    },
    [accounts, counters.loan, refreshData],
  );

  const recordPayment = useCallback<StoreValue["recordPayment"]>(
    async (input) => {
      const amount = Math.max(0, safe(input.amount));

      // 1. Persist directly to backend MySQL database first
      const res = await paymentApi.recordPayment({
        loanId: input.loanId,
        amount,
        paymentMethod: input.method,
        notes: input.notes || "EMI Collection",
      });

      const dbPay = res?.data as any;
      const realPaymentId = dbPay?.paymentNumber || dbPay?.id || padId("PAY", counters.payment + 1);
      const realReceiptId = dbPay?.receipt?.receiptNumber || `${settings.receiptPrefix}-${String(counters.receipt + 1).padStart(5, "0")}`;
      const nowIso = new Date().toISOString();

      const payment: Payment = {
        id: realPaymentId,
        receiptId: realReceiptId,
        customerId: input.customerId,
        loanId: input.loanId,
        emiId: input.emiId,
        amount,
        method: input.method,
        date: nowIso,
        notes: input.notes,
        collectedBy: admin.name,
        reversed: false,
        reversalReason: "",
        lateFeePaid: input.lateFeePaid,
        lateFeeWaived: input.lateFeeWaived,
      };

      const receipt: Receipt = {
        id: realReceiptId,
        paymentId: realPaymentId,
        customerId: input.customerId,
        loanId: input.loanId,
        amount,
        method: input.method,
        date: nowIso,
        status: "Issued",
        lateFeePaid: input.lateFeePaid,
      };

      setPayments((prev) => [payment, ...prev]);
      setReceipts((prev) => [receipt, ...prev]);
      setCounters((c) => ({ ...c, payment: c.payment + 1, receipt: c.receipt + 1 }));

      await refreshData();

      return { payment, receipt };
    },
    [admin.name, counters.payment, counters.receipt, settings.receiptPrefix, refreshData],
  );

  const reversePayment = useCallback<StoreValue["reversePayment"]>(
    (paymentId, reason) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment || payment.reversed) return;

      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, reversed: true, reversalReason: reason } : p)),
      );
      setReceipts((prev) =>
        prev.map((r) => (r.paymentId === paymentId ? { ...r, status: "Cancelled" } : r)),
      );
      setEmis((prev) =>
        prev.map((e) => {
          if (e.id !== payment.emiId) return e;
          const newPaid = Math.max(0, e.paid - payment.amount);
          const status: Emi["status"] =
            newPaid >= e.amount
              ? "Paid"
              : newPaid > 0
              ? "Partial"
              : e.dueDate < today
              ? "Overdue"
              : e.dueDate === today
              ? "Due"
              : "Upcoming";
          return { ...e, paid: newPaid, status };
        }),
      );
    },
    [payments, today],
  );

  const updateCreditLimit = useCallback<StoreValue["updateCreditLimit"]>(
    (accountId, newLimit, reason) => {
      const limit = Math.max(0, safe(newLimit));
      setAccounts((prev) => {
        const acc = prev.find((a) => a.id === accountId);
        if (acc) {
          setLimitHistory((h) => [
            {
              id: `CLH-${Date.now()}`,
              accountId,
              customerId: acc.customerId,
              oldLimit: acc.creditLimit,
              newLimit: limit,
              reason,
              date: today,
              changedBy: admin.name,
            },
            ...h,
          ]);
        }
        return prev.map((a) => (a.id === accountId ? { ...a, creditLimit: limit } : a));
      });
    },
    [admin.name, today],
  );

  const upsertVisit = useCallback<StoreValue["upsertVisit"]>(
    (input) => {
      let result: Visit | null = null;
      setVisits((prev) => {
        if (input.id && prev.some((v) => v.id === input.id)) {
          const next = prev.map((v) => {
            if (v.id !== input.id) return v;
            const updated: Visit = { ...v, ...input } as Visit;
            result = updated;
            return updated;
          });
          return next;
        }
        const n = counters.visit + 1;
        setCounters((c) => ({ ...c, visit: n }));
        result = {
          id: padId("VIS", n),
          customerId: input.customerId,
          loanId: input.loanId,
          date: input.date ?? today,
          dueAmount: safe(input.dueAmount),
          collected: safe(input.collected),
          status: input.status ?? "Planned",
          reason: input.reason,
          nextVisit: input.nextVisit,
          notes: input.notes ?? "",
        };
        return [result, ...prev];
      });
      return (
        result ?? {
          id: padId("VIS", counters.visit + 1),
          customerId: input.customerId,
          loanId: input.loanId,
          date: today,
          dueAmount: 0,
          collected: 0,
          status: "Planned" as const,
        }
      );
    },
    [counters.visit, today],
  );

  const updateCustomerPhoto = useCallback<StoreValue["updateCustomerPhoto"]>((id, photoDataUrl) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, photo: photoDataUrl } : c)));
  }, []);

  const addDocument = useCallback<StoreValue["addDocument"]>(
    (customerId, type, name) => {
      const n = counters.doc + 1;
      setCounters((c) => ({ ...c, doc: n }));
      const cat = inferCategoryFromType(`${type} ${name}`);
      setDocuments((prev) => [
        {
          id: `DOC-${padId("DOC", n)}`,
          customerId,
          category: cat,
          type,
          name,
          fileName: `${type.toLowerCase().replace(/\s+/g, "_")}.pdf`,
          sizeKb: Math.floor(120 + Math.random() * 2000),
          uploadedAt: today,
          verificationStatus: "Pending",
        },
        ...prev,
      ]);
    },
    [counters.doc, today],
  );

  const addDocumentFull = useCallback<StoreValue["addDocumentFull"]>(
    (docInput) => {
      const n = counters.doc + 1;
      setCounters((c) => ({ ...c, doc: n }));
      const newDoc: DocumentFile = {
        id: `DOC-${padId("DOC", n)}`,
        customerId: docInput.customerId,
        ...(docInput.loanId ? { loanId: docInput.loanId } : {}),
        category: docInput.category || inferCategoryFromType(`${docInput.type} ${docInput.name}`),
        type: docInput.type || "Document",
        name: docInput.name || docInput.fileName || "Document",
        fileName: docInput.fileName || "file.pdf",
        sizeKb: docInput.sizeKb || 250,
        uploadedAt: today,
        ...(docInput.documentNumber ? { documentNumber: docInput.documentNumber } : {}),
        ...(docInput.expiryDate ? { expiryDate: docInput.expiryDate } : {}),
        verificationStatus: docInput.verificationStatus || "Pending",
        ...(docInput.verificationNotes ? { verificationNotes: docInput.verificationNotes } : {}),
        ...(docInput.fileData ? { fileData: docInput.fileData } : {}),
      };
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    [counters.doc, today],
  );

  const updateDocumentStatus = useCallback<StoreValue["updateDocumentStatus"]>((id, status, notes) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const updated: DocumentFile = {
          ...d,
          verificationStatus: status,
          ...(notes ? { verificationNotes: notes } : {}),
        };
        return updated;
      }),
    );
  }, []);

  const deleteDocument = useCallback<StoreValue["deleteDocument"]>((id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const seedMissingDocuments = useCallback<StoreValue["seedMissingDocuments"]>(
    (customerId, loanId) => {
      const cust = customers.find((c) => c.id === customerId);
      if (!cust) return 0;
      const report = getCustomerCompliance(cust, documents, loans, loanId);
      if (report.missingRequirements.length === 0) return 0;

      let docCounter = counters.doc;
      const newDocs: DocumentFile[] = [];

      report.missingRequirements.forEach((req) => {
        docCounter += 1;
        const seedInput = createSeedDocumentForRequirement(cust, req, loanId);
        newDocs.push({
          id: `DOC-${padId("DOC", docCounter)}`,
          customerId: seedInput.customerId,
          ...(seedInput.loanId ? { loanId: seedInput.loanId } : {}),
          category: seedInput.category,
          type: seedInput.type,
          name: seedInput.name,
          fileName: seedInput.fileName,
          sizeKb: seedInput.sizeKb,
          uploadedAt: today,
          ...(seedInput.documentNumber ? { documentNumber: seedInput.documentNumber } : {}),
          verificationStatus: seedInput.verificationStatus,
          verificationNotes: seedInput.verificationNotes,
        });
      });

      setCounters((c) => ({ ...c, doc: docCounter }));
      setDocuments((prev) => [...newDocs, ...prev]);
      return newDocs.length;
    },
    [counters.doc, customers, documents, loans, today],
  );

  const seedAllMissingDocuments = useCallback<StoreValue["seedAllMissingDocuments"]>(() => {
    let docCounter = counters.doc;
    const allNewDocs: DocumentFile[] = [];

    customers.forEach((cust) => {
      const report = getCustomerCompliance(cust, [...allNewDocs, ...documents], loans);
      report.missingRequirements.forEach((req) => {
        docCounter += 1;
        const seedInput = createSeedDocumentForRequirement(cust, req);
        allNewDocs.push({
          id: `DOC-${padId("DOC", docCounter)}`,
          customerId: seedInput.customerId,
          category: seedInput.category,
          type: seedInput.type,
          name: seedInput.name,
          fileName: seedInput.fileName,
          sizeKb: seedInput.sizeKb,
          uploadedAt: today,
          ...(seedInput.documentNumber ? { documentNumber: seedInput.documentNumber } : {}),
          verificationStatus: seedInput.verificationStatus,
          verificationNotes: seedInput.verificationNotes,
        });
      });
    });

    if (allNewDocs.length > 0) {
      setCounters((c) => ({ ...c, doc: docCounter }));
      setDocuments((prev) => [...allNewDocs, ...prev]);
    }
    return allNewDocs.length;
  }, [counters.doc, customers, documents, loans, today]);

  const addBankDetail = useCallback<StoreValue["addBankDetail"]>(
    (input) => {
      const n = counters.bank + 1;
      setCounters((c) => ({ ...c, bank: n }));
      const newBank: BankDetail = {
        id: padId("BNK", n),
        customerId: input.customerId,
        holderName: input.holderName,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        ifsc: input.ifsc.toUpperCase(),
        ...(input.branch ? { branch: input.branch } : {}),
        accountType: input.accountType,
        ...(input.upiId ? { upiId: input.upiId } : {}),
        verified: false,
        createdAt: today,
      };
      setBankDetails((prev) => [newBank, ...prev]);
      return newBank;
    },
    [counters.bank, today],
  );

  const updateBankDetail = useCallback<StoreValue["updateBankDetail"]>((id, patch) => {
    setBankDetails((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const verifyBankDetail = useCallback<StoreValue["verifyBankDetail"]>((id, notes) => {
    setBankDetails((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              verified: true,
              verificationDate: today,
              verificationNotes: notes || "Manually verified by admin",
            }
          : b,
      ),
    );
  }, [today]);

  const recordDisbursement = useCallback<StoreValue["recordDisbursement"]>(
    (input) => {
      const n = counters.dsb + 1;
      setCounters((c) => ({ ...c, dsb: n }));
      const record: DisbursementRecord = {
        id: padId("DSB", n),
        loanId: input.loanId,
        customerId: input.customerId,
        approvedAmount: input.approvedAmount,
        disbursementAmount: input.disbursementAmount,
        method: input.method,
        date: input.date || today,
        ...(input.bankName ? { bankName: input.bankName } : {}),
        ...(input.accountHolder ? { accountHolder: input.accountHolder } : {}),
        ...(input.maskedAccount ? { maskedAccount: input.maskedAccount } : {}),
        ...(input.ifsc ? { ifsc: input.ifsc } : {}),
        ...(input.utr ? { utr: input.utr } : {}),
        status: input.status || "Successful",
        ...(input.notes ? { notes: input.notes } : {}),
        ...(input.proofDocumentId ? { proofDocumentId: input.proofDocumentId } : {}),
        ...(input.proofFileName ? { proofFileName: input.proofFileName } : {}),
        createdAt: today,
      };
      setDisbursements((prev) => [record, ...prev]);

      // Attach to loan
      setLoans((prev) =>
        prev.map((l) => (l.id === input.loanId ? { ...l, disbursement: record } : l)),
      );

      return record;
    },
    [counters.dsb, today],
  );

  const updateDisbursementStatus = useCallback<StoreValue["updateDisbursementStatus"]>(
    (id, status, utr, notes) => {
      setDisbursements((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status,
                ...(utr ? { utr } : {}),
                ...(notes ? { notes } : {}),
              }
            : d,
        ),
      );
      setLoans((prev) =>
        prev.map((l) => {
          if (l.disbursement?.id === id) {
            const updatedDisb: DisbursementRecord = {
              ...l.disbursement,
              status,
              ...(utr ? { utr } : {}),
              ...(notes ? { notes } : {}),
            };
            return {
              ...l,
              disbursement: updatedDisb,
            };
          }
          return l;
        }),
      );
    },
    [],
  );

  const closeLoan = useCallback<StoreValue["closeLoan"]>((loanId) => {
    setLoans((prev) => prev.map((l) => (l.id === loanId ? { ...l, status: "Closed" } : l)));
  }, []);

  const earlyCloseLoan = useCallback<StoreValue["earlyCloseLoan"]>(
    (input) => {
      const targetLoan = loans.find((l) => l.id === input.loanId);
      if (!targetLoan) throw new Error("Loan not found");

      // Compute precise outstanding principal using amortization schedule
      const sched = computeAmortizationSchedule(targetLoan, emis, payments);
      const outstandingPrincipal = sched.outstandingPrincipal;
      const chargePercent = Math.max(0, safe(input.chargePercent));
      const chargeAmount = Math.round((outstandingPrincipal * chargePercent) / 100);
      const finalClosureAmount = outstandingPrincipal + chargeAmount;

      const pNum = counters.payment + 1;
      const rNum = counters.receipt + 1;
      const eNum = (counters.ecl ?? 100) + 1;

      const paymentId = padId("PAY", pNum);
      const receiptId = `${settings.receiptPrefix}-${String(rNum).padStart(5, "0")}`;
      const eclId = padId("ECL", eNum);
      const nowIso = new Date().toISOString();

      const earlyClosure: EarlyClosureRecord = {
        id: eclId,
        loanId: targetLoan.id,
        customerId: targetLoan.customerId,
        accountId: targetLoan.accountId,
        closureDate: nowIso,
        originalLoanAmount: targetLoan.principal,
        outstandingPrincipal,
        earlyClosureChargePercent: chargePercent,
        earlyClosureCharge: chargeAmount,
        futureInterestCharged: 0,
        finalClosureAmount,
        paymentMethod: input.method,
        bankTransactionId: input.bankTransactionId || "",
        paymentId,
        receiptId,
        notes: input.notes || "Early loan foreclosure settlement",
        status: "Closed Early",
      };

      const payment: Payment = {
        id: paymentId,
        receiptId,
        customerId: targetLoan.customerId,
        loanId: targetLoan.id,
        emiId: "",
        amount: finalClosureAmount,
        method: input.method,
        date: nowIso,
        notes: input.notes || `Early Closure Settlement: Principal ₹${outstandingPrincipal} + Charge ₹${chargeAmount}`,
        collectedBy: admin.name,
        reversed: false,
        reversalReason: "",
        isEarlyClosure: true,
        earlyClosureChargePercent: chargePercent,
        earlyClosureCharge: chargeAmount,
        outstandingPrincipal,
        finalClosureAmount,
        bankTransactionId: input.bankTransactionId || "",
      };

      const receipt: Receipt = {
        id: receiptId,
        paymentId,
        customerId: targetLoan.customerId,
        loanId: targetLoan.id,
        amount: finalClosureAmount,
        method: input.method,
        date: nowIso,
        status: "Issued",
      };

      // 1. Update loan status to 'Closed Early' and attach closure record
      setLoans((prev) =>
        prev.map((l) =>
          l.id === targetLoan.id
            ? { ...l, status: "Closed Early", earlyClosure }
            : l,
        ),
      );

      // 2. Mark all unpaid/future EMIs as Cancelled with note
      // (previously paid EMIs remain unchanged)
      setEmis((prev) =>
        prev.map((e) => {
          if (e.loanId !== targetLoan.id) return e;
          if (e.status === "Paid" || e.paid >= e.amount) return e;
          return {
            ...e,
            status: "Cancelled",
            remarks: "Cancelled - Early Closure",
          };
        }),
      );

      // 3. Append payment and receipt
      setPayments((prev) => [payment, ...prev]);
      setReceipts((prev) => [receipt, ...prev]);
      setEarlyClosures((prev) => [earlyClosure, ...prev]);

      // 4. Update visit history
      setVisits((prev) => {
        const newVisit: Visit = {
          id: padId("VIS", counters.visit + 1),
          customerId: targetLoan.customerId,
          loanId: targetLoan.id,
          date: today,
          dueAmount: outstandingPrincipal,
          collected: finalClosureAmount,
          status: "Paid",
          notes: `Early loan foreclosure settled.`,
          paymentId,
          receiptId,
        };
        return [newVisit, ...prev];
      });

      // 5. Add notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: "Loan Closed Early",
          body: `Loan ${targetLoan.id} closed early with final settlement of ₹${finalClosureAmount.toLocaleString("en-IN")}. Future interest waived.`,
          createdAt: nowIso,
          read: false,
          tone: "success",
        },
        ...prev,
      ]);

      setCounters((c) => ({
        ...c,
        payment: pNum,
        receipt: rNum,
        visit: c.visit + 1,
        ecl: eNum,
      }));

      return { earlyClosure, payment, receipt };
    },
    [admin.name, counters.ecl, counters.payment, counters.receipt, counters.visit, emis, loans, payments, settings.receiptPrefix, today],
  );

  const addPromiseToPay = useCallback<StoreValue["addPromiseToPay"]>(
    (input) => {
      const n = counters.ptp + 1;
      setCounters((c) => ({ ...c, ptp: n }));
      const ptp: PromiseToPay = {
        id: padId("PTP", n),
        ...input,
        status: "Pending",
        createdAt: today,
      };
      setPromiseToPay((prev) => [ptp, ...prev]);
      return ptp;
    },
    [counters.ptp, today],
  );

  const updatePromiseToPay = useCallback<StoreValue["updatePromiseToPay"]>((id, patch) => {
    setPromiseToPay((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const closeDay = useCallback<StoreValue["closeDay"]>(
    ({ date, notes, status = "Closed" }) => {
      const dayPayments = payments.filter((p) => p.date.slice(0, 10) === date && !p.reversed);
      const dayEmis = emis.filter((e) => e.dueDate === date);
      const dayVisits = visits.filter((v) => v.date === date);

      const totalDue = dayEmis.reduce((s, e) => s + e.amount, 0);
      const totalCollected = dayPayments.reduce((s, p) => s + p.amount, 0);
      const shortfall = Math.max(0, totalDue - totalCollected);
      const collectionRate = totalDue > 0 ? Math.min(100, Math.round((totalCollected / totalDue) * 100)) : 100;

      const cashPayments = dayPayments.filter((p) => p.method === "Cash");
      const upiPayments = dayPayments.filter((p) => p.method === "UPI");
      const bankPayments = dayPayments.filter((p) => p.method === "Bank");

      const cashAmount = cashPayments.reduce((s, p) => s + p.amount, 0);
      const upiAmount = upiPayments.reduce((s, p) => s + p.amount, 0);
      const bankAmount = bankPayments.reduce((s, p) => s + p.amount, 0);

      const record: DailyClosing = {
        id: `DCL-${date.replace(/-/g, "")}`,
        date,
        totalDue,
        totalCollected,
        shortfall,
        collectionRate,
        cashAmount,
        cashCount: cashPayments.length,
        upiAmount,
        upiCount: upiPayments.length,
        bankAmount,
        bankCount: bankPayments.length,
        transactionsCount: dayPayments.length,
        visitsCount: dayVisits.length,
        status,
        closedBy: admin.name || "Cashier Admin",
        closedAt: new Date().toISOString(),
        notes: notes || "Audited and closed cashier drawer.",
      };

      setDailyClosings((prev) => {
        const existingIdx = prev.findIndex((c) => c.date === date);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = record;
          return next;
        }
        return [record, ...prev];
      });

      // Asynchronously sync with backend REST API
      dailyClosingApi
        .performClosing({
          closingDate: date,
          notes: notes || "Audited and closed cashier drawer.",
        })
        .catch((err) => {
          console.warn("Backend daily closing sync pending:", err?.message);
        });

      return record;
    },
    [payments, emis, visits, admin.name],
  );

  const reopenDay = useCallback<StoreValue["reopenDay"]>((date) => {
    setDailyClosings((prev) =>
      prev.map((c) => (c.date === date ? { ...c, status: "Open", notes: "Re-opened for adjustments" } : c)),
    );
  }, []);

  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("loanflow-hub-store-v1");
    } catch {
      // ignore
    }
    setCustomers([]);
    setAccounts([]);
    setLoans([]);
    setEmis([]);
    setPayments([]);
    setReceipts([]);
    setVisits([]);
    setLimitHistory([]);
    setDocuments([]);
    setBankDetails([]);
    setDisbursements([]);
    setPromiseToPay([]);
    setEarlyClosures([]);
    setDailyClosings([]);
    setCounters(DEFAULT_COUNTERS);
    setAdmin(defaultAdmin);
    setSettings(defaultSettings);
  }, []);

  const value: StoreValue = {
    today,
    loggedIn,
    login: async (email, password) => {
      const normalized = email.trim().toLowerCase();
      try {
        const res = await authApi.login(normalized, password);
        const loginData = res.data;
        if (loginData && loginData.token) {
          setLoggedIn(true);
          if (loginData.user) {
            setAdmin((prev) => ({
              ...prev,
              name: loginData.user.name || prev.name,
              email: loginData.user.email || prev.email,
            }));
          }
          return true;
        }
        return false;
      } catch (err: any) {
        console.error("Authentication failed:", err?.message);
        throw err;
      }
    },
    logout: () => {
      void authApi.logout();
      logout();
    },
    customers,
    accounts,
    loans,
    emis,
    payments,
    receipts,
    visits,
    limitHistory,
    documents,
    bankDetails,
    disbursements,
    promiseToPay,
    earlyClosures,
    dailyClosings,
    notifications,
    admin,
    settings,
    closeDay,
    reopenDay,
    addCustomer,
    updateCustomer,
    updateCustomerPhoto,
    addLoan,
    recordPayment,
    refreshData,
    loading,
    reversePayment,
    updateCreditLimit,
    upsertVisit,
    addDocument,
    addDocumentFull,
    updateDocumentStatus,
    deleteDocument,
    seedMissingDocuments,
    seedAllMissingDocuments,
    addBankDetail,
    updateBankDetail,
    verifyBankDetail,
    recordDisbursement,
    updateDisbursementStatus,
    updateAdmin: (patch) => setAdmin((a) => ({ ...a, ...patch })),
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    markNotificationsRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    closeLoan,
    earlyCloseLoan,
    addPromiseToPay,
    updatePromiseToPay,
    resetDemoData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}

/** Helper: compute the "current" EMI for a loan in collection priority order:
 *  Partial > Overdue > Due today > Next Upcoming
 */
export function resolveCurrentEmi(loanEmis: import("@/types").Emi[], today: string) {
  const unpaid = loanEmis.filter((e) => e.paid < e.amount).sort((a, b) => a.emiNo - b.emiNo);
  return (
    unpaid.find((e) => e.status === "Partial") ??
    unpaid.find((e) => e.status === "Overdue") ??
    unpaid.find((e) => e.dueDate === today) ??
    unpaid[0] ??
    null
  );
}

/** Compute a collection priority score for sorting today's route. */
export function collectionPriorityScore(emi: import("@/types").Emi, today: string): number {
  let score = 0;
  if (emi.status === "Partial") score += 75;
  if (emi.status === "Overdue") {
    score += 100;
    const days = Math.max(
      0,
      Math.round((new Date(today + "T00:00:00").getTime() - new Date(emi.dueDate + "T00:00:00").getTime()) / 86_400_000),
    );
    score += days * 3;
  }
  if (emi.dueDate === today) score += 50;
  return score;
}
