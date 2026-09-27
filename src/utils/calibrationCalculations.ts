export type ObservedErrorMode = "measured-minus-mean" | "mean-minus-measured";

export const isValidDecimalInput = (value: string): boolean =>
  /^-?\d*(\.\d*)?$/.test(value);

export const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const countFractionDigits = (value: string): number => {
  const normalized = value.trim();
  if (!normalized.includes(".")) {
    return 0;
  }

  return normalized.split(".")[1]?.length ?? 0;
};

const pow10 = (digits: number): bigint => 10n ** BigInt(Math.max(digits, 0));

const normalizeDecimalToScaledInt = (
  value: string,
  scaleDigits: number,
): bigint | null => {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const sign = normalized.startsWith("-") ? -1n : 1n;
  const unsigned = normalized.replace("-", "");
  const [wholePart, fractionalPart = ""] = unsigned.split(".");
  const paddedFraction = (fractionalPart + "0".repeat(scaleDigits)).slice(
    0,
    scaleDigits,
  );

  return sign * BigInt(`${wholePart}${paddedFraction}`);
};

const roundScaledValue = (
  numerator: bigint,
  divisor: bigint,
  decimals: number,
): number => {
  const sign = numerator < 0n ? -1 : 1;
  const absolute = numerator < 0n ? -numerator : numerator;
  const multiplier = 10n ** BigInt(Math.max(decimals, 0));
  const rounded =
    (absolute * multiplier + divisor / 2n) / divisor;

  return sign * Number(rounded) / Number(multiplier);
};

export const calculateMeanFromReadings = (
  readings: Array<number | string | null | undefined>,
  decimals?: number
): number | null => {
  if (!readings || readings.length === 0) return null;

  const nums = readings.map(parseNumber);
  if (nums.some((n) => n === null)) return null;

  const mean = (nums as number[]).reduce((a, b) => a + b, 0) / nums.length;
  return typeof decimals === "number" ? +mean.toFixed(decimals) : mean;
};

export const calculateObservedError = (
  measuredDimension: number | null | undefined,
  mean: number | null | undefined,
  options?: {
    mode?: ObservedErrorMode;
    scale?: number;
    decimals?: number;
  }
): number | null => {
  if (measuredDimension === null || measuredDimension === undefined) return null;
  if (mean === null || mean === undefined) return null;

  const mode = options?.mode ?? "measured-minus-mean";
  const scale = options?.scale ?? 1;
  const decimals = options?.decimals ?? 3;

  const raw =
    mode === "measured-minus-mean"
      ? measuredDimension - mean
      : mean - measuredDimension;

  return +(raw * scale).toFixed(decimals);
};

export const truncateWithoutRounding = (
  value: number,
  decimals = 0
): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const convertErrorMmToMicron = (
  value: number | null | undefined,
  decimals = 4
): number | null => {
  if (value === null || value === undefined) return null;
  return truncateWithoutRounding(value * 1000, decimals);
};

export const calculateObservedErrorInMicron = (
  actualMeasuredValue: number | null | undefined,
  measuredDimension: number | null | undefined,
  decimals = 0
): number | null => {
  if (actualMeasuredValue === null || actualMeasuredValue === undefined) return null;
  if (measuredDimension === null || measuredDimension === undefined) return null;

  return convertErrorMmToMicron(
    actualMeasuredValue - measuredDimension,
    decimals
  );
};

export const calculateObservedErrorInMicronAsString = (
  actualMeasuredValue: unknown,
  measuredDimension: unknown,
  decimals = 1,
): string => {
  if (
    actualMeasuredValue === null ||
    actualMeasuredValue === undefined ||
    actualMeasuredValue === "" ||
    measuredDimension === null ||
    measuredDimension === undefined ||
    measuredDimension === ""
  ) {
    return "";
  }

  const actualString = String(actualMeasuredValue).trim();
  const measuredString = String(measuredDimension).trim();

  if (!/^-?\d+(\.\d+)?$/.test(actualString) || !/^-?\d+(\.\d+)?$/.test(measuredString)) {
    return "";
  }

  const scaleDigits = Math.max(
    countFractionDigits(actualString),
    countFractionDigits(measuredString),
  );
  const actualScaled = normalizeDecimalToScaledInt(actualString, scaleDigits);
  const measuredScaled = normalizeDecimalToScaledInt(measuredString, scaleDigits);

  if (actualScaled === null || measuredScaled === null) {
    return "";
  }

  const differenceInMicron = (measuredScaled - actualScaled) * 1000n;
  const divisor = pow10(scaleDigits);

  return roundScaledValue(differenceInMicron, divisor, decimals).toFixed(decimals);
};

export const calculateDifferenceAsString = (
  left: unknown,
  right: unknown,
  decimals = 3
): string => {
  const leftNum = parseNumber(left);
  const rightNum = parseNumber(right);
  if (leftNum === null || rightNum === null) return "";
  return (leftNum - rightNum).toFixed(decimals);
};

export const generateReadingsFromMean = (
  mean: number,
  options?: { decimals?: number; deltas?: number[] }
): [string, string, string] => {
  const decimals = options?.decimals ?? 3;
  const deltas = options?.deltas ?? [0.001, 0.002];
  const delta = deltas[Math.floor(Math.random() * deltas.length)] ?? 0.001;

  const reading1 = (mean - delta).toFixed(decimals);
  const reading2 = (mean + delta).toFixed(decimals);
  const reading3 = mean.toFixed(decimals);

  return [reading1, reading2, reading3];
};
