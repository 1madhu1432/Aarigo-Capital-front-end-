import http, { type ApiResponse } from '../http';

export interface DailyClosingRecord {
  id: string;
  closingDate: string;
  totalCollections: number;
  cashAmount: number;
  upiAmount: number;
  bankAmount: number;
  chequeAmount?: number;
  totalTransactions: number;
  status: 'OPEN' | 'CLOSED' | 'RECONCILED';
  closedBy: string;
  closedAt?: string;
  notes?: string;
}

export interface PerformClosingRequest {
  closingDate: string;
  cashCount?: Record<string, number>;
  notes?: string;
}

export const dailyClosingApi = {
  getDailyClosings: (params?: Record<string, any>): Promise<ApiResponse<DailyClosingRecord[]>> =>
    http.get<DailyClosingRecord[]>('/daily-closing', params),

  getDailyClosingById: (id: string): Promise<ApiResponse<DailyClosingRecord>> =>
    http.get<DailyClosingRecord>(`/daily-closing/${id}`),

  performClosing: (data: PerformClosingRequest): Promise<ApiResponse<DailyClosingRecord>> =>
    http.post<DailyClosingRecord>('/daily-closing', data),
};

export default dailyClosingApi;
