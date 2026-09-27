import type { InvoiceData } from '../components/billing/InvoiceTemplate';
import type { InvoicePdfDisplayRow } from './invoicePdfRows';
import { getInvoicePdfServiceTotals } from './invoicePdfRows';
import { roundCurrency } from './invoiceCalculations';

export interface InvoiceSummaryRow {
  key: string;
  label: string;
  value: number;
  emphasis?: 'subtotal' | 'total';
}

const hasAmount = (value?: number | null) => Math.abs(Number(value || 0)) >= 0.005;

const formatPercentage = (value: number) => {
  const rounded = roundCurrency(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

export const buildInvoiceSummaryRows = (
  data: InvoiceData,
  displayRows: InvoicePdfDisplayRow[],
): InvoiceSummaryRow[] => {
  const serviceTotals = getInvoicePdfServiceTotals(displayRows);
  const calibrationAmount = roundCurrency(serviceTotals.calibration);
  const repairAmount = roundCurrency(serviceTotals.repair);
  const discountAmount = roundCurrency(
    Math.min(Math.abs(Number(data.discount_amount || 0)), Math.max(0, calibrationAmount)),
  );
  const hasDiscount = hasAmount(discountAmount);
  const netCalibrationAmount = roundCurrency(Math.max(0, calibrationAmount - discountAmount));
  const taxableAmount = roundCurrency(data.taxable_amount);
  const rows: InvoiceSummaryRow[] = [];

  if (hasAmount(calibrationAmount) || hasDiscount) {
    rows.push({
      key: 'calibration-gross',
      label: 'Calibration Charges',
      value: calibrationAmount,
    });
  }

  if (hasDiscount) {
    const discountPercent = Number(data.discount_percentage || 0);
    rows.push({
      key: 'calibration-discount',
      label: `Less: Calibration Discount${discountPercent > 0 ? ` (${formatPercentage(discountPercent)}%)` : ''}`,
      value: -discountAmount,
    });
    rows.push({
      key: 'calibration-net',
      label: 'Net Calibration Charges',
      value: netCalibrationAmount,
      emphasis: 'subtotal',
    });
  }

  if (hasAmount(repairAmount)) {
    rows.push({
      key: 'repair-servicing',
      label: 'Add: Repair / Servicing Charges',
      value: repairAmount,
    });
  }

  rows.push({
    key: 'taxable-value',
    label: 'Taxable Value',
    value: taxableAmount,
    emphasis: 'subtotal',
  });

  if (hasAmount(data.packing_forwarding_charges)) {
    rows.push({
      key: 'packing-forwarding',
      label: 'Add: P&F Charges',
      value: roundCurrency(data.packing_forwarding_charges),
    });
  }

  if (hasAmount(data.courier_transport_charges)) {
    rows.push({
      key: 'courier-transport',
      label: 'Add: Courier/Transport Charges',
      value: roundCurrency(data.courier_transport_charges),
    });
  }

  if (hasAmount(data.cgst_amount)) {
    rows.push({
      key: 'cgst',
      label: `CGST (${formatPercentage(data.cgst_percentage)}%)`,
      value: roundCurrency(data.cgst_amount),
    });
  }

  if (hasAmount(data.sgst_amount)) {
    rows.push({
      key: 'sgst',
      label: `SGST (${formatPercentage(data.sgst_percentage)}%)`,
      value: roundCurrency(data.sgst_amount),
    });
  }

  rows.push({
    key: 'grand-total',
    label: 'Grand Total',
    value: roundCurrency(data.grand_total),
    emphasis: 'total',
  });
  rows.push({
    key: 'rounded-total',
    label: 'Round Off Total',
    value: roundCurrency(data.rounded_off_total),
    emphasis: 'total',
  });

  return rows;
};
