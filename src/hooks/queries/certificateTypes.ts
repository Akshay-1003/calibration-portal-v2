/**
 * TanStack Query Hooks for Certificate Types
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { CertificateType } from '../../store/certificateTypeStore';
import { toast } from 'sonner';

const mapCertificateType = (certType: any): CertificateType => ({
  id: certType.id || '',
  name: certType.name || '',
  archived: certType.archived || false,
  created_at: certType.created_at || '',
  updated_at: certType.updated_at || '',
  deleted_at: certType.deleted_at || null,
  calculation_methods: certType.calculation_methods || null,
  input_format: certType.input_format || {
    gaugeName: '',
    format: {
      columns: [],
      rows: [],
    },
  },
  reading_format: certType.reading_format || {
    gaugeName: '',
    format: {
      columns: [],
      rows: [],
    },
  },
});

export async function fetchCertificateTypes(): Promise<CertificateType[]> {
  const response = await apiClient.get(API_ENDPOINTS.CERTIFICATE_TYPES.LIST) as any;
  const payload = Array.isArray(response)
    ? response
    : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.certificate_types)
        ? response.certificate_types
        : [];

  return payload.map(mapCertificateType);
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching all certificate types
 */
export function useCertificateTypesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.certificateTypes.list(),
    queryFn: fetchCertificateTypes,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching a single certificate type by ID
 */
export function useCertificateTypeQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.certificateTypes.detail(id!),
    queryFn: async (): Promise<CertificateType> => {
      if (!id) throw new Error('Certificate type ID is required');
      const response = await apiClient.get(API_ENDPOINTS.CERTIFICATE_TYPES.GET(id)) as any;
      return response?.data || response;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating a certificate type
 */
export function useCreateCertificateTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CertificateType>): Promise<CertificateType> => {
      const response = await apiClient.post(API_ENDPOINTS.CERTIFICATE_TYPES.CREATE, data) as any;
      return response?.data || response;
    },
    onSuccess: (newCertificateType) => {
      // Invalidate and refetch certificate types list
      queryClient.invalidateQueries({ queryKey: queryKeys.certificateTypes.lists() });
      
      // Optionally set the new certificate type in cache
      if (newCertificateType?.id) {
        queryClient.setQueryData(
          queryKeys.certificateTypes.detail(newCertificateType.id),
          newCertificateType
        );
      }

      toast.success('Certificate type created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create certificate type');
    },
  });
}

/**
 * Mutation hook for updating a certificate type
 */
export function useUpdateCertificateTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<CertificateType> 
    }): Promise<CertificateType> => {
      const response = await apiClient.put(API_ENDPOINTS.CERTIFICATE_TYPES.UPDATE(id), data) as any;
      return response?.data || response;
    },
    onSuccess: (updatedCertificateType, variables) => {
      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.certificateTypes.lists() });
      
      // Update the specific certificate type in cache
      queryClient.setQueryData(
        queryKeys.certificateTypes.detail(variables.id),
        updatedCertificateType
      );

      toast.success('Certificate type updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update certificate type');
    },
  });
}

/**
 * Mutation hook for deleting a certificate type
 */
export function useDeleteCertificateTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.CERTIFICATE_TYPES.DELETE(id));
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.certificateTypes.detail(deletedId) });
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.certificateTypes.lists() });

      toast.success('Certificate type deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete certificate type');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useCertificateTypes() {
  const query = useCertificateTypesQuery();
  const createMutation = useCreateCertificateTypeMutation();
  const updateMutation = useUpdateCertificateTypeMutation();
  const deleteMutation = useDeleteCertificateTypeMutation();

  return {
    // Query data
    certificateTypes: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createCertificateType: createMutation.mutateAsync,
    updateCertificateType: updateMutation.mutateAsync,
    deleteCertificateType: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}





