import { useMemo } from 'react';
import {
  useFormatNumbersQuery,
  useCreateFormatNumberMutation,
  useDeleteFormatNumberMutation,
} from './queries/formatNumbers';
import type { CreateFormatNumberPayload } from '../types/formatNumber';

export const useFormatNumbers = () => {
  const query = useFormatNumbersQuery();
  const createMutation = useCreateFormatNumberMutation();
  const deleteMutation = useDeleteFormatNumberMutation();

  const createFormatNumber = async (payload: CreateFormatNumberPayload) => {
    return createMutation.mutateAsync(payload);
  };

  const deleteFormatNumber = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const formatNumbers = query.data ?? [];

  const activeCount = useMemo(
    () => formatNumbers.filter((item) => item.isActive).length,
    [formatNumbers]
  );

  return {
    formatNumbers,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    createFormatNumber,
    deleteFormatNumber,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    activeCount,
  };
};
