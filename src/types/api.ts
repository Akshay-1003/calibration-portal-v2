// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  errors?: ValidationError[];
  pagination?: PaginationInfo;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

// Request Types
export interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

// Error Types
export interface ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  retryable: boolean;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user' | 'viewer' | 'manager';

// Organization Types
export interface Organization {
  id: string;
  name: string;
  description: string;
  parentId?: string | null;
  gstNo?: string;
  gstType?: string;
  contacts: Contact[];
  address: Address;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  name: string;
  email: string;
  phone: string;
  designation?: string;
  isPrimary?: boolean;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface OrganizationFormData {
  name: string;
  description: string;
  parentId?: string;
  gstNo?: string;
  gstType?: string;
  contacts: Omit<Contact, 'isPrimary'>[];
  address: Address;
}

// Inward Entry Types
export interface InwardEntry {
  id: string;
  clientOrgId: string;
  billingOrgId: string;
  deliveryOrgId: string;
  otherAccessOrgId: string;
  clientOrgName: string;
  billingOrgName: string;
  deliveryOrgName: string;
  clientDcNo: string;
  clientDcDate: string;
  through: string;
  inwardDate: string;
  receivedDate: string;
  commitDate: string;
  calibrationMethod: string;
  reportingMethod: string;
  collectionMode: string;
  dispatchMode: string;
  additionalRequirements: string;
  labAuthorizedPersonId: string;
  labAuthorizedPersonDesignation: string;
  clientAuthorizedPersonId: string;
  status: InwardStatus;
  createdAt: string;
  updatedAt: string;
}

export type InwardStatus = 'pending' | 'received' | 'in_progress' | 'completed' | 'cancelled';

export interface InwardFormData {
  clientOrgId: string;
  billingOrgId: string;
  deliveryOrgId: string;
  otherAccessOrgId: string;
  clientDcNo: string;
  clientDcDate: Date;
  through: string;
  inwardDate: Date;
  receivedDate: Date;
  commitDate: Date;
  calibrationMethod: string;
  reportingMethod: string;
  collectionMode: string;
  dispatchMode: string;
  additionalRequirements: string;
  labAuthorizedPersonId: string;
  labAuthorizedPersonDesignation: string;
  clientAuthorizedPersonId: string;
}

// Gauge Types
export interface Gauge {
  id: string;
  name: string;
  gaugeClass: GaugeClass;
  make: string;
  identificationNumber: string;
  serialNumber: string;
  calibrationFrequency: number;
  calibrationFrequencyUnit: CalibrationFrequencyUnit;
  process: Process;
  unit: Unit;
  calibrationLocationType: CalibrationLocationType;
  calibrationLocation: string;
  calibrationDoneUnder: CalibrationStandard;
  gaugeCondition: GaugeCondition;
  specifications?: GaugeSpecifications;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GaugeClass = 'digital' | 'analog' | 'mechanical' | 'electronic' | 'optical';
export type CalibrationFrequencyUnit = 'months' | 'days' | 'weeks' | 'years';
export type Process = 'calibration' | 'verification' | 'testing' | 'inspection';
export type Unit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type CalibrationLocationType = 'permanent_facility' | 'on_site' | 'mobile';
export type CalibrationStandard = 'nabl' | 'non_nabl';
export type GaugeCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface GaugeSpecifications {
  method: string;
  inputs: {
    basic_size?: number;
    upperTolerance?: number;
    lowerTolerance?: number;
    diameter?: number;
    grade?: string;
  };
}

export interface GaugeFormData {
  name: string;
  gaugeClass: GaugeClass;
  make: string;
  identificationNumber: string;
  serialNumber: string;
  calibrationFrequency: number;
  calibrationFrequencyUnit: CalibrationFrequencyUnit;
  process: Process;
  unit: Unit;
  calibrationLocationType: CalibrationLocationType;
  calibrationLocation: string;
  calibrationDoneUnder: CalibrationStandard;
  gaugeCondition: GaugeCondition;
  specifications?: GaugeSpecifications;
}

// Linked Gauge Types
export interface LinkedGauge extends Gauge {
  inwardId: string;
  clientOrgName: string;
  inwardInfo?: {
    clientOrgName: string;
    clientDcNo: string;
    inwardDate: string;
  };
  processStatus?: ProcessStatus;
}

export type ProcessStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';

// Certificate Types
export interface CertificateType {
  id: string;
  name: string;
  description?: string;
  template?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalibrationCertificate {
  id: string;
  certificateNo: string;
  gaugeId: string;
  gaugeName: string;
  clientOrgId: string;
  calibrationDate: string;
  dueDate: string;
  calibrationMethod: string;
  accuracy: string;
  temperature: string;
  humidity: string;
  technicianName: string;
  status: CertificateStatus;
  createdAt: string;
  updatedAt: string;
}

export type CertificateStatus = 'active' | 'expired' | 'cancelled';

// Outward Entry Types
export interface OutwardEntry {
  id: string;
  inwardId: string;
  clientOrgId: string;
  dispatchDate: string;
  dispatchMode: string;
  trackingNumber?: string;
  status: OutwardStatus;
  createdAt: string;
  updatedAt: string;
  outward_no?: string | number;
  client_org_id?: string;
  client_org?: string;
  transport_by?: string;
  outward_date?: string;
}

export type OutwardStatus = 'pending' | 'dispatched' | 'delivered' | 'returned';

// File Upload Types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// Report Types
export interface ReportData {
  id: string;
  name: string;
  type: ReportType;
  parameters: Record<string, any>;
  generatedAt: string;
  status: ReportStatus;
  fileUrl?: string;
}

export type ReportType = 'inward_summary' | 'gauge_status' | 'calibration_due' | 'custom';
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

// Table Data Types
export interface TableColumn<T = any> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  error?: string;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: ValidationRule;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

// UI Types
export interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  lastError: Error | null;
}
