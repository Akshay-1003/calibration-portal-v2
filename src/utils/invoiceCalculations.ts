const CURRENCY_PRECISION = 100;

const toFiniteNumber = (value: number | string | null | undefined): number => {
  const numericValue =
    typeof value === 'string' ? Number(value.replaceAll(',', '').trim()) : Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const roundCurrency = (value: number): number =>
  Math.round((toFiniteNumber(value) + Number.EPSILON) * CURRENCY_PRECISION) / CURRENCY_PRECISION;

export const clampPercentage = (value: number): number =>
  Math.min(100, Math.max(0, roundCurrency(value)));

export const calculateLineAmount = (
  rate: number | string | null | undefined,
  quantity: number | string | null | undefined,
): number => roundCurrency(toFiniteNumber(rate) * Math.max(0, toFiniteNumber(quantity)));

export const calculateSubtotal = (
  lineItems: Array<{ rate: number | string | null | undefined; quantity: number | string | null | undefined }>,
): number =>
  roundCurrency(
    lineItems.reduce(
      (sum, item) => sum + calculateLineAmount(item.rate, item.quantity),
      0,
    ),
  );

export const deriveDiscountPercentFromAmount = (
  subtotal: number,
  discountAmount: number,
): number => {
  const safeSubtotal = roundCurrency(subtotal);
  if (safeSubtotal <= 0) {
    return 0;
  }

  return clampPercentage((toFiniteNumber(discountAmount) / safeSubtotal) * 100);
};

export interface InvoiceTotalsFromPercentageInput {
  subtotal: number;
  discountBase?: number;
  discountPercent: number;
  packing: number;
  courier: number;
  cgstRate: number;
  sgstRate: number;
}

export interface InvoiceTotalsFromAmountInput {
  subtotal: number;
  discountAmount: number;
  packing: number;
  courier: number;
  cgstRate?: number;
  sgstRate?: number;
  cgstAmount?: number;
  sgstAmount?: number;
}

export const calculateInvoiceTotalsFromPercentage = (
  input: InvoiceTotalsFromPercentageInput,
) => {
  const subtotal = roundCurrency(input.subtotal);
  const discountPercent = clampPercentage(input.discountPercent);
  const packing = roundCurrency(input.packing);
  const courier = roundCurrency(input.courier);
  const cgstRate = clampPercentage(input.cgstRate);
  const sgstRate = clampPercentage(input.sgstRate);

  const discountBase = roundCurrency(Math.min(subtotal, Math.max(0, input.discountBase ?? subtotal)));
  const discountAmount = roundCurrency((discountBase * discountPercent) / 100);
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));
  const cgstAmount = roundCurrency((taxableAmount * cgstRate) / 100);
  const sgstAmount = roundCurrency((taxableAmount * sgstRate) / 100);
  const finalAmount = roundCurrency(
    taxableAmount + packing + courier + cgstAmount + sgstAmount,
  );

  return {
    subtotal,
    discountBase,
    discountPercent,
    discountAmount,
    taxableAmount,
    packing,
    courier,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    finalAmount,
  };
};

export const calculateInvoiceTotalsFromAmount = (
  input: InvoiceTotalsFromAmountInput,
) => {
  const subtotal = roundCurrency(input.subtotal);
  const discountAmount = roundCurrency(Math.max(0, input.discountAmount));
  const packing = roundCurrency(input.packing);
  const courier = roundCurrency(input.courier);
  const taxableAmount = roundCurrency(Math.max(0, subtotal - discountAmount));

  const derivedCgstRate =
    input.cgstAmount !== undefined
      ? taxableAmount > 0
        ? (toFiniteNumber(input.cgstAmount) / taxableAmount) * 100
        : 0
      : toFiniteNumber(input.cgstRate);
  const derivedSgstRate =
    input.sgstAmount !== undefined
      ? taxableAmount > 0
        ? (toFiniteNumber(input.sgstAmount) / taxableAmount) * 100
        : 0
      : toFiniteNumber(input.sgstRate);

  const cgstRate = clampPercentage(derivedCgstRate);
  const sgstRate = clampPercentage(derivedSgstRate);
  const cgstAmount =
    input.cgstAmount !== undefined
      ? roundCurrency(input.cgstAmount)
      : roundCurrency((taxableAmount * cgstRate) / 100);
  const sgstAmount =
    input.sgstAmount !== undefined
      ? roundCurrency(input.sgstAmount)
      : roundCurrency((taxableAmount * sgstRate) / 100);
  const finalAmount = roundCurrency(
    taxableAmount + packing + courier + cgstAmount + sgstAmount,
  );

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    packing,
    courier,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    finalAmount,
  };
};
