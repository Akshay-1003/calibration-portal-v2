export type PdfTableValueSelector<T extends object> = keyof T | ((row: T) => unknown);

export interface PdfTableGroupingConfig<T extends object> {
  fields: PdfTableValueSelector<T>[];
  sumFields?: Array<keyof T>;
  merge?: (current: T, duplicate: T) => T;
}

export interface PreparePdfTableDataOptions<T extends object> {
  sortBy?: PdfTableValueSelector<T> | PdfTableValueSelector<T>[];
  sortDirection?: 'asc' | 'desc';
  groupBy?: PdfTableGroupingConfig<T>;
  serialField?: keyof T;
  serialStart?: number;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

const readValue = <T extends object>(row: T, selector: PdfTableValueSelector<T>) =>
  typeof selector === 'function' ? selector(row) : row[selector];

const normalizeText = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeGroupValue = (value: unknown) => normalizeText(value).toLocaleLowerCase();

const toFiniteNumber = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const withFieldValue = <T extends object>(row: T, field: keyof T, value: unknown): T =>
  ({
    ...row,
    [field]: value,
  }) as T;

const compareValues = (leftValue: unknown, rightValue: unknown) => {
  const left = normalizeText(leftValue);
  const right = normalizeText(rightValue);

  if (!left && right) return 1;
  if (left && !right) return -1;

  return collator.compare(left, right);
};

const getSortSelectors = <T extends object>(sortBy?: PreparePdfTableDataOptions<T>['sortBy']) => {
  if (!sortBy) return [];
  return Array.isArray(sortBy) ? sortBy : [sortBy];
};

const getGroupKey = <T extends object>(row: T, fields: PdfTableValueSelector<T>[]) =>
  fields.map((field) => normalizeGroupValue(readValue(row, field))).join('\u001f');

const groupPdfRows = <T extends object>(
  rows: T[],
  grouping: PdfTableGroupingConfig<T>,
) => {
  const groups = new Map<string, T>();
  const groupOrder: string[] = [];

  rows.forEach((row) => {
    const key = getGroupKey(row, grouping.fields);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, { ...row });
      groupOrder.push(key);
      return;
    }

    if (grouping.merge) {
      groups.set(key, grouping.merge(current, row));
      return;
    }

    const merged = (grouping.sumFields ?? []).reduce(
      (nextRow, field) =>
        withFieldValue(
          nextRow,
          field,
          toFiniteNumber(readValue(nextRow, field)) + toFiniteNumber(readValue(row, field)),
        ),
      current,
    );

    groups.set(key, merged);
  });

  return groupOrder.map((key) => groups.get(key)).filter((row): row is T => Boolean(row));
};

export const preparePdfTableData = <T extends object>(
  rows: readonly T[],
  options: PreparePdfTableDataOptions<T> = {},
): T[] => {
  const sortSelectors = getSortSelectors(options.sortBy);
  const direction = options.sortDirection === 'desc' ? -1 : 1;
  let preparedRows = rows.map((row) => ({ ...row }));

  if (options.groupBy) {
    preparedRows = groupPdfRows(preparedRows, options.groupBy);
  }

  if (sortSelectors.length > 0) {
    preparedRows = [...preparedRows].sort((left, right) => {
      for (const selector of sortSelectors) {
        const comparison = compareValues(readValue(left, selector), readValue(right, selector));
        if (comparison !== 0) return comparison * direction;
      }

      return 0;
    });
  }

  if (options.serialField) {
    const start = options.serialStart ?? 1;
    preparedRows = preparedRows.map((row, index) =>
      withFieldValue(row, options.serialField as keyof T, start + index),
    );
  }

  return preparedRows;
};
