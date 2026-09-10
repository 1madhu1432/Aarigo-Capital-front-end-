/**
 * Re-exports from services/http for backwards compatibility across existing imports.
 */
export { API_BASE_URL, ApiClientError, request as apiClient, http, default } from '../services/http';
export type { ApiResponse, RequestOptions } from '../services/http';
