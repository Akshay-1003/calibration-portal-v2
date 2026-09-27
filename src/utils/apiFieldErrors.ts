type BackendErrorEntry = {
  code?: unknown;
  message?: unknown;
  msg?: unknown;
  target?: unknown;
  type?: unknown;
  loc?: unknown;
};

type ErrorLike = {
  message?: unknown;
  data?: unknown;
  response?: {
    data?: unknown;
  };
};

export interface ApiFieldErrorEntry {
  code?: string;
  message: string;
  target?: string;
  type?: string;
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ');

const buildEntry = (entry: BackendErrorEntry): ApiFieldErrorEntry | null => {
  const message = asString(entry.message) ?? asString(entry.msg);

  if (!message) {
    return null;
  }

  const loc = Array.isArray(entry.loc)
    ? entry.loc
        .map((item) => asString(item))
        .filter((item): item is string => Boolean(item))
        .filter((item) => item !== 'body')
        .join('.')
    : null;

  return {
    message,
    code: asString(entry.code) ?? undefined,
    target: asString(entry.target) ?? loc ?? undefined,
    type: asString(entry.type) ?? undefined,
  };
};

const collectEntriesFromArray = (value: unknown): ApiFieldErrorEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const directMessage = asString(entry);
    if (directMessage) {
      return [{ message: directMessage }];
    }

    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const builtEntry = buildEntry(entry as BackendErrorEntry);
    return builtEntry ? [builtEntry] : [];
  });
};

export const extractApiFieldErrors = (error: unknown): ApiFieldErrorEntry[] => {
  const payload =
    (error as ErrorLike)?.response?.data ??
    (error as ErrorLike)?.data ??
    error;

  if (!payload || typeof payload !== 'object') {
    const message = asString((error as ErrorLike)?.message);
    return message ? [{ message }] : [];
  }

  const record = payload as Record<string, unknown>;
  const errorEntries = collectEntriesFromArray(record.errors);

  if (errorEntries.length > 0) {
    return errorEntries;
  }

  const detailEntries = collectEntriesFromArray(record.detail);
  if (detailEntries.length > 0) {
    return detailEntries;
  }

  const detailMessage = asString(record.detail);
  if (detailMessage) {
    return [{ message: detailMessage }];
  }

  const message = asString(record.message) ?? asString(record.error) ?? asString((error as ErrorLike)?.message);
  return message ? [{ message }] : [];
};

export const resolveApiFieldName = <FieldName extends string>(
  entry: ApiFieldErrorEntry,
  aliases: Record<string, FieldName>
): FieldName | null => {
  const candidates = [entry.target, entry.message]
    .map((value) => (value ? normalizeText(value) : null))
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    for (const [alias, fieldName] of Object.entries(aliases)) {
      if (candidate.includes(normalizeText(alias))) {
        return fieldName;
      }
    }
  }

  return null;
};
