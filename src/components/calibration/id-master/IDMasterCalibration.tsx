import React, { useEffect, useMemo, useRef } from "react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import {
  calculateMeanFromReadings,
  parseNumber,
} from "../../../utils/calibrationCalculations";
import type { IDMasterObservations, IDMasterRow, IDMasterForm } from "../observationSchemas";
import {
  DEFAULT_ID_MASTER_READING_COUNT,
  normalizeIDMasterRowsFromObservations,
} from "./observationMappers";

type IDMasterSpecifications =
  | {
      basic_size?: Array<number | string> | number | string;
    }
  | Array<number | string>
  | number
  | string
  | null
  | undefined;

export interface GaugeCalibrationProps {
  onCancel: () => void;
  isReadOnly?: boolean;
  observations: IDMasterObservations;
  specifications: IDMasterSpecifications;
}

const toDisplay = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeSpecifications = (specifications: IDMasterSpecifications): Array<string | number> => {
  if (Array.isArray(specifications)) {
    return specifications.filter((size) => size !== undefined && size !== null && size !== "");
  }

  if (specifications !== null && specifications !== undefined && typeof specifications !== "object") {
    return [specifications];
  }

  if (!specifications || typeof specifications !== "object") {
    return [];
  }

  const basicSize = specifications.basic_size;
  if (Array.isArray(basicSize)) {
    return basicSize.filter((size) => size !== undefined && size !== null && size !== "");
  }

  if (basicSize !== undefined && basicSize !== null && basicSize !== "") {
    return [basicSize];
  }

  return [];
};

export const IDMasterCalibration: React.FC<GaugeCalibrationProps> = ({
  observations,
  specifications,
  isReadOnly,
}) => {
  const { control, setValue, getValues } = useFormContext<IDMasterForm>();

  const specificationSizes = useMemo(() => normalizeSpecifications(specifications), [specifications]);
  const normalizedRows = useMemo(
    () =>
      normalizeIDMasterRowsFromObservations(
        observations,
        specificationSizes,
        DEFAULT_ID_MASTER_READING_COUNT
      ),
    [observations, specificationSizes]
  );

  const { replace } = useFieldArray({
    control,
    name: "observations.readings",
  });

  const readingRows = useWatch({
    control,
    name: "observations.readings",
    defaultValue: [],
  }) as IDMasterRow[];

  const readingColumnCount = useMemo(() => {
    const derivedMax = readingRows.reduce((max, row) => {
      const count = Array.isArray(row?.readings) ? row.readings.length : 0;
      return Math.max(max, count);
    }, 0);

    return Math.max(DEFAULT_ID_MASTER_READING_COUNT, derivedMax);
  }, [readingRows]);

  const readingColumns = useMemo(
    () => Array.from({ length: readingColumnCount }, (_, index) => index),
    [readingColumnCount]
  );

  const initializedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const hydrateKey = JSON.stringify({
      specs: specificationSizes,
      rows: normalizedRows,
    });

    const hasFormRows = Array.isArray(readingRows) && readingRows.length > 0;
    if (initializedKeyRef.current === hydrateKey && hasFormRows) {
      return;
    }

    replace(normalizedRows);
    initializedKeyRef.current = hydrateKey;
  }, [specificationSizes, normalizedRows, replace, readingRows]);

  useEffect(() => {
    readingRows.forEach((row, index) => {
      const mean = calculateMeanFromReadings(
        row?.readings ?? [],
        4
      );

      const meanPath = `observations.readings.${index}.mean` as const;
      const currentMean = parseNumber(getValues(meanPath));

      if (mean !== null) {
        if (currentMean === null || Number(currentMean.toFixed(4)) !== mean) {
          setValue(meanPath, mean, { shouldDirty: true });
        }
      } else if (getValues(meanPath) !== "") {
        setValue(meanPath, "", { shouldDirty: true });
      }
    });
  }, [readingRows, getValues, setValue]);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Specification Size (mm)
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700">
                Observation
              </th>
              {readingColumns.map((readingIndex) => (
                <th
                  key={`reading-header-${readingIndex}`}
                  className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider border-r border-gray-700"
                >
                  Reading {readingIndex + 1} (mm)
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">
                Observed Size Mean (mm)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {readingRows.map((row, index) => {
              const parameter = row.parameter ?? row.observation_label ?? (index % 2 === 0 ? "A" : "B");
              const isObservationA = parameter === "A";
              const showBasicSize = index % 2 === 0;
              const rowSpan = readingRows[index + 1] ? 2 : 1;
              const rowToneClass = isObservationA ? "bg-amber-50" : "bg-cyan-50";
              const meanToneClass = isObservationA ? "bg-yellow-100" : "bg-cyan-100";
              const observationText = isObservationA ? "Observation A" : "Observation B";

              return (
                <tr key={`id-master-reading-row-${index}`} className="hover:bg-gray-50">
                  {showBasicSize && (
                    <td rowSpan={rowSpan} className="px-3 py-2 bg-gray-100 border-r border-gray-200 align-middle">
                      <Controller
                        control={control}
                        name={`observations.readings.${index}.basic_size` as const}
                        defaultValue={row.basic_size ?? specificationSizes[Math.floor(index / 2)] ?? ""}
                        render={({ field }) => (
                          <Input
                            {...field}
                            value={toDisplay(field.value ?? specificationSizes[Math.floor(index / 2)] ?? "")}
                            disabled
                            className="h-9 border border-gray-300 bg-gray-100 text-center text-sm font-medium"
                          />
                        )}
                      />
                    </td>
                  )}

                  <td className="px-2 py-2 bg-gray-100 border-r border-gray-200 text-sm font-medium text-gray-700">
                    {observationText}
                  </td>

                  {readingColumns.map((readingIndex) => {
                    const fieldName =
                      `observations.readings.${index}.readings.${readingIndex}` as const;
                    return (
                      <td key={readingIndex} className={`px-3 py-2 border-r border-gray-200 ${rowToneClass}`}>
                        <Controller
                          control={control}
                          name={fieldName}
                          defaultValue={row?.readings?.[readingIndex] ?? ""}
                          render={({ field }) => (
                            <Input
                              {...field}
                              value={toDisplay(field.value)}
                              type="number"
                              step="any"
                              disabled={isReadOnly}
                              className="h-9 border border-gray-300 bg-white text-center text-sm"
                              placeholder="0.000"
                            />
                          )}
                        />
                      </td>
                    );
                  })}

                  <td className={`px-3 py-2 ${meanToneClass}`}>
                    <Controller
                      control={control}
                      name={`observations.readings.${index}.mean` as const}
                      defaultValue={row.mean ?? ""}
                      render={({ field }) => (
                        <Input
                          {...field}
                          disabled
                          value={toDisplay(field.value)}
                          className="h-9 border border-gray-300 bg-gray-100 text-center text-sm font-semibold"
                          placeholder="0.0000"
                        />
                      )}
                    />
                  </td>
                </tr>
              );
            })}
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

IDMasterCalibration.displayName = "IDMasterCalibration";
