import { calculateMeanFromReadings, parseNumber } from "../../../utils/calibrationCalculations";

export type LimitGaugeStatusKey =
  | "within_specification_limit"
  | "wear_limit_reached"
  | "rejected_below_wear_limit"
  | "out_of_specification_limit"
  | "specification_missing"
  | "observation_missing";

export type LimitGaugeStatusColor = "green" | "orange" | "red" | "gray";

export type LimitGaugeStatusResult = {
  status: string;
  statusKey: LimitGaugeStatusKey;
  color: LimitGaugeStatusColor;
  isPass: boolean;
  reason: string;
};

export type LimitGaugeSpec = {
  specification_limit_min?: number | string | null;
  specification_limit_max?: number | string | null;
  wear_limit?: number | string | null;
};

export type LimitGaugeSpecifications = {
  go?: LimitGaugeSpec | null;
  no_go?: LimitGaugeSpec | null;
};

type LimitGaugeSection = "go" | "no_go";
type LimitGaugePosition = "a" | "b";

const STATUS_LABELS: Record<LimitGaugeStatusKey, string> = {
  within_specification_limit: "Within Specification Limit",
  wear_limit_reached: "Wear Limit Reached",
  rejected_below_wear_limit: "Rejected / Below Wear Limit",
  out_of_specification_limit: "Out of Specification Limit",
  specification_missing: "Specification Missing",
  observation_missing: "Observation Missing",
};

const makeStatus = (
  statusKey: LimitGaugeStatusKey,
  color: LimitGaugeStatusColor,
  isPass: boolean,
  reason: string,
): LimitGaugeStatusResult => ({
  status: STATUS_LABELS[statusKey],
  statusKey,
  color,
  isPass,
  reason,
});

const getLimit = (value: number | string | null | undefined) => {
  const parsed = parseNumber(value);
  return parsed === null ? undefined : parsed;
};

export const getGoGaugeStatus = (
  average: number | string | null | undefined,
  spec?: LimitGaugeSpec | null,
): LimitGaugeStatusResult => {
  const observed = parseNumber(average);
  if (observed === null) {
    return makeStatus(
      "observation_missing",
      "gray",
      false,
      "GO average is missing or invalid.",
    );
  }

  const minLimit = getLimit(spec?.specification_limit_min);
  const maxLimit = getLimit(spec?.specification_limit_max);
  const wearLimit = getLimit(spec?.wear_limit);

  if (minLimit === undefined || maxLimit === undefined) {
    return makeStatus(
      "specification_missing",
      "red",
      false,
      "GO specified limit min/max is missing.",
    );
  }

  if (observed >= minLimit && observed <= maxLimit) {
    return makeStatus(
      "within_specification_limit",
      "green",
      true,
      "GO average is within the specified limit range.",
    );
  }

  if (wearLimit !== undefined && observed >= wearLimit && observed < minLimit) {
    return makeStatus(
      "wear_limit_reached",
      "orange",
      false,
      "GO average is outside specification but has reached the wear limit.",
    );
  }

  if (wearLimit !== undefined && observed < wearLimit) {
    return makeStatus(
      "rejected_below_wear_limit",
      "red",
      false,
      "GO average is below the allowable wear limit.",
    );
  }

  return makeStatus(
    "out_of_specification_limit",
    "red",
    false,
    "GO average is outside the specified limit range.",
  );
};

export const getNoGoGaugeStatus = (
  average: number | string | null | undefined,
  spec?: LimitGaugeSpec | null,
): LimitGaugeStatusResult => {
  const observed = parseNumber(average);
  if (observed === null) {
    return makeStatus(
      "observation_missing",
      "gray",
      false,
      "NO GO average is missing or invalid.",
    );
  }

  const minLimit = getLimit(spec?.specification_limit_min);
  const maxLimit = getLimit(spec?.specification_limit_max);

  if (minLimit === undefined || maxLimit === undefined) {
    return makeStatus(
      "specification_missing",
      "red",
      false,
      "NO GO specified limit min/max is missing.",
    );
  }

  if (observed >= minLimit && observed <= maxLimit) {
    return makeStatus(
      "within_specification_limit",
      "green",
      true,
      "NO GO average is within the specified limit range.",
    );
  }

  return makeStatus(
    "out_of_specification_limit",
    "red",
    false,
    "NO GO average is outside the specified limit range.",
  );
};

export const getLimitGaugeStatusStyles = (
  color: LimitGaugeStatusColor,
): { input: string; inputWrapper: string } => {
  switch (color) {
    case "green":
      return {
        input: "text-green-700 font-semibold",
        inputWrapper: "bg-green-50 border-green-300",
      };
    case "orange":
      return {
        input: "text-orange-700 font-semibold",
        inputWrapper: "bg-orange-50 border-orange-300",
      };
    case "red":
      return {
        input: "text-red-600 font-semibold",
        inputWrapper: "bg-red-50 border-red-300",
      };
    default:
      return {
        input: "text-gray-600",
        inputWrapper: "bg-white border border-gray-300",
      };
  }
};

const normalizeAverage = (section: unknown): number | "" => {
  const record =
    section && typeof section === "object" && !Array.isArray(section)
      ? (section as { values?: unknown; average?: unknown })
      : {};
  const readingsMean = Array.isArray(record.values)
    ? calculateMeanFromReadings(record.values)
    : null;
  const fallbackAverage = parseNumber(record.average);

  return readingsMean ?? fallbackAverage ?? "";
};

const getSectionAverage = (
  observations: Record<string, unknown>,
  section: LimitGaugeSection,
  position: LimitGaugePosition,
) => {
  const sectionRecord = observations[section];
  if (!sectionRecord || typeof sectionRecord !== "object" || Array.isArray(sectionRecord)) {
    return "";
  }

  return normalizeAverage((sectionRecord as Record<string, unknown>)[position]);
};

const setNestedSectionValue = (
  target: Record<string, unknown>,
  section: LimitGaugeSection,
  position: LimitGaugePosition,
  average: number | "",
) => {
  const sectionRecord =
    target[section] && typeof target[section] === "object" && !Array.isArray(target[section])
      ? { ...(target[section] as Record<string, unknown>) }
      : {};
  const positionRecord =
    sectionRecord[position] &&
    typeof sectionRecord[position] === "object" &&
    !Array.isArray(sectionRecord[position])
      ? { ...(sectionRecord[position] as Record<string, unknown>) }
      : {};

  positionRecord.average = average;
  sectionRecord[position] = positionRecord;
  target[section] = sectionRecord;
};

const pickAggregateStatus = (
  first: LimitGaugeStatusResult | null,
  second: LimitGaugeStatusResult | null,
) => {
  const results = [first, second].filter(Boolean) as LimitGaugeStatusResult[];
  if (results.length === 0) return "";

  const red = results.find((result) => result.color === "red");
  if (red) return red.statusKey;

  const orange = results.find((result) => result.color === "orange");
  if (orange) return orange.statusKey;

  const gray = results.find((result) => result.color === "gray");
  if (gray) return gray.statusKey;

  return "within_specification_limit";
};

export const getAggregateLimitGaugeStatusKey = pickAggregateStatus;

export const formatLimitGaugeStatusLabel = (
  first: LimitGaugeStatusResult | null,
  second: LimitGaugeStatusResult | null,
) => {
  const firstLabel = first?.status ?? "";
  const secondLabel = second?.status ?? "";

  if (!firstLabel && !secondLabel) return "";
  if (firstLabel === secondLabel) return firstLabel;
  return `A: ${firstLabel || "N/A"}, B: ${secondLabel || "N/A"}`;
};

export const formatLimitGaugeStatusLines = (
  first: LimitGaugeStatusResult | null,
  second: LimitGaugeStatusResult | null,
) => {
  if (!first && !second) return [];

  return [
    { label: "A", result: first, text: first?.status ?? "N/A" },
    { label: "B", result: second, text: second?.status ?? "N/A" },
  ];
};

export const recalculateLimitGaugeObservations = (
  observations: unknown,
  specifications?: LimitGaugeSpecifications | null,
): {
  observations: Record<string, unknown>;
  statuses: {
    goA: LimitGaugeStatusResult | null;
    goB: LimitGaugeStatusResult | null;
    noGoA: LimitGaugeStatusResult | null;
    noGoB: LimitGaugeStatusResult | null;
  };
} => {
  const base =
    observations && typeof observations === "object" && !Array.isArray(observations)
      ? { ...(observations as Record<string, unknown>) }
      : {};

  const goAAvg = getSectionAverage(base, "go", "a");
  const goBAvg = getSectionAverage(base, "go", "b");
  const noGoAAvg = getSectionAverage(base, "no_go", "a");
  const noGoBAvg = getSectionAverage(base, "no_go", "b");

  setNestedSectionValue(base, "go", "a", goAAvg);
  setNestedSectionValue(base, "go", "b", goBAvg);
  setNestedSectionValue(base, "no_go", "a", noGoAAvg);
  setNestedSectionValue(base, "no_go", "b", noGoBAvg);

  const statuses = {
    goA: goAAvg === "" ? null : getGoGaugeStatus(goAAvg, specifications?.go),
    goB: goBAvg === "" ? null : getGoGaugeStatus(goBAvg, specifications?.go),
    noGoA: noGoAAvg === "" ? null : getNoGoGaugeStatus(noGoAAvg, specifications?.no_go),
    noGoB: noGoBAvg === "" ? null : getNoGoGaugeStatus(noGoBAvg, specifications?.no_go),
  };

  const remarks =
    base.remarks && typeof base.remarks === "object" && !Array.isArray(base.remarks)
      ? { ...(base.remarks as Record<string, unknown>) }
      : {};

  remarks.go = pickAggregateStatus(statuses.goA, statuses.goB);
  remarks.no_go = pickAggregateStatus(statuses.noGoA, statuses.noGoB);
  base.remarks = remarks;

  const goRecord =
    base.go && typeof base.go === "object" && !Array.isArray(base.go)
      ? { ...(base.go as Record<string, unknown>) }
      : {};
  const noGoRecord =
    base.no_go && typeof base.no_go === "object" && !Array.isArray(base.no_go)
      ? { ...(base.no_go as Record<string, unknown>) }
      : {};

  goRecord.remark = remarks.go;
  noGoRecord.remark = remarks.no_go;
  base.go = goRecord;
  base.no_go = noGoRecord;

  return { observations: base, statuses };
};
