/**
 * Enhanced Gauge Masters Hook with TanStack Query
 * 
 * Uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores.
 */

import { useGaugeMastersQuery, useCreateGaugeMasterMutation, useUpdateGaugeMasterMutation, useDeleteGaugeMasterMutation } from './queries/gaugeMasters';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useGaugeStore } from '../store/gaugeStore';
import type { CompanyGaugeData } from '../store/gaugeStore';

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 */
export function useGaugeMastersWithQuery() {
  // Use TanStack Query for server data
  const query = useGaugeMastersQuery();
  
  // Mutations with automatic invalidation
  const createMutation = useCreateGaugeMasterMutation();
  const updateMutation = useUpdateGaugeMasterMutation();
  const deleteMutation = useDeleteGaugeMasterMutation();

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (gaugeMasters) => {
        useGaugeStore.setState({ gaugeMasterList: gaugeMasters });
      },
      setLoading: (loading) => {
        useGaugeStore.setState({ loading });
      },
      setError: (error) => {
        useGaugeStore.setState({ error });
      },
    },
    true
  );

  // Wrapper functions that match the existing API
  const createGaugeMaster = async (data: Partial<CompanyGaugeData>) => {
    const result = await createMutation.mutateAsync(data);
    return result;
  };

  const updateGaugeMaster = async (gaugeId: string, data: Partial<CompanyGaugeData>) => {
    const result = await updateMutation.mutateAsync({ id: gaugeId, data });
    return result;
  };

  const deleteGaugeMaster = async (gaugeId: string) => {
    await deleteMutation.mutateAsync(gaugeId);
  };

  const fetchGauges = async (forceRefresh?: boolean) => {
    if (forceRefresh) {
      await query.refetch();
    }
  };

  const refreshGauges = async () => {
    await query.refetch();
  };

  return {
    // Data (from query, synced to store)
    gaugeMasterList: query.data ?? [],
    gaugeMasters: query.data ?? [],
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    createGaugeMaster,
    updateGaugeMaster,
    deleteGaugeMaster,
    fetchGauges,
    refreshGauges,
    refetch: query.refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Store methods (for backward compatibility)
    getGaugeById: (id: string) => {
      return query.data?.find(gauge => gauge.id === id);
    },
    clearError: () => {
      useGaugeStore.getState().clearError();
    },
  };
}






