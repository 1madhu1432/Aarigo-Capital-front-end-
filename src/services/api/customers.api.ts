import http, { type ApiResponse } from '../http';
import type { Customer, Loan } from '@/types';

export interface CustomerQueryParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateCustomerRequest {
  fullName: string;
  name?: string;
  guardianName?: string;
  mobile: string;
  alternateMobile?: string;
  altMobile?: string;
  email?: string;
  dateOfBirth?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'Male' | 'Female' | 'Other';
  address: string | {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    house?: string;
    area?: string;
    pin?: string;
  };
  city?: string;
  state?: string;
  pincode?: string;
  occupation?: string;
  monthlyIncome?: number;
  kycType?: 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENCE' | string;
  kycNumber?: string;
  guarantorName?: string;
  guarantorMobile?: string;
  guarantorRelationship?: string;
  guarantorAddress?: string;
  notes?: string;
}

export const customersApi = {
  getCustomers: (params?: CustomerQueryParams): Promise<ApiResponse<Customer[]>> =>
    http.get<Customer[]>('/customers', params),

  getCustomerById: (id: string): Promise<ApiResponse<Customer>> =>
    http.get<Customer>(`/customers/${id}`),

  createCustomer: (data: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    const payload: any = {
      fullName: data.fullName || data.name,
      mobile: data.mobile,
      alternateMobile: data.alternateMobile || data.altMobile,
      email: data.email,
      dateOfBirth: data.dateOfBirth || data.dob,
      gender: data.gender ? String(data.gender).toUpperCase() : undefined,
      occupation: data.occupation,
      monthlyIncome: data.monthlyIncome,
      kycType: data.kycType ? String(data.kycType).toUpperCase() : undefined,
      kycNumber: data.kycNumber,
      guarantorName: data.guarantorName,
      guarantorMobile: data.guarantorMobile,
      guarantorRelationship: data.guarantorRelationship,
      guarantorAddress: data.guarantorAddress,
      notes: data.notes,
    };

    if (typeof data.address === 'object' && data.address !== null) {
      payload.address = [data.address.house, data.address.line1, data.address.area, data.address.line2]
        .filter(Boolean)
        .join(', ') || 'Main Street';
      payload.city = data.city || data.address.city || 'Pune';
      payload.state = data.state || data.address.state || 'Maharashtra';
      payload.pincode = data.pincode || data.address.pincode || data.address.pin || '411001';
    } else {
      payload.address = typeof data.address === 'string' && data.address.trim() ? data.address : 'Main Street';
      payload.city = data.city || 'Pune';
      payload.state = data.state || 'Maharashtra';
      payload.pincode = data.pincode || '411001';
    }

    return http.post<Customer>('/customers', payload);
  },

  updateCustomer: (id: string, data: Partial<CreateCustomerRequest>): Promise<ApiResponse<Customer>> =>
    http.put<Customer>(`/customers/${id}`, data),

  deleteCustomer: (id: string): Promise<ApiResponse<{ message: string }>> =>
    http.delete<{ message: string }>(`/customers/${id}`),

  getCustomerLoans: (id: string): Promise<ApiResponse<Loan[]>> =>
    http.get<Loan[]>(`/customers/${id}/loans`),

  getCustomerDocuments: (id: string): Promise<ApiResponse<any[]>> =>
    http.get<any[]>(`/customers/${id}/documents`),

  uploadCustomerDocument: (id: string, formData: FormData): Promise<ApiResponse<any>> =>
    http.post<any>(`/customers/${id}/documents`, formData),

  deleteCustomerDocument: (id: string, documentId: string): Promise<ApiResponse<{ message: string }>> =>
    http.delete<{ message: string }>(`/customers/${id}/documents/${documentId}`),
};

export default customersApi;
