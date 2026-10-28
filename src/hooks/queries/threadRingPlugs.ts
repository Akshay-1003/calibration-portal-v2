/**
 * TanStack Query Hooks for Thread Ring Plugs
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useInfiniteQuery, useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { ThreadRingPlugData, ThreadRingPlugApiResponse, ThreadRingPlugFormData } from '../../store/threadRingPlugStore';
import { transformApiResponseToStoreData, transformFormDataToApiFormat } from '../../store/threadRingPlugStore';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
} from '../../utils/paginatedResponse';
import {
  fetchAllThreadRingPlugs,
  fetchThreadRingPlugById,
  fetchThreadRingPlugBySpecification,
  fetchThreadRingPlugsPage,
} from '../../services/threadRingPlugSpecifications';

export interface ThreadRingPlugsQueryData {
  items: ThreadRingPlugData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching all thread ring plugs
 */
export function useThreadRingPlugsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.threadRingPlugs.list(),
    queryFn: async (): Promise<ThreadRingPlugData[]> => {
      return fetchAllThreadRingPlugs({
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

export function useThreadRingPlugsListQuery(
  params: { page: number; limit: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.threadRingPlugs.list(params),
    queryFn: async (): Promise<ThreadRingPlugsQueryData> => {
      const result = await fetchThreadRingPlugsPage(params);

      return {
        items: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      };
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

export function useThreadRingPlugBySpecificationQuery(
  standardSpecification: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const trimmedValue = standardSpecification.trim();

  return useQuery({
    queryKey: queryKeys.threadRingPlugs.search(trimmedValue),
    queryFn: async (): Promise<ThreadRingPlugData | null> => {
      return fetchThreadRingPlugBySpecification(trimmedValue);
    },
    enabled: (options?.enabled ?? true) && trimmedValue.length > 0,
    staleTime: options?.staleTime ?? 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useThreadRingPlugByIdQuery(
  standardSpecificationId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const trimmedId = standardSpecificationId.trim();

  return useQuery({
    queryKey: queryKeys.threadRingPlugs.detail(trimmedId),
    queryFn: async (): Promise<ThreadRingPlugData | null> => {
      return fetchThreadRingPlugById(trimmedId);
    },
    enabled: (options?.enabled ?? true) && trimmedId.length > 0,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useThreadSpecificationLabelsQuery(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.threadRingPlugs.detail(id),
      queryFn: () => fetchThreadRingPlugById(id),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
    combine: (results): Record<string, string> => Object.fromEntries(ids.flatMap((id, index) => {
      const label = results[index].data?.standard_specification?.trim();
      return label ? [[id, label]] : [];
    })),
  });
}

export function useInfiniteThreadRingPlugsQuery(
  params?: { limit?: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const limit = Math.max(params?.limit ?? 100, 1);

  return useInfiniteQuery({
    queryKey: queryKeys.threadRingPlugs.infinite({ limit }),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ThreadRingPlugsQueryData> => {
      const page = typeof pageParam === 'number' ? pageParam : 0;
      const result = await fetchThreadRingPlugsPage({ page, limit });

      return {
        items: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.page + 1 : undefined,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating a thread ring plug
 */
export function useCreateThreadRingPlugMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ThreadRingPlugFormData): Promise<ThreadRingPlugApiResponse> => {
      const apiData = transformFormDataToApiFormat(data);
      const response = await apiClient.post('/plain-thread/specifications', apiData) as any;
      return response?.data || response;
    },
    onSuccess: (newThreadRingPlug) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threadRingPlugs.all });
      
      // Optionally set the new item in cache
      if (newThreadRingPlug?.id) {
        queryClient.setQueryData(
          queryKeys.threadRingPlugs.detail(newThreadRingPlug.id),
          transformApiResponseToStoreData(newThreadRingPlug)
        );
      }

      toast.success('Thread Ring/Plug created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create Thread Ring/Plug');
    },
  });
}

/**
 * Mutation hook for updating a thread ring plug
 */
export function useUpdateThreadRingPlugMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: ThreadRingPlugFormData 
    }): Promise<ThreadRingPlugApiResponse> => {
      const apiData = transformFormDataToApiFormat(data);
      const response = await apiClient.put(`/plain-thread/specifications/${id}`, apiData) as any;
      return response?.data || response;
    },
    onSuccess: (updatedThreadRingPlug, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threadRingPlugs.all });
      
      // Update the specific item in cache
      queryClient.setQueryData(
        queryKeys.threadRingPlugs.detail(variables.id),
        transformApiResponseToStoreData(updatedThreadRingPlug)
      );

      toast.success('Thread Ring/Plug updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update Thread Ring/Plug');
    },
  });
}

/**
 * Mutation hook for deleting a thread ring plug
 */
export function useDeleteThreadRingPlugMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/plain-thread/specifications/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.threadRingPlugs.detail(deletedId) });
      
      queryClient.invalidateQueries({ queryKey: queryKeys.threadRingPlugs.all });

      toast.success('Thread Ring/Plug deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete Thread Ring/Plug');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useThreadRingPlugs() {
  const query = useThreadRingPlugsQuery();
  const createMutation = useCreateThreadRingPlugMutation();
  const updateMutation = useUpdateThreadRingPlugMutation();
  const deleteMutation = useDeleteThreadRingPlugMutation();

  return {
    // Query data
    threadRingPlugs: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createThreadRingPlug: createMutation.mutateAsync,
    updateThreadRingPlug: updateMutation.mutateAsync,
    deleteThreadRingPlug: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}


