/**
 * API Client
 * Centralized HTTP client for all API requests
 */

import { ENV } from '../config/env';
import { getCurrentAccessToken } from '../../features/auth/utils/authTokenAccessor';
import { useAuthStore } from '../../features/auth/store/authStore';

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
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

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = ENV.API_BASE_URL;
    this.timeout = ENV.API_TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    hasRetriedAfterRefresh = false
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      mode: 'cors',
      credentials: 'include', // Enable HttpOnly cookie support
      ...options,
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
        let errorMessage = errorText || `HTTP error! status: ${response.status}`;
        
        // Parse error response if it's JSON
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
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
          throw new ApiError(408, 'Request timeout', 'TIMEOUT');
        }
        
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          throw new ApiError(0, 'Network error: Unable to connect to server', 'CONNECTION_REFUSED');
        }
        
        if (error.message.includes('ERR_NETWORK')) {
          throw new ApiError(0, 'Network error: Please check your connection', 'NETWORK_ERROR');
        }
      }
      
      throw new ApiError(0, 'An unexpected error occurred', 'UNKNOWN', { originalError: error });
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};
    
    // Get token from memory store only (HTTP Only Cookie architecture)
    const token = getCurrentAccessToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private canRetryWithRefresh(endpoint: string): boolean {
    return !(
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/signup')
    );
  }

  // GET request - supports either RequestInit or a QueryParams-like object
  async get<T>(endpoint: string, paramsOrOptions?: Record<string, unknown> | RequestInit): Promise<T> {
    const options: RequestInit = { method: 'GET' };
    let url = endpoint;

    // Heuristic: if paramsOrOptions looks like RequestInit (has headers/method/signal), treat it as options
    const looksLikeRequestInit = paramsOrOptions && (('headers' in (paramsOrOptions as any)) || ('method' in (paramsOrOptions as any)) || ('signal' in (paramsOrOptions as any)));

    if (paramsOrOptions && !looksLikeRequestInit) {
      // treat as query params
      const params = paramsOrOptions as Record<string, unknown>;
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.append(k, String(v));
      });
      const qsStr = qs.toString();
      if (qsStr) url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${qsStr}`;
    } else if (looksLikeRequestInit) {
      Object.assign(options, paramsOrOptions as RequestInit);
    }

    return this.request<T>(url, options);
  }

  // POST request (data optional)
  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const req: RequestInit = { method: 'POST', ...options };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
  }

  // PUT request
  async put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const req: RequestInit = { method: 'PUT', ...options };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
  }

  // DELETE request
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const req: RequestInit = { method: 'PATCH', ...options };
    if (data !== undefined) req.body = JSON.stringify(data);
    return this.request<T>(endpoint, req);
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
