import { useCallback } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../services/api-client';
import { sanitizeError, sanitizeErrorForLogging } from '../utils/errorSanitizer';
import { logger } from '../utils/logger';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred',
    } = options;
    void fallbackMessage;

    let errorCode: string | undefined;
    let isRetryable = false;
    let statusCode: number | undefined;

    // Handle different error types
    if (error instanceof ApiError) {
      errorCode = error.code;
      isRetryable = error.retryable;
      statusCode = error.status;
    }

    // Sanitize error message for user display
    const sanitizedMessage = sanitizeError(error);

    // Log sanitized error details if enabled
    if (logError) {
      const sanitizedLog = sanitizeErrorForLogging(error);
      logger.error('Error handled:', {
        message: sanitizedLog.message,
        code: sanitizedLog.code || errorCode,
        status: sanitizedLog.status || statusCode,
        retryable: isRetryable,
        type: sanitizedLog.type,
        stack: sanitizedLog.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Show sanitized message to user
    if (showToast) {
      if (isRetryable) {
        toast.error(`${sanitizedMessage} (Retryable)`, {
          action: {
            label: 'Retry',
            onClick: () => {
              // This would need to be passed from the component
            },
          },
        });
      } else {
        toast.error(sanitizedMessage);
      }
    }

    return {
      message: sanitizedMessage,
      code: errorCode,
      retryable: isRetryable,
    };
  }, []);

  const handleApiError = useCallback((
    error: ApiError,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
    } = options;

    // Sanitize error message (will use safe messages based on status code)
    const sanitizedMessage = sanitizeError(error);

    // Determine toast type based on status
    let toastType: 'error' | 'warning' = 'error';
    if (error.status === 429) {
      toastType = 'warning';
    }

    // Log sanitized error details if enabled
    if (logError) {
      const sanitizedLog = sanitizeErrorForLogging(error);
      logger.error('API Error handled:', {
        status: sanitizedLog.status || error.status,
        message: sanitizedLog.message,
        code: sanitizedLog.code || error.code,
        retryable: error.retryable,
        type: sanitizedLog.type,
        stack: sanitizedLog.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Show sanitized message to user
    if (showToast) {
      if (toastType === 'warning') {
        toast.warning(sanitizedMessage);
      } else {
        toast.error(sanitizedMessage);
      }
    }

    return {
      message: sanitizedMessage,
      status: error.status,
      code: error.code,
      retryable: error.retryable,
    };
  }, []);

  const handleNetworkError = useCallback((
    error: Error,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
    } = options;

    // Determine user-friendly message without exposing technical details
    let errorMessage = 'Network error. Please check your connection.';
    const sanitizedError = sanitizeError(error);

    // Use sanitized message but provide context-appropriate defaults
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('AbortError')) {
      errorMessage = 'Request was cancelled.';
    } else {
      // Use sanitized message as fallback
      errorMessage = sanitizedError;
    }

    // Log sanitized error details if enabled
    if (logError) {
      const sanitizedLog = sanitizeErrorForLogging(error);
      logger.error('Network Error handled:', {
        message: sanitizedLog.message,
        type: sanitizedLog.type,
        stack: sanitizedLog.stack,
        timestamp: new Date().toISOString(),
      });
    }

    // Show sanitized message to user
    if (showToast) {
      toast.error(errorMessage);
    }

    return {
      message: errorMessage,
      retryable: true,
    };
  }, []);

  const handleValidationError = useCallback((
    errors: Record<string, string[]>,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
    } = options;

    // Sanitize field names and messages
    const errorMessages = Object.entries(errors).map(([field, messages]) => {
      const sanitizedField = sanitizeError(field);
      const sanitizedMessages = messages.map(msg => sanitizeError(msg));
      return `${sanitizedField}: ${sanitizedMessages.join(', ')}`;
    });

    const errorMessage = `Validation failed: ${errorMessages.join('; ')}`;

    // Log sanitized error details if enabled
    if (logError) {
      logger.error('Validation Error handled:', {
        errors: Object.keys(errors), // Only log field names, not values
        fieldCount: Object.keys(errors).length,
        message: sanitizeError(errorMessage),
        timestamp: new Date().toISOString(),
      });
    }

    // Show sanitized message to user
    if (showToast) {
      toast.error(errorMessage);
    }

    return {
      message: errorMessage,
      errors,
      retryable: false,
    };
  }, []);

  return {
    handleError,
    handleApiError,
    handleNetworkError,
    handleValidationError,
  };
};

export default useErrorHandler;
