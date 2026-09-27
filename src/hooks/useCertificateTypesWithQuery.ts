/**
 * Enhanced Certificate Types Hook with TanStack Query
 * 
 * Uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores.
 */

import { useCertificateTypesQuery, useCreateCertificateTypeMutation, useUpdateCertificateTypeMutation, useDeleteCertificateTypeMutation } from './queries/certificateTypes';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useCertificateTypeStore } from '../store/certificateTypeStore';

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 */
export function useCertificateTypesWithQuery() {
  // Use TanStack Query for server data
  const query = useCertificateTypesQuery();
  
  // Mutations with automatic invalidation
  const createMutation = useCreateCertificateTypeMutation();
  const updateMutation = useUpdateCertificateTypeMutation();
  const deleteMutation = useDeleteCertificateTypeMutation();

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (certificateTypes) => {
        useCertificateTypeStore.setState({ certificateTypes });
      },
      setLoading: (loading) => {
        useCertificateTypeStore.setState({ loading });
      },
      setError: (error) => {
        useCertificateTypeStore.setState({ error });
      },
    },
    true
  );

  // Wrapper functions that match the existing API
  const fetchAllCertificateTypes = async (forceRefresh?: boolean) => {
    if (forceRefresh) {
      await query.refetch();
    }
    return query.data ?? [];
  };

  const refreshCertificateTypes = async () => {
    await query.refetch();
  };

  return {
    // Data (from query, synced to store)
    certificateTypes: query.data ?? [],
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    createCertificateType: createMutation.mutateAsync,
    updateCertificateType: updateMutation.mutateAsync,
    deleteCertificateType: deleteMutation.mutateAsync,
    fetchAllCertificateTypes,
    refreshCertificateTypes,
    refetch: query.refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Store methods (for backward compatibility)
    getCertificateTypeById: (id: string) => {
      return query.data?.find(certType => certType.id === id);
    },
    getCertificateTypeNameById: (id: string) => {
      const certType = query.data?.find(certType => certType.id === id);
      return certType?.name || '';
    },
    clearError: () => {
      useCertificateTypeStore.getState().clearError();
    },
  };
}





