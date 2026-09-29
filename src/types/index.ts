/**
 * Centralized Type Definitions
 * This file contains all shared types and interfaces used throughout the application
 */

// Base API Response Types


export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  timestamp?: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Organization Types
export interface Organization {
  id: string;
  name: string;
  description: string;
  org_type?: 'customer' | 'laboratory';
  parent_id?: string | null;
  archived?: boolean;
  is_active?: boolean;
  gst?: string;
  gst_type?: string;
  lab_ids?: string[];
  lab_type?: 'NABL Lab' | 'Non-NABL Lab' | string | null;
  lab_certificate_number?: string | null;
  contacts: Contact[];
  address?: Address | null;
  contract?: Contract | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
}

export interface Address {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export interface Contract {
  calibration_method: string;
  reporting_method: string;
  collection_mode: string;
  dispatch_mode: string;
  conformity_statement: boolean;
  conformity_accepted: boolean;
  specific_requirements?: string;
  rate_card?: InwardRateCard | null;
}

export type { AccountDetail, AccountBankDetails, AccountDetailType } from './accountDetails';

export interface InwardRateRange {
  min: number;
  max: number;
}

export interface InwardRateCardEntry {
  rate_type: string;
  range: InwardRateRange | number | null;
  range_unit?: string | null;
  description: string;
  rate: number | null;
  discount: number | null;
  unit: string;
  standard_specification?: string | null;
}

export type InwardRateCard = Record<string, InwardRateCardEntry[]>;

// Inward Entry Types
export interface InwardEntry {
  history_card_reference?: string | null;
  id: string;
  client_org_id: string;
  billing_org_id: string;
  delivery_org_id: string;
  other_access_org_id: string;
  billing_org_name: string;
  delivery_org_name: string;
  client_dc_no: string;
  client_dc_date: string;
  through: string;
  inward_date: string;
  received_date: string;
  commit_date: string;
  conformity_statement: boolean;
  conformity_accepted: boolean;
  specific_requirements: string;
  additional_requirements: string;
  rate_card?: InwardRateCard | null;
  archived: boolean;
  deleted_at?: string | null;
  calibration_method: string;
  reporting_method: string;
  collection_mode: string;
  dispatch_mode: string;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_phone: string;
  lab_authorized_person_id: string;
  lab_authorized_person_designation: string;
  client_authorized_person_id: string;
  client_authorized_person_contact: string;
  created_at: string | null;
  updated_at: string | null;
  client_org_name: string;
  inward_no: string;
}

// Gauge Types
export interface Gauge {
  id: string;
  master_gauge_id: string;
  client_org_id: string;
  gauge_class: string;
  certificate_type_id: string;
  identification_number: string;
  calibration_frequency: number;
  calibration_frequency_unit: "days" | "months" | "years";
  make: string;
  manf_serial_number: string;
  process: string;
  unit: string;
  calibration_location_type: "permanent_facility" | "mobile_facility" | "customer_site";
  calibration_done_under: string;
  gauge_condition: string;
  specifications?: GaugeSpecifications;
  created_at: string;
  updated_at: string;
  client_organization: string;
}

export interface GaugeSpecifications {
  go?: {
    basic_size?: number;
    specification_limit_max?: number;
    specification_limit_min?: number;
    wear_limit?: number;
  };
  no_go?: {
    basic_size?: number;
    specification_limit_max?: number;
    specification_limit_min?: number;
  };
  inputs?: {
    method: string;
    inputs: {
      basic_size?: number;
      upper_tolerance?: number;
      lower_tolerance?: number;
      diameter?: number;
      grade?: string;
    };
  };
  surface_material?: "granite" | "cast_iron" | "steel" | "";
  surface_plate_ref_id?: string;
  length?: number | string;
  width?: number | string;
  block_size?: number | string;
  method?: "division" | "micron_per_block" | "micron_per_meter" | "";
  lc?: number | string;
}

export interface LinkedGauge {
  id?: string;                               // gauge.id
  created_at?: string;
  certificate_id?: string;
  gauge_class: string;                      // gauge.gauge_class
  identification_number: string;            // gauge.identification_number
  make: string;                             // gauge.make
  manf_serial_number: string;               // gauge.manf_serial_number
  inward_id: string;                        // gauge.inward_id
  client_org_name: string;    
  client_org_id: string;              // gauge.client_org_names
  master_gauge_name: string;              // gauge.master_gauge_name
  status: 'inward_received' | 'calibration_completed'; // derived from gauge.status
  inward_date: string;
  gauge_id: string;
  inward_gauge_lab_id: string;   
  specifications: GaugeSpecifications; // gauge.specifications
  inward_no:number;
  process_status?: string;
  inward_info?: { inward_date?: string };
}
export interface GaugeObservationValues {
  values: number[];
  average: number;
}

export interface GaugeObservationsSection {
  a: GaugeObservationValues;
  b: GaugeObservationValues;
}

export interface GaugeRemarks {
  go: string;
  no_go: string;
}
export interface Observations {
  go?: { a?: { values?: number[], average?: number }; b?: { values?: number[], average?: number } };
  no_go?: { a?: { values?: number[] }; b?: { values?: number[] } };
  type_a_readings?: number[];
};


export interface SpecificationLimits {
  basic_size: number;
  specification_limit_max: number;
  specification_limit_min: number;
  wear_limit?: number; // optional because No Go does not have wear_limit
}

export interface SpecificationInputsInner {
  diameter?: number;
  grade?: string;
  basic_size: number;
  upper_tolerance: number;
  lower_tolerance: number;
}

export interface SpecificationInputs {
  method: string;
  inputs: SpecificationInputsInner;
}

export interface Specifications {
  go: SpecificationLimits;
  no_go: SpecificationLimits;
  inputs: SpecificationInputs;
  surface_plate_ref_id?: string;
}

export interface ReadingFormatColumn {
  key: string;
  label: string;
  type: string;
  editable: boolean;
}

export interface ReadingFormatRow {
  parameter: string;
  basic_size?: string;
  specMax?: string;
  specMin?: string;
  wearLimit?: string;
}

export interface ReadingFormat {
  gaugeName: string;
  format: {
    columns: ReadingFormatColumn[];
    rows: ReadingFormatRow[];
  };
}

export interface CertificateGaugeData {
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  status: string;

  observations: Observations;

  id: string;
  make: string;
  gauge_class: string;
  identification_number: string;
  manf_serial_number: string;

  calibration_frequency: number;
  calibration_frequency_unit: "days" | "months" | "years";

  calibration_location_type: "permanent_facility" | "mobile_facility" | "customer_site";

  process: string;
  unit: string;

  specifications: Specifications | Partial<Specifications>;

  master_gauge_name: string;
  calibration_method: string;
  certificate_type: string;
  certificate_type_id?: string;
  gauge_name?: string;
  certificate_date?: string;
  calibration_date?: string;

  reading_format: ReadingFormat;

  client_org_name: string;
  inward_date: string;
  client_dc_no: string;
  client_dc_date: string;
  calibration_done_under: string;
  gauge_condition: string;
  equipment_ids: string[];
  certificate_id: string;
  master_gauge_id: string;
  master_readings: number[];
  calibration_equipments: string[];
  remark: string[];
  environmental_conditions: string;
  uncertainty: string;
  certificate_url?: string;
}

// Combined gauge data structure with detailed gauge info and basic gauge data
export interface CombinedGaugeData {
  // Main gauge fields (from FetchInwardedGaugeByGaugeId)
  archived?: boolean;
  calibration_done_under: string;
  calibration_frequency: number;
  calibration_frequency_unit: "days" | "months" | "years";
  calibration_location_type: "permanent_facility" | "mobile_facility" | "customer_site";
  certificate_type: string;
  certificate_type_id: string;
  client_org_id: string;
  client_organization: string;
  created_at: string;
  deleted_at: string | null;
  gauge_class: string;
  gauge_condition: string;
  id: string;
  identification_number: string;
  make: string;
  manf_serial_number: string;
  master_gauge: string;
  master_gauge_id: string;
  process: string;
  specifications: GaugeSpecifications;
  unit: string;
  updated_at: string;
  gaugeInfo: {
    inward_id: string;
    gauge_id: string;
    inward_gauge_lab_id: string;
    status: string;
    master_gauge_name: string;
    [key: string]: unknown; // Allow for additional properties from gaugesResponse
  };
  observations: {
    go: {
      a: { average: number | null };
      b: { average: number | null };
    },
    no_go: {
      a: { average: number | null };
      b: { average: number | null };
    };
  };
  inwardGaugeInfo?: Gauge
}


// Certificate Types
export interface CertificateType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Form Types
export interface InwardFormData {
  client_org_id: string;
  billing_org_id: string;
  delivery_org_id: string;
  other_access_org_id: string;
  client_dc_no: string;
  client_dc_date: Date | undefined;
  through: string;
  inward_date: Date | undefined;
  received_date: Date | undefined;
  commit_date: Date | undefined;
  conformity_statement: boolean;
  conformity_accepted: boolean;
  specific_requirements: string;
  additional_requirements: string;
  rate_card?: InwardRateCard | null;
  history_card_reference?: string | null;
  archived: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  calibration_method: string;
  reporting_method: string;
  collection_mode: string;
  dispatch_mode: string;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_phone: string;
  lab_authorized_person_id: string;
  lab_authorized_person_designation: string;
  client_authorized_person_id: string;
  client_authorized_person_contact: string;
}

export interface GaugeMasterFormData {
  name: string;
  is_standard_no: string;
  non_nabl_cert_frmt_no: string;
  nabl_cert_frmt_no: string;
  raw_datasheet_frmt_no: string;
  certificate_code: string;
  calibration_method: string;
  environmental_conditions: string;
  certificate_type_id: string;
  archived: boolean;
}

export interface OrganizationFormData {
  name: string;
  description: string;
  parent_id?: string | null;
  gst?: string;
  gst_type?: string;
  contacts: Contact[];
  address: Address;
  contract?: Contract;
  archived?: boolean;
}

// UI Component Types
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, record: T) => React.ReactNode;
}

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

export interface FilterProps {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'nin';
  value: unknown;
}

// Store Types
export interface StoreState {
  data: unknown[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
}

export interface StoreActions {
  setData: (data: unknown[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  fetchData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

// Hook Types
export interface UseDataFetchingOptions<T> {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: unknown;
  params?: Record<string, unknown>;
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  cacheTime?: number;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  transform?: (data: unknown) => T;
}

export interface UseDataFetchingReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
  clearError: () => void;
}

// Error Types
export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  url: string;
}

// Navigation Types
export interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: NavSubItem[];
}

export interface NavSubItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}
export interface GaugeObservationSet {
  values: number[];
  average: number;
}

export interface GaugeObservations {
  remarks: {
    go: string;
    no_go: string;
  };
  go: {
    a: GaugeObservationSet;
    b: GaugeObservationSet;
  };
  no_go: {
    a: GaugeObservationSet;
    b: GaugeObservationSet;
  };
  type_a_readings: number[];
}

export interface RegisterGaugeResponse {
  id: string;
  make: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  status: "inward_received" | string;
  observations: GaugeObservations;
  client_org_name: string;
  master_gauge_name: string;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// Status Types
export type ProcessStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';
export type CalibrationMethod = 'comparison' | 'substitution' | 'direct' | 'indirect' | 'null' | 'differential';
export type ReportingMethod = 'email' | 'print' | 'portal';
export type CollectionMode = 'pickup' | 'courier';
export type DispatchMode = 'delivery' | 'courier';
export type CalibrationLocationType = 'permanent_facility' | 'on_site' | 'mobile_unit';
export type CalibrationDoneUnder = 'nabl' | 'iso' | 'other';
export type GaugeCondition = 'good' | 'fair' | 'poor' | 'damaged';

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Re-export comprehensive types
export * from './api';
export * from './store';

// Backwards compatibility alias used in some pages
export type LinkedGaugeData = LinkedGauge;
