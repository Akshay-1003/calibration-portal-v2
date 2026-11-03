export type RequestStatus = "submitted" | "acknowledged" | "scheduled" | "in_progress" | "completed" | "cancelled";

export interface ReminderSnapshot {
  gauge_id: string;
  cycle_key: string;
  gauge_name: string;
  identification_number?: string | null;
  manf_serial_number?: string | null;
  due_date: string;
  last_calibration_date: string;
  last_certificate_no?: string | null;
  calibration_frequency: number;
  calibration_frequency_unit: string;
  laboratory_name?: string;
  laboratory_id?: string;
  specifications?: Record<string, unknown>;
  unit?: string;
}

export interface PlanningRequest {
  deliveries?: Array<{ channel: string; destination: string; status: string; attempt_number: number; reason?: string }>;
  id: string;
  organization_id: string;
  organization_name: string;
  laboratory_id: string;
  status: RequestStatus;
  version: number;
  planned_date?: string | null;
  note?: string | null;
  internal_note?: string | null;
  accepted_count: number;
  skipped?: Array<{ gauge_id: string; reason: string }>;
  items: Array<{ snapshot: ReminderSnapshot }>;
  created_at: string;
  history: Array<{ status: RequestStatus; at: string; note?: string | null; reason?: string | null }>;
}

export interface PlanningRequestUpdate {
  status: RequestStatus;
  version: number;
  planned_date?: string;
  note?: string;
  internal_note?: string;
  reason?: string;
}
