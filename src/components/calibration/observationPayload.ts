import { normalizeObservationNumbers } from "../../utils/observationNumberNormalizer";
import { mapIDMasterRowsToPayload } from "./id-master/observationMappers";
import { GO_NO_GO_TABLE_KEYS, type GoNoGoTableKey } from "./observationSchemas";

export type ObservationPayload = Record<string, unknown>;

export type ObservationType =
  | "od_limit"
  | "od_master"
  | "fixed_range"
  | "dial"
  | "master_ring"
  | "plain_thread_ring_gauge"
  | "plain_thread_gauge"
  | "taper_thread_gauge"
  | "external_micrometer"
  | "comparator_stand"
  | "bench_center"
  | "v_block"
  | "caliper"
  | string;

const OBS_TYPE_BY_GAUGE_TYPE: Record<string, ObservationType> = {
  "od limit gauge": "od_limit",
  "id limit gauge": "od_limit",
  "master piece": "od_master",
  "slip / feeler gauge": "od_master",
  "id master": "od_master",
  "id master gauge": "od_master",
  "fixed range gauge": "fixed_range",
  "fixed range gauge (degree, min)": "fixed_range",
  "digital dial gauge": "fixed_range",
  "height gauge": "fixed_range",
  "electronic height gauge": "fixed_range",
  caliper: "caliper",
  "vernier caliper": "caliper",
  "plunger dial": "fixed_range",
  "plunger dial std": "dial",
  "master ring": "master_ring",
  "thread plug gauge": "plain_thread_gauge",
  "thread ring gauge": "plain_thread_ring_gauge",
  "plain taper plug gauge": "plain_taper_plug_gauge",
  "plain taper ring gauge": "plain_taper_plug_gauge",
  "taper thread plug gauge": "taper_thread_gauge",
  "taper thread ring gauge": "taper_thread_gauge",
  "depth caliper": "fixed_range",
  "internal micrometer": "external_micrometer",
  "external micrometer": "external_micrometer",
  "coating thickness gauge": "external_micrometer",
  "dial snap gauge": "dial_snap",
  "comparator stand": "comparator_stand",
  "bench center": "bench_center",
  "v block": "v_block",
  "spline gauge": "spline_gauge",
  "pressure gauge": "lever_dial",
  "lever dial": "lever_dial",
  "surface plate": "surface_plate",
  "surface roughness master/tester": "surface_roughness",
  "surface roughness master/tester(portable)": "surface_roughness",
};

const normalizeGaugeTypeKey = (value?: string | null): string =>
  (value || "").toLowerCase().trim();

export const getObservationTypeForGauge = (
  gaugeType?: string | null,
): ObservationType | null => {
  const key = normalizeGaugeTypeKey(gaugeType);
  return OBS_TYPE_BY_GAUGE_TYPE[key] ?? null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasPayloadValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "string" && value.trim().toLowerCase() === "nan") {
    return false;
  }
  return true;
};

const normalizeTaperThreadParameters = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;

  return value.map((entry) => {
    if (!isRecord(entry)) return entry;

    const next = { ...entry };
    if (
      !hasPayloadValue(next.actual_size) &&
      hasPayloadValue(next.actualSize)
    ) {
      next.actual_size = next.actualSize;
    }

    delete next.actualSize;
    return next;
  });
};

const CALIPER_TABLE_KEYS = [
  "outside_measurement",
  "inside_measurement",
  "depth_measurement",
] as const;

type CaliperTableKey = (typeof CALIPER_TABLE_KEYS)[number];

const normalizeCaliperTablesToPrint = (value: unknown): CaliperTableKey[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((entry): entry is CaliperTableKey =>
    CALIPER_TABLE_KEYS.includes(entry as CaliperTableKey),
  );
};

const normalizeGoNoGoTablesToPrint = (value: unknown): GoNoGoTableKey[] => {
  if (!Array.isArray(value)) return [...GO_NO_GO_TABLE_KEYS];

  return value.filter((entry): entry is GoNoGoTableKey =>
    GO_NO_GO_TABLE_KEYS.includes(entry as GoNoGoTableKey),
  );
};

const REQUIRED_DIAL_NUMBER_KEYS = new Set([
  "actual_reading",
  "observed_error",
  "upward_actual",
  "upward_error",
  "downward_actual",
  "downward_error",
  "stylus_up_actual_reading",
  "stylus_up_observed_error",
  "stylus_down_actual_reading",
  "stylus_down_observed_error",
  "measured_dimension",
  "mean",
  "turn",
  "range",
  "value",
]);

const REQUIRED_DIAL_NUMBER_ARRAY_KEYS = new Set([
  "readings",
  "repeatability",
  "type_a_readings",
]);

const asRequiredNumber = (value: unknown): unknown => {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

const normalizeRequiredDialNumbers = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeRequiredDialNumbers);
  }
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => {
      if (REQUIRED_DIAL_NUMBER_KEYS.has(key)) {
        return [key, asRequiredNumber(nested)];
      }
      if (REQUIRED_DIAL_NUMBER_ARRAY_KEYS.has(key) && Array.isArray(nested)) {
        return [
          key,
          nested.map((item) =>
            item && typeof item === "object"
              ? normalizeRequiredDialNumbers(item)
              : asRequiredNumber(item),
          ),
        ];
      }
      return [key, normalizeRequiredDialNumbers(nested)];
    }),
  );
};

export const normalizeRequiredDialMeasurements = (
  gaugeType: string | null | undefined,
  observations: ObservationPayload,
): ObservationPayload => {
  const gaugeTypeKey = normalizeGaugeTypeKey(gaugeType);
  const obsType = getObservationTypeForGauge(gaugeType);

  if (obsType !== "dial" && obsType !== "lever_dial" && gaugeTypeKey !== "plunger dial") {
    return observations;
  }

  return normalizeRequiredDialNumbers(observations) as ObservationPayload;
};

export const buildCalibrationObservationsPayload = (options: {
  gaugeType?: string | null;
  observations?: unknown;
  specifications?: unknown;
  normalizeNumbers?: boolean;
}): ObservationPayload => {
  const {
    gaugeType,
    observations,
    specifications,
    normalizeNumbers = true,
  } = options;
  const obsType = getObservationTypeForGauge(gaugeType);
  const normalized = normalizeNumbers
    ? normalizeObservationNumbers(observations ?? {})
    : (observations ?? {});

  const base = isRecord(normalized) ? { ...normalized } : {};

  const gaugeTypeKey = normalizeGaugeTypeKey(gaugeType);
  if (obsType === "taper_thread_gauge") {
    base.parameters = normalizeTaperThreadParameters(base.parameters);
  }

  if (
    (gaugeTypeKey === "id master" || gaugeTypeKey === "id master gauge") &&
    Array.isArray(base.readings)
  ) {
    base.readings = mapIDMasterRowsToPayload(base.readings);
    delete base.observation_a;
    delete base.observation_b;
  }

  if (obsType === "caliper") {
    const selectedTables = normalizeCaliperTablesToPrint(base.tables_to_print);

    CALIPER_TABLE_KEYS.forEach((key) => {
      if (!selectedTables.includes(key)) {
        base[key] = [];
      }
    });
  }

  const isGoNoGoObservation =
    obsType === "od_limit" ||
    obsType === "plain_thread_ring_gauge" ||
    obsType === "plain_thread_gauge" ||
    gaugeTypeKey === "plain taper plug gauge" ||
    gaugeTypeKey === "plain taper ring gauge";

  if (isGoNoGoObservation) {
    const selectedTables = normalizeGoNoGoTablesToPrint(base.tables_to_print);
    base.tables_to_print = selectedTables;

    if (!selectedTables.includes("go")) {
      base.go = {};
      if (isRecord(base.remarks)) {
        base.remarks = { ...base.remarks, go: "" };
      }
      if (isRecord(base.specification_table)) {
        base.specification_table = { ...base.specification_table, go: {} };
      }
    }

    if (!selectedTables.includes("nogo")) {
      base.no_go = {};
      if (isRecord(base.remarks)) {
        base.remarks = { ...base.remarks, no_go: "" };
      }
      if (isRecord(base.specification_table)) {
        base.specification_table = { ...base.specification_table, no_go: {} };
      }
    }
  }

  if (obsType) {
    base.obs_type = obsType;
  }

  if (obsType === "surface_plate") {
    const specificationRefId = isRecord(specifications)
      ? String(specifications.surface_plate_ref_id ?? "").trim()
      : "";
    const observationRefId = String(base.surface_plate_ref_id ?? "").trim();
    const resolvedRefId = observationRefId || specificationRefId;

    if (resolvedRefId) {
      base.surface_plate_ref_id = resolvedRefId;
    }
  }

  return base;
};
