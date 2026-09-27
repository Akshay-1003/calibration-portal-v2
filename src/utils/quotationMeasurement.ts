export type QuotationDimensionMode =
  | 'range_only'
  | 'basic_size_only'
  | 'range_and_basic_size';

const BASIC_SIZE_ONLY_KEYWORDS = [
  'master piece',
  'slip / feeler gauge',
];

const RANGE_AND_BASIC_SIZE_KEYWORDS = [
  'thread plug gauge',
  'thread ring gauge',
  'plain taper plug gauge',
  'plain taper ring gauge',
  'taper thread plug gauge',
  'taper thread ring gauge',
  'master ring',
  'id master',
  'id master gauge',
  'spline gauge',
];

const normalizeGaugeType = (value?: string | null) =>
  (value || '').trim().toLowerCase();

export const inferQuotationDimensionMode = (
  gaugeType?: string | null,
  gaugeName?: string | null
): QuotationDimensionMode => {
  const normalizedType = normalizeGaugeType(gaugeType);
  const normalizedName = normalizeGaugeType(gaugeName);
  const lookupValue = normalizedType || normalizedName;

  if (BASIC_SIZE_ONLY_KEYWORDS.some((keyword) => lookupValue.includes(keyword))) {
    return 'basic_size_only';
  }

  if (RANGE_AND_BASIC_SIZE_KEYWORDS.some((keyword) => lookupValue.includes(keyword))) {
    return 'range_and_basic_size';
  }

  return 'range_only';
};

export interface QuotationMeasurementFields {
  dimension_mode: QuotationDimensionMode;
  range_from?: number;
  range_to?: number;
  basic_size?: string;
}

const formatNumericValue = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '';
  return Number.isInteger(value) ? String(value) : String(value);
};

export const buildQuotationRangeLabel = ({
  dimension_mode,
  range_from,
  range_to,
  basic_size,
}: QuotationMeasurementFields): string => {
  const formattedFrom = formatNumericValue(range_from);
  const formattedTo = formatNumericValue(range_to);
  const formattedBasicSize = basic_size?.trim() || '';

  if (dimension_mode === 'basic_size_only') {
    return formattedBasicSize;
  }

  if (dimension_mode === 'range_and_basic_size') {
    const rangePart =
      formattedFrom && formattedTo ? `${formattedFrom} - ${formattedTo}` : '';

    if (rangePart && formattedBasicSize) {
      return `${rangePart} | ${formattedBasicSize}`;
    }

    return rangePart || formattedBasicSize;
  }

  return formattedFrom && formattedTo ? `${formattedFrom} - ${formattedTo}` : '';
};
