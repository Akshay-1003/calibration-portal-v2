import type { SurfacePlateReferenceStandardRecord } from "../types/surfacePlateReferenceStandards";

const normalizeGaugeTypeKey = (value?: string | null) =>
  (value || "").trim().toLowerCase();

const DEFAULT_REMARKS_BY_GAUGE_TYPE: Record<string, string[]> = {
  "surface plate": [
    "Permissible Flatness Tolerance as per IS 7327:2003",
  ],
};

const toRemarkArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const dedupeRemarks = (remarks: string[]) => {
  const seen = new Set<string>();

  return remarks.filter((remark) => {
    const key = remark.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const buildSurfacePlateReferenceRemark = (
  referenceStandard?: SurfacePlateReferenceStandardRecord | null,
): string | null => {
  if (!referenceStandard) {
    return null;
  }

  const { tolerances } = referenceStandard;

  return [
    `Grade 0: ${tolerances.grade_0}`,
    `Grade 1: ${tolerances.grade_1}`,
    `Grade 2: ${tolerances.grade_2}`,
    `Grade 3: ${tolerances.grade_3}`,
  ].join(", ");
};

export const getDefaultRemarksForGaugeType = (
  gaugeType?: string | null,
  options?: {
    surfacePlateReferenceStandard?: SurfacePlateReferenceStandardRecord | null;
  },
): string[] => {
  const key = normalizeGaugeTypeKey(gaugeType);
  const defaults = [...(DEFAULT_REMARKS_BY_GAUGE_TYPE[key] ?? [])];

  if (key === "surface plate") {
    const dynamicReferenceRemark = buildSurfacePlateReferenceRemark(
      options?.surfacePlateReferenceStandard,
    );

    if (dynamicReferenceRemark) {
      defaults.push(dynamicReferenceRemark);
    }
  }

  return defaults;
};

export const mergeRemarksWithGaugeDefaults = (
  gaugeType?: string | null,
  remarks?: unknown,
  options?: {
    surfacePlateReferenceStandard?: SurfacePlateReferenceStandardRecord | null;
  },
): string[] => {
  const defaults = getDefaultRemarksForGaugeType(gaugeType, options);
  const existing = toRemarkArray(remarks);
  return dedupeRemarks([...defaults, ...existing]);
};
