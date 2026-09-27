"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import {
  Input,
  Checkbox,
  Button,
} from "@heroui/react";
import { Trash2, Plus, X } from "lucide-react";
import { useFieldArray, useFormContext, useWatch, Controller } from "react-hook-form";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { RepeatabilitySection } from "../common/RepeatabilitySection";
import {
  calculateMeanFromReadings,
  calculateObservedError,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type {
  ExternalMicrometerReadingRow as ReadingRow,
  ExternalMicrometerCalibrationForm as CalibrationForm,
  ExternalMicrometerObservationsObj as ObservationsObj,
} from "../observationSchemas";

/* ================================================================
   TYPES
==================================================================*/

interface Props {
  observations?: CalibrationForm["observations"];
  isReadOnly?: boolean;
  master_readings?: number[];
  specifications?: {
    from?: string | number;
    to?: string | number;
  } | null;
  isRepeatability?: boolean;
  settingMaster?: boolean;
}

function isObservationsObj(val: unknown): val is ObservationsObj {
  if (typeof val !== "object" || val === null) return false;
  const record = val as Record<string, unknown>;
  return record.readings !== undefined;
}

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeReadingRow = (
  row: Partial<ReadingRow> | Record<string, unknown>,
  legacySetAs?: boolean
): ReadingRow => ({
  measured_dimension: toFiniteNumber(row.measured_dimension),
  reading_1: toDisplay(row.reading_1),
  reading_2: toDisplay(row.reading_2),
  reading_3: toDisplay(row.reading_3),
  mean: toFiniteNumber(row.mean),
  observed_error: toFiniteNumber(row.observed_error),
  set_as: Boolean(row.set_as ?? legacySetAs ?? false),
});

const normalizeMasterSettingRows = (
  rows?: ObservationsObj["master_setting_readings"]
): ObservationsObj["master_setting_readings"] =>
  Array.isArray(rows)
    ? rows.map((row) => ({
        setting_size: String(row?.setting_size ?? ""),
        actual_setting_size: String(row?.actual_setting_size ?? ""),
      }))
    : [];

const normalizeMasterSettingValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [trimmed];
};

type LegacyMasterSettingTable = {
  setting_master_size?: Record<string, unknown>;
  actual_size?: Record<string, unknown>;
  reading_columns_count?: number;
};

const getOrderedReadingKeys = (record?: Record<string, unknown>): string[] => {
  if (!record) return [];
  return Object.keys(record).sort((a, b) => {
    const aNum = Number(a.split("_")[1] ?? 0);
    const bNum = Number(b.split("_")[1] ?? 0);
    return aNum - bNum;
  });
};

const buildMasterSettingReadingsFromLegacyArrays = (
  settingMasterSize?: unknown,
  actualSize?: unknown
): ObservationsObj["master_setting_readings"] => {
  const settingValues = normalizeMasterSettingValues(settingMasterSize);
  const actualValues = normalizeMasterSettingValues(actualSize);
  const count = Math.max(settingValues.length, actualValues.length);

  if (count === 0) return [];

  return Array.from({ length: count }, (_, index) => ({
    setting_size: settingValues[index] ?? "",
    actual_setting_size: actualValues[index] ?? "",
  }));
};

const buildMasterSettingReadingsFromTable = (
  table?: LegacyMasterSettingTable
): ObservationsObj["master_setting_readings"] => {
  if (!table) return [];
  const settingKeys = getOrderedReadingKeys(table.setting_master_size);
  const actualKeys = getOrderedReadingKeys(table.actual_size);
  const keys = settingKeys.length >= actualKeys.length ? settingKeys : actualKeys;

  return keys.map((key) => ({
    setting_size: String(table.setting_master_size?.[key] ?? ""),
    actual_setting_size: String(table.actual_size?.[key] ?? ""),
  }));
};

const stripLegacyMasterSettingFields = (
  value: Record<string, unknown>
): Record<string, unknown> => {
  const rest = { ...value };
  delete rest.master_setting_table;
  delete rest.setting_master_size;
  delete rest.actual_size;
  return rest;
};

/* ================================================================
   COMPONENT
==================================================================*/

export function ExternalMicrometerCalibration({
  observations: initialObservations,
  isReadOnly = false,
  master_readings,
  specifications,
  isRepeatability = true,
  settingMaster = false
}: Props) {
  const { control, setValue, getValues, clearErrors } = useFormContext<CalibrationForm>();

  const readingsFields = useFieldArray({
    control,
    name: "observations.readings",
  });
  const { replace: replaceReadings } = readingsFields;

  const masterSettingFields = useFieldArray({
    control,
    name: "observations.master_setting_readings",
  });

  // Use useWatch to get readings - memoized to prevent unnecessary re-renders
  const readingsRows = useWatch({
    control,
    name: "observations.readings",
    defaultValue: [],
  }) as ReadingRow[] | undefined;

  const masterSettingRows = useWatch({
    control,
    name: "observations.master_setting_readings",
    defaultValue: [],
  }) as ObservationsObj["master_setting_readings"] | undefined;

  const initializedRef = useRef(false);
  const lastObservationsRef = useRef<string | null>(null);
  const lastMasterReadingsRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  const [showMasterSettingTable, setShowMasterSettingTable] = useState(false);
  const [readingColumnsCount, setReadingColumnsCount] = useState(6);
  const calculatingRef = useRef<Set<number>>(new Set());
  const lastCalculatedValuesRef = useRef<Map<number, { avg: number; observed: number }>>(new Map());
  const actualReadingEditingRef = useRef<Record<number, boolean>>({});
  const isMutatingMasterSettingColumnsRef = useRef(false);
  const userModifiedReadingsRef = useRef(false);
  const lastAppliedReadingsSourceRef = useRef<string | null>(null);

  // Create a stable key for observations comparison
  const getObservationsKey = useCallback((obs: unknown): string => {
    if (!obs) return "null";
    if (isObservationsObj(obs)) {
      const legacyActions =
        (obs as { action?: Array<{ set_as?: boolean }> }).action ?? [];

      return JSON.stringify({
        readings: Array.isArray(obs.readings)
          ? obs.readings.map((row, index) =>
              normalizeReadingRow(row, legacyActions[index]?.set_as)
            )
          : [],
        print: (obs as { print?: boolean }).print ?? obs.tables_to_print ?? null,
        parallelism_measuring_faces: toDisplay(obs.parallelism_measuring_faces),
        flatness_anvils: toDisplay(obs.flatness_anvils),
        master_setting_readings: normalizeMasterSettingRows(obs.master_setting_readings),
        repeatability: Array.isArray(obs.repeatability) ? obs.repeatability.map(String) : [],
        type_a_readings: Array.isArray(obs.type_a_readings) ? obs.type_a_readings.map(String) : [],
      });
    }
    return "empty";
  }, []);

  const markReadingsModified = useCallback(() => {
    if (!isInitializingRef.current) {
      userModifiedReadingsRef.current = true;
    }
  }, []);

  const resetReadingsRuntimeState = useCallback(() => {
    calculatingRef.current.clear();
    lastCalculatedValuesRef.current.clear();
    actualReadingEditingRef.current = {};
  }, []);

  // Filter readings based on range from specifications
  const filterReadingsByRange = useCallback(
    (readings: number[]): number[] => {
      // Use specifications range if available, otherwise use all readings
      if (!specifications?.from || !specifications?.to) {
        return readings;
      }

      const fromNum = Number(specifications.from);
      const toNum = Number(specifications.to);

      if (isNaN(fromNum) || isNaN(toNum)) {
        return readings;
      }

      // Filter readings synchronously to ensure only filtered results are used
      const filtered = readings.filter(
        (reading) => reading >= fromNum && reading <= toNum
      );

      return filtered;
    },
    [specifications]
  );

  const getMasterReadingsKey = useCallback(
    (readings: number[] | undefined): string => {
      if (!readings || !Array.isArray(readings) || readings.length === 0) {
        return "empty";
      }
      const filtered = filterReadingsByRange(readings);
      return JSON.stringify(filtered);
    },
    [filterReadingsByRange]
  );

  const markMasterSettingColumnsMutating = useCallback(() => {
    isMutatingMasterSettingColumnsRef.current = true;
    setTimeout(() => {
      isMutatingMasterSettingColumnsRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!settingMaster && showMasterSettingTable) {
      setShowMasterSettingTable(false);
    }
  }, [settingMaster, showMasterSettingTable]);

  useEffect(() => {
    if (!settingMaster) return;
    if (isMutatingMasterSettingColumnsRef.current) return;
    const rowCount = masterSettingRows?.length ?? 0;
    if (rowCount > 0 && rowCount !== readingColumnsCount) {
      setReadingColumnsCount(rowCount);
      if (!showMasterSettingTable) {
        setShowMasterSettingTable(true);
      }
    }
  }, [masterSettingRows, readingColumnsCount, settingMaster, showMasterSettingTable]);

  /* --------------------------------------------------------------
     INITIAL LOAD
  ---------------------------------------------------------------*/
  useEffect(() => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      return;
    }

    const currentKey = getObservationsKey(initialObservations);
    const masterReadingsKey = getMasterReadingsKey(master_readings);
    const hasObservationsData = isObservationsObj(initialObservations) && (
      initialObservations.readings && initialObservations.readings.length > 0
    );
    const readingsSourceKey = hasObservationsData
      ? `observations:${currentKey}`
      : `master:${masterReadingsKey}`;

    if (
      userModifiedReadingsRef.current &&
      lastAppliedReadingsSourceRef.current === readingsSourceKey
    ) {
      return;
    }

    // Skip if already initialized with the same observations
    if (
      initializedRef.current &&
      lastAppliedReadingsSourceRef.current === readingsSourceKey &&
      lastObservationsRef.current === currentKey &&
      lastMasterReadingsRef.current === masterReadingsKey
    ) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // If we have observations data, load it directly
      if (hasObservationsData) {
        // Load readings
        if (initialObservations.readings && initialObservations.readings.length > 0) {
          const legacyActions =
            (initialObservations as { action?: Array<{ set_as?: boolean }> }).action ?? [];

          replaceReadings(
            initialObservations.readings.map((row, index) =>
              normalizeReadingRow(row, legacyActions[index]?.set_as)
            )
          );
          resetReadingsRuntimeState();
        } else {
          replaceReadings([]);
          resetReadingsRuntimeState();
        }

        // Set print flag
        if (initialObservations.print !== undefined) {
          setValue("observations.print", initialObservations.print, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        // Set additional fields
        if (initialObservations.parallelism_measuring_faces) {
          setValue(
            "observations.parallelism_measuring_faces",
            String(initialObservations.parallelism_measuring_faces),
            { shouldValidate: false, shouldDirty: false }
          );
        }
        if (initialObservations.flatness_anvils) {
          setValue(
            "observations.flatness_anvils",
            String(initialObservations.flatness_anvils),
            { shouldValidate: false, shouldDirty: false }
          );
        }
        if (initialObservations.master_setting_readings) {
          setValue(
            "observations.master_setting_readings",
            normalizeMasterSettingRows(initialObservations.master_setting_readings),
            { shouldValidate: false, shouldDirty: false }
          );
        }

        // Set repeatability and type_a_readings
        if (initialObservations.repeatability) {
          const repeatability = Array.isArray(initialObservations.repeatability)
            ? initialObservations.repeatability.map(String)
            : [];
          setValue("observations.repeatability", repeatability, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        if (initialObservations.type_a_readings) {
          const typeA = Array.isArray(initialObservations.type_a_readings)
            ? initialObservations.type_a_readings.map(String)
            : [];
          setValue("observations.type_a_readings", typeA, {
            shouldValidate: false,
            shouldDirty: false,
          });
        }

        if (settingMaster) {
          const legacyObservations = initialObservations as ObservationsObj & {
            master_setting_table?: LegacyMasterSettingTable;
            setting_master_size?: unknown;
            actual_size?: unknown;
          };

          const masterRows =
            initialObservations.master_setting_readings && initialObservations.master_setting_readings.length > 0
              ? normalizeMasterSettingRows(initialObservations.master_setting_readings)
              : legacyObservations.master_setting_table
                ? buildMasterSettingReadingsFromTable(legacyObservations.master_setting_table)
                : buildMasterSettingReadingsFromLegacyArrays(
                    legacyObservations.setting_master_size,
                    legacyObservations.actual_size
                  );

          const currentObservations = stripLegacyMasterSettingFields(
            getValues("observations") as Record<string, unknown>
          );
          const cleanedObservations = {
            ...currentObservations,
            ...(masterRows.length > 0 ? { master_setting_readings: masterRows } : {}),
          };
          setValue("observations", cleanedObservations as CalibrationForm["observations"], {
            shouldValidate: false,
            shouldDirty: false,
          });

          if (masterRows.length > 0) {
            setShowMasterSettingTable(true);
            setReadingColumnsCount(masterRows.length);
            setValue("observations.master_setting_readings", masterRows, {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }

        initializedRef.current = true;
        userModifiedReadingsRef.current = false;
        lastAppliedReadingsSourceRef.current = readingsSourceKey;
        lastObservationsRef.current = currentKey;
        lastMasterReadingsRef.current = masterReadingsKey;
        return;
      }

      // If no observations data, initialize from master_readings array
      if (!master_readings || master_readings.length === 0) {
        // No master_readings, initialize empty
        replaceReadings([]);
        resetReadingsRuntimeState();
        initializedRef.current = true;
        userModifiedReadingsRef.current = false;
        lastAppliedReadingsSourceRef.current = readingsSourceKey;
        lastObservationsRef.current = currentKey;
        lastMasterReadingsRef.current = masterReadingsKey;
        return;
      }

      // Filter master_readings based on specifications range if available
      const filteredReadings = filterReadingsByRange(master_readings);

      // Only initialize if we have filtered readings
      if (filteredReadings.length > 0) {
        // Initialize readings with the filtered readings array
        const initialRows = filteredReadings.map((d) => ({
          measured_dimension: d,
          reading_1: "",
          reading_2: "",
          reading_3: "",
          mean: 0,
          observed_error: 0,
          set_as: false,
        }));

        // Update field array synchronously in one batch
        replaceReadings(initialRows);
        resetReadingsRuntimeState();

        // Set default print flag
        setValue("observations.print", true, {
          shouldValidate: false,
          shouldDirty: false,
        });

        // Mark as initialized only after all updates are complete
        initializedRef.current = true;
        userModifiedReadingsRef.current = false;
        lastAppliedReadingsSourceRef.current = readingsSourceKey;
        lastObservationsRef.current = currentKey;
        lastMasterReadingsRef.current = masterReadingsKey;
      } else {
        // No readings after filtering, initialize empty
        replaceReadings([]);
        resetReadingsRuntimeState();
        initializedRef.current = true;
        userModifiedReadingsRef.current = false;
        lastAppliedReadingsSourceRef.current = readingsSourceKey;
        lastObservationsRef.current = currentKey;
        lastMasterReadingsRef.current = masterReadingsKey;
      }
    } finally {
      // Use setTimeout to allow state updates to complete before allowing next initialization
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 0);
    }
  }, [
    initialObservations,
    master_readings,
    specifications,
    replaceReadings,
    setValue,
    getValues,
    settingMaster,
    getObservationsKey,
    getMasterReadingsKey,
    filterReadingsByRange,
    resetReadingsRuntimeState,
  ]);

  /* --------------------------------------------------------------
     CALCULATIONS
  ---------------------------------------------------------------*/
  // Calculate rows when readings change - use useEffect with debounce to prevent infinite loops
  useEffect(() => {
    // Skip calculation during initialization or if no rows
    if (!initializedRef.current || !readingsRows || readingsRows.length === 0 || isInitializingRef.current) {
      return;
    }

    // Use a timeout to debounce calculations and prevent rapid-fire updates
    const timeoutId = setTimeout(() => {
      // Calculate each row that has all three readings
      readingsRows.forEach((row, index) => {
        // Skip if already calculating this row
        if (calculatingRef.current.has(index)) {
          return;
        }

        const reading1 = row.reading_1 ? Number(row.reading_1) : NaN;
        const reading2 = row.reading_2 ? Number(row.reading_2) : NaN;
        const reading3 = row.reading_3 ? Number(row.reading_3) : NaN;
        const manualActualReading = parseNumber(row.mean);

        // Only calculate if all three readings are valid numbers
        const allReadingsValid =
          !isNaN(reading1) &&
          !isNaN(reading2) &&
          !isNaN(reading3) &&
          row.reading_1 &&
          row.reading_2 &&
          row.reading_3;

        const path = `observations.readings.${index}`;

        if (allReadingsValid && !actualReadingEditingRef.current[index]) {
          calculatingRef.current.add(index);

          // Calculate average reading (mean)
          const avg = calculateMeanFromReadings([reading1, reading2, reading3],4);
          // Calculate observed error: (avg - measured_dimension) * 1000
          const observed = calculateObservedError(row.measured_dimension || 0, avg, {
            mode: "mean-minus-measured",
            scale: 1000,
            decimals: 3,
          });

          // Check if we've already calculated these exact values to prevent loops
          const lastCalculated = lastCalculatedValuesRef.current.get(index);
          const valuesChanged =
            !lastCalculated ||
            Math.abs(lastCalculated.avg - (avg ?? 0)) > 0.0001 ||
            Math.abs(lastCalculated.observed - (observed ?? 0)) > 0.0001;

          // Only update if values have actually changed
          if (valuesChanged) {
            // Store calculated values to prevent re-calculation
            lastCalculatedValuesRef.current.set(index, { avg: avg ?? 0, observed: observed ?? 0 });

            setValue(`${path}.mean` as const, avg ?? 0, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false,
            });
            setValue(`${path}.observed_error` as const, observed ?? 0, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false,
            });
          }

          // Remove from calculating set after a delay
          setTimeout(() => {
            calculatingRef.current.delete(index);
          }, 50);
        } else if (
          manualActualReading !== null &&
          !actualReadingEditingRef.current[index] &&
          (row.reading_1 || row.reading_2 || row.reading_3)
        ) {
          const observed = calculateObservedError(row.measured_dimension || 0, manualActualReading, {
            mode: "mean-minus-measured",
            scale: 1000,
            decimals: 3,
          });

          const currentObserved = parseNumber(row.observed_error);
          if (observed !== null && (currentObserved === null || Number(currentObserved.toFixed(3)) !== observed)) {
            setValue(`${path}.observed_error` as const, observed ?? 0, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false,
            });
          }
        } else if (!actualReadingEditingRef.current[index]) {
          // Clear calculated values if readings and manual actual reading are incomplete
          const lastCalculated = lastCalculatedValuesRef.current.get(index);
          if (lastCalculated) {
            lastCalculatedValuesRef.current.delete(index);

            const currentAvg = row.mean || 0;
            const currentObserved = row.observed_error || 0;

            // Only clear if values are not already 0
            if (Math.abs(currentAvg) > 0.0001 || Math.abs(currentObserved) > 0.0001) {
              setValue(`${path}.mean` as const, 0, {
                shouldValidate: false,
                shouldDirty: false,
                shouldTouch: false,
              });
              setValue(`${path}.observed_error` as const, 0, {
                shouldValidate: false,
                shouldDirty: false,
                shouldTouch: false,
              });
            }
          }
        }
      });
    }, 200); // Debounce calculation by 200ms to prevent rapid updates

    return () => {
      clearTimeout(timeoutId);
    };
  }, [readingsRows, setValue]);


  /* --------------------------------------------------------------
     MASTER SETTING TABLE HANDLERS
  ---------------------------------------------------------------*/
  const handleCreateMasterSettingTable = useCallback(() => {
    markMasterSettingColumnsMutating();
    const initialCount = readingColumnsCount > 0 ? readingColumnsCount : 6;
    const rows = Array.from({ length: initialCount }, () => ({
      setting_size: "",
      actual_setting_size: "",
    }));
    masterSettingFields.replace(rows);
    setReadingColumnsCount(initialCount);
    setShowMasterSettingTable(true);
  }, [markMasterSettingColumnsMutating, masterSettingFields, readingColumnsCount]);

  const handleAddReadingColumn = useCallback(() => {
    markMasterSettingColumnsMutating();
    const newColumnIndex = readingColumnsCount + 1;
    setReadingColumnsCount(newColumnIndex);
    masterSettingFields.append({ setting_size: "", actual_setting_size: "" });
  }, [markMasterSettingColumnsMutating, readingColumnsCount, masterSettingFields]);

  const handleRemoveReadingColumn = useCallback(() => {
    if (readingColumnsCount <= 1) return;

    markMasterSettingColumnsMutating();
    const newColumnIndex = readingColumnsCount - 1;
    setReadingColumnsCount(newColumnIndex);
    if (masterSettingFields.fields.length >= 1) {
      masterSettingFields.remove(masterSettingFields.fields.length - 1);
    }
  }, [markMasterSettingColumnsMutating, readingColumnsCount, masterSettingFields]);

  const handleRemoveReadingRow = useCallback(
    (index: number) => {
      if (isReadOnly) return;

      const currentRows = (getValues("observations.readings") ?? []) as ReadingRow[];
      const nextRows = currentRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row) => normalizeReadingRow(row));

      markReadingsModified();
      resetReadingsRuntimeState();
      replaceReadings(nextRows);
      setValue("observations.readings", nextRows, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
      clearErrors("observations.readings");
    },
    [
      clearErrors,
      getValues,
      isReadOnly,
      markReadingsModified,
      replaceReadings,
      resetReadingsRuntimeState,
      setValue,
    ]
  );

  /* --------------------------------------------------------------
     RENDER
  ---------------------------------------------------------------*/
  const printValue = useWatch({
    control,
    name: "observations.print",
  }) ?? true;

  return (
    <>
      {/* Measurement Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
        {/* Section Header with PRINT Checkbox */}
        <div className="bg-gradient-to-b from-slate-600 to-slate-700 text-white px-4 py-3.5 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase">Observations</h3>
          <Checkbox
            isSelected={printValue}
            isDisabled={isReadOnly}
            onValueChange={(v: boolean) => {
              setValue("observations.print", v, { shouldDirty: true });
            }}
            classNames={{
              label: "text-white text-xs font-semibold",
              base: "text-white",
            }}
          >
            PRINT
          </Checkbox>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-40">
              {/* Column Headers Row */}
              <tr>
                <th className="sticky left-0 z-50 bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r-2 border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                  MEASURED DIMENSION (MM)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                  READING 1 (MM)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                  READING 2 (MM)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                  READING 3 (MM)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                  MEASURED DIMENSION ACTUAL READING (MM)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                  OBSERVED ERROR (MM)
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider bg-gradient-to-b from-slate-50 to-slate-100 border-l border-slate-200">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {readingsFields.fields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500 bg-slate-50/30">
                    No readings available
                  </td>
                </tr>
              ) : (
                readingsFields.fields.map((field, index: number) => {
                  const row = readingsRows?.[index];

                  return (
                    <tr key={field.id} className="transition-colors duration-150 border-b border-slate-100">
                      {/* Measured Dimension - Fixed Column */}
                      <td className="sticky left-0 z-30 bg-white px-4 py-2.5 whitespace-nowrap border-r-2 border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                        <Input
                          aria-label="Measured Dimension"
                          readOnly
                          value={row?.measured_dimension?.toString() ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full min-w-[100px] border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-700",
                          }}
                        />
                      </td>

                      {/* Reading 1 */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                        <Controller
                          name={`observations.readings.${index}.reading_1` as const}
                          control={control}
                          defaultValue={row?.reading_1 ?? ""}
                          rules={{
                            validate: (value) => {
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
                                aria-label="Reading 1"
                                isDisabled={isReadOnly}
                                classNames={{
                                  inputWrapper: `h-9 w-full min-w-[100px] border-1 ${fieldState.error
                                    ? "border-red-400 shadow-sm"
                                    : "border-slate-200"
                                    } bg-white hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                                  input: "text-sm text-center font-medium text-slate-700",
                                }}
                                onChange={(e) => {
                                  markReadingsModified();
                                  controllerField.onChange(e);
                                }}
                                onBlur={() => {
                                  controllerField.onBlur();
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

                      {/* Reading 2 */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                        <Controller
                          name={`observations.readings.${index}.reading_2` as const}
                          control={control}
                          defaultValue={row?.reading_2 ?? ""}
                          rules={{
                            validate: (value) => {
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
                                aria-label="Reading 2"
                                isDisabled={isReadOnly}
                                classNames={{
                                  inputWrapper: `h-9 w-full min-w-[100px] border-1 ${fieldState.error
                                    ? "border-red-400 shadow-sm"
                                    : "border-slate-200"
                                    } bg-white hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                                  input: "text-sm text-center font-medium text-slate-700",
                                }}
                                onChange={(e) => {
                                  markReadingsModified();
                                  controllerField.onChange(e);
                                }}
                                onBlur={() => {
                                  controllerField.onBlur();
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
                      <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                        <Controller
                          name={`observations.readings.${index}.reading_3` as const}
                          control={control}
                          defaultValue={row?.reading_3 ?? ""}
                          rules={{
                            validate: (value) => {
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
                                aria-label="Reading 3"
                                isDisabled={isReadOnly}
                                classNames={{
                                  inputWrapper: `h-9 w-full min-w-[100px] border-1 ${fieldState.error
                                    ? "border-red-400 shadow-sm"
                                    : "border-slate-200"
                                    } bg-white hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                                  input: "text-sm text-center font-medium text-slate-700",
                                }}
                                onChange={(e) => {
                                  markReadingsModified();
                                  controllerField.onChange(e);
                                }}
                                onBlur={() => {
                                  controllerField.onBlur();
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

                      {/* Measured Dimension Actual Reading */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                        <Controller
                          name={`observations.readings.${index}.mean` as const}
                          control={control}
                          defaultValue={row?.mean ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              aria-label="Measured Dimension Actual Reading"
                              type="text"
                              inputMode="decimal"
                              isDisabled={isReadOnly}
                              value={toDisplay(controllerField.value)}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-slate-200 bg-white shadow-sm",
                                input: "text-sm text-center font-medium text-slate-600",
                              }}
                              onFocus={() => {
                                actualReadingEditingRef.current[index] = true;
                              }}
                              onBlur={(e) => {
                                actualReadingEditingRef.current[index] = false;
                                controllerField.onBlur();

                                if (isReadOnly) return;

                                const meanValue = parseNumber(e.target.value);
                                if (meanValue === null) return;

                                const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                                  decimals: 4,
                                  deltas: [0.001, 0.002],
                                });

                                markReadingsModified();
                                setValue(`observations.readings.${index}.reading_1`, r1, { shouldDirty: true });
                                setValue(`observations.readings.${index}.reading_2`, r2, { shouldDirty: true });
                                setValue(`observations.readings.${index}.reading_3`, r3, { shouldDirty: true });
                              }}
                              onChange={(e) => {
                                markReadingsModified();
                                controllerField.onChange(e);
                                const manualActual = parseNumber(e.target.value);
                                if (manualActual === null) return;

                                const observed = calculateObservedError(row?.measured_dimension || 0, manualActual, {
                                  mode: "mean-minus-measured",
                                  scale: 1000,
                                  decimals: 3,
                                });

                                if (observed !== null) {
                                  setValue(`observations.readings.${index}.observed_error`, observed, {
                                    shouldValidate: false,
                                    shouldDirty: true,
                                    shouldTouch: false,
                                  });
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* Observed Error */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                        <Input
                          aria-label="Observed Error"
                          readOnly
                          value={row?.observed_error?.toFixed(3) ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full min-w-[100px] border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-600",
                          }}
                        />
                      </td>

                      {/* Action Column */}
                      <td className="px-4 py-2.5 whitespace-nowrap bg-slate-50/30 border-l border-slate-200">
                        <div className="flex gap-2 justify-center items-center">

                          <Controller
                            name={`observations.readings.${index}.set_as` as const}
                            control={control}
                            defaultValue={row?.set_as ?? false}
                            render={({ field }) => (
                              <Checkbox
                                isSelected={field.value || false}
                                isDisabled={isReadOnly}
                                onValueChange={(value: boolean) => {
                                  markReadingsModified();
                                  field.onChange(value);
                                }}
                                size="sm"
                              >
                                Set
                              </Checkbox>
                            )}
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveReadingRow(index)}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Parallism of measuring Faces
          </label>
          <Controller
            name="observations.parallelism_measuring_faces"
            control={control}
            defaultValue={initialObservations?.parallelism_measuring_faces ?? ""}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  isDisabled={isReadOnly}
                  classNames={{
                    inputWrapper: "h-9 border-1 border-gray-300",
                    input: "text-sm",
                  }}
                />
                <span className="text-sm text-gray-600">μm.</span>
              </div>
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flatness of Anvils
          </label>
          <Controller
            name="observations.flatness_anvils"
            control={control}
            defaultValue={initialObservations?.flatness_anvils ?? ""}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  isDisabled={isReadOnly}
                  classNames={{
                    inputWrapper: "h-9 border-1 border-gray-300",
                    input: "text-sm",
                  }}
                />
                <span className="text-sm text-gray-600">μm.</span>
              </div>
            )}
          />
        </div>
      </div>
      {/* Master Setting Table Section */}
      {settingMaster && (
        <div className="mt-6">
          {!showMasterSettingTable ? (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">
                    Master Setting Size Table
                  </h3>
                  <p className="text-xs text-gray-500">
                    Create a table with dynamic reading columns for Setting Master Size and Actual Size
                  </p>
                </div>
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleCreateMasterSettingTable}
                  isDisabled={isReadOnly}
                  startContent={<Plus size={16} />}
                >
                  Create Master Setting Table
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Section Header */}
              <div className="bg-slate-100 text-gray-800 px-4 py-3.5 flex items-center justify-between border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase">Master Setting Size Table</h3>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="bordered"
                    color="primary"
                    onPress={handleAddReadingColumn}
                    isDisabled={isReadOnly}
                    startContent={<Plus size={14} />}
                  >
                    Add Reading Column
                  </Button>

                  {readingColumnsCount > 1 && (
                    <Button
                      size="sm"
                      variant="bordered"
                      color="danger"
                      onPress={handleRemoveReadingColumn}
                      isDisabled={isReadOnly}
                      startContent={<X size={14} />}
                    >
                      Remove Column
                    </Button>
                  )}
                    <Button
                      size="sm"
                      variant="bordered"
                      color="primary"
                      onPress={() => {
                        markMasterSettingColumnsMutating();
                        masterSettingFields.replace([]);
                        setReadingColumnsCount(6);
                        setShowMasterSettingTable(false);
                      }}
                    isDisabled={isReadOnly}
                    startContent={<Plus size={14} />}
                  >
                    Remove Table
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-r-1 border-slate-300">
                        {/* Empty header for label column */}
                      </th>
                      {Array.from({ length: readingColumnsCount }, (_, i) => i + 1).map(
                        (colNum) => (
                          <th
                            key={colNum}
                            className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200"
                          >
                            READING {colNum}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {/* Setting Master Size Row */}
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-xs font-semibold uppercase border-r-1 border-slate-300 whitespace-nowrap">
                        SETTING MASTER SIZE
                      </td>
                      {Array.from({ length: readingColumnsCount }, (_, i) => i + 1).map(
                        (colNum) => {
                          const rowIndex = colNum - 1;
                          return (
                            <td key={colNum} className="px-3 py-2.5 border border-slate-200">
                              <Controller
                                name={
                                  `observations.master_setting_readings.${rowIndex}.setting_size` as const
                                }
                                control={control}
                                defaultValue=""
                                render={({ field: controllerField, fieldState }) => (
                                  <div>
                                    <Input
                                      {...controllerField}
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Setting Master Size Reading ${colNum}`}
                                      isDisabled={isReadOnly}
                                      classNames={{
                                        inputWrapper: `h-9 w-full border-1 ${fieldState.error
                                          ? "border-red-400 shadow-sm"
                                          : "border-slate-200"
                                          } bg-white hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                                        input: "text-sm text-center font-medium text-slate-700",
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
                          );
                        }
                      )}
                    </tr>

                    {/* Actual Size Row */}
                    <tr className="border-b border-slate-200">
                      <td className="px-4 py-3 text-xs font-semibold uppercase border-r-1 border-slate-300 whitespace-nowrap">
                        ACTUAL SIZE
                      </td>
                      {Array.from({ length: readingColumnsCount }, (_, i) => i + 1).map(
                        (colNum) => {
                          const rowIndex = colNum - 1;
                          return (
                            <td key={colNum} className="px-3 py-2.5 border border-slate-200">
                              <Controller
                                name={
                                  `observations.master_setting_readings.${rowIndex}.actual_setting_size` as const
                                }
                                control={control}
                                defaultValue=""
                                render={({ field: controllerField, fieldState }) => (
                                  <div>
                                    <Input
                                      {...controllerField}
                                      type="text"
                                      inputMode="decimal"
                                      aria-label={`Actual Size Reading ${colNum}`}
                                      isDisabled={isReadOnly}
                                      classNames={{
                                        inputWrapper: `h-9 w-full border-1 ${fieldState.error
                                          ? "border-red-400 shadow-sm"
                                          : "border-slate-200"
                                          } bg-white hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`,
                                        input: "text-sm text-center font-medium text-slate-700",
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
                          );
                        }
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Repeatability Section */}
      {

        isRepeatability && (
          <div className="mt-6">
            <RepeatabilitySection
              disabled={isReadOnly}
              observations={{
                repeatability: initialObservations?.repeatability?.map(String) ?? [],
              }}
            />
          </div>
        )
      }



      {/* Type A Reading Section */}
      <div className="mt-6">
        <TypeAReadingSection
          disabled={isReadOnly}
          observations={{
            type_a_readings: initialObservations?.type_a_readings
              ? Array.isArray(initialObservations.type_a_readings)
                ? initialObservations.type_a_readings.map((v) =>
                  typeof v === "string" ? Number(v) : v
                )
                : []
              : [],
          }}
        />
      </div>


    </>
  );
}

ExternalMicrometerCalibration.displayName = "ExternalMicrometerCalibration";
