
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Selection, SortDescriptor } from '@heroui/react';
import type { DateValue } from '@internationalized/date';
import { useTableUrlState } from './useTableUrlState';
import { useDateFilterUrlState } from './useDateFilterUrlState';
import { useFilterUrlState } from './useFilterUrlState';
import { apiToCalendarDate, calendarDateToApi } from '../utils/dateAdapter';
import type { InwardEntriesListQueryFilters } from './queries/inwards';
import { buildRegisterGaugeRoute } from '../utils/inwardRoutes';

export type ClientData = {
  id: string;
  client_org_id: string;
  billing_org_id: string;
  delivery_org_id: string;
  client_org_name: string;
  billing_org_name: string;
  delivery_org_name: string;
  other_access_org_id: string;
  client_dc_no: string;
  client_dc_date: string;
  through: string;
  inward_date: string;
  received_date: string;
  commit_date: string;
  calibration_method: string;
  reporting_method: string;
  collection_mode: string;
  dispatch_mode: string;
  additional_requirements: string;
  lab_authorized_person_id: string;
  lab_authorized_person_designation: string;
  client_authorized_person_id: string;
  created_at: string | null;
  updated_at: string | null;
  inward_no: string;
};
interface UseInwardTableControllerProps {
  data: ClientData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDelete?: (inward: ClientData) => void;
  onPrintChalan?: (inward: ClientData) => void;
  onEdit?: (inward: ClientData) => void;
  filterPrefix?: string;
}

export interface InwardTableState {
  // Data - raw data passed to table for filtering/sorting
  data: ClientData[];
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;

  // Pagination
  page: number;
  rowsPerPage: number;

  // Search & Filters
  searchValue: string;
  clientOrgId: string | null;
  startDate: DateValue | null;
  endDate: DateValue | null;
  dateError: string | null;

  // UI State
  selectedKeys: Selection;
  sortDescriptor: SortDescriptor;

  // Status
  loading: boolean;
  error: string | null;
}

export interface InwardTableHandlers {
  // Pagination
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (keys: Selection) => void;

  // Search
  onSearchChange: (value?: string) => void;
  onSearchClear: () => void;

  // Filters
  onClientOrgChange: (clientOrgId: string | null) => void;
  onStartDateChange: (date: DateValue | null) => void;
  onEndDateChange: (date: DateValue | null) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;

  // Sorting
  onSortChange: (descriptor: SortDescriptor) => void;

  // Selection
  onSelectionChange: (keys: Selection) => void;

  // Actions - Stable references guaranteed
  onRegisterGauge: (inward: ClientData) => void;
  onDelete: (inward: ClientData) => void;
  onPrintChalan: (inward: ClientData) => void;
  onEdit: (inward: ClientData) => void;
  onRefresh: () => void;
}

/**
 * Returns API-ready filters in DD/MM/YYYY format
 */
export interface InwardTableFilters {
  apiFilters: InwardEntriesListQueryFilters | undefined;
  applyVersion: number;
}

/**
 * Main controller hook
 * Returns stable state and handlers for the table view
 */
export function useInwardTableController({
  data,
  loading = false,
  error = null,
  onRefresh,
  onDelete,
  onPrintChalan,
  onEdit,
  filterPrefix = 'inward',
}: UseInwardTableControllerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // URL state management - single source of truth for filters
  const {
    state: tableUrlState,
    setPage,
    setRowsPerPage,
    setQuery,
  } = useTableUrlState({ prefix: filterPrefix, defaultRowsPerPage: 10 });

  const urlDateFilters = useDateFilterUrlState({ prefix: filterPrefix });
  const urlClientFilter = useFilterUrlState({ prefix: filterPrefix, filterKeys: ['client_org_id'] });
  // Local UI state
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'client_org_name',
    direction: 'ascending',
  });

  // Stable refs for callbacks to prevent recreation
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    locationRef.current = location;
    navigateRef.current = navigate;
  }, [location, navigate]);

  // Search state - sync with URL
  const [searchValue, setSearchValue] = useState(tableUrlState.query || '');

  useEffect(() => {
    setSearchValue(tableUrlState.query || '');
  }, [tableUrlState.query]);

  // Date filter state - sync with URL (URL stores DD-MM-YYYY, convert to DateValue for UI)
  const [startDate, setStartDate] = useState<DateValue | null>(() => {
    return apiToCalendarDate(urlDateFilters.filters?.inward_date_from);
  });

  const [endDate, setEndDate] = useState<DateValue | null>(() => {
    return apiToCalendarDate(urlDateFilters.filters?.inward_date_to);
  });

  const [dateError, setDateError] = useState<string | null>(null);

  const [clientOrgId, setClientOrgId] = useState<string | null>(
    () => urlClientFilter.filters?.client_org_id ?? null
  );

  // API-ready filters state - updated directly when filters are applied
  const [apiFilters, setApiFilters] = useState<InwardEntriesListQueryFilters | undefined>(() => {
    // Initialize from URL on mount
    const filters: InwardEntriesListQueryFilters = {};
    if (urlClientFilter.filters?.client_org_id?.trim()) {
      filters.client_org_id = urlClientFilter.filters.client_org_id.trim();
    }
    if (urlDateFilters.filters?.inward_date_from?.trim()) {
      filters.inward_date_from = urlDateFilters.filters.inward_date_from.trim();
    }
    if (urlDateFilters.filters?.inward_date_to?.trim()) {
      filters.inward_date_to = urlDateFilters.filters.inward_date_to.trim();
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  });
  const [applyVersion, setApplyVersion] = useState(0);

  // Sync date state with URL (browser back/forward) - URL has DD-MM-YYYY, convert to DateValue
  useEffect(() => {
    setStartDate(apiToCalendarDate(urlDateFilters.filters?.inward_date_from));
  }, [urlDateFilters.filters?.inward_date_from]);

  useEffect(() => {
    setEndDate(apiToCalendarDate(urlDateFilters.filters?.inward_date_to));
  }, [urlDateFilters.filters?.inward_date_to]);

  useEffect(() => {
    setClientOrgId(urlClientFilter.filters?.client_org_id ?? null);
  }, [urlClientFilter.filters?.client_org_id]);

  // Sync apiFilters with URL (for browser back/forward)
  useEffect(() => {
    const filters: InwardEntriesListQueryFilters = {};
    if (urlClientFilter.filters?.client_org_id?.trim()) {
      filters.client_org_id = urlClientFilter.filters.client_org_id.trim();
    }
    if (urlDateFilters.filters?.inward_date_from?.trim()) {
      filters.inward_date_from = urlDateFilters.filters.inward_date_from.trim();
    }
    if (urlDateFilters.filters?.inward_date_to?.trim()) {
      filters.inward_date_to = urlDateFilters.filters.inward_date_to.trim();
    }
    setApiFilters(Object.keys(filters).length > 0 ? filters : undefined);
  }, [
    urlClientFilter.filters?.client_org_id,
    urlDateFilters.filters?.inward_date_from,
    urlDateFilters.filters?.inward_date_to,
  ]);




  const handleRegisterGauge = useCallback(
    (inward: ClientData) => {
      navigate(
        buildRegisterGaugeRoute({
          inwardId: inward.id,
          clientOrgId: inward.client_org_id,
          inwardNo: inward.inward_no,
          clientOrgName: inward.client_org_name,
          inwardDate: inward.inward_date,
        }),
      );
    },
    [navigate],
  );

  /**
   * Edit handler
   */
  const handleEdit = useCallback((inward: ClientData) => {
    if (!onEdit) return;
    onEdit(inward);
  }, [onEdit]);

  /**
   * Print handler
   */
  const handlePrintChalan = useCallback((inward: ClientData) => {
    if (!onPrintChalan) return;
    onPrintChalan(inward);
  }, [onPrintChalan]);

  /**
   * Delete handler
   */
  const handleDelete = useCallback((inward: ClientData) => {
    if (!onDelete) return;
    onDelete(inward);
  }, [onDelete]);

  /**
   * Refresh handler
   */
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  // ==========================================
  // FILTER & PAGINATION HANDLERS
  // ==========================================


  const handleSearchChange = useCallback(
    (value?: string) => {
      const newValue = value || '';
      setSearchValue(newValue);
      setQuery(newValue);
      setPage(1);
    },
    [setQuery, setPage]
  );

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    setQuery('');
    setPage(1);
  }, [setQuery, setPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page);
    },
    [setPage]
  );

  const handleRowsPerPageChange = useCallback(
    (keys: Selection) => {
      const value = Array.from(keys)[0] as string;
      setRowsPerPage(Number(value));
      setPage(1);
    },
    [setRowsPerPage, setPage]
  );

  const handleSortChange = useCallback((descriptor: SortDescriptor) => {
    setSortDescriptor(descriptor);
  }, []);

  const handleSelectionChange = useCallback((keys: Selection) => {
    setSelectedKeys(keys);
  }, []);

  const handleStartDateChange = useCallback((date: DateValue | null) => {
    setStartDate(date);
    setDateError(null);
  }, []);

  const handleEndDateChange = useCallback((date: DateValue | null) => {
    setEndDate(date);
    setDateError(null);
  }, []);

  const handleClientOrgChange = useCallback((next: string | null) => {
    setClientOrgId(next);
  }, []);

  const handleApplyFilters = useCallback(() => {
    if (startDate && endDate && startDate.compare(endDate) > 0) {
      setDateError('From date cannot be after To date');
      return;
    }

    // Convert CalendarDate to DD-MM-YYYY for URL and API
    const dateFromApi = calendarDateToApi(startDate);
    const dateToApi = calendarDateToApi(endDate);
    const clientOrgIdValue = clientOrgId && clientOrgId.trim() !== '' ? clientOrgId : undefined;

    // Build API-ready filters directly
    const filters: InwardEntriesListQueryFilters = {};
    if (clientOrgIdValue) {
      filters.client_org_id = clientOrgIdValue;
    }
    if (dateFromApi) {
      filters.inward_date_from = dateFromApi;
    }
    if (dateToApi) {
      filters.inward_date_to = dateToApi;
    }

    // Update API filters state immediately
    setApiFilters(Object.keys(filters).length > 0 ? filters : undefined);
    setApplyVersion((current) => current + 1);

    // Update URL (for browser history/bookmarking)
    urlClientFilter.setFilter('client_org_id', clientOrgIdValue);
    urlDateFilters.setFilters({
      inward_date_from: dateFromApi,
      inward_date_to: dateToApi,
    });

    setPage(1);
  }, [
    clientOrgId,
    startDate,
    endDate,
    urlClientFilter,
    urlDateFilters,
    setPage,
  ]);

  const handleClearFilters = useCallback(() => {
    setStartDate(null);
    setEndDate(null);
    setClientOrgId(null);
    setDateError(null);

    // Clear API filters immediately
    setApiFilters(undefined);

    // Clear URL filters
    urlClientFilter.clearFilters();
    urlDateFilters.clearFilters();

    setPage(1);
  }, [setPage, urlClientFilter, urlDateFilters]);

  // ==========================================
  // RETURN STABLE STATE AND HANDLERS
  // ==========================================

  const state: InwardTableState = {
    data,
    page: tableUrlState.page,
    rowsPerPage: tableUrlState.rowsPerPage,
    searchValue,
    clientOrgId,
    startDate,
    endDate,
    dateError,
    selectedKeys,
    sortDescriptor,
    loading,
    error,
  };

  const handlers: InwardTableHandlers = {
    onPageChange: handlePageChange,
    onRowsPerPageChange: handleRowsPerPageChange,
    onSearchChange: handleSearchChange,
    onSearchClear: handleSearchClear,
    onClientOrgChange: handleClientOrgChange,
    onStartDateChange: handleStartDateChange,
    onEndDateChange: handleEndDateChange,
    onApplyFilters: handleApplyFilters,
    onClearFilters: handleClearFilters,
    onSortChange: handleSortChange,
    onSelectionChange: handleSelectionChange,
    onRegisterGauge: handleRegisterGauge,
    onDelete: handleDelete,
    onPrintChalan: handlePrintChalan,
    onEdit: handleEdit,
    onRefresh: handleRefresh,
  };
  return { 
    state, 
    handlers,
    apiFilters, // API-ready filters in DD-MM-YYYY format
    applyVersion,
  };
}
