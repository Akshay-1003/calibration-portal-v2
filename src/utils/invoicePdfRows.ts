import type { InvoiceItem } from '../components/billing/InvoiceTemplate';

export type InvoicePdfDisplayRow = InvoiceItem & { row_kind: 'instrument' };

export const getInvoicePdfServiceTotals = (rows: InvoicePdfDisplayRow[]) => ({
  calibration: rows.reduce((sum, row) => sum + Number(row.calibration_charge || 0), 0),
  repair: rows.reduce((sum, row) => sum + Number(row.repair_new || 0), 0),
  quantity: rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
  amount: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
});

const normalizeHsn = (value?: string | null) => {
  const hsn = String(value || '').trim();
  return hsn && hsn !== '-' ? hsn : '';
};

const joinHsnCodes = (items: InvoiceItem[]) => {
  const hsnCodes = [
    normalizeHsn(items.find((item) => Number(item.calibration_charge || 0) > 0)?.hsn),
    normalizeHsn(items.find((item) => Number(item.repair_new || 0) > 0)?.hsn),
  ].filter(Boolean);
  const uniqueCodes = Array.from(new Set(hsnCodes));

  return uniqueCodes.length > 0 ? uniqueCodes.join(' | ') : '-';
};

/** Project persisted billing components into the approved one-row-per-instrument PDF layout. */
export const buildInvoicePdfDisplayRows = (items: InvoiceItem[]): InvoicePdfDisplayRow[] => {
  const groups = new Map<string, InvoiceItem[]>();
  items.forEach((item) => {
    const key = item.group_key || `${item.gauge_name}|${item.identification_number}|${item.specification}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  return Array.from(groups.values()).map((group, groupIndex) => {
    const first = group[0];
    const calibrationRate = group.reduce((sum, item) => sum + Number(item.calibration_charge || 0), 0);
    const repairRate = group.reduce((sum, item) => sum + Number(item.repair_new || 0), 0);
    const amount = group.reduce((sum, item) => sum + Number(item.amount || 0) + Number(item.discount_amount || 0), 0);

    return {
      ...first,
      sr_no: groupIndex + 1,
      gauge_name: first.gauge_name?.split('\n')[0] || '-',
      qty: first.instrument_quantity || 1,
      hsn: joinHsnCodes(group),
      repair_new: repairRate,
      calibration_charge: calibrationRate,
      amount,
      discount_amount: 0,
      service_description: undefined,
      row_kind: 'instrument',
    };
  });
};
