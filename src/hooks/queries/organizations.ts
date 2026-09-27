/**
 * TanStack Query Hooks for Organizations
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { Organization } from '../../types';
import type { OrganizationFormData } from '../../store/organizationStore';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface OrganizationsQueryData {
  organizations: Organization[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type OrganizationDirectory = 'all' | 'customers' | 'laboratories';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeOrganization = (raw: unknown): Organization => {
  const record = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  const contract = isRecord(record.contract) ? record.contract : null;

  return {
    ...(record as unknown as Organization),
    id: String(record.id ?? ''),
    name: String(record.name ?? ''),
    description: String(record.description ?? ''),
    org_type: record.org_type === 'laboratory' ? 'laboratory' : record.org_type === 'customer' ? 'customer' : undefined,
    is_active: record.is_active !== false,
    lab_ids: Array.isArray(record.lab_ids) ? record.lab_ids.map(String) : [],
    lab_type: typeof record.lab_type === 'string' ? record.lab_type : null,
    lab_certificate_number:
      typeof record.lab_certificate_number === 'string' ? record.lab_certificate_number : null,
    gst: String(record.gst ?? record.gstNo ?? ''),
    gst_type: String(record.gst_type ?? record.gstType ?? ''),
    contacts: Array.isArray(record.contacts) ? (record.contacts as Organization['contacts']) : [],
    address: isRecord(record.address)
      ? (record.address as Organization['address'])
      : {
          address_line_1: '',
          address_line_2: '',
          city: '',
          state: '',
          zip_code: '',
          country: '',
        },
    contract: contract
      ? ({
          ...(contract as Organization['contract']),
          conformity_statement:
            Boolean(contract.conformity_statement ?? contract.conformity_statement),
          conformity_accepted:
            Boolean(contract.conformity_accepted ?? contract.conformity_accepted),
        } as Organization['contract'] & {
          conformity_statement?: boolean;
          conformity_accepted?: boolean;
        })
      : undefined,
  };
};

const normalizeOrganizationsResponse = (payload: unknown): OrganizationsQueryData => {
  const result = extractPaginatedList(payload, {
    arrayKeys: ['organizations', 'data', 'items'],
    mapItem: normalizeOrganization,
    fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
  });

  return {
    organizations: result.items,
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
 * Query hook for fetching all organizations
 */
export function useOrganizationsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
  page?: number;
  limit?: number;
  directory?: OrganizationDirectory;
}) {
  const directory = options?.directory ?? 'all';
  const page = options?.page ?? 0;
  const limit = options?.limit ?? DEFAULT_BULK_FETCH_LIMIT;

  return useQuery({
    queryKey: queryKeys.organizations.list({
      directory,
      page,
      limit,
    }),
    queryFn: async (): Promise<OrganizationsQueryData> => {
      const params = { page, limit };
      const response = directory === 'customers'
        ? await apiService.getCustomerOrganizations(params)
        : directory === 'laboratories'
          ? await apiService.getLaboratories(params)
          : await apiService.getOrganizations(params);
      return normalizeOrganizationsResponse(response);
    },
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutes default - increased for better caching
    gcTime: 30 * 60 * 1000,    // 30 minutes
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}

/**
 * Query hook for fetching a single organization by ID
 */
export function useOrganizationQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id!),
    queryFn: async (): Promise<Organization> => {
      if (!id) throw new Error('Organization ID is required');
      const response = await apiService.get<Organization>(
        API_ENDPOINTS.ORGANIZATIONS.GET(id)
      );
      return normalizeOrganization(response || response);
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating an organization
 */
export function useCreateOrganizationMutation(directory: OrganizationDirectory = 'all') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OrganizationFormData): Promise<Organization> => {
      const response = directory === 'customers'
        ? await apiService.createCustomerOrganization(data)
        : directory === 'laboratories'
          ? await apiService.createLaboratory(data)
          : await apiService.createOrganization(data);
      return normalizeOrganization(response || response);
    },
    onSuccess: (newOrganization) => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
      
      // Optionally set the new organization in cache
      queryClient.setQueryData(
        queryKeys.organizations.detail(newOrganization.id),
        newOrganization
      );

      toast.success('Organization created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create organization');
    },
  });
}

/**
 * Mutation hook for updating an organization
 */
export function useUpdateOrganizationMutation(directory: OrganizationDirectory = 'all') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<OrganizationFormData> 
    }): Promise<Organization> => {
      const response = directory === 'customers'
        ? await apiService.updateCustomerOrganization(id, data)
        : directory === 'laboratories'
          ? await apiService.updateLaboratory(id, data)
          : await apiService.updateOrganization(id, data);
      return normalizeOrganization(response || response);
    },
    onSuccess: (updatedOrganization, variables) => {
      // Invalidate lists to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
      
      // Update the specific organization in cache
      queryClient.setQueryData(
        queryKeys.organizations.detail(variables.id),
        updatedOrganization
      );

      toast.success('Organization updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });
}

/**
 * Mutation hook for deleting an organization
 */
export function useDeleteOrganizationMutation(directory: OrganizationDirectory = 'all') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (directory === 'customers') {
        await apiService.deleteCustomerOrganization(id);
      } else if (directory === 'laboratories') {
        await apiService.deleteLaboratory(id);
      } else {
        await apiService.deleteOrganization(id);
      }
    },
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.organizations.detail(deletedId) });
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.lists() });

      toast.success('Organization deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 * This is the recommended way to use organizations in components
 */
export function useOrganizations(directory: OrganizationDirectory = 'all') {
  const query = useOrganizationsQuery({ directory });
  const createMutation = useCreateOrganizationMutation(directory);
  const updateMutation = useUpdateOrganizationMutation(directory);
  const deleteMutation = useDeleteOrganizationMutation(directory);

  return {
    // Query data
    organizations: query.data?.organizations ?? [],
    pagination: query.data
      ? {
          total: query.data.total,
          page: query.data.page,
          limit: query.data.limit,
          totalPages: query.data.totalPages,
        }
      : null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createOrganization: createMutation.mutateAsync,
    updateOrganization: updateMutation.mutateAsync,
    deleteOrganization: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
