import http, { type ApiResponse } from '../http';

export const reportsApi = {
  getLoansReport: (params?: Record<string, any>): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/loans', params),

  getPaymentsReport: (params?: Record<string, any>): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/payments', params),

  getCollectionsReport: (params?: Record<string, any>): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/collections', params),

  getOverdueReport: (params?: Record<string, any>): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/overdue', params),

  getDailyCollectionsReport: (params?: Record<string, any>): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/daily-collections', params),

  getPortfolioReport: (): Promise<ApiResponse<any>> =>
    http.get<any>('/reports/portfolio'),
};

export default reportsApi;
