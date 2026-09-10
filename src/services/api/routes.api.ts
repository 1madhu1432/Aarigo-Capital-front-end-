import http, { type ApiResponse } from '../http';

export interface RouteSheet {
  id: string;
  routeDate: string;
  agentId: string;
  name?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  stops?: any[];
}

export const routesApi = {
  getRoutes: (params?: Record<string, any>): Promise<ApiResponse<RouteSheet[]>> =>
    http.get<RouteSheet[]>('/routes', params),

  getRouteById: (id: string): Promise<ApiResponse<RouteSheet>> =>
    http.get<RouteSheet>(`/routes/${id}`),

  createRoute: (data: Partial<RouteSheet>): Promise<ApiResponse<RouteSheet>> =>
    http.post<RouteSheet>('/routes', data),

  updateRoute: (id: string, data: Partial<RouteSheet>): Promise<ApiResponse<RouteSheet>> =>
    http.put<RouteSheet>(`/routes/${id}`, data),
};

export default routesApi;
