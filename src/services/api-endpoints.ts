// Centralized API endpoints configuration
export const API_ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    GOOGLE_LOGIN: '/auth/google',
  },

  // Organizations
  ORGANIZATIONS: {
    LIST: '/organizations',
    CREATE: '/organizations',
    GET: (id: string) => `/organizations/${id}`,
    UPDATE: (id: string) => `/organizations/${id}`,
    DELETE: (id: string) => `/organizations/${id}`,
    SEARCH: '/organizations/search',
  },

  // Inward entries
  INWARD: {
    LIST: '/gauge/inwards',
    CREATE: '/gauge/inward',
    GET: (id: string) => `/gauge/inward/${id}`,
    UPDATE: (id: string) => `/gauge/inward/${id}`,
    DELETE: (id: string) => `/gauge/inward/${id}`,
    SEARCH: '/gauge/inwards/search',
  },

  // Gauges
  GAUGES: {
    LIST: '/gauge/list',
    CREATE: '/gauge/create',
    UPDATE: (id: string) => `/gauge/update/${id}`,
    DELETE: (id: string) => `/gauge/delete/${id}`,
    GET: (id: string) => `/gauge/get/${id}`,
    BY_INWARD: '/gauge/list/inward_gauges',
    LINK_TO_INWARD: '/gauge/link_to_inward',
    SEARCH: '/gauge/search',
  },

  // Certificate Types
  CERTIFICATE_TYPES: {
    LIST: '/certificate/types',
    CREATE: '/certificate/type',
    UPDATE: (id: string) => `/certificate/type/${id}`,
    DELETE: (id: string) => `/certificate/type/${id}`,
    GET: (id: string) => `/certificate/type/${id}`,
  },

  // Calibration Certificates
  CALIBRATION_CERTIFICATES: {
    LIST: '/calibration/certificates',
    CREATE: '/calibration/certificate',
    GET: (id: string) => `/calibration/certificate/${id}`,
    UPDATE: (id: string) => `/calibration/certificate/${id}`,
    DELETE: (id: string) => `/calibration/certificate/${id}`,
    GENERATE: (id: string) => `/calibration/certificate/${id}/generate`,
    DOWNLOAD: (id: string) => `/calibration/certificate/${id}/download`,
  },

  // Outward entries
  OUTWARD: {
    LIST: '/outward',
    CREATE: '/outward',
    GET: (id: string) => `/outward/${id}`,
    UPDATE: (id: string) => `/outward/${id}`,
    DELETE: (id: string) => `/outward/${id}`,
  },

  // Specifications
  SPECIFICATIONS: {
    GRADE_METHOD: '/od-limit/specifications',
    TOLERANCE_METHOD: '/od-limit/specifications',
  },

  // File uploads
  UPLOADS: {
    IMAGES: '/uploads/images',
    DOCUMENTS: '/uploads/documents',
    CERTIFICATES: '/uploads/certificates',
  },

  // Reports
  REPORTS: {
    INWARD_SUMMARY: '/reports/inward-summary',
    GAUGE_STATUS: '/reports/gauge-status',
    CALIBRATION_DUE: '/reports/calibration-due',
    EXPORT_EXCEL: '/reports/export/excel',
    EXPORT_PDF: '/reports/export/pdf',
  },
} as const;

// Type for endpoint parameters
export type EndpointParams = {
  [K in keyof typeof API_ENDPOINTS]: {
    [P in keyof typeof API_ENDPOINTS[K]]: typeof API_ENDPOINTS[K][P] extends (id: string) => string
      ? { id: string }
      : never;
  }
};

// Helper function to build query string
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

// Helper function to get endpoint with query params
export const getEndpointWithQuery = (
  endpoint: string,
  queryParams?: Record<string, any>
): string => {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return endpoint;
  }
  
  return `${endpoint}${buildQueryString(queryParams)}`;
};
