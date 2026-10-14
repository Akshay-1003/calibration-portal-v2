import { getBaseURL, API_CONFIG, getDefaultHeaders, ERROR_MESSAGES } from '../config/api';
import { useAuthStore } from '../features/auth/store/authStore';
import { getCurrentAccessToken } from '../features/auth/utils/authTokenAccessor';
import type { RequestConfig } from '../types/api';

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: 'success' | 'error';
  timestamp?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;

  constructor(
    status: number,
    message: string,
    code?: string,
    details?: any
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

const getApiErrorMessage = (errorData: any, fallbackMessage: string): string => {
  if (typeof errorData?.message === 'string' && errorData.message.trim()) {
    return errorData.message;
  }

  if (typeof errorData?.error === 'string' && errorData.error.trim()) {
    return errorData.error;
  }

  if (Array.isArray(errorData?.errors) && errorData.errors.length > 0) {
    const firstError = errorData.errors[0];
    const firstMessage =
      typeof firstError?.message === 'string' && firstError.message.trim()
        ? firstError.message
        : fallbackMessage;

    if (firstError?.target === 'scope_master') {
      return `${firstMessage} Enter only a plain numeric value in the specification field, for example 0.75185. Do not include tolerance text like (+0.00048).`;
    }

    return firstMessage;
  }

  return fallbackMessage;
};

class ApiClient {
  private baseURL: string;
  private timeout: number;
  constructor() {
    this.baseURL = getBaseURL();
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private getAuthHeaders(): HeadersInit {
    const accessToken = getCurrentAccessToken();

    if (!accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private canRetryWithRefresh(endpoint: string): boolean {
    return !(
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/signup')
    );
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    hasRetriedAfterRefresh = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    // Merge caller options first. This prevents a custom headers object from
    // silently replacing the Authorization header added by this client.
    const config: RequestInit = {
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'omit',
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      if (
        response.status === 401 &&
        !hasRetriedAfterRefresh &&
        this.canRetryWithRefresh(endpoint)
      ) {
        await useAuthStore.getState().refreshAccessToken();
        return this.request<T>(endpoint, options, true);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        const isInwardGaugeList = endpoint.includes('/gauge/list/inward_gauges');
        let errorMessage = isInwardGaugeList && response.status >= 500
          ? 'The inward gauge list could not be loaded because one record contains invalid numeric data. Please correct that gauge record and try again.'
          : errorText || `HTTP error! status: ${response.status}`;
        
        // Parse error response if it's JSON
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = getApiErrorMessage(errorData, errorMessage);
        } catch {
          // If not JSON, use the text as is
        }
        
        throw new ApiError(
          response.status,
          errorMessage,
          response.statusText,
          { url, status: response.status }
        );
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }

      const status = (error as any)?.status ?? (error as any)?.response?.status;
      if (typeof status === 'number') {
        throw new ApiError(
          status,
          error instanceof Error ? error.message : 'Authentication failed',
          undefined,
          { url, status }
        );
      }
      
      // Handle specific network errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError(408, ERROR_MESSAGES.TIMEOUT_ERROR, 'TIMEOUT');
        }
        
        // CORS Error Detection
        if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
          throw new ApiError(
            0, 
            'CORS Error: The server is not allowing requests from this origin. Please contact the backend administrator to configure CORS headers.',
            'CORS_ERROR'
          );
        }
        
        // Network errors (including CORS failures)
        if (error.message.includes('Failed to fetch') || 
            error.message.includes('ERR_CONNECTION_REFUSED') ||
            error.message.includes('ERR_FAILED') ||
            error.message.includes('NetworkError')) {
          // Check if it's a CORS issue by checking if we got a response
          const isCorsError = error.message.includes('CORS') || 
                             error.message.includes('Access-Control-Allow-Origin') ||
                             (error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED'));
          
          if (isCorsError) {
            throw new ApiError(
              0,
              'CORS Error: The server is blocking cross-origin requests. Please ensure the backend has CORS properly configured.',
              'CORS_ERROR'
            );
          }
          
          throw new ApiError(0, ERROR_MESSAGES.NETWORK_ERROR, 'CONNECTION_REFUSED');
        }
        
        if (error.message.includes('ERR_NETWORK')) {
          throw new ApiError(0, ERROR_MESSAGES.NETWORK_ERROR, 'NETWORK_ERROR');
        }
      }
      
      throw new ApiError(0, ERROR_MESSAGES.UNKNOWN_ERROR, 'UNKNOWN', { originalError: error });
    }
  }

  // GET request - accepts either query params object or RequestConfig
  async get<T>(endpoint: string, paramsOrConfig: Record<string, unknown> | RequestConfig = {}): Promise<T> {
    if (paramsOrConfig && !('method' in (paramsOrConfig as RequestConfig))) {
      const params = paramsOrConfig as Record<string, unknown>;
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.append(k, String(v));
      });
      const qsStr = qs.toString();
      const url = qsStr ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${qsStr}` : endpoint;
      return this.request<T>(url, { method: 'GET' });
    }

    return this.request<T>(endpoint, { ...(paramsOrConfig as RequestConfig), method: 'GET' });
  }

  // GET request with API response wrapper
  async getApiResponse<T>(endpoint: string, paramsOrConfig: Record<string, unknown> | RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.get<ApiResponse<T>>(endpoint, paramsOrConfig as any);
  }

  // GET request with paginated response
  async getPaginated<T>(endpoint: string, paramsOrConfig: Record<string, unknown> | RequestConfig = {}): Promise<PaginatedResponse<T>> {
    return this.get<PaginatedResponse<T>>(endpoint, paramsOrConfig as any);
  }

  // POST request (data optional)
  async post<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    const req: RequestConfig = { ...options, method: 'POST' };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
  }

  // POST request with API response wrapper
  async postApiResponse<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.post<ApiResponse<T>>(endpoint, data, options);
  }

  // PUT request (data optional)
  async put<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    const req: RequestConfig = { ...options, method: 'PUT' };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
  }

  // PUT request with API response wrapper
  async putApiResponse<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.put<ApiResponse<T>>(endpoint, data, options);
  }

  // PATCH request (data optional)
  async patch<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<T> {
    const req: RequestConfig = { ...options, method: 'PATCH' };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
  }

  // PATCH request with API response wrapper
  async patchApiResponse<T>(endpoint: string, data?: unknown, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.patch<ApiResponse<T>>(endpoint, data, options);
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // DELETE request with API response wrapper
  async deleteApiResponse<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Test connection method
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }

  // Update base URL (useful for environment switching)
  setBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
  }
}

export const apiClient = new ApiClient(); 
