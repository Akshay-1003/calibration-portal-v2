type ErrorLike = {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
  errors?: unknown;
  data?: unknown;
  response?: {
    data?: unknown;
  };
};

const getStringMessage = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const fromErrorList = (errors: unknown): string | null => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  for (const entry of errors) {
    const directMessage = getStringMessage(entry);
    if (directMessage) {
      return directMessage;
    }

    if (entry && typeof entry === 'object') {
      const objectMessage = getStringMessage((entry as Record<string, unknown>).message);
      if (objectMessage) {
        return objectMessage;
      }
    }
  }

  return null;
};

const fromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return getStringMessage(payload);
  }

  const record = payload as Record<string, unknown>;

  return (
    fromErrorList(record.errors) ||
    getStringMessage(record.detail) ||
    getStringMessage(record.message) ||
    getStringMessage(record.error) ||
    (record.data ? fromPayload(record.data) : null)
  );
};

export const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) {
    return fallback;
  }

  const errorLike = error as ErrorLike;

  return (
    fromPayload(errorLike.response?.data) ||
    fromPayload(errorLike.data) ||
    fromPayload(errorLike) ||
    getStringMessage(errorLike.message) ||
    fallback
  );
};
