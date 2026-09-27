"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import type { RingGaugeForm } from "../observationSchemas";
import {
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";



interface GaugeCalibrationProps {
  observations?: RingGaugeForm["observations"];
  specifications?: {
    basic_size?: number | string;
  };
  isReadOnly?: boolean;
}

const PARAMS: Array<"A" | "B"> = ["A", "B"];

/* =========================
   Helpers
========================= */


function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeReadings(
  readings?: Array<number | null | undefined>
): Array<number | undefined> {
  return [0, 1, 2].map((index) => toNumberOrUndefined(readings?.[index]));
}

function normalizeParameterName(value: unknown): "A" | "B" | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  if (upper === "A" || upper === "B") return upper;
  return undefined;
}

/* =========================
   Component
========================= */

export default function RingGaugeCalibration({
  observations,
  specifications,
  isReadOnly,
}: GaugeCalibrationProps) {
  const { control, reset, unregister, setValue, getValues } = useFormContext<RingGaugeForm>();
  const meanEditingRef = useRef<Record<string, boolean>>({});
  const meanManuallySetRef = useRef<Record<string, boolean>>({});
  const isUpdatingRef = useRef(false);
  const hasHydratedRef = useRef(false);

  const normalizedObservations = useMemo<RingGaugeForm["observations"]>(() => {
    const incomingParams = observations?.parameters ?? [];

    const getParameter = (name: "A" | "B", index: number) => {
      const byName = incomingParams.find(
        (row) => normalizeParameterName(row?.parameter) === name
      );
      const source = byName ?? incomingParams[index];

      return {
        parameter: name,
        x: { readings: normalizeReadings(source?.x?.readings) },
        y: { readings: normalizeReadings(source?.y?.readings) },
      };
    };

    return {
      obs_type: observations?.obs_type ?? "master_ring",
      basic_size:
        toNumberOrUndefined(observations?.basic_size) ??
        toNumberOrUndefined(specifications?.basic_size),
      observed_size: toNumberOrUndefined(observations?.observed_size),
      parameters: [getParameter("A", 0), getParameter("B", 1)],
      type_a_readings: observations?.type_a_readings ?? [],
    };
  }, [observations, specifications?.basic_size]);

  /* --- Proper hydration using reset (standard RHF) --- */
useEffect(() => {
  if (hasHydratedRef.current) return;

  reset({ observations: normalizedObservations });

  PARAMS.forEach((_, index) => {
    unregister(`observations.parameters.${index}.mean_size_xy` as any);
    unregister(`observations.parameters.${index}.mean_size` as any);
  });

  hasHydratedRef.current = true;
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  /* --- Watch readings for derived averages --- */
  const parameters = useWatch({
    control,
    name: "observations.parameters",
    defaultValue: normalizedObservations.parameters,
  });

  
  // Auto-calculate mean from readings - stabilized version
  useEffect(() => {
    // Skip if we're already updating to prevent loops
    if (isUpdatingRef.current) {
      isUpdatingRef.current = false;
      return;
    }

    parameters?.forEach((param, index) => {
      ['x', 'y'].forEach((axis) => {
        // Skip if user is currently editing the mean field
        if (meanEditingRef.current[`${index}-${axis}`]) {
          return;
        }

        const readings = param?.[axis as 'x' | 'y']?.readings ?? [];
        const meanPath = `observations.parameters.${index}.${axis}.mean`;
        const manualKey = `${index}-${axis}`;
        
        // Check if we have valid readings
        const validReadings = readings.filter(r => r !== "" && r !== null && r !== undefined);
        const hasValidReadings = validReadings.length > 0 && validReadings.every(r => parseNumber(r) !== null);
        
        // Get current mean value
        const currentMeanValue = getValues(meanPath as any);
        const currentMean = parseNumber(currentMeanValue);
        
        if (!hasValidReadings) {
          // Clear mean if no valid readings
          if (currentMeanValue !== "") {
            isUpdatingRef.current = true;
            setValue(meanPath as any, "", { shouldDirty: true });
          }
          return;
        }

        // Calculate mean from readings
        const calculatedMean = calculateMeanFromReadings(readings);

        if (calculatedMean !== null) {
          // Only update if:
          // 1. Current mean is empty/invalid, OR
          // 2. User hasn't manually set this mean, AND
          // 3. Calculated mean is different from current mean
          const shouldUpdate = 
            currentMean === null || 
            currentMeanValue === "" || 
            (!meanManuallySetRef.current[manualKey] && Math.abs((currentMean || 0) - calculatedMean) > 0.00001);

          if (shouldUpdate) {
            isUpdatingRef.current = true;
            setValue(meanPath as any, calculatedMean, { shouldDirty: true });
            // Reset manual flag when auto-calculating
            meanManuallySetRef.current[manualKey] = false;
          }
        }
      });
    });
  }, [parameters]);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[1320px] border-collapse">
          <thead>
            <tr className="bg-gray-800 text-xs font-semibold uppercase tracking-wide">
              <th rowSpan={2} className="border border-gray-700 px-3 py-3 text-center min-w-[150px] text-white">
                Specification Size (mm)
              </th>
              <th rowSpan={2} className="border border-gray-700 px-3 py-3 text-center min-w-[150px] text-white">
                Observed Size (mm)
              </th>
              <th rowSpan={2} className="border border-gray-700 px-3 py-3 text-center min-w-[100px] text-white">
                Parameter
              </th>
              <th colSpan={4} className=" px-3 py-3 text-center bg-yellow-50">
                X (mm)
              </th>
              <th colSpan={4} className="px-3 py-3 text-center bg-blue-50">
                Y (mm)
              </th>
            </tr>
            <tr className="bg-gray-700 text-white text-xs font-semibold uppercase">
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 1</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 2</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 3</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[130px]">Mean</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 1</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 2</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[120px]">Reading 3</th>
              <th className="border border-gray-600 px-2 py-2 text-center min-w-[130px]">Mean</th>
            </tr>
          </thead>

          <tbody className="text-sm">
            {PARAMS.map((p, i) => (
              <tr key={p} className="hover:bg-gray-50">
                {/* Specification Size */}
                {i === 0 && (
                  <td rowSpan={2} className="border border-gray-200 px-3 py-4 align-middle bg-gray-50">
                    <Controller
                      control={control}
                      name="observations.basic_size"
                      render={({ field }) => (
                        <Input
                          type="number"
                          value={
                            field.value !== undefined && field.value !== null
                              ? String(field.value)
                              : String(specifications?.basic_size ?? "")
                          }
                          isDisabled
                          classNames={{
                            inputWrapper: "h-10 border-1 border-gray-300 bg-gray-100",
                            input: "text-sm text-center font-medium",
                          }}
                        />
                      )}
                    />
                  </td>
                )}

                {/* Observed Size */}
                {i === 0 && (
                  <td rowSpan={2} className="border border-gray-200 px-3 py-4 align-middle bg-gray-50">
                    <Controller
                      control={control}
                      name="observations.observed_size"
                      render={({ field }) => (
                        <Input
                          type="number"
                          value={String(field.value ?? "")}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? undefined
                                : toNumberOrUndefined(e.target.value)
                            )
                          }
                          isDisabled={isReadOnly}
                          classNames={{
                            inputWrapper: "h-10 border-1 border-gray-300 bg-white",
                            input: "text-sm text-center font-medium",
                          }}
                        />
                      )}
                    />
                  </td>
                )}

                <td className="border border-gray-200 px-3 py-4 text-center font-semibold bg-gray-50">
                  {p}
                </td>

                {[0, 1, 2].map((idx) => (
                  <td key={`x-${p}-${idx}`} className="border border-gray-200 px-2 py-2 bg-yellow-50">
                    <Controller
                      control={control}
                      name={`observations.parameters.${i}.x.readings.${idx}`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="any"
                          value={field.value?.toString() ?? ""}
                          onChange={(e) => field.onChange(e)}
                          isDisabled={isReadOnly}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-white",
                            input: "text-sm text-center",
                          }}
                          placeholder="0.000"
                        />
                      )}
                    />
                  </td>
                ))}

                <td className="border border-gray-200 px-2 py-2 bg-yellow-100">
                  <Controller
                    control={control}
                    name={`observations.parameters.${i}.x.mean` as any}
                    render={({ field }) => (
                      <Input
                        type="text"
                        inputMode="decimal"
                        isDisabled={isReadOnly}
                        value={field.value?.toString() ?? ""}
                        classNames={{
                          inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                          input: "text-sm text-center font-semibold",
                        }}
                        placeholder="0.000"
                        onFocus={() => {
                          meanEditingRef.current[`${i}-x`] = true;
                        }}
                        onBlur={(e) => {
                          meanEditingRef.current[`${i}-x`] = false;
                          field.onBlur();

                          if (isReadOnly) return;

                          const meanValue = parseNumber(e.target.value);
                          
                          // If mean is cleared, clear all readings and reset manual flag
                          if (meanValue === null) {
                            setValue(`observations.parameters.${i}.x.readings.0` as any, "", { shouldDirty: true });
                            setValue(`observations.parameters.${i}.x.readings.1` as any, "", { shouldDirty: true });
                            setValue(`observations.parameters.${i}.x.readings.2` as any, "", { shouldDirty: true });
                            meanManuallySetRef.current[`${i}-x`] = false;
                            return;
                          }

                          // Mark that user manually set this mean
                          meanManuallySetRef.current[`${i}-x`] = true;

                          // Always generate readings when mean has a value
                          const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                            deltas: [0.001, 0.002],
                          });

                          setValue(`observations.parameters.${i}.x.readings.0` as any, r1, { shouldDirty: true });
                          setValue(`observations.parameters.${i}.x.readings.1` as any, r2, { shouldDirty: true });
                          setValue(`observations.parameters.${i}.x.readings.2` as any, r3, { shouldDirty: true });
                        }}
                        onChange={(e) => field.onChange(e)}
                      />
                    )}
                  />
                </td>

                
                {[0, 1, 2].map((idx) => (
                  <td key={`y-${p}-${idx}`} className="border border-gray-200 px-2 py-2 bg-blue-50">
                    <Controller
                      control={control}
                      name={`observations.parameters.${i}.y.readings.${idx}`}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="any"
                          value={field.value?.toString() ?? ""}
                          onChange={(e) => field.onChange(e)}
                          isDisabled={isReadOnly}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-white",
                            input: "text-sm text-center",
                          }}
                          placeholder="0.000"
                        />
                      )}
                    />
                  </td>
                ))}

                <td className="border border-gray-200 px-2 py-2 bg-blue-100">
                  <Controller
                    control={control}
                    name={`observations.parameters.${i}.y.mean` as any}
                    render={({ field }) => (
                      <Input
                        type="text"
                        inputMode="decimal"
                        isDisabled={isReadOnly}
                        value={field.value?.toString() ?? ""}
                        classNames={{
                          inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                          input: "text-sm text-center font-semibold",
                        }}
                        placeholder="0.000"
                        onFocus={() => {
                          meanEditingRef.current[`${i}-y`] = true;
                        }}
                        onBlur={(e) => {
                          meanEditingRef.current[`${i}-y`] = false;
                          field.onBlur();

                          if (isReadOnly) return;

                          const meanValue = parseNumber(e.target.value);
                          
                          // If mean is cleared, clear all readings and reset manual flag
                          if (meanValue === null) {
                            setValue(`observations.parameters.${i}.y.readings.0` as any, "", { shouldDirty: true });
                            setValue(`observations.parameters.${i}.y.readings.1` as any, "", { shouldDirty: true });
                            setValue(`observations.parameters.${i}.y.readings.2` as any, "", { shouldDirty: true });
                            meanManuallySetRef.current[`${i}-y`] = false;
                            return;
                          }

                          // Mark that user manually set this mean
                          meanManuallySetRef.current[`${i}-y`] = true;

                          // Always generate readings when mean has a value
                          const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                            deltas: [0.001, 0.002],
                          });

                          setValue(`observations.parameters.${i}.y.readings.0` as any, r1, { shouldDirty: true });
                          setValue(`observations.parameters.${i}.y.readings.1` as any, r2, { shouldDirty: true });
                          setValue(`observations.parameters.${i}.y.readings.2` as any, r3, { shouldDirty: true });
                        }}
                        onChange={(e) => field.onChange(e)}
                      />
                    )}
                  />
                </td>

                
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TypeAReadingSection
        observations={{ type_a_readings: observations?.type_a_readings ?? [] }}
      />
    </div>
  );
}
