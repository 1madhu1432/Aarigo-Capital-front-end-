import { apiClient } from './client';

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    role: string;
    avatar?: string;
  };
  token: string;
}

export const authApi = {
  login: async (identifier: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: identifier,
        password,
      }),
    });

    if (res.data?.token) {
      localStorage.setItem('aarigo_auth_token', res.data.token);
    }
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('aarigo_auth_token');
    }
  },

  getMe: async () => {
    const res = await apiClient('/auth/me', { method: 'GET' });
    return res.data;
  },
};
