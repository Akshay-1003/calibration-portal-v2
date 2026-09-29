/**
 * Enhanced Thread Ring Plugs Hook with TanStack Query
 * 
 * Uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores.
 */

import { useThreadRingPlugsQuery, useCreateThreadRingPlugMutation, useUpdateThreadRingPlugMutation, useDeleteThreadRingPlugMutation } from './queries/threadRingPlugs';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useThreadRingPlugStore } from '../store/threadRingPlugStore';
import type { ThreadRingPlugFormData } from '../store/threadRingPlugStore';

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 */
export function useThreadRingPlugsWithQuery() {
  // Use TanStack Query for server data
  const query = useThreadRingPlugsQuery();
  
  // Mutations with automatic invalidation
  const createMutation = useCreateThreadRingPlugMutation();
  const updateMutation = useUpdateThreadRingPlugMutation();
  const deleteMutation = useDeleteThreadRingPlugMutation();

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (threadRingPlugs) => {
        useThreadRingPlugStore.setState({ threadRingPlugs });
      },
      setLoading: (loading) => {
        useThreadRingPlugStore.setState({ loading });
      },
      setError: (error) => {
        useThreadRingPlugStore.setState({ error });
      },
    },
    true
  );

  // Wrapper functions that match the existing API
  const fetchThreadRingPlugs = async () => {
    await query.refetch();
  };

  const createThreadRingPlug = async (data: ThreadRingPlugFormData) => {
    const result = await createMutation.mutateAsync(data);
    // Update store optimistically
    useThreadRingPlugStore.getState().addThreadRingPlug(result);
    return result;
  };

  const updateThreadRingPlug = async (id: string, data: ThreadRingPlugFormData) => {
    const result = await updateMutation.mutateAsync({ id, data });
    // Update store optimistically
    useThreadRingPlugStore.getState().updateThreadRingPlug(result);
    return result;
  };

  const deleteThreadRingPlug = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const refreshThreadRingPlugs = async () => {
    await query.refetch();
  };

  return {
    // Data (from query, synced to store)
    threadRingPlugs: query.data ?? [],
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    fetchThreadRingPlugs,
    createThreadRingPlug,
    updateThreadRingPlug,
    deleteThreadRingPlug,
    refreshThreadRingPlugs,
    refetch: query.refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}





