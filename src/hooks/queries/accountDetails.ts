import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { AccountDetail } from '../../types/accountDetails';
import type { AccountDetailFormData } from '../../lib/validations/accountDetailsSchemas';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface AccountDetailsQueryData {
  accountDetails: AccountDetail[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeAccountDetail = (raw: unknown): AccountDetail => {
  const wrapper = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  const nestedDetail =
    wrapper.account_detail ??
    wrapper.accountDetail ??
    wrapper.account_details ??
    wrapper.accountDetails ??
    wrapper.data ??
    wrapper.item;
  const record = (isRecord(nestedDetail) ? nestedDetail : wrapper) as Record<string, unknown>;
  const bankDetails = isRecord(record.bank_details) ? record.bank_details : {};

  return {
    ...(record as unknown as AccountDetail),
    id: String(record.id ?? record._id ?? ''),
    firm_name: String(record.firm_name ?? ''),
    type: String(record.type ?? ''),
    gst_no: String(record.gst_no ?? ''),
    pan_no: String(record.pan_no ?? ''),
    address: String(record.address ?? ''),
    contact_no: String(record.contact_no ?? ''),
    email: String(record.email ?? ''),
    website: String(record.website ?? ''),
    logo: String(record.logo ?? ''),
    bank_details: {
      bank_name: String(bankDetails.bank_name ?? ''),
      account_no: String(bankDetails.account_no ?? ''),
      ifsc: String(bankDetails.ifsc ?? ''),
      branch: String(bankDetails.branch ?? ''),
    },
    is_active: Boolean(record.is_active ?? true),
    archived: Boolean(record.archived ?? false),
    deleted_at:
      record.deleted_at === null || record.deleted_at === undefined
        ? null
        : String(record.deleted_at),
    created_at: String(record.created_at ?? ''),
    updated_at: String(record.updated_at ?? ''),
  };
};

const normalizeAccountDetailsResponse = (payload: unknown): AccountDetailsQueryData => {
  const result = extractPaginatedList(payload, {
    arrayKeys: ['account_details', 'accountDetails', 'data', 'items'],
    mapItem: normalizeAccountDetail,
    fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
  });

  return {
    accountDetails: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

export function useAccountDetailsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
  page?: number;
  limit?: number;
  is_active?: boolean;
}) {
  const page = options?.page ?? 0;
  const limit = options?.limit ?? DEFAULT_BULK_FETCH_LIMIT;

  return useQuery({
    queryKey: queryKeys.accountDetails.list({
      page,
      limit,
      is_active: options?.is_active,
    }),
    queryFn: async (): Promise<AccountDetailsQueryData> => {
      const response = await apiClient.getApiResponse<unknown>(
        API_ENDPOINTS.ACCOUNT_DETAILS.LIST,
        {
        page,
        limit,
        is_active: options?.is_active,
        }
      );
      return normalizeAccountDetailsResponse(response?.data ?? response);
    },
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
  });
}

export function useAccountDetailQuery(id: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.accountDetails.detail(id || ''),
    queryFn: async (): Promise<AccountDetail> => {
      if (!id) {
        throw new Error('Account detail id is required');
      }

      const response = await apiClient.getApiResponse<unknown>(
        API_ENDPOINTS.ACCOUNT_DETAILS.GET(id)
      );

      return normalizeAccountDetail(response?.data ?? response);
    },
    enabled: (options?.enabled ?? true) && !!id,
  });
}

export function useCreateAccountDetailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AccountDetailFormData): Promise<AccountDetail> => {
      const response = await apiClient.postApiResponse<unknown>(
        API_ENDPOINTS.ACCOUNT_DETAILS.CREATE,
        data
      );
      return normalizeAccountDetail(response?.data ?? response);
    },
    onSuccess: (newAccountDetail) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDetails.lists() });
      queryClient.setQueryData(
        queryKeys.accountDetails.detail(newAccountDetail.id),
        newAccountDetail
      );
      toast.success('Account details created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create account details');
    },
  });
}

export function useUpdateAccountDetailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AccountDetailFormData>;
    }): Promise<AccountDetail> => {
      const response = await apiClient.patchApiResponse<unknown>(
        API_ENDPOINTS.ACCOUNT_DETAILS.UPDATE(id),
        data
      );
      return normalizeAccountDetail(response?.data ?? response);
    },
    onSuccess: (updatedAccountDetail, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDetails.lists() });
      queryClient.setQueryData(
        queryKeys.accountDetails.detail(variables.id),
        updatedAccountDetail
      );
      toast.success('Account details updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update account details');
    },
  });
}

export function useDeleteAccountDetailMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.deleteApiResponse<void>(API_ENDPOINTS.ACCOUNT_DETAILS.DELETE(id));
    },
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.accountDetails.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDetails.lists() });
      toast.success('Account details deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete account details');
    },
  });
}
