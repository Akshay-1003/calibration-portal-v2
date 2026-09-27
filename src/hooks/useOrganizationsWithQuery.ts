/**
 * Enhanced Organizations Hook with TanStack Query
 * 
 * This hook uses TanStack Query for server data management while maintaining
 * backward compatibility with Zustand stores. It automatically syncs query
 * data to the Zustand store so existing components continue to work.
 * 
 * NEW: Use this hook for automatic cache invalidation and sync
 * OLD: useOrganizations() from hooks/useOrganizations.ts still works
 */

import {
  useOrganizationsQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  type OrganizationDirectory,
} from './queries/organizations';
import { useBridgeQueryToStore } from './queries/zustandBridge';
import { useAppStore } from '../store/appStore';
import type { OrganizationFormData } from '../store/organizationStore';

interface UseOrganizationsWithQueryOptions {
  page?: number;
  limit?: number;
  syncToStore?: boolean;
  directory?: OrganizationDirectory;
}

/**
 * Enhanced hook that uses TanStack Query with Zustand bridge
 * 
 * Benefits:
 * - Automatic cache invalidation after mutations
 * - Consistent loading states
 * - Automatic table refresh after CRUD operations
 * - Backward compatible with existing Zustand store
 */
export function useOrganizationsWithQuery(options?: UseOrganizationsWithQueryOptions) {
  // Use TanStack Query for server data
  const query = useOrganizationsQuery({
    page: options?.page,
    limit: options?.limit,
    directory: options?.directory,
  });
  
  // Mutations with automatic invalidation
  const createMutation = useCreateOrganizationMutation(options?.directory);
  const updateMutation = useUpdateOrganizationMutation(options?.directory);
  const deleteMutation = useDeleteOrganizationMutation(options?.directory);

  // Bridge query data to Zustand store for backward compatibility
  useBridgeQueryToStore(
    query,
    {
      setData: (data) => {
        // Update Zustand store directly
        useAppStore.setState({ organizations: data.organizations });
      },
      setLoading: (loading) => {
        useAppStore.setState((state) => {
          state.loading.organizations = loading;
        });
      },
      setError: (error) => {
        useAppStore.setState((state) => {
          state.errors.organizations = error;
        });
      },
    },
    options?.syncToStore ?? (options?.page === undefined && options?.limit === undefined)
  );

  // Wrapper functions that match the existing API
  const createOrganization = async (data: OrganizationFormData) => {
    const result = await createMutation.mutateAsync(data);
    // Query will automatically refetch and sync to store
    return result;
  };

  const updateOrganization = async (id: string, data: Partial<OrganizationFormData>) => {
    const result = await updateMutation.mutateAsync({ id, data });
    // Query will automatically refetch and sync to store
    return result;
  };

  const deleteOrganization = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    // Query will automatically refetch and sync to store
    return true;
  };

  const refreshOrganizations = async () => {
    await query.refetch();
  };

  return {
    // Data (from query, synced to store)
    organizations: query.data?.organizations ?? [],
    pagination: query.data
      ? {
          total: query.data.total,
          page: query.data.page,
          limit: query.data.limit,
          totalPages: query.data.totalPages,
        }
      : null,
    
    // Loading states (from query)
    loading: query.isLoading || query.isFetching,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    
    // Error state (from query)
    error: query.error ? (query.error as Error).message : null,
    
    // Actions (mutations with automatic invalidation)
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Clear error (from store)
    clearError: () => {
      useAppStore.getState().actions.clearError('organizations');
    },
  };
}
