import http, { type ApiResponse } from '../http';
import type { Loan, Emi } from '@/types';

export interface LoanQueryParams {
  customerId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateLoanRequest {
  customerId: string;
  productId?: string;
  loanProductId?: string;
  principal?: number;
  principalAmount?: number;
  annualRate?: number;
  interestRate?: number;
  interestMethod?: 'FLAT' | 'REDUCING' | 'Flat' | 'Reducing';
  interestType?: 'FLAT' | 'REDUCING' | 'Flat' | 'Reducing';
  tenure: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'Daily' | 'Weekly' | 'Monthly';
  startDate: string;
  firstDueDate?: string;
  firstEmiDate?: string;
  processingFee?: number;
  processingFeePercent?: number;
  insurance?: number;
  insuranceFee?: number;
  disbursementMethod?: string;
  bankTransactionId?: string;
  purpose?: string;
  notes?: string;
}

export interface EarlyClosureQuoteRequest {
  closureDate: string;
  foreclosureChargePercent?: number;
  earlyClosureChargePercent?: number;
  waiveLateFee?: boolean;
  notes?: string;
}

export interface EarlyClosureQuoteResponse {
  loanId: string;
  originalPrincipal: number;
  paidPrincipal: number;
  outstandingPrincipal: number;
  unpaidInterest: number;
  earlyClosureCharge: number;
  totalSettlementAmount: number;
  quoteDate: string;
}

export const loansApi = {
  getLoans: (params?: LoanQueryParams): Promise<ApiResponse<Loan[]>> =>
    http.get<Loan[]>('/loans', params),

  getLoanById: (id: string): Promise<ApiResponse<Loan>> =>
    http.get<Loan>(`/loans/${id}`),

  createLoan: (data: CreateLoanRequest): Promise<ApiResponse<Loan>> => {
    const rawMethod = data.interestType || data.interestMethod || 'FLAT';
    const methodUpper = String(rawMethod).toUpperCase() === 'REDUCING' ? 'REDUCING' : 'FLAT';
    const rawFreq = data.frequency || 'MONTHLY';
    const freqUpper = (String(rawFreq).toUpperCase() as 'DAILY' | 'WEEKLY' | 'MONTHLY') || 'MONTHLY';

    const payload = {
      customerId: data.customerId,
      loanProductId: data.loanProductId || data.productId || undefined,
      principalAmount: data.principalAmount ?? data.principal ?? 0,
      interestRate: data.interestRate ?? data.annualRate ?? 0,
      interestType: methodUpper,
      tenure: data.tenure,
      frequency: freqUpper,
      processingFee: data.processingFee ?? 0,
      startDate: data.startDate.slice(0, 10),
      firstDueDate: (data.firstDueDate || data.firstEmiDate)?.slice(0, 10),
      purpose: data.purpose,
      disbursementMethod: data.disbursementMethod,
      bankTransactionId: data.bankTransactionId,
    };

    return http.post<Loan>('/loans', payload);
  },

  updateLoan: (id: string, data: Partial<CreateLoanRequest>): Promise<ApiResponse<Loan>> =>
    http.put<Loan>(`/loans/${id}`, data),

  getLoanSummary: (id: string): Promise<ApiResponse<any>> =>
    http.get<any>(`/loans/${id}/summary`),

  getEarlyClosureQuote: (
    id: string,
    data: EarlyClosureQuoteRequest
  ): Promise<ApiResponse<EarlyClosureQuoteResponse>> =>
    http.post<EarlyClosureQuoteResponse>(`/loans/${id}/early-closure-quote`, data),

  getLoanInstallments: (loanId: string): Promise<ApiResponse<Emi[]>> =>
    http.get<Emi[]>(`/loans/${loanId}/installments`),

  getLoanProducts: (): Promise<ApiResponse<any[]>> =>
    http.get<any[]>('/loan-products'),
};

export default loansApi;
