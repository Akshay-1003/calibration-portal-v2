/**
 * Reusable form field component with consistent error handling
 * Integrates with React Hook Form and provides standardized styling
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
  labelClassName?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
  className = '',
  description,
  labelClassName = '',
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className={cn('block text-sm font-medium text-foreground leading-tight', labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-1 font-bold">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div className="relative">
        {children}
      </div>
      
      {error && (
        <p className="text-xs text-destructive mt-1 font-medium flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

// Specialized form field components
interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  inputClassName?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(({
  label,
  required,
  error,
  description,
  className,
  inputClassName,
  disabled,
  ...inputProps
}, ref) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      description={description}
      className={className}
    >
      <input
        ref={ref}
        {...inputProps}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          inputClassName
        )}
      />
    </FormField>
  );
});

FormInput.displayName = "FormInput";

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
  textareaClassName?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  required,
  error,
  description,
  className,
  textareaClassName,
  ...textareaProps
}) => {
  return (
    <FormField
      label={label}
      required={required}
      error={error}
      description={description}
      className={className}
    >
      <textarea
        {...textareaProps}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          textareaClassName
        )}
      />
    </FormField>
  );
};

// Form section wrapper for better organization
interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};