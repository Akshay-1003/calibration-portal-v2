export const INVOICE_PDF_COLUMN_KEYS = [
  'sr_no',
  'gauge_name',
  'identification_number',
  'dc_no',
  'specification',
  'hsn',
  'calibration_charge',
  'repair_new',
  'qty',
  'rate',
  'discount',
  'amount',
] as const;

export type InvoicePdfColumnKey = (typeof INVOICE_PDF_COLUMN_KEYS)[number];

export type InvoicePdfColumnVisibility = Record<InvoicePdfColumnKey, boolean>;

export interface InvoicePdfTableColumn {
  key: InvoicePdfColumnKey;
  label: string;
  width: string;
}

export interface InvoicePdfTotalRowCell {
  key: string;
  columnKey?: InvoicePdfColumnKey;
  width: string;
  value: string;
  isLabel?: boolean;
  align: 'left' | 'center' | 'right';
}

const REQUIRED_COLUMN_KEYS: InvoicePdfColumnKey[] = [
  'sr_no',
  'gauge_name',
  'identification_number',
  'specification',
  'hsn',
  'calibration_charge',
  'repair_new',
  'qty',
  'amount',
];

export const INVOICE_PDF_OPTIONAL_COLUMN_OPTIONS: Array<{
  key: InvoicePdfColumnKey;
  label: string;
}> = [
  { key: 'dc_no', label: 'DC No' },
  { key: 'hsn', label: 'HSN' },
  { key: 'repair_new', label: 'Repair / Servicing Rate (₹)' },
  { key: 'calibration_charge', label: 'Calibration Rate (₹)' },
  { key: 'rate', label: 'Rate' },
  { key: 'discount', label: 'Discount' },
];

export const DEFAULT_INVOICE_PDF_COLUMNS: InvoicePdfColumnVisibility = {
  sr_no: true,
  gauge_name: true,
  identification_number: true,
  dc_no: false,
  specification: true,
  hsn: true,
  repair_new: true,
  calibration_charge: true,
  qty: true,
  rate: false,
  discount: false,
  amount: true,
};

const COLUMN_LABELS: Record<InvoicePdfColumnKey, string> = {
  sr_no: 'S/R',
  gauge_name: 'Gauge Name',
  identification_number: 'Identification',
  dc_no: 'DC.No',
  specification: 'Specification',
  hsn: 'HSN',
  repair_new: 'Repair',
  calibration_charge: 'Calibration',
  rate: 'Rate',
  qty: 'Qty',
  discount: 'Discount',
  amount: 'Amount',
};

const BASE_COLUMN_WEIGHTS: Record<InvoicePdfColumnKey, number> = {
  sr_no: 4,
  gauge_name: 11,
  identification_number: 20,
  dc_no: 9,
  specification: 20,
  hsn: 11,
  repair_new: 7.5,
  calibration_charge: 9,
  qty: 4,
  rate: 10,
  discount: 10,
  amount: 9,
};

const hasRepairCharge = (items?: Array<{ repair_new?: number | string | null }>) =>
  Boolean(
    items?.some((item) => {
      const value = Number(item.repair_new ?? 0);
      return Number.isFinite(value) && value > 0;
    }),
  );

export const normalizeInvoicePdfColumns = (
  columns?: Partial<InvoicePdfColumnVisibility> | null,
  items?: Array<{ repair_new?: number | string | null }>,
  options?: { autoEnableServiceColumns?: boolean; preferModernServiceColumns?: boolean },
): InvoicePdfColumnVisibility => {
  const hasSavedColumns = Boolean(columns && Object.keys(columns).length > 0);
  const normalized: InvoicePdfColumnVisibility = {
    ...DEFAULT_INVOICE_PDF_COLUMNS,
    ...(columns ?? {}),
  };

  if ((options?.autoEnableServiceColumns ?? false) && hasRepairCharge(items)) {
    normalized.repair_new = true;
  }
  if (!hasSavedColumns && items?.some((item) => Number((item as { discount_amount?: number }).discount_amount || 0) > 0)) {
    normalized.discount = true;
  }

  REQUIRED_COLUMN_KEYS.forEach((key) => {
    normalized[key] = true;
  });

  return normalized;
};

export const getInvoicePdfTableColumns = (
  columns?: Partial<InvoicePdfColumnVisibility> | null,
  items?: Array<{ repair_new?: number | string | null }>,
  options?: { autoEnableServiceColumns?: boolean; preferModernServiceColumns?: boolean },
): InvoicePdfTableColumn[] => {
  const visibility = normalizeInvoicePdfColumns(columns, items, options);
  const weights = { ...BASE_COLUMN_WEIGHTS };

  if (!visibility.dc_no) {
    weights.gauge_name += BASE_COLUMN_WEIGHTS.dc_no;
  }

  if (!visibility.repair_new) {
    weights.gauge_name += BASE_COLUMN_WEIGHTS.repair_new * 0.55;
    weights.specification += BASE_COLUMN_WEIGHTS.repair_new * 0.45;
  }

  if (!visibility.hsn) {
    weights.gauge_name += BASE_COLUMN_WEIGHTS.hsn * 0.4;
    weights.specification += BASE_COLUMN_WEIGHTS.hsn * 0.6;
  }

  if (!visibility.calibration_charge) {
    weights.gauge_name += BASE_COLUMN_WEIGHTS.calibration_charge * 0.35;
    weights.specification += BASE_COLUMN_WEIGHTS.calibration_charge * 0.45;
    weights.amount += BASE_COLUMN_WEIGHTS.calibration_charge * 0.2;
  }

  const visibleKeys = INVOICE_PDF_COLUMN_KEYS.filter((key) => visibility[key]);
  const totalWeight = visibleKeys.reduce((sum, key) => sum + weights[key], 0);

  return visibleKeys.map((key) => ({
    key,
    label: COLUMN_LABELS[key],
    width: `${((weights[key] / totalWeight) * 100).toFixed(2)}%`,
  }));
};

export const getInvoicePdfTotalColumnWidths = (columns: InvoicePdfTableColumn[]) => {
  const qtyColumn = columns.find((column) => column.key === 'qty');
  const amountColumn = columns.find((column) => column.key === 'amount');
  const readWidth = (width?: string) => Number(width?.replace('%', '') || 0);
  const qtyWidth = Math.max(readWidth(qtyColumn?.width), 7.5);
  const amountWidth = readWidth(amountColumn?.width);

  return {
    labelWidth: `${Math.max(0, 100 - qtyWidth - amountWidth).toFixed(2)}%`,
    qtyWidth: `${qtyWidth.toFixed(2)}%`,
    amountWidth: `${amountWidth.toFixed(2)}%`,
  };
};

const readPercentWidth = (width?: string) => Number(width?.replace('%', '') || 0);

export const getInvoicePdfTotalRowCells = (
  columns: InvoicePdfTableColumn[],
  totals: Partial<Record<InvoicePdfColumnKey, string | number>>,
): InvoicePdfTotalRowCell[] => {
  const firstTotalIndex = columns.findIndex((column) => totals[column.key] !== undefined);

  if (firstTotalIndex < 0) {
    return [{
      key: 'total-label',
      width: '100%',
      value: 'Total',
      isLabel: true,
      align: 'right',
    }];
  }

  const cells: InvoicePdfTotalRowCell[] = [];
  const leadingWidth = columns
    .slice(0, firstTotalIndex)
    .reduce((sum, column) => sum + readPercentWidth(column.width), 0);

  if (leadingWidth > 0) {
    cells.push({
      key: 'total-label',
      width: `${leadingWidth.toFixed(2)}%`,
      value: 'Total',
      isLabel: true,
      align: 'right',
    });
  }

  columns.slice(firstTotalIndex).forEach((column) => {
    const value = totals[column.key];
    cells.push({
      key: `total-${column.key}`,
      columnKey: column.key,
      width: column.width,
      value: value === undefined || value === null ? '' : String(value),
      align:  'right',
    });
  });

  return cells;
};
