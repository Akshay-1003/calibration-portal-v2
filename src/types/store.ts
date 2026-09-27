// Store Types
import { Organization, InwardEntry, LinkedGauge, Gauge, CertificateType } from './api';

// Base Store State
export interface BaseStoreState {
  loading: boolean;
  error: string | null;
  lastFetch: number;
}

// Organization Store
export interface OrganizationState extends BaseStoreState {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  
  // Actions
  setOrganizations: (organizations: Organization[]) => void;
  setSelectedOrganization: (organization: Organization | null) => void;
  addOrganization: (organization: Organization) => void;
  updateOrganization: (id: string, organization: Organization) => void;
  deleteOrganization: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastFetch: (timestamp: number) => void;
  
  // Async Actions
  fetchOrganizations: (forceRefresh?: boolean) => Promise<void>;
  createOrganization: (orgData: any) => Promise<Organization | null>;
  editOrganization: (id: string, orgData: any) => Promise<Organization | null>;
  removeOrganization: (id: string) => Promise<void>;
}

// Inward Store
export interface InwardState extends BaseStoreState {
  inwardEntries: InwardEntry[];
  selectedInward: InwardEntry | null;
  
  // Actions
  setInwardEntries: (entries: InwardEntry[]) => void;
  setSelectedInward: (inward: InwardEntry | null) => void;
  addInwardEntry: (entry: InwardEntry) => void;
  updateInwardEntry: (id: string, entry: InwardEntry) => void;
  deleteInwardEntry: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastFetch: (timestamp: number) => void;
  
  // Async Actions
  fetchInwardEntries: (forceRefresh?: boolean) => Promise<void>;
  createInwardEntryAsync: (entryData: any) => Promise<InwardEntry | null>;
  updateInwardEntryAsync: (id: string, entryData: any) => Promise<InwardEntry | null>;
  deleteInwardEntryAsync: (id: string) => Promise<void>;
}

// Gauge Store
export interface GaugeState extends BaseStoreState {
  gauges: Gauge[];
  selectedGauge: Gauge | null;
  
  // Actions
  setGauges: (gauges: Gauge[]) => void;
  setSelectedGauge: (gauge: Gauge | null) => void;
  addGauge: (gauge: Gauge) => void;
  updateGauge: (id: string, gauge: Gauge) => void;
  deleteGauge: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastFetch: (timestamp: number) => void;
  
  // Async Actions
  fetchGauges: (forceRefresh?: boolean) => Promise<void>;
  createGaugeAsync: (gaugeData: any) => Promise<Gauge | null>;
  updateGaugeAsync: (id: string, gaugeData: any) => Promise<Gauge | null>;
  deleteGaugeAsync: (id: string) => Promise<void>;
}

// Linked Gauge Store
export interface LinkedGaugeState extends BaseStoreState {
  linkedGauges: LinkedGauge[];
  selectedLinkedGauge: LinkedGauge | null;
  
  // Actions
  setLinkedGauges: (gauges: LinkedGauge[]) => void;
  setSelectedLinkedGauge: (gauge: LinkedGauge | null) => void;
  addLinkedGauge: (gauge: LinkedGauge) => void;
  updateLinkedGauge: (id: string, gauge: LinkedGauge) => void;
  deleteLinkedGauge: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastFetch: (timestamp: number) => void;
  
  // Async Actions
  fetchLinkedGauges: (forceRefresh?: boolean) => Promise<void>;
  createLinkedGaugeAsync: (gaugeData: any) => Promise<LinkedGauge | null>;
  updateLinkedGaugeAsync: (id: string, gaugeData: any) => Promise<LinkedGauge | null>;
  deleteLinkedGaugeAsync: (id: string) => Promise<void>;
}

// Certificate Type Store
export interface CertificateTypeState extends BaseStoreState {
  certificateTypes: CertificateType[];
  selectedCertificateType: CertificateType | null;
  
  // Actions
  setCertificateTypes: (types: CertificateType[]) => void;
  setSelectedCertificateType: (type: CertificateType | null) => void;
  addCertificateType: (type: CertificateType) => void;
  updateCertificateType: (id: string, type: CertificateType) => void;
  deleteCertificateType: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setLastFetch: (timestamp: number) => void;
  
  // Async Actions
  fetchCertificateTypes: (forceRefresh?: boolean) => Promise<void>;
  createCertificateTypeAsync: (typeData: any) => Promise<CertificateType | null>;
  updateCertificateTypeAsync: (id: string, typeData: any) => Promise<CertificateType | null>;
  deleteCertificateTypeAsync: (id: string) => Promise<void>;
}

// UI Store
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  loadingStates: Record<string, boolean>;
  errorStates: Record<string, string | null>;
  notifications: Notification[];
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

// Form Store
export interface FormState {
  forms: Record<string, FormData>;
  errors: Record<string, Record<string, string[]>>;
  touched: Record<string, Record<string, boolean>>;
  
  // Actions
  setFormData: (formId: string, data: any) => void;
  getFormData: (formId: string) => any;
  setFieldError: (formId: string, field: string, error: string[]) => void;
  setFieldTouched: (formId: string, field: string, touched: boolean) => void;
  clearForm: (formId: string) => void;
  clearAllForms: () => void;
}

// Store Selectors
export type StoreSelector<T> = (state: any) => T;

// Store Actions
export interface StoreActions {
  reset: () => void;
  clearErrors: () => void;
  clearCache: () => void;
}

// Store Middleware
export interface StoreMiddleware {
  name: string;
  middleware: (store: any) => (next: any) => (action: any) => any;
}

// Store Configuration
export interface StoreConfig {
  name: string;
  version: number;
  persist?: boolean;
  middleware?: StoreMiddleware[];
  devtools?: boolean;
}

