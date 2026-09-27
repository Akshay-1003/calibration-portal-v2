/**
 * TanStack Query Hooks for Taper Thread Readings
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { TaperThreadReadingsData, TaperThreadReadingsApiResponse, TaperThreadReadingsFormData } from '../../store/taperThreadReadingsStore';
import { transformApiResponseToStoreData, transformFormDataToApiFormat } from '../../store/taperThreadReadingsStore';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface TaperThreadReadingsQueryData {
  items: TaperThreadReadingsData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const fetchTaperThreadReadingsPage = async (params?: {
  page?: number;
  limit?: number;
}): Promise<TaperThreadReadingsQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient.get(`/taper-thread/specifications?${queryParams.toString()}`) as any;
  const result = extractPaginatedList<TaperThreadReadingsData>(response, {
    arrayKeys: ['data', 'items', 'taper_thread_readings', 'specifications'],
    mapItem: (item) => transformApiResponseToStoreData(item as TaperThreadReadingsApiResponse),
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
 * Query hook for fetching all taper thread readings
 */
export function useTaperThreadReadingsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.taperThreadReadings.list(),
    queryFn: async (): Promise<TaperThreadReadingsData[]> => {
      const result = await fetchTaperThreadReadingsPage({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return result.items;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

export function useTaperThreadReadingsListQuery(
  params: { page: number; limit: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.taperThreadReadings.list(params),
    queryFn: async (): Promise<TaperThreadReadingsQueryData> => {
      return fetchTaperThreadReadingsPage(params);
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

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating a taper thread reading
 */
export function useCreateTaperThreadReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TaperThreadReadingsFormData): Promise<TaperThreadReadingsApiResponse> => {
      const apiData = transformFormDataToApiFormat(data);
      const response = await apiClient.post('/taper-thread/specifications', apiData) as any;
      return response?.data || response;
    },
    onSuccess: (newTaperThreadReading) => {
      // Invalidate and refetch taper thread readings list
      queryClient.invalidateQueries({ queryKey: queryKeys.taperThreadReadings.lists() });
      
      // Optionally set the new item in cache
      if (newTaperThreadReading?.id) {
        queryClient.setQueryData(
          queryKeys.taperThreadReadings.detail(newTaperThreadReading.id),
          transformApiResponseToStoreData(newTaperThreadReading)
        );
      }

      toast.success('Taper Thread Reading created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create Taper Thread Reading');
    },
  });
}

/**
 * Mutation hook for updating a taper thread reading
 */
export function useUpdateTaperThreadReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      standardSpecification, 
      data 
    }: { 
      standardSpecification: string; 
      data: TaperThreadReadingsFormData 
    }): Promise<TaperThreadReadingsApiResponse> => {
      const apiData = transformFormDataToApiFormat(data);
      const response = await apiClient.put(`/taper-thread/specifications/${standardSpecification}`, apiData) as any;
      return response?.data || response;
    },
    onSuccess: (updatedTaperThreadReading, variables) => {
      void variables;
      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.taperThreadReadings.lists() });
      
      // Update the specific item in cache if we have an ID
      if (updatedTaperThreadReading?.id) {
        queryClient.setQueryData(
          queryKeys.taperThreadReadings.detail(updatedTaperThreadReading.id),
          transformApiResponseToStoreData(updatedTaperThreadReading)
        );
      }

      toast.success('Taper Thread Reading updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update Taper Thread Reading');
    },
  });
}

/**
 * Mutation hook for deleting a taper thread reading
 */
export function useDeleteTaperThreadReadingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (standardSpecification: string): Promise<void> => {
      await apiClient.delete(`/taper-thread/specifications/${standardSpecification}`);
    },
    onSuccess: () => {
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.taperThreadReadings.lists() });

      toast.success('Taper Thread Reading deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete Taper Thread Reading');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useTaperThreadReadings() {
  const query = useTaperThreadReadingsQuery();
  const createMutation = useCreateTaperThreadReadingMutation();
  const updateMutation = useUpdateTaperThreadReadingMutation();
  const deleteMutation = useDeleteTaperThreadReadingMutation();

  return {
    // Query data
    taperThreadReadings: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createTaperThreadReading: createMutation.mutateAsync,
    updateTaperThreadReading: updateMutation.mutateAsync,
    deleteTaperThreadReading: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}



