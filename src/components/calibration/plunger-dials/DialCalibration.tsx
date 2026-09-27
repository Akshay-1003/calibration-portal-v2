"use client"

import { memo, useEffect } from "react"
import {
  useFormContext,
  useFieldArray,
  Controller,
  useWatch
} from "react-hook-form"
import { Input, Checkbox, Spinner } from "@heroui/react"
import { RepeatabilitySection } from "../common/RepeatabilitySection"
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection"
import { useDialReadingTableQuery } from "../../../hooks/queries/dialReadingTable"
import type { DialCalibrationFormShape as FormShape, DialCalibrationReadingForm as ReadingForm } from "../observationSchemas"

/* ===================== CONSTANTS ===================== */

const ROW_PATH = "observations.readings" as const
const PRINT_PATH = "observations.tables_to_print" as const
const TABLE_OPTIONS = [
  ["upward_direction", "Upward Direction"],
  ["downward_direction", "Downward Direction"],
  ["upward_result", "Upward Result"],
  ["downward_result", "Downward Result"],
] as const
type TableKey = (typeof TABLE_OPTIONS)[number][0]
const TABLE_OPTION_KEYS = TABLE_OPTIONS.map(([key]) => key)
const DEFAULT_TABLES_TO_PRINT: TableKey[] = [...TABLE_OPTION_KEYS]

/* ===================== HELPERS ===================== */

const isValidDecimalInput = (v: string) =>
  /^-?\d*(\.\d*)?$/.test(v)

const normalizeTablesToPrint = (value: unknown): TableKey[] => {
  if (Array.isArray(value)) {
    const filtered = value
      .map((entry) => String(entry))
      .filter((entry): entry is TableKey =>
        TABLE_OPTION_KEYS.includes(entry as TableKey)
      )
    return filtered
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return TABLE_OPTION_KEYS.filter((key) => Boolean(record[key]))
  }

  return []
}

/* ===================== ROW ===================== */

const DialRow = memo(function DialRow({ index, isReadOnly = false }: { index: number; isReadOnly?: boolean }) {
  const { control, setValue } = useFormContext<FormShape>()

  const row = useWatch({
    control,
    name: `${ROW_PATH}.${index}`,
    
  })

  const normalizeInput = (v: unknown): string => {
    if (v === null || v === undefined) return ""
    return String(v)
  }

  const computeError = (actual?: unknown, value?: unknown): string => {
    const actualStr = normalizeInput(actual)
    const valueStr = normalizeInput(value)
    if (!actualStr || actualStr.trim() === "") return ""
    if (!valueStr || valueStr.trim() === "") return ""

    const actualNum = Number(actualStr)
    const valueNum = Number(valueStr)

    if (!Number.isFinite(actualNum) || !Number.isFinite(valueNum)) return ""

    return ((valueNum - actualNum) * 1000).toFixed(3)
  }

  const upwardError = computeError(row?.upward_reading?.actual_reading, row?.value)
  const downwardError = computeError(row?.downward_reading?.actual_reading, row?.value)

  useEffect(() => {
    if (!row) return

    if (upwardError !== row?.upward_reading?.observed_error) {
      setValue(`${ROW_PATH}.${index}.upward_reading.observed_error`, upwardError, {
        shouldDirty: true,
        shouldValidate: false,
      })
    }

    if (downwardError !== row?.downward_reading?.observed_error) {
      setValue(`${ROW_PATH}.${index}.downward_reading.observed_error`, downwardError, {
        shouldDirty: true,
        shouldValidate: false,
      })
    }
  }, [downwardError, index, row, setValue, upwardError])
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.turn`}
          control={control}
          // rules={{
          //   required: `Turn is required for row ${index + 1}`,
          //   validate: (value) => {
          //     if (!value || value.toString().trim() === "") {
          //       return `Turn is required for row ${index + 1}`;
          //     }
          //     return true;
          //   },
          // }}
          render={({ field, fieldState }) => (
            <div>
              <Input
                {...field}
                size="sm"
                type="number"
                value={field.value ?? ""}
                isReadOnly={isReadOnly}
                classNames={{
                  inputWrapper: `h-9 border-1 ${fieldState.error ? "border-red-500" : "border-gray-300"
                    } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                  input: "text-sm",
                }}
              />
              {fieldState.error && (
                <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.range`}
          control={control}
          // rules={{
          //   required: `Range is required for row ${index + 1}`,
          //   validate: (value) => {
          //     if (!value || value.toString().trim() === "") {
          //       return `Range is required for row ${index + 1}`;
          //     }
          //     return true;
          //   },
          // }}
          render={({ field, fieldState }) => (
            <div>
              <Input
                {...field}
                size="sm"
                type="number"
                value={field.value ?? ""}
                isReadOnly={isReadOnly}
                classNames={{
                  inputWrapper: `h-9 border-1 ${fieldState.error ? "border-red-500" : "border-gray-300"
                    } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                  input: "text-sm",
                }}
              />
              {fieldState.error && (
                <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.value`}
          control={control}
          // rules={{
          //   required: `Value is required for row ${index + 1}`,
          //   validate: (value) => {
          //     if (!value || value.toString().trim() === "") {
          //       return `Value is required for row ${index + 1}`;
          //     }
          //     const num = Number(value);
          //     if (isNaN(num)) {
          //       return `Value must be a valid number`;
          //     }
          //     return true;
          //   },
          // }}
          render={({ field, fieldState }) => (
            <div>
              <Input
                {...field}
                size="sm"
                type="number"
                step="any"
                value={field.value ?? ""}
                isReadOnly={isReadOnly}
                classNames={{
                  inputWrapper: `h-9 border-1 ${fieldState.error ? "border-red-500" : "border-gray-300"
                    } bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500`,
                  input: "text-sm",
                }}
                onChange={(e) => {
                  field.onChange(e)
                  const nextValue = e.target.value
                  setValue(
                    `${ROW_PATH}.${index}.upward_reading.observed_error`,
                    computeError(row?.upward_reading?.actual_reading, nextValue),
                    { shouldDirty: true, shouldValidate: false }
                  )
                  setValue(
                    `${ROW_PATH}.${index}.downward_reading.observed_error`,
                    computeError(row?.downward_reading?.actual_reading, nextValue),
                    { shouldDirty: true, shouldValidate: false }
                  )
                }}
              />
              {fieldState.error && (
                <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.upward_reading.actual_reading`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              size="sm"
              inputMode="decimal"
              classNames={{
                inputWrapper: "h-9 border-1 border-gray-300 bg-yellow-50 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500",
                input: "text-sm",
              }}
              value={field.value ?? ""}
              isReadOnly={isReadOnly}
              onChange={(e) => {
                const v = e.target.value
                if (isValidDecimalInput(v)) {
                  field.onChange(v)
                  setValue(
                    `${ROW_PATH}.${index}.upward_reading.observed_error`,
                    computeError(v, row?.value),
                    { shouldDirty: true, shouldValidate: false }
                  )
                }
              }}
            />
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.upward_reading.observed_error`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              size="sm"
              isReadOnly
              value={field.value ?? upwardError}
              classNames={{
                inputWrapper: "h-9 border-1 border-gray-300 bg-yellow-50",
                input: "text-sm text-gray-700",
              }}
            />
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.downward_reading.actual_reading`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              size="sm"
              inputMode="decimal"
              classNames={{
                inputWrapper: "h-9 border-1 border-gray-300 bg-pink-50 hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500",
                input: "text-sm",
              }}
              value={field.value ?? ""}
              isReadOnly={isReadOnly}
              onChange={(e) => {
                const v = e.target.value
                if (isValidDecimalInput(v)) {
                  field.onChange(v)
                  setValue(
                    `${ROW_PATH}.${index}.downward_reading.observed_error`,
                    computeError(v, row?.value),
                    { shouldDirty: true, shouldValidate: false }
                  )
                }
              }}
            />
          )}
        />
      </td>

      <td className="px-3 py-2 whitespace-nowrap">
        <Controller
          name={`${ROW_PATH}.${index}.downward_reading.observed_error`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              size="sm"
              isReadOnly
              value={field.value ?? downwardError}
              classNames={{
                inputWrapper: "h-9 border-1 border-gray-300 bg-pink-50",
                input: "text-sm text-gray-700",
              }}
            />
          )}
        />
      </td>
    </tr>
  )
})

/* ===================== MAIN ===================== */

export default function DialCalibration({
  observations,
  specifications,
  isReadOnly = false,
}: {
  observations?: FormShape["observations"]
  specifications?: { reading_table_id?: string }
  isReadOnly?: boolean
}) {
  const { control, setValue } = useFormContext<FormShape>()
  const { fields, replace } = useFieldArray({ control, name: ROW_PATH })
  const tableId = specifications?.reading_table_id
  const hasObservationsData = Boolean(observations?.readings?.length)
  const shouldQueryTable = !hasObservationsData && Boolean(tableId)
  const dialTableQuery = useDialReadingTableQuery(shouldQueryTable ? tableId : null)
  const watchedTables = useWatch({
    control,
    name: PRINT_PATH,
    defaultValue: DEFAULT_TABLES_TO_PRINT,
  })
  const selectedTables =
    watchedTables === undefined
      ? DEFAULT_TABLES_TO_PRINT
      : normalizeTablesToPrint(watchedTables)

  useEffect(() => {
    if (hasObservationsData) {
      replace(observations.readings)
      if (observations.tables_to_print !== undefined) {
        const normalizedTables = normalizeTablesToPrint(observations.tables_to_print)
        setValue(PRINT_PATH, normalizedTables, { shouldDirty: false })
      }
      return
    }

    if (!tableId) {
      if (observations?.tables_to_print !== undefined) {
        const normalizedTables = normalizeTablesToPrint(observations.tables_to_print)
        setValue(PRINT_PATH, normalizedTables, { shouldDirty: false })
      }
      return
    }

    if (dialTableQuery.isPending || dialTableQuery.isError) {
      return
    }

    const table = dialTableQuery.data?.reading_table ?? []
    replace(
      table.map((r) => ({
        turn: String(r.turn ?? ""),
        range: String(r.range ?? ""),
        value: String(r.value ?? ""),
        upward_reading: {
          actual_reading: String((r as any).upward_actual ?? ""),
          observed_error: String((r as any).upward_error ?? ""),
        },
        downward_reading: {
          actual_reading: String((r as any).downward_actual ?? ""),
          observed_error: String((r as any).downward_error ?? ""),
        },
      }))
    )
  }, [hasObservationsData, observations, tableId, dialTableQuery.data, dialTableQuery.isPending, dialTableQuery.isError, replace, setValue])


  return (
    <>
      <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-y-auto">
          {shouldQueryTable && dialTableQuery.isPending ? (
            <div className="py-12 flex justify-center items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" />
              <span>Loading table data...</span>
            </div>
          ) : fields.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              No readings available
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Turn
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Range
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    Upward Actual
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    Upward Error
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">
                    Downward Actual
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-sky-700 uppercase tracking-wider">
                    Downward Error
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fields.map((field, index) => (
                  <DialRow key={field.id} index={index} isReadOnly={isReadOnly} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RepeatabilitySection disabled={isReadOnly} observations={observations} />

      <TypeAReadingSection disabled={isReadOnly} observations={observations} note={false} />

      <div className="mt-2 mb-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-slate-100 text-gray-800 px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase">
            SELECT TABLES TO PRINT ON REPORT

          </h3>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {TABLE_OPTIONS.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between border rounded-md px-3 py-2"
            >
              <span className="text-sm text-gray-700">{label}</span>
              <Checkbox
                isSelected={selectedTables.includes(key)}
                isDisabled={isReadOnly}
                onValueChange={(isSelected: boolean) => {
                  const next = isSelected
                    ? Array.from(new Set([...selectedTables, key]))
                    : selectedTables.filter((item) => item !== key)
                  setValue(PRINT_PATH, next, { shouldDirty: true })
                }}
              />
            </div>
          ))}
        </div>
      </div>

    </>
  )
}
