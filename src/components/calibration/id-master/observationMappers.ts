import type { IDMasterObservations, IDMasterRow } from "../observationSchemas";

export const DEFAULT_ID_MASTER_READING_COUNT = 3;

type LegacyIDMasterRow = Record<string, unknown> & {
  basic_size?: string | number;
  readings?: Array<string | number>;
  actual_readings?: Array<string | number>;
  values?: Array<string | number>;
  reading_1?: string | number;
  reading_2?: string | number;
  reading_3?: string | number;
  mean?: string | number;
  average?: string | number;
  parameter?: string;
  observation_label?: string;
};

const normalizeParameter = (
  value: unknown,
  fallback: "A" | "B"
): "A" | "B" => {
  return value === "A" || value === "B" ? value : fallback;
};

export const normalizeIDMasterReadingsArray = (
  source: LegacyIDMasterRow,
  readingCount = DEFAULT_ID_MASTER_READING_COUNT
): Array<string | number> => {
  const rawValues = Array.isArray(source.readings)
    ? source.readings
    : Array.isArray(source.actual_readings)
      ? source.actual_readings
      : Array.isArray(source.values)
        ? source.values
        : [source.reading_1, source.reading_2, source.reading_3];

  const normalized = rawValues
    .slice(0, readingCount)
    .map((value) => (value === null || value === undefined ? "" : value));

  while (normalized.length < readingCount) {
    normalized.push("");
  }

  return normalized;
};

export const normalizeIDMasterRow = (
  source: unknown,
  fallbackBasicSize: string | number,
  observationLabel: "A" | "B",
  readingCount = DEFAULT_ID_MASTER_READING_COUNT
): IDMasterRow => {
  if (!source || typeof source !== "object") {
    return {
      basic_size: fallbackBasicSize,
      readings: Array.from({ length: readingCount }, () => ""),
      mean: "",
      parameter: observationLabel,
    };
  }

  const row = source as LegacyIDMasterRow;

  return {
    basic_size: row.basic_size ?? fallbackBasicSize,
    readings: normalizeIDMasterReadingsArray(row, readingCount),
    mean: row.mean ?? row.average ?? "",
    parameter: normalizeParameter(
      row.parameter ?? row.observation_label,
      observationLabel
    ),
  };
};

export const normalizeIDMasterRowsFromObservations = (
  source: IDMasterObservations | undefined,
  specs: Array<string | number>,
  readingCount = DEFAULT_ID_MASTER_READING_COUNT
): IDMasterRow[] => {
  const readings = Array.isArray(source?.readings) ? source.readings : [];

  if (readings.length > 0) {
    return readings.map((row, index) => {
      const fallbackBasicSize = specs[Math.floor(index / 2)] ?? specs[index] ?? "";
      return normalizeIDMasterRow(
        row,
        fallbackBasicSize,
        index % 2 === 0 ? "A" : "B",
        readingCount
      );
    });
  }

  const legacyA = source?.observation_a;
  const legacyB = source?.observation_b;
  if (legacyA || legacyB) {
    const baseSize = specs[0] ?? "";
    return [
      normalizeIDMasterRow(legacyA, baseSize, "A", readingCount),
      normalizeIDMasterRow(legacyB, baseSize, "B", readingCount),
    ];
  }

  if (specs.length > 0) {
    return specs.flatMap((basicSize) => [
      normalizeIDMasterRow(null, basicSize, "A", readingCount),
      normalizeIDMasterRow(null, basicSize, "B", readingCount),
    ]);
  }

  return [
    normalizeIDMasterRow(null, "", "A", readingCount),
    normalizeIDMasterRow(null, "", "B", readingCount),
  ];
};

export const mapIDMasterRowsToPayload = (
  rows: unknown,
  readingCount = DEFAULT_ID_MASTER_READING_COUNT
): IDMasterRow[] => {
  if (!Array.isArray(rows)) return [];

  return rows.map((row, index) =>
    normalizeIDMasterRow(
      row,
      "",
      index % 2 === 0 ? "A" : "B",
      readingCount
    )
  );
};
