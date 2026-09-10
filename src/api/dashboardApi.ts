import { apiClient } from './client';

export const dashboardApi = {
  getSummary: async () => {
    const res = await apiClient('/dashboard/summary');
    return res.data;
  },
};
