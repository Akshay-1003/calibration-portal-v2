/**
 * Secure Axios Client
 * Production-grade HTTP client with JWT token management
 * 
 * Features:
 * - Automatic JWT token attachment
 * - Token refresh on 401
 * - Request retry with refreshed token
 * - Race condition handling
 * - Request queuing during refresh
 * - HttpOnly cookie support for refresh tokens
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { useAuthStore } from '../../features/auth/store/authStore';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface AxiosErrorResponse {
  message?: string;
  error?: string;
  errors?: string[];
  statusCode?: number;
}

// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================

/**
 * Get CSRF token from meta tag or cookie
 */
const getCSRFToken = (): string | null => {
  // Try to get from meta tag first
  const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  if (metaTag?.content) {
    return metaTag.content;
  }

  // Fallback to cookie
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith('csrf-token=')
  );
  return csrfCookie ? csrfCookie.split('=')[1] : null;
};

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

class SecureAxiosClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: ENV.API_TIMEOUT,
      withCredentials: true, // Important: enables HttpOnly cookie support
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // ============================================================================
  // REQUEST INTERCEPTOR
  // ============================================================================

  private setupInterceptors() {
    // Request interceptor: Attach JWT token and CSRF token
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const requestUrl = config.url || '';
        const isAuthEndpointWithoutBearer =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/refresh') ||
          requestUrl.includes('/auth/signup') ||
          requestUrl.includes('/auth/google') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/reset-password') ||
          requestUrl.includes('/auth/verify-email') ||
          requestUrl.includes('/auth/resend-verification');

        const token = useAuthStore.getState().accessToken;

        // Most auth endpoints must stay bearer-free.
        // Logout is the exception in this backend: it expects the current access token.
        if (!isAuthEndpointWithoutBearer && token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add CSRF protection for state-changing requests
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
          const csrfToken = getCSRFToken();
          if (csrfToken && config.headers) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor: Handle 401 and refresh token
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
          _skipRefresh?: boolean;
        };

        // If explicitly marked to skip refresh, don't retry
        if (originalRequest._skipRefresh) {
          return Promise.reject(error);
        }

        const requestUrl = originalRequest.url || '';
        const isNonRetriableAuthEndpoint =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/logout') ||
          requestUrl.includes('/auth/refresh') ||
          requestUrl.includes('/auth/signup');

        // Don't retry auth endpoints - they should fail directly
        if (isNonRetriableAuthEndpoint) {
          return Promise.reject(error);
        }

        // Handle 405 Method Not Allowed - don't retry, endpoint doesn't exist
        if (error.response?.status === 405) {
          return Promise.reject(error);
        }

        // Handle 401 Unauthorized - only for non-auth endpoints
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._skipRefresh) {
          originalRequest._retry = true;

          try {
            await useAuthStore.getState().refreshAccessToken();

            const token = useAuthStore.getState().accessToken;
            if (token && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }

            return this.instance(originalRequest);
          } catch (refreshError: any) {
            const status = refreshError?.status ?? refreshError?.response?.status;
            if (status === 400 || status === 401 || status === 403 || status === 404 || status === 405) {
              toast.error('Session expired. Please login again.');
            } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
              toast.error('Unable to refresh session while offline.');
            }

            return Promise.reject(refreshError);
          }
        }

        // Handle other errors
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig & { _skipRefresh?: boolean }): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response;
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response;
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response;
  }

  /**
   * Get axios instance (for advanced usage)
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const axiosClient = new SecureAxiosClient();
export default axiosClient;
