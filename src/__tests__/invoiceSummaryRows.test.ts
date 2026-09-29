import { describe, expect, it } from 'vitest';
import type { InvoiceData } from '../components/billing/InvoiceTemplate';
import { buildInvoiceSummaryRows } from '../utils/invoiceSummaryRows';
import type { InvoicePdfDisplayRow } from '../utils/invoicePdfRows';

const baseData: InvoiceData = {
  company_name: 'Vikramaditya Trading Services',
  office_address: '',
  work_address: '',
  company_email: '',
  invoice_number: '26-27/0006',
  billing_date: '2026-09-16',
  outward_no: '',
  client_name: 'XYZ',
  client_address: 'Pune, India',
  items: [],
  total: 4349,
  total_qty: 4,
  packing_forwarding_charges: 0,
  courier_transport_charges: 0,
  discount_amount: 309.9,
  discount_percentage: 10,
  net_amount: 4039.1,
  taxable_amount: 4039.1,
  sgst_percentage: 9,
  sgst_amount: 363.52,
  cgst_percentage: 9,
  cgst_amount: 363.52,
  grand_total: 4618.64,
  rounded_off_total: 4619,
  bank_name: '',
  account_number: '',
  ifsc: '',
  gstin: '',
  pan_no: '',
};

const makeRow = (overrides: Partial<InvoicePdfDisplayRow>): InvoicePdfDisplayRow => ({
  sr_no: 1,
  gauge_name: '2 D Height Gauge',
  identification_number: '-',
  dc_no: '-',
  specification: '0-1000 mm',
  hsn: '998346',
  repair_new: 0,
  calibration_charge: 0,
  qty: 1,
  amount: 0,
  row_kind: 'instrument',
  ...overrides,
});

describe('invoice summary rows', () => {
  it('shows discount as a calibration-only deduction before adding repair', () => {
    const rows = buildInvoiceSummaryRows(baseData, [
      makeRow({
        calibration_charge: 3099,
        repair_new: 1250,
        qty: 4,
        amount: 4349,
      }),
    ]);

    expect(rows.map((row) => row.label)).toEqual([
      'Calibration Charges',
      'Less: Calibration Discount (10%)',
      'Net Calibration Charges',
      'Add: Repair / Servicing Charges',
      'Taxable Value',
      'CGST (9%)',
      'SGST (9%)',
      'Grand Total',
      'Round Off Total',
    ]);
    expect(rows.find((row) => row.key === 'calibration-discount')?.value).toBe(-309.9);
    expect(rows.find((row) => row.key === 'calibration-net')?.value).toBe(2789.1);
    expect(rows.find((row) => row.key === 'repair-servicing')?.value).toBe(1250);
  });

  it('omits optional discount, repair, and zero-charge rows when not applicable', () => {
    const rows = buildInvoiceSummaryRows(
      {
        ...baseData,
        total: 3099,
        discount_amount: 0,
        discount_percentage: 0,
        taxable_amount: 3099,
        net_amount: 3099,
        cgst_amount: 278.91,
        sgst_amount: 278.91,
        grand_total: 3656.82,
        rounded_off_total: 3657,
      },
      [
        makeRow({
          calibration_charge: 3099,
          repair_new: 0,
          amount: 3099,
        }),
      ],
    );

    expect(rows.map((row) => row.key)).toEqual([
      'calibration-gross',
      'taxable-value',
      'cgst',
      'sgst',
      'grand-total',
      'rounded-total',
    ]);
  });

  it('shows non-zero P&F and courier charges after taxable value', () => {
    const rows = buildInvoiceSummaryRows(
      {
        ...baseData,
        discount_amount: 0,
        discount_percentage: 0,
        packing_forwarding_charges: 75,
        courier_transport_charges: 125,
        taxable_amount: 4349,
        net_amount: 4349,
        cgst_amount: 391.41,
        sgst_amount: 391.41,
        grand_total: 5331.82,
        rounded_off_total: 5332,
      },
      [
        makeRow({
          calibration_charge: 3099,
          repair_new: 1250,
          qty: 4,
          amount: 4349,
        }),
      ],
    );

    expect(rows.map((row) => row.label)).toEqual([
      'Calibration Charges',
      'Add: Repair / Servicing Charges',
      'Taxable Value',
      'Add: P&F Charges',
      'Add: Courier/Transport Charges',
      'CGST (9%)',
      'SGST (9%)',
      'Grand Total',
      'Round Off Total',
    ]);
    expect(rows.find((row) => row.key === 'packing-forwarding')?.value).toBe(75);
    expect(rows.find((row) => row.key === 'courier-transport')?.value).toBe(125);

    const discountedRows = buildInvoiceSummaryRows(
      {
        ...baseData,
        packing_forwarding_charges: 75,
        courier_transport_charges: 125,
      },
      [
        makeRow({
          calibration_charge: 3099,
          repair_new: 1250,
          qty: 4,
          amount: 4349,
        }),
      ],
    );

    expect(discountedRows.map((row) => row.key)).toEqual([
      'calibration-gross',
      'calibration-discount',
      'calibration-net',
      'repair-servicing',
      'taxable-value',
      'packing-forwarding',
      'courier-transport',
      'cgst',
      'sgst',
      'grand-total',
      'rounded-total',
    ]);
  });
});
