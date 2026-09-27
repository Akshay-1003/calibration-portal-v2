/**
 * Validation utilities and exports
 */

export * from './schemas';
export * from './calibrationSchemas';
export * from './inwardGaugeFilterSchemas';
export * from './inwardEntryFilterSchemas';
export * from './quotationSchemas';
export * from './accountDetailsSchemas';

// Re-export commonly used validation utilities
export { z } from 'zod';
export { zodResolver } from '@hookform/resolvers/zod';

// Custom validation helpers
export const createOptionalSchema = <T extends Record<string, any>>(schema: T) => {
  const optionalSchema = {} as { [K in keyof T]: ReturnType<T[K]['optional']> };
  
  Object.keys(schema).forEach((key) => {
    optionalSchema[key as keyof T] = schema[key].optional();
  });
  
  return optionalSchema;
};

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d*\.?\d+$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
} as const;

// Error message helpers
export const getFieldError = (errors: any, fieldPath: string): string | undefined => {
  const keys = fieldPath.split('.');
  let current = errors;
  
  for (const key of keys) {
    if (current?.[key]) {
      current = current[key];
    } else {
      return undefined;
    }
  }
  
  return current?.message;
};

export const hasFieldError = (errors: any, fieldPath: string): boolean => {
  return !!getFieldError(errors, fieldPath);
};
