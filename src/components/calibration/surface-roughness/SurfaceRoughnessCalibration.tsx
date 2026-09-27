"use client";

import { useEffect } from "react";
import { Checkbox, Input } from "@heroui/react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import type { SurfaceRoughnessObservations, SurfaceRoughnessRow } from "../observationSchemas";

interface Props {
  observations?: SurfaceRoughnessObservations;
  isReadOnly?: boolean;
}

const ROW_COUNT = 10;
const COLUMN_COUNT = 4;

const makeDefaultRows = (incoming?: SurfaceRoughnessRow[]): SurfaceRoughnessRow[] =>
  Array.from({ length: ROW_COUNT }, (_, i) => ({
    c1: incoming?.[i]?.c1 ?? "",
    c2: incoming?.[i]?.c2 ?? "",
    c3: incoming?.[i]?.c3 ?? "",
    c4: incoming?.[i]?.c4 ?? "",
  }));

const makeDefaultRaValues = (incoming?: Array<string | number>): string[] =>
  Array.from({ length: COLUMN_COUNT }, (_, i) =>
    incoming?.[i] !== undefined ? String(incoming[i]) : ""
  );

const makeDefaultPrintFlags = (incoming?: boolean[]): boolean[] =>
  Array.from({ length: COLUMN_COUNT }, (_, i) => incoming?.[i] ?? true);

export function SurfaceRoughnessCalibration({
  observations: initialObservations,
  isReadOnly = false,
}: Props) {
  const { control, setValue } = useFormContext();

  const rowsFieldArray = useFieldArray({
    control,
    name: "observations.surface_roughness.rows",
  });

  const rows = useWatch({
    control,
    name: "observations.surface_roughness.rows",
    defaultValue: [],
  }) as SurfaceRoughnessRow[];

  useEffect(() => {
    rowsFieldArray.replace(makeDefaultRows(initialObservations?.rows));

    const raValues = makeDefaultRaValues(initialObservations?.ra_values);
    const print = makeDefaultPrintFlags(initialObservations?.print);

    raValues.forEach((value, idx) => {
      setValue(`observations.surface_roughness.ra_values.${idx}`, value, { shouldDirty: false });
    });
    print.forEach((value, idx) => {
      setValue(`observations.surface_roughness.print.${idx}`, value, { shouldDirty: false });
    });
  }, [initialObservations?.rows, initialObservations?.ra_values, initialObservations?.print, rowsFieldArray, setValue]);

  const safeRows = rows.length === ROW_COUNT ? rows : makeDefaultRows(rows);

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-4 py-3.5 border-b border-blue-600">
          <h3 className="text-sm font-bold tracking-wide">Observations</h3>
        </div>

        <div className="p-4 space-y-4 bg-gray-100">
          <div className="border border-gray-300 bg-white overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse">
              <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-700">
                <th
                  rowSpan={2}
                  className="px-3 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600 w-[70px]"
                >
                  SN
                </th>

                {Array.from({ length: COLUMN_COUNT }, (_, col) => (
                  <th
                    key={`ra-head-${col}`}
                    className="px-3 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>RA VALUE</span>
                      <Controller
                        name={`observations.surface_roughness.ra_values.${col}` as const}
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                          <Input
                            {...field}
                            isReadOnly={isReadOnly}
                            classNames={{
                              inputWrapper: "h-8 w-[110px] bg-yellow-200 border border-gray-300 rounded-none",
                              input: "text-sm text-center font-semibold",
                            }}
                            placeholder="0"
                          />
                        )}
                      />
                      <span>MICROMETER</span>
                    </div>
                  </th>
                ))}
              </tr>

              <tr className="bg-gradient-to-r from-slate-900 to-slate-700">
                {Array.from({ length: COLUMN_COUNT }, (_, col) => (
                  <th
                    key={`print-head-${col}`}
                    className="px-3 py-2 text-center text-xs font-semibold text-white uppercase border-r border-slate-600"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>PRINT</span>
                      <Controller
                        name={`observations.surface_roughness.print.${col}` as const}
                        control={control}
                        defaultValue={true}
                        render={({ field }) => (
                          <Checkbox
                            isSelected={!!field.value}
                            onValueChange={field.onChange}
                            isDisabled={isReadOnly}
                            size="sm"
                          />
                        )}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {safeRows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`} className="border-b border-gray-200">
                  <td className="px-3 py-2 bg-gray-100 text-center text-sm font-medium border-r border-gray-200">
                    {rowIndex + 1}
                  </td>

                  {Array.from({ length: COLUMN_COUNT }, (_, colIndex) => (
                    <td
                      key={`cell-${rowIndex}-${colIndex}`}
                      className="px-3 py-2 bg-gray-100 border-r border-gray-200"
                    >
                      <Controller
                        name={`observations.surface_roughness.rows.${rowIndex}.c${colIndex + 1}` as const}
                        control={control}
                        defaultValue={row[`c${colIndex + 1}` as keyof SurfaceRoughnessRow] ?? ""}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-gray-300 max-w-[980px]">
          <div className="bg-gradient-to-r from-sky-600 to-sky-400 px-4 py-3 border-b border-sky-300">
            <h4 className="text-white text-sm font-bold uppercase tracking-wide">Type A Reading</h4>
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
    </div>
    </>
  );
}

SurfaceRoughnessCalibration.displayName = "SurfaceRoughnessCalibration";
