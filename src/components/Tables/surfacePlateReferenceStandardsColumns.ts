export type SurfacePlateReferenceStandardColumnKey =
  | 'master_gauge_name'
  | 'shape'
  | 'length'
  | 'width'
  | 'grade_0'
  | 'grade_1'
  | 'grade_2'
  | 'grade_3'
  | 'unit'
  | 'actions';

export const surfacePlateReferenceStandardColumns: Array<{
  name: string;
  uid: SurfacePlateReferenceStandardColumnKey;
  sortable?: boolean;
}> = [
  { name: 'MASTER GAUGE', uid: 'master_gauge_name', sortable: true },
  { name: 'SHAPE', uid: 'shape', sortable: true },
  { name: 'LENGTH (MM)', uid: 'length', sortable: true },
  { name: 'WIDTH (MM)', uid: 'width', sortable: true },
  { name: 'GRADE 0', uid: 'grade_0', sortable: true },
  { name: 'GRADE 1', uid: 'grade_1', sortable: true },
  { name: 'GRADE 2', uid: 'grade_2', sortable: true },
  { name: 'GRADE 3', uid: 'grade_3', sortable: true },
  { name: 'UNIT', uid: 'unit', sortable: true },
  { name: 'ACTIONS', uid: 'actions' },
];

export const DEFAULT_VISIBLE_SURFACE_PLATE_REFERENCE_STANDARD_COLUMNS: SurfacePlateReferenceStandardColumnKey[] =
  [
    'master_gauge_name',
    'shape',
    'length',
    'width',
    'grade_0',
    'grade_1',
    'grade_2',
    'grade_3',
    'unit',
    'actions',
  ];
