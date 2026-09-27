/**
 * TanStack Query Hooks for Equipments
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { EquipmentData } from '../../types/equipment';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

// ============================================================================
// QUERY HOOKS
// ============================================================================

export interface EquipmentsQueryData {
  items: EquipmentData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeEquipment = (equipment: any): EquipmentData => ({
  id: equipment?.id || '',
  equipment_name: equipment?.equipment_name || '',
  code_no: equipment?.code_no || '',
  serial_no: equipment?.serial_no || '',
  mfg_date: equipment?.mfg_date || '',
  date_of_installation: equipment?.date_of_installation || '',
  reference_std: equipment?.reference_std || '',
  least_count: equipment?.least_count || '',
  cal_agency: equipment?.cal_agency || '',
  make: equipment?.make || '',
  size_range: equipment?.size_range || '',
  periodicity_no: equipment?.periodicity_no || '',
  equipment_location: equipment?.equipment_location || '',
  ranges: Array.isArray(equipment?.ranges) ? equipment.ranges : [],
  archived: equipment?.archived || false,
  created_at: equipment?.created_at || '',
  updated_at: equipment?.updated_at || '',
  deleted_at: equipment?.deleted_at || '',
});

export const fetchEquipmentsPage = async (params?: {
  page?: number;
  limit?: number;
}): Promise<EquipmentsQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient.get(`/equipment?${queryParams.toString()}`) as any;
  const result = extractPaginatedList<EquipmentData>(response, {
    arrayKeys: ['data', 'items', 'equipments'],
    mapItem: normalizeEquipment,
    fallbackPage: page,
    fallbackLimit: limit,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

export const fetchEquipments = async (): Promise<EquipmentData[]> => {
  const result = await fetchEquipmentsPage({
    page: 0,
    limit: DEFAULT_BULK_FETCH_LIMIT,
  });
  return result.items;
};

export const fetchEquipmentById = async (id: string): Promise<EquipmentData> => {
  const response = await apiClient.get(`/equipment/${id}`) as any;
  const payload = response?.data?.data ?? response?.data ?? response;
  return normalizeEquipment(payload);
};

/**
 * Query hook for fetching all equipments
 */
export function useEquipmentsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.equipments.list(),
    queryFn: fetchEquipments,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

export function useEquipmentsListQuery(
  params?: { page?: number; limit?: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);

  return useQuery({
    queryKey: queryKeys.equipments.list({ page, limit }),
    queryFn: () => fetchEquipmentsPage({ page, limit }),
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/**
 * Query hook for fetching a single equipment by ID
 */
export function useEquipmentQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.equipments.detail(id!),
    queryFn: async (): Promise<EquipmentData> => {
      if (!id) throw new Error('Equipment ID is required');
      return fetchEquipmentById(id);
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating an equipment
 */
export function useCreateEquipmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<EquipmentData>): Promise<EquipmentData> => {
      const response = await apiClient.post('/equipment', data) as any;
      return response?.data || response;
    },
    onSuccess: (newEquipment) => {
      // Invalidate and refetch equipments list
      queryClient.invalidateQueries({ queryKey: queryKeys.equipments.lists() });
      
      // Optionally set the new equipment in cache
      if (newEquipment?.id) {
        queryClient.setQueryData(
          queryKeys.equipments.detail(newEquipment.id),
          newEquipment
        );
      }

      toast.success('Equipment created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create equipment');
    },
  });
}

/**
 * Mutation hook for updating an equipment
 */
export function useUpdateEquipmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<EquipmentData> 
    }): Promise<EquipmentData> => {
      const response = await apiClient.patch(`/equipment/${id}`, data) as any;
      return response?.data || response;
    },
    onSuccess: (updatedEquipment, variables) => {
      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.equipments.lists() });
      
      // Update the specific equipment in cache
      queryClient.setQueryData(
        queryKeys.equipments.detail(variables.id),
        updatedEquipment
      );

      toast.success('Equipment updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update equipment');
    },
  });
}

/**
 * Mutation hook for deleting an equipment
 */
export function useDeleteEquipmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/equipment/${id}`);
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.equipments.detail(deletedId) });
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.equipments.lists() });

      toast.success('Equipment deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete equipment');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useEquipments() {
  const query = useEquipmentsQuery();
  const createMutation = useCreateEquipmentMutation();
  const updateMutation = useUpdateEquipmentMutation();
  const deleteMutation = useDeleteEquipmentMutation();

  return {
    // Query data
    equipments: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createEquipment: createMutation.mutateAsync,
    updateEquipment: updateMutation.mutateAsync,
    deleteEquipment: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}


