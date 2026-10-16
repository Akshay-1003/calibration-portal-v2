import { describe, expect, it } from 'vitest';
import { transformInvoiceToInvoiceData } from '../components/billing/invoiceUtils';
import type { AccountDetail } from '../types/accountDetails';
import type { Invoice } from '../types/types';
import { DEFAULT_INVOICE_PDF_COLUMNS } from '../utils/invoicePdfColumns';

const baseInvoice: Invoice = {
  updated_at: '2026-08-11T00:00:00.000Z',
  created_at: '2026-08-11T00:00:00.000Z',
  deleted_at: null,
  archived: false,
  billing_firm_id: 'trading-firm-id',
  billing_firm_name: 'Vikramaditya Trading Services',
  party_id: 'customer-id',
  billing_date: '2026-08-11',
  invoice_number: '26-27/0036',
  date_of_issue: '2026-08-11',
  order_number: 'PO-123',
  order_date: '2026-07-28',
  po_number: 'CUSTOMER-PO-001',
  po_date: '2026-07-30',
  from_date: null,
  to_date: null,
  status: 'draft',
  client_org_id: 'customer-id',
  outward_id: 'outward-id',
  outward_no: '15146',
  gauge_inward_ids: [],
  client_details: {
    name: 'Kothavale Auto Pvt Ltd',
    client_gst_no: '27CUSTOMERGST',
    address: {
      address_line_1: 'Plot no L-11 Kupwad MIDC',
      address_line_2: '',
      city: 'Sangli',
      state: 'Maharashtra',
      zip_code: '416436',
      country: 'India',
    },
  },
  invoice_details: {
    billing_items: [],
    sub_total: 0,
    packing: 0,
    courier: 0,
    discount: 0,
    cgst: 0,
    sgst: 0,
    grand_total: 0,
  },
  id: 'invoice-id',
};

const tradingFirm: AccountDetail = {
  id: 'trading-firm-id',
  firm_name: 'Vikramaditya Trading Services',
  type: 'Trading',
  gst_no: '27TRADINGGST',
  pan_no: 'TRADINGPAN',
  address: 'Trading Office, Kolhapur',
  contact_no: '9999999999',
  email: 'trading@example.com',
  website: '',
  logo: '',
  bank_details: {
    bank_name: 'Trading Bank',
    account_no: '123456789',
    ifsc: 'TRAD0001234',
    branch: 'Kolhapur',
  },
  is_active: true,
};

describe('invoiceUtils', () => {
  it('maps selected billing firm account details into invoice preview data', () => {
    const invoiceData = transformInvoiceToInvoiceData(baseInvoice, tradingFirm);

    expect(invoiceData.company_name).toBe('Vikramaditya Trading Services');
    expect(invoiceData.office_address).toBe('Trading Office, Kolhapur');
    expect(invoiceData.work_address).toBe('Contact: 9999999999');
    expect(invoiceData.company_email).toBe('trading@example.com');
    expect(invoiceData.bank_name).toBe('Trading Bank, Branch - Kolhapur');
    expect(invoiceData.account_number).toBe('123456789');
    expect(invoiceData.ifsc).toBe('TRAD0001234');
    expect(invoiceData.gstin).toBe('27TRADINGGST');
    expect(invoiceData.pan_no).toBe('TRADINGPAN');
    expect(invoiceData.order_date).toBe('2026-07-28');
    expect(invoiceData.po_number).toBe('CUSTOMER-PO-001');
    expect(invoiceData.po_date).toBe('2026-07-30');
  });

  it('does not fall back to hardcoded metrology firm details when account details are unavailable', () => {
    const invoiceData = transformInvoiceToInvoiceData(baseInvoice);

    expect(invoiceData.company_name).toBe('Vikramaditya Trading Services');
    expect(invoiceData.company_name).not.toContain('METROLOGY');
    expect(invoiceData.bank_name).toBe('');
    expect(invoiceData.gstin).toBe('');
    expect(invoiceData.pan_no).toBe('');
  });

  it('carries saved PDF column visibility into invoice preview data', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        pdf_columns: {
          ...DEFAULT_INVOICE_PDF_COLUMNS,
          dc_no: true,
          repair_new: true,
          hsn: false,
        },
      },
    });

    expect(invoiceData.pdf_columns?.dc_no).toBe(true);
    expect(invoiceData.pdf_columns?.repair_new).toBe(true);
    expect(invoiceData.pdf_columns?.hsn).toBe(true);
  });

  it('shows every outward number in the invoice preview data', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      outward_ids: ['outward-id', 'outward-id-2', 'outward-id-3'],
      outward_nos: ['15146', '15147', '15148'],
    });

    expect(invoiceData.outward_no).toBe('15146, 15147, 15148');
  });

  it('sorts invoice rows without merging separate stored line items', () => {
    const invoice: Invoice = {
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        billing_items: [
          {
            gauge_id: 'z-gauge',
            inward_id: 'z-inward',
            master_gauge_id: 'z-master',
            master_gauge_name: 'Zeta Gauge',
            identification_number: 'ZG-01',
            inward_gauge_lab_id: 'z-lab',
            specifications: null,
            billing_components: [
              { process: 'calibration', quantity: 1, rate: 100, amount: 100 },
            ],
            total: 100,
          },
          {
            gauge_id: 'a-gauge',
            inward_id: 'a-inward',
            master_gauge_id: 'a-master',
            master_gauge_name: 'Alpha Gauge',
            identification_number: 'AG-01',
            inward_gauge_lab_id: 'a-lab',
            specifications: null,
            billing_components: [
              { process: 'calibration', quantity: 1, rate: 50, amount: 50 },
            ],
            total: 50,
          },
          {
            gauge_id: 'a-gauge-duplicate',
            inward_id: 'a-inward-duplicate',
            master_gauge_id: 'a-master-duplicate',
            master_gauge_name: 'Alpha Gauge',
            identification_number: 'AG-01',
            inward_gauge_lab_id: 'a-lab-duplicate',
            specifications: null,
            billing_components: [
              { process: 'calibration', quantity: 2, rate: 50, amount: 100 },
            ],
            total: 100,
          },
        ],
        sub_total: 250,
        cgst: 22.5,
        sgst: 22.5,
        grand_total: 295,
      },
    };

    const invoiceData = transformInvoiceToInvoiceData(invoice);

    expect(invoice.invoice_details.billing_items).toHaveLength(3);
    expect(invoiceData.items).toHaveLength(3);
    expect(invoiceData.items.map((item) => item.gauge_name)).toEqual([
      'Alpha Gauge\nCalibration',
      'Alpha Gauge\nCalibration',
      'Zeta Gauge\nCalibration',
    ]);
    expect(invoiceData.items.map((item) => item.sr_no)).toEqual([1, 2, 3]);
    expect(invoiceData.items.map((item) => item.qty)).toEqual([1, 2, 1]);
    expect(invoiceData.items.map((item) => item.amount)).toEqual([50, 100, 100]);
    expect(invoiceData.total_qty).toBe(3);
  });

  it('keeps separate specifications when the identification number is the same', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        billing_items: [
          {
            gauge_id: 'gauge-26',
            inward_id: 'inward-26',
            master_gauge_id: 'master-taper',
            master_gauge_name: 'Taper Thread Plug Gauge',
            identification_number: 'PMF-TPG-26',
            inward_gauge_lab_id: 'lab-26',
            specifications: { specification: '1/4\" 18 NPT L1; PD: 12.4920 mm' },
            billing_components: [
              { process: 'calibration', quantity: 1, rate: 550, amount: 550 },
            ],
            total: 550,
          },
          {
            gauge_id: 'gauge-27',
            inward_id: 'inward-27',
            master_gauge_id: 'master-taper',
            master_gauge_name: 'Taper Thread Plug Gauge',
            identification_number: 'PMF-TPG-26',
            inward_gauge_lab_id: 'lab-27',
            specifications: { specification: '3/8\" 18 NPTF L1; PD: 15.5500 mm' },
            billing_components: [
              { process: 'calibration', quantity: 1, rate: 650, amount: 650 },
            ],
            total: 650,
          },
        ],
        sub_total: 1200,
        cgst: 108,
        sgst: 108,
        grand_total: 1416,
      },
    });

    expect(invoiceData.items).toHaveLength(2);
    expect(invoiceData.items.map((item) => item.identification_number)).toEqual([
      'PMF-TPG-26',
      'PMF-TPG-26',
    ]);
    expect(invoiceData.items.map((item) => item.specification)).toEqual([
      '1/4\" 18 NPT L1; PD: 12.4920 mm',
      '3/8\" 18 NPTF L1; PD: 15.5500 mm',
    ]);
    expect(invoiceData.items.map((item) => item.qty)).toEqual([1, 1]);
    expect(invoiceData.items.map((item) => item.amount)).toEqual([550, 650]);
    expect(invoiceData.total_qty).toBe(2);
  });

  it('uses persisted service HSN, discount, and net amount for PDF rows', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        discount_mode: 'line',
        billing_items: [{
          gauge_id: 'gauge-1',
          inward_id: 'inward-1',
          master_gauge_id: 'master-1',
          master_gauge_name: 'Combination Gauge',
          identification_number: 'CG-01',
          inward_gauge_lab_id: 'lab-1',
          specifications: { specification: '100 mm' },
          billing_components: [
            {
              process: 'repair',
              service_type: 'repair',
              hsn_sac: '998347',
              quantity: 1,
              rate: 1200,
              amount: 1200,
              discount_type: 'flat',
              discount_value: 100,
              discount_amount: 100,
              net_amount: 1100,
            },
          ],
          total: 1100,
        }],
        sub_total: 1100,
        cgst: 99,
        sgst: 99,
        grand_total: 1298,
      },
    });

    expect(invoiceData.items).toHaveLength(1);
    expect(invoiceData.items[0]).toMatchObject({
      hsn: '998347',
      repair_new: 1200,
      amount: 1100,
      discount_amount: 100,
      qty: 1,
    });
    expect(invoiceData.total).toBe(1200);
    expect(invoiceData.discount_amount).toBe(100);
    expect(invoiceData.taxable_amount).toBe(1100);
  });

  it('keeps calibration and repair under one instrument quantity', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        discount_mode: 'line',
        billing_items: [{
          gauge_id: 'gauge-1',
          inward_id: 'inward-1',
          master_gauge_id: 'master-1',
          master_gauge_name: 'Bore Gauge',
          identification_number: 'BG-01',
          inward_gauge_lab_id: 'lab-1',
          instrument_quantity: 1,
          specifications: { specification: '35-60 mm' },
          billing_components: [
            { process: 'calibration', quantity: 1, rate: 180, amount: 180 },
            { process: 'repair', quantity: 1, rate: 350, amount: 350, hsn_sac: '998347', description: 'Servicing' },
          ],
          total: 530,
        }],
        sub_total: 530,
        cgst: 47.7,
        sgst: 47.7,
        grand_total: 625.4,
      },
    });

    expect(invoiceData.items).toHaveLength(2);
    expect(invoiceData.items[0].gauge_name).toBe('Bore Gauge\nCalibration');
    expect(invoiceData.items[1].gauge_name).toBe('  Servicing');
    expect(invoiceData.total_qty).toBe(1);
  });

  it('applies a legacy percentage discount only to calibration when repair is present', () => {
    const invoiceData = transformInvoiceToInvoiceData({
      ...baseInvoice,
      invoice_details: {
        ...baseInvoice.invoice_details,
        discount: 434.9,
        sub_total: 4349,
        billing_items: [
          {
            gauge_id: 'height-gauge',
            inward_id: 'inward-height',
            master_gauge_id: 'height-master',
            master_gauge_name: '2 D Height Gauge',
            identification_number: '-',
            inward_gauge_lab_id: 'height-lab',
            specifications: { specification: '0-1000 mm' },
            billing_components: [
              { process: 'calibration', quantity: 1, rate: 559, amount: 559 },
              { process: 'repair', quantity: 1, rate: 1250, amount: 1250 },
            ],
            total: 1809,
          },
          {
            gauge_id: 'angle-gauge',
            inward_id: 'inward-angle',
            master_gauge_id: 'angle-master',
            master_gauge_name: 'Angle Plate',
            identification_number: '-',
            inward_gauge_lab_id: 'angle-lab',
            specifications: { specification: '200 mm' },
            billing_components: [{ process: 'calibration', quantity: 1, rate: 970, amount: 970 }],
            total: 970,
          },
          {
            gauge_id: 'bench-gauge',
            inward_id: 'inward-bench',
            master_gauge_id: 'bench-master',
            master_gauge_name: 'Bench Center',
            identification_number: '-',
            inward_gauge_lab_id: 'bench-lab',
            specifications: { specification: '100-150-350' },
            billing_components: [{ process: 'calibration', quantity: 1, rate: 1220, amount: 1220 }],
            total: 1220,
          },
          {
            gauge_id: 'bore-gauge',
            inward_id: 'inward-bore',
            master_gauge_id: 'bore-master',
            master_gauge_name: 'Bore Gauge',
            identification_number: '-',
            inward_gauge_lab_id: 'bore-lab',
            specifications: { specification: '160-250 mm' },
            billing_components: [{ process: 'calibration', quantity: 1, rate: 350, amount: 350 }],
            total: 350,
          },
        ],
      },
    });

    expect(invoiceData.discount_percentage).toBe(10);
    expect(invoiceData.discount_amount).toBe(309.9);
    expect(invoiceData.taxable_amount).toBe(4039.1);
    expect(invoiceData.items.find((item) => item.service_description === 'Repair / Servicing')?.amount).toBe(1250);
  });
});
