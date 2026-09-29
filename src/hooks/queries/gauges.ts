/**
 * TanStack Query Hooks for Gauges
 * Provides query and mutation hooks with automatic cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/apiService';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { LinkedGauge } from '../../types';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Query hook for fetching gauges by inward ID
 */
export function useGaugesByInwardQuery(
  inwardId: string | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.gauges.byInward(inwardId!),
    queryFn: async (): Promise<LinkedGauge[]> => {
      if (!inwardId) throw new Error('Inward ID is required');
      const response = await apiService.getGaugesByInward(inwardId);
      return response?.data || [];
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: (options?.enabled ?? true) && !!inwardId,
  });
}

/**
 * Query hook for fetching all inward gauges (dashboard list)
 */
export function useInwardGaugesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.gauges.list(),
    queryFn: async (): Promise<LinkedGauge[]> => {
      const response = await apiService.getInwardGauges({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return extractPaginatedList<LinkedGauge>(response, {
        arrayKeys: ['data', 'items'],
        fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
      }).items;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Query hook for fetching a single gauge by inward and gauge ID
 */
export function useGaugeByInwardAndGaugeQuery(
  inwardId: string | null,
  gaugeId: string | null,
  options?: {
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: queryKeys.gauges.byInwardAndGauge(inwardId!, gaugeId!),
    queryFn: async () => {
      if (!inwardId || !gaugeId) throw new Error('Inward ID and Gauge ID are required');
      const response = await apiService.get<unknown>(
        API_ENDPOINTS.GAUGES.BY_INWARD_GAUGE_ID(inwardId, gaugeId)
      );
      return response;
    },
    enabled: (options?.enabled ?? true) && !!inwardId && !!gaugeId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook for creating/linking a gauge to an inward entry
 */
export function useLinkGaugeToInwardMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      inward_id: string;
      gauge_id: string;
      process?: string;
    }): Promise<LinkedGauge> => {
      const response = await apiService.linkGaugeToInward(data);
      return response.data;
    },
    onSuccess: (newLinkedGauge, variables) => {
      void newLinkedGauge;
      // Invalidate all gauge queries related to this inward
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.gauges.byInward(variables.inward_id) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gauges.lists() });

      toast.success('Gauge linked successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link gauge');
    },
  });
}

/**
 * Mutation hook for creating a gauge
 */
export function useCreateGaugeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<unknown>): Promise<unknown> => {
      const response = await apiService.createGauge(data);
      return response;
    },
    onSuccess: () => {
      // Invalidate all gauge lists
      queryClient.invalidateQueries({ queryKey: queryKeys.gauges.lists() });
      toast.success('Gauge created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create gauge');
    },
  });
}

/**
 * Mutation hook for updating gauge certificate data
 */
export function useUpdateGaugeCertificateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inwardId,
      gaugeId,
      data,
    }: {
      inwardId: string;
      gaugeId: string;
      data: Partial<unknown>;
    }): Promise<unknown> => {
      const response = await apiService.patch<unknown>(
        API_ENDPOINTS.GAUGES.BY_INWARD_GAUGE_ID(inwardId, gaugeId),
        data
      );
      return response;
    },
    onSuccess: (updatedGauge, variables) => {
      // Update the specific gauge in cache
      queryClient.setQueryData(
        queryKeys.gauges.byInwardAndGauge(variables.inwardId, variables.gaugeId),
        updatedGauge
      );

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.gauges.byInward(variables.inwardId) 
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.gauges.lists() });

      toast.success('Gauge updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update gauge');
    },
  });
}
