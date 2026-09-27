import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import type { EquipmentHistoryData } from '../../store/equipmentHistoryStore';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../../utils/paginatedResponse';

export interface EquipmentHistoriesQueryData {
  items: EquipmentHistoryData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeEquipmentHistory = (history: any): EquipmentHistoryData => ({
  id: String(history?.id ?? ''),
  master_equipment_id: String(history?.master_equipment_id ?? ''),
  equipment_name: String(history?.equipment_name ?? ''),
  cal_by: String(history?.cal_by ?? ''),
  cal_date: String(history?.cal_date ?? ''),
  remark: String(history?.remark ?? ''),
  calibration_due_date: String(history?.calibration_due_date ?? ''),
  format_no: String(history?.format_no ?? ''),
  cal_certificate_no: String(history?.cal_certificate_no ?? ''),
  traceability: String(history?.traceability ?? ''),
  ranges: Array.isArray(history?.ranges) ? history.ranges : [],
  archived: Boolean(history?.archived),
  created_at: String(history?.created_at ?? ''),
  updated_at: String(history?.updated_at ?? ''),
  deleted_at: String(history?.deleted_at ?? ''),
});

export const fetchEquipmentHistoriesPage = async (params?: {
  page?: number;
  limit?: number;
}): Promise<EquipmentHistoriesQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient.get(
    `/equipment/history/list?${queryParams.toString()}`
  ) as any;

  const result = extractPaginatedList<EquipmentHistoryData>(response, {
    arrayKeys: ['data', 'items', 'equipment_histories', 'histories'],
    mapItem: normalizeEquipmentHistory,
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

export function useEquipmentHistoriesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.equipmentHistories.list(),
    queryFn: async (): Promise<EquipmentHistoryData[]> => {
      const result = await fetchEquipmentHistoriesPage({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return result.items;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useEquipmentHistoriesListQuery(
  params: { page: number; limit: number },
  options?: {
    enabled?: boolean;
    staleTime?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.equipmentHistories.list(params),
    queryFn: () => fetchEquipmentHistoriesPage(params),
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}
