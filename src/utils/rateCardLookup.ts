import type { InvoiceTableGaugeItem } from "../components/billing/invoiceItemTableShared";

type RateRangeLike = {
  min?: number | string | null;
  max?: number | string | null;
};

export type InvoiceRateCardEntry = {
  rate_type?: string | null;
  range?: RateRangeLike | number | string | null;
  basic_size?: number | string | null;
  standard_specification?: string | null;
  least_count?: number | string | null;
  description?: string | null;
  rate?: number | string | null;
  discount?: number | string | null;
  unit?: string | null;
};

export type InvoiceRateCardEntriesByGauge = Record<string, InvoiceRateCardEntry[]>;

type MeasurementSpec = {
  basicSize?: number;
  range?: { min: number; max: number };
  standardSpecification?: string;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || typeof value === "boolean") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const text = String(value).trim().replace(/,/g, "");
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const parseTextMeasurement = (value: unknown): MeasurementSpec => {
  const text = String(value ?? "").trim();
  if (!text) return {};

  const rangeMatch = text.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const min = toNumber(rangeMatch[1]);
    const max = toNumber(rangeMatch[2]);
    if (min !== undefined && max !== undefined) {
      return { range: { min: Math.min(min, max), max: Math.max(min, max) } };
    }
  }

  const firstNumber = text.match(/-?\d+(?:\.\d+)?/);
  const basicSize = firstNumber ? toNumber(firstNumber[0]) : undefined;
  return basicSize === undefined ? {} : { basicSize };
};

const extractMeasurementSpec = (
  specs: InvoiceTableGaugeItem["specifications"],
  displaySpecification?: string,
): MeasurementSpec => {
  const textFallback = displaySpecification || "";

  if (!isRecord(specs)) {
    return parseTextMeasurement(specs || textFallback);
  }

  const standardSpecification =
    typeof specs.standard_specification === "string"
      ? specs.standard_specification.trim()
      : typeof specs.standardSpecification === "string"
        ? specs.standardSpecification.trim()
        : undefined;

  const directBasicSize = toNumber(specs.basic_size ?? specs.basicSize);
  if (directBasicSize !== undefined) {
    return { standardSpecification, basicSize: directBasicSize };
  }

  const inputs = specs.inputs;
  if (isRecord(inputs)) {
    const inputBasicSize = toNumber(inputs.basic_size ?? inputs.basicSize);
    if (inputBasicSize !== undefined) {
      return { standardSpecification, basicSize: inputBasicSize };
    }

    if (isRecord(inputs.inputs)) {
      const nestedBasicSize = toNumber(inputs.inputs.basic_size ?? inputs.inputs.basicSize);
      if (nestedBasicSize !== undefined) {
        return { standardSpecification, basicSize: nestedBasicSize };
      }
    }
  }

  const range = specs.range;
  if (isRecord(range)) {
    const min = toNumber(range.min);
    const max = toNumber(range.max);
    if (min !== undefined && max !== undefined) {
      return {
        standardSpecification,
        range: { min: Math.min(min, max), max: Math.max(min, max) },
      };
    }
  }

  if (typeof specs.value === "string" || typeof specs.specification === "string") {
    return {
      standardSpecification,
      ...parseTextMeasurement(specs.value ?? specs.specification),
    };
  }

  return {
    standardSpecification,
    ...parseTextMeasurement(textFallback),
  };
};

const processFromHsn = (hsnCode: string) => {
  switch (hsnCode.trim()) {
    case "998347":
      return "repair";
    case "998346":
      return "calibration";
    default:
      return "other";
  }
};

const isEntryForProcess = (entry: InvoiceRateCardEntry, hsnCode: string) => {
  const process = processFromHsn(hsnCode);
  if (process === "other") return true;

  const rateType = normalizeText(entry.rate_type);
  const description = normalizeText(entry.description ?? entry.standard_specification);
  const isServiceRate =
    rateType === "service" ||
    description.includes("repair") ||
    description.includes("servic");

  return process === "repair" ? isServiceRate : !isServiceRate;
};

const rangesContain = (rateRange: RateRangeLike, measurement: MeasurementSpec) => {
  const rateMin = toNumber(rateRange.min);
  const rateMax = toNumber(rateRange.max);
  if (rateMin === undefined || rateMax === undefined) return false;

  const measuredRange = measurement.range ||
    (measurement.basicSize !== undefined
      ? { min: measurement.basicSize, max: measurement.basicSize }
      : undefined);
  if (!measuredRange) return false;

  if (measurement.basicSize !== undefined) {
    return rateMin < measurement.basicSize && measurement.basicSize <= rateMax;
  }

  return rateMin <= measuredRange.min && rateMax >= measuredRange.max;
};

const entryMatchesMeasurement = (entry: InvoiceRateCardEntry, measurement: MeasurementSpec) => {
  const entryStandard = String(entry.standard_specification ?? "").trim();
  if (entryStandard && measurement.standardSpecification) {
    return entryStandard === measurement.standardSpecification;
  }

  const entryBasicSize = toNumber(entry.basic_size);
  if (entryBasicSize !== undefined) {
    const measuredBasicSize =
      measurement.basicSize ??
      (measurement.range?.min === measurement.range?.max ? measurement.range.min : undefined);
    return measuredBasicSize !== undefined && measuredBasicSize === entryBasicSize;
  }

  if (isRecord(entry.range)) {
    return rangesContain(entry.range, measurement);
  }

  const scalarRange = toNumber(entry.range);
  if (scalarRange !== undefined) {
    return measurement.basicSize !== undefined && measurement.basicSize === scalarRange;
  }

  return ["flat", "fixed", "discounted", "discount", "default"].includes(
    normalizeText(entry.rate_type),
  );
};

const selectBestRateMatch = (entries: InvoiceRateCardEntry[]) => {
  return entries[0] ?? null;
};

export const findInvoiceRateCardEntry = (
  rateCard: InvoiceRateCardEntriesByGauge | null | undefined,
  gaugeItem: InvoiceTableGaugeItem,
  hsnCode: string,
): InvoiceRateCardEntry | null => {
  const gaugeId = String(gaugeItem.master_gauge_id || gaugeItem.gauge_id || "").trim();
  if (!gaugeId || !rateCard?.[gaugeId]?.length) return null;

  const measurement = extractMeasurementSpec(gaugeItem.specifications, gaugeItem.specification);
  return selectBestRateMatch(
    rateCard[gaugeId].filter(
      (entry) =>
        isEntryForProcess(entry, hsnCode) &&
        entryMatchesMeasurement(entry, measurement),
    ),
  );
};

export const getInvoiceRateCardRate = (
  rateCard: InvoiceRateCardEntriesByGauge | null | undefined,
  gaugeItem: InvoiceTableGaugeItem,
  hsnCode: string,
): string => {
  const entry = findInvoiceRateCardEntry(rateCard, gaugeItem, hsnCode);
  const rate = toNumber(entry?.rate);
  return rate === undefined ? "" : String(rate);
};

export const shouldAutofillInvoiceRate = (rate: string | number | null | undefined) => {
  const numericRate = toNumber(rate);
  return numericRate === undefined || numericRate <= 0;
};
