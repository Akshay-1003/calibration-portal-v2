/**
 * TanStack Query Hooks for Reading Masters
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { ReadingMaster, ReadingMasterListItem, CreateReadingMasterData } from '../../store/readingMasterStore';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface ReadingMastersQueryData {
  items: ReadingMasterListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeReadingMasterListItem = (item: any): ReadingMasterListItem => {
  const readings = Array.isArray(item?.readings)
    ? item.readings
    : Array.isArray(item?.reading_range)
    ? item.reading_range
    : [];

  const normalizedReadings = readings
    .map((value: unknown) => String(value))
    .filter((value: string) => value !== '');

  const readingRange =
    Array.isArray(item?.reading_range) && item.reading_range.length > 0
      ? item.reading_range.map((value: unknown) => String(value))
      : normalizedReadings.length > 0
      ? [normalizedReadings[0], normalizedReadings[normalizedReadings.length - 1]]
      : [];

  return {
    id: String(item?.id ?? ''),
    master_gauge_id: String(
      item?.master_gauge_id ??
      item?.masterGaugeId ??
      item?.gauge_id ??
      item?.master_gauge?.id ??
      '',
    ),
    master_gauge_name: String(
      item?.master_gauge_name ??
      item?.master_gauge?.name ??
      '',
    ),
    range: String(item?.range ?? ''),
    created_at: String(item?.created_at ?? ''),
    reading_range: readingRange,
  };
};

const fetchReadingMastersPage = async (params?: {
  page?: number;
  limit?: number;
}): Promise<ReadingMastersQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient.get(
    `${API_ENDPOINTS.READING_MASTER.LIST}?${queryParams.toString()}`
  ) as any;

  const result = extractPaginatedList<ReadingMasterListItem>(response, {
    arrayKeys: ['data', 'items', 'reading_masters'],
    mapItem: normalizeReadingMasterListItem,
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

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching all reading masters
 */
export function useReadingMastersQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.readingMasters.list(),
    queryFn: async (): Promise<ReadingMasterListItem[]> => {
      const result = await fetchReadingMastersPage({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return result.items;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

export function useReadingMastersListQuery(
  params: { page: number; limit: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.readingMasters.list(params),
    queryFn: async (): Promise<ReadingMastersQueryData> => {
      return fetchReadingMastersPage(params);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/**
 * Query hook for fetching a reading master by gauge ID
 */
export function useReadingMasterByGaugeQuery(
  gaugeId: string | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: queryKeys.readingMasters.byGauge(gaugeId!),
    queryFn: async (): Promise<ReadingMaster | null> => {
      if (!gaugeId) throw new Error('Gauge ID is required');
      try {
        const response = await apiClient.get<ReadingMaster>(
          API_ENDPOINTS.READING_MASTER.GET_BY_GAUGE(gaugeId)
        );
        return response || null;
      } catch (error) {
        // Return null for 404 (not found) instead of throwing
        if (error instanceof Error && error.message.includes('404')) {
          return null;
        }
        throw error;
      }
    },
    enabled: (options?.enabled ?? true) && !!gaugeId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating a reading master
 */
export function useCreateReadingMasterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReadingMasterData): Promise<ReadingMaster> => {
      const response = await apiClient.post<ReadingMaster>(
        API_ENDPOINTS.READING_MASTER.CREATE,
        data
      );
      return response || ({} as ReadingMaster);
    },
    onSuccess: (newReadingMaster, variables) => {
      void newReadingMaster;
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.readingMasters.lists() });
      
      // Invalidate gauge-specific query
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.readingMasters.byGauge(variables.master_gauge_id) 
      });

      toast.success('Reading master created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create reading master');
    },
  });
}

/**
 * Mutation hook for adding a reading to a reading master
 */
export function useAddReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      reading 
    }: { 
      id: string; 
      reading: number 
    }): Promise<void> => {
      await apiClient.get(
        `${API_ENDPOINTS.READING_MASTER.ADD_READING(id)}?reading=${reading}`
      );
    },
    onSuccess: (_, variables) => {
      void variables;
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.readingMasters.lists() });
      
      // Invalidate all gauge-specific queries (we don't know which gauge)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.readingMasters.all 
      });

      toast.success('Reading added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add reading');
    },
  });
}

/**
 * Mutation hook for removing a reading from a reading master
 */
export function useRemoveReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      reading 
    }: { 
      id: string; 
      reading: number 
    }): Promise<void> => {
      await apiClient.get(
        `${API_ENDPOINTS.READING_MASTER.REMOVE_READING(id)}?reading=${reading}`
      );
    },
    onSuccess: () => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.readingMasters.lists() });
      
      // Invalidate all gauge-specific queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.readingMasters.all 
      });

      toast.success('Reading removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove reading');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useReadingMasters() {
  const query = useReadingMastersQuery();
  const createMutation = useCreateReadingMasterMutation();
  const addReadingMutation = useAddReadingMutation();
  const removeReadingMutation = useRemoveReadingMutation();

  return {
    // Query data
    readingMasters: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createReadingMaster: createMutation.mutateAsync,
    addReading: addReadingMutation.mutateAsync,
    removeReading: removeReadingMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isAddingReading: addReadingMutation.isPending,
    isRemovingReading: removeReadingMutation.isPending,
  };
}




