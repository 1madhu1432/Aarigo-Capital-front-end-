import { apiClient } from './client';

export const loanApi = {
  getLoans: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.customerId) query.append('customerId', params.customerId);

    const qs = query.toString();
    const res = await apiClient(`/loans${qs ? `?${qs}` : ''}`);
    return res;
  },

  getLoanById: async (id: string) => {
    const res = await apiClient(`/loans/${id}`);
    return res.data;
  },

  getLoanSummary: async (id: string) => {
    const res = await apiClient(`/loans/${id}/summary`);
    return res.data;
  },

  createLoan: async (loanData: any) => {
    const res = await apiClient('/loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
    return res.data;
  },

  updateLoan: async (id: string, loanData: any) => {
    const res = await apiClient(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(loanData),
    });
    return res.data;
  },

  getEarlyClosureQuote: async (id: string, quoteInput: { closureDate: string; foreclosureChargePercent?: number }) => {
    const res = await apiClient(`/loans/${id}/early-closure-quote`, {
      method: 'POST',
      body: JSON.stringify(quoteInput),
    });
    return res.data;
  },

  getInstallments: async (loanId: string) => {
    const res = await apiClient(`/loans/${loanId}/installments`);
    return res.data;
  },
};
