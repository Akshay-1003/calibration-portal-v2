import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Filter state structure for linked gauges
 * Dates are stored in DD-MM-YYYY format (API format)
 */
export interface LinkedGaugeFilters {
  client_org_id?: string;
  lab_id?: string;
  inward_date_from?: string; // DD-MM-YYYY
  inward_date_to?: string;   // DD-MM-YYYY
  status?: string;            // gauge status filter
  search?: string;
}

interface CalibrationCertificateFilterState {
  // Filter state for each tab
  pendingFilters: LinkedGaugeFilters;
  completedFilters: LinkedGaugeFilters;
  activeTab: 'new-certificate' | 'view-certificate';
  pendingPage: number;
  pendingRowsPerPage: number;
  completedPage: number;
  completedRowsPerPage: number;
  pendingSearchTerm: string;
  completedSearchTerm: string;

  // Actions
  setPendingFilters: (filters: LinkedGaugeFilters) => void;
  setCompletedFilters: (filters: LinkedGaugeFilters) => void;
  resetPendingFilters: () => void;
  resetCompletedFilters: () => void;
  setActiveTab: (tab: 'new-certificate' | 'view-certificate') => void;
  setPendingPage: (page: number) => void;
  setPendingRowsPerPage: (rowsPerPage: number) => void;
  setCompletedPage: (page: number) => void;
  setCompletedRowsPerPage: (rowsPerPage: number) => void;
  setPendingSearchTerm: (searchTerm: string) => void;
  setCompletedSearchTerm: (searchTerm: string) => void;
}

// Default filters for each tab - includes status filter
const defaultPendingFilters: LinkedGaugeFilters = {
  status: 'inward_received', // Default status for pending tab
};

const defaultCompletedFilters: LinkedGaugeFilters = {
  status: 'calibration_completed', // Default status for completed tab
};

/**
 * Normalize filters to ensure we never store undefined values
 */
function normalizeFilters(filters: LinkedGaugeFilters | undefined | null): LinkedGaugeFilters {
  if (!filters || typeof filters !== 'object') {
    return {};
  }
  
  // Remove undefined/null/empty values
  const normalized: LinkedGaugeFilters = {};
  if (filters.client_org_id) normalized.client_org_id = filters.client_org_id;
  if (filters.lab_id) normalized.lab_id = filters.lab_id;
  if (filters.inward_date_from) normalized.inward_date_from = filters.inward_date_from;
  if (filters.inward_date_to) normalized.inward_date_to = filters.inward_date_to;
  if (filters.status) normalized.status = filters.status;
  if (filters.search) normalized.search = filters.search;
  
  return normalized;
}

export const useCalibrationCertificateFilterStore = create<CalibrationCertificateFilterState>()(
  devtools(
    (set) => ({
      // Initial state - always valid objects with default status filters
      pendingFilters: defaultPendingFilters,
      completedFilters: defaultCompletedFilters,
      activeTab: 'new-certificate',
      pendingPage: 1,
      pendingRowsPerPage: 10,
      completedPage: 1,
      completedRowsPerPage: 10,
      pendingSearchTerm: '',
      completedSearchTerm: '',

      // Set pending tab filters - with normalization guard
      setPendingFilters: (filters) => {
        const normalized = normalizeFilters(filters);
        set(
          { pendingFilters: normalized },
          false,
          'calibrationCertificate/setPendingFilters'
        );
      },

      // Set completed tab filters - with normalization guard
      setCompletedFilters: (filters) => {
        const normalized = normalizeFilters(filters);
        set(
          { completedFilters: normalized },
          false,
          'calibrationCertificate/setCompletedFilters'
        );
      },

      // Reset pending tab filters to default (with status)
      resetPendingFilters: () =>
        set(
          { pendingFilters: defaultPendingFilters },
          false,
          'calibrationCertificate/resetPendingFilters'
        ),

      // Reset completed tab filters to default (with status)
      resetCompletedFilters: () =>
        set(
          { completedFilters: defaultCompletedFilters },
          false,
          'calibrationCertificate/resetCompletedFilters'
        ),

      setActiveTab: (tab) =>
        set(
          { activeTab: tab },
          false,
          'calibrationCertificate/setActiveTab'
        ),

      setPendingPage: (page) =>
        set(
          { pendingPage: Math.max(page, 1) },
          false,
          'calibrationCertificate/setPendingPage'
        ),

      setPendingRowsPerPage: (rowsPerPage) =>
        set(
          {
            pendingRowsPerPage: Math.max(rowsPerPage, 1),
            pendingPage: 1,
          },
          false,
          'calibrationCertificate/setPendingRowsPerPage'
        ),

      setCompletedPage: (page) =>
        set(
          { completedPage: Math.max(page, 1) },
          false,
          'calibrationCertificate/setCompletedPage'
        ),

      setCompletedRowsPerPage: (rowsPerPage) =>
        set(
          {
            completedRowsPerPage: Math.max(rowsPerPage, 1),
            completedPage: 1,
          },
          false,
          'calibrationCertificate/setCompletedRowsPerPage'
        ),

      setPendingSearchTerm: (searchTerm) =>
        set(
          {
            pendingSearchTerm: searchTerm,
            pendingPage: 1,
          },
          false,
          'calibrationCertificate/setPendingSearchTerm'
        ),

      setCompletedSearchTerm: (searchTerm) =>
        set(
          {
            completedSearchTerm: searchTerm,
            completedPage: 1,
          },
          false,
          'calibrationCertificate/setCompletedSearchTerm'
        ),
    }),
    { name: 'CalibrationCertificateFilterStore' }
  )
);
