import http, { type ApiResponse } from '../http';
import type { Receipt } from '@/types';

export interface ReceiptQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const receiptsApi = {
  getReceipts: (params?: ReceiptQueryParams): Promise<ApiResponse<Receipt[]>> =>
    http.get<Receipt[]>('/receipts', params),

  getReceiptById: (id: string): Promise<ApiResponse<Receipt>> =>
    http.get<Receipt>(`/receipts/${id}`),

  downloadReceiptPdf: (id: string): Promise<ApiResponse<any>> =>
    http.get<any>(`/receipts/${id}/download`),
};

export default receiptsApi;
