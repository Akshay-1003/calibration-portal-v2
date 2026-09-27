# Plunger Dial Calibration UI

This module provides the Plunger Dial calibration table with Upward/Downward directions, Repeatability, and Type A Reading sections.

## Components

- `DialCalibration`: Main UI table for data entry, printing options, and integration with form context.
- `RepeatabilitySection`: Shared component for repeatability readings.
- `TypeAReadingSection`: Shared component for Type A readings.

## Form Shape

The component expects a React Hook Form context with the following shape:

```ts
type PlungerDialForm = {
  observations: {
    plunger_dial: {
      rows: Array<{
        turn: number
        range: number
        value: number
        upward_actual?: number | null
        upward_error?: number | null
        downward_actual?: number | null
        downward_error?: number | null
      }>
      type_a_readings?: number[]
      repeatability?: number[]
      tables_to_print?: Array<
        | "upward_direction"
        | "upward_result"
        | "downward_direction"
        | "downward_result"
      >
    }
    type_a_readings?: number[]
    repeatability?: number[]
  }
  attachments?: File[]
}
```

## Payload Builder

Use `buildDialPayload(form)` to serialize observations and attachments to API-ready payload. Attachments are converted to base64.

## Accessibility & Responsiveness

- Inputs are labeled via table headers.
- Sticky headers enable navigation with long lists.
- Mobile-friendly with responsive padding and stacking.

## Testing

- Unit tests under `__tests__/DialCalibration.test.tsx` verify headers rendering.
