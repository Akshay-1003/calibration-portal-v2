import React, { useEffect, useMemo, useRef } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Input } from "../../ui/input";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { useQuery } from "@tanstack/react-query";
import { fetchTaperThreadReadingsRaw } from "../../../services/apiServices";
import type { TaperThreadReadingsApiResponse } from "../../../store/taperThreadReadingsStore";
import {
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type {
  TaperThreadObservationRow,
  TaperThreadObservations,
} from "../observationSchemas";

type Specifications = {
  pitch_dial?: {
    specified_limit_max?: number | string;
    specified_limit_min?: number | string;
  };
  max_step?: {
    specified_limit_max?: number | string;
    specified_limit_min?: number | string;
  };
  basic_step?: {
    specified_limit_max?: number | string;
    specified_limit_min?: number | string;
  };
  min_step?: {
    specified_limit_max?: number | string;
    specified_limit_min?: number | string;
  };
  total_length?: {
    specified_limit_max?: number | string;
    specified_limit_min?: number | string;
  };
  standard_specification_id?: string;
  standard_specification?: string;
};

export interface TaperThreadPlugRingGaugeCalibrationProps {
  onCancel: () => void;
  isReadOnly?: boolean;
  observations: TaperThreadObservations;
  specifications: Specifications;
  master_gauge_id?: string;
}

const PARAMETER_CONFIG = [
  { key: "pitch_dial", label: "PITCH DIAL", hasReadings: true },
  { key: "max_step", label: "MAX STEP", hasReadings: false },
  { key: "basic_step", label: "BASIC STEP", hasReadings: false },
  { key: "min_step", label: "MIN STEP", hasReadings: false },
  { key: "total_length", label: "TOTAL LENGTH", hasReadings: false },
] as const;

type ParameterKey = (typeof PARAMETER_CONFIG)[number]["key"];

const PITCH_DIAL_INDEX = PARAMETER_CONFIG.findIndex(
  (param) => param.key === "pitch_dial",
);
const PARAMETER_INDEX_BY_KEY = PARAMETER_CONFIG.reduce(
  (acc, param, index) => {
    acc[param.key] = index;
    return acc;
  },
  {} as Record<ParameterKey, number>,
);

const normalizeParameterLabel = (value?: string | null): string =>
  (value || "").toLowerCase().replace(/\s+/g, "").replace(/_/g, "");

const hasValue = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "number" && Number.isNaN(value)) return false;
  if (typeof value === "string" && value.trim().toLowerCase() === "nan") {
    return false;
  }
  return true;
};

const getRowRecord = (
  row: TaperThreadObservationRow | undefined,
): Record<string, unknown> | undefined =>
  row ? (row as unknown as Record<string, unknown>) : undefined;

const toNumericInputValue = (value: unknown): number | string => {
  if (!hasValue(value)) return "";
  return typeof value === "number" || typeof value === "string"
    ? value
    : String(value);
};

const parseActualSizeInputValue = (value: string): number | string => {
  if (value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const normalizeReadings = (
  readings: Array<number | string | null | undefined>,
  hasReadings: boolean,
): Array<number | string> => {
  if (!hasReadings) {
    return readings.filter(
      (value) => value !== undefined && value !== null,
    ) as Array<number | string>;
  }

  const normalized = readings.map((value) =>
    value === undefined || value === null ? "" : value,
  );
  while (normalized.length < 3) {
    normalized.push("");
  }
  return normalized.slice(0, 3);
};

const resolveSpecifiedLimit = (row?: Record<string, unknown>) => {
  if (!row) return undefined;
  const specifiedLimit = row.specifiedLimit as
    | { min?: number | string | null; max?: number | string | null }
    | undefined;
  const snakeSpecifiedLimit = (
    row as {
      specified_limit?: {
        min?: number | string | null;
        max?: number | string | null;
      };
    }
  ).specified_limit;
  return {
    max:
      specifiedLimit?.max ??
      snakeSpecifiedLimit?.max ??
      (row as { specified_limit_max?: number | string }).specified_limit_max ??
      undefined,
    min:
      specifiedLimit?.min ??
      snakeSpecifiedLimit?.min ??
      (row as { specified_limit_min?: number | string }).specified_limit_min ??
      undefined,
  };
};

const resolveReadings = (
  row: Record<string, unknown> | undefined,
  hasReadings: boolean,
): Array<number | string> => {
  if (!row) {
    return normalizeReadings([], hasReadings);
  }

  const readingsValue = row.readings;
  if (Array.isArray(readingsValue)) {
    return normalizeReadings(readingsValue, hasReadings);
  }

  const legacyReadings = [
    (row as { reading_1?: number | string }).reading_1,
    (row as { reading_2?: number | string }).reading_2,
    (row as { reading_3?: number | string }).reading_3,
  ];

  const hasLegacy = legacyReadings.some(
    (value) => value !== undefined && value !== null && value !== "",
  );
  if (hasLegacy) {
    return normalizeReadings(legacyReadings, hasReadings);
  }

  return normalizeReadings([], hasReadings);
};

const resolveActualSize = (
  row?: Record<string, unknown>,
): number | string | undefined => {
  if (!row) return undefined;
  const snakeActualSize = (row as { actual_size?: number | string | null })
    .actual_size;
  const actualSize = row.actualSize as number | string | null | undefined;

  if (hasValue(snakeActualSize)) return snakeActualSize as number | string;
  if (hasValue(actualSize)) return actualSize as number | string;
  return undefined;
};

const isBackendShapeRow = (row: unknown): boolean => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return false;
  const record = row as Record<string, unknown>;
  return (
    "actualSize" in record ||
    "specified_limit" in record ||
    "specified_limit_max" in record ||
    "specified_limit_min" in record
  );
};

const getBackendRowsHydrationKey = (
  rows: TaperThreadObservationRow[] | undefined,
): string => {
  if (!Array.isArray(rows)) return "";

  return JSON.stringify(
    rows.map((row) => {
      const record = getRowRecord(row);
      return {
        parameter: row?.parameter,
        actual_size: record?.actual_size,
        actualSize: record?.actualSize,
        specified_limit: record?.specified_limit,
        specified_limit_max: record?.specified_limit_max,
        specified_limit_min: record?.specified_limit_min,
        readings: row?.readings,
      };
    }),
  );
};

const normalizeRows = (
  observations?: TaperThreadObservations,
): TaperThreadObservationRow[] => {
  const source = observations?.parameters;
  const sourceRows = Array.isArray(source) ? source : [];
  const sourceRecord =
    !Array.isArray(source) && source
      ? (source as Record<string, Record<string, unknown>>)
      : undefined;

  return PARAMETER_CONFIG.map((config, index) => {
    const byLabel = sourceRows.find(
      (row) =>
        normalizeParameterLabel(row.parameter) ===
        normalizeParameterLabel(config.label),
    );
    const byIndex = sourceRows[index];
    const legacyRow = sourceRecord ? sourceRecord[config.key] : undefined;
    const row = (byLabel || byIndex || legacyRow) as
      | Record<string, unknown>
      | undefined;

    return {
      parameter: (row?.parameter as string) || config.label,
      specifiedLimit: resolveSpecifiedLimit(row),
      readings: resolveReadings(row, config.hasReadings),
      actual_size: resolveActualSize(row),
    };
  });
};

/**
 * Taper Thread Plug Ring Gauge Calibration Component
 * Features:
 * - Observations table with multiple parameters (PITCH DIAL, MAX STEP, BASIC STEP, MIN STEP, TOTAL LENGTH)
 * - PITCH DIAL has: SPECIFIED LIMIT MAX, SPECIFIED LIMIT MIN, READING 1-3, ACTUAL SIZE
 * - Other parameters have: SPECIFIED LIMIT MAX/MIN (merged, single value)
 * - Type A readings section
 */
export const TaperThreadPlugRingGaugeCalibration: React.FC<
  TaperThreadPlugRingGaugeCalibrationProps
> = ({ observations, specifications, isReadOnly = false }) => {
  const { register, setValue, control, getValues } = useFormContext();
  const lastPopulatedSpecRef = useRef<string | null>(null);
  const actualSizeEditingRef = useRef(false);
  const initializedKeyRef = useRef<string | null>(null);
  const backendRowsHydrationKeyRef = useRef<string | null>(null);

  const { replace } = useFieldArray({
    control,
    name: "observations.parameters",
  });

  const rows = useWatch({
    control,
    name: "observations.parameters",
    defaultValue: [],
  }) as TaperThreadObservationRow[];

  const normalizedRows = useMemo(
    () => normalizeRows(observations),
    [observations],
  );
  const rowsNeedNormalization = useMemo(
    () => Array.isArray(rows) && rows.some(isBackendShapeRow),
    [rows],
  );

  const selectedSpecificationId = useWatch({
    control,
    name: "specifications.standard_specification_id",
  }) as string | undefined;

  const selectedSpecification = useWatch({
    control,
    name: "specifications.standard_specification",
  }) as string | undefined;

  const specFromProps = specifications as Specifications | undefined;
  const selectedSpecKey =
    selectedSpecificationId ||
    selectedSpecification ||
    specFromProps?.standard_specification_id ||
    specFromProps?.standard_specification;

  const { data: specificationList = [] } = useQuery({
    queryKey: ["taper-thread-readings-raw"],
    queryFn: fetchTaperThreadReadingsRaw,
    staleTime: 5 * 60 * 1000,
  });

  const selectedSpecData = useMemo(() => {
    if (!selectedSpecKey || !specificationList.length) return null;
    return (
      specificationList.find(
        (spec: TaperThreadReadingsApiResponse) =>
          spec.id === selectedSpecKey ||
          spec.id === selectedSpecificationId ||
          spec.standard_specification === selectedSpecKey ||
          spec.standard_specification === selectedSpecification,
      ) || null
    );
  }, [
    selectedSpecKey,
    selectedSpecificationId,
    selectedSpecification,
    specificationList,
  ]);

  const parseValue = (value: unknown): number | undefined => {
    if (value === null || value === undefined) return undefined;
    if (
      typeof value === "string" &&
      (value.toLowerCase() === "nan" || value.trim() === "")
    ) {
      return undefined;
    }
    const parsed =
      typeof value === "number" ? value : parseFloat(String(value));
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  useEffect(() => {
    const hydrateKey = JSON.stringify(normalizedRows);
    const hasFormRows = Array.isArray(rows) && rows.length > 0;
    const incomingRowsChanged = initializedKeyRef.current !== hydrateKey;
    const shouldNormalizeCurrentRows =
      !incomingRowsChanged && rowsNeedNormalization;

    if (!incomingRowsChanged && hasFormRows && !shouldNormalizeCurrentRows) {
      return;
    }

    replace(
      shouldNormalizeCurrentRows
        ? normalizeRows({ parameters: rows } as TaperThreadObservations)
        : normalizedRows,
    );
    initializedKeyRef.current = hydrateKey;
  }, [normalizedRows, replace, rows, rowsNeedNormalization]);

  useEffect(() => {
    if (!rowsNeedNormalization) return;

    const hydrationKey = getBackendRowsHydrationKey(rows);
    if (!hydrationKey || backendRowsHydrationKeyRef.current === hydrationKey) {
      return;
    }

    const normalizedCurrentRows = normalizeRows({
      parameters: rows,
    } as TaperThreadObservations);

    normalizedCurrentRows.forEach((row, index) => {
      if (hasValue(row.actual_size)) {
        setValue(
          `observations.parameters.${index}.actual_size`,
          row.actual_size,
          {
            shouldDirty: false,
            shouldValidate: false,
          },
        );
      }

      if (hasValue(row.specifiedLimit?.max)) {
        setValue(
          `observations.parameters.${index}.specifiedLimit.max`,
          row.specifiedLimit?.max,
          {
            shouldDirty: false,
            shouldValidate: false,
          },
        );
      }

      if (hasValue(row.specifiedLimit?.min)) {
        setValue(
          `observations.parameters.${index}.specifiedLimit.min`,
          row.specifiedLimit?.min,
          {
            shouldDirty: false,
            shouldValidate: false,
          },
        );
      }
    });

    backendRowsHydrationKeyRef.current = hydrationKey;
  }, [rows, rowsNeedNormalization, setValue]);

  // Watch reading values only for PITCH DIAL
  const pitchDialR1 = useWatch({
    control,
    name: `observations.parameters.${PITCH_DIAL_INDEX}.readings.0`,
  });
  const pitchDialR2 = useWatch({
    control,
    name: `observations.parameters.${PITCH_DIAL_INDEX}.readings.1`,
  });
  const pitchDialR3 = useWatch({
    control,
    name: `observations.parameters.${PITCH_DIAL_INDEX}.readings.2`,
  });

  // Compute actual size for PITCH DIAL only
  const pitchDialActualSize = useMemo(() => {
    return calculateMeanFromReadings(
      [pitchDialR1, pitchDialR2, pitchDialR3],
      4,
    );
  }, [pitchDialR1, pitchDialR2, pitchDialR3]);

  // Initialize form values from observations prop
  useEffect(() => {
    if (observations?.standard_specification_id) {
      setValue(
        "observations.standard_specification_id",
        observations.standard_specification_id,
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
    }

    if (observations?.standard_specification) {
      setValue(
        "observations.standard_specification",
        observations.standard_specification,
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
    }
  }, [observations, setValue]);

  // Update actual size when PITCH DIAL readings change
  useEffect(() => {
    if (actualSizeEditingRef.current) return;
    if (pitchDialActualSize !== null && pitchDialActualSize !== undefined) {
      setValue(
        `observations.parameters.${PITCH_DIAL_INDEX}.actual_size`,
        pitchDialActualSize,
      );
    } else if (
      getValues(`observations.parameters.${PITCH_DIAL_INDEX}.actual_size`) !==
      ""
    ) {
      setValue(`observations.parameters.${PITCH_DIAL_INDEX}.actual_size`, "");
    }
  }, [pitchDialActualSize, setValue, getValues]);

  // Populate specs from selected standard specification (read-only view)
  useEffect(() => {
    if (!selectedSpecData) return;

    const specValue = selectedSpecData.standard_specification;
    const currentObsSpecId = getValues(
      "observations.standard_specification_id",
    ) as string | undefined;
    const currentObsSpec = getValues("observations.standard_specification") as
      | TaperThreadReadingsApiResponse
      | { id?: string }
      | string
      | undefined;
    const currentObsSpecObjId =
      currentObsSpec && typeof currentObsSpec === "object"
        ? (currentObsSpec as { id?: string }).id
        : undefined;

    if (currentObsSpecId !== selectedSpecData.id) {
      setValue("observations.standard_specification_id", selectedSpecData.id, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    if (currentObsSpecObjId !== selectedSpecData.id) {
      setValue("observations.standard_specification", selectedSpecData, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    if (lastPopulatedSpecRef.current === specValue) return;

    const currentSpecs = getValues("specifications");
    const currentSpecInForm = currentSpecs?.standard_specification;
    const currentSpecIdInForm = currentSpecs?.standard_specification_id;
    const currentObsRows = getValues("observations.parameters") as
      | TaperThreadObservationRow[]
      | undefined;

    const hasSpecValues =
      currentSpecs?.pitch_dial?.specified_limit_max !== undefined &&
      currentSpecs?.pitch_dial?.specified_limit_max !== null;
    const hasObservationLimits = Array.isArray(currentObsRows)
      ? currentObsRows.some(
          (row) =>
            row?.specifiedLimit?.max !== undefined ||
            row?.specifiedLimit?.min !== undefined,
        )
      : false;

    const isSameSpec =
      currentSpecInForm === selectedSpecification ||
      currentSpecInForm === specValue ||
      currentSpecIdInForm === selectedSpecificationId ||
      currentSpecIdInForm === selectedSpecData.id ||
      currentSpecInForm === selectedSpecData.id;

    if (isSameSpec && hasSpecValues && hasObservationLimits) {
      lastPopulatedSpecRef.current = specValue;
      return;
    }

    const setObservationLimit = (
      key: ParameterKey,
      limitKey: "max" | "min",
      value: number | null | undefined,
    ) => {
      if (value === undefined) return;
      const index = PARAMETER_INDEX_BY_KEY[key];
      setValue(
        `observations.parameters.${index}.specifiedLimit.${limitKey}`,
        value,
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
    };

    const pitchDialMax = parseValue(selectedSpecData.pitch_dial?.max_diameter);
    const pitchDialMin = parseValue(selectedSpecData.pitch_dial?.min_diameter);
    if (pitchDialMax !== undefined) {
      setValue("specifications.pitch_dial.specified_limit_max", pitchDialMax, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setObservationLimit("pitch_dial", "max", pitchDialMax);
    }
    if (pitchDialMin !== undefined) {
      setValue("specifications.pitch_dial.specified_limit_min", pitchDialMin, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setObservationLimit("pitch_dial", "min", pitchDialMin);
    }

    const maxStepValue = parseValue(selectedSpecData.max_step);
    if (maxStepValue !== undefined) {
      setValue("specifications.max_step.specified_limit_max", maxStepValue, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setObservationLimit("max_step", "max", maxStepValue);
      setObservationLimit("max_step", "min", null);
    }

    const basicStepValue = parseValue(selectedSpecData.basic_step);
    if (basicStepValue !== undefined) {
      setValue(
        "specifications.basic_step.specified_limit_max",
        basicStepValue,
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
      setObservationLimit("basic_step", "max", basicStepValue);
      setObservationLimit("basic_step", "min", null);
    }

    const minStepValue = parseValue(selectedSpecData.min_step);
    if (minStepValue !== undefined) {
      setValue("specifications.min_step.specified_limit_max", minStepValue, {
        shouldDirty: false,
        shouldValidate: false,
      });
      setObservationLimit("min_step", "max", minStepValue);
      setObservationLimit("min_step", "min", null);
    }

    const totalLengthValue = parseValue(selectedSpecData.total_length);
    if (totalLengthValue !== undefined) {
      setValue(
        "specifications.total_length.specified_limit_max",
        totalLengthValue,
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );
      setObservationLimit("total_length", "max", totalLengthValue);
      setObservationLimit("total_length", "min", null);
    }

    lastPopulatedSpecRef.current = specValue;
  }, [
    selectedSpecData,
    selectedSpecification,
    selectedSpecificationId,
    getValues,
    setValue,
  ]);

  // Get specification limits for a parameter
  const getObservationLimit = (
    key: ParameterKey,
    limitKey: "max" | "min",
  ): string | null => {
    const index = PARAMETER_INDEX_BY_KEY[key];
    const value = rows?.[index]?.specifiedLimit?.[limitKey];
    if (value !== undefined && value !== null && value !== "")
      return String(value);
    return null;
  };

  const getSpecLimitMax = (key: ParameterKey): string => {
    const spec = specifications?.[key];
    const max = spec?.specified_limit_max;
    if (max !== undefined && max !== null && max !== "") return String(max);

    if (selectedSpecData) {
      switch (key) {
        case "pitch_dial":
          return (
            parseValue(selectedSpecData.pitch_dial?.max_diameter)?.toString() ??
            getObservationLimit(key, "max") ??
            "---"
          );
        case "max_step":
          return (
            parseValue(selectedSpecData.max_step)?.toString() ??
            getObservationLimit(key, "max") ??
            "---"
          );
        case "basic_step":
          return (
            parseValue(selectedSpecData.basic_step)?.toString() ??
            getObservationLimit(key, "max") ??
            "---"
          );
        case "min_step":
          return (
            parseValue(selectedSpecData.min_step)?.toString() ??
            getObservationLimit(key, "max") ??
            "---"
          );
        case "total_length":
          return (
            parseValue(selectedSpecData.total_length)?.toString() ??
            getObservationLimit(key, "max") ??
            "---"
          );
        default:
          return "---";
      }
    }

    return getObservationLimit(key, "max") ?? "---";
  };

  const getSpecLimitMin = (key: ParameterKey): string => {
    const spec = specifications?.[key];
    const min = spec?.specified_limit_min;
    if (min !== undefined && min !== null && min !== "") return String(min);

    if (selectedSpecData && key === "pitch_dial") {
      return (
        parseValue(selectedSpecData.pitch_dial?.min_diameter)?.toString() ??
        getObservationLimit(key, "min") ??
        "---"
      );
    }

    return getObservationLimit(key, "min") ?? "---";
  };

  return (
    <>
      <div className="space-y-6">
        {/* Observations Table */}
        <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
          <div className="bg-slate-100 text-gray-800 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide">
              Observations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700 text-white border-b border-gray-600">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r">
                    PARAMETER (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r">
                    SPECIFIED LIMIT MAX (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r">
                    SPECIFIED LIMIT MIN (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r bg-yellow-50 text-gray-900">
                    READING 1 (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r bg-yellow-50 text-gray-900">
                    READING 2 (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider border-r bg-yellow-50 text-gray-900">
                    READING 3 (MM)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider bg-yellow-50 text-gray-900">
                    ACTUAL SIZE
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {PARAMETER_CONFIG.map((param, index) => {
                  const isPitchDial = param.key === "pitch_dial";
                  const label = rows?.[index]?.parameter || param.label;

                  return (
                    <tr
                      key={param.key}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-2 py-2 font-medium text-gray-900 border-r">
                        {label}
                      </td>

                      {/* Specified Limit Columns - Merged for single-value fields, separate for PITCH DIAL */}
                      {isPitchDial ? (
                        <>
                          <td className="text-center text-gray-700 border-r">
                            {getSpecLimitMax(param.key)}
                          </td>
                          <td className="text-center text-gray-700 border-r">
                            {getSpecLimitMin(param.key)}
                          </td>
                          {/* Reading columns - Only for PITCH DIAL */}
                          <td className=" px-2 py-2 border-r bg-yellow-50">
                            <Input
                              type="number"
                              step="0.0001"
                              disabled={isReadOnly}
                              {...register(
                                `observations.parameters.${index}.readings.0`,
                                {
                                  valueAsNumber: true,
                                },
                              )}
                              placeholder="0.0000"
                              className="w-full text-center"
                            />
                          </td>
                          <td className="px-2 py-2 border-r bg-yellow-50">
                            <Input
                              type="number"
                              step="0.0001"
                              disabled={isReadOnly}
                              {...register(
                                `observations.parameters.${index}.readings.1`,
                                {
                                  valueAsNumber: true,
                                },
                              )}
                              placeholder="0.0000"
                              className="w-full text-center"
                            />
                          </td>
                          <td className="px-2 py-2 border-r bg-yellow-50">
                            <Input
                              type="number"
                              step="0.0001"
                              disabled={isReadOnly}
                              {...register(
                                `observations.parameters.${index}.readings.2`,
                                {
                                  valueAsNumber: true,
                                },
                              )}
                              placeholder="0.0000"
                              className="w-full text-center"
                            />
                          </td>
                          <td className="px-2 py-2 bg-yellow-50">
                            <Input
                              type="number"
                              step="0.0001"
                              disabled={isReadOnly}
                              placeholder="0.0000"
                              className="w-full text-center"
                              {...register(
                                `observations.parameters.${index}.actual_size`,
                                {
                                  valueAsNumber: true,
                                  onBlur: (event) => {
                                    actualSizeEditingRef.current = false;
                                    if (isReadOnly) return;

                                    const meanValue = parseNumber(
                                      event.target.value,
                                    );
                                    if (meanValue === null) return;

                                    const hasAnyReading = [
                                      pitchDialR1,
                                      pitchDialR2,
                                      pitchDialR3,
                                    ].some(
                                      (value) => parseNumber(value) !== null,
                                    );

                                    if (hasAnyReading) return;

                                    const [r1, r2, r3] =
                                      generateReadingsFromMean(meanValue, {
                                        decimals: 4,
                                        deltas: [0.001, 0.002],
                                      });

                                    setValue(
                                      `observations.parameters.${PITCH_DIAL_INDEX}.readings.0`,
                                      r1,
                                      { shouldDirty: true },
                                    );
                                    setValue(
                                      `observations.parameters.${PITCH_DIAL_INDEX}.readings.1`,
                                      r2,
                                      { shouldDirty: true },
                                    );
                                    setValue(
                                      `observations.parameters.${PITCH_DIAL_INDEX}.readings.2`,
                                      r3,
                                      { shouldDirty: true },
                                    );
                                  },
                                  onChange: () => {
                                    actualSizeEditingRef.current = true;
                                  },
                                },
                              )}
                              onFocus={() => {
                                actualSizeEditingRef.current = true;
                              }}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            colSpan={2}
                            className="  px-2 py-2 text-center text-gray-700 border-r"
                          >
                            {getSpecLimitMax(param.key)}
                          </td>
                          {/* Empty cells for reading columns - not applicable for other parameters */}
                          <td className="px-2 py-2 border-r bg-gray-50"></td>
                          <td className="px-2 py-2 border-r bg-gray-50"></td>
                          <td className="px-2 py-2 border-r bg-gray-50"></td>
                          <td className="px-2 py-2 bg-yellow-50">
                            <Controller
                              control={control}
                              name={`observations.parameters.${index}.actual_size`}
                              render={({ field }) => {
                                const fallbackValue = resolveActualSize(
                                  getRowRecord(rows?.[index]),
                                );
                                return (
                                  <Input
                                    ref={field.ref}
                                    type="number"
                                    step="0.0001"
                                    disabled={isReadOnly}
                                    placeholder="0.0000"
                                    className="w-full text-center"
                                    value={toNumericInputValue(
                                      hasValue(field.value)
                                        ? field.value
                                        : fallbackValue,
                                    )}
                                    onBlur={field.onBlur}
                                    onChange={(event) => {
                                      field.onChange(
                                        parseActualSizeInputValue(
                                          event.target.value,
                                        ),
                                      );
                                    }}
                                  />
                                );
                              }}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Type A Reading Section */}
        <TypeAReadingSection observations={observations} />
      </div>
    </>
  );
};

TaperThreadPlugRingGaugeCalibration.displayName =
  "TaperThreadPlugRingGaugeCalibration";
