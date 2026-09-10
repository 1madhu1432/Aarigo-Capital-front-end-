import http, { type ApiResponse } from '../http';
import type { Emi } from '@/types';

export const installmentsApi = {
  getInstallmentById: (id: string): Promise<ApiResponse<Emi>> =>
    http.get<Emi>(`/installments/${id}`),

  getLoanInstallments: (loanId: string): Promise<ApiResponse<Emi[]>> =>
    http.get<Emi[]>(`/loans/${loanId}/installments`),
};

export default installmentsApi;
