const NUMERIC_STRING_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

const normalizeNumericString = (value: string, maxDecimals: number): string | number => {
  const trimmed = value.trim();

  if (!NUMERIC_STRING_PATTERN.test(trimmed)) {
    return value;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  const decimalPart = trimmed.split(".")[1];
  if (!decimalPart) {
    return parsed;
  }

  const precision = Math.min(decimalPart.length, maxDecimals);
  return Number(parsed.toFixed(precision));
};

const normalizeValue = (value: unknown, maxDecimals: number): unknown => {
  if (typeof value === "string") {
    return normalizeNumericString(value, maxDecimals);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item, maxDecimals));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      normalizeValue(nested, maxDecimals),
    ]);
    return Object.fromEntries(entries);
  }

  return value;
};

export const normalizeObservationNumbers = <T>(value: T, maxDecimals = 4): T => {
  return normalizeValue(value, maxDecimals) as T;
};

