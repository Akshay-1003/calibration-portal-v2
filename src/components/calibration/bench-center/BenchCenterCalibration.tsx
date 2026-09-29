"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import {
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import type { BenchCenterObservations, BenchCenterParameter } from "../observationSchemas";

interface BenchCenterCalibrationProps {
  observations?: BenchCenterObservations;
  isReadOnly?: boolean;
}

const BENCH_CENTER_PARAMETERS = [
  "Flatness of Base",
  "Co-Axiality of the Center",
  "R/O Run Out",
] as const;

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeRows = (observations?: BenchCenterObservations): BenchCenterParameter[] => {
  const sourceRows = observations?.parameters ?? [];

  return BENCH_CENTER_PARAMETERS.map((parameter, index) => {
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

export function BenchCenterCalibration({
  observations,
  isReadOnly = false,
}: BenchCenterCalibrationProps) {
  const { control, setValue, getValues } = useFormContext();

  const normalizedRows = useMemo(() => normalizeRows(observations), [observations]);
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
  }) as BenchCenterParameter[];

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
        <div className="px-4 py-3.5">
          <h3 className="text-sm font-bold uppercase tracking-wide">Observations</h3>
        </div>

        <div className="space-y-4 bg-gray-100">
        <div className="border border-gray-300 bg-white overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-700">
                <th className="px-4 py-3 text-xs text-white border-r">Parameter</th>
                <th className="px-4 py-3 text-xs text-white border-r">Reading 1 (mm)</th>
                <th className="px-4 py-3 text-xs text-white border-r">Reading 2 (mm)</th>
                <th className="px-4 py-3 text-xs text-white border-r">Reading 3 (mm)</th>
                <th className="px-4 py-3 text-xs text-white">Observed Size Mean (mm)</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="px-4 py-3 bg-gray-100 text-center text-sm font-medium">
                    {row.parameter}
                  </td>

                  {[0, 1, 2].map((readingIndex) => (
                    <td key={readingIndex} className="px-3 py-2 bg-yellow-50">
                      <Controller
                        control={control}
                        name={`observations.parameters.${index}.readings.${readingIndex}`}
                        defaultValue={row.readings?.[readingIndex] ?? ""}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={toDisplay(field.value)}
                            type="number"
                            step="any"
                            disabled={isReadOnly}
                            placeholder="0.0000"
                            className="h-10 rounded-none border border-gray-300 bg-white text-center text-sm"
                          />
                        )}
                      />
                    </td>
                  ))}

                  <td className="px-3 py-2 bg-yellow-100">
                    <Controller
                      control={control}
                      name={`observations.parameters.${index}.mean`}
                      defaultValue={row.mean ?? ""}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={toDisplay(field.value)}
                          type="text"
                          inputMode="decimal"
                          disabled={isReadOnly}
                          placeholder="0.0000"
                          className="h-10 rounded-none border border-gray-300 bg-gray-100 text-center text-sm font-semibold"
                          onFocus={() => {
                            meanEditingRef.current[index] = true;
                          }}
                          onBlur={(e) => {
                            meanEditingRef.current[index] = false;
                            field.onBlur();

                            const meanValue = parseNumber(e.target.value);

                            if (meanValue !== null) {
                              const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                                decimals: 4,
                                deltas: [0.001, 0.002],
                              });

                              setValue(`observations.parameters.${index}.readings.0`, r1);
                              setValue(`observations.parameters.${index}.readings.1`, r2);
                              setValue(`observations.parameters.${index}.readings.2`, r3);
                            }
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
          disabled={isReadOnly}
          observations={{ type_a_readings: observations?.type_a_readings ?? [] }}
          note={false}
        />
      </div>
    </div>
    </>
  );
}

BenchCenterCalibration.displayName = "BenchCenterCalibration";
