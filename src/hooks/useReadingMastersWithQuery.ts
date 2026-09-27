/**
 * Enhanced Reading Masters Hook with TanStack Query
 * 
 * Uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores.
 */

import { useReadingMastersQuery, useCreateReadingMasterMutation, useAddReadingMutation, useRemoveReadingMutation } from './queries/readingMasters';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useReadingMasterStore } from '../store/readingMasterStore';
import type { CreateReadingMasterData } from '../store/readingMasterStore';

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 */
export function useReadingMastersWithQuery() {
  // Use TanStack Query for server data
  const query = useReadingMastersQuery();
  
  // Mutations with automatic invalidation
  const createMutation = useCreateReadingMasterMutation();
  const addReadingMutation = useAddReadingMutation();
  const removeReadingMutation = useRemoveReadingMutation();

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (readingMasters) => {
        useReadingMasterStore.setState({ items: readingMasters });
      },
      setLoading: (loading) => {
        useReadingMasterStore.setState({ loading });
      },
      setError: (error) => {
        useReadingMasterStore.setState({ error });
      },
    },
    true
  );

  // Wrapper functions that match the existing API
  const fetchAll = async (forceRefresh?: boolean) => {
    if (forceRefresh) {
      await query.refetch();
    }
  };

  const create = async (data: CreateReadingMasterData) => {
    return await createMutation.mutateAsync(data);
  };

  const addReading = async (id: string, reading: number) => {
    await addReadingMutation.mutateAsync({ id, reading });
  };

  const removeReading = async (id: string, reading: number) => {
    await removeReadingMutation.mutateAsync({ id, reading });
  };

  return {
    // Data (from query, synced to store)
    items: query.data ?? [],
    readingMasters: query.data ?? [],
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    fetchAll,
    create,
    addReading,
    removeReading,
    refetch: query.refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isAddingReading: addReadingMutation.isPending,
    isRemovingReading: removeReadingMutation.isPending,
    
    // Store methods (for backward compatibility)
    clearError: () => {
      useReadingMasterStore.getState().actions.clearError();
    },
  };
}






