import { apiClient } from './client';

export const customerApi = {
  getCustomers: async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);

    const qs = query.toString();
    const res = await apiClient(`/customers${qs ? `?${qs}` : ''}`);
    return res;
  },

  getCustomerById: async (id: string) => {
    const res = await apiClient(`/customers/${id}`);
    return res.data;
  },

  createCustomer: async (customerData: any) => {
    const res = await apiClient('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return res.data;
  },

  updateCustomer: async (id: string, customerData: any) => {
    const res = await apiClient(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    return res.data;
  },

  deleteCustomer: async (id: string) => {
    const res = await apiClient(`/customers/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  getDocuments: async (customerId: string) => {
    const res = await apiClient(`/customers/${customerId}/documents`);
    return res.data;
  },

  uploadDocument: async (customerId: string, formData: FormData) => {
    const res = await apiClient(`/customers/${customerId}/documents`, {
      method: 'POST',
      body: formData,
    });
    return res.data;
  },
};
