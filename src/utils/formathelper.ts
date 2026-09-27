export const fixedTo4Digit = (num?: number | null) =>
  num != null ? Number(num).toFixed(4) : "";