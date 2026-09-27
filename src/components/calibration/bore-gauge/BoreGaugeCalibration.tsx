"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  Input,
  Checkbox,
} from "@heroui/react";
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
  BoreGaugeReadingRow as ReadingRow,
  BoreGaugeCalibrationForm as CalibrationForm,
  BoreGaugeObservationsObj as ObservationsObj,
} from "../observationSchemas";

const FIXED_MEASURED_DIMENSIONS = [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.2, 0.4, 0.6, 0.8, 1];

interface Props {
  observations?: CalibrationForm["observations"] | ReadingRow[];
  isReadOnly?: boolean;
}

function isObservationsObj(val: unknown): val is ObservationsObj {
  return typeof val === "object" && val !== null && Array.isArray((val as any).readings);
}

export function BoreGaugeCalibration({
  observations: initialObservations,
  isReadOnly = false,
}: Props) {
  const { control, setValue, getValues } =
    useFormContext<CalibrationForm>();

  const { fields, replace } = useFieldArray({
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

  useEffect(() => {
    const currentKey = getObservationsKey(initialObservations);
        if (
      initializedRef.current &&
      lastObservationsRef.current === currentKey
    ) {
      return;
    }
    if (Array.isArray(initialObservations) && initialObservations.length > 0) {
      const formattedRows = initialObservations.map((row) => ({
        measured_dimension: row.measured_dimension ?? 0,
        readings: Array.isArray(row.readings) && row.readings.length === 3
          ? row.readings.map(String)
          : ["", "", ""],
        mean: row.mean ?? 0,
        observed_error: row.observed_error ?? 0,
        set_as: row.set_as ?? (row as { setAs?: boolean }).setAs ?? false,
      }));
      
      replace(formattedRows);
      initializedRef.current = true;
      lastObservationsRef.current = currentKey;
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
        observed_error: row.observed_error ?? 0,
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
      
      initializedRef.current = true;
      lastObservationsRef.current = currentKey;
      return;
    }

    // Priority 3: Initialize with fixed measured dimensions (0 to 1 mm)
    const defaultRows = FIXED_MEASURED_DIMENSIONS.map((dimension) => ({
      measured_dimension: dimension,
      readings: ["", "", ""],
      mean: 0,
      observed_error: 0,
      set_as: false,
    }));
    
    replace(defaultRows);
    initializedRef.current = true;
    lastObservationsRef.current = 'fixed-dimensions';
  
  }, [initialObservations, replace, setValue, getObservationsKey]);

  const updateObservedError = useCallback(
    (index: number, meanValue: number | null) => {
      const row = getValues(`observations.readings.${index}`);
      if (!row) return;
      const observed = calculateObservedError(row.measured_dimension, meanValue, {
        mode: "measured-minus-mean",
        decimals: 3,
      });
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
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Measured Dimension <br /> (mm)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  READING 1
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  READING 2
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  READING 3
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  MEAN (mm)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  Observed Error <br /> (µm)
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                  SET AS
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
                      {/* Measured Dimension - Fixed, Read-only */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input 
                          aria-label="Measured Dimension" 
                          readOnly 
                          value={row?.measured_dimension?.toString() ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full min-w-[100px] border-1 border-gray-300 bg-gray-50",
                            input: "text-sm text-center font-semibold",
                          }}
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
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                                  fieldState.error ? "border-red-500" : "border-gray-300"
                                } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                                input: "text-sm text-center",
                              }}
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
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                                  fieldState.error ? "border-red-500" : "border-gray-300"
                                } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                                input: "text-sm text-center",
                              }}
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
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: `h-9 w-full min-w-[100px] border-1 ${
                                  fieldState.error ? "border-red-500" : "border-gray-300"
                                } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                                input: "text-sm text-center",
                              }}
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
                              value={String(controllerField.value ?? "")}
                              aria-label="Mean"
                              type="text"
                              inputMode="decimal"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-gray-300 bg-white",
                                input: "text-sm text-center",
                              }}
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
                          value={row?.observed_error?.toString() ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full min-w-[100px] border-1 border-gray-300 bg-gray-50",
                            input: "text-sm text-center",
                          }}
                        />
                      </td>

                      {/* Set As - Checkbox only, no delete button */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex justify-center items-center">
                          <Controller
                            name={`observations.readings.${index}.set_as`}
                            control={control}
                            defaultValue={row?.set_as ?? false}
                            render={({ field }) => (
                              <Checkbox
                                isSelected={field.value || false}
                                isDisabled={isReadOnly}
                                onValueChange={(value: boolean) => field.onChange(value)}
                                size="sm"
                              >
                                Set
                              </Checkbox>
                            )}
                          />
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
