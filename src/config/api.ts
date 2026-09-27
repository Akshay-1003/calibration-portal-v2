/**
 * Centralized API Configuration
 * This file contains all API-related configuration and endpoints
 */

import { ENV } from '../core/config/env';
import { getCurrentAccessToken } from '../features/auth/utils/authTokenAccessor';

export const API_CONFIG = {
  // Timeout settings
  TIMEOUT: ENV.API_TIMEOUT,
  
  // Retry settings
  MAX_RETRIES: ENV.API_RETRY_ATTEMPTS,
  RETRY_DELAY: ENV.API_RETRY_DELAY,
  
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Get the current base URL
export const getBaseURL = (): string => {
  return ENV.API_BASE_URL;
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LABORATORY_CONTEXT: '/auth/laboratory-context',
    VALIDATE: '/auth/validate',
    GOOGLE: '/auth/google',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  
  // Organizations
  ORGANIZATIONS: {
    LIST: '/organizations',
    CREATE: '/organization',
    UPDATE: (id: string) => `/organization/${id}`,
    DELETE: (id: string) => `/organization/${id}`,
    GET: (id: string) => `/organization/${id}`,
    CUSTOMERS: {
      LIST: '/organizations/customers',
      CREATE: '/organizations/customers',
      UPDATE: (id: string) => `/organizations/customers/${id}`,
      DELETE: (id: string) => `/organizations/customers/${id}`,
      UNASSIGNED: '/organizations/customers/unassigned',
      ASSIGN_LABORATORY: (id: string) => `/organizations/customers/${id}/laboratory`,
    },
    LABORATORIES: {
      LIST: '/organizations/laboratories',
      CREATE: '/organizations/laboratories',
      UPDATE: (id: string) => `/organizations/laboratories/${id}`,
      DELETE: (id: string) => `/organizations/laboratories/${id}`,
    },
  },
  
  // Inward Entries
  INWARDS: {
    LIST: '/gauge/inwards',
    CREATE: '/gauge/inward',
    UPDATE: (id: string) => `/gauge/inward/${id}`,
    DELETE: (id: string) => `/gauge/inward/${id}`,
    GET: (id: string) => `/gauge/inward/${id}`,
  },

  // Outward Entries
  OUTWARDS: {
    LIST: '/outwards',
    CREATE: '/outward',
    UPDATE: (id: string) => `/outward/${id}`,
    DELETE: (id: string) => `/outward/${id}`,
    GET: (id: string) => `/outward/${id}`,
  },
  
  // Gauges
  GAUGES: {
    MASTER: '/gauge/master',
    LIST: '/gauge/list',
    CREATE: '/gauge/create',
    UPDATE: (id: string) => `/gauge/update/${id}`,
    DELETE: (id: string) => `/gauge/delete/${id}`,
    GET_INWARD_GAUGE: (gaugeId: string) => `/gauge/${gaugeId}`,
    GET_INWARD_LIST: '/gauge/list/inward_gauges',
    GET_INWARD_DATA_SAVE_LIST: '/gauge/list/inward-data-saves',
    BY_INWARD: '/gauge/list/by_inward',
    LINK_TO_INWARD: '/gauge/link/to/inward',
    DATA_SAVE_MAP: '/gauge/inward/data_save/map',
    BY_INWARD_GAUGE_ID: (inwardId: string, gaugeId: string) => `/gauge/inward/${inwardId}/gauge/${gaugeId}`,
    INWARD_RECORD: (gaugeInwardId: string, inwardId: string) => `/gauge/inward-record/${gaugeInwardId}?inward_id=${encodeURIComponent(inwardId)}`,
    DELETE_INWARD_DATA_SAVE: (inwardId: string, gaugeId: string) =>
      `/gauge/inward/${inwardId}/gauge/${gaugeId}/data_save`,
    CALIBRATION_HISTORY: (identificationNumber: string) => `/gauge/calibration-history/${identificationNumber}`,
  },
  
  // Certificate Types
  CERTIFICATE_TYPES: {
    LIST: '/certificate/types',
    CREATE: '/certificate/type',
    GET: (id: string) => `/certificate/type/${id}`,
    UPDATE: (id: string) => `/certificate/type/${id}`,
    DELETE: (id: string) => `/certificate/type/${id}`,
  },
  
  // Calibration Certificates
  CALIBRATION_CERTIFICATES: {
    LIST: '/calibration/certificates',
    CREATE: '/calibration/certificate',
    UPDATE: (id: string) => `/calibration/certificate/${id}`,
    DELETE: (id: string) => `/calibration/certificate/${id}`,
  },
  
  // Reading Master
  READING_MASTER: {
    LIST: '/master-reading-all',
    GET_BY_GAUGE: (gaugeId: string) => `/master-reading/${gaugeId}`,
    CREATE: '/master-reading',
    ADD_READING: (id: string) => `/master-reading/add/${id}`,
    REMOVE_READING: (id: string) => `/master-reading/remove/${id}`,
    UPDATE: (id: string) => `/master-reading/${id}`,
    DELETE: (id: string) => `/master-reading/${id}`,
  },

  SURFACE_PLATE_REFERENCE_STANDARDS: {
    LIST: '/surface-plate-reference-standards',
    CREATE: '/surface-plate-reference-standards',
    GET: (id: string) => `/surface-plate-reference-standards/${id}`,
    UPDATE: (id: string) => `/surface-plate-reference-standards/${id}`,
    DELETE: (id: string) => `/surface-plate-reference-standards/${id}`,
    LOOKUP_TOLERANCE: '/surface-plate-reference-standards/tolerance',
  },

  // Repair Management
  REPAIRS: {
    LIST: '/gauge/repairs/list',
    CREATE: '/gauge/repair',
    GET: (repairId: string) => `/gauge/repair/${repairId}`,
    UPDATE: (repairId: string) => `/gauge/repair/${repairId}`,
    DELETE: (repairId: string) => `/gauge/repair/${repairId}`,
  },
  
  // Health Check
  HEALTH: '/health',
  
  // Billing - Invoice
  INVOICES: {
    LIST: '/invoices',
    CREATE: '/invoice',
    PUT: (id: string) => `/invoice/${id}`,
    GET: `/invoice/`,
    UPDATE: (id: string) => `/invoice/${id}`,
    DELETE: (id: string) => `/invoice/${id}`,
    GENERATE: (id: string) => `/invoice/${id}/generate`,
    MARK_PAID: (id: string) => `/invoice/${id}/mark-paid`,
    CANCEL: (id: string) => `/invoice/${id}/cancel`,
    OUTWARD_ITEMS_BY_COMPANY: (companyId: string) => `/invoices/outward-items/${companyId}`,
  },
  
  // Billing - Quotation
  QUOTATIONS: {
    LIST: '/quotations',
    CREATE: '/quotation',
    GET: (id: string) => `/quotation/${id}`,
    UPDATE: (id: string) => `/quotation/${id}`,
    CREATE_REVISION: (id: string) => `/quotation/${id}/revision`,
    REVISIONS: (id: string) => `/quotation/${id}/revisions`,
    DELETE: (id: string) => `/quotation/${id}`,
  },

  ACCOUNT_DETAILS: {
    LIST: '/account-details',
    CREATE: '/account-details',
    GET: (id: string) => `/account-details/${id}`,
    UPDATE: (id: string) => `/account-details/${id}`,
    DELETE: (id: string) => `/account-details/${id}`,
  },

  // Users
  USERS: {
    AUTH: '/auth',
    BASE: '/user',
    LIST: '/users',
    CREATE: '/user',
    GET: (id: string) => `/user/${id}`,
    UPDATE: (id: string) => `/user/${id}`,
    RESET_PASSWORD: (id: string) => `/user/${id}/password`,
    DELETE: (id: string) => `/user/${id}`,
    PROFILE: '/user/profile',
    AVATAR: '/user/avatar',
    ORGANIZATION: (orgId: string) => `/user/organization/${orgId}`,
    LAB: (labId: string) => `/user/lab/${labId}`,
  },

  // Roles
  ROLES: {
    LIST: '/roles',
    CREATE: '/roles',
    GET: (id: string) => `/roles/${id}`,
    UPDATE: (id: string) => `/roles/${id}`,
    DELETE: (id: string) => `/roles/${id}`,
  },

  // Permissions
  PERMISSIONS: {
    LIST: '/permissions',
  },
} as const;

// Request headers
export const getDefaultHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add auth token from memory store only (HTTP Only Cookie architecture)
  const token = getCurrentAccessToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error: Unable to connect to server. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout: Server took too long to respond.',
  SERVER_ERROR: 'Server error: Something went wrong on our end.',
  VALIDATION_ERROR: 'Validation error: Please check your input.',
  UNAUTHORIZED: 'Unauthorized: Please log in to continue.',
  FORBIDDEN: 'Forbidden: You do not have permission to perform this action.',
  NOT_FOUND: 'Not found: The requested resource was not found.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  CREATED: 'Successfully created',
  UPDATED: 'Successfully updated',
  DELETED: 'Successfully deleted',
  SAVED: 'Successfully saved',
  LOADED: 'Data loaded successfully',
} as const;
