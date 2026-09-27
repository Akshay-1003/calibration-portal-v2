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
  gauge_identification_number: string;
  gauge_make: string;
  gauge_manf_serial_number: string;
  gauge_type: string;
  gauge_specifications: GaugeSpecifications;
  repair_type: 'calibration' | 'maintenance' | 'replacement' | 'adjustment';
  repair_description: string;
  repair_status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  estimated_cost: number;
  actual_cost?: number;
  estimated_completion_date: string;
  actual_completion_date?: string;
  technician_name: string;
  technician_notes?: string;
  client_approval_required: boolean;
  client_approval_status?: 'pending' | 'approved' | 'rejected';
  client_approval_date?: string;
  spare_parts: SparePart[];
  created_at: string;
  updated_at: string;
}

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
  custom_specs?: Record<string, any>;
}

export interface RepairFormData {
  repair_date: string;
  client_org_id: string;
  gauge_id: string;
  gauge_identification_number: string;
  gauge_make: string;
  gauge_manf_serial_number: string;
  gauge_type: string;
  gauge_specifications: GaugeSpecifications;
  repair_type: 'calibration' | 'maintenance' | 'replacement' | 'adjustment';
  repair_description: string;
  repair_status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  estimated_cost: number;
  estimated_completion_date: string;
  technician_name: string;
  technician_notes?: string;
  client_approval_required: boolean;
  spare_parts: SparePart[];
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
  repairType?: string;
  repairStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface RepairTableHandlers {
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onSortChange: (sortDescriptor: any) => void;
  onSelectionChange: (keys: Set<string>) => void;
  onClientOrgChange: (orgId: string) => void;
  onRepairTypeChange: (type: string) => void;
  onRepairStatusChange: (status: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onCreateRepair: () => void;
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
