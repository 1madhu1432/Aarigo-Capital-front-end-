import { apiClient } from './client';

export const loanProductApi = {
  getProducts: async (activeOnly: boolean = false) => {
    const res = await apiClient(`/loan-products${activeOnly ? '?active=true' : ''}`);
    return res.data;
  },

  getProductById: async (id: string) => {
    const res = await apiClient(`/loan-products/${id}`);
    return res.data;
  },

  createProduct: async (productData: any) => {
    const res = await apiClient('/loan-products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    return res.data;
  },

  updateProduct: async (id: string, productData: any) => {
    const res = await apiClient(`/loan-products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
    return res.data;
  },

  deleteProduct: async (id: string) => {
    const res = await apiClient(`/loan-products/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};
