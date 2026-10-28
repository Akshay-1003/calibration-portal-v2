import { z } from 'zod';
import { DEFAULT_INVOICE_PDF_COLUMNS } from '../../utils/invoicePdfColumns';

export const invoicePdfColumnsSchema = z.object({
  sr_no: z.boolean().default(true),
  gauge_name: z.boolean().default(true),
  identification_number: z.boolean().default(true),
  dc_no: z.boolean().default(false),
  specification: z.boolean().default(true),
  hsn: z.boolean().default(true),
  repair_new: z.boolean().default(false),
  calibration_charge: z.boolean().default(true),
  qty: z.boolean().default(true),
  discount: z.boolean().default(false),
  amount: z.boolean().default(true),
});

export const invoiceDraftRequestSchema = z.object({
  client_org_id: z.string().min(1, 'Client organization is required'),
  outward_id: z.string().min(1, 'Outward id is required').optional(),
  outward_ids: z.array(z.string().min(1, 'Outward id is required')).min(1).optional(),
  gauge_inward_ids: z
    .array(z.string().min(1, 'Gauge inward id is required'))
    .min(1, 'At least one gauge is required')
    .optional(),
}).refine(
  (data) => data.outward_id || (data.outward_ids && data.outward_ids.length > 0) || (data.gauge_inward_ids && data.gauge_inward_ids.length > 0),
  {
    message: 'Either outward_id, outward_ids, or gauge_inward_ids must be provided',
    path: ['outward_id'],
  }
);

export type InvoiceDraftRequest = z.infer<typeof invoiceDraftRequestSchema>;

export const createInvoiceHeaderFormSchema = z.object({
  billing_firm_id: z.string().min(1, 'Billing Firm is required.'),
  billing_firm_name: z.string().min(1, 'Billing Firm is required.'),
  party_id: z.string().min(1, 'Party is required.'),
  billing_date: z.string().min(1, 'Billing Date is required.'),
  outward_no: z.string().optional(),
  outward_ids: z.array(z.string().min(1, 'Outward id is required')).default([]),
  outward_nos: z.array(z.string().min(1, 'Outward number is required')).default([]),
  repair_ids: z.array(z.string()).default([]),
  repair_nos: z.array(z.string()).default([]),
  order_number: z.string().optional(),
  order_date: z.string().optional(),
  po_number: z.string().optional(),
  po_date: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  credit_days: z.coerce.number().refine((value) => [0, 30, 45, 60].includes(value), {
    message: 'Payment terms must be Immediate, 30 Days, 45 Days, or 60 Days.',
  }),
  pdf_columns: invoicePdfColumnsSchema.default(DEFAULT_INVOICE_PDF_COLUMNS),
  pdf_columns_user_configured: z.boolean().default(false),
});

export type CreateInvoiceHeaderFormData = z.infer<typeof createInvoiceHeaderFormSchema>;

// Billing Component Schema
export const billingComponentSchema = z.object({
  process: z.enum(['calibration', 'repair', 'inspection', 'verification']),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  rate: z.number().min(0, 'Rate must be 0 or greater'),
  amount: z.number().min(0, 'Amount must be 0 or greater'),
  service_type: z.string().optional(),
  line_type: z.enum(['calibration', 'repair', 'spare_part', 'custom', 'return_as_is']).optional(),
  return_as_is: z.boolean().optional(),
  description: z.string().optional(),
  hsn_sac: z.string().optional(),
  tax_category: z.string().optional(),
  tax_rate: z.number().min(0).optional(),
  discount_type: z.enum(['none', 'percentage', 'flat']).optional(),
  discount_value: z.number().min(0).optional(),
  discount_amount: z.number().min(0).optional(),
  net_amount: z.number().min(0).optional(),
});

// Billing Item Schema
export const billingItemSchema = z.object({
  gauge_id: z.string().min(1, 'Gauge ID is required'),
  inward_id: z.string().min(1, 'Inward ID is required'),
  master_gauge_id: z.string().min(1, 'Master gauge ID is required'),
  master_gauge_name: z.string().min(1, 'Master gauge name is required'),
  identification_number: z.string(),
  inward_gauge_lab_id: z.string(),
  specifications: z.record(z.string(), z.unknown()).nullable(), // Can be null in API responses
  billing_components: z.array(billingComponentSchema).min(1, 'At least one billing component is required'),
  total: z.number().min(0, 'Total must be 0 or greater'),
});

// Invoice Details Schema
export const invoiceDetailsSchema = z.object({
  billing_items: z.array(billingItemSchema).min(1, 'At least one billing item is required'),
  sub_total: z.number().min(0, 'Subtotal must be 0 or greater'),
  packing: z.number().min(0, 'Packing must be 0 or greater').default(0),
  courier: z.number().min(0, 'Courier must be 0 or greater').default(0),
  discount: z.number().min(0, 'Discount must be 0 or greater').default(0),
  discount_mode: z.enum(['invoice', 'line']).optional(),
  pdf_columns_user_configured: z.boolean().default(false),
  cgst: z.number().min(0, 'CGST must be 0 or greater').default(0),
  sgst: z.number().min(0, 'SGST must be 0 or greater').default(0),
  grand_total: z.number().min(0, 'Grand total must be 0 or greater'),
  pdf_columns: invoicePdfColumnsSchema.default(DEFAULT_INVOICE_PDF_COLUMNS),
});

// Client Address Schema
export const clientAddressSchema = z.object({
  address_line_1: z.string(),
  address_line_2: z.string().default(''),
  city: z.string(),
  state: z.string(),
  zip_code: z.string(),
  country: z.string(),
});

// Client Details Schema
export const clientDetailsSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  client_gst_no: z.string().optional(),
  address: clientAddressSchema,
});

// Form Schema for Invoice Creation (simplified for React Hook Form)
export const invoiceFormSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  date_of_issue: z.string(),
  packing: z.number().min(0, 'Packing must be 0 or greater'),
  courier: z.number().min(0, 'Courier must be 0 or greater'),
  discount: z.number().min(0, 'Discount must be 0 or greater').default(0),
  discount_mode: z.enum(['invoice', 'line']).optional(),
  pdf_columns_user_configured: z.boolean().default(false),
  cgst_rate: z.number().min(0, 'CGST rate must be 0 or greater'),
  sgst_rate: z.number().min(0, 'SGST rate must be 0 or greater'),
  pdf_columns: invoicePdfColumnsSchema.default(DEFAULT_INVOICE_PDF_COLUMNS),
});

export const editInvoiceFormSchema = invoiceFormSchema.extend({
  discount: z
    .number()
    .min(0, 'Discount must be 0 or greater')
    .max(100, 'Discount must be 100 or less'),
  billing_firm_id: z.string().min(1, 'Billing Firm is required.'),
  billing_firm_name: z.string().min(1, 'Billing Firm is required.'),
  party_id: z.string().min(1, 'Party is required.'),
  billing_date: z.string().min(1, 'Billing Date is required.'),
  outward_no: z.string().optional(),
  outward_ids: z.array(z.string().min(1, 'Outward id is required')).default([]),
  outward_nos: z.array(z.string().min(1, 'Outward number is required')).default([]),
  order_number: z.string().optional(),
  order_date: z.string().optional(),
  po_number: z.string().optional(),
  po_date: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  credit_days: z.coerce.number().refine((value) => [0, 30, 45, 60].includes(value), {
    message: 'Payment terms must be Immediate, 30 Days, 45 Days, or 60 Days.',
  }),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type EditInvoiceFormData = z.infer<typeof editInvoiceFormSchema>;
export type BillingComponent = z.infer<typeof billingComponentSchema>;
export type BillingItem = z.infer<typeof billingItemSchema>;
export type InvoiceDetails = z.infer<typeof invoiceDetailsSchema>;
export type ClientDetails = z.infer<typeof clientDetailsSchema>;
