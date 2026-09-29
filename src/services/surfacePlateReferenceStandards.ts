import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './api';
import { extractPaginatedList } from '../utils/paginatedResponse';
import type {
  CreateSurfacePlateReferenceStandardPayload,
  SurfacePlateReferenceStandardFilters,
  SurfacePlateReferenceStandardRecord,
  SurfacePlateToleranceLookupParams,
  SurfacePlateToleranceLookupResponse,
  SurfacePlateTolerances,
  UpdateSurfacePlateReferenceStandardPayload,
} from '../types/surfacePlateReferenceStandards';
import type { SurfacePlateReferenceStandardFormData } from '../lib/validations';

export interface SurfacePlateReferenceStandardsListResult {
  items: SurfacePlateReferenceStandardRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeTolerances = (value: unknown): SurfacePlateTolerances => {
  const tolerances =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    grade_0: toNumber(tolerances.grade_0),
    grade_1: toNumber(tolerances.grade_1),
    grade_2: toNumber(tolerances.grade_2),
    grade_3: toNumber(tolerances.grade_3),
  };
};

export const normalizeSurfacePlateReferenceStandard = (
  item: unknown
): SurfacePlateReferenceStandardRecord => {
  const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

  return {
    id: String(record.id ?? ''),
    master_gauge_id: String(record.master_gauge_id ?? ''),
    master_gauge_name:
      typeof record.master_gauge_name === 'string' ? record.master_gauge_name : null,
    gauge_type: String(record.gauge_type ?? 'surface_plate'),
    instrument_type: String(record.instrument_type ?? 'surface_plate'),
    master_type: String(record.master_type ?? 'surface_plate_tolerance'),
    shape: (record.shape === 'square' ? 'square' : 'rectangular'),
    size: String(record.size ?? ''),
    length: toNumber(record.length),
    width: toNumber(record.width),
    unit: String(record.unit ?? 'µm'),
    standard: String(record.standard ?? ''),
    tolerances: normalizeTolerances(record.tolerances),
    archived: Boolean(record.archived),
    created_at: String(record.created_at ?? ''),
    updated_at: String(record.updated_at ?? ''),
    deleted_at: record.deleted_at ? String(record.deleted_at) : null,
  };
};

const cleanFilters = (filters: SurfacePlateReferenceStandardFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );

const unwrapResponseRecord = (response: unknown): SurfacePlateReferenceStandardRecord =>
  normalizeSurfacePlateReferenceStandard(
    response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)
      ? (response as Record<string, unknown>).data
      : response
  );

export const buildSurfacePlateReferenceStandardCreatePayload = (
  data: SurfacePlateReferenceStandardFormData
): CreateSurfacePlateReferenceStandardPayload => ({
  master_gauge_id: data.master_gauge_id,
  master_gauge_name: data.master_gauge_name.trim(),
  shape: data.shape,
  length: Number(data.length),
  width: Number(data.width),
  unit: data.unit.trim(),
  tolerances: {
    grade_0: Number(data.tolerances.grade_0),
    grade_1: Number(data.tolerances.grade_1),
    grade_2: Number(data.tolerances.grade_2),
    grade_3: Number(data.tolerances.grade_3),
  },
});

export const buildSurfacePlateReferenceStandardUpdatePayload = (
  data: SurfacePlateReferenceStandardFormData
): UpdateSurfacePlateReferenceStandardPayload => ({
  master_gauge_id: data.master_gauge_id,
  master_gauge_name: data.master_gauge_name.trim(),
  shape: data.shape,
  length: Number(data.length),
  width: Number(data.width),
  unit: data.unit.trim(),
  tolerances: {
    grade_0: Number(data.tolerances.grade_0),
    grade_1: Number(data.tolerances.grade_1),
    grade_2: Number(data.tolerances.grade_2),
    grade_3: Number(data.tolerances.grade_3),
  },
});

export async function listSurfacePlateReferenceStandards(
  filters: SurfacePlateReferenceStandardFilters
): Promise<SurfacePlateReferenceStandardsListResult> {
  const response = await apiClient.get(
    API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.LIST,
    { params: cleanFilters(filters) }
  );

  const result = extractPaginatedList<SurfacePlateReferenceStandardRecord>(response, {
    arrayKeys: ['data', 'items', 'surface_plate_reference_standards'],
    mapItem: normalizeSurfacePlateReferenceStandard,
    fallbackPage: filters.page ?? 0,
    fallbackLimit: filters.limit ?? 10,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

export async function getSurfacePlateReferenceStandard(
  recordId: string
): Promise<SurfacePlateReferenceStandardRecord> {
  const response = await apiClient.get(
    API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.GET(recordId)
  );
  return unwrapResponseRecord(response);
}

export async function createSurfacePlateReferenceStandard(
  payload: CreateSurfacePlateReferenceStandardPayload
): Promise<SurfacePlateReferenceStandardRecord> {
  const response = await apiClient.post(
    API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.CREATE,
    payload
  );
  return unwrapResponseRecord(response);
}

export async function updateSurfacePlateReferenceStandard(
  recordId: string,
  payload: UpdateSurfacePlateReferenceStandardPayload
): Promise<SurfacePlateReferenceStandardRecord> {
  const response = await apiClient.patch(
    API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.UPDATE(recordId),
    payload
  );
  return unwrapResponseRecord(response);
}

export async function deleteSurfacePlateReferenceStandard(recordId: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.DELETE(recordId));
}

export async function lookupSurfacePlateTolerance(
  params: SurfacePlateToleranceLookupParams
): Promise<SurfacePlateToleranceLookupResponse> {
  const response = await apiClient.get(
    API_ENDPOINTS.SURFACE_PLATE_REFERENCE_STANDARDS.LOOKUP_TOLERANCE,
    { params }
  );

  const payload =
    response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)
      ? (response as Record<string, unknown>).data
      : response;

  const record = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  return {
    shape: record.shape === 'square' ? 'square' : 'rectangular',
    size: String(record.size ?? ''),
    grade: (record.grade as SurfacePlateToleranceLookupResponse['grade']) ?? 'grade_0',
    tolerance: toNumber(record.tolerance),
    unit: String(record.unit ?? 'µm'),
  };
}
