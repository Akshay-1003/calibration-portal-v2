import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { CreateFormatNumberPayload, FormatNumber, FormatNumberType } from '../../types/formatNumber';
import { toast } from 'sonner';

const normalizeFormatNumber = (item: any): FormatNumber => ({
  id: String(item?.id ?? ''),
  formatNumber: String(item?.formatNumber ?? item?.format_number ?? ''),
  formatType: (item?.formatType ?? item?.format_type ?? 'certificate') as FormatNumberType,
  isActive: Boolean(item?.isActive ?? item?.is_active ?? false),
  clientOrgId: (item?.clientOrgId ?? item?.client_org_id ?? null) as string | null,
  archived: Boolean(item?.archived ?? false),
  created_at: String(item?.created_at ?? ''),
  updated_at: String(item?.updated_at ?? ''),
  deleted_at: (item?.deleted_at ?? null) as string | null,
});

export const fetchFormatNumbers = async (): Promise<FormatNumber[]> => {
  const response = await apiClient.get('/format-numbers') as any;
  if (Array.isArray(response)) {
    return response.map(normalizeFormatNumber);
  }
  if (Array.isArray(response?.data)) {
    return response.data.map(normalizeFormatNumber);
  }
  return [];
};

export const useFormatNumbersQuery = (options?: { enabled?: boolean; staleTime?: number }) => {
  return useQuery({
    queryKey: queryKeys.formatNumbers.list(),
    queryFn: fetchFormatNumbers,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

export const useCreateFormatNumberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateFormatNumberPayload): Promise<FormatNumber> => {
      const response = await apiClient.post('/format-numbers', payload) as any;
      const data = response?.data ?? response;
      return normalizeFormatNumber(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formatNumbers.lists() });
      toast.success('Format number created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create format number');
    },
  });
};

export const useDeleteFormatNumberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/format-numbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.formatNumbers.lists() });
      toast.success('Format number deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete format number');
    },
  });
};
