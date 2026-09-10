import http, { type ApiResponse } from '../http';

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  customerId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  customer?: {
    id: string;
    customerCode: string;
    fullName: string;
  } | null;
}

export const auditLogsApi = {
  getAll: (params?: { page?: number; limit?: number; entityType?: string; userId?: string }): Promise<ApiResponse<AuditLogItem[]>> =>
    http.get<AuditLogItem[]>('/audit-logs', { params }),

  create: (data: {
    entityType: string;
    entityId: string;
    action: string;
    reason?: string;
    newValue?: any;
  }): Promise<ApiResponse<AuditLogItem>> =>
    http.post<AuditLogItem>('/audit-logs', data),
};
