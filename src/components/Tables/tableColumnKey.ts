export const getTableColumnKey = (column: unknown): string => {
  if (typeof column === 'string' || typeof column === 'number') {
    return String(column);
  }

  if (typeof column === 'object' && column !== null) {
    const record = column as Record<string, unknown>;
    const key = record.uid ?? record.key ?? record.id;
    if (typeof key === 'string' || typeof key === 'number') {
      return String(key);
    }
  }

  return String(column);
};
