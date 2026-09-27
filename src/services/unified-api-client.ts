/**
 * Unified API Client
 * Single source of truth for all API calls
 * Consolidates apiService, api-client, and api.ts into one implementation
 * 
 * Migration Guide:
 * - Replace `import { apiClient } from '../services/api'` 
 *   with `import { unifiedApiClient as apiClient } from '../services/unified-api-client'`
 * - Replace `import { apiService } from '../services/apiService'`
 *   with `import { unifiedApiClient as apiService } from '../services/unified-api-client'`
 */

import { ENV } from '../core/config/env';
import { toast } from 'sonner';
import { sanitizeError } from '../utils/errorSanitizer';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
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
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

// Request interceptor type
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

// Response interceptor type
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

// Error interceptor type
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

// ============================================================================
// UNIFIED API CLIENT
// ============================================================================

class UnifiedApiClient {
  private baseURL: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private abortController: AbortController | null = null;

  constructor() {
    this.baseURL = ENV.API_BASE_URL;
    this.timeout = ENV.API_TIMEOUT;
    this.retryAttempts = ENV.API_RETRY_ATTEMPTS;
    this.retryDelay = ENV.API_RETRY_DELAY;
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
  }

  // Get default headers
  private getDefaultHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add auth token if available (from auth store)
    // This will be populated by request interceptors
    return headers;
  }

  // Create abort controller
  private createAbortController(): AbortController {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    return this.abortController;
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    return processedConfig;
  }

  // Apply response interceptors
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    return processedResponse;
  }

  // Apply error interceptors
  private async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let processedError = error;
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }
    return processedError;
  }

  // Check if error is retryable
  private isRetryableError(error: ApiError): boolean {
    return error.retryable ||
           error.status >= 500 ||
           error.status === 408 ||
           error.status === 429;
  }

  // Sleep utility for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main request method
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.timeout,
      retries = this.retryAttempts,
      retryDelay = this.retryDelay,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      ...requestInit
    } = config;

    // Apply request interceptors
    const processedConfig = await this.applyRequestInterceptors({
      timeout,
      retries,
      retryDelay,
      showErrorToast,
      showSuccessToast,
      successMessage,
      ...requestInit,
    });

    const url = `${this.baseURL}${endpoint}`;
    const controller = this.createAbortController();

    const requestConfig: RequestInit = {
      headers: {
        ...this.getDefaultHeaders(),
        ...processedConfig.headers,
      },
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
      ...processedConfig,
    };

    let lastError: ApiError | null = null;

    // Retry logic
    logger.debug('Request URL:', url);
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Set timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        // Apply response interceptors
        const processedResponse = await this.applyResponseInterceptors(response);

        if (!processedResponse.ok) {
          const errorText = await processedResponse.text();
          let errorMessage = errorText || `HTTP error! status: ${processedResponse.status}`;

          // Parse error response if it's JSON
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch {
            // Keep original error message if parsing fails
          }

          const error = new ApiError(
            processedResponse.status,
            errorMessage,
            undefined,
            errorText,
            this.isRetryableError(new ApiError(processedResponse.status, errorMessage))
          );

          // Apply error interceptors
          const processedError = await this.applyErrorInterceptors(error);
          lastError = processedError;

          // If not retryable or last attempt, throw error
          if (!this.isRetryableError(processedError) || attempt === retries) {
            throw processedError;
          }

          // Wait before retry
          await this.sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        // Parse successful response
        const data = await processedResponse.json();

        // Show success toast if configured
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        return data;

      } catch (error: any) {
        // Handle abort error
        if (error.name === 'AbortError') {
          const abortError = new ApiError(408, 'Request timeout', 'TIMEOUT', undefined, false);
          lastError = await this.applyErrorInterceptors(abortError);
        } else if (error instanceof ApiError) {
          lastError = await this.applyErrorInterceptors(error);
        } else {
          const networkError = new ApiError(
            0,
            error.message || 'Network error',
            'NETWORK_ERROR',
            undefined,
            true
          );
          lastError = await this.applyErrorInterceptors(networkError);
        }

        // If not retryable or last attempt, throw error
        if (!this.isRetryableError(lastError) || attempt === retries) {
          break;
        }

        // Wait before retry
        await this.sleep(retryDelay * Math.pow(2, attempt));
      }
    }

    // Show sanitized error toast if configured
    if (lastError && showErrorToast) {
      const sanitizedMessage = sanitizeError(lastError);
      toast.error(sanitizedMessage);
    }

    throw lastError || new ApiError(0, 'Unknown error occurred');
  }

  // Convenience methods
  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const unifiedApiClient = new UnifiedApiClient();

// Export as default for compatibility
export default unifiedApiClient;

// Export aliases for migration compatibility
export const apiClient = unifiedApiClient;
export const apiService = unifiedApiClient;



