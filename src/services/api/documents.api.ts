import http, { type ApiResponse } from '../http';

export interface UploadDocumentParams {
  customerId: string;
  documentType: string;
  documentNumber?: string;
  file: File;
}

export const documentsApi = {
  getCustomerDocuments: (customerId: string): Promise<ApiResponse<any[]>> =>
    http.get<any[]>(`/customers/${customerId}/documents`),

  uploadCustomerDocument: (params: UploadDocumentParams): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('documentType', params.documentType);
    if (params.documentNumber) {
      formData.append('documentNumber', params.documentNumber);
    }
    return http.post<any>(`/customers/${params.customerId}/documents`, formData);
  },

  deleteCustomerDocument: (customerId: string, documentId: string): Promise<ApiResponse<{ message: string }>> =>
    http.delete<{ message: string }>(`/customers/${customerId}/documents/${documentId}`),
};

export default documentsApi;
