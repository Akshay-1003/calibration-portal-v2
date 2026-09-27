import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { ScopeMasterData } from '../../store/useStore';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface ScopeMastersQueryData {
  items: ScopeMasterData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeScopeMaster = (scope: any): ScopeMasterData => ({
  id: String(scope?.id ?? ''),
  archived: Boolean(scope?.archived ?? false),
  updated_at: String(scope?.updated_at ?? ''),
  created_at: String(scope?.created_at ?? ''),
  deleted_at: scope?.deleted_at ?? null,
  master_gauge_id: String(scope?.master_gauge_id ?? ''),
  unit: (scope?.unit ?? 'mm') as ScopeMasterData['unit'],
  range: {
    min: String(scope?.range?.min ?? '0'),
    max: String(scope?.range?.max ?? '0'),
  },
  least_count: String(scope?.least_count ?? '0'),
  valid_until: String(scope?.valid_until ?? ''),
  uncertainty: String(scope?.uncertainty ?? ''),
  confidence_level_and_coverage: String(
    scope?.confidence_level_and_coverage ?? ''
  ),
  calibration_location: scope?.calibration_location
    ? (String(scope.calibration_location) as ScopeMasterData['calibration_location'])
    : 'permanent_facility',
  remarks: String(scope?.remarks ?? ''),
  calibration_equipments: Array.isArray(scope?.calibration_equipments)
    ? scope.calibration_equipments
    : [],
  master_equipments: Array.isArray(scope?.master_equipments)
    ? scope.master_equipments
    : [],
});

export const fetchScopeMastersPage = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ScopeMastersQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const search = params?.search?.trim();
  if (search) {
    queryParams.set('search', search);
  }

  const response = await apiClient.get(`/scope-masters?${queryParams.toString()}`) as any;
  const result = extractPaginatedList<ScopeMasterData>(response, {
    arrayKeys: ['data', 'items', 'scope_masters', 'scopes'],
    mapItem: normalizeScopeMaster,
    fallbackPage: page,
    fallbackLimit: limit,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

export function useScopeMastersQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.scopeMasters.list(),
    queryFn: async (): Promise<ScopeMasterData[]> => {
      const result = await fetchScopeMastersPage({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return result.items;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useScopeMastersListQuery(
  params: { page: number; limit: number; search?: string },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.scopeMasters.list(params),
    queryFn: () => fetchScopeMastersPage(params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
