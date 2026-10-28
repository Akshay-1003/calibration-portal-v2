import type { InvoiceTableGaugeItem } from "../components/billing/invoiceItemTableShared";
import { normalizeRateCardDiscount } from "./rateCardDiscount";
import { getStandardSpecificationId } from "./standardSpecificationResolver";
import { RETURN_AS_IS_CODE } from "../components/billing/invoiceItemTableShared";

type RateRangeLike = {
  min?: number | string | null;
  max?: number | string | null;
};

export type InvoiceRateCardEntry = {
  price_list_item_id?: string | null;
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
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const text = String(value).trim().replace(/,/g, "");
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown) => String(value ?? "").trim().toLowerCase();
const normalizeStandard = (value: string) => normalizeText(value).replace(/\s+/g, '').replace(/×/g, 'x');

const parseTextMeasurement = (value: unknown): MeasurementSpec => {
  const text = String(value ?? "").trim();
  if (!text) return {};

  const rangeMatch = text.match(/^\(?\s*(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)\s*\)?\s*(?:[a-zµμ°]+|["″])?$/i);
  if (rangeMatch) {
    const min = toNumber(rangeMatch[1]);
    const max = toNumber(rangeMatch[2]);
    if (min !== undefined && max !== undefined) {
      return { range: { min: Math.min(min, max), max: Math.max(min, max) } };
    }
  }

  const firstNumber = text.match(/^(-?\d+(?:\.\d+)?)\s*(?:[a-zµμ°]+|["″])?$/i);
  const basicSize = firstNumber ? toNumber(firstNumber[1]) : undefined;
  return basicSize === undefined ? { standardSpecification: text } : { basicSize };
};

const extractMeasurementSpec = (
  specs: InvoiceTableGaugeItem["specifications"],
  displaySpecification?: string,
  resolvedStandardSpecification?: string,
): MeasurementSpec => {
  const textFallback = displaySpecification || "";

  if (!isRecord(specs)) {
    return parseTextMeasurement(specs || textFallback);
  }

  const standardSpecification = (
    typeof specs.standard_specification === "string"
      ? specs.standard_specification.trim()
      : typeof specs.standardSpecification === "string"
        ? specs.standardSpecification.trim()
        : undefined) || resolvedStandardSpecification;

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

  const sizes = specs.basic_size ?? specs.basicSize;
  if (Array.isArray(sizes) && sizes.length) {
    const values = sizes.map((size) => toNumber(isRecord(size) ? size.basic_size : size));
    if (values.every((size): size is number => size !== undefined)) {
      return values.length === 1
        ? { standardSpecification, basicSize: values[0] }
        : { standardSpecification, range: { min: Math.min(...values), max: Math.max(...values) } };
    }
    return { standardSpecification };
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

  const scalarRange = toNumber(range);
  if (scalarRange !== undefined) return { standardSpecification, basicSize: scalarRange };

  const go = toNumber(isRecord(specs.go) ? specs.go.basic_size : specs.go);
  const noGo = toNumber(isRecord(specs.no_go) ? specs.no_go.basic_size : specs.no_go);
  if (go !== undefined && noGo !== undefined) {
    return { standardSpecification, range: { min: Math.min(go, noGo), max: Math.max(go, noGo) } };
  }

  if (typeof specs.value === "string" || typeof specs.specification === "string") {
    return {
      ...parseTextMeasurement(specs.value ?? specs.specification),
      ...(standardSpecification ? { standardSpecification } : {}),
    };
  }

  return {
    ...parseTextMeasurement(textFallback),
    ...(standardSpecification ? { standardSpecification } : {}),
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
  const entryRange = isRecord(entry.range) ? entry.range : undefined;
  const rangeMin = toNumber(entryRange?.min);
  const rangeMax = toNumber(entryRange?.max);
  const hasRange = rangeMin !== undefined && rangeMax !== undefined && (rangeMin !== 0 || rangeMax !== 0);
  if (entryStandard && measurement.standardSpecification) {
    if (normalizeStandard(entryStandard) === normalizeStandard(measurement.standardSpecification)) return true;
  }

  // Older Rate Card forms persisted basic_size: 0 alongside real range slabs.
  if (hasRange && entryRange) return rangesContain(entryRange, measurement);
  if (entryStandard) return false;

  const entryBasicSize = toNumber(entry.basic_size);
  if (entryBasicSize !== undefined) {
    const measuredBasicSize =
      measurement.basicSize ??
      (measurement.range?.min !== undefined && measurement.range.max !== undefined && measurement.range.min === measurement.range.max
        ? measurement.range.min
        : undefined);
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
  standardSpecifications: Readonly<Record<string, string>> = {},
): InvoiceRateCardEntry | null => {
  if (hsnCode === RETURN_AS_IS_CODE) return null;
  const gaugeId = String(gaugeItem.master_gauge_id || gaugeItem.gauge_id || "").trim();
  if (!gaugeId || !rateCard?.[gaugeId]?.length) return null;

  // A saved PO assignment identifies an exact customer price-list row.
  if (gaugeItem.price_list_item_id) {
    return rateCard[gaugeId].find((entry) =>
      entry.price_list_item_id === gaugeItem.price_list_item_id && isEntryForProcess(entry, hsnCode)
    ) ?? null;
  }
  const measurement = extractMeasurementSpec(
    gaugeItem.specifications,
    gaugeItem.specification,
    standardSpecifications[getStandardSpecificationId(gaugeItem.specifications)],
  );
  return selectBestRateMatch(
    rateCard[gaugeId].filter(
      (entry) =>
        isEntryForProcess(entry, hsnCode) &&
        entryMatchesMeasurement(entry, measurement),
    ),
  );
};

export const getInvoiceRateCardPricing = (
  rateCard: InvoiceRateCardEntriesByGauge | null | undefined,
  gaugeItem: InvoiceTableGaugeItem,
  hsnCode: string,
  standardSpecifications: Readonly<Record<string, string>> = {},
) => {
  const entry = findInvoiceRateCardEntry(rateCard, gaugeItem, hsnCode, standardSpecifications);
  const listRate = toNumber(entry?.rate);
  if (listRate === undefined) return null;

  const rawDiscount = normalizeRateCardDiscount(entry?.discount);
  const discountPercentage = rawDiscount >= 0 && rawDiscount <= 100 ? rawDiscount : 0;
  const discountAmount = Math.round((listRate * discountPercentage / 100 + Number.EPSILON) * 100) / 100;
  const netRate = Math.round((listRate - discountAmount + Number.EPSILON) * 100) / 100;

  return { listRate, discountPercentage, discountAmount, netRate };
};

export const getInvoiceRateCardRate = (
  rateCard: InvoiceRateCardEntriesByGauge | null | undefined,
  gaugeItem: InvoiceTableGaugeItem,
  hsnCode: string,
): string => {
  const pricing = getInvoiceRateCardPricing(rateCard, gaugeItem, hsnCode);
  return pricing ? String(pricing.netRate) : "";
};

export const shouldAutofillInvoiceRate = (rate: string | number | null | undefined) => {
  const numericRate = toNumber(rate);
  return numericRate === undefined || numericRate <= 0;
};

export const isUnchangedLegacyRateCardListPrice = (
  currentRate: string | number | null | undefined,
  originalRate: number,
  listRate: number,
) => {
  const current = toNumber(currentRate);
  return current !== undefined &&
    Math.abs(current - originalRate) <= 0.005 &&
    Math.abs(originalRate - listRate) <= 0.005;
};
