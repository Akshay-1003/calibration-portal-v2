import { memo, useEffect } from "react"
import { Controller, useWatch, Control, useFormContext } from "react-hook-form"
import { Input } from "@heroui/react"

interface RowProps {
  index: number
  control: Control<any>
}

const computeError = (actual?: string, value?: string | number): string => {
  if (!actual || actual.trim() === "") return ""
  if (value === undefined || value === null || String(value).trim() === "") return ""

  const n = Number(actual)
  const v = Number(value)
  if (!Number.isFinite(n) || !Number.isFinite(v)) return ""

  return ((v - n) * 1000).toFixed(3)
}

export const DialCalibrationRow = memo(({ index, control }: RowProps) => {
  const { setValue } = useFormContext()
  const row = useWatch({
    control,
    name: `observations.readings.${index}`
  })

  useEffect(() => {
    if (!row) return

    const upwardComputed = computeError(row?.upward_reading?.actual_reading, row?.value)
    if (upwardComputed !== "" && upwardComputed !== row?.upward_reading?.observed_error) {
      setValue(
        `observations.readings.${index}.upward_reading.observed_error`,
        upwardComputed,
        { shouldDirty: true, shouldValidate: false }
      )
    }

    const downwardComputed = computeError(row?.downward_reading?.actual_reading, row?.value)
    if (downwardComputed !== "" && downwardComputed !== row?.downward_reading?.observed_error) {
      setValue(
        `observations.readings.${index}.downward_reading.observed_error`,
        downwardComputed,
        { shouldDirty: true, shouldValidate: false }
      )
    }
  }, [index, row, setValue])

  return (
    <tr>
      {/* Turn */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.turn`}
          render={({ field }) => (
            <Input
              type="number"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        />
      </td>

      {/* Range */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.range`}
          render={({ field }) => (
            <Input
              type="number"
              value={field.value ?? ""}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        />
      </td>

      {/* Value */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.value`}
          render={({ field }) => (
            <Input
              type="number"
              value={field.value ?? ""}
              onChange={(event) => {
                const nextValue = event.target.value;
                field.onChange(nextValue)
                setValue(
                  `observations.readings.${index}.upward_reading.observed_error`,
                  computeError(row?.upward_reading?.actual_reading, nextValue),
                  { shouldDirty: true, shouldValidate: false }
                )
                setValue(
                  `observations.readings.${index}.downward_reading.observed_error`,
                  computeError(row?.downward_reading?.actual_reading, nextValue),
                  { shouldDirty: true, shouldValidate: false }
                )
              }}
            />
          )}
        />
      </td>

      {/* Upward Actual */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.upward_reading.actual_reading`}
          render={({ field }) => (
            <Input
              inputMode="decimal"
              className="bg-yellow-100"
              value={field.value ?? ""}
              onChange={(event) => {
                const nextActual = event.target.value;
                field.onChange(nextActual)
                setValue(
                  `observations.readings.${index}.upward_reading.observed_error`,
                  computeError(nextActual, row?.value),
                  { shouldDirty: true, shouldValidate: false }
                )
              }}
            />
          )}
        />
      </td>

      {/* Upward Error (derived, read-only) */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.upward_reading.observed_error`}
          render={({ field }) => (
            <Input
              {...field}
              disabled
              className="bg-yellow-100"
              value={
                field.value ??
                computeError(row?.upward_reading?.actual_reading, row?.value)
              }
            />
          )}
        />
      </td>

      {/* Downward Actual */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.downward_reading.actual_reading`}
          render={({ field }) => (
            <Input
              inputMode="decimal"
              className="bg-pink-100"
              value={field.value ?? ""}
              onChange={(event) => {
                const nextActual = event.target.value;
                field.onChange(nextActual)
                setValue(
                  `observations.readings.${index}.downward_reading.observed_error`,
                  computeError(nextActual, row?.value),
                  { shouldDirty: true, shouldValidate: false }
                )
              }}
            />
          )}
        />
      </td>

      {/* Downward Error */}
      <td>
        <Controller
          control={control}
          name={`observations.readings.${index}.downward_reading.observed_error`}
          render={({ field }) => (
            <Input
              {...field}
              disabled
              className="bg-pink-100"
              value={
                field.value ??
                computeError(row?.downward_reading?.actual_reading, row?.value)
              }
            />
          )}
        />
      </td>
    </tr>
  )
})
