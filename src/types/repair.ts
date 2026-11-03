/**
 * Repair Module Types
 * Contains all types and interfaces for the repair functionality
 */

import type { GaugeMaster } from '../store/useStore';

export interface RepairEntry {
  id: string;
  repair_no: string;
  repair_date: string;
  client_org_id: string;
  client_org_name: string;
  gauge_id: string;
  manual_item_name?: string;
  inward_id?: string;
  gauge_identification_number: string;
  gauge_make: string;
  gauge_manf_serial_number: string;
  gauge_type: string;
  gauge_specifications: GaugeSpecifications;
  repair_type: 'repair_only' | 'repair_and_calibration';
  repair_description: string;
  repair_status: RepairStatus;
  estimated_cost: number;
  repair_charge?: number;
  actual_cost?: number;
  estimated_completion_date: string;
  actual_completion_date?: string;
  technician_name: string;
  technician_notes?: string;
  work_performed?: string;
  additional_service_charges?: number;
  client_approval_required: boolean;
  client_approval_status?: 'pending' | 'approved' | 'rejected';
  client_approval_date?: string;
  spare_parts: SparePart[];
  items: RepairItem[];
  item_count: number;
  created_at: string;
  updated_at: string;
}

export type RepairItemSource = 'inward' | 'direct';

export interface RepairItem {
  item_id: string;
  source: RepairItemSource;
  gauge_id?: string;
  master_gauge_id?: string;
  manual_item_name?: string;
  inward_id?: string;
  identification_number?: string;
  make?: string;
  manf_serial_number?: string;
  gauge_type?: string;
  specifications: GaugeSpecifications;
  repair_type: 'repair_only' | 'repair_and_calibration';
  repair_description: string;
  status: RepairStatus;
  estimated_cost: number;
  repair_charge: number;
  additional_service_charges: number;
}

export type RepairStatus =
  | 'draft'
  | 'pending'
  | 'under_inspection'
  | 'in_progress'
  | 'repair_in_progress'
  | 'completed'
  | 'calibration_pending'
  | 'on_hold'
  | 'cancelled';

export interface SparePart {
  id: string;
  repair_id: string;
  part_name: string;
  part_description?: string;
  make: string;
  part_number?: string;
  quantity: number;
  unit_rate: number;
  total_amount: number;
  used_in_repair: boolean;
  notes?: string;
}

export interface GaugeSpecifications {
  description?: string;
  range?: {
    min: number;
    max: number;
    unit: string;
  };
  least_count?: {
    value: number;
    unit: string;
  };
  basic_size?: {
    value: number;
    unit: string;
  };
  accuracy?: {
    value: number;
    unit: string;
  };
  resolution?: {
    value: number;
    unit: string;
  };
  // Additional specifications based on gauge type
  custom_specs?: Record<string, unknown>;
}

export interface RepairFormData {
  repair_date: string;
  client_org_id: string;
  gauge_id: string;
  manual_item_name?: string;
  inward_id?: string;
  gauge_identification_number: string;
  gauge_make: string;
  gauge_manf_serial_number: string;
  gauge_type: string;
  gauge_specifications: GaugeSpecifications;
  repair_type: 'repair_only' | 'repair_and_calibration';
  repair_description: string;
  repair_status: RepairStatus;
  estimated_cost: number;
  repair_charge?: number;
  estimated_completion_date: string;
  technician_name: string;
  technician_notes?: string;
  work_performed?: string;
  actual_completion_date?: string;
  actual_cost?: number;
  additional_service_charges?: number;
  client_approval_required: boolean;
  spare_parts: SparePart[];
}

export interface RepairDraftFormData {
  repair_date: string;
  client_org_id: string;
  technician_name: string;
  estimated_completion_date: string;
  repair_status: RepairStatus;
}

export interface RepairTableState {
  data: RepairEntry[];
  loading: boolean;
  error: string | null;
  page: number;
  rowsPerPage: number;
  selectedKeys: Set<string>;
  sortDescriptor: {
    column: string;
    direction: 'ascending' | 'descending';
  };
  searchValue: string;
  clientOrgId?: string;
}

export interface RepairTableHandlers {
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onSortChange: (sortDescriptor: any) => void;
  onSelectionChange: (keys: Set<string>) => void;
  onClientOrgChange: (orgId: string) => void;
  onEdit: (repair: RepairEntry) => void;
  onDelete: (repair: RepairEntry) => void;
  onView: (repair: RepairEntry) => void;
  onRefresh: () => void;
}

export interface RepairFormProps {
  initialData?: Partial<RepairFormData>;
  isEditing?: boolean;
  onSubmit: (data: RepairFormData) => Promise<void>;
  onCancel: () => void;
  gaugeMasterList: GaugeMaster[];
  organizations: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
}
