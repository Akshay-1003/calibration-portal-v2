"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import {
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type { ComparatorStandObservations, ComparatorStandParameter } from "../observationSchemas";

interface Props {
  observations?: ComparatorStandObservations;
  isReadOnly?: boolean;
  sectionTitle?: string;
}

const COMPARATOR_STAND_PARAMETERS = ["Flatness of Base"] as const;

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeRows = (observations?: ComparatorStandObservations): ComparatorStandParameter[] => {
  const sourceRows = observations?.parameters ?? [];

  return COMPARATOR_STAND_PARAMETERS.map((parameter, index) => {
    const incoming = sourceRows[index];

    if (incoming) {
      return {
        parameter,
        readings: incoming.readings ?? ["", "", ""],
        mean: incoming.mean ?? "",
      };
    }

    return {
      parameter,
      readings: ["", "", ""],
      mean: "",
    };
  });
};

export function ComparatorStandCalibration({
  observations: initialObservations,
  isReadOnly = false,
  sectionTitle = "Working Flatness of Base",
}: Props) {
  const { control, setValue, getValues } = useFormContext();

  const normalizedRows = useMemo(() => normalizeRows(initialObservations), [initialObservations]);
  const initializedKeyRef = useRef<string | null>(null);
  const meanEditingRef = useRef<Record<number, boolean>>({});

  const { replace } = useFieldArray({
    control,
    name: "observations.parameters",
  });

  const rows = useWatch({
    control,
    name: "observations.parameters",
    defaultValue: [],
  }) as ComparatorStandParameter[];

  useEffect(() => {
    const hydrateKey = JSON.stringify(normalizedRows);
    const hasFormRows = Array.isArray(rows) && rows.length > 0;

    if (initializedKeyRef.current === hydrateKey && hasFormRows) {
      return;
    }

    replace(normalizedRows);
    initializedKeyRef.current = hydrateKey;
  }, [normalizedRows, replace, rows]);

  useEffect(() => {
    rows.forEach((row, index) => {
      if (meanEditingRef.current[index]) return;

      const meanPath = `observations.parameters.${index}.mean` as const;
      const mean = calculateMeanFromReadings(row?.readings ?? [], 4);

      if (mean !== null) {
        const nextMean = mean.toFixed(4);
        const currentMean = String(getValues(meanPath) ?? "");

        if (currentMean !== nextMean) {
          setValue(meanPath, nextMean, { shouldDirty: true });
        }
        return;
      }

      if (getValues(meanPath) !== "") {
        setValue(meanPath, "", { shouldDirty: true });
      }
    });
  }, [rows, getValues, setValue]);

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="px-4 py-2">
          <h3 className="text-sm font-bold uppercase tracking-wide">Observations</h3>
        </div>

        <div className="p-2 space-y-4">
          <div className="border border-gray-300 bg-white overflow-hidden rounded-md">
            <div className="bg-slate-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wide">
              {sectionTitle}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-r border-gray-200">
                    Parameter
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-r border-gray-200">
                    Reading 1 (mm)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-r border-gray-200">
                    Reading 2 (mm)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase border-r border-gray-200">
                    Reading 3 (mm)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                    Observed Size Mean (mm)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-3 py-3 border-r border-gray-200 text-sm font-medium text-gray-800">
                      {row.parameter || COMPARATOR_STAND_PARAMETERS[index]}
                    </td>
                    {[0, 1, 2].map((readingIndex) => (
                      <td key={readingIndex} className="px-3 py-3 border-r border-gray-200">
                        <Controller
                          name={`observations.parameters.${index}.readings.${readingIndex}`}
                          control={control}
                          defaultValue=""
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="number"
                              step="any"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-10 bg-white border border-gray-300 rounded-none",
                                input: "text-sm text-center",
                              }}
                              placeholder="0.0000"
                            />
                          )}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 bg-gray-100">
                      <Controller
                        name={`observations.parameters.${index}.mean`}
                        control={control}
                        defaultValue={row.mean ?? ""}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={toDisplay(field.value)}
                            type="text"
                            inputMode="decimal"
                            isDisabled={isReadOnly}
                            placeholder="0.0000"
                            classNames={{
                              inputWrapper: "h-10 bg-gray-100 border border-gray-300 rounded-none",
                              input: "text-sm text-center font-semibold",
                            }}
                            onFocus={() => {
                              meanEditingRef.current[index] = true;
                            }}
                            onBlur={(e) => {
                              meanEditingRef.current[index] = false;
                              field.onBlur();

                              if (isReadOnly) return;

                              const hasAnyReading = (row.readings ?? []).some(
                                (value) => parseNumber(value) !== null
                              );
                              if (hasAnyReading) return;

                              const meanValue = parseNumber(e.target.value);
                              if (meanValue === null) return;

                              const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                                decimals: 4,
                                deltas: [0.001, 0.002],
                              });

                              setValue(`observations.parameters.${index}.readings.0`, r1, { shouldDirty: true });
                              setValue(`observations.parameters.${index}.readings.1`, r2, { shouldDirty: true });
                              setValue(`observations.parameters.${index}.readings.2`, r3, { shouldDirty: true });
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
        </div>

        <div className="bg-white p-0">
          <TypeAReadingSection
            disabled={isReadOnly}
            observations={{ type_a_readings: initialObservations?.type_a_readings ?? [] }}
            note={false}
          />
        </div>
      </div>
    </div>
    </>
  );
}

ComparatorStandCalibration.displayName = "ComparatorStandCalibration";
