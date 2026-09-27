import { extractApiFieldErrors, resolveApiFieldName } from '../../../utils/apiFieldErrors';

export type AuthFieldName = string;

type ServiceErrorResponse = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
  errors?: unknown;
};

type ServiceError = {
  response?: {
    status?: number;
    data?: ServiceErrorResponse | string;
  };
  message?: unknown;
};

export interface ParsedAuthError {
  message: string;
  code?: string;
  target?: string;
  type?: string;
  field: AuthFieldName;
  status?: number;
}

export class AuthRequestError extends Error {
  code?: string;
  target?: string;
  type?: string;
  field: AuthFieldName;
  status?: number;
  response?: ServiceError['response'];

  constructor(parsedError: ParsedAuthError) {
    super(parsedError.message);
    this.name = 'AuthRequestError';
    this.code = parsedError.code;
    this.target = parsedError.target;
    this.type = parsedError.type;
    this.field = parsedError.field;
    this.status = parsedError.status;
  }
}

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const defaultFieldAliases = {
  email: 'identifier',
  username: 'identifier',
  identifier: 'identifier',
  password: 'password',
} as const;

export const parseAuthError = (
  error: unknown,
  fallback: string,
  fieldAliases: Record<string, string> = {}
): ParsedAuthError => {
  const backendError = extractApiFieldErrors(error)[0];
  const target = asString(backendError?.target);
  const responseData = (error as ServiceError)?.response?.data;

  return {
    message:
      backendError?.message ||
      (typeof responseData === 'string' ? responseData : null) ||
      asString((error as ServiceError)?.message) ||
      fallback,
    code: backendError?.code ?? undefined,
    target: target ?? undefined,
    type: backendError?.type ?? undefined,
    field:
      (backendError
        ? resolveApiFieldName(backendError, {
            ...defaultFieldAliases,
            ...fieldAliases,
          })
        : null) ?? 'root',
    status: (error as ServiceError)?.response?.status,
  };
};
