import http, { type ApiResponse } from '../http';
import type { Visit } from '@/types';

export const visitsApi = {
  getVisits: (params?: Record<string, any>): Promise<ApiResponse<Visit[]>> =>
    http.get<Visit[]>('/visits', params),

  getVisitById: (id: string): Promise<ApiResponse<Visit>> =>
    http.get<Visit>(`/visits/${id}`),

  createVisit: (data: Partial<Visit>): Promise<ApiResponse<Visit>> =>
    http.post<Visit>('/visits', data),

  updateVisit: (id: string, data: Partial<Visit>): Promise<ApiResponse<Visit>> =>
    http.put<Visit>(`/visits/${id}`, data),
};

export default visitsApi;
