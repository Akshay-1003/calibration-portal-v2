/**
 * Filter Builder Utility
 * Clean layer for building API filter objects with proper type safety
 */

import { calendarDateToApi } from './dateAdapter';
import type { DateValue } from '@internationalized/date';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface DateRangeFilter {
  dateFrom?: DateValue | null;
  dateTo?: DateValue | null;
}

export interface InwardApiFilters {
  client_org_id?: string;
  inward_date_from?: string; // DD-MM-YYYY
  inward_date_to?: string; // DD-MM-YYYY
}

export interface LinkedGaugeApiFilters {
  client_org_id?: string;
  lab_id?: string;
  inward_date_from?: string; // DD-MM-YYYY
  inward_date_to?: string; // DD-MM-YYYY
}

// ============================================================================
// FILTER BUILDERS
// ============================================================================

/**
 * Build inward API filters from UI state
 * Converts CalendarDate to DD-MM-YYYY format expected by backend
 */
export function buildInwardFilters(params: {
  clientOrgId?: string | null;
  dateFrom?: DateValue | null;
  dateTo?: DateValue | null;
}): InwardApiFilters | undefined {
  const filters: InwardApiFilters = {};

  // Client organization ID
  if (params.clientOrgId && params.clientOrgId.trim()) {
    filters.client_org_id = params.clientOrgId.trim();
  }

  // Date range - convert from CalendarDate to DD-MM-YYYY
  const dateFrom = calendarDateToApi(params.dateFrom);
  if (dateFrom) {
    filters.inward_date_from = dateFrom;
  }

  const dateTo = calendarDateToApi(params.dateTo);
  if (dateTo) {
    filters.inward_date_to = dateTo;
  }

  // Return undefined if no filters to fetch all data
  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Build linked gauge API filters from UI state
 * Converts CalendarDate to DD-MM-YYYY format expected by backend
 */
export function buildLinkedGaugeFilters(params: {
  clientOrgId?: string | null;
  labId?: string | null;
  dateFrom?: DateValue | null;
  dateTo?: DateValue | null;
}): LinkedGaugeApiFilters | undefined {
  const filters: LinkedGaugeApiFilters = {};

  // Client organization ID
  if (params.clientOrgId && params.clientOrgId.trim()) {
    filters.client_org_id = params.clientOrgId.trim();
  }

  // Lab ID
  if (params.labId && params.labId.trim()) {
    filters.lab_id = params.labId.trim();
  }

  // Date range - convert from CalendarDate to DD-MM-YYYY
  const dateFrom = calendarDateToApi(params.dateFrom);
  if (dateFrom) {
    filters.inward_date_from = dateFrom;
  }

  const dateTo = calendarDateToApi(params.dateTo);
  if (dateTo) {
    filters.inward_date_to = dateTo;
  }

  // Return undefined if no filters to fetch all data
  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Build query string from filter object
 * Used by API service to construct URL query parameters
 */
export function buildQueryString(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value.trim() !== '') {
      params.append(key, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Check if any filters are applied
 */
export function hasActiveFilters(filters?: Record<string, any>): boolean {
  if (!filters) return false;
  
  return Object.values(filters).some(
    value => value !== undefined && value !== null && value !== ''
  );
}

/**
 * Clean filter object by removing undefined/null/empty values
 */
export function cleanFilters<T extends Record<string, any>>(filters: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key as keyof T] = value;
    }
  }
  
  return cleaned;
}


