/**
 * TanStack Query Hooks for Inward Entries
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { queryKeys } from './queryKeys';
import type { InwardEntry } from '../../types';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

const toStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
};

const toBooleanValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
};

const pickValue = (record: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const pickNestedName = (record: Record<string, unknown>, key: string): string | undefined => {
  const nested = record[key];
  if (nested && typeof nested === 'object') {
    const name = (nested as Record<string, unknown>).name;
    if (typeof name === 'string') return name;
  }
  return undefined;
};

const normalizeInwardEntry = (raw: unknown): InwardEntry => {
  const record = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;

  const clientOrgName =
    (pickValue(record, ['client_org_name', 'clientOrgName']) as string | undefined) ??
    pickNestedName(record, 'client_org') ??
    '';

  const billingOrgName =
    (pickValue(record, ['billing_org_name', 'billingOrgName']) as string | undefined) ??
    pickNestedName(record, 'billing_org') ??
    '';

  const deliveryOrgName =
    (pickValue(record, ['delivery_org_name', 'deliveryOrgName']) as string | undefined) ??
    pickNestedName(record, 'delivery_org') ??
    '';

  return {
    id: toStringValue(pickValue(record, ['id', '_id'])),
    client_org_id: toStringValue(pickValue(record, ['client_org_id', 'clientOrgId'])),
    billing_org_id: toStringValue(pickValue(record, ['billing_org_id', 'billingOrgId'])),
    delivery_org_id: toStringValue(pickValue(record, ['delivery_org_id', 'deliveryOrgId'])),
    other_access_org_id: toStringValue(pickValue(record, ['other_access_org_id', 'otherAccessOrgId'])),
    billing_org_name: toStringValue(billingOrgName),
    delivery_org_name: toStringValue(deliveryOrgName),
    client_dc_no: toStringValue(pickValue(record, ['client_dc_no', 'clientDcNo'])),
    client_dc_date: toStringValue(pickValue(record, ['client_dc_date', 'clientDcDate'])),
    through: toStringValue(pickValue(record, ['through'])),
    inward_date: toStringValue(pickValue(record, ['inward_date', 'inwardDate'])),
    received_date: toStringValue(pickValue(record, ['received_date', 'receivedDate'])),
    commit_date: toStringValue(pickValue(record, ['commit_date', 'commitDate'])),
    conformity_statement: toBooleanValue(pickValue(record, ['conformity_statement', 'conformityStatement', 'conformity_statement', 'complianceRequired'])),
    conformity_accepted: toBooleanValue(pickValue(record, ['conformity_accepted', 'conformityAccepted', 'conformity_accepted', 'complianceAccepted'])),
    specific_requirements: toStringValue(pickValue(record, ['specific_requirements', 'specificRequirements'])),
    additional_requirements: toStringValue(pickValue(record, ['additional_requirements', 'additionalRequirements'])),
    rate_card: (pickValue(record, ['rate_card', 'rateCard']) as InwardEntry['rate_card']) ?? null,
    history_card_reference: toStringValue(pickValue(record, ['history_card_reference', 'historyCardReference'])),
    archived: toBooleanValue(pickValue(record, ['archived'])),
    deleted_at: toStringValue(pickValue(record, ['deleted_at', 'deletedAt'])),
    calibration_method: toStringValue(pickValue(record, ['calibration_method', 'calibrationMethod'])),
    reporting_method: toStringValue(pickValue(record, ['reporting_method', 'reportingMethod'])),
    collection_mode: toStringValue(pickValue(record, ['collection_mode', 'collectionMode'])),
    dispatch_mode: toStringValue(pickValue(record, ['dispatch_mode', 'dispatchMode'])),
    contact_person_name: toStringValue(pickValue(record, ['contact_person_name', 'contactPersonName'])),
    contact_person_email: toStringValue(pickValue(record, ['contact_person_email', 'contactPersonEmail'])),
    contact_person_phone: toStringValue(pickValue(record, ['contact_person_phone', 'contactPersonPhone'])),
    lab_authorized_person_id: toStringValue(pickValue(record, ['lab_authorized_person_id', 'labAuthorizedPersonId'])),
    lab_authorized_person_designation: toStringValue(pickValue(record, ['lab_authorized_person_designation', 'labAuthorizedPersonDesignation'])),
    client_authorized_person_id: toStringValue(pickValue(record, ['client_authorized_person_id', 'clientAuthorizedPersonId'])),
    client_authorized_person_contact: toStringValue(pickValue(record, ['client_authorized_person_contact', 'clientAuthorizedPersonContact'])),
    created_at: toStringValue(pickValue(record, ['created_at', 'createdAt'])),
    updated_at: toStringValue(pickValue(record, ['updated_at', 'updatedAt'])),
    client_org_name: toStringValue(clientOrgName),
    inward_no: toStringValue(pickValue(record, ['inward_no', 'inwardNo'])),
  };
};

const normalizeInwardEntries = (payload: unknown): InwardEntry[] => {
  return extractPaginatedList(payload, {
    arrayKeys: ['data', 'inwards', 'items'],
    mapItem: normalizeInwardEntry,
    fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
  }).items;
};

const extractInwardEntry = (payload: unknown): InwardEntry | null => {
  if (!payload) return null;

  if (Array.isArray(payload)) {
    return (payload[0] as InwardEntry | undefined) ?? null;
  }

  if (typeof payload === 'object' && payload !== null) {
    const responseWithData = payload as { data?: unknown };
    if (responseWithData.data) {
      return extractInwardEntry(responseWithData.data);
    }
    return payload as InwardEntry;
  }

  return null;
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching all inward entries
 */
export function useInwardEntriesQuery(options?: { enabled?: boolean; staleTime?: number }) {
  return useQuery({
    queryKey: queryKeys.inwards.list(),
    queryFn: async (): Promise<InwardEntry[]> => {
      const response = await apiService.getInwards({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return normalizeInwardEntries(response);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
}

export type InwardEntriesListQueryFilters = {
  client_org_id?: string;
  inward_date_from?: string; // DD-MM-YYYY (backend format)
  inward_date_to?: string; // DD-MM-YYYY (backend format)
};

export interface InwardEntriesListQueryData {
  items: InwardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type InwardEntriesListQueryParams = InwardEntriesListQueryFilters & {
  page?: number;
  limit?: number;
};

const normalizeInwardEntriesListResponse = (payload: unknown): InwardEntriesListQueryData => {
  const result = extractPaginatedList(payload, {
    arrayKeys: ['data', 'inwards', 'items'],
    mapItem: normalizeInwardEntry,
    fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

/**
 * Query hook for fetching inward entries with server-side filters.
 * Uses stable query keys and cache settings to avoid unnecessary refetch on navigation/back.
 * 
 * @param filters - Filter object. Pass undefined to fetch all entries.
 */
export function useInwardEntriesListQuery(
  filters?: InwardEntriesListQueryParams,
  options?: { enabled?: boolean; staleTime?: number }
) {
  return useQuery({
    queryKey: queryKeys.inwards.list(filters),
    queryFn: async (): Promise<InwardEntriesListQueryData> => {
      const response = await apiService.getInwards({
        page: filters?.page ?? 0,
        limit: filters?.limit ?? DEFAULT_BULK_FETCH_LIMIT,
        ...filters,
      });
      return normalizeInwardEntriesListResponse(response);
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
    retry: 1,
  });
}

/**
 * Query hook for fetching a single inward entry by ID
 */
export function useInwardEntryQuery(id: string | null, options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.inwards.detail(id!),
    queryFn: async (): Promise<InwardEntry> => {
      if (!id) throw new Error('Inward entry ID is required');
      const response = await apiService.getInwardById(id, { showErrorToast: false });
      const inward = extractInwardEntry(response);
      if (!inward) {
        throw new Error('Inward entry not found');
      }
      return normalizeInwardEntry(inward);
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating an inward entry
 */
export function useCreateInwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<InwardEntry>): Promise<InwardEntry> => {
      const response = await apiService.createInward(data, { showErrorToast: false });
      const inward = extractInwardEntry(response);
      if (!inward) {
        throw new Error('Failed to parse created inward entry');
      }
      return normalizeInwardEntry(inward);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create inward entry');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.inwards.lists() });
    },
    onSuccess: (newInward) => {
      // Set the new inward entry in cache
      queryClient.setQueryData(
        queryKeys.inwards.detail(newInward.id),
        newInward
      );
      queryClient.setQueriesData<InwardEntriesListQueryData>(
        {
          predicate: (query) => {
            const key = query.queryKey as readonly unknown[];
            if (key[0] !== 'inwards' || key[1] !== 'list') return false;
            const filtersWrapper = key[2] as { filters?: Record<string, unknown> } | undefined;
            const filters = filtersWrapper?.filters;
            if (!filters) return true;
            return Object.values(filters).every((value) => value === undefined || value === null || value === '');
          },
        },
        (old) => {
          if (!old) {
            return {
              items: [newInward],
              total: 1,
              page: 0,
              limit: DEFAULT_BULK_FETCH_LIMIT,
              totalPages: 1,
            };
          }

          const exists = old.items.some((entry) => entry.id === newInward.id);
          const nextItems = exists
            ? old.items.map((entry) => (entry.id === newInward.id ? newInward : entry))
            : [newInward, ...old.items];

          if (exists) {
            return { ...old, items: nextItems };
          }
          return {
            ...old,
            items: nextItems,
            total: old.total + 1,
            totalPages: Math.max(Math.ceil((old.total + 1) / Math.max(old.limit, 1)), 1),
          };
        }
      );
      toast.success('Inward entry created successfully!');
    },
  });
}

/**
 * Mutation hook for updating an inward entry
 */
export function useUpdateInwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: Partial<InwardEntry> 
    }): Promise<InwardEntry> => {
      const response = await apiService.updateInward(id, data, { showErrorToast: false });
      const inward = extractInwardEntry(response);
      if (!inward) {
        throw new Error('Failed to parse updated inward entry');
      }
      return normalizeInwardEntry(inward);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.inwards.lists() });

      // Snapshot the previous value
      const previousInwards = queryClient.getQueriesData({ queryKey: queryKeys.inwards.lists() });

      queryClient.setQueriesData<InwardEntriesListQueryData>(
        { queryKey: queryKeys.inwards.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, ...data } : item
            ),
          };
        }
      );

      return { previousInwards };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousInwards) {
        context.previousInwards.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
      toast.error(err.message || 'Failed to update inward entry');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.inwards.lists() });
    },
    onSuccess: (updatedInward, variables) => {
      // Update the specific inward entry in cache
      queryClient.setQueryData(
        queryKeys.inwards.detail(variables.id),
        updatedInward
      );

      // Also invalidate related gauges queries
      queryClient.invalidateQueries({ queryKey: queryKeys.gauges.byInward(variables.id) });

      toast.success('Inward entry updated successfully!');
    },
  });
}

/**
 * Mutation hook for deleting an inward entry
 */
export function useDeleteInwardEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiService.deleteInward(id, { showErrorToast: false });
    },
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.inwards.lists() });

      // Snapshot previous data for all list queries
      const previousQueries = new Map();
      queryClient.getQueriesData({ queryKey: queryKeys.inwards.lists() }).forEach(([key, data]) => {
        previousQueries.set(JSON.stringify(key), data);
      });

      // Optimistically remove from all list caches
      queryClient.setQueriesData<InwardEntriesListQueryData>(
        { queryKey: queryKeys.inwards.lists() },
        (old) => {
          if (!old) return old;
          const nextItems = old.items.filter((entry) => entry.id !== deletedId);
          const nextTotal = Math.max(old.total - 1, 0);
          return {
            ...old,
            items: nextItems,
            total: nextTotal,
            totalPages: Math.max(Math.ceil(nextTotal / Math.max(old.limit, 1)), 1),
          };
        }
      );

      return { previousQueries };
    },
    onError: (error: Error, _deletedId, context) => {
      // Rollback on error
      if (context?.previousQueries) {
        context.previousQueries.forEach((data, key) => {
          queryClient.setQueryData(JSON.parse(key), data);
        });
      }
      toast.error(error.message || 'Failed to delete inward entry');
    },
    onSuccess: (_, deletedId) => {
      // Remove detail query from cache
      queryClient.removeQueries({ queryKey: queryKeys.inwards.detail(deletedId) });

      // Invalidate related gauges queries (background refetch)
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.gauges.byInward(deletedId),
        refetchType: 'none' // Don't refetch, just mark as stale
      });

      toast.success('Inward entry deleted successfully!');
    },
  });
}

// ============================================================================
// COMBINED HOOK (for convenience)
// ============================================================================

/**
 * Combined hook that provides both query and mutations
 */
export function useInwardEntries(options?: { enabled?: boolean }) {
  const query = useInwardEntriesQuery({ enabled: options?.enabled ?? true });
  const createMutation = useCreateInwardEntryMutation();
  const updateMutation = useUpdateInwardEntryMutation();
  const deleteMutation = useDeleteInwardEntryMutation();

  return {
    // Query data
    inwardEntries: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    createInwardEntry: createMutation.mutateAsync,
    updateInwardEntry: updateMutation.mutateAsync,
    deleteInwardEntry: deleteMutation.mutateAsync,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
