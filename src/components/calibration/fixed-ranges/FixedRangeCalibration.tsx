"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  Input,
  Checkbox,
  Button,
} from "@heroui/react";
import { Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch, Controller } from "react-hook-form";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { RepeatabilitySection } from "../common/RepeatabilitySection";
import {
  calculateObservedErrorInMicron,
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
  truncateWithoutRounding,
} from "../../../utils/calibrationCalculations";
import type {
  FixedRangeReadingRow as ReadingRow,
  FixedRangeCalibrationForm as CalibrationForm,
  FixedRangeObservationsObj as ObservationsObj,
} from "../observationSchemas";

interface Props {
  observations?: CalibrationForm["observations"] | ReadingRow[];
  isReadOnly?: boolean;
  master_readings?: number[];
  gaugeType?: string;
}

function isObservationsObj(val: unknown): val is ObservationsObj {
  return typeof val === "object" && val !== null && Array.isArray((val as any).readings);
}

const formatObservedErrorMicron = (value: unknown): string => {
  const numericValue = parseNumber(value);
  if (numericValue === null) return "";
  return truncateWithoutRounding(numericValue, 1).toFixed(1);
};

export function FixedRangeCalibration({
  observations: initialObservations,
  isReadOnly = false,
  master_readings,
  gaugeType,
}: Props) {
  const { control, setValue, getValues } =
    useFormContext<CalibrationForm>();
  const isElectronicHeightGauge = (gaugeType || "").toLowerCase().trim() === "electronic height gauge";

  const { fields, replace, remove } = useFieldArray({
    control,
    name: "observations.readings",
  });

  // Optimize useWatch to only watch specific fields and reduce re-renders
  const rows = useWatch({
    control,
    name: "observations.readings",
    defaultValue: [],
  });

  const repeatability = useWatch({
    control,
    name: "observations.repeatability",
    defaultValue: [],
  });

  const typeA = useWatch({
    control,
    name: "observations.type_a_readings",
    defaultValue: [],
  });

  // Track if data has been initialized to prevent re-initialization
  const initializedRef = useRef(false);
  const lastObservationsRef = useRef<string | null>(null);
  const lastMasterReadingsRef = useRef<string | null>(null);

  // Create a stable key for observations comparison
  const getObservationsKey = useCallback((obs: any): string => {
    if (!obs) return 'null';
    if (Array.isArray(obs)) {
      return JSON.stringify(obs.map(r => ({ 
        measured_dimension: r.measured_dimension, 
        readings: r.readings 
      })));
    }
    if (isObservationsObj(obs)) {
      return JSON.stringify({
        readingsCount: obs.readings?.length || 0,
        hasRepeatability: !!obs.repeatability,
        hasTypeA: !!obs.type_a_readings
      });
    }
    return 'empty';
  }, []);

  const getMasterReadingsKey = useCallback((readings: number[] | undefined): string => {
    if (!readings || !Array.isArray(readings) || readings.length === 0) {
      return "empty";
    }
    return JSON.stringify(readings);
  }, []);

  /* --------------------------------------------------------------
     INITIAL LOAD - Only run once or when observations actually change
  ---------------------------------------------------------------*/
  useEffect(() => {
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

    // Priority 1: Use existing observations if available
    if (Array.isArray(initialObservations) && initialObservations.length > 0) {
      const formattedRows = initialObservations.map((row) => ({
        measured_dimension: row.measured_dimension ?? 0,
        readings: Array.isArray(row.readings) && row.readings.length === 3
          ? row.readings.map(String)
          : ["", "", ""],
        mean: row.mean ?? 0,
        observed_error:
          calculateObservedErrorInMicron(
            parseNumber(row.mean),
            parseNumber(row.measured_dimension),
            1
          ) ?? row.observed_error ?? 0,
        set_as: row.set_as ?? (row as { setAs?: boolean }).setAs ?? false,
      }));
      
      replace(formattedRows);
      initializedRef.current = true;
      lastObservationsRef.current = currentKey;
      lastMasterReadingsRef.current = masterReadingsKey;
      return;
    }

    // Priority 2: Use observations object
    if (isObservationsObj(initialObservations) && initialObservations.readings?.length > 0) {
      const formattedRows = initialObservations.readings.map((row) => ({
        measured_dimension: row.measured_dimension ?? 0,
        readings: Array.isArray(row.readings) && row.readings.length === 3
          ? row.readings.map(String)
          : ["", "", ""],
        mean: row.mean ?? 0,
        observed_error:
          calculateObservedErrorInMicron(
            parseNumber(row.mean),
            parseNumber(row.measured_dimension),
            1
          ) ?? row.observed_error ?? 0,
        set_as: row.set_as ?? (row as { setAs?: boolean }).setAs ?? false,
      }));
      
      replace(formattedRows);

      // Set repeatability and type_a_readings if they exist
      if (initialObservations.repeatability && Array.isArray(initialObservations.repeatability)) {
        setValue("observations.repeatability", initialObservations.repeatability);
      }

      if (initialObservations.type_a_readings && Array.isArray(initialObservations.type_a_readings)) {
        setValue("observations.type_a_readings", initialObservations.type_a_readings);
      }

      if (isElectronicHeightGauge && typeof initialObservations.squareness_of_movement_on_base === "string") {
        setValue(
          "observations.squareness_of_movement_on_base",
          initialObservations.squareness_of_movement_on_base
        );
      }
      
      initializedRef.current = true;
      lastObservationsRef.current = currentKey;
      lastMasterReadingsRef.current = masterReadingsKey;
      return;
    }

    // Priority 3: Load from master_readings array if no observations exist
    if (master_readings && Array.isArray(master_readings) && master_readings.length > 0) {
      replace(
        master_readings.map((d) => ({
          measured_dimension: d,
          readings: ["", "", ""],
          mean: 0,
          observed_error: 0,
          set_as: false,
        }))
      );
      initializedRef.current = true;
      lastObservationsRef.current = `master-${master_readings.length}`;
      lastMasterReadingsRef.current = masterReadingsKey;
      return;
    }
  
  }, [initialObservations, master_readings, replace, setValue, getObservationsKey, getMasterReadingsKey, isElectronicHeightGauge]);


  const updateObservedError = useCallback(
    (index: number, actualMeasuredValue: number | null) => {
      const row = getValues(`observations.readings.${index}`);
      if (!row) return;
      const observed = calculateObservedErrorInMicron(
        actualMeasuredValue,
        parseNumber(row.measured_dimension),
        1
      );
      setValue(`observations.readings.${index}.observed_error`, observed ?? "", { shouldDirty: true });
    },
    [getValues, setValue]
  );

  const calculateRow = useCallback(
    (index: number) => {
      const row = getValues(`observations.readings.${index}`);
      if (!row) return;

      const mean = calculateMeanFromReadings(row.readings, 3);

      if (mean !== null) {
        setValue(`observations.readings.${index}.mean`, mean, { shouldDirty: true });
        updateObservedError(index, mean);
        return;
      }

      const meanValue = parseNumber(row.mean);
      updateObservedError(index, meanValue);
    },
    [getValues, setValue, updateObservedError]
  );

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Measured Dimension <br /> (mm)
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Reading 1
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Reading 2
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Reading 3
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Mean (mm)
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Observed Error <br /> (µm)
                </th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No readings available
                  </td>
                </tr>
              ) : (
                fields.map((field, index) => {
                  const row = rows?.[index];
                  return (
                    <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                      {/* Measured Dimension */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input 
                          aria-label="Measured Dimension" 
                          readOnly 
                          value={row?.measured_dimension?.toString() ?? ""}
                          className="h-9 w-full min-w-[100px] border border-gray-300 bg-gray-50 text-center text-sm"
                        />
                      </td>

                      {/* Reading 1 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                      <Controller
                        name={`observations.readings.${index}.readings.0`}
                        control={control}
                        defaultValue={row?.readings?.[0] ?? ""}
                        render={({ field: controllerField, fieldState }) => (
                          <div>
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Reading 1"
                              disabled={isReadOnly}
                              className={`h-9 w-full min-w-[100px] border ${fieldState.error ? "border-red-500" : "border-gray-300"} bg-white text-center text-sm`}
                              onChange={(e) => {
                                controllerField.onChange(e);
                                calculateRow(index);
                              }}
                            />
                          </div>
                        )}
                      />
                      </td>

                      {/* Reading 2 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                      <Controller
                        name={`observations.readings.${index}.readings.1`}
                        control={control}
                        defaultValue={row?.readings?.[1] ?? ""}
                        render={({ field: controllerField, fieldState }) => (
                          <div>
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Reading 2"
                              disabled={isReadOnly}
                              className={`h-9 w-full min-w-[100px] border ${fieldState.error ? "border-red-500" : "border-gray-300"} bg-white text-center text-sm`}
                              onChange={(e) => {
                                controllerField.onChange(e);
                                calculateRow(index);
                              }}
                            />
                          </div>
                        )}
                      />
                      </td>

                      {/* Reading 3 */}
                      <td className="px-3 py-2 whitespace-nowrap">
                      <Controller
                        name={`observations.readings.${index}.readings.2`}
                        control={control}
                        defaultValue={row?.readings?.[2] ?? ""}
                        render={({ field: controllerField, fieldState }) => (
                          <div>
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Reading 3"
                              disabled={isReadOnly}
                              className={`h-9 w-full min-w-[100px] border ${fieldState.error ? "border-red-500" : "border-gray-300"} bg-white text-center text-sm`}
                              onChange={(e) => {
                                controllerField.onChange(e);
                                calculateRow(index);
                              }}
                            />
                          </div>
                        )}
                      />
                      </td>

                      {/* Mean */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Controller
                          name={`observations.readings.${index}.mean`}
                          control={control}
                          defaultValue={row?.mean ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              value={controllerField.value == null ? "" : String(controllerField.value)}
                              aria-label="Mean"
                              type="text"
                              inputMode="decimal"
                              disabled={isReadOnly}
                              className="h-9 w-full min-w-[100px] border border-gray-300 bg-white text-center text-sm"
                              onChange={(e) => {
                                controllerField.onChange(e);
                                const meanValue = parseNumber(e.target.value);
                                if (meanValue !== null) {
                                  const [r1, r2, r3] = generateReadingsFromMean(meanValue);
                                  setValue(`observations.readings.${index}.readings.0`, r1, { shouldDirty: true });
                                  setValue(`observations.readings.${index}.readings.1`, r2, { shouldDirty: true });
                                  setValue(`observations.readings.${index}.readings.2`, r3, { shouldDirty: true });
                                  updateObservedError(index, meanValue);
                                } else {
                                  updateObservedError(index, null);
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* Observed Error */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input 
                          aria-label="Observed Error" 
                          readOnly 
                          value={formatObservedErrorMicron(row?.observed_error)}
                          className="h-9 w-full min-w-[100px] border border-gray-300 bg-gray-50 text-center text-sm"
                        />
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex gap-2 justify-center items-center">
                          <Controller
                            name={`observations.readings.${index}.set_as`}
                            control={control}
                            defaultValue={row?.set_as ?? false}
                            render={({ field }) => (
                              <Checkbox
                                isSelected={field.value || false}
                                isDisabled={isReadOnly}
                                onChange={(value: boolean) => field.onChange(value)}
                              >
                                Set
                              </Checkbox>
                            )}
                          />

                          <Button
                            variant="danger-soft"
                            onPress={() => remove(index)}
                            isDisabled={isReadOnly}
                          >
                            <Trash2 size={16} />
                          </Button>
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

      {isElectronicHeightGauge && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <div className="max-w-md">
            <label className="mb-2 block text-sm font-medium text-gray-800">
              Squareness of Movement on Base
            </label>
            <Controller
              name="observations.squareness_of_movement_on_base"
              control={control}
              defaultValue={
                Array.isArray(initialObservations)
                  ? ""
                  : initialObservations?.squareness_of_movement_on_base ?? ""
              }
              render={({ field }) => (
                <Input
                  {...field}
                  type="text"
                  inputMode="decimal"
                  aria-label="Squareness of Movement on Base"
                  disabled={isReadOnly}
                  className="h-10 border border-gray-300 bg-white text-sm"
                  placeholder="Enter value"
                />
              )}
            />
          </div>
        </div>
      )}
            
      <div className="mt-6">
        <RepeatabilitySection
          disabled={isReadOnly}
          observations={{ repeatability: repeatability?.map(String) ?? [] }}
        />
      </div>

      <div className="mt-6">
        <TypeAReadingSection
          disabled={isReadOnly}
          observations={{ type_a_readings: typeA ?? [] }}
        />
      </div>
    </>
  );
}
