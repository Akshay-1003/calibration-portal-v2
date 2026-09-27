import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '../../config/api';
import { apiClient } from '../../services/api';
import type { RepairEntry, RepairFormData, SparePart } from '../../types/repair';
import { queryKeys } from './queryKeys';

type RepairStatus = RepairEntry['repair_status'];
type RepairType = RepairEntry['repair_type'];

export interface RepairApiRecord {
  id?: string;
  repair_id?: string;
  repair_no?: string;
  gauge_id?: string;
  repair_date?: string;
  repair_description?: string;
  repaired_by?: string;
  technician_name?: string;
  status?: string;
  repair_status?: string;
  client_org_id?: string;
  client_org_name?: string;
  estimated_date_of_completion?: string;
  estimated_completion_date?: string;
  estimated_cost?: number | string;
  technician_notes?: string;
  spare_parts_used?: string[];
  spare_parts?: Array<Partial<SparePart>>;
  gauge_identification_number?: string;
  gauge_make?: string;
  gauge_manf_serial_number?: string;
  gauge_type?: string;
  gauge_specifications?: RepairEntry['gauge_specifications'];
  repair_type?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  [key: string]: unknown;
}

export interface CreateRepairPayload {
  gauge_id: string;
  repair_date: string;
  repair_description: string;
  repaired_by: string;
  status: string;
  client_org_id: string;
  estimated_date_of_completion: string;
  estimated_cost: number;
  technician_notes: string;
  spare_parts_used: string[];
}

export type UpdateRepairPayload = Partial<CreateRepairPayload>;

const mapStatus = (value?: string): RepairStatus => {
  const normalized = (value || 'pending').toLowerCase();

  if (normalized === 'in-progress') {
    return 'in_progress';
  }

  if (
    normalized === 'pending' ||
    normalized === 'in_progress' ||
    normalized === 'completed' ||
    normalized === 'on_hold' ||
    normalized === 'cancelled'
  ) {
    return normalized;
  }

  return 'pending';
};

const mapRepairType = (value?: string): RepairType => {
  const normalized = (value || 'calibration').toLowerCase();

  if (
    normalized === 'calibration' ||
    normalized === 'maintenance' ||
    normalized === 'replacement' ||
    normalized === 'adjustment'
  ) {
    return normalized;
  }

  return 'calibration';
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getRepairId = (record: RepairApiRecord): string => {
  return String(record.id || record.repair_id || '');
};

const normalizeSpareParts = (record: RepairApiRecord): SparePart[] => {
  if (Array.isArray(record.spare_parts) && record.spare_parts.length > 0) {
    return record.spare_parts.map((part, index) => {
      const quantity = asNumber(part.quantity);
      const unitRate = asNumber(part.unit_rate);
      return {
        id: part.id ? String(part.id) : `${getRepairId(record)}-part-${index}`,
        repair_id: getRepairId(record),
        part_name: String(part.part_name || ''),
        part_description: part.part_description ? String(part.part_description) : undefined,
        make: String(part.make || ''),
        part_number: part.part_number ? String(part.part_number) : undefined,
        quantity: quantity || 1,
        unit_rate: unitRate,
        total_amount: asNumber(part.total_amount) || quantity * unitRate,
        used_in_repair: part.used_in_repair !== false,
        notes: part.notes ? String(part.notes) : undefined,
      };
    });
  }

  if (Array.isArray(record.spare_parts_used)) {
    return record.spare_parts_used.map((partName, index) => ({
      id: `${getRepairId(record)}-part-${index}`,
      repair_id: getRepairId(record),
      part_name: String(partName || ''),
      make: '',
      quantity: 1,
      unit_rate: 0,
      total_amount: 0,
      used_in_repair: true,
    }));
  }

  return [];
};

const extractRepairList = (response: unknown): RepairApiRecord[] => {
  if (Array.isArray(response)) return response as RepairApiRecord[];
  if (!response || typeof response !== 'object') return [];

  const payload = response as Record<string, unknown>;
  const candidates = ['repairs', 'data', 'items', 'results', 'records'];

  for (const key of candidates) {
    if (Array.isArray(payload[key])) {
      return payload[key] as RepairApiRecord[];
    }
  }

  return [];
};

const extractRepairRecord = (response: unknown): RepairApiRecord | null => {
  if (!response || typeof response !== 'object') return null;
  if (Array.isArray(response)) return null;

  const payload = response as Record<string, unknown>;
  const repairObject = payload.repair;
  if (repairObject && typeof repairObject === 'object' && !Array.isArray(repairObject)) {
    return repairObject as RepairApiRecord;
  }

  const nested = payload.data;

  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as RepairApiRecord;
  }

  return payload as RepairApiRecord;
};

export const mapRepairApiToRepairEntry = (
  record: RepairApiRecord,
  clientOrgName?: string
): RepairEntry => {
  const nowIso = new Date().toISOString();
  const status = mapStatus(record.repair_status || record.status);
  const spareParts = normalizeSpareParts(record);

  return {
    id: getRepairId(record),
    repair_no: String(record.repair_no || record.id || record.repair_id || ''),
    repair_date: String(record.repair_date || '').slice(0, 10),
    client_org_id: String(record.client_org_id || ''),
    client_org_name: String(record.client_org_name || clientOrgName || ''),
    gauge_id: String(record.gauge_id || ''),
    gauge_identification_number: String(
      record.gauge_identification_number || record.gauge_id || ''
    ),
    gauge_make: String(record.gauge_make || ''),
    gauge_manf_serial_number: String(record.gauge_manf_serial_number || ''),
    gauge_type: String(record.gauge_type || ''),
    gauge_specifications: (record.gauge_specifications ||
      {}) as RepairEntry['gauge_specifications'],
    repair_type: mapRepairType(record.repair_type),
    repair_description: String(record.repair_description || ''),
    repair_status: status,
    estimated_cost: asNumber(record.estimated_cost),
    estimated_completion_date: String(
      record.estimated_completion_date || record.estimated_date_of_completion || ''
    ).slice(0, 10),
    technician_name: String(record.technician_name || record.repaired_by || ''),
    technician_notes: record.technician_notes ? String(record.technician_notes) : undefined,
    client_approval_required: false,
    spare_parts: spareParts,
    created_at: String(record.created_at || nowIso),
    updated_at: String(record.updated_at || nowIso),
  };
};

export const mapRepairApiToFormData = (record: RepairApiRecord): Partial<RepairFormData> => {
  const entry = mapRepairApiToRepairEntry(record);
  return {
    repair_date: entry.repair_date || new Date().toISOString().slice(0, 10),
    client_org_id: entry.client_org_id,
    gauge_id: entry.gauge_id,
    gauge_identification_number: entry.gauge_identification_number,
    gauge_make: entry.gauge_make,
    gauge_manf_serial_number: entry.gauge_manf_serial_number,
    gauge_type: entry.gauge_type,
    gauge_specifications: entry.gauge_specifications,
    repair_type: entry.repair_type,
    repair_description: entry.repair_description,
    repair_status: entry.repair_status,
    estimated_cost: entry.estimated_cost,
    estimated_completion_date: entry.estimated_completion_date,
    technician_name: entry.technician_name,
    technician_notes: entry.technician_notes,
    client_approval_required: false,
    spare_parts: entry.spare_parts,
  };
};

export const mapRepairFormToCreatePayload = (data: RepairFormData): CreateRepairPayload => {
  return {
    gauge_id: data.gauge_id,
    repair_date: data.repair_date,
    repair_description: data.repair_description,
    repaired_by: data.technician_name,
    status: data.repair_status,
    client_org_id: data.client_org_id,
    estimated_date_of_completion: data.estimated_completion_date,
    estimated_cost: asNumber(data.estimated_cost),
    technician_notes: data.technician_notes || '',
    spare_parts_used: (data.spare_parts || [])
      .map((part) => part.part_name?.trim())
      .filter((partName): partName is string => Boolean(partName)),
  };
};

export const mapRepairFormToUpdatePayload = (data: RepairFormData): UpdateRepairPayload =>
  mapRepairFormToCreatePayload(data);

export function useRepairsQuery(options?: { enabled?: boolean; staleTime?: number }) {
  return useQuery({
    queryKey: queryKeys.repairs.list(),
    queryFn: async (): Promise<RepairApiRecord[]> => {
      const response = await apiClient.get(API_ENDPOINTS.REPAIRS.LIST);
      return extractRepairList(response);
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useRepairQuery(repairId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.repairs.detail(repairId || ''),
    queryFn: async (): Promise<RepairApiRecord | null> => {
      if (!repairId) return null;
      const response = await apiClient.get(API_ENDPOINTS.REPAIRS.GET(repairId));
      return extractRepairRecord(response);
    },
    enabled: (options?.enabled ?? true) && !!repairId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCreateRepairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRepairPayload): Promise<RepairApiRecord | null> => {
      const response = await apiClient.post(API_ENDPOINTS.REPAIRS.CREATE, payload);
      return extractRepairRecord(response);
    },
    onSuccess: (createdRecord) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() });

      const createdId = createdRecord ? getRepairId(createdRecord) : '';
      if (createdId) {
        queryClient.setQueryData(queryKeys.repairs.detail(createdId), createdRecord);
      }
    },
  });
}

export function useUpdateRepairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRepairPayload;
    }): Promise<RepairApiRecord | null> => {
      const response = await apiClient.patch(API_ENDPOINTS.REPAIRS.UPDATE(id), payload);
      return extractRepairRecord(response);
    },
    onSuccess: (updatedRecord, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() });
      queryClient.setQueryData(queryKeys.repairs.detail(variables.id), updatedRecord);
    },
  });
}

export function useDeleteRepairMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repairId: string): Promise<void> => {
      await apiClient.delete(API_ENDPOINTS.REPAIRS.DELETE(repairId));
    },
    onSuccess: (_, deletedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.repairs.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() });
    },
  });
}
