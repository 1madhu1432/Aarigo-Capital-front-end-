import http, { type ApiResponse } from '../http';
import type { Payment, PaymentMethod } from '@/types';

export interface PaymentQueryParams {
  loanId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RecordPaymentRequest {
  loanId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
  collectedBy?: string;
}

export interface RecordPaymentResponse {
  payment: Payment;
  receiptId?: string;
  allocations: Array<{
    installmentId: string;
    allocatedAmount: number;
    newStatus: string;
  }>;
  loanSummary: {
    paidAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    status: string;
  };
}

export const paymentsApi = {
  getPayments: (params?: PaymentQueryParams): Promise<ApiResponse<Payment[]>> =>
    http.get<Payment[]>('/payments', params),

  getPaymentById: (id: string): Promise<ApiResponse<Payment>> =>
    http.get<Payment>(`/payments/${id}`),

  recordPayment: (data: RecordPaymentRequest): Promise<ApiResponse<RecordPaymentResponse>> => {
    const rawMethod = String(data.paymentMethod || 'CASH').toUpperCase();
    let paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER' = 'OTHER';
    if (rawMethod.includes('CASH')) paymentMethod = 'CASH';
    else if (rawMethod.includes('BANK')) paymentMethod = 'BANK_TRANSFER';
    else if (rawMethod.includes('UPI')) paymentMethod = 'UPI';
    else if (rawMethod.includes('CHEQUE')) paymentMethod = 'CHEQUE';

    const paymentDate = (data.paymentDate || new Date().toISOString()).slice(0, 10);

    const payload = {
      loanId: data.loanId,
      amount: data.amount,
      paymentMethod,
      paymentDate,
      referenceNumber: data.referenceNumber || undefined,
      notes: data.notes || undefined,
    };

    return http.post<RecordPaymentResponse>('/payments', payload);
  },
};

export default paymentsApi;
