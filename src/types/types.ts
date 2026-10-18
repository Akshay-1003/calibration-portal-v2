import type { InvoicePdfColumnVisibility } from '../utils/invoicePdfColumns';

export interface GaugeSpecificationGo {
    basic_size: number;
    specification_limit_max: number;
    specification_limit_min: number;
    wear_limit: number;
}

export interface GaugeSpecificationNoGo {
    basic_size: number;
    specification_limit_max: number;
    specification_limit_min: number;
}

export interface GaugeInputTolerance {
    basic_size: number;
    upper_tolerance: number;
    lower_tolerance: number;
}
export interface CertificateData {
  archived: boolean;
  created_at: string;               // ISO datetime
  updated_at: string;               // ISO datetime
  deleted_at: string | null;
  gauge_inward_id: string;
  certificate_issue_date: string;   // YYYY-MM-DD
  certificate_code: string;
  serial_no: string;
  certificate_url: string;
  equipment_ids: string[];          // array of equipment IDs (strings)
  id: string;
  certificate_no: string;
  location?: string;
}

export interface GaugeSpecificationInputs {
    method: "tolerance" | "grade" | "direct"| '';
    diameter?: number;
    grade?: string;
    inputs: GaugeInputTolerance | {
        basic_size: number;
        upper_tolerance: number;
        lower_tolerance: number;

    };
}

export interface GaugeSpecificationsObject {
    go: GaugeSpecificationGo;
    no_go: GaugeSpecificationNoGo;
    inputs: GaugeSpecificationInputs;
}

export type GaugeSpecificationsArray = string[];

/**
 * GaugeSpecifications can be either:
 * - object shape for limit/fixed range gauges (go/no_go/inputs)
 * - array of strings for master piece style specifications
 */
export type GaugeSpecifications = GaugeSpecificationsObject | GaugeSpecificationsArray;

export interface GaugeData {
    archived: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    client_org_id: string;
    master_gauge_id: string;
    gauge_class: string;
    certificate_type_id: string;
    identification_number: string;

    calibration_frequency: number;
    calibration_frequency_unit: "months" | "years" ;

    make: string;
    manf_serial_number: string;
    unit: "mm" | "inch" | "cm" | "m";

    calibration_location_type: "permanent_facility" | "site_facility" | "mobile_facility";
    calibration_location?: string;
    calibration_done_under: "nabl" | "non_nabl";
    gauge_condition: string;

    specifications: GaugeSpecifications;

    id: string;
    master_gauge: string;
    certificate_type: string;
    client_organization: string;
}

// Invoice Billing Component
export interface InvoiceBillingComponent {
  process: string;
  quantity: number;
  rate: number;
  rate_card_list_rate?: number;
  rate_card_discount_percentage?: number;
  rate_card_discount_amount?: number;
  amount: number;
  service_type?: string;
  line_type?: 'calibration' | 'repair' | 'spare_part' | 'custom';
  description?: string;
  hsn_sac?: string;
  tax_category?: string;
  tax_rate?: number;
  discount_type?: 'none' | 'percentage' | 'flat';
  discount_value?: number;
  discount_amount?: number;
  net_amount?: number;
}

// Invoice Billing Item
// Note: specifications can be null in API responses, but we convert to empty object {} when building payloads
export interface InvoiceBillingItem {
  source_type?: string;
  gauge_id: string | null;
  inward_id: string | null;
  inward_date?: string | null;
  master_gauge_id: string | null;
  master_gauge_name: string;
  identification_number: string;
  inward_gauge_lab_id: string;
  specifications: Record<string, unknown> | string | null; // Can be null in API responses
  billing_components: InvoiceBillingComponent[];
  total: number;
  instrument_quantity?: number;
}

// Invoice Details
export interface InvoiceDetails {
  billing_items: InvoiceBillingItem[];
  sub_total: number;
  packing: number;
  courier: number;
  discount?: number;
  discount_mode?: 'invoice' | 'line';
  total_discount?: number;
  pdf_columns_user_configured?: boolean;
  cgst: number;
  sgst: number;
  grand_total: number;
  pdf_columns?: Partial<InvoicePdfColumnVisibility>;
}

// Client Address
export interface ClientAddress {
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

// Client Details
export interface ClientDetails {
  name: string;
  client_gst_no?: string;
  address: ClientAddress;
}

// Invoice Type - matches API response structure
export interface Invoice {
  updated_at: string; // ISO datetime
  created_at: string; // ISO datetime
  deleted_at: string | null; // ISO datetime or null
  archived: boolean;
  billing_firm_id?: string;
  billing_firm_name?: string;
  party_id?: string;
  billing_date?: string;
  invoice_number: string;
  date_of_issue: string; // YYYY-MM-DD
  order_number?: string | null;
  order_date?: string | null;
  po_number?: string | null;
  po_date?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  invoice_from_date?: string | null;
  invoice_to_date?: string | null;
  credit_days?: number;
  payment_due_date?: string | null;
  payment_date?: string | null;
  payment_mode?: 'NEFT' | 'RTGS' | 'UPI' | 'Cheque' | 'Cash' | null;
  payment_reference_no?: string | null;
  payment_remarks?: string | null;
  status: 'draft' | 'generated' | 'cancelled' | 'paid' | 'finalized' | 'sent' | 'canceled';
  client_org_id: string;
  outward_id: string | null;
  outward_ids?: string[];
  outward_no: string | number | null;
  outward_nos?: Array<string | number>;
  gauge_inward_ids: string[] | null;
  client_details: ClientDetails;
  invoice_details: InvoiceDetails;
  // Optional: ID field for fetched invoices
  id?: string;
}
  
export interface RateRange {
  min: number;
  max: number;
}

export interface RateCardEntry {
  rate_type: string;
  range: RateRange;
  basic_size?: number;
  range_unit: string;
  standard_specification?: string;
  least_count?: number;
  description: string;
  rate: number;
  discount: number;
  unit: string;
}
