import http, { type ApiResponse } from '../http';

export interface DashboardSummary {
  totalCustomers: number;
  activeLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  todayCollections: number;
  monthCollections: number;
  overdueLoans: number;
  overdueAmount: number;
  upcomingEmisCount: number;
}

export const dashboardApi = {
  getSummary: (): Promise<ApiResponse<DashboardSummary>> =>
    http.get<DashboardSummary>('/dashboard/summary'),
};

export default dashboardApi;
