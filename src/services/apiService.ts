
import { ENV } from '../core/config/env';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'sonner';
import { sanitizeError } from '../utils/errorSanitizer';
import type { OutwardEntry } from '../types/api';
import { InwardEntriesListQueryFilters } from '../hooks/queries/inwards';
import { hasActiveFilters } from '../utils/filterBuilder';
import { getCurrentAccessToken } from '../features/auth/utils/authTokenAccessor';
import { useAuthStore } from '../features/auth/store/authStore';

type QueryPrimitive = string | number | boolean | null | undefined;

const buildRequestQueryString = (params?: Record<string, QueryPrimitive>): string => {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
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
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestConfig extends RequestInit {
  timeout?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

// ============================================================================
// API SERVICE CLASS
// ============================================================================

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = ENV.API_BASE_URL;
    this.timeout = ENV.API_TIMEOUT;
  }

  /**
   * Make HTTP request with consistent error handling
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
    hasRetriedAfterRefresh = false
  ): Promise<T> {
    const {
      timeout = this.timeout,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      ...requestInit
    } = config;

    const url = `${this.baseURL}${endpoint}`;

    const requestConfig: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.getAuthHeaders(),
        ...requestInit.headers,
      },
      mode: 'cors',
      credentials: 'omit',
      ...requestInit,
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (
        response.status === 401 &&
        !hasRetriedAfterRefresh &&
        this.canRetryWithRefresh(endpoint)
      ) {
        await useAuthStore.getState().refreshAccessToken();
        return this.request<T>(endpoint, config, true);
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText || `HTTP error! status: ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Keep original error message if parsing fails
        }

        const error = new ApiError(response.status, errorMessage);

        if (showErrorToast) {
          // Sanitize error message before displaying to user
          const sanitizedMessage = sanitizeError(error);
          toast.error(sanitizedMessage);
        }

        throw error;
      }

      const data = await response.json();

      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      return data;
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
          error
        );
      }

      const apiError = new ApiError(
        0,
        error instanceof Error ? error.message : 'Network error',
        'NETWORK_ERROR'
      );

      if (showErrorToast) {
        // Sanitize error message before displaying to user
        const sanitizedMessage = sanitizeError(apiError);
        toast.error(sanitizedMessage);
      }

      throw apiError;
    }
  }

  private getAuthHeaders(): HeadersInit {
    const token = getCurrentAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private canRetryWithRefresh(endpoint: string): boolean {
    return !(
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/signup')
    );
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * GET request
   */
  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // ============================================================================
  // ORGANIZATION API METHODS
  // ============================================================================

  async getOrganizations(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.ORGANIZATIONS.LIST}${buildRequestQueryString(params)}`);
  }

  async getCustomerOrganizations(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.LIST}${buildRequestQueryString(params)}`);
  }

  async createCustomerOrganization(data: any): Promise<any> {
    return this.post<any>(API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.CREATE, data);
  }

  async updateCustomerOrganization(id: string, data: any): Promise<any> {
    return this.put<any>(API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.UPDATE(id), data);
  }

  async deleteCustomerOrganization(id: string): Promise<any> {
    return this.delete<any>(API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.DELETE(id));
  }

  async getUnassignedCustomerOrganizations(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.UNASSIGNED}${buildRequestQueryString(params)}`);
  }

  async assignCustomerToLaboratory(customerId: string, laboratoryId: string): Promise<any> {
    return this.put<any>(API_ENDPOINTS.ORGANIZATIONS.CUSTOMERS.ASSIGN_LABORATORY(customerId), {
      laboratory_id: laboratoryId,
    });
  }

  async getLaboratories(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.ORGANIZATIONS.LABORATORIES.LIST}${buildRequestQueryString(params)}`);
  }

  async createLaboratory(data: any): Promise<any> {
    return this.post<any>(API_ENDPOINTS.ORGANIZATIONS.LABORATORIES.CREATE, data);
  }

  async updateLaboratory(id: string, data: any): Promise<any> {
    return this.put<any>(API_ENDPOINTS.ORGANIZATIONS.LABORATORIES.UPDATE(id), data);
  }

  async deleteLaboratory(id: string): Promise<any> {
    return this.delete<any>(API_ENDPOINTS.ORGANIZATIONS.LABORATORIES.DELETE(id));
  }

  async createOrganization(data: any): Promise<any> {
    return this.post<any>(
      API_ENDPOINTS.ORGANIZATIONS.CREATE,
      data,
      { successMessage: 'Organization created successfully!' }
    );
  }

  async updateOrganization(id: string, data: any): Promise<any> {
    return this.put<any>(
      API_ENDPOINTS.ORGANIZATIONS.UPDATE(id),
      data,
      { successMessage: 'Organization updated successfully!' }
    );
  }

  async deleteOrganization(id: string): Promise<any> {
    return this.delete<any>(
      API_ENDPOINTS.ORGANIZATIONS.DELETE(id),
      { successMessage: 'Organization deleted successfully!' }
    );
  }

  // ============================================================================
  // ACCOUNT DETAILS API METHODS
  // ============================================================================

  async getAccountDetails(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.ACCOUNT_DETAILS.LIST}${buildRequestQueryString(params)}`);
  }

  async createAccountDetail(data: any): Promise<any> {
    return this.post<any>(
      API_ENDPOINTS.ACCOUNT_DETAILS.CREATE,
      data,
      { successMessage: 'Account details created successfully!' }
    );
  }

  async updateAccountDetail(id: string, data: any): Promise<any> {
    return this.patch<any>(
      API_ENDPOINTS.ACCOUNT_DETAILS.UPDATE(id),
      data,
      { successMessage: 'Account details updated successfully!' }
    );
  }

  async deleteAccountDetail(id: string): Promise<any> {
    return this.delete<any>(
      API_ENDPOINTS.ACCOUNT_DETAILS.DELETE(id),
      { successMessage: 'Account details deleted successfully!' }
    );
  }

  // ============================================================================
  // INWARD API METHODS
  // ============================================================================
  
  /**
   * Get inward entries with optional filters
   * @param filters - Optional filters (dates in DD-MM-YYYY format)
   */
  async getInwards(
    filters?: InwardEntriesListQueryFilters & { page?: number; limit?: number }
  ): Promise<any> {
    if (!hasActiveFilters(filters)) {
      return this.get<any>(API_ENDPOINTS.INWARDS.LIST);
    }

    const queryString = buildRequestQueryString(filters as Record<string, QueryPrimitive>);
    const endpoint = `${API_ENDPOINTS.INWARDS.LIST}${queryString}`;
    
    return this.get<any>(endpoint);
  }


  async createInward(data: any, config: RequestConfig = {}): Promise<any> {
    return this.post<any>(
      API_ENDPOINTS.INWARDS.CREATE,
      data,
      { successMessage: 'Inward entry created successfully!', ...config }
    );
  }

  async getInwardById(id: string, config: RequestConfig = {}): Promise<any> {
    return this.get<any>(API_ENDPOINTS.INWARDS.GET(id), config);
  }

  async updateInward(id: string, data: any, config: RequestConfig = {}): Promise<any> {
    return this.put<any>(
      API_ENDPOINTS.INWARDS.UPDATE(id),
      data,
      { successMessage: 'Inward entry updated successfully!', ...config }
    );
  }

  async deleteInward(id: string, config: RequestConfig = {}): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(
      API_ENDPOINTS.INWARDS.DELETE(id),
      { successMessage: 'Inward entry deleted successfully!', ...config }
    );
  }

  // ============================================================================
  // OUTWARD API METHODS
  // ============================================================================

  async getOutwards(): Promise<ApiResponse<OutwardEntry[]>> {
    return this.get<ApiResponse<OutwardEntry[]>>(API_ENDPOINTS.OUTWARDS.LIST);
  }

  async createOutward(data: any): Promise<ApiResponse<OutwardEntry>> {
    return this.post<ApiResponse<OutwardEntry>>(
      API_ENDPOINTS.OUTWARDS.CREATE,
      data,
      { successMessage: 'Outward entry created successfully!' }
    );
  }

  async updateOutward(id: string, data: any): Promise<ApiResponse<OutwardEntry>> {
    return this.put<ApiResponse<OutwardEntry>>(
      API_ENDPOINTS.OUTWARDS.UPDATE(id),
      data,
      { successMessage: 'Outward entry updated successfully!' }
    );
  }

  async deleteOutward(id: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(
      API_ENDPOINTS.OUTWARDS.DELETE(id),
      { successMessage: 'Outward entry deleted successfully!' }
    );
  }

  async getOutward(id: string): Promise<ApiResponse<OutwardEntry>> {
    return this.get<ApiResponse<OutwardEntry>>(API_ENDPOINTS.OUTWARDS.GET(id));
  }

  // ============================================================================
  // GAUGE API METHODS
  // ============================================================================

  async getGauges(): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.GAUGES.LIST);
  }

  // Get inward gauges list - correct endpoint for dashboard
  async getInwardGauges(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.GAUGES.GET_INWARD_LIST}${buildRequestQueryString(params)}`);
  }
  
  async getGaugeMasters(params?: Record<string, QueryPrimitive>): Promise<any> {
    return this.get<any>(`${API_ENDPOINTS.GAUGES.MASTER}${buildRequestQueryString(params)}`);
  }

  async getGaugesByInward(inwardId: string): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(
      `${API_ENDPOINTS.GAUGES.BY_INWARD}?inward_id=${inwardId}`
    );
  }

  async createGauge(data: any): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.GAUGES.CREATE,
      data,
      { successMessage: 'Gauge created successfully!' }
    );
  }

  async linkGaugeToInward(data: any): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.GAUGES.LINK_TO_INWARD,
      data,
      { successMessage: 'Gauge linked successfully!' }
    );
  }

  // ============================================================================
  // CERTIFICATE API METHODS
  // ============================================================================

  async getCertificateTypes(): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.CERTIFICATE_TYPES.LIST);
  }
  async getCertificateName(id: string): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.CERTIFICATE_TYPES.GET(id));
  }
  async getCalibrationCertificates(): Promise<any> {
    return this.get<any>(API_ENDPOINTS.CALIBRATION_CERTIFICATES.LIST);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const apiService = new ApiService();
export default apiService;
