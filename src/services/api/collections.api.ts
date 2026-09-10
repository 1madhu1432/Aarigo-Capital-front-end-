import http, { type ApiResponse } from '../http';
import type { PaymentMethod } from '@/types';

export interface Collection {
  id: string;
  collectionNumber: string;
  loanId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  referenceNumber?: string;
  notes?: string;
  collectedBy: string;
  createdAt: string;
}

export interface CollectionQueryParams {
  date?: string;
  status?: string;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface RecordCollectionRequest {
  loanId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export const collectionsApi = {
  getCollections: (params?: CollectionQueryParams): Promise<ApiResponse<Collection[]>> =>
    http.get<Collection[]>('/collections', params),

  getCollectionById: (id: string): Promise<ApiResponse<Collection>> =>
    http.get<Collection>(`/collections/${id}`),

  recordCollection: (data: RecordCollectionRequest): Promise<ApiResponse<any>> =>
    http.post<any>('/collections', data),
};

export default collectionsApi;
