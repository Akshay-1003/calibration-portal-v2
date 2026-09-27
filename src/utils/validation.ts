// Input validation utilities
import React from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHABETIC: /^[a-zA-Z\s]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d+(\.\d{1,2})?$/,
  URL: /^https?:\/\/.+/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  GST_NUMBER: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN_NUMBER: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  AADHAR_NUMBER: /^[0-9]{4}[0-9]{4}[0-9]{4}$/,
} as const;

// Common validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
  PATTERN: 'Invalid format',
  EMAIL: 'Please enter a valid email address',
  PHONE: 'Please enter a valid phone number',
  URL: 'Please enter a valid URL',
  GST: 'Please enter a valid GST number',
  PAN: 'Please enter a valid PAN number',
  AADHAR: 'Please enter a valid Aadhar number',
  NUMERIC: 'Please enter a valid number',
  DECIMAL: 'Please enter a valid decimal number',
  ALPHANUMERIC: 'Only letters and numbers are allowed',
  ALPHABETIC: 'Only letters are allowed',
} as const;

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/['"]/g, ''); // Remove quotes
};

export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      return urlObj.toString();
    }
    return '';
  } catch {
    return '';
  }
};

// Validation functions
export const validateField = (value: any, rules: ValidationRule): string[] => {
  const errors: string[] = [];
  
  // Required validation
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(rules.message || VALIDATION_MESSAGES.REQUIRED);
    return errors; // Don't check other rules if required field is empty
  }
  
  // Skip other validations if value is empty and not required
  if (!value || value.toString().trim() === '') {
    return errors;
  }
  
  const stringValue = value.toString();
  
  // Min length validation
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(rules.message || VALIDATION_MESSAGES.MIN_LENGTH(rules.minLength));
  }
  
  // Max length validation
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(rules.message || VALIDATION_MESSAGES.MAX_LENGTH(rules.maxLength));
  }
  
  // Pattern validation
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(rules.message || VALIDATION_MESSAGES.PATTERN);
  }
  
  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return errors;
};

export const validateForm = (data: Record<string, any>, schema: ValidationSchema): ValidationResult => {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  Object.keys(schema).forEach((field: string) => {
    const rule = schema[field];
    const fieldErrors: string[] = validateField(data[field], rule);
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
};

// Common validation schemas
export const COMMON_SCHEMAS = {
  EMAIL: {
    required: true,
    pattern: VALIDATION_PATTERNS.EMAIL,
    message: VALIDATION_MESSAGES.EMAIL,
  },
  
  PHONE: {
    required: true,
    pattern: VALIDATION_PATTERNS.PHONE,
    message: VALIDATION_MESSAGES.PHONE,
  },
  
  NAME: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.ALPHABETIC,
    message: 'Name must contain only letters and be 2-50 characters long',
  },
  
  PASSWORD: {
    required: true,
    minLength: 8,
    maxLength: 128,
    custom: (value: string) => {
      if (!/(?=.*[a-z])/.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!/(?=.*[A-Z])/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/(?=.*\d)/.test(value)) {
        return 'Password must contain at least one number';
      }
      if (!/(?=.*[@$!%*?&])/.test(value)) {
        return 'Password must contain at least one special character (@$!%*?&)';
      }
      return null;
    },
  },
  
  GST_NUMBER: {
    required: true,
    pattern: VALIDATION_PATTERNS.GST_NUMBER,
    message: VALIDATION_MESSAGES.GST,
  },
  
  PAN_NUMBER: {
    required: true,
    pattern: VALIDATION_PATTERNS.PAN_NUMBER,
    message: VALIDATION_MESSAGES.PAN,
  },
  
  AADHAR_NUMBER: {
    required: true,
    pattern: VALIDATION_PATTERNS.AADHAR_NUMBER,
    message: VALIDATION_MESSAGES.AADHAR,
  },
  
  URL: {
    required: true,
    pattern: VALIDATION_PATTERNS.URL,
    message: VALIDATION_MESSAGES.URL,
  },
  
  DECIMAL: {
    required: true,
    pattern: VALIDATION_PATTERNS.DECIMAL,
    message: VALIDATION_MESSAGES.DECIMAL,
  },
  
  POSITIVE_NUMBER: {
    required: true,
    custom: (value: any) => {
      const num = parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return 'Must be a positive number';
      }
      return null;
    },
  },
} as const;

// Form validation hook
export const useFormValidation = (schema: ValidationSchema) => {
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = React.useCallback((data: Record<string, any>): ValidationResult => {
    const result = validateForm(data, schema);
    setErrors(result.errors);
    return result;
  }, [schema]);

  // rename to avoid shadowing exported validateField
  const validateSingleField = React.useCallback((field: string, value: any): string[] => {
    const fieldRules = schema[field];
    if (!fieldRules) return [];

    const fieldErrors: string[] = validateField(value, fieldRules);
    setErrors(prev => ({
      ...prev,
      [field]: fieldErrors,
    }));

    return fieldErrors;
  }, [schema]);

  const setFieldTouched = React.useCallback((field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
    }));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = React.useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const hasErrors = Object.keys(errors).length > 0;
  const hasFieldError = (field: string) => !!(errors[field] && errors[field].length > 0);
  const getFieldError = (field: string) => errors[field]?.[0] || '';
  const isFieldTouched = (field: string) => !!touched[field];

  return {
    errors,
    touched,
    validate,
    validateField: validateSingleField,
    setFieldTouched,
    clearErrors,
    clearFieldError,
    hasErrors,
    hasFieldError,
    getFieldError,
    isFieldTouched,
  };
};

// (React is already imported at top of file)
