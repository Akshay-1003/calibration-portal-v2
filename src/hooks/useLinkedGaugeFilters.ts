import { useCallback, useEffect, useState } from 'react';
import { useFilterUrlState } from './useFilterUrlState';
import { apiToCalendarDate, calendarDateToApi } from '../utils/dateAdapter';
import type { DateValue } from '@internationalized/date';
import type { LinkedGaugeApiFilters } from '../utils/filterBuilder';

interface UseLinkedGaugeFiltersProps {
  prefix: string;
}

interface LinkedGaugeFilterState {
  clientOrgId: string | null;
  labId: string;
  startDate: DateValue | null;
  endDate: DateValue | null;
  dateError: string | null;
}

interface LinkedGaugeFilterHandlers {
  onClientOrgChange: (clientOrgId: string | null) => void;
  onLabIdChange: (labId: string) => void;
  onStartDateChange: (date: DateValue | null) => void;
  onEndDateChange: (date: DateValue | null) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

/**
 * Controller hook for managing linked gauge filters
 * Provides state, handlers, and API-ready filters
 */
export function useLinkedGaugeFilters({ prefix }: UseLinkedGaugeFiltersProps) {
  // URL state management
  const urlFilters = useFilterUrlState({
    prefix,
    filterKeys: ['client_org_id', 'lab_id', 'date_from', 'date_to'],
  });

  // Local UI state - synced with URL
  const [clientOrgId, setClientOrgId] = useState<string | null>(
    () => urlFilters.filters?.client_org_id ?? null
  );

  const [labId, setLabId] = useState<string>(
    () => urlFilters.filters?.lab_id ?? ''
  );

  const [startDate, setStartDate] = useState<DateValue | null>(() => {
    return apiToCalendarDate(urlFilters.filters?.date_from);
  });

  const [endDate, setEndDate] = useState<DateValue | null>(() => {
    return apiToCalendarDate(urlFilters.filters?.date_to);
  });

  const [dateError, setDateError] = useState<string | null>(null);

  // API-ready filters state - updated directly when filters are applied
  const [apiFilters, setApiFilters] = useState<LinkedGaugeApiFilters | undefined>(() => {
    // Initialize from URL on mount
    const filters: LinkedGaugeApiFilters = {};
    if (urlFilters.filters?.client_org_id?.trim()) {
      filters.client_org_id = urlFilters.filters.client_org_id.trim();
    }
    if (urlFilters.filters?.lab_id?.trim()) {
      filters.lab_id = urlFilters.filters.lab_id.trim();
    }
    if (urlFilters.filters?.date_from?.trim()) {
      filters.inward_date_from = urlFilters.filters.date_from.trim();
    }
    if (urlFilters.filters?.date_to?.trim()) {
      filters.inward_date_to = urlFilters.filters.date_to.trim();
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  });
  // Sync UI state with URL (browser back/forward)
  useEffect(() => {
    setClientOrgId(urlFilters.filters?.client_org_id ?? null);
  }, [urlFilters.filters?.client_org_id]);

  useEffect(() => {
    setLabId(urlFilters.filters?.lab_id ?? '');
  }, [urlFilters.filters?.lab_id]);

  useEffect(() => {
    setStartDate(apiToCalendarDate(urlFilters.filters?.date_from));
  }, [urlFilters.filters?.date_from]);

  useEffect(() => {
    setEndDate(apiToCalendarDate(urlFilters.filters?.date_to));
  }, [urlFilters.filters?.date_to]);

  // Sync apiFilters with URL (for browser back/forward)
  useEffect(() => {
    const filters: LinkedGaugeApiFilters = {};
    if (urlFilters.filters?.client_org_id?.trim()) {
      filters.client_org_id = urlFilters.filters.client_org_id.trim();
    }
    if (urlFilters.filters?.lab_id?.trim()) {
      filters.lab_id = urlFilters.filters.lab_id.trim();
    }
    if (urlFilters.filters?.date_from?.trim()) {
      filters.inward_date_from = urlFilters.filters.date_from.trim();
    }
    if (urlFilters.filters?.date_to?.trim()) {
      filters.inward_date_to = urlFilters.filters.date_to.trim();
    }
    setApiFilters(Object.keys(filters).length > 0 ? filters : undefined);
  }, [
    urlFilters.filters?.client_org_id,
    urlFilters.filters?.lab_id,
    urlFilters.filters?.date_from,
    urlFilters.filters?.date_to,
  ]);

  // Handlers
  const handleClientOrgChange = useCallback((value: string | null) => {
    setClientOrgId(value);
  }, []);

  const handleLabIdChange = useCallback((value: string) => {
    setLabId(value);
  }, []);

  const handleStartDateChange = useCallback((date: DateValue | null) => {
    setStartDate(date);
    setDateError(null);
  }, []);

  const handleEndDateChange = useCallback((date: DateValue | null) => {
    setEndDate(date);
    setDateError(null);
  }, []);

  const handleApplyFilters = useCallback(() => {
    if (startDate && endDate && startDate.compare(endDate) > 0) {
      setDateError('From date cannot be after To date');
      return;
    }

    // Convert CalendarDate to DD-MM-YYYY for URL and API
    const dateFromApi = calendarDateToApi(startDate);
    const dateToApi = calendarDateToApi(endDate);
    
    const clientOrgIdValue = clientOrgId?.trim() || undefined;
    const labIdValue = labId?.trim() || undefined;

    // Build API-ready filters directly
    const filters: LinkedGaugeApiFilters = {};
    if (clientOrgIdValue) {
      filters.client_org_id = clientOrgIdValue;
    }
    if (labIdValue) {
      filters.lab_id = labIdValue;
    }
    if (dateFromApi) {
      filters.inward_date_from = dateFromApi;
    }
    if (dateToApi) {
      filters.inward_date_to = dateToApi;
    }

    // Update API filters state immediately
    setApiFilters(Object.keys(filters).length > 0 ? filters : undefined);

    // Update URL (for browser history/bookmarking)
    urlFilters.setFilters({
      client_org_id: clientOrgIdValue,
      lab_id: labIdValue,
      date_from: dateFromApi,
      date_to: dateToApi,
    });
  }, [clientOrgId, labId, startDate, endDate, urlFilters]);

  const handleClearFilters = useCallback(() => {
    setClientOrgId(null);
    setLabId('');
    setStartDate(null);
    setEndDate(null);
    setDateError(null);

    // Clear API filters immediately
    setApiFilters(undefined);

    // Clear URL filters
    urlFilters.clearFilters();
  }, [urlFilters]);

  const state: LinkedGaugeFilterState = {
    clientOrgId,
    labId,
    startDate,
    endDate,
    dateError,
  };

  const handlers: LinkedGaugeFilterHandlers = {
    onClientOrgChange: handleClientOrgChange,
    onLabIdChange: handleLabIdChange,
    onStartDateChange: handleStartDateChange,
    onEndDateChange: handleEndDateChange,
    onApplyFilters: handleApplyFilters,
    onClearFilters: handleClearFilters,
  };

  return {
    state,
    handlers,
    apiFilters, // API-ready filters in DD-MM-YYYY format
  };
}

