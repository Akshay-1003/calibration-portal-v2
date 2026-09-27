/**
 * TanStack Query Hooks for Gauge Masters
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { apiService } from '../../services/apiService';
import { queryClient } from '../../core/query/queryClient';
import { queryKeys } from './queryKeys';
import type { CompanyGaugeData } from '../../store/gaugeStore';
import { toast } from 'sonner';
import { fetchCertificateTypes } from './certificateTypes';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface GaugeMastersQueryData {
  items: CompanyGaugeData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const mapGaugeMaster = (gauge: any): CompanyGaugeData => ({
  id: gauge.id || '',
  name: gauge.name || '',
  is_standard_no: gauge.is_standard_no || '',
  non_nabl_cert_frmt_no: gauge.non_nabl_cert_frmt_no || '',
  nabl_cert_frmt_no: gauge.nabl_cert_frmt_no || '',
  raw_datasheet_frmt_no: gauge.raw_datasheet_frmt_no || '',
  certificate_code: gauge.certificate_code || '',
  calibration_method: gauge.calibration_method || '',
  environmental_conditions: gauge.environmental_conditions || '',
  certificate_type_id: gauge.certificate_type_id || '',
  certificate_type_name: '',
  specifications: gauge.specifications ?? null,
  unit: gauge.unit || 'mm',
  hsn_sac: gauge.hsn_sac || gauge.hsn || gauge.hsn_code || '',
  archived: gauge.archived || false,
  created_at: gauge.created_at || '',
  updated_at: gauge.updated_at || '',
  deleted_at: gauge.deleted_at || '',
});

const attachCertificateTypeNames = async (
  gaugeData: CompanyGaugeData[],
): Promise<CompanyGaugeData[]> => {
  const certificateTypes = await queryClient.ensureQueryData({
    queryKey: queryKeys.certificateTypes.list(),
    queryFn: fetchCertificateTypes,
    staleTime: 5 * 60 * 1000,
  });
  const certificateTypeNameMap = new Map(
    certificateTypes.map((certificateType) => [certificateType.id, certificateType.name]),
  );

  return gaugeData.map((gauge) => {
    if (gauge.certificate_type_id) {
      return {
        ...gauge,
        certificate_type_name: certificateTypeNameMap.get(gauge.certificate_type_id) || '',
      };
    }
    return gauge;
  });
};

export const fetchAllGaugeMasters = async (): Promise<CompanyGaugeData[]> => {
  const firstPage = await fetchGaugeMastersPage({
    page: 0,
    limit: DEFAULT_BULK_FETCH_LIMIT,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const allItems = [...firstPage.items];

  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const nextPage = await fetchGaugeMastersPage({
      page,
      limit: firstPage.limit,
    });
    allItems.push(...nextPage.items);
  }

  return allItems;
};

const fetchGaugeMastersPage = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<GaugeMastersQueryData> => {
  const response = await apiService.getGaugeMasters({
    ...(params?.page !== undefined ? { page: params.page } : {}),
    ...(params?.limit !== undefined ? { limit: params.limit } : {}),
    ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
  });

  const result = extractPaginatedList(response, {
    arrayKeys: ['data', 'gauges', 'items'],
    fallbackLimit: params?.limit ?? DEFAULT_BULK_FETCH_LIMIT,
  });

  const items = await attachCertificateTypeNames(result.items.map(mapGaugeMaster));

  return {
    items,
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
 * Query hook for fetching all gauge masters
 */
export function useGaugeMastersQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.gaugeMasters.list(),
    queryFn: fetchAllGaugeMasters,
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutes default
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useGaugeMastersListQuery(
  params: { page: number; limit: number; search?: string },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.gaugeMasters.list(params),
    queryFn: async (): Promise<GaugeMastersQueryData> => {
      return fetchGaugeMastersPage(params);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
  });
}

/**
 * Query hook for fetching a single gauge master by ID
 */
export function useGaugeMasterQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.gaugeMasters.detail(id!),
    queryFn: async (): Promise<CompanyGaugeData> => {
      if (!id) throw new Error('Gauge master ID is required');
      const response = await apiClient.get(`/gauge/master/${id}`) as any;
      return response?.data || response;
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating a gauge master
 */
export function useCreateGaugeMasterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<CompanyGaugeData>): Promise<CompanyGaugeData> => {
      const response = await apiClient.post('/gauge/master', data) as any;
      return response?.data || response;
    },
    onSuccess: (newGauge) => {
      // Invalidate and refetch gauge masters list
      queryClient.invalidateQueries({ queryKey: queryKeys.gaugeMasters.lists() });
      
      // Optionally set the new gauge in cache
      if (newGauge?.id) {
        queryClient.setQueryData(
          queryKeys.gaugeMasters.detail(newGauge.id),
          newGauge
        );
      }

      toast.success('Gauge master created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create gauge master');
    },
  });
}

/**
 * Mutation hook for updating a gauge master
 */
export function useUpdateGaugeMasterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<CompanyGaugeData> 
    }): Promise<CompanyGaugeData> => {
      const response = await apiClient.patch(`/gauge/master/${id}`, data) as any;
      return response?.data || response;
    },
    onSuccess: (updatedGauge, variables) => {
      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.gaugeMasters.lists() });
      
      // Update the specific gauge in cache
      queryClient.setQueryData(
        queryKeys.gaugeMasters.detail(variables.id),
        updatedGauge
      );

      toast.success('Gauge master updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update gauge master');
    },
  });
}

/**
 * Mutation hook for deleting a gauge master
 */
export function useDeleteGaugeMasterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/gauge/master/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.gaugeMasters.detail(deletedId) });
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.gaugeMasters.lists() });

      toast.success('Gauge master deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete gauge master');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useGaugeMasters() {
  const query = useGaugeMastersQuery();
  const createMutation = useCreateGaugeMasterMutation();
  const updateMutation = useUpdateGaugeMasterMutation();
  const deleteMutation = useDeleteGaugeMasterMutation();

  return {
    // Query data
    gaugeMasters: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createGaugeMaster: createMutation.mutateAsync,
    updateGaugeMaster: updateMutation.mutateAsync,
    deleteGaugeMaster: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
