export interface EquipmentRange {
  range: string;
  max_error: string;
}

export interface EquipmentData {
  id: string;
  equipment_name: string;
  code_no: string;
  serial_no: string;
  mfg_date: string;
  date_of_installation: string;
  reference_std: string;
  least_count: string;
  cal_agency: string;
  make: string;
  size_range: string;
  periodicity_no: string;
  equipment_location: string;
  ranges: EquipmentRange[];
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}
