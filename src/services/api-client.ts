import { ENV } from '../core/config/env';
import { toast } from 'sonner';
import { sanitizeError } from '../utils/errorSanitizer';
import { logger } from '../utils/logger';
import { getCurrentAccessToken } from '../features/auth/utils/authTokenAccessor';
import { useAuthStore } from '../features/auth/store/authStore';

// Enhanced API Error class
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

// Request configuration interface
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

// Response wrapper interface
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ValidationError[];
  pagination?: PaginationInfo;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Request interceptor type
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

// Response interceptor type
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

// Error interceptor type
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

class ApiClient {
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

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Get auth token from memory store (HTTP Only Cookie architecture)
  private getAuthToken(): string | null {
    return getCurrentAccessToken();
  }

  // Apply request interceptors
  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = { ...config };
    
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

  // Create abort controller for request cancellation
  private createAbortController(): AbortController {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    return this.abortController;
  }

  // Sleep utility for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if error is retryable
  private isRetryableError(error: ApiError): boolean {
    return error.retryable || 
           error.status >= 500 || 
           error.status === 408 || 
           error.status === 429;
  }

  private canRetryWithRefresh(endpoint: string): boolean {
    return !(
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/signup')
    );
  }

  // Main request method
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {},
    hasRetriedAfterRefresh = false
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
    
    // Merge caller options first. This prevents custom headers from dropping
    // the Authorization header added by this client.
    const requestConfig: RequestInit = {
      ...processedConfig,
      headers: {
        ...this.getDefaultHeaders(),
        ...processedConfig.headers,
      },
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    };

    let lastError: ApiError | null = null;

    // Retry logic
    logger.debug('Making API request:', { url, method: requestConfig.method || 'GET' });
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Set timeout
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        logger.debug(`API request attempt ${attempt + 1}/${retries + 1}:`, url);
        const response = await fetch(url, requestConfig);
        logger.debug(`API response status: ${response.status}`, url);
        clearTimeout(timeoutId);

        // Apply response interceptors
        const processedResponse = await this.applyResponseInterceptors(response);

        if (
          processedResponse.status === 401 &&
          !hasRetriedAfterRefresh &&
          this.canRetryWithRefresh(endpoint)
        ) {
          await useAuthStore.getState().refreshAccessToken();
          return this.request<T>(endpoint, config, true);
        }

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
        } else if (typeof error?.status === 'number' || typeof error?.response?.status === 'number') {
          const status = error.status ?? error.response.status;
          const authError = new ApiError(
            status,
            error.message || 'Authentication failed',
            undefined,
            error,
            false
          );
          lastError = await this.applyErrorInterceptors(authError);
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

  // HTTP Methods
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Upload file method
  async upload<T = any>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it
        ...config?.headers,
      },
    });
  }

  // Cancel all pending requests
  cancelAllRequests() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/health', { timeout: 5000, showErrorToast: false });
      return true;
    } catch {
      return false;
    }
  }
}

import { generateUUID } from '../utils/uuid';

// Create singleton instance
export const apiClient = new ApiClient();

// Add default interceptors
apiClient.addRequestInterceptor((config) => {
  // Add request ID for tracking
  config.headers = {
    ...config.headers,
    'X-Request-ID': generateUUID(),
  };
  return config;
});

apiClient.addErrorInterceptor((error) => {
  // Log errors in development
  if (ENV.NODE_ENV === 'development' && ENV.ENABLE_LOGGING) {
    console.error('API Error:', error);
  }
  return error;
});

export default apiClient;
