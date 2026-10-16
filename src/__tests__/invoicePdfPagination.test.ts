// @vitest-environment node

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it, vi } from 'vitest';
import { InvoicePDFDocument } from '../components/billing/InvoicePDFDocument';
import type { InvoiceData, InvoiceItem } from '../components/billing/InvoiceTemplate';

const makeInvoiceItem = (srNo: number): InvoiceItem => ({
  sr_no: srNo,
  gauge_name: 'External Micrometer',
  identification_number: `MIC-${String(srNo).padStart(4, '0')}`,
  dc_no: `DC-${String(srNo).padStart(4, '0')}`,
  specification: '(0.00 - 25.00) mm; LC: 0.0010 mm',
  hsn: '998346',
  repair_new: 0,
  calibration_charge: 150,
  qty: 1,
  amount: 150,
  instrument_quantity: 1,
  row_kind: 'instrument',
});

const makeInvoice = (itemCount: number): InvoiceData => ({
  company_name: 'Metrology Services',
  office_address: 'Industrial Estate, Main Road',
  work_address: '',
  company_email: 'billing@example.com',
  invoice_number: 'INV-TEST',
  billing_date: '2026-10-16',
  outward_no: 'OUT-TEST',
  client_name: 'Customer',
  client_address: 'Customer address',
  client_gst_no: '',
  items: Array.from({ length: itemCount }, (_, index) => makeInvoiceItem(index + 1)),
  total: itemCount * 150,
  total_qty: itemCount,
  packing_forwarding_charges: 0,
  courier_transport_charges: 0,
  discount_amount: 0,
  discount_percentage: 0,
  net_amount: itemCount * 150,
  taxable_amount: itemCount * 150,
  sgst_percentage: 0,
  sgst_amount: 0,
  cgst_percentage: 0,
  cgst_amount: 0,
  grand_total: itemCount * 150,
  rounded_off_total: itemCount * 150,
  bank_name: 'Bank',
  account_number: '123456',
  ifsc: 'BANK0001',
  gstin: 'GSTIN',
  pan_no: 'PAN',
});

const getPdfPageCount = async (itemCount: number) => {
  vi.stubGlobal('fetch', () => Promise.reject(new Error('Use the embedded Yoga WASM')));
  const pdf = await renderToBuffer(
    React.createElement(InvoicePDFDocument, { data: makeInvoice(itemCount) }) as Parameters<
      typeof renderToBuffer
    >[0],
  );
  return [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
};

describe('invoice PDF pagination', () => {
  it('flows short, medium, and large invoices across content-driven pages', async () => {
    const shortInvoicePages = await getPdfPageCount(8);
    const mediumInvoicePages = await getPdfPageCount(38);
    const largeInvoicePages = await getPdfPageCount(125);

    expect(shortInvoicePages).toBe(1);
    expect(mediumInvoicePages).toBe(2);
    expect(largeInvoicePages).toBe(5);
  });
});
