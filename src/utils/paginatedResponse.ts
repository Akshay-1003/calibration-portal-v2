
export const DEFAULT_BULK_FETCH_LIMIT = 500;

export interface PaginatedListResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ExtractPaginatedListOptions<T> {
  arrayKeys?: string[];
  mapItem?: (item: unknown) => T;
  fallbackPage?: number;
  fallbackLimit?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const findArray = (payload: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  const nestedData = payload.data;
  if (isRecord(nestedData)) {
    for (const key of keys) {
      const value = nestedData[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  return [];
};

export const extractPaginatedList = <T>(
  payload: unknown,
  options: ExtractPaginatedListOptions<T> = {},
): PaginatedListResult<T> => {
  const {
    arrayKeys = ['data', 'items'],
    mapItem,
    fallbackPage = 0,
    fallbackLimit,
  } = options;

  const rawItems = findArray(payload, arrayKeys);
  const items = mapItem ? rawItems.map(mapItem) : (rawItems as T[]);

  const root = isRecord(payload) ? payload : null;
  const nestedData = root && isRecord(root.data) ? root.data : null;
  const pagination =
    root && isRecord(root.pagination)
      ? root.pagination
      : nestedData && isRecord(nestedData.pagination)
        ? nestedData.pagination
        : null;

  const total =
    toSafeNumber(root?.total) ??
    toSafeNumber(root?.total_count) ??
    toSafeNumber(nestedData?.total) ??
    toSafeNumber(nestedData?.total_count) ??
    toSafeNumber(pagination?.total) ??
    items.length;

  const page =
    toSafeNumber(root?.page) ??
    toSafeNumber(nestedData?.page) ??
    toSafeNumber(pagination?.page) ??
    fallbackPage;

  const resolvedLimit =
    toSafeNumber(root?.limit) ??
    toSafeNumber(nestedData?.limit) ??
    toSafeNumber(pagination?.limit) ??
    fallbackLimit ??
    items.length;

  const totalPages =
    toSafeNumber(root?.totalPages) ??
    toSafeNumber(nestedData?.totalPages) ??
    toSafeNumber(pagination?.totalPages) ??
    (resolvedLimit > 0 ? Math.max(Math.ceil(total / resolvedLimit), 1) : 1);

  const hasNext =
    Boolean(pagination?.hasNext) ||
    page + 1 < totalPages;

  const hasPrev =
    Boolean(pagination?.hasPrev) ||
    page > 0;

  return {
    items,
    total,
    page,
    limit: resolvedLimit,
    totalPages,
    hasNext,
    hasPrev,
  };
};

export const toApiPage = (uiPage: number): number => Math.max(uiPage - 1, 0);

export const toUiPage = (apiPage: number): number => Math.max(apiPage, 0) + 1;
