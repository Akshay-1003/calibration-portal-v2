import { DialPayload, DialPayloadAttachment, PlungerDialForm } from "./types"

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function buildDialPayload(form: PlungerDialForm): Promise<DialPayload> {
  const attachments: DialPayloadAttachment[] | undefined = form.attachments && form.attachments.length
    ? await Promise.all(
        form.attachments.map(async (f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          data: await fileToBase64(f),
        }))
      )
    : undefined

  return {
    observations: {
      plunger_dial: {
        rows: form.observations.plunger_dial.rows.map((r) => ({
          turn: r.turn,
          range: r.range,
          value: r.value,
          upward_actual: r.upward_actual ?? null,
          upward_error: r.upward_error ?? null,
          downward_actual: r.downward_actual ?? null,
          downward_error: r.downward_error ?? null,
        })),
        type_a_readings: form.observations.plunger_dial.type_a_readings ?? form.observations.type_a_readings,
        repeatability: form.observations.plunger_dial.repeatability ?? form.observations.repeatability,
        tables_to_print: form.observations.plunger_dial.tables_to_print,
      },
    },
    attachments,
  }
}
