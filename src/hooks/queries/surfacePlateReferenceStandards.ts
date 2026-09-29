import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import {
  createSurfacePlateReferenceStandard,
  deleteSurfacePlateReferenceStandard,
  getSurfacePlateReferenceStandard,
  listSurfacePlateReferenceStandards,
  lookupSurfacePlateTolerance,
  type SurfacePlateReferenceStandardsListResult,
  updateSurfacePlateReferenceStandard,
} from '../../services/surfacePlateReferenceStandards';
import type {
  CreateSurfacePlateReferenceStandardPayload,
  SurfacePlateReferenceStandardFilters,
  SurfacePlateReferenceStandardRecord,
  SurfacePlateToleranceLookupParams,
  SurfacePlateToleranceLookupResponse,
  UpdateSurfacePlateReferenceStandardPayload,
} from '../../types/surfacePlateReferenceStandards';

export function useSurfacePlateReferenceStandardsListQuery(
  filters: SurfacePlateReferenceStandardFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.surfacePlateReferenceStandards.list({ ...filters } as Record<string, unknown>),
    queryFn: (): Promise<SurfacePlateReferenceStandardsListResult> =>
      listSurfacePlateReferenceStandards(filters),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useSurfacePlateReferenceStandardDetailQuery(
  recordId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.surfacePlateReferenceStandards.detail(recordId ?? ''),
    queryFn: (): Promise<SurfacePlateReferenceStandardRecord> => {
      if (!recordId) {
        throw new Error('Record ID is required');
      }
      return getSurfacePlateReferenceStandard(recordId);
    },
    enabled: (options?.enabled ?? true) && Boolean(recordId),
    staleTime: 60 * 1000,
  });
}

export function useCreateSurfacePlateReferenceStandardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      payload: CreateSurfacePlateReferenceStandardPayload
    ): Promise<SurfacePlateReferenceStandardRecord> =>
      createSurfacePlateReferenceStandard(payload),
    onSuccess: (createdRecord) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfacePlateReferenceStandards.lists() });
      if (createdRecord.id) {
        queryClient.setQueryData(
          queryKeys.surfacePlateReferenceStandards.detail(createdRecord.id),
          createdRecord
        );
      }
      toast.success('Surface plate reference standard created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create surface plate reference standard');
    },
  });
}

export function useUpdateSurfacePlateReferenceStandardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: string;
      payload: UpdateSurfacePlateReferenceStandardPayload;
    }): Promise<SurfacePlateReferenceStandardRecord> =>
      updateSurfacePlateReferenceStandard(recordId, payload),
    onSuccess: (updatedRecord) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfacePlateReferenceStandards.lists() });
      if (updatedRecord.id) {
        queryClient.setQueryData(
          queryKeys.surfacePlateReferenceStandards.detail(updatedRecord.id),
          updatedRecord
        );
      }
      toast.success('Surface plate reference standard updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update surface plate reference standard');
    },
  });
}

export function useDeleteSurfacePlateReferenceStandardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string): Promise<void> => deleteSurfacePlateReferenceStandard(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surfacePlateReferenceStandards.lists() });
      toast.success('Surface plate reference standard deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete surface plate reference standard');
    },
  });
}

export function useSurfacePlateToleranceLookupMutation() {
  return useMutation({
    mutationFn: (params: SurfacePlateToleranceLookupParams): Promise<SurfacePlateToleranceLookupResponse> =>
      lookupSurfacePlateTolerance(params),
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to fetch tolerance');
    },
  });
}
