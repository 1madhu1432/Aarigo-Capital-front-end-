/**
 * AARIGO CAPITAL — HTTP CLIENT
 * Central typed fetch-based HTTP service for frontend-to-backend communication.
 * Strictly configured with environment variable VITE_API_URL.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://green-okapi-312955.hostingersite.com/api'
    : 'http://localhost:5000/api');

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  errors?: any;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export class ApiClientError extends Error {
  code?: string;
  status: number;
  errors?: any;

  constructor(message: string, status: number = 500, code?: string, errors?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
}

export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const rawToken = typeof window !== 'undefined' ? localStorage.getItem('aarigo_auth_token') : null;
  const token =
    rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.trim() !== ''
      ? rawToken.trim()
      : null;

  if (rawToken && !token && typeof window !== 'undefined') {
    localStorage.removeItem('aarigo_auth_token');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Construct query params
  let queryString = '';
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      queryString = `${endpoint.includes('?') ? '&' : '?'}${qs}`;
    }
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = endpoint.startsWith('http')
    ? `${endpoint}${queryString}`
    : `${API_BASE_URL}${cleanEndpoint}${queryString}`;

  let body: BodyInit | undefined = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (isFormData) {
      body = options.body;
    } else if (typeof options.body === 'string') {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
    }
  }

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      body,
    });

    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('aarigo_auth_token');
      // Dispatch an event to trigger logout handling in the store
      window.dispatchEvent(new Event('unauthorized'));
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return { success: true, data: {} as T };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!res.ok) {
        throw new ApiClientError(`HTTP ${res.status}: ${res.statusText}`, res.status);
      }
      return { success: true, data: {} as T };
    }

    const data: ApiResponse<T> = await res.json();

    if (!res.ok || data.success === false) {
      throw new ApiClientError(
        data.message || `Request failed with status ${res.status}`,
        res.status,
        data.code,
        data.errors
      );
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(err.message || 'Network connection failed', 0);
  }
}

export const http = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'GET', params, ...options }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body, ...options }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body, ...options }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body, ...options }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};

export default http;
