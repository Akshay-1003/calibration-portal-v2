"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { Input, Checkbox } from "@heroui/react";
import { Trash2 } from "lucide-react";
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
  DialSnapReadingRow as ReadingRow,
  DialSnapCalibrationForm as CalibrationForm,
  DialSnapObservationsObj as ObservationsObj,
} from "../observationSchemas";

/* ================================================================
   TYPES
==================================================================*/

interface Props {
    observations?: CalibrationForm["observations"];
    isReadOnly?: boolean;
    master_readings?: number[];
    specifications?: any;
    isRepeatability?: boolean;
}

function isObservationsObj(val: unknown): val is ObservationsObj {
    return (
        typeof val === "object" &&
        val !== null &&
        (val as any).readings !== undefined
    );
}

/* ================================================================
   COMPONENT
==================================================================*/

export function DialTypeSnapGaugeCalibration({
    observations: initialObservations,
    isReadOnly = false,
    master_readings,
    specifications,
    isRepeatability = true
}: Props) {
    void isRepeatability;
    const { control, setValue, getValues } = useFormContext<CalibrationForm>();

    const readingsFields = useFieldArray({
        control,
        name: "observations.readings",
    });

    // Use useWatch to get readings - memoized to prevent unnecessary re-renders
    const readingsRows = useWatch({
        control,
        name: "observations.readings",
        defaultValue: [],
    }) as ReadingRow[] | undefined;

    const initializedRef = useRef(false);
    const lastObservationsRef = useRef<string | null>(null);
    const lastMasterReadingsRef = useRef<string | null>(null);
    const isInitializingRef = useRef(false);
    const [showMasterSettingTable, setShowMasterSettingTable] = useState(false);
    void showMasterSettingTable;
    const [readingColumnsCount, setReadingColumnsCount] = useState(6);
    const calculatingRef = useRef<Set<number>>(new Set());
    const lastCalculatedValuesRef = useRef<Map<number, { avg: number; observed: number }>>(new Map());
    const actualReadingEditingRef = useRef<Record<number, boolean>>({});

    // Create a stable key for observations comparison
    const getObservationsKey = useCallback((obs: any): string => {
        if (!obs) return "null";
        if (isObservationsObj(obs)) {
            return JSON.stringify({
                readingsCount: obs.readings?.length || 0,
                hasRepeatability: !!obs.repeatability,
                hasTypeA: !!obs.type_a_readings,
            });
        }
        return "empty";
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

        // Skip if already initialized with the same observations
        if (
            initializedRef.current &&
            lastObservationsRef.current === currentKey &&
            lastMasterReadingsRef.current === masterReadingsKey
        ) {
            return;
        }

        isInitializingRef.current = true;

        try {
            // Check if we have observations data
            const hasObservationsData = isObservationsObj(initialObservations) && (
                initialObservations.readings && initialObservations.readings.length > 0
            );

            // If we have observations data, load it directly
            if (hasObservationsData) {
                // Load readings
                if (initialObservations.readings && initialObservations.readings.length > 0) {
                    readingsFields.replace(
                        initialObservations.readings.map((row) => ({
                            measured_dimension: row.measured_dimension ?? 0,
                            readings: row.readings ?? ["", "", ""],
                            mean: row.mean ?? "",
                            observed_error: row.observed_error ?? 0,
                            set_as: row.set_as ?? false,
                        }))
                    );
                } else {
                    readingsFields.replace([]);
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
                if (initialObservations.setting_master_size) {
                    setValue(
                        "observations.setting_master_size",
                        String(initialObservations.setting_master_size),
                        { shouldValidate: false, shouldDirty: false }
                    );
                }
                if (initialObservations.actual_size) {
                    setValue(
                        "observations.actual_size",
                        String(initialObservations.actual_size),
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

                // Load master setting table if exists
                if (initialObservations.master_setting_table) {
                    setShowMasterSettingTable(true);
                    setReadingColumnsCount(
                        initialObservations.master_setting_table.reading_columns_count || 6
                    );
                    setValue(
                        "observations.master_setting_table",
                        initialObservations.master_setting_table,
                        { shouldValidate: false, shouldDirty: false }
                    );
                }

                initializedRef.current = true;
                lastObservationsRef.current = currentKey;
                lastMasterReadingsRef.current = masterReadingsKey;
                return;
            }

            // If no observations data, initialize from master_readings array
            if (!master_readings || master_readings.length === 0) {
                // No master_readings, initialize empty
                readingsFields.replace([]);
                initializedRef.current = true;
                lastObservationsRef.current = "empty";
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
                    readings: ["", "", ""],
                    mean: "",
                    observed_error: 0,
                    set_as: false,
                }));

                // Update field array synchronously in one batch
                readingsFields.replace(initialRows);

                // Set default print flag
                setValue("observations.print", true, {
                    shouldValidate: false,
                    shouldDirty: false,
                });

                // Mark as initialized only after all updates are complete
                initializedRef.current = true;
                lastObservationsRef.current = `master-${filteredReadings.length}`;
                lastMasterReadingsRef.current = masterReadingsKey;
            } else {
                // No readings after filtering, initialize empty
                readingsFields.replace([]);
                initializedRef.current = true;
                lastObservationsRef.current = "empty";
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
        // Remove readingsFields from dependencies - it's stable from useFieldArray
        // readingsFields,
        setValue,
        getObservationsKey,
        getMasterReadingsKey,
        filterReadingsByRange,
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
                if (actualReadingEditingRef.current[index]) {
                    return;
                }
                // Skip if already calculating this row
                if (calculatingRef.current.has(index)) {
                    return;
                }

                // Parse readings - handle both number and string inputs
                const reading1 = parseNumber(row.readings?.[0]);
                const reading2 = parseNumber(row.readings?.[1]);
                const reading3 = parseNumber(row.readings?.[2]);

                // Only calculate if all three readings are valid numbers
                const allReadingsValid =
                    reading1 !== null &&
                    reading2 !== null &&
                    reading3 !== null;

                const path = `observations.readings.${index}`;

                if (allReadingsValid) {
                    calculatingRef.current.add(index);

                    // Calculate average reading (mean)
                    const avg = calculateMeanFromReadings([reading1, reading2, reading3]);
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

                        setValue(`${path}.mean` as any, avg ?? 0, {
                            shouldValidate: false,
                            shouldDirty: false,
                            shouldTouch: false,
                        });
                        setValue(`${path}.observed_error` as any, observed ?? 0, {
                            shouldValidate: false,
                            shouldDirty: false,
                            shouldTouch: false,
                        });
                    }

                    // Remove from calculating set after a delay
                    setTimeout(() => {
                        calculatingRef.current.delete(index);
                    }, 50);
                } else {
                    // Clear calculated values if readings are incomplete
                    const lastCalculated = lastCalculatedValuesRef.current.get(index);
                    if (lastCalculated) {
                        lastCalculatedValuesRef.current.delete(index);

                        const currentAvg = parseNumber(row.mean) || 0;
                        const currentObserved = row.observed_error || 0;

                        // Only clear if values are not already 0
                        if (Math.abs(currentAvg) > 0.0001 || Math.abs(currentObserved) > 0.0001) {
                            setValue(`${path}.mean` as any, "", {
                                shouldValidate: false,
                                shouldDirty: false,
                                shouldTouch: false,
                            });
                            setValue(`${path}.observed_error` as any, 0, {
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
        // Initialize master setting table with empty reading columns
        const initialSettingMasterSize: { [key: string]: string } = {};
        const initialActualSize: { [key: string]: string } = {};

        // Initialize reading columns
        for (let i = 1; i <= readingColumnsCount; i++) {
            initialSettingMasterSize[`reading_${i}`] = "";
            initialActualSize[`reading_${i}`] = "";
        }

        setValue("observations.master_setting_table", {
            setting_master_size: initialSettingMasterSize,
            actual_size: initialActualSize,
            reading_columns_count: readingColumnsCount,
        });

        setShowMasterSettingTable(true);
    }, [setValue, readingColumnsCount]);
    void handleCreateMasterSettingTable;

    const handleAddReadingColumn = useCallback(() => {
        const newColumnIndex = readingColumnsCount + 1;
        setReadingColumnsCount(newColumnIndex);

        // Add new reading column to both setting_master_size and actual_size
        const currentTable = getValues("observations.master_setting_table" as any);
        if (currentTable) {
            setValue("observations.master_setting_table", {
                ...currentTable,
                setting_master_size: {
                    ...currentTable.setting_master_size,
                    [`reading_${newColumnIndex}`]: "",
                },
                actual_size: {
                    ...currentTable.actual_size,
                    [`reading_${newColumnIndex}`]: "",
                },
                reading_columns_count: newColumnIndex,
            });
        }
    }, [readingColumnsCount, getValues, setValue]);
    void handleAddReadingColumn;

    const handleRemoveReadingColumn = useCallback(() => {
        if (readingColumnsCount <= 1) return;

        const newColumnIndex = readingColumnsCount - 1;
        setReadingColumnsCount(newColumnIndex);

        // Remove last reading column from both setting_master_size and actual_size
        const currentTable = getValues("observations.master_setting_table" as any);
        if (currentTable) {
            const { [`reading_${readingColumnsCount}`]: removedSetting, ...restSetting } = currentTable.setting_master_size || {};
            const { [`reading_${readingColumnsCount}`]: removedActual, ...restActual } = currentTable.actual_size || {};

            setValue("observations.master_setting_table", {
                ...currentTable,
                setting_master_size: restSetting,
                actual_size: restActual,
                reading_columns_count: newColumnIndex,
            });
        }
    }, [readingColumnsCount, getValues, setValue]);
    void handleRemoveReadingColumn;

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
                        onChange={(v: boolean) => {
                            setValue("observations.print", v, { shouldDirty: true });
                        }}
                        className="text-white text-xs font-semibold"
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
                                    ACTUAL READING (MM)
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-slate-50 to-slate-100 border-b border-slate-200">
                                    OBSERVED ERROR (MM)
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider bg-gradient-to-b from-slate-50 to-slate-100 border-l border-slate-200">
                                    SET AS
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
                                readingsFields.fields.map((field: any, index: number) => {
                                    const row = readingsRows?.[index];

                                    return (
                                        <tr key={field.id} className="transition-colors duration-150 border-b border-slate-100">
                                            {/* Measured Dimension - Fixed Column */}
                                            <td className="sticky left-0 z-30 bg-white px-4 py-2.5 whitespace-nowrap border-r-2 border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.08)]">
                                                <Input
                                                    aria-label="Measured Dimension"
                                                    readOnly
                                                    value={row?.measured_dimension?.toString() ?? ""}
                                                    className="h-9 w-full min-w-[100px] border border-slate-200 bg-white text-sm text-center font-medium text-slate-700 shadow-sm"
                                                />
                                            </td>

                                            {/* Reading 1 */}
                                            <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                                                <Controller
                                                    name={`observations.readings.${index}.readings.0` as any}
                                                    control={control}
                                                    defaultValue={row?.readings?.[0] ?? ""}
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
                                                                disabled={isReadOnly}
                                                                className={`h-9 w-full min-w-[100px] border ${fieldState.error
                                                                        ? "border-red-400 shadow-sm"
                                                                        : "border-slate-200"
                                                                        } bg-white text-sm text-center font-medium text-slate-700 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`}
                                                                onChange={(e) => {
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
                                                    name={`observations.readings.${index}.readings.1` as any}
                                                    control={control}
                                                    defaultValue={row?.readings?.[1] ?? ""}
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
                                                                disabled={isReadOnly}
                                                                className={`h-9 w-full min-w-[100px] border ${fieldState.error
                                                                        ? "border-red-400 shadow-sm"
                                                                        : "border-slate-200"
                                                                        } bg-white text-sm text-center font-medium text-slate-700 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`}
                                                                onChange={(e) => {
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
                                                    name={`observations.readings.${index}.readings.2` as any}
                                                    control={control}
                                                    defaultValue={row?.readings?.[2] ?? ""}
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
                                                                disabled={isReadOnly}
                                                                className={`h-9 w-full min-w-[100px] border ${fieldState.error
                                                                        ? "border-red-400 shadow-sm"
                                                                        : "border-slate-200"
                                                                        } bg-white text-sm text-center font-medium text-slate-700 hover:border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all`}
                                                                onChange={(e) => {
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

                                            {/* Actual Reading */}
                                            <td className="px-3 py-2.5 whitespace-nowrap bg-white">
                                                <Controller
                                                    name={`observations.readings.${index}.mean` as any}
                                                    control={control}
                                                    defaultValue={row?.mean ?? ""}
                                                    render={({ field: controllerField }) => (
                                                        <Input
                                                            {...controllerField}
                                                            aria-label="Actual Reading"
                                                            type="text"
                                                            inputMode="decimal"
                                                            disabled={isReadOnly}
                                                            value={
                                                                controllerField.value === null ||
                                                                controllerField.value === undefined
                                                                    ? ""
                                                                    : String(controllerField.value)
                                                            }
                                                            className="h-9 w-full min-w-[100px] border border-slate-200 bg-white text-sm text-center font-medium text-slate-700 shadow-sm"
                                                            onFocus={() => {
                                                                actualReadingEditingRef.current[index] = true;
                                                            }}
                                                            onBlur={(event) => {
                                                                actualReadingEditingRef.current[index] = false;
                                                                controllerField.onBlur();

                                                                if (isReadOnly) return;

                                                                const meanValue = parseNumber(event.target.value);
                                                                if (meanValue === null) return;

                                                                const hasAnyReading = [
                                                                    row?.readings?.[0],
                                                                    row?.readings?.[1],
                                                                    row?.readings?.[2],
                                                                ].some((value) => parseNumber(value) !== null);

                                                                if (hasAnyReading) return;

                                                                const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                                                                    decimals: 4,
                                                                    deltas: [0.001, 0.002],
                                                                });

                                                                // Set string values directly (like ExternalMicrometer)
                                                                setValue(`observations.readings.${index}.readings.0` as any, r1, {
                                                                    shouldDirty: true,
                                                                });
                                                                setValue(`observations.readings.${index}.readings.1` as any, r2, {
                                                                    shouldDirty: true,
                                                                });
                                                                setValue(`observations.readings.${index}.readings.2` as any, r3, {
                                                                    shouldDirty: true,
                                                                });
                                                            }}
                                                            onChange={(event) => {
                                                                controllerField.onChange(event);
                                                                actualReadingEditingRef.current[index] = true;
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
                                                    className="h-9 w-full min-w-[100px] border border-slate-200 bg-white text-sm text-center font-medium text-slate-600 shadow-sm"
                                                />
                                            </td>

                                            {/* Set As Column */}
                                            <td className="px-4 py-2.5 whitespace-nowrap bg-slate-50/30 border-l border-slate-200">
                                                <div className="flex gap-2 justify-center items-center">
                                                    <Controller
                                                        name={`observations.readings.${index}.set_as` as any}
                                                        control={control}
                                                        defaultValue={row?.set_as ?? false}
                                                        render={({ field: controllerField }) => (
                                                            <Checkbox
                                                                isSelected={controllerField.value}
                                                                isDisabled={isReadOnly}
                                                                onChange={(checked: boolean) => {
                                                                    controllerField.onChange(checked);
                                                                }}
                                                                className="flex items-center justify-center"
                                                                aria-label="Set As"
                                                            />
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            readingsFields.remove(index);
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
                                    disabled={isReadOnly}
                                    className="h-9 border border-gray-300 text-sm"
                                />
                                <span className="text-sm text-gray-600">μm.</span>
                            </div>
                        )}
                    />
                </div>

            </div>


            <div className="mt-6">
                <RepeatabilitySection
                    disabled={isReadOnly}
                    observations={{
                        repeatability: initialObservations?.repeatability?.map(String) ?? [],
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

DialTypeSnapGaugeCalibration.displayName = "DialTypeSnapGaugeCalibration";
