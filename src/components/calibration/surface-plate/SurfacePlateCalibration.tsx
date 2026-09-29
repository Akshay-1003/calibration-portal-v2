"use client";

import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input, Spinner } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import type { SurfacePlateObservations } from "../observationSchemas";
import { useSurfacePlateReferenceStandardDetailQuery } from "../../../hooks/queries/surfacePlateReferenceStandards";
import { type SurfacePlateReferenceStandardRecord } from "../../../types/surfacePlateReferenceStandards";
import { generateSurfacePlateGrid } from "../../../utils/surfacePlateGrid";

type SurfacePlateSpecs = {
  surface_material?: "granite" | "cast_iron" | "steel" | "";
  surface_plate_ref_id?: string;
  length?: string | number;
  width?: string | number;
  block_size?: string | number;
  lc?: string | number;
  method?: string;
  grade?: string;
};

type CalibrationFormValues = {
  observations: SurfacePlateObservations;
  specifications?: SurfacePlateSpecs;
};

interface Props {
  observations?: SurfacePlateObservations;
  specifications?: SurfacePlateSpecs;
  isReadOnly?: boolean;
}

type SurfacePlateReadingPoint = {
  row_index: number;
  col_index: number;
  x: number;
  y: number;
  value: string | number;
};

const numericInputPattern = /^-?\d*\.?\d*$/;

const toDisplayValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? "" : String(value);

const toReadingValue = (value: string): string | number => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
};

const isReadingPoint = (value: unknown): value is SurfacePlateReadingPoint => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.row_index === "number" &&
    typeof record.col_index === "number" &&
    "value" in record
  );
};

const buildEmptyMatrix = (rows: number, columns: number): string[][] =>
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => ""));

const buildMatrixFromReadings = (
  readings: unknown,
  fallbackGrid: unknown,
  rows: number,
  columns: number,
  xPositions: number[],
  yPositions: number[]
): string[][] => {
  const matrix = buildEmptyMatrix(rows, columns);

  if (Array.isArray(readings) && readings.every((entry) => Array.isArray(entry))) {
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) => {
        const row = Array.isArray(readings[rowIndex]) ? readings[rowIndex] : [];
        const value = row[columnIndex];
        return value === null || value === undefined ? "" : String(value);
      })
    );
  }

  if (Array.isArray(readings)) {
    readings.forEach((entry) => {
      if (!isReadingPoint(entry)) return;

      const rowIndex =
        entry.row_index >= 0 && entry.row_index < rows
          ? entry.row_index
          : yPositions.findIndex((position) => position === entry.y);
      const columnIndex =
        entry.col_index >= 0 && entry.col_index < columns
          ? entry.col_index
          : xPositions.findIndex((position) => position === entry.x);

      if (
        rowIndex >= 0 &&
        rowIndex < rows &&
        columnIndex >= 0 &&
        columnIndex < columns
      ) {
        matrix[rowIndex][columnIndex] =
          entry.value === null || entry.value === undefined ? "" : String(entry.value);
      }
    });

    return matrix;
  }

  if (Array.isArray(fallbackGrid) && fallbackGrid.every((entry) => Array.isArray(entry))) {
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) => {
        const row = Array.isArray(fallbackGrid[rowIndex]) ? fallbackGrid[rowIndex] : [];
        const value = row[columnIndex];
        return value === null || value === undefined ? "" : String(value);
      })
    );
  }

  return matrix;
};

const serializeMatrixToReadings = (
  matrix: string[][],
  xPositions: number[],
  yPositions: number[]
): SurfacePlateReadingPoint[] =>
  matrix.flatMap((row, rowIndex) =>
    row.flatMap((cellValue, columnIndex) => {
      const normalizedValue = String(cellValue ?? "").trim();
      if (!normalizedValue) {
        return [];
      }

      return [
        {
          row_index: rowIndex,
          col_index: columnIndex,
          x: xPositions[columnIndex] ?? 0,
          y: yPositions[rowIndex] ?? 0,
          value: toReadingValue(normalizedValue),
        },
      ];
    })
  );

const sanitizeSurfacePlateObservations = (
  currentObservations: SurfacePlateObservations,
  readings: SurfacePlateReadingPoint[],
  surfacePlateRefId: string
): SurfacePlateObservations => {
  const nextObservations = {
    ...currentObservations,
    readings,
    surface_plate_ref_id: surfacePlateRefId,
  };

  delete nextObservations.grid;

  return nextObservations;
};

const getReferenceStandardSize = (
  referenceStandard: SurfacePlateReferenceStandardRecord | undefined,
  specifications: SurfacePlateSpecs | undefined
) => {
  if (referenceStandard) {
    return `${referenceStandard.length} x ${referenceStandard.width}`;
  }

  const length = toDisplayValue(specifications?.length).trim();
  const width = toDisplayValue(specifications?.width).trim();
  if (length && width) {
    return `${length} x ${width}`;
  }

  return "";
};

export function SurfacePlateCalibration({
  observations,
  isReadOnly = false,
  specifications,
}: Props) {
  const { control, getValues, setValue } = useFormContext<CalibrationFormValues>();

  const watchedSurfacePlateRefId = useWatch({
    control,
    name: "specifications.surface_plate_ref_id",
  });
  const watchedLength = useWatch({
    control,
    name: "specifications.length",
  });
  const watchedWidth = useWatch({
    control,
    name: "specifications.width",
  });
  const watchedBlockSize = useWatch({
    control,
    name: "specifications.block_size",
  });
  const watchedReadings = useWatch({
    control,
    name: "observations.readings",
  });

  const surfacePlateRefId = String(
    watchedSurfacePlateRefId ?? specifications?.surface_plate_ref_id ?? ""
  ).trim();

  const { data: referenceStandard, isLoading, error } =
    useSurfacePlateReferenceStandardDetailQuery(surfacePlateRefId || null, {
      enabled: Boolean(surfacePlateRefId),
    });

  const effectiveLength = watchedLength ?? specifications?.length ?? referenceStandard?.length ?? "";
  const effectiveWidth = watchedWidth ?? specifications?.width ?? referenceStandard?.width ?? "";
  const effectiveBlockSize = watchedBlockSize ?? specifications?.block_size ?? "";

  const gridDefinition = useMemo(
    () =>
      generateSurfacePlateGrid(
        referenceStandard?.length ?? effectiveLength,
        referenceStandard?.width ?? effectiveWidth,
        effectiveBlockSize
      ),
    [
      effectiveBlockSize,
      effectiveLength,
      effectiveWidth,
      referenceStandard?.length,
      referenceStandard?.width,
    ]
  );

  const readingsMatrix = useMemo(
    () =>
      buildMatrixFromReadings(
        watchedReadings ?? observations?.readings,
        observations?.grid,
        gridDefinition.yPoints,
        gridDefinition.xPoints,
        gridDefinition.xPositions,
        gridDefinition.yPositions
      ),
    [
      gridDefinition.xPoints,
      gridDefinition.xPositions,
      gridDefinition.yPoints,
      gridDefinition.yPositions,
      observations?.grid,
      observations?.readings,
      watchedReadings,
    ]
  );

  useEffect(() => {
    const nextReadings = serializeMatrixToReadings(
      readingsMatrix,
      gridDefinition.xPositions,
      gridDefinition.yPositions
    );
    const currentObservations = (getValues("observations") ?? {}) as SurfacePlateObservations;
    const sanitizedObservations = sanitizeSurfacePlateObservations(
      currentObservations,
      nextReadings,
      surfacePlateRefId
    );

    if (JSON.stringify(currentObservations) !== JSON.stringify(sanitizedObservations)) {
      setValue("observations", sanitizedObservations, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [
    getValues,
    gridDefinition.xPositions,
    gridDefinition.yPositions,
    readingsMatrix,
    setValue,
    surfacePlateRefId,
  ]);

  const hasGrid = gridDefinition.xPoints > 0 && gridDefinition.yPoints > 0;
  const referenceSize = getReferenceStandardSize(referenceStandard, {
    ...specifications,
    length: effectiveLength,
    width: effectiveWidth,
  });

  const updateReadingCell = (rowIndex: number, columnIndex: number, nextValue: string) => {
    const nextMatrix = readingsMatrix.map((row) => [...row]);
    nextMatrix[rowIndex][columnIndex] = nextValue;

    const nextReadings = serializeMatrixToReadings(
      nextMatrix,
      gridDefinition.xPositions,
      gridDefinition.yPositions
    );
    const currentObservations = (getValues("observations") ?? {}) as SurfacePlateObservations;
    const sanitizedObservations = sanitizeSurfacePlateObservations(
      currentObservations,
      nextReadings,
      surfacePlateRefId
    );

    setValue("observations", sanitizedObservations, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-blue-600 bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3.5 text-white">
          <h3 className="text-sm font-bold tracking-wide">Observations</h3>
        </div>

        <div className="space-y-5 p-4">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Reference Standard</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500">
                  <Spinner size="sm" />
                  Loading reference standard...
                </div>
              ) : error ? (
                <div className="px-4 py-6 text-sm text-red-600">
                  Failed to load the selected reference standard.
                </div>
              ) : referenceStandard ? (
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <th className="border-b border-slate-200 px-4 py-3">Size</th>
                      <th className="border-b border-slate-200 px-4 py-3">Grade 0</th>
                      <th className="border-b border-slate-200 px-4 py-3">Grade 1</th>
                      <th className="border-b border-slate-200 px-4 py-3">Grade 2</th>
                      <th className="border-b border-slate-200 px-4 py-3">Grade 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-sm text-slate-700">
                      <td className="border-b border-slate-200 px-4 py-3 font-medium">
                        {referenceStandard.length} x {referenceStandard.width}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {referenceStandard.tolerances.grade_0}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {referenceStandard.tolerances.grade_1}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {referenceStandard.tolerances.grade_2}
                      </td>
                      <td className="border-b border-slate-200 px-4 py-3">
                        {referenceStandard.tolerances.grade_3}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-sm text-slate-500">
                  {referenceSize
                    ? `Reference size ${referenceSize} is selected, but its master data could not be loaded.`
                    : "Select a valid surface plate reference size in specifications to load tolerance data."}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden">
            {!hasGrid ? (
              <div className="px-4 py-6 text-sm text-amber-700">
                Add a valid size and block size in specifications to generate the observation grid.
              </div>
            ) : (
              <div className="overflow-auto bg-white p-3">
                <div className="relative inline-block min-w-max">
                  <span className="pointer-events-none absolute left-0 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    A
                  </span>
                  <span className="pointer-events-none absolute right-0 top-0 z-10 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    B
                  </span>
                  <span className="pointer-events-none absolute bottom-0 left-0 z-10 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    C
                  </span>
                  <span className="pointer-events-none absolute bottom-0 right-0 z-10 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    D
                  </span>

                  <table className="min-w-max table-fixed border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <th className="w-24 border border-slate-200 px-3 py-2 text-left">Y \ X</th>
                        {gridDefinition.xPositions.map((position, columnIndex) => (
                          <th
                            key={`x-position-${columnIndex}`}
                            className="w-24 border border-slate-200 px-3 py-2 text-center"
                          >
                            {position}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: gridDefinition.yPoints }, (_, rowIndex) => (
                        <tr key={`surface-plate-row-${rowIndex}`}>
                          <td className="w-24 border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                            {gridDefinition.yPositions[rowIndex]}
                          </td>
                          {Array.from({ length: gridDefinition.xPoints }, (_, columnIndex) => (
                            <td
                              key={`surface-plate-cell-${rowIndex}-${columnIndex}`}
                              className="w-24 border border-slate-200 p-1.5"
                            >
                              <Input
                                value={toDisplayValue(readingsMatrix[rowIndex]?.[columnIndex])}
                                readOnly={isReadOnly}
                                inputMode="decimal"
                                placeholder="0"
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  if (
                                    nextValue === "" ||
                                    numericInputPattern.test(nextValue)
                                  ) {
                                    updateReadingCell(rowIndex, columnIndex, nextValue);
                                  }
                                }}
                                className="min-w-0 rounded-none bg-white text-center text-sm font-medium text-slate-700"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TypeAReadingSection
        disabled={isReadOnly}
        observations={{ type_a_readings: observations?.type_a_readings ?? [] }}
        note={false}
      />
    </div>
  );
}

SurfacePlateCalibration.displayName = "SurfacePlateCalibration";
