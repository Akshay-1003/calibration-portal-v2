"use client";

import { useEffect, useRef } from "react";
import { Input, Checkbox } from "@heroui/react";
import { Trash2 } from "lucide-react";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  Controller,
  type FieldPath,
} from "react-hook-form";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { RepeatabilitySection } from "../common/RepeatabilitySection";
import {
  calculateMeanFromReadings,
  calculateObservedError,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type {
  VernierCaliperReadingRow as ReadingRow,
  VernierCaliperCalibrationForm as CalibrationForm,
} from "../observationSchemas";

/* ================================================================
   TYPES
==================================================================*/

interface Props {
  observations?: CalibrationForm["observations"] | DepthCaliperLegacyObservations;
  isReadOnly?: boolean;
  master_readings?: number[];
  specifications?: {
    from?: number | string;
    to?: number | string;
    least_count?: number | string;
    range?: {
      min?: number | string;
      max?: number | string;
    };
  };
}

type LegacyMeasurementContainer = {
  readings?: Array<Record<string, unknown>>;
  print?: boolean;
};

type LegacyAction = {
  setAs?: unknown;
};

type DepthCaliperLegacyObservations = {
  outside_measurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  outsideMeasurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  inside_measurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  insideMeasurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  depth_measurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  depthMeasurement?: Array<Record<string, unknown>> | LegacyMeasurementContainer;
  action?: LegacyAction[];
  tables_to_print?: unknown;
  repeatability?: unknown;
  type_a_readings?: unknown;
  parallelism?: Record<string, unknown>;
  parallelism_external_jaw?: unknown;
  parallelism_internal_jaw?: unknown;
  inside_jaw_width?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isLegacyMeasurementContainer = (
  value: unknown
): value is LegacyMeasurementContainer =>
  isRecord(value) && "readings" in value;

const getRowsArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isLegacyMeasurementContainer(value)) {
    return Array.isArray(value.readings) ? value.readings.filter(isRecord) : [];
  }
  return [];
};

const getLegacyPrintValue = (value: unknown): boolean | undefined => {
  if (!isLegacyMeasurementContainer(value)) return undefined;
  return typeof value.print === "boolean" ? value.print : undefined;
};

const getRowsLength = (value: unknown): number => getRowsArray(value).length;

const getMeasurementValue = (
  observations: DepthCaliperLegacyObservations,
  key: TableKey
): Array<Record<string, unknown>> | LegacyMeasurementContainer | undefined => {
  switch (key) {
    case "outside_measurement":
      return observations.outside_measurement ?? observations.outsideMeasurement;
    case "inside_measurement":
      return observations.inside_measurement ?? observations.insideMeasurement;
    case "depth_measurement":
      return observations.depth_measurement ?? observations.depthMeasurement;
    default:
      return undefined;
  }
};

function isObservationsObj(val: unknown): val is DepthCaliperLegacyObservations {
  return (
    typeof val === "object" &&
    val !== null &&
    ("outside_measurement" in (val as Record<string, unknown>) ||
      "inside_measurement" in (val as Record<string, unknown>) ||
      "depth_measurement" in (val as Record<string, unknown>) ||
      "outsideMeasurement" in (val as Record<string, unknown>) ||
      "insideMeasurement" in (val as Record<string, unknown>) ||
      "depthMeasurement" in (val as Record<string, unknown>))
  );
}

const TABLE_KEYS = ["outside_measurement", "inside_measurement", "depth_measurement"] as const;
type TableKey = (typeof TABLE_KEYS)[number];

const MEASUREMENT_KEY_MAP = {
  outside: "outside_measurement",
  inside: "inside_measurement",
  depth: "depth_measurement",
} as const;

type MeasurementType = keyof typeof MEASUREMENT_KEY_MAP;

const DEFAULT_TABLES_TO_PRINT: TableKey[] = [...TABLE_KEYS];

const normalizeTablesToPrint = (value: unknown): TableKey[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry))
      .filter((entry): entry is TableKey => TABLE_KEYS.includes(entry as TableKey));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return TABLE_KEYS.filter((key) => Boolean(record[key]));
  }

  return [];
};

const toReadingValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toReadingNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return Number.NaN;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NaN;
};

const normalizeReadings = (values: Array<unknown>): string[] => {
  const normalized = values.map(toReadingValue);
  while (normalized.length < 3) {
    normalized.push("");
  }
  return normalized.slice(0, 3);
};

const toNumberOrZero = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const resolveSetAs = (
  row: Record<string, unknown> | undefined,
  legacyAction?: unknown
): boolean => {
  const setAsValue = row?.["set_as"];
  if (setAsValue === true || setAsValue === false) return setAsValue;
  const camelSetAs = row?.["setAs"];
  if (camelSetAs === true || camelSetAs === false) return camelSetAs;
  if (typeof legacyAction === "string") return legacyAction.toUpperCase() === "SET";
  return legacyAction === true;
};

const normalizeRow = (
  row: Record<string, unknown> | undefined,
  legacyAction?: unknown
): ReadingRow => {
  const measured_dimension = row?.["measured_dimension"] ?? row?.["measuredDimension"] ?? 0;
  const readingsValue = row?.["readings"];
  const readings = Array.isArray(readingsValue)
    ? normalizeReadings(readingsValue)
    : normalizeReadings([
        row?.["reading_1"],
        row?.["reading_2"],
        row?.["reading_3"],
      ]);

  return {
    measured_dimension: toNumberOrZero(measured_dimension),
    readings,
    average: toNumberOrZero(
      row?.["average"] ?? row?.["avg_reading"] ?? row?.["avgReading"]
    ),
    observed_error: toNumberOrZero(
      row?.["observed_error"] ?? row?.["observedError"]
    ),
    set_as: resolveSetAs(row, legacyAction),
  };
};

const measurementRowPath = (
  measurementKey: TableKey,
  index: number
): FieldPath<CalibrationForm> =>
  `observations.${measurementKey}.${index}` as FieldPath<CalibrationForm>;

const readingPath = (
  measurementKey: TableKey,
  index: number,
  readingIndex: 0 | 1 | 2
): FieldPath<CalibrationForm> =>
  `observations.${measurementKey}.${index}.readings.${readingIndex}` as FieldPath<CalibrationForm>;

const averagePath = (
  measurementKey: TableKey,
  index: number
): FieldPath<CalibrationForm> =>
  `observations.${measurementKey}.${index}.average` as FieldPath<CalibrationForm>;

const observedErrorPath = (
  measurementKey: TableKey,
  index: number
): FieldPath<CalibrationForm> =>
  `observations.${measurementKey}.${index}.observed_error` as FieldPath<CalibrationForm>;

const updateObservedError = (
  measuredDimension: number | undefined,
  meanValue: number | null
): number | null => {
  return calculateObservedError(measuredDimension ?? 0, meanValue, {
    mode: "mean-minus-measured",
    scale: 1000,
    decimals: 3,
  });
};

const setAsPath = (
  measurementKey: TableKey,
  index: number
): FieldPath<CalibrationForm> =>
  `observations.${measurementKey}.${index}.set_as` as FieldPath<CalibrationForm>;

const toDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  return String(value);
};

const getSectionStateClasses = (isActive: boolean) =>
  isActive
    ? {
        cell: "",
        input: "",
      }
    : {
        cell: "opacity-45",
        input: "bg-slate-100/80",
      };

const formatDecimalDisplay = (value: unknown, decimals = 3): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  return String(value);
};

const getSpecificationBounds = (
  specifications?: Props["specifications"]
): { from?: number; to?: number; leastCount?: string } => {
  const rawFrom = specifications?.range?.min ?? specifications?.from;
  const rawTo = specifications?.range?.max ?? specifications?.to;
  const rawLeastCount = specifications?.least_count;
  const from = Number(rawFrom);
  const to = Number(rawTo);

  return {
    from: Number.isFinite(from) ? from : undefined,
    to: Number.isFinite(to) ? to : undefined,
    leastCount:
      rawLeastCount === null || rawLeastCount === undefined || rawLeastCount === ""
        ? undefined
        : String(rawLeastCount),
  };
};

/* ================================================================
   COMPONENT
==================================================================*/

export function VernierCaliperCalibration({
  observations: initialObservations,
  isReadOnly = false,
  master_readings,
  specifications,
}: Props) {
  const { control, setValue, getValues } = useFormContext<CalibrationForm>();
  const { clearErrors } = useFormContext<CalibrationForm>();
  const specificationBounds = getSpecificationBounds(specifications);
  const lastInitializedKeyRef = useRef<string | null>(null);
  const outsideFields = useFieldArray({
    control,
    name: "observations.outside_measurement",
  });
  const insideFields = useFieldArray({
    control,
    name: "observations.inside_measurement",
  });

  const depthFields = useFieldArray({
    control,
    name: "observations.depth_measurement",
  });

  const outsideRows = useWatch({
    control,
    name: "observations.outside_measurement",
    defaultValue: [],
  });

  const insideRows = useWatch({
    control,
    name: "observations.inside_measurement",
    defaultValue: [],
  });

  const depthRows = useWatch({
    control,
    name: "observations.depth_measurement",
    defaultValue: [],
  });

  // Filter readings based on range from specifications
  const filterReadingsByRange = (readings: number[]): number[] => {
    if (
      specificationBounds.from === undefined ||
      specificationBounds.to === undefined
    ) {
      return readings;
    }

    return readings.filter(
      (reading) =>
        reading >= specificationBounds.from! &&
        reading <= specificationBounds.to!
    );
  };

  useEffect(() => {
    const observationsInput = isObservationsObj(initialObservations)
      ? initialObservations
      : null;
    
    const hasObservationsData =
      Boolean(observationsInput) &&
      (getRowsLength(getMeasurementValue(observationsInput, "outside_measurement")) > 0 ||
        getRowsLength(getMeasurementValue(observationsInput, "inside_measurement")) > 0 ||
        getRowsLength(getMeasurementValue(observationsInput, "depth_measurement")) > 0);

    const nextInitializationKey = hasObservationsData && observationsInput
      ? `observations:${JSON.stringify(observationsInput)}`
      : `master:${JSON.stringify(filterReadingsByRange(master_readings ?? []))}`;

    if (lastInitializedKeyRef.current === nextInitializationKey) {
      return;
    }


    // If observations data exists, load it (EDIT MODE)
    if (hasObservationsData && observationsInput) {
      console.log('✅ Loading from observations (EDIT MODE)');
      lastInitializedKeyRef.current = nextInitializationKey;
      
      const legacyActions = Array.isArray(observationsInput.action)
        ? observationsInput.action
        : [];

      const outsideSource = getRowsArray(
        getMeasurementValue(observationsInput, "outside_measurement")
      );
      console.log('📊 Outside source data:', outsideSource);
      const insideSource = getRowsArray(
        getMeasurementValue(observationsInput, "inside_measurement")
      );
      const depthSource = getRowsArray(
        getMeasurementValue(observationsInput, "depth_measurement")
      );

      outsideFields.replace(
        outsideSource.map((row, index) =>
          normalizeRow(row, legacyActions[index]?.setAs)
        )
      );
      insideFields.replace(
        insideSource.map((row, index) =>
          normalizeRow(row, legacyActions[index]?.setAs)
        )
      );
      depthFields.replace(
        depthSource.map((row, index) =>
          normalizeRow(row, legacyActions[index]?.setAs)
        )
      );

      const tablesFromObs = normalizeTablesToPrint(observationsInput.tables_to_print);
      const tablesFromLegacy: TableKey[] = [];
      const legacyOutsidePrint = getLegacyPrintValue(
        getMeasurementValue(observationsInput, "outside_measurement")
      );
      const legacyInsidePrint = getLegacyPrintValue(
        getMeasurementValue(observationsInput, "inside_measurement")
      );
      const legacyDepthPrint = getLegacyPrintValue(
        getMeasurementValue(observationsInput, "depth_measurement")
      );

      if (legacyOutsidePrint) tablesFromLegacy.push("outside_measurement");
      if (legacyInsidePrint) tablesFromLegacy.push("inside_measurement");
      if (legacyDepthPrint) tablesFromLegacy.push("depth_measurement");

      const hasTablesToPrint = observationsInput.tables_to_print !== undefined;
      const hasLegacyPrintFlags =
        legacyOutsidePrint !== undefined ||
        legacyInsidePrint !== undefined ||
        legacyDepthPrint !== undefined;

      let tablesToPrint = tablesFromObs;
      if (!hasTablesToPrint && tablesToPrint.length === 0 && hasLegacyPrintFlags) {
        tablesToPrint = tablesFromLegacy;
      }
      if (!hasTablesToPrint && !hasLegacyPrintFlags && tablesToPrint.length === 0) {
        tablesToPrint = DEFAULT_TABLES_TO_PRINT;
      }

      setValue("observations.tables_to_print", tablesToPrint, {
        shouldValidate: false,
        shouldDirty: false,
      });

      const parallelismRecord = isRecord(observationsInput.parallelism)
        ? observationsInput.parallelism
        : {};
      const externalJaw =
        parallelismRecord["externalJaw"] ??
        observationsInput.parallelism_external_jaw;
      const internalJaw =
        parallelismRecord["internalJaw"] ??
        observationsInput.parallelism_internal_jaw;
      const insideJawWidth =
        parallelismRecord["insideJawWidth"] ??
        observationsInput.inside_jaw_width;

      if (externalJaw !== undefined) {
        setValue("observations.parallelism.externalJaw", String(externalJaw));
      }
      if (internalJaw !== undefined) {
        setValue("observations.parallelism.internalJaw", String(internalJaw));
      }
      if (insideJawWidth !== undefined) {
        setValue("observations.parallelism.insideJawWidth", String(insideJawWidth));
      }

      const repeatabilityValues = Array.isArray(observationsInput.repeatability)
        ? observationsInput.repeatability.map(toReadingNumber)
        : [];
      setValue("observations.repeatability", repeatabilityValues, {
        shouldValidate: false,
        shouldDirty: false,
      });

      const typeA = Array.isArray(observationsInput.type_a_readings)
        ? observationsInput.type_a_readings.map(toReadingNumber)
        : [];
      setValue("observations.type_a_readings", typeA, {
        shouldValidate: false,
        shouldDirty: false,
      });
      return;
    }

    // If no observations data, initialize from master_readings array (CREATE MODE)
    if (!master_readings || master_readings.length === 0) {
      lastInitializedKeyRef.current = nextInitializationKey;
      outsideFields.replace([]);
      insideFields.replace([]);
      depthFields.replace([]);
      setValue("observations.tables_to_print", DEFAULT_TABLES_TO_PRINT, { shouldValidate: false });
      return;
    }

    // Filter master_readings based on specifications range if available
    const filteredReadings = filterReadingsByRange(master_readings);

    // Create rows from filtered readings array
    const initialRows = filteredReadings.map((d: number) => ({
      measured_dimension: d,
      readings: ["", "", ""],
      average: 0,
      observed_error: 0,
      set_as: false,
    }));

    lastInitializedKeyRef.current = nextInitializationKey;

    // Update all field arrays
    outsideFields.replace(initialRows);
    insideFields.replace(initialRows);
    depthFields.replace(initialRows);

    // Set default print flags
    setValue("observations.tables_to_print", DEFAULT_TABLES_TO_PRINT, { shouldValidate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialObservations, master_readings]);


  /* --------------------------------------------------------------
     CALCULATIONS
  ---------------------------------------------------------------*/
  const calculateRow = (
    index: number,
    measurementType: MeasurementType
  ) => {
    const measurementKey = MEASUREMENT_KEY_MAP[measurementType];
    const path = measurementRowPath(measurementKey, index);
    const row = getValues(path) as ReadingRow | undefined;
    if (!row) return;

    const avg = calculateMeanFromReadings(row.readings ?? []);

    if (avg === null) {
      setValue(averagePath(measurementKey, index), 0);
      setValue(observedErrorPath(measurementKey, index), 0);
      return;
    }

    const observed = calculateObservedError(row.measured_dimension, avg, {
      mode: "mean-minus-measured",
      scale: 1000,
      decimals: 3,
    });

    setValue(averagePath(measurementKey, index), avg);
    setValue(observedErrorPath(measurementKey, index), observed ?? 0);
  };

  /* --------------------------------------------------------------
     RENDER UNIFIED MEASUREMENT TABLE
  ---------------------------------------------------------------*/
  const tablesToPrint = normalizeTablesToPrint(
    useWatch({
      control,
      name: "observations.tables_to_print",
      defaultValue: DEFAULT_TABLES_TO_PRINT,
    })
  );

  const isTableSelected = (key: TableKey): boolean => tablesToPrint.includes(key);

  const toggleTable = (key: TableKey, value: boolean) => {
    const next = new Set(tablesToPrint);
    if (value) {
      next.add(key);
    } else {
      next.delete(key);
      clearErrors(`observations.${key}` as FieldPath<CalibrationForm>);
    }
    setValue("observations.tables_to_print", Array.from(next), { shouldDirty: true });
  };

  // Get the maximum length to ensure all rows are rendered
  const maxRows = Math.max(
    outsideFields.fields.length,
    insideFields.fields.length,
    depthFields.fields.length
  );

  // Render measurement cells for a single row
  const renderMeasurementCells = (
    index: number,
    measurementType: MeasurementType,
    row: ReadingRow | undefined,
    inputBgColor: string,
    isActive: boolean
  ) => {
    const isInside = measurementType === "inside";
    const borderClass = isInside ? "border-r border-amber-300/50" : "border-r border-slate-300/50";
    const cellBgColor = isInside ? "bg-amber-50/40" : "bg-white";
    const measurementKey = MEASUREMENT_KEY_MAP[measurementType];
    const sectionStateClasses = getSectionStateClasses(isActive);
    const isSectionDisabled = isReadOnly || !isActive;

    return (
      <>
        {/* Reading 1 */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${borderClass} ${cellBgColor} ${sectionStateClasses.cell}`}>
          <Controller
            name={readingPath(measurementKey, index, 0)}
            control={control}
            defaultValue={row?.readings?.[0] ?? ""}
            rules={{
              validate: (value) => {
                if (!isActive) return true;
                if (
                  value === null ||
                  value === undefined ||
                  value === "" ||
                  value.toString().trim() === ""
                ) {
                  return `Reading 1 is required for row ${index + 1}`;
                }
                const num = Number(value);
                if (isNaN(num)) {
                  return `Reading 1 must be a valid number`;
                }
                return true;
              },
            }}
            render={({ field: controllerField, fieldState }) => (
              <div>
                <Input
                  {...controllerField}
                  type="text"
                  inputMode="decimal"
                  aria-label={`${measurementType} Reading 1`}
                  isDisabled={isSectionDisabled}
                  classNames={{
                    inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                      fieldState.error ? "border-red-400 shadow-sm" : "border-slate-200"
                    } ${inputBgColor} ${sectionStateClasses.input} hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                    input: "text-sm text-center font-medium text-slate-700",
                  }}
                  onChange={(e) => {
                    controllerField.onChange(e);
                    calculateRow(index, measurementType);
                  }}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500 mt-1 text-center">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </td>

        {/* Reading 2 */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${borderClass} ${cellBgColor} ${sectionStateClasses.cell}`}>
          <Controller
            name={readingPath(measurementKey, index, 1)}
            control={control}
            defaultValue={row?.readings?.[1] ?? ""}
            rules={{
              validate: (value) => {
                if (!isActive) return true;
                if (
                  value === null ||
                  value === undefined ||
                  value === "" ||
                  value.toString().trim() === ""
                ) {
                  return `Reading 2 is required for row ${index + 1}`;
                }
                const num = Number(value);
                if (isNaN(num)) {
                  return `Reading 2 must be a valid number`;
                }
                return true;
              },
            }}
            render={({ field: controllerField, fieldState }) => (
              <div>
                <Input
                  {...controllerField}
                  type="text"
                  inputMode="decimal"
                  aria-label={`${measurementType} Reading 2`}
                  isDisabled={isSectionDisabled}
                  classNames={{
                    inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                      fieldState.error ? "border-red-400 shadow-sm" : "border-slate-200"
                    } ${inputBgColor} ${sectionStateClasses.input} hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                    input: "text-sm text-center font-medium text-slate-700",
                  }}
                  onChange={(e) => {
                    controllerField.onChange(e);
                    calculateRow(index, measurementType);
                  }}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </td>

        {/* Reading 3 */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${borderClass} ${cellBgColor} ${sectionStateClasses.cell}`}>
          <Controller
            name={readingPath(measurementKey, index, 2)}
            control={control}
            defaultValue={row?.readings?.[2] ?? ""}
            rules={{
              validate: (value) => {
                if (!isActive) return true;
                if (
                  value === null ||
                  value === undefined ||
                  value === "" ||
                  value.toString().trim() === ""
                ) {
                  return `Reading 3 is required for row ${index + 1}`;
                }
                const num = Number(value);
                if (isNaN(num)) {
                  return `Reading 3 must be a valid number`;
                }
                return true;
              },
            }}
            render={({ field: controllerField, fieldState }) => (
              <div>
                <Input
                  {...controllerField}
                  type="text"
                  inputMode="decimal"
                  aria-label={`${measurementType} Reading 3`}
                  isDisabled={isSectionDisabled}
                  classNames={{
                    inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                      fieldState.error ? "border-red-400 shadow-sm" : "border-slate-200"
                    } ${inputBgColor} ${sectionStateClasses.input} hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                    input: "text-sm text-center font-medium text-slate-700",
                  }}
                  onChange={(e) => {
                    controllerField.onChange(e);
                    calculateRow(index, measurementType);
                  }}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </td>

        {/* Avg Reading */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${borderClass} ${cellBgColor} ${sectionStateClasses.cell}`}>
          <Controller
            name={averagePath(measurementKey, index)}
            control={control}
            defaultValue={row?.average ?? ""}
            rules={{
              validate: (value) => {
                if (value === null || value === undefined || value === "") {
                  return true;
                }
                const num = Number(value);
                if (isNaN(num)) {
                  return `Avg. reading must be a valid number`;
                }
                return true;
              },
            }}
            render={({ field: controllerField, fieldState }) => (
              <div>
                <Input
                  {...controllerField}
                  type="text"
                  inputMode="decimal"
                  aria-label={`${measurementType} Average Reading`}
                  isDisabled={isSectionDisabled}
                  value={formatDecimalDisplay(controllerField.value)}
                  classNames={{
                    inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                      fieldState.error ? "border-red-400 shadow-sm" : "border-slate-200"
                    } ${inputBgColor} ${sectionStateClasses.input} shadow-sm`,
                    input: "text-sm text-center font-medium text-slate-600",
                  }}
                  onChange={(e) => {
                    controllerField.onChange(e);
                    const meanValue = parseNumber(e.target.value);
                    if (meanValue !== null) {
                      const [r1, r2, r3] = generateReadingsFromMean(meanValue);
                      setValue(readingPath(measurementKey, index, 0), r1, {
                        shouldDirty: true,
                      });
                      setValue(readingPath(measurementKey, index, 1), r2, {
                        shouldDirty: true,
                      });
                      setValue(readingPath(measurementKey, index, 2), r3, {
                        shouldDirty: true,
                      });
                      const observed = updateObservedError(row?.measured_dimension, meanValue);
                      setValue(
                        observedErrorPath(measurementKey, index),
                        observed !== null ? observed.toFixed(3) : "0.000",
                        {
                          shouldValidate: false,
                          shouldDirty: true,
                        }
                      );
                    } else {
                      setValue(
                        observedErrorPath(measurementKey, index),
                        "0.000",
                        {
                          shouldValidate: false,
                          shouldDirty: true,
                        }
                      );
                    }
                  }}
                  onBlur={controllerField.onBlur}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-500 mt-1 text-center">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </td>

        {/* Observed Error */}
        <td className={`px-3 py-2.5 whitespace-nowrap ${borderClass} ${cellBgColor} ${sectionStateClasses.cell}`}>
          <Input
            aria-label={`${measurementType} Observed Error`}
            readOnly
            value={
              typeof row?.observed_error === "number"
                ? row.observed_error.toFixed(3)
                : formatDecimalDisplay(row?.observed_error)
            }
            classNames={{
              inputWrapper: `h-9 w-full min-w-[100px] border-1 border-slate-200 ${inputBgColor} ${sectionStateClasses.input} shadow-sm`,
              input: "text-sm text-center font-medium text-slate-600",
            }}
          />
        </td>
      </>
    );
  };

  return (
    <>
      {/* Unified Measurement Table */}
      <div className="border border-gray-200 rounded-sm overflow-hidden mb-4">
        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[80vh] overflow-y-auto">
          <table className="w-full border-collapse min-w-[1400px]">
            <thead className="sticky top-0 z-40">
              {/* Section Headers Row - On Top */}
              <tr>
                {/* Measured Dimension - Fixed Column */}
                <th rowSpan={2} className="sticky left-0 z-50 bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r-1 border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                  MEASURED DIMENSION (MM)
                </th>

                {/* OUTSIDE Section */}
                <th colSpan={5} className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-b from-slate-600 to-slate-700 border-r border-slate-500/30">
                  <div className="flex items-center justify-center gap-3">
                    <span>OUTSIDE MEASURMENT</span>
                    <Checkbox
                      isSelected={isTableSelected("outside_measurement")}
                      isDisabled={isReadOnly}
                      onValueChange={(v: boolean) => {
                        toggleTable("outside_measurement", v);
                      }}
                      classNames={{
                        label: "text-white text-xs font-semibold",
                        base: "text-white",
                      }}
                    >
                      PRINT
                    </Checkbox>
                  </div>
                </th>

                {/* INSIDE Section */}
                <th colSpan={5} className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-b from-slate-600 to-slate-700 border-r border-slate-500/30">
                  <div className="flex items-center justify-center gap-3">
                    <span>INSIDE MEASURMENT</span>
                    <Checkbox
                      isSelected={isTableSelected("inside_measurement")}
                      isDisabled={isReadOnly}
                      onValueChange={(v: boolean) => {
                        toggleTable("inside_measurement", v);
                      }}
                      classNames={{
                        label: "text-white text-xs font-semibold",
                        base: "text-white",
                      }}
                    >
                      PRINT
                    </Checkbox>
                  </div>
                </th>

                {/* DEPTH Section */}
                <th colSpan={5} className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-b from-slate-600 to-slate-700 border-r border-slate-500/30">
                  <div className="flex items-center justify-center gap-3">
                    <span>DEPTH MEASURMENT</span>
                    <Checkbox
                      isSelected={isTableSelected("depth_measurement")}
                      isDisabled={isReadOnly}
                      onValueChange={(v: boolean) => {
                        toggleTable("depth_measurement", v);
                      }}
                      classNames={{
                        label: "text-white text-xs font-semibold",
                        base: "text-white",
                      }}
                    >
                      PRINT
                    </Checkbox>
                  </div>
                </th>

                {/* Action */}
                <th rowSpan={2} className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider bg-gradient-to-b from-slate-50 to-slate-100 border-l border-slate-200">
                  ACTION
                </th>
              </tr>

              {/* Column Headers Row - Reading Headers Below Sections */}
              <tr>
                {/* OUTSIDE Columns */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 1</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 2</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 3</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">AVG. READING</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200 border-r border-slate-300/50">OBSERVED ERROR (μm)</th>

                {/* INSIDE Columns */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-amber-200/50">READING 1</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-amber-200/50">READING 2</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-amber-200/50">READING 3</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-amber-200/50">AVG. READING</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700   bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200 border-r border-slate-300/50">OBSERVED ERROR (μm)</th>

                {/* DEPTH Columns */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 1</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 2</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">READING 3</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase  bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">AVG. READING</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700   bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200 border-r border-slate-300/50">OBSERVED ERROR (μm)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {maxRows === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-sm text-slate-500 bg-slate-50/30">
                    No readings available
                  </td>
                </tr>
              ) : (
                Array.from({ length: maxRows }).map((_, index) => {
                  const outsideRow = outsideRows?.[index];
                  const insideRow = insideRows?.[index];
                  const depthRow = depthRows?.[index];
                  const measured_dimension = outsideRow?.measured_dimension ?? insideRow?.measured_dimension ?? depthRow?.measured_dimension ?? 0;

                  return (
                    <tr key={index} className=" transition-colors duration-150 border-b border-slate-100">
                      {/* Measured Dimension - Fixed Column */}
                      <td className="sticky left-0 z-30 bg-white  px-4 py-2.5 whitespace-nowrap border-r-1 border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                        <Input
                          aria-label="Measured Dimension"
                          readOnly
                          value={measured_dimension.toString()}
                          classNames={{
                            inputWrapper: "h-9 w-full min-w-[100px] border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-700",
                          }}
                        />
                      </td>

                      {/* OUTSIDE Section */}
                      {renderMeasurementCells(
                        index,
                        "outside",
                        outsideRow,
                        "bg-white",
                        isTableSelected("outside_measurement")
                      )}

                      {/* INSIDE Section */}
                      {renderMeasurementCells(
                        index,
                        "inside",
                        insideRow,
                        "bg-amber-50/40",
                        isTableSelected("inside_measurement")
                      )}

                      {/* DEPTH Section */}
                      {renderMeasurementCells(
                        index,
                        "depth",
                        depthRow,
                        "bg-white",
                        isTableSelected("depth_measurement")
                      )}

                      {/* Action Column - Common for all */}
                      <td className="px-4 py-2.5 whitespace-nowrap bg-slate-50/30 border-l border-slate-200">
                        <div className="flex gap-2 justify-center items-center">
                          <Checkbox
                            isSelected={Boolean(outsideRow?.set_as || insideRow?.set_as || depthRow?.set_as)}
                            isDisabled={isReadOnly}
                            onValueChange={(value: boolean) => {
                              setValue(setAsPath("outside_measurement", index), value, { shouldDirty: true });
                              setValue(setAsPath("inside_measurement", index), value, { shouldDirty: true });
                              setValue(setAsPath("depth_measurement", index), value, { shouldDirty: true });
                            }}
                            size="sm"
                          >
                            Set
                          </Checkbox>
                          <button
                            type="button"
                            onClick={() => {
                              // Remove row from all three measurement types
                              if (index < outsideFields.fields.length) {
                                outsideFields.remove(index);
                              }
                              if (index < insideFields.fields.length) {
                                insideFields.remove(index);
                              }
                              if (index < depthFields.fields.length) {
                                depthFields.remove(index);
                              }
                            }}
                            disabled={isReadOnly}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 border border-red-200/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm hover:shadow"
                            aria-label={`Remove row ${index + 1}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Parallelism of External JAW
          </label>
          <Controller
            name="observations.parallelism.externalJaw"
            control={control}
            defaultValue={
              toReadingValue(
                initialObservations?.parallelism?.externalJaw ??
                  initialObservations?.parallelism_external_jaw
              )
            }
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  isDisabled={isReadOnly}
                  value={toDisplayValue(field.value)}
                  classNames={{
                    inputWrapper: "h-9 border-1 border-gray-300",
                    input: "text-sm",
                  }}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                />
                <span className="text-sm text-gray-600">μm.</span>
              </div>
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Parallelism of Internal JAW
          </label>
          <Controller
            name="observations.parallelism.internalJaw"
            control={control}
            defaultValue={
              toReadingValue(
                initialObservations?.parallelism?.internalJaw ??
                  initialObservations?.parallelism_internal_jaw
              )
            }
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  isDisabled={isReadOnly}
                  value={toDisplayValue(field.value)}
                  classNames={{
                    inputWrapper: "h-9 border-1 border-gray-300",
                    input: "text-sm",
                  }}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                />
                <span className="text-sm text-gray-600">μm.</span>
              </div>
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Inside JAW Width
          </label>
          <Controller
            name="observations.parallelism.insideJawWidth"
            control={control}
            defaultValue={
              toReadingValue(
                initialObservations?.parallelism?.insideJawWidth ??
                  initialObservations?.inside_jaw_width
              )
            }
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  isDisabled={isReadOnly}
                  value={toDisplayValue(field.value)}
                  classNames={{
                    inputWrapper: "h-9 border-1 border-gray-300",
                    input: "text-sm",
                  }}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                />
                <span className="text-sm text-gray-600">mm.</span>
              </div>
            )}
          />
        </div>
      </div>

      {/* Repeatability Section */}
      <div className="mt-6">
        <RepeatabilitySection
          disabled={isReadOnly}
          observations={{
            repeatability: Array.isArray(initialObservations?.repeatability)
              ? initialObservations?.repeatability.map(toReadingNumber)
              : [],
          }}
        />
      </div>

      {/* Type A Reading Section */}
      <div className="mt-6">
        <TypeAReadingSection
          disabled={isReadOnly}
          observations={{
            type_a_readings: initialObservations?.type_a_readings
              ? Array.isArray(initialObservations.type_a_readings)
                ? initialObservations.type_a_readings.map(toReadingNumber)
                : []
              : [],
          }}
        />
      </div>
    </>
  );
}

VernierCaliperCalibration.displayName = "VernierCaliperCalibration";
export const DepthCaliperCalibration = VernierCaliperCalibration;
DepthCaliperCalibration.displayName = "DepthCaliperCalibration";
