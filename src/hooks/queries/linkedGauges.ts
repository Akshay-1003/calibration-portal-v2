/**
 * TanStack Query Hook for Linked Gauges
 * Fetches inward gauge list with optional filters
 * 
 * Use 'enabled' option to conditionally fetch based on active tab
 */

import { useQuery } from '@tanstack/react-query';
import type { LinkedGauge } from '../../types';
import { queryKeys } from './queryKeys';
import { apiService } from '../../services/apiService';
import { hasActiveFilters } from '../../utils/filterBuilder';
import { extractPaginatedList } from '../../utils/paginatedResponse';

export type LinkedGaugeListFilters = {
  client_org_id?: string;
  inward_date_from?: string; // DD-MM-YYYY
  inward_date_to?: string; // DD-MM-YYYY
  lab_id?: string;
  status?: string; // gauge status filter
  search?: string;
};

export interface LinkedGaugesQueryData {
  items: LinkedGauge[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Normalize filters - remove empty/null values
 */
const normalizeFilters = (filters?: LinkedGaugeListFilters): LinkedGaugeListFilters => {
  const f = filters ?? {};
  const next: LinkedGaugeListFilters = {};

  if (f.client_org_id?.trim()) next.client_org_id = f.client_org_id.trim();
  if (f.inward_date_from?.trim()) next.inward_date_from = f.inward_date_from.trim();
  if (f.inward_date_to?.trim()) next.inward_date_to = f.inward_date_to.trim();
  if (f.lab_id?.trim()) next.lab_id = f.lab_id.trim();
  if (f.status?.trim()) next.status = f.status.trim();
  if (f.search?.trim()) next.search = f.search.trim();

  return next;
};

/**
 * Query hook for linked gauges with filters
 * @param filters - Filter object (client_org_id, lab_id, dates)
 * @param options - Query options (enabled, staleTime)
 */
export function useLinkedGaugesWithFiltersQuery(
  filters?: LinkedGaugeListFilters,
  options?: { enabled?: boolean; staleTime?: number; page?: number; limit?: number }
) {
  const normalized = normalizeFilters(filters);
  
  return useQuery({
    queryKey: queryKeys.gauges.list({
      source: 'inward-list',
      ...normalized,
      page: options?.page ?? 0,
      limit: options?.limit ?? 10,
    }),
    queryFn: async (): Promise<LinkedGaugesQueryData> => {
      const requestedPage = Math.max(options?.page ?? 0, 0);
      const requestedLimit = Math.max(options?.limit ?? 10, 1);

      const response = await apiService.getInwardGauges({
        page: requestedPage,
        limit: requestedLimit,
        ...(hasActiveFilters(normalized) ? normalized : {}),
      });

      const result = extractPaginatedList<LinkedGauge>(response, {
        arrayKeys: ['data', 'items'],
        fallbackLimit: requestedLimit,
      });

      return {
        items: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000, // 30 min
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
