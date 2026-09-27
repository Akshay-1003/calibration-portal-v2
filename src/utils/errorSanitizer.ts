/**
 * Error Sanitization Utility
 * Prevents information leakage by sanitizing error messages before displaying to users
 */

import { ApiError } from '../services/api-client';

/**
 * Patterns that might leak sensitive information
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /\/[a-zA-Z0-9\/\-_\.]+\.(js|ts|tsx|json|py|log)/gi,
  // IP addresses
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Stack traces
  /at\s+\w+.*\(.+\)/gi,
  /at\s+.*:\d+:\d+/gi,
  // SQL errors (database names, table names might leak structure)
  /SQLSTATE|sql|database|table|column/gi,
  // Internal error references
  /Error\s+#\d+/gi,
  // Internal API paths that shouldn't be exposed
  /\/internal\/|\/private\/|\/admin\/|\/_/gi,
  // Memory addresses or internal IDs
  /0x[a-f0-9]+/gi,
];

/**
 * Safe error messages mapped by HTTP status code
 */
const SAFE_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input.',
  401: 'Please log in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  408: 'Request timeout. Please try again.',
  409: 'Conflict. The resource already exists.',
  422: 'Validation error. Please check your input.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service temporarily unavailable. Please try again later.',
  504: 'Service temporarily unavailable. Please try again later.',
};

/**
 * Sanitizes an error message to prevent information leakage
 * @param errorMessage - The original error message
 * @param statusCode - Optional HTTP status code
 * @returns Sanitized error message safe for user display
 */
export const sanitizeErrorMessage = (
  errorMessage: string,
  statusCode?: number
): string => {
  // If we have a safe message for this status code, use it
  if (statusCode && SAFE_ERROR_MESSAGES[statusCode]) {
    return SAFE_ERROR_MESSAGES[statusCode];
  }

  // Remove sensitive patterns
  let sanitized = errorMessage;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Remove extra whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');

  // Truncate very long messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  // If message is empty or just "[REDACTED]", use a generic message
  if (!sanitized || sanitized.trim() === '[REDACTED]' || sanitized.length === 0) {
    if (statusCode) {
      if (statusCode >= 500) {
        return 'Server error. Please try again later.';
      } else if (statusCode >= 400) {
        return 'Request failed. Please try again.';
      }
    }
    return 'An unexpected error occurred. Please try again.';
  }

  return sanitized;
};

/**
 * Sanitizes an ApiError instance
 * @param error - The ApiError instance
 * @returns Sanitized error message
 */
export const sanitizeApiError = (error: ApiError): string => {
  return sanitizeErrorMessage(error.message, error.status);
};

/**
 * Sanitizes any error object
 * @param error - Any error object
 * @returns Sanitized error message
 */
export const sanitizeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return sanitizeApiError(error);
  }

  if (error instanceof Error) {
    // For generic errors, don't use status code
    return sanitizeErrorMessage(error.message);
  }

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const status = 'status' in error && typeof error.status === 'number' 
      ? error.status 
      : undefined;
    return sanitizeErrorMessage(String(error.message), status);
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Sanitizes error details for logging (keeps more info than user-facing messages)
 * @param error - Any error object
 * @returns Object with sanitized error details safe for logging
 */
export const sanitizeErrorForLogging = (error: unknown): {
  message: string;
  type: string;
  status?: number;
  code?: string;
  stack?: string;
} => {
  const result: {
    message: string;
    type: string;
    status?: number;
    code?: string;
    stack?: string;
  } = {
    message: sanitizeError(error),
    type: error instanceof Error ? error.constructor.name : typeof error,
  };

  if (error instanceof ApiError) {
    result.status = error.status;
    result.code = error.code;
  }

  if (error instanceof Error && error.stack) {
    // Sanitize stack trace but keep structure
    result.stack = error.stack
      .split('\n')
      .map((line) => {
        for (const pattern of SENSITIVE_PATTERNS) {
          if (pattern.test(line)) {
            return line.replace(pattern, '[REDACTED]');
          }
        }
        return line;
      })
      .join('\n');
  }

  return result;
};

