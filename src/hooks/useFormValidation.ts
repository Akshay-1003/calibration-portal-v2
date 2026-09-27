/**
 * Custom hook for form validation with consistent error handling
 * Provides utilities for form state management and validation
 */

import { useCallback } from 'react';
import { FieldErrors, FieldValues } from 'react-hook-form';
import { toast } from 'sonner';

interface UseFormValidationOptions {
  showToastOnError?: boolean;
  scrollToFirstError?: boolean;
}

export const useFormValidation = <T extends FieldValues>(
  options: UseFormValidationOptions = {}
) => {
  const { showToastOnError = true, scrollToFirstError = true } = options;

  // Get field error message
  const getFieldError = useCallback((errors: FieldErrors<T>, fieldPath: string): string | undefined => {
    const keys = fieldPath.split('.');
    let current: any = errors;
    
    for (const key of keys) {
      if (current?.[key]) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current?.message;
  }, []);

  // Check if field has error
  const hasFieldError = useCallback((errors: FieldErrors<T>, fieldPath: string): boolean => {
    return !!getFieldError(errors, fieldPath);
  }, [getFieldError]);

  // Handle form submission errors
  const handleFormError = useCallback((errors: FieldErrors<T>) => {
    const errorMessages = Object.values(errors)
      .map(error => error?.message)
      .filter(Boolean);

    if (errorMessages.length > 0 && showToastOnError) {
      toast.error('Please fix the following errors:', {
        description: errorMessages.slice(0, 3).join(', ') + 
          (errorMessages.length > 3 ? ` and ${errorMessages.length - 3} more...` : ''),
      });
    }

    if (scrollToFirstError) {
      // Scroll to first error field
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [showToastOnError, scrollToFirstError]);

  // Get error class for styling
  const getErrorClass = useCallback((errors: FieldErrors<T>, fieldPath: string, baseClass = ''): string => {
    const hasError = hasFieldError(errors, fieldPath);
    return hasError ? `${baseClass} border-destructive focus:border-destructive` : baseClass;
  }, [hasFieldError]);

  // Format validation errors for display
  const formatErrors = useCallback((errors: FieldErrors<T>): string[] => {
    const formatError = (error: any, path = ''): string[] => {
      if (error?.message) {
        return [error.message];
      }
      
      if (typeof error === 'object' && error !== null) {
        return Object.entries(error).flatMap(([key, value]) => 
          formatError(value, path ? `${path}.${key}` : key)
        );
      }
      
      return [];
    };

    return Object.entries(errors).flatMap(([key, error]) => 
      formatError(error, key)
    );
  }, []);

  return {
    getFieldError,
    hasFieldError,
    handleFormError,
    getErrorClass,
    formatErrors,
  };
};

// Hook for async form submission with loading states
export const useAsyncFormSubmit = <T extends FieldValues>(
  onSubmit: (data: T) => Promise<void>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: any, data: T) => void;
    successMessage?: string;
    errorMessage?: string;
  } = {}
) => {
  const {
    onSuccess,
    onError,
    successMessage = 'Form submitted successfully!',
    errorMessage = 'An error occurred while submitting the form.',
  } = options;

  const handleSubmit = useCallback(async (data: T) => {
    try {
      await onSubmit(data);
      toast.success(successMessage);
      onSuccess?.(data);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error(errorMessage);
      onError?.(error, data);
    }
  }, [onSubmit, onSuccess, onError, successMessage, errorMessage]);

  return { handleSubmit };
};