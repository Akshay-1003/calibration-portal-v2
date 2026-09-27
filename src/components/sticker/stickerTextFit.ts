const MM_TO_PX = 96 / 25.4;

const CONTENT_WIDTH_MM = 32.8;
const CONTENT_HEIGHT_MM = 13.2;
const ROW_GAP_MM = 0.2;
const LINE_HEIGHT = 1.15;
const FONT_STEP = 0.25;
const BASE_FONT_SIZE = 10;
const MIN_FONT_SIZE = 3.5;
const ABSOLUTE_MIN_FONT_SIZE = 2.5;

const CONTENT_WIDTH_PX = mmToPx(CONTENT_WIDTH_MM);
const CONTENT_HEIGHT_PX = mmToPx(CONTENT_HEIGHT_MM);
const ROW_GAP_PX = mmToPx(ROW_GAP_MM);

interface StickerFitInput {
  vmcId: string;
  gId?: string;
  calDate: string;
  dueDate: string;
  withIdentification: boolean;
}

let cachedMeasureContext: CanvasRenderingContext2D | null = null;

function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (cachedMeasureContext) {
    return cachedMeasureContext;
  }

  const canvas = document.createElement("canvas");
  cachedMeasureContext = canvas.getContext("2d");
  return cachedMeasureContext;
}

function measureTextWidth(text: string, fontSize: number, fontWeight: 600 | 700): number {
  const value = String(text ?? "");
  const context = getMeasureContext();

  if (!context) {
    return value.length * fontSize * 0.56;
  }

  context.font = `${fontWeight} ${fontSize}px "Segoe UI", Arial, Helvetica, sans-serif`;
  return context.measureText(value).width;
}

function fitsWidth(rows: Array<{ label: string; value: string }>, fontSize: number): boolean {
  return rows.every((row) => {
    const labelWidth = measureTextWidth(row.label, fontSize, 600);
    const valueWidth = measureTextWidth(row.value, fontSize, 700);
    return labelWidth + valueWidth <= CONTENT_WIDTH_PX;
  });
}

function fitsHeight(rowCount: number, fontSize: number): boolean {
  const textHeight = rowCount * fontSize * LINE_HEIGHT;
  const gapHeight = (rowCount - 1) * ROW_GAP_PX;
  return textHeight + gapHeight <= CONTENT_HEIGHT_PX;
}

function findFontSize(rows: Array<{ label: string; value: string }>): number {
  for (let size = BASE_FONT_SIZE; size >= MIN_FONT_SIZE; size -= FONT_STEP) {
    const normalized = Number(size.toFixed(2));
    if (fitsWidth(rows, normalized) && fitsHeight(rows.length, normalized)) {
      return normalized;
    }
  }

  const widthRatioAtMin = Math.max(
    ...rows.map((row) => {
      const labelWidth = measureTextWidth(row.label, MIN_FONT_SIZE, 600);
      const valueWidth = measureTextWidth(row.value, MIN_FONT_SIZE, 700);
      return (labelWidth + valueWidth) / CONTENT_WIDTH_PX;
    }),
    1
  );

  const heightRatioAtMin = Math.max(
    (rows.length * MIN_FONT_SIZE * LINE_HEIGHT + (rows.length - 1) * ROW_GAP_PX) /
      CONTENT_HEIGHT_PX,
    1
  );

  const scaleRatio = Math.max(widthRatioAtMin, heightRatioAtMin);
  return Number(Math.max(ABSOLUTE_MIN_FONT_SIZE, MIN_FONT_SIZE / scaleRatio).toFixed(2));
}

export function getStickerFontSize(input: StickerFitInput): number {
  const rows = [
    { label: "VMC ID:", value: input.vmcId || "-" },
    ...(input.withIdentification
      ? [{ label: "G.ID:", value: input.gId || "-" }]
      : []),
    { label: "Cal Dt:", value: input.calDate || "-" },
    { label: "Due Dt:", value: input.dueDate || "-" },
  ];

  return findFontSize(rows);
}
