"use client";

import { useEffect, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import {
  calculateMeanFromReadings,
  generateReadingsFromMean,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type { VBlockObservations, VBlockReadingRow } from "../observationSchemas";
import { DEFAULT_VBLOCK_OBSERVATIONS } from "../observationSchemas";

interface Props {
  observations?: VBlockObservations;
  isReadOnly?: boolean;
}

const V_BLOCK_PARAMETERS = [
  "Vee Axis Parallelism w.r.t Face B (Big V)",
  "Vee Axis Parallelism w.r.t Face C (Big V)",
  "Vee Axis Parallelism w.r.t Face D (Big V)",
  "Symmetricity of Big V",
  "Vee Axis Parallelism w.r.t Face A (Small V)",
  "Vee Axis Parallelism w.r.t Face C (Small V)",
  "Vee Axis Parallelism w.r.t Face D (Small V)",
  "Symmetricity of Small V",
  "Parallelism of Face A w.r.t Face B",
  "Perpendicularity/Squareness of the face of V Block",
];

const ANGLE_PLATE_PARAMETERS = [
  "Flatness of working face",
  "Squareness of adjacent face over Dimention H",
  "Parallelism of Opposite Face",
  "Squarness of end face w.r.t. Exterior Face",
];

const toNum = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return Number.NaN;
  return Number(value);
};
void toNum;

const normalizeRows = (
  incoming: VBlockReadingRow[] | undefined,
  defaults: string[]
): VBlockReadingRow[] => {
  return defaults.map((parameter, index) => {
    const row = incoming?.[index];
    return {
      parameter,
      reading_1: row?.reading_1 ?? "",
      reading_2: row?.reading_2 ?? "",
      reading_3: row?.reading_3 ?? "",
      observed_mean: row?.observed_mean ?? "",
    };
  });
};

export function VBlockCalibration({ observations, isReadOnly = false }: Props) {
  const { control, setValue, getValues } = useFormContext();
  const safeObservations = observations ?? DEFAULT_VBLOCK_OBSERVATIONS;

  const { replace: replaceVBlock } = useFieldArray({
    control,
    name: "observations.v_block_readings",
  });

  const { replace: replaceAnglePlate } = useFieldArray({
    control,
    name: "observations.angle_plate_readings",
  });

  const vBlockRows = useWatch({
    control,
    name: "observations.v_block_readings",
    defaultValue: [],
  }) as VBlockReadingRow[];

  const anglePlateRows = useWatch({
    control,
    name: "observations.angle_plate_readings",
    defaultValue: [],
  }) as VBlockReadingRow[];

  const meanEditingRef = useRef<Record<string, boolean>>({});

  const lastSeedRef = useRef<string | null>(null);

  useEffect(() => {
    const seedKey = JSON.stringify({
      v: safeObservations.v_block_readings ?? [],
      a: safeObservations.angle_plate_readings ?? [],
    });

    if (lastSeedRef.current === seedKey) return;

    const initialVBlock = normalizeRows(safeObservations.v_block_readings, V_BLOCK_PARAMETERS);
    const initialAnglePlate = normalizeRows(safeObservations.angle_plate_readings, ANGLE_PLATE_PARAMETERS);

    replaceVBlock(initialVBlock);
    replaceAnglePlate(initialAnglePlate);

    lastSeedRef.current = seedKey;
  }, [safeObservations.v_block_readings, safeObservations.angle_plate_readings, replaceVBlock, replaceAnglePlate]);

  useEffect(() => {
    vBlockRows.forEach((row, index) => {
      const editKey = `observations.v_block_readings-${index}`;
      if (meanEditingRef.current[editKey]) return;

      const mean = calculateMeanFromReadings(
        [row?.reading_1, row?.reading_2, row?.reading_3],
        4
      );

      const path = `observations.v_block_readings.${index}.observed_mean` as const;
      const current = getValues(path);

      if (mean !== null) {
        if (String(current ?? "") !== mean.toFixed(4)) {
          setValue(path, mean.toFixed(4), { shouldDirty: true });
        }
        return;
      }

      if (current !== "") {
        setValue(path, "", { shouldDirty: true });
      }
    });
  }, [vBlockRows, setValue, getValues]);

  useEffect(() => {
    anglePlateRows.forEach((row, index) => {
      const editKey = `observations.angle_plate_readings-${index}`;
      if (meanEditingRef.current[editKey]) return;

      const mean = calculateMeanFromReadings(
        [row?.reading_1, row?.reading_2, row?.reading_3],
        4
      );

      const path = `observations.angle_plate_readings.${index}.observed_mean` as const;
      const current = getValues(path);

      if (mean !== null) {
        if (String(current ?? "") !== mean.toFixed(4)) {
          setValue(path, mean.toFixed(4), { shouldDirty: true });
        }
        return;
      }

      if (current !== "") {
        setValue(path, "", { shouldDirty: true });
      }
    });
  }, [anglePlateRows, setValue, getValues]);

  const renderRows = (basePath: "observations.v_block_readings" | "observations.angle_plate_readings", rows: VBlockReadingRow[]) => {
    return rows.map((row, index) => (
      <tr key={`${basePath}-${index}`} className="border-b border-gray-200">
        <td className="px-4 py-3 bg-gray-100 text-center text-sm text-gray-800 font-medium border-r border-gray-200">
          {row.parameter}
        </td>

        {[1, 2, 3].map((readingNo) => (
          <td key={readingNo} className="px-3 py-2 bg-yellow-50 border-r border-gray-200">
            <Controller
              name={`${basePath}.${index}.reading_${readingNo}` as const}
              control={control}
              defaultValue={row[`reading_${readingNo}` as keyof VBlockReadingRow] ?? ""}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  className="h-10 rounded-none border border-gray-300 bg-white text-center text-sm"
                  placeholder="0.0000"
                />
              )}
            />
          </td>
        ))}

        <td className="px-3 py-2 bg-yellow-100">
          <Controller
            name={`${basePath}.${index}.observed_mean` as const}
            control={control}
            defaultValue={row.observed_mean ?? ""}
            render={({ field }) => (
              <Input
                {...field}
                disabled={isReadOnly}
                type="text"
                inputMode="decimal"
                className="h-10 rounded-none border border-gray-300 bg-white text-center text-sm font-semibold"
                placeholder="0.0000"
                onFocus={() => {
                  meanEditingRef.current[`${basePath}-${index}`] = true;
                }}
                onBlur={(event) => {
                  meanEditingRef.current[`${basePath}-${index}`] = false;
                  field.onBlur();

                  if (isReadOnly) return;

                  const meanValue = parseNumber(event.target.value);
                  if (meanValue === null) return;

                  const hasAnyReading = [
                    row?.reading_1,
                    row?.reading_2,
                    row?.reading_3,
                  ].some((value) => parseNumber(value) !== null);

                  if (hasAnyReading) return;

                  const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                    decimals: 4,
                    deltas: [0.001, 0.002],
                  });

                  setValue(`${basePath}.${index}.reading_1`, r1, { shouldDirty: true });
                  setValue(`${basePath}.${index}.reading_2`, r2, { shouldDirty: true });
                  setValue(`${basePath}.${index}.reading_3`, r3, { shouldDirty: true });
                }}
                onChange={(event) => {
                  field.onChange(event);
                  meanEditingRef.current[`${basePath}-${index}`] = true;
                }}
              />
            )}
          />
        </td>
      </tr>
    ));
  };

  return (
    <>
      <div className="overflow-hidden bg-white shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide">Observations</h3>

        <div className="p-2 space-y-4 bg-white">
          <div className="border border-gray-300 bg-white overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-900 to-slate-700">
                <th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-r border-slate-600">
                  Parameter
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
            <tbody>{renderRows("observations.v_block_readings", vBlockRows)}</tbody>
          </table>
        </div>

        <div className="border border-gray-300 bg-white overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-700">
                <th
                  colSpan={5}
                  className="px-4 py-3 text-center text-xs font-semibold text-white uppercase border-slate-600"
                >
                  Angle Plate Reading
                </th>
              </tr>
            </thead>
            <tbody>{renderRows("observations.angle_plate_readings", anglePlateRows)}</tbody>
          </table>
        </div>


        <TypeAReadingSection
          disabled={isReadOnly}
              observations={{ type_a_readings: safeObservations.type_a_readings ?? [] }}
          note={false}
        />

      </div>
    </div>
    </>
  );
}

VBlockCalibration.displayName = "VBlockCalibration";
