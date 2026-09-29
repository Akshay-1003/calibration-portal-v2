import { describe, expect, it } from 'vitest';
import { paginateInvoiceItems } from '../components/billing/InvoicePDFDocument';
import type { InvoiceItem } from '../components/billing/InvoiceTemplate';

const makeInvoiceItem = (srNo: number): InvoiceItem => ({
  sr_no: srNo,
  gauge_name: srNo <= 2 ? 'Bore Gauge' : srNo <= 5 ? 'Caliper' : 'External Micrometer',
  identification_number: `AI-${String(srNo).padStart(3, '0')}`,
  dc_no: '-',
  specification: '(0.00 - 200.00) mm; LC: 0.0100 mm',
  hsn: '998346',
  repair_new: 0,
  calibration_charge: 150,
  qty: 1,
  amount: 150,
  instrument_quantity: 1,
  row_kind: 'instrument',
});

const makeInvoiceItems = (count: number) =>
  Array.from({ length: count }, (_, index) => makeInvoiceItem(index + 1));

describe('invoice PDF pagination', () => {
  it('keeps remaining rows on the final logical page so the summary can use available space', () => {
    const pages = paginateInvoiceItems(makeInvoiceItems(53), {
      summaryRowCount: 7,
      amountInWords: 'NINE THOUSAND FIVE HUNDRED SEVENTY NINE RUPEES ONLY',
    });

    expect(pages).toHaveLength(2);
    expect(pages.flatMap((page) => page.items)).toHaveLength(53);
    expect(pages.map((page) => page.items.length)).toEqual([26, 27]);
  });

  it('uses the maximum safe middle-page row count when 35 rows would overflow', () => {
    const pages = paginateInvoiceItems(makeInvoiceItems(75), {
      summaryRowCount: 7,
      amountInWords: 'NINE THOUSAND FIVE HUNDRED SEVENTY NINE RUPEES ONLY',
    });

    expect(pages.flatMap((page) => page.items)).toHaveLength(75);
    expect(pages.map((page) => page.items.length)).toEqual([26, 31, 18]);
  });

  it('keeps shorter invoices on a single page', () => {
    expect(paginateInvoiceItems(makeInvoiceItems(10))).toHaveLength(1);
  });
});
