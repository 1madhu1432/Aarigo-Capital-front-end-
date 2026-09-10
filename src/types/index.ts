export type CustomerStatus = "Active" | "Inactive" | "Blocked";
export type LoanStatus = "Active" | "Overdue" | "Closed" | "Closed Early";
export type EmiStatus = "Paid" | "Due" | "Partial" | "Overdue" | "Upcoming" | "Cancelled";
export type PaymentMethod = "Cash" | "UPI" | "Bank";
export type VisitStatus = "Planned" | "Visited" | "Paid" | "Partially Paid" | "Not Paid";
export type InterestMethod = "Flat" | "Reducing Balance";
export type EmiFrequency = "Daily" | "Weekly" | "Monthly";
export type PtpStatus = "Pending" | "Kept" | "Broken";
export type DisbursementMethod = "Cash" | "Bank Transfer";

export type DocumentCategory =
  | "IDENTITY_KYC"
  | "ADDRESS_PROOF"
  | "INCOME_FINANCIAL"
  | "LOAN_DOCUMENTS"
  | "CUSTOMER_PERSONAL"
  | "COLLATERAL_SECURITY"
  | "OTHER";

export type DocumentVerificationStatus = "Pending" | "Verified" | "Rejected";

export interface Address {
  house: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pin: string;
  pincode?: string | undefined;
  landmark: string;
}

export interface Customer {
  id: string; // CUS-000125
  name: string;
  guardianName: string;
  mobile: string;
  altMobile: string;
  dob: string;
  gender: "Male" | "Female" | "Other";
  occupation: string;
  monthlyIncome: number;
  address: Address;
  kycType: "Aadhaar" | "PAN" | "Voter ID" | "Driving Licence";
  kycNumber: string;
  nominee: { name: string; relationship: string; mobile: string; address: string };
  guarantor: { name: string; relationship: string; mobile: string; address: string };
  status: CustomerStatus;
  createdAt: string;
  photoHue: number;
  photo?: string | undefined; // Base64 data URL or photo URL
  creditLimit?: number | undefined;
}

export interface BankDetail {
  id: string; // BNK-0001
  customerId: string;
  holderName: string;
  bankName: string;
  accountNumber: string; // plain text for storage, masked in UI
  ifsc: string;
  branch?: string | undefined;
  accountType: "Savings" | "Current" | "Other";
  upiId?: string | undefined;
  verified: boolean;
  verificationDate?: string | undefined;
  verificationNotes?: string | undefined;
  createdAt: string;
}

export interface DisbursementRecord {
  id: string; // DSB-0001
  loanId: string;
  customerId: string;
  approvedAmount: number;
  disbursementAmount: number;
  method: "Bank Transfer" | "UPI" | "Cash" | "Other";
  date: string;
  bankName?: string | undefined;
  accountHolder?: string | undefined;
  maskedAccount?: string | undefined;
  ifsc?: string | undefined;
  utr?: string | undefined;
  status: "Pending" | "Successful" | "Failed" | "Cancelled";
  notes?: string | undefined;
  proofDocumentId?: string | undefined;
  proofFileName?: string | undefined;
  createdAt: string;
  grossPrincipal?: number | undefined;
  processingFeeDeducted?: number | undefined;
  documentationChargesDeducted?: number | undefined;
  netDisbursedAmount?: number | undefined;
  disbursedAt?: string | undefined;
  paymentMode?: string | undefined;
  bankUtr?: string | undefined;
  disbursedBy?: string | undefined;
}

export interface Account {
  id: string; // ACC-000125
  customerId: string;
  creditLimit: number;
  status: "Active" | "Suspended";
  openedAt: string;
}

export interface CreditLimitChange {
  id: string;
  accountId: string;
  customerId: string;
  oldLimit: number;
  newLimit: number;
  reason: string;
  date: string;
  changedBy: string;
}

export interface EarlyClosureRecord {
  id: string; // ECL-000101
  loanId: string;
  customerId: string;
  accountId: string;
  closureDate: string;
  originalLoanAmount: number;
  outstandingPrincipal: number;
  earlyClosureChargePercent: number;
  earlyClosureCharge: number;
  futureInterestCharged: 0;
  finalClosureAmount: number;
  paymentMethod: PaymentMethod;
  bankTransactionId?: string | undefined;
  paymentId: string;
  receiptId: string;
  notes?: string | undefined;
  status: "Closed Early";
  nocReferenceNumber?: string | undefined;
  principalOutstandingAtClosure?: number | undefined;
  rebateInterest?: number | undefined;
}

export interface Loan {
  id: string; // LN-000125
  customerId: string;
  accountId: string;
  principal: number;
  interestRate: number;
  interestMethod: InterestMethod;
  processingFee: number;
  insurance: number;
  tenure: number;
  frequency: EmiFrequency;
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  startDate: string;
  firstEmiDate: string;
  endDate: string;
  status: LoanStatus;
  purpose: string;
  disbursementMethod: DisbursementMethod;
  bankTransactionId: string;
  earlyClosure?: EarlyClosureRecord | undefined;
  disbursement?: DisbursementRecord | undefined;
  bankDetailId?: string | undefined;
  type?: string | undefined;
  collateral?: string | undefined;
}

export interface Emi {
  id: string; // EMI-000845
  loanId: string;
  customerId: string;
  emiNo: number;
  dueDate: string;
  amount: number;
  paid: number;
  status: EmiStatus;
  remarks?: string | undefined;
  lateFee?: number | undefined;
  lateFeePaid?: number | undefined;
  lateFeeWaived?: boolean | undefined;
}

export interface Payment {
  id: string; // PAY-001254
  receiptId: string;
  customerId: string;
  loanId: string;
  emiId: string;
  amount: number;
  method: PaymentMethod;
  date: string; // ISO datetime
  notes: string;
  collectedBy: string;
  /** Set to true when the payment has been reversed/corrected. */
  reversed: boolean;
  reversalReason: string;
  isEarlyClosure?: boolean | undefined;
  earlyClosureChargePercent?: number | undefined;
  earlyClosureCharge?: number | undefined;
  outstandingPrincipal?: number | undefined;
  finalClosureAmount?: number | undefined;
  bankTransactionId?: string | undefined;
  lateFeePaid?: number | undefined;
  lateFeeWaived?: boolean | undefined;
}

export interface Receipt {
  id: string; // RCP-2026-00125
  paymentId: string;
  customerId: string;
  loanId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: "Issued" | "Cancelled";
  lateFeePaid?: number | undefined;
}

export interface Visit {
  id: string; // VIS-000525
  customerId: string;
  loanId: string;
  date: string;
  dueAmount: number;
  collected: number;
  status: VisitStatus;
  reason?: string | undefined;
  nextVisit?: string | undefined;
  notes?: string | undefined;
  collector?: string | undefined;
  /** Linked payment ID when auto-created after collection. */
  paymentId?: string | undefined;
  receiptId?: string | undefined;
}

export interface PromiseToPay {
  id: string; // PTP-000001
  customerId: string;
  loanId: string;
  emiId: string;
  promiseDate: string;
  promiseAmount: number;
  notes: string;
  status: PtpStatus;
  createdAt: string;
  visitId?: string | undefined;
}

export interface DocumentFile {
  id: string;
  customerId: string;
  loanId?: string | undefined;
  category: DocumentCategory;
  type: string;
  name: string;
  fileName: string;
  sizeKb: number;
  uploadedAt: string;
  documentNumber?: string | undefined;
  expiryDate?: string | undefined;
  verificationStatus: DocumentVerificationStatus;
  verificationNotes?: string | undefined;
  fileData?: string | undefined; // Base64 data string
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  tone: "info" | "warning" | "success" | "danger";
}

export interface AdminProfile {
  accountUniqueId?: string; // e.g. "ARG-ACC-88204"
  employeeCode?: string; // e.g. "EMP-001"
  name: string;
  role: string;
  email: string;
  mobile: string;
  altPhone?: string;
  department?: string;
  branch?: string;
  designation?: string;
  joinedDate?: string;
  address?: string;
  photoUrl?: string;
}

export interface Settings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  defaultInterestRate: number;
  defaultTenure: number;
  defaultFrequency: EmiFrequency;
  gracePeriodDays: number;
  lateFeePerDay: number;
  methods: Record<PaymentMethod, boolean>;
  receiptFooter: string;
  receiptPrefix: string;
  notifyOverdue: boolean;
  notifyDailySummary: boolean;
  documentTemplates?: Record<string, string>;
}

export interface DailyClosing {
  id: string;
  date: string;
  totalDue: number;
  totalCollected: number;
  shortfall: number;
  collectionRate: number;
  cashAmount: number;
  cashCount: number;
  upiAmount: number;
  upiCount: number;
  bankAmount: number;
  bankCount: number;
  transactionsCount: number;
  visitsCount: number;
  status: "Closed" | "Audited" | "Open";
  closedBy: string;
  closedAt: string;
  notes?: string;
}


