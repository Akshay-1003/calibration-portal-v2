/**
 * Enhanced Taper Thread Readings Hook with TanStack Query
 * 
 * Uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores.
 */

import { useTaperThreadReadingsQuery, useCreateTaperThreadReadingMutation, useUpdateTaperThreadReadingMutation, useDeleteTaperThreadReadingMutation } from './queries/taperThreadReadings';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useTaperThreadReadingsStore } from '../store/taperThreadReadingsStore';
import type { TaperThreadReadingsFormData } from '../store/taperThreadReadingsStore';

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 */
export function useTaperThreadReadingsWithQuery() {
  // Use TanStack Query for server data
  const query = useTaperThreadReadingsQuery();
  
  // Mutations with automatic invalidation
  const createMutation = useCreateTaperThreadReadingMutation();
  const updateMutation = useUpdateTaperThreadReadingMutation();
  const deleteMutation = useDeleteTaperThreadReadingMutation();

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (taperThreadReadings) => {
        useTaperThreadReadingsStore.setState({ taperThreadReadings });
      },
      setLoading: (loading) => {
        useTaperThreadReadingsStore.setState({ loading });
      },
      setError: (error) => {
        useTaperThreadReadingsStore.setState({ error });
      },
    },
    true
  );

  // Wrapper functions that match the existing API
  const fetchTaperThreadReadings = async () => {
    await query.refetch();
  };

  const createTaperThreadReading = async (data: TaperThreadReadingsFormData) => {
    const result = await createMutation.mutateAsync(data);
    // Update store optimistically
    useTaperThreadReadingsStore.getState().addTaperThreadReading(result);
    return result;
  };

  const updateTaperThreadReading = async (standardSpecification: string, data: TaperThreadReadingsFormData) => {
    const result = await updateMutation.mutateAsync({ standardSpecification, data });
    // Update store optimistically
    useTaperThreadReadingsStore.getState().updateTaperThreadReading(result);
    return result;
  };

  const deleteTaperThreadReading = async (standardSpecification: string) => {
    await deleteMutation.mutateAsync(standardSpecification);
  };

  const refreshTaperThreadReadings = async () => {
    await query.refetch();
  };

  return {
    // Data (from query, synced to store)
    taperThreadReadings: query.data ?? [],
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    fetchTaperThreadReadings,
    createTaperThreadReading,
    updateTaperThreadReading,
    deleteTaperThreadReading,
    refreshTaperThreadReadings,
    refetch: query.refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}





