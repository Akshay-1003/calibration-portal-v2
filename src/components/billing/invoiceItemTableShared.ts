export const INVOICE_HSN_OPTIONS = [
  { code: "998346", name: "Calibration" },
  { code: "998347", name: "Repair" },
  { code: "998348", name: "Inspection" },
  { code: "998349", name: "Verification" },
] as const;

export const DEFAULT_INVOICE_HSN = "998346";

export const getInvoiceHsnOption = (hsnCode: string) =>
  INVOICE_HSN_OPTIONS.find((option) => option.code === hsnCode.trim());

export const getInvoiceHsnName = (hsnCode: string, fallbackName = "") =>
  getInvoiceHsnOption(hsnCode)?.name || fallbackName || "Custom HSN";

export const getInvoiceProcessFromHsn = (
  hsnCode: string,
): "calibration" | "repair" | "inspection" | "verification" => {
  switch (hsnCode.trim()) {
    case "998347":
      return "repair";
    case "998348":
      return "inspection";
    case "998349":
      return "verification";
    case "998346":
    default:
      return "calibration";
  }
};

export interface InvoiceItemHSN {
  id: string;
  hsnCode: string;
  hsnName: string;
  rate: string;
  rateCardListRate?: number;
  rateCardDiscountPercentage?: number;
  rateCardDiscountAmount?: number;
  quantity: number;
  discountType?: 'none' | 'percentage' | 'flat';
  discountValue?: string;
  lineType?: 'calibration' | 'repair' | 'spare_part' | 'custom';
  description?: string;
}

export type EditableGaugeField =
  | "identification_number"
  | "inward_gauge_lab_id"
  | "specification";

export interface InvoiceTableGaugeItem {
  id: string;
  inward_id?: string;
  gauge_inward_id?: string;
  gauge_id?: string;
  inward_gauge_lab_id?: string;
  master_gauge_name?: string;
  identification_number?: string;
  manf_serial_number?: string;
  inward_date?: string;
  process?: string;
  status?: string;
  specification?: string;
  gauge_specification?: string;
  specifications?: Record<string, unknown> | string | null;
  master_gauge_id?: string;
  source_type?: "outward" | "inward" | "manual";
  unit?: string;
  instrument_quantity?: number;
}

export interface InvoiceItemDataLocal {
  gaugeItem: InvoiceTableGaugeItem;
  hsnEntries: InvoiceItemHSN[];
  isManual?: boolean;
}

export interface InvoiceBillingTableRow {
  gaugeIndex: number;
  hsnEntry: InvoiceItemHSN;
  itemData: InvoiceItemDataLocal;
  amount: number;
}
