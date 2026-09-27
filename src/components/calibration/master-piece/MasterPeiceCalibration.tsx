import React, { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import {
  calculateMeanFromReadings,
  calculateObservedError,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type { MasterPieceObservations, MasterPieceRow, MasterPieceForm } from "../observationSchemas";

type MasterPieceSpecifications =
  | {
      basic_size?: Array<number | string> | number | string;
    }
  | Array<number | string>
  | null
  | undefined;

export interface GaugeCalibrationProps {
  onCancel: () => void;
  isReadOnly?: boolean;
  observations: MasterPieceObservations;
  specifications: MasterPieceSpecifications;
}

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeSpecifications = (specifications: MasterPieceSpecifications): Array<string | number> => {
  if (Array.isArray(specifications)) {
    return specifications;
  }

  if (!specifications || typeof specifications !== "object") {
    return [];
  }

  const basicSize = specifications.basic_size;

  if (Array.isArray(basicSize)) {
    return basicSize;
  }

  if (basicSize !== undefined && basicSize !== null && basicSize !== "") {
    return [basicSize];
  }

  return [];
};

const emptyRow = (basicSize: string | number = ""): MasterPieceRow => ({
  basic_size: basicSize,
  readings: ["", "", ""],
  mean: "",
  observed_error: "",
});

const normalizeRowsFromObservations = (
  source: MasterPieceObservations | undefined,
  specs: Array<string | number>
): MasterPieceRow[] => {
  const mappedRows = (Array.isArray(source?.readings) ? source.readings : []).map((row, index) => ({
    basic_size: row.basic_size ?? specs[index] ?? "",
    readings: row.readings ?? ["", "", ""],
    mean: row.mean ?? "",
    observed_error: row.observed_error ?? "",
  }));

  if (mappedRows.length > 0) {
    if (mappedRows.length >= specs.length) {
      return mappedRows;
    }

    const missingSpecRows = specs.slice(mappedRows.length).map((basicSize) => emptyRow(basicSize));
    return [...mappedRows, ...missingSpecRows];
  }

  if (specs.length > 0) {
    return specs.map((basicSize) => emptyRow(basicSize));
  }

  return [emptyRow()];
};

export const MasterPeiceCalibration: React.FC<GaugeCalibrationProps> = ({
  isReadOnly,
  observations,
  specifications,
}) => {
  const readingColumns = [1, 2, 3] as const;
  const { control, setValue, getValues } = useFormContext<MasterPieceForm>();
  const specificationSizes = useMemo(() => normalizeSpecifications(specifications), [specifications]);
  const normalizedRows = useMemo(
    () => normalizeRowsFromObservations(observations, specificationSizes),
    [observations, specificationSizes]
  );

  const { replace } = useFieldArray({
    control,
    name: "observations.readings",
  });

  const parameterRows = useWatch({
    control,
    name: "observations.readings",
    defaultValue: [],
  }) as MasterPieceRow[];

  const initializedKeyRef = useRef<string | null>(null);
  const meanEditingRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    const hydrateKey = JSON.stringify({
      specs: specificationSizes,
      rows: normalizedRows,
    });

    const hasFormRows = Array.isArray(parameterRows) && parameterRows.length > 0;

    // Avoid unnecessary replace, but recover if another reset emptied rows.
    if (initializedKeyRef.current === hydrateKey && hasFormRows) {
      return;
    }

    replace(normalizedRows);
    initializedKeyRef.current = hydrateKey;
  }, [specificationSizes, normalizedRows, replace, parameterRows]);

  // Auto-calculate mean from readings
  useEffect(() => {
    parameterRows.forEach((row, index) => {
      // Skip if user is currently editing the mean field
      if (meanEditingRef.current[index]) {
        return;
      }

      const readings = row?.readings ?? [];
      const meanPath = `observations.readings.${index}.mean` as const;
      
      // Calculate mean from readings
      const calculatedMean = calculateMeanFromReadings(readings, 4);
      const currentMean = parseNumber(getValues(meanPath));

      if (calculatedMean !== null) {
        // Update mean if it's different from current value
        if (currentMean === null || Math.abs(currentMean - calculatedMean) > 0.00001) {
          setValue(meanPath, calculatedMean, { shouldDirty: true });
        }
      } else {
        // Clear mean if readings are invalid
        const allReadingsEmpty = readings.every((r) => r === "" || r === null || r === undefined);
        if (allReadingsEmpty && currentMean !== null && getValues(meanPath) !== "") {
          setValue(meanPath, "", { shouldDirty: true });
        }
      }
    });
  }, [parameterRows, getValues, setValue]);

  // Auto-calculate error from mean and basic size
  useEffect(() => {
    parameterRows.forEach((row, index) => {
      const basicSize = parseNumber(row?.basic_size ?? specificationSizes[index]);
      const meanValue = parseNumber(row?.mean);
      const errorPath = `observations.readings.${index}.observed_error` as const;

      if (basicSize !== null && meanValue !== null) {
        const error = calculateObservedError(basicSize, meanValue, {
          mode: "mean-minus-measured",
          decimals: 3,
        });
        const currentError = parseNumber(getValues(errorPath));

        if (
          error !== null &&
          (currentError === null || Number(currentError.toFixed(3)) !== error)
        ) {
          setValue(errorPath, error, { shouldDirty: true });
        }
      } else if (getValues(errorPath) !== "") {
        setValue(errorPath, "", { shouldDirty: true });
      }
    });
  }, [parameterRows, specificationSizes, getValues, setValue]);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] border-collapse">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Spec
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Reading 1
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Reading 2
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Reading 3
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Mean
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parameterRows.map((row, index) => (
              <tr key={`master-piece-row-${index}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 bg-gray-100 border-r border-gray-200">
                  <Controller
                    control={control}
                    name={`observations.readings.${index}.basic_size` as const}
                    defaultValue={row.basic_size ?? specificationSizes[index] ?? ""}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={toDisplay(field.value ?? specificationSizes[index] ?? "")}
                        isReadOnly
                        classNames={{
                          inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                          input: "text-sm text-center font-medium",
                        }}
                      />
                    )}
                  />
                </td>

                {readingColumns.map((readingNo) => {
                  const readingIndex = readingNo - 1;
                  return (
                    <td key={readingNo} className="px-3 py-2 border-r border-gray-200 bg-yellow-50">
                      <Controller
                        control={control}
                        name={`observations.readings.${index}.readings.${readingIndex}` as const}
                        defaultValue={row.readings?.[readingIndex] ?? ""}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={toDisplay(field.value)}
                            type="number"
                            step="any"
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
                  );
                })}

                <td className="px-3 py-2 border-r border-gray-200 bg-yellow-100">
                  <Controller
                    control={control}
                    name={`observations.readings.${index}.mean` as const}
                    defaultValue={row.mean ?? ""}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="text"
                        inputMode="decimal"
                        isDisabled={isReadOnly}
                        value={toDisplay(field.value)}
                        classNames={{
                          inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                          input: "text-sm text-center font-semibold",
                        }}
                        placeholder="0.0000"
                        onFocus={() => {
                          meanEditingRef.current[index] = true;
                        }}
                        onBlur={(e) => {
                          meanEditingRef.current[index] = false;
                          field.onBlur();

                          if (isReadOnly) return;

                          const hasAnyReading = (row?.readings ?? []).some(
                            (value) => parseNumber(value) !== null
                          );

                          if (hasAnyReading) return;

                          const meanValue = parseNumber(e.target.value);
                          if (meanValue === null) return;

                          const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                            decimals: 4,
                            deltas: [0.001, 0.002],
                          });

                          setValue(`observations.readings.${index}.readings.0`, r1, { shouldDirty: true });
                          setValue(`observations.readings.${index}.readings.1`, r2, { shouldDirty: true });
                          setValue(`observations.readings.${index}.readings.2`, r3, { shouldDirty: true });
                        }}
                        onChange={(e) => field.onChange(e)}
                      />
                    )}
                  />
                </td>

                <td className="px-3 py-2 bg-yellow-100">
                  <Controller
                    control={control}
                    name={`observations.readings.${index}.observed_error` as const}
                    defaultValue={row.observed_error ?? ""}
                    render={({ field }) => (
                      <Input
                        {...field}
                        isReadOnly
                        value={toDisplay(field.value)}
                        classNames={{
                          inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                          input: "text-sm text-center font-semibold",
                        }}
                        placeholder="0.000"
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
        disabled={isReadOnly}
        observations={{ type_a_readings: observations?.type_a_readings ?? [] }}
        note={false}
      />
    </div>
  );
};

MasterPeiceCalibration.displayName = "MasterPeiceCalibration";
