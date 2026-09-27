export interface SurfacePlateGridDefinition {
  xBlocks: number;
  yBlocks: number;
  xPoints: number;
  yPoints: number;
  xPositions: number[];
  yPositions: number[];
  emptyReadingsMatrix: string[][];
}

const toPositiveNumber = (value: string | number | null | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

const buildPositions = (points: number, blockSize: number, limit: number): number[] =>
  Array.from({ length: points }, (_, index) => {
    const rawValue = Math.min(index * blockSize, limit);
    return Number(rawValue.toFixed(4));
  });

export const generateSurfacePlateGrid = (
  lengthMm: string | number | null | undefined,
  widthMm: string | number | null | undefined,
  blockSize: string | number | null | undefined
): SurfacePlateGridDefinition => {
  const length = toPositiveNumber(lengthMm);
  const width = toPositiveNumber(widthMm);
  const block = toPositiveNumber(blockSize);

  if (!length || !width || !block) {
    return {
      xBlocks: 0,
      yBlocks: 0,
      xPoints: 0,
      yPoints: 0,
      xPositions: [],
      yPositions: [],
      emptyReadingsMatrix: [],
    };
  }

  const xBlocks = Math.ceil(length / block);
  const yBlocks = Math.ceil(width / block);
  const xPoints = xBlocks + 1;
  const yPoints = yBlocks + 1;

  return {
    xBlocks,
    yBlocks,
    xPoints,
    yPoints,
    xPositions: buildPositions(xPoints, block, length),
    yPositions: buildPositions(yPoints, block, width),
    emptyReadingsMatrix: Array.from({ length: yPoints }, () =>
      Array.from({ length: xPoints }, () => "")
    ),
  };
};
