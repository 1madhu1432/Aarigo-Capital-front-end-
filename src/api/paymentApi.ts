import { apiClient } from './client';

export const paymentApi = {
  getPayments: async (params: {
    page?: number;
    limit?: number;
    loanId?: string;
    customerId?: string;
    search?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.loanId) query.append('loanId', params.loanId);
    if (params.customerId) query.append('customerId', params.customerId);
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    const res = await apiClient(`/payments${qs ? `?${qs}` : ''}`);
    return res;
  },

  getPaymentById: async (id: string) => {
    const res = await apiClient(`/payments/${id}`);
    return res.data;
  },

  recordPayment: async (paymentData: {
    loanId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'OTHER';
    referenceNumber?: string;
    notes?: string;
    isEarlyClosure?: boolean;
  }) => {
    const res = await apiClient('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return res.data;
  },
};
