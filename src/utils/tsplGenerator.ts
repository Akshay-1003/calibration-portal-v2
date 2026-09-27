/**
 * TSPL/TSPL2 command generator for TSC TE244 gauge stickers.
 *
 * Physical layout:
 * - Media width: 77 mm
 * - Sticker size: 35 mm x 15 mm
 * - Two stickers per physical row
 * - Horizontal gap between stickers: 2 mm
 * - Gap media between rows: 3 mm
 */

export interface StickerData {
  vmcId: string;
  gId?: string;
  calDate: string;
  dueDate: string;
  barcodeData?: string;
  withIdentification?: boolean;
}

export const TSC_TE244_MEDIA = {
  mediaWidthMm: 77,
  stickerWidthMm: 35,
  stickerHeightMm: 15,
  horizontalGapMm: 2,
  verticalGapMm: 3,
  dpi: 203,
} as const;

const MM_TO_DOTS = TSC_TE244_MEDIA.dpi / 25.4;
const TOTAL_STICKER_WIDTH_MM =
  TSC_TE244_MEDIA.stickerWidthMm * 2 + TSC_TE244_MEDIA.horizontalGapMm;
const LEFT_MARGIN_MM =
  (TSC_TE244_MEDIA.mediaWidthMm - TOTAL_STICKER_WIDTH_MM) / 2;
const RIGHT_STICKER_LEFT_MM =
  LEFT_MARGIN_MM + TSC_TE244_MEDIA.stickerWidthMm + TSC_TE244_MEDIA.horizontalGapMm;
const TSPL_FONT = "2";

function mmToDots(mm: number): number {
  return Math.round(mm * MM_TO_DOTS);
}

function escapeTsplText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function textCommand(xMm: number, yMm: number, value: string): string {
  return `TEXT ${mmToDots(xMm)},${mmToDots(yMm)},"${TSPL_FONT}",0,1,1,"${escapeTsplText(value)}"\n`;
}

function renderSticker(sticker: StickerData, stickerLeftMm: number): string {
  const labelX = stickerLeftMm + 1.1;
  const valueX = stickerLeftMm + 10.6;
  const includeGId = sticker.withIdentification !== false;
  const rows = includeGId
    ? [
        { label: "VMC ID:", value: sticker.vmcId, y: 1.0 },
        { label: "G.ID:", value: sticker.gId || "-", y: 4.1 },
        { label: "Cal Dt:", value: sticker.calDate, y: 7.2 },
        { label: "Due Dt:", value: sticker.dueDate, y: 10.3 },
      ]
    : [
        { label: "VMC ID:", value: sticker.vmcId, y: 1.8 },
        { label: "Cal Dt:", value: sticker.calDate, y: 6.0 },
        { label: "Due Dt:", value: sticker.dueDate, y: 10.2 },
      ];

  return rows
    .map(
      (row) =>
        textCommand(labelX, row.y, row.label) +
        textCommand(valueX, row.y, row.value || "-")
    )
    .join("");
}

/**
 * Generate one atomic TSPL command block for a physical row.
 * The row can contain a left sticker and an optional right sticker.
 */
export function generateTSPLRow(
  sticker1: StickerData,
  sticker2: StickerData | null
): string {
  let commands = "";

  commands += `SIZE ${TSC_TE244_MEDIA.mediaWidthMm} mm, ${TSC_TE244_MEDIA.stickerHeightMm} mm\n`;
  commands += `GAP ${TSC_TE244_MEDIA.verticalGapMm} mm, 0 mm\n`;
  commands += "DENSITY 12\n";
  commands += "SPEED 4\n";
  commands += "DIRECTION 1\n";
  commands += "REFERENCE 0,0\n";
  commands += "OFFSET 0 mm\n";
  commands += "SET RIBBON ON\n";
  commands += "SET PEEL OFF\n";
  commands += "SET CUTTER OFF\n";
  commands += "SET PARTIAL_CUTTER OFF\n";
  commands += "SET TEAR ON\n";
  commands += "CLS\n";
  commands += renderSticker(sticker1, LEFT_MARGIN_MM);

  if (sticker2) {
    commands += renderSticker(sticker2, RIGHT_STICKER_LEFT_MM);
  }

  commands += "PRINT 1,1\n";
  return commands;
}

export function generateTSPLRows(stickers: StickerData[]): string[] {
  const rows: string[] = [];

  for (let index = 0; index < stickers.length; index += 2) {
    rows.push(generateTSPLRow(stickers[index], stickers[index + 1] || null));
  }

  return rows;
}

