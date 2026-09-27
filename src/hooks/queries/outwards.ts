/**
 * TanStack Query Hooks for Outward Entries
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { OutwardEntry } from '../../types/api';
import { toast } from 'sonner';

const updateOutwardListCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (existing: OutwardEntry[]) => OutwardEntry[],
) => {
  queryClient.setQueriesData(
    { queryKey: queryKeys.outwards.lists() },
    (existing) => {
      if (!existing) return existing;

      if (Array.isArray(existing)) {
        return updater(existing as OutwardEntry[]);
      }

      const record = existing as { data?: OutwardEntry[] };
      if (Array.isArray(record?.data)) {
        return {
          ...record,
          data: updater(record.data),
        };
      }

      return existing;
    }
  );
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching all outward entries
 */
export function useOutwardEntriesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
  organizationId?: string;
  limit?: number;
}) {
  const organizationId = options?.organizationId?.trim();
  const limit = options?.limit ?? 10;

  return useQuery({
    queryKey: queryKeys.outwards.list({ organizationId, limit }),
    queryFn: async (): Promise<OutwardEntry[]> => {
      const params = new URLSearchParams({ page: '0', limit: String(limit) });
      if (organizationId) {
        params.set('org_id', organizationId);
      }
      const response = await apiService.get<{ data: OutwardEntry[] }>(
        `${API_ENDPOINTS.OUTWARDS.LIST}?${params.toString()}`,
      );
      return response?.data || response || [];
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Query hook for fetching a single outward entry by ID
 */
export function useOutwardEntryQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.outwards.detail(id!),
    queryFn: async (): Promise<OutwardEntry> => {
      if (!id) throw new Error('Outward entry ID is required');
      const response = await apiService.get<OutwardEntry>(
        API_ENDPOINTS.OUTWARDS.GET(id)
      );
      return response?.data || response;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating an outward entry
 */
export function useCreateOutwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<OutwardEntry>): Promise<OutwardEntry> => {
      const response = await apiService.post<OutwardEntry>(
        API_ENDPOINTS.OUTWARDS.CREATE,
        data
      );
      return response?.data || response;
    },
    onSuccess: (newOutward) => {
      updateOutwardListCaches(queryClient, (existing) => {
        const alreadyExists = existing.some((item) => item.id === newOutward.id);
        if (alreadyExists) {
          return existing.map((item) => (item.id === newOutward.id ? newOutward : item));
        }
        return [newOutward, ...existing];
      });

      // Invalidate and refetch outward entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.outwards.lists() });
      
      // Optionally set the new outward entry in cache
      if (newOutward.id) {
        queryClient.setQueryData(
          queryKeys.outwards.detail(newOutward.id),
          newOutward
        );
      }

      toast.success('Outward entry created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create outward entry');
    },
  });
}

/**
 * Mutation hook for updating an outward entry
 */
export function useUpdateOutwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<OutwardEntry> 
    }): Promise<OutwardEntry> => {
      const response = await apiService.put<OutwardEntry>(
        API_ENDPOINTS.OUTWARDS.UPDATE(id),
        data
      );
      return response?.data || response;
    },
    onSuccess: (updatedOutward, variables) => {
      updateOutwardListCaches(queryClient, (existing) =>
        existing.map((item) => (item.id === variables.id ? updatedOutward : item))
      );

      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.outwards.lists() });
      
      // Update the specific outward entry in cache
      queryClient.setQueryData(
        queryKeys.outwards.detail(variables.id),
        updatedOutward
      );

      toast.success('Outward entry updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update outward entry');
    },
  });
}

/**
 * Mutation hook for deleting an outward entry
 */
export function useDeleteOutwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiService.delete<void>(API_ENDPOINTS.OUTWARDS.DELETE(id));
    },
    onSuccess: (_, deletedId) => {
      updateOutwardListCaches(queryClient, (existing) =>
        existing.filter((item) => item.id !== deletedId)
      );

      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.outwards.detail(deletedId) });
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.outwards.lists() });

      toast.success('Outward entry deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete outward entry');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useOutwardEntries() {
  const query = useOutwardEntriesQuery();
  const createMutation = useCreateOutwardEntryMutation();
  const updateMutation = useUpdateOutwardEntryMutation();
  const deleteMutation = useDeleteOutwardEntryMutation();

  const fetchOutwardEntries = useCallback(async (force?: boolean) => {
    if (force) {
      await query.refetch();
    }

    return query.data;
  }, [query]);

  const createOutwardEntry = useCallback(async (data: Partial<OutwardEntry>) => {
    return await createMutation.mutateAsync(data);
  }, [createMutation]);

  const updateOutwardEntry = useCallback(async (id: string, data: Partial<OutwardEntry>) => {
    return await updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);

  const deleteOutwardEntry = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
    return true;
  }, [deleteMutation]);

  return useMemo(() => ({
    // Query data
    outwardEntries: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    fetchOutwardEntries,

    // Mutations
    createOutwardEntry,
    updateOutwardEntry,
    deleteOutwardEntry,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }), [
    createMutation.isPending,
    createOutwardEntry,
    deleteMutation.isPending,
    deleteOutwardEntry,
    fetchOutwardEntries,
    query.data,
    query.error,
    query.isFetching,
    query.isLoading,
    query.refetch,
    updateMutation.isPending,
    updateOutwardEntry,
  ]);
}
