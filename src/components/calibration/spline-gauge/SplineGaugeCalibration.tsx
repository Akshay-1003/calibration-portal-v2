"use client";

import { useEffect } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import type { SplineGaugeObservations, SplineReadingRow } from "../observationSchemas";

type SplineSpecifications = {
  numberOfSplines?: string | number;
  majorDiameterMin?: string | number;
  majorDiameterMax?: string | number;
  dimensionOverPinMin?: string | number;
  dimensionOverPinMax?: string | number;
  pinDiameter?: string | number;
  diameterBetweenPin?: string | number;
};

interface Props {
  observations?: SplineGaugeObservations;
  specifications?: SplineSpecifications;
  isReadOnly?: boolean;
}

const ROWS: Array<{ key: string; parameter: string; hasReadings: boolean }> = [
  { key: "no_of_splines_z", parameter: "No. of Splines -Z", hasReadings: false },
  { key: "major_diameter", parameter: "Major Diameter", hasReadings: true },
  { key: "dimension_over_pin_s1", parameter: "Diamention Over Pin -S1", hasReadings: true },
  { key: "pin_diameter_d1", parameter: "Pin Diameter -d1", hasReadings: false },
  { key: "diameter_between_pin", parameter: "Diameter Between Pin", hasReadings: false },
];

const toNum = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return Number(value);
};

const normalizeRows = (incoming: SplineReadingRow[] | undefined): SplineReadingRow[] => {
  return ROWS.map((row, index) => {
    const source = incoming?.[index];
    return {
      key: row.key,
      parameter: row.parameter,
      reading_1: source?.reading_1 ?? "",
      reading_2: source?.reading_2 ?? "",
      reading_3: source?.reading_3 ?? "",
      observed_mean: source?.observed_mean ?? "",
    };
  });
};

const specValue = (specifications: SplineSpecifications | undefined, key: string): string => {
  switch (key) {
    case "no_of_splines_z":
      return String(specifications?.numberOfSplines ?? "");
    case "major_diameter":
      return `${specifications?.majorDiameterMin ?? ""}${specifications?.majorDiameterMin !== undefined || specifications?.majorDiameterMax !== undefined ? " / " : ""}${specifications?.majorDiameterMax ?? ""}`.trim();
    case "dimension_over_pin_s1":
      return `${specifications?.dimensionOverPinMin ?? ""}${specifications?.dimensionOverPinMin !== undefined || specifications?.dimensionOverPinMax !== undefined ? " / " : ""}${specifications?.dimensionOverPinMax ?? ""}`.trim();
    case "pin_diameter_d1":
      return String(specifications?.pinDiameter ?? "");
    case "diameter_between_pin":
      return String(specifications?.diameterBetweenPin ?? "");
    default:
      return "";
  }
};

export function SplineGaugeCalibration({
  observations,
  specifications,
  isReadOnly = false,
}: Props) {
  const { control, setValue, getValues } = useFormContext();

  const rowFields = useFieldArray({
    control,
    name: "observations.spline_rows",
  });

  const rows = useWatch({
    control,
    name: "observations.spline_rows",
    defaultValue: [],
  }) as SplineReadingRow[];

  useEffect(() => {
    rowFields.replace(normalizeRows(observations?.spline_rows));
  }, [observations?.spline_rows, rowFields]);

  useEffect(() => {
    rows.forEach((row, index) => {
      const config = ROWS[index];
      if (!config?.hasReadings) return;

      const r1 = toNum(row?.reading_1);
      const r2 = toNum(row?.reading_2);
      const r3 = toNum(row?.reading_3);
      const path = `observations.spline_rows.${index}.observed_mean` as const;

      if (Number.isFinite(r1) && Number.isFinite(r2) && Number.isFinite(r3)) {
        const next = ((r1 + r2 + r3) / 3).toFixed(4);
        const current = getValues(path);
        if (String(current ?? "") !== next) {
          setValue(path, next, { shouldDirty: true });
        }
      }
    });
  }, [rows, getValues, setValue]);

  return (
    <>
      <div className="p-2 space-y-4">
          <div className="border border-gray-300 bg-white overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Parameter
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Specification Size
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Reading 1 (mm)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Reading 2 (mm)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Reading 3 (mm)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase">
                  Observed Size Mean (mm)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const config = ROWS[index];
                const readEnabled = !!config?.hasReadings;
                const yellowCell = readEnabled ? "bg-yellow-50" : "bg-gray-100";

                return (
                  <tr key={row.key || index} className="border-b border-gray-200">
                    <td className="px-4 py-3 bg-gray-100 text-sm text-gray-800 font-medium border-r border-gray-200 text-center">
                      {row.parameter}
                    </td>
                    <td className="px-3 bg-gray-100 border-r border-gray-200">
                      <Input
                        value={specValue(specifications, row.key)}
                        isReadOnly
                        classNames={{
                          inputWrapper: "h-10 bg-gray-100 border border-gray-300 rounded-none",
                          input: "text-sm",
                        }}
                        placeholder="-"
                      />
                    </td>

                    {[1, 2, 3].map((readingNo) => (
                      <td key={readingNo} className={`px-3 border-r border-gray-200 ${yellowCell}`}>
                        {readEnabled ? (
                          <Controller
                            name={`observations.spline_rows.${index}.reading_${readingNo}` as const}
                            control={control}
                            defaultValue={row[`reading_${readingNo}` as keyof SplineReadingRow] ?? ""}
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
                        ) : (
                          <div className="h-10 bg-gray-100 border border-gray-300 rounded-none" />
                        )}
                      </td>
                    ))}

                    <td className="px-3 bg-yellow-100">
                      <Controller
                        name={`observations.spline_rows.${index}.observed_mean` as const}
                        control={control}
                        defaultValue={row.observed_mean ?? ""}
                        render={({ field }) => (
                          <div className="space-y-1">
                            <Input
                              {...field}
                              type="number"
                              step="any"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-10 bg-white border border-gray-300 rounded-none",
                                input: "text-sm text-center font-medium",
                              }}
                              placeholder="0"
                            />
                            <p className="text-xs text-red-500 text-center font-semibold">
                              Keep 0 (zero) to hide this row
                            </p>
                          </div>
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

          <div className="bg-white p-0">
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

SplineGaugeCalibration.displayName = "SplineGaugeCalibration";
