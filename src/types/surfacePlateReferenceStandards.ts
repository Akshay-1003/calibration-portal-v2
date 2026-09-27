export const SURFACE_PLATE_SHAPES = ['rectangular', 'square'] as const;
export const SURFACE_PLATE_GRADES = ['grade_0', 'grade_1', 'grade_2', 'grade_3'] as const;

export type SurfacePlateShape = (typeof SURFACE_PLATE_SHAPES)[number];
export type SurfacePlateGradeKey = (typeof SURFACE_PLATE_GRADES)[number];

export interface SurfacePlateTolerances {
  grade_0: number;
  grade_1: number;
  grade_2: number;
  grade_3: number;
}

export interface SurfacePlateReferenceStandardRecord {
  id: string;
  master_gauge_id: string;
  master_gauge_name: string | null;
  gauge_type: string;
  instrument_type: string;
  master_type: string;
  shape: SurfacePlateShape;
  size: string;
  length: number;
  width: number;
  unit: string;
  standard: string;
  tolerances: SurfacePlateTolerances;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SurfacePlateReferenceStandardFilters {
  page?: number;
  limit?: number;
}

export interface SurfacePlateToleranceLookupParams {
  shape: SurfacePlateShape;
  size: string;
  grade: SurfacePlateGradeKey;
}

export interface SurfacePlateToleranceLookupResponse {
  shape: SurfacePlateShape;
  size: string;
  grade: SurfacePlateGradeKey;
  tolerance: number;
  unit: string;
}

export interface CreateSurfacePlateReferenceStandardPayload {
  master_gauge_id: string;
  master_gauge_name: string;
  shape: SurfacePlateShape;
  length: number;
  width: number;
  unit: string;
  tolerances: SurfacePlateTolerances;
}

export interface UpdateSurfacePlateReferenceStandardPayload {
  master_gauge_id: string;
  master_gauge_name: string;
  shape: SurfacePlateShape;
  length: number;
  width: number;
  unit: string;
  tolerances: SurfacePlateTolerances;
}
