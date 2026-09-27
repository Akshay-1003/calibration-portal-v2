import { formatSpecificationForPrint } from './specificationPrintFormatter';
import { clampPercentage, roundCurrency } from './invoiceCalculations';

export const DEFAULT_QUOTATION_HSN_SAC = '998346';
export const DEFAULT_QUOTATION_CGST_RATE = 9;
export const DEFAULT_QUOTATION_SGST_RATE = 9;
export const DEFAULT_QUOTATION_IGST_RATE = 18;

export type QuotationGstType = 'none' | 'cgst_sgst' | 'igst';

export const normalizeQuotationQuantity = (value?: number | null): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  return 1;
};

export const calculateQuotationLineSubtotal = (
  basePrice: number,
  quantity?: number | null,
): number => {
  return roundCurrency(
    (Number.isFinite(basePrice) ? basePrice : 0) *
      normalizeQuotationQuantity(quantity),
  );
};

export const calculateQuotationDiscountAmount = (
  basePrice: number,
  quantity: number | null | undefined,
  discountType: 'percentage' | 'flat' | null,
  discountValue: number,
): number => {
  const lineSubtotal = calculateQuotationLineSubtotal(basePrice, quantity);
  const normalizedDiscount = roundCurrency(Math.max(0, discountValue || 0));

  if (!discountType || normalizedDiscount <= 0 || lineSubtotal <= 0) {
    return 0;
  }

  if (discountType === 'percentage') {
    return roundCurrency(
      (lineSubtotal * clampPercentage(normalizedDiscount)) / 100,
    );
  }

  return roundCurrency(Math.min(normalizedDiscount, lineSubtotal));
};

export const calculateQuotationFinalPrice = (
  basePrice: number,
  quantity: number | null | undefined,
  discountType: 'percentage' | 'flat' | null,
  discountValue: number,
): number => {
  const lineSubtotal = calculateQuotationLineSubtotal(basePrice, quantity);
  const discountAmount = calculateQuotationDiscountAmount(
    basePrice,
    quantity,
    discountType,
    discountValue,
  );

  return roundCurrency(Math.max(0, lineSubtotal - discountAmount));
};

export const normalizeQuotationGstType = (
  value?: string | null,
): QuotationGstType => {
  const normalized = (value || '').trim().toLowerCase();

  if (
    normalized === 'cgst_sgst' ||
    normalized === 'cgst + sgst' ||
    normalized === 'cgst/sgst'
  ) {
    return 'cgst_sgst';
  }

  if (normalized === 'igst') {
    return 'igst';
  }

  return 'none';
};

export const getQuotationGstTypeLabel = (
  value?: QuotationGstType | string | null,
) => {
  const normalized = normalizeQuotationGstType(value);
  if (normalized === 'cgst_sgst') return 'CGST + SGST';
  if (normalized === 'igst') return 'IGST';
  return 'No GST';
};

export const mapQuotationGstTypeToApi = (
  value?: QuotationGstType | string | null,
) => {
  const normalized = normalizeQuotationGstType(value);
  if (normalized === 'cgst_sgst') return 'CGST + SGST';
  if (normalized === 'igst') return 'IGST';
  return 'No GST';
};

export const calculateQuotationTotals = (input: {
  subtotal: number;
  totalDiscount: number;
  gstType?: QuotationGstType | string | null;
  cgstRate?: number | null;
  sgstRate?: number | null;
  igstRate?: number | null;
}) => {
  const subtotal = roundCurrency(input.subtotal);
  const totalDiscount = roundCurrency(Math.max(0, input.totalDiscount));
  const taxableAmount = roundCurrency(Math.max(0, subtotal - totalDiscount));
  const gstType = normalizeQuotationGstType(input.gstType);

  const cgstRate =
    gstType === 'cgst_sgst'
      ? clampPercentage(input.cgstRate ?? DEFAULT_QUOTATION_CGST_RATE)
      : 0;
  const sgstRate =
    gstType === 'cgst_sgst'
      ? clampPercentage(input.sgstRate ?? DEFAULT_QUOTATION_SGST_RATE)
      : 0;
  const igstRate =
    gstType === 'igst'
      ? clampPercentage(input.igstRate ?? DEFAULT_QUOTATION_IGST_RATE)
      : 0;

  const cgstAmount = roundCurrency((taxableAmount * cgstRate) / 100);
  const sgstAmount = roundCurrency((taxableAmount * sgstRate) / 100);
  const igstAmount = roundCurrency((taxableAmount * igstRate) / 100);
  const grandTotal = roundCurrency(
    taxableAmount + cgstAmount + sgstAmount + igstAmount,
  );

  return {
    subtotal,
    totalDiscount,
    taxableAmount,
    gstType,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff: 0,
    grandTotal,
  };
};

export const formatQuotationPdfMoney = (value?: number) =>
  `${Number(value || 0).toFixed(2)}`;

export const resolveQuotationRangeSize = ({
  rangeSize,
  specifications,
  unit,
}: {
  rangeSize?: string | null;
  specifications?: unknown;
  unit?: string | null;
}) => {
  const formattedSpecification = formatSpecificationForPrint(
    specifications,
    unit?.trim() || 'mm',
  ).trim();

  if (formattedSpecification && formattedSpecification !== '-') {
    return formattedSpecification;
  }

  const trimmedRange = rangeSize?.trim();
  if (!trimmedRange) {
    return '-';
  }

  const unitLabel = unit?.trim();
  if (
    unitLabel &&
    !trimmedRange.toLowerCase().includes(unitLabel.toLowerCase())
  ) {
    return `${trimmedRange} ${unitLabel}`;
  }

  return trimmedRange;
};
