import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INVOICE_PDF_COLUMNS,
  getInvoicePdfTableColumns,
  getInvoicePdfTotalRowCells,
  normalizeInvoicePdfColumns,
} from '../utils/invoicePdfColumns';
import { buildInvoicePdfDisplayRows } from '../utils/invoicePdfRows';

describe('invoice PDF service columns', () => {
  const repairItem = [{ repair_new: 1200 }];

  it('uses separate calibration and repair rate columns by default', () => {
    const columns = normalizeInvoicePdfColumns(DEFAULT_INVOICE_PDF_COLUMNS, repairItem);

    expect(columns.rate).toBe(false);
    expect(columns.calibration_charge).toBe(true);
    expect(columns.repair_new).toBe(true);
  });

  it('hides an empty repair column and reallocates its width to gauge and identification', () => {
    const columns = getInvoicePdfTableColumns(DEFAULT_INVOICE_PDF_COLUMNS, [{ repair_new: 0 }]);
    const byKey = Object.fromEntries(columns.map((column) => [column.key, Number.parseFloat(column.width)]));

    expect(columns.some((column) => column.key === 'repair_new')).toBe(false);
    expect(byKey.gauge_name).toBeGreaterThan(11);
    expect(byKey.identification_number).toBeGreaterThan(20);
  });

  it('honors an explicit PDF column choice', () => {
    const columns = normalizeInvoicePdfColumns(
      { ...DEFAULT_INVOICE_PDF_COLUMNS, repair_new: false },
      repairItem,
      { autoEnableServiceColumns: false },
    );

    expect(columns.repair_new).toBe(false);
  });

  it('renders one instrument parent with independent service children', () => {
    const rows = buildInvoicePdfDisplayRows([
      {
        sr_no: 1,
        gauge_name: '2 D Height Gauge',
        identification_number: '-',
        dc_no: '-',
        specification: '0-1000 mm',
        hsn: '998346',
        repair_new: 0,
        calibration_charge: 559,
        qty: 1,
        amount: 503.1,
        discount_amount: 55.9,
        service_description: 'Calibration',
        instrument_quantity: 1,
        group_key: 'inward|gauge',
      },
      {
        sr_no: 2,
        gauge_name: '2 D Height Gauge',
        identification_number: '-',
        dc_no: '-',
        specification: '0-1000 mm',
        hsn: '998347',
        repair_new: 1250,
        calibration_charge: 0,
        qty: 1,
        amount: 1250,
        service_description: 'Repair / Servicing',
        instrument_quantity: 1,
        group_key: 'inward|gauge',
      },
    ]);

    expect(rows.map((row) => row.row_kind)).toEqual(['instrument']);
    expect(rows[0].gauge_name).toBe('2 D Height Gauge');
    expect(rows[0].hsn).toBe('998346 | 998347');
    expect(rows[0].calibration_charge).toBe(559);
    expect(rows[0].repair_new).toBe(1250);
    expect(rows[0].amount).toBe(1809);
  });

  it('does not append an empty HSN placeholder when only one HSN exists', () => {
    const rows = buildInvoicePdfDisplayRows([
      {
        sr_no: 1,
        gauge_name: 'Angle Plate',
        identification_number: '-',
        dc_no: '-',
        specification: '200 mm',
        hsn: '998346',
        repair_new: 0,
        calibration_charge: 970,
        qty: 1,
        amount: 970,
        service_description: 'Calibration',
        instrument_quantity: 1,
        group_key: 'angle-plate',
      },
    ]);

    expect(rows[0].hsn).toBe('998346');
  });

  it('builds a dynamic total row aligned to service and amount columns', () => {
    const columns = getInvoicePdfTableColumns(DEFAULT_INVOICE_PDF_COLUMNS, repairItem);
    const cells = getInvoicePdfTotalRowCells(columns, {
      calibration_charge: '3099.00',
      repair_new: '1250.00',
      qty: 4,
      amount: '4349.00',
    });
    const byColumn = new Map(cells.map((cell) => [cell.columnKey, cell]));

    expect(cells[0]).toMatchObject({ key: 'total-label', value: 'Total', isLabel: true });
    expect(byColumn.get('calibration_charge')?.value).toBe('3099.00');
    expect(byColumn.get('repair_new')?.value).toBe('1250.00');
    expect(byColumn.get('qty')?.value).toBe('4');
    expect(byColumn.get('amount')?.value).toBe('4349.00');
    expect(byColumn.get('rate')?.value).toBeUndefined();
  });
});
