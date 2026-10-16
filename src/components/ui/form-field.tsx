/**
 * Reusable form field component with consistent error handling
 * Integrates with React Hook Form and provides standardized styling
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { FieldError, Label } from '@heroui/react';

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
    <div className={cn('min-w-0 space-y-2', className)}>
      {label && (
        <Label className={cn('block text-sm font-medium leading-tight text-slate-800', labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-1 font-bold">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <div
        className={cn(
          'relative w-full min-w-0',
          '[&>[data-slot=input]]:w-full',
          '[&>[data-slot=input]]:!h-10 [&>[data-slot=input]]:!min-h-10 [&>[data-slot=input]]:!rounded-md [&>[data-slot=input]]:border [&>[data-slot=input]]:border-slate-200 [&>[data-slot=input]]:bg-white [&>[data-slot=input]]:shadow-none [&>[data-slot=input]]:hover:border-slate-300 [&>[data-slot=input]]:focus-within:border-slate-400 [&>[data-slot=input]]:focus-within:bg-slate-100',
          '[&>[data-slot=select]]:w-full',
          '[&>[data-slot=select]>[data-slot=select-trigger]]:w-full',
          '[&>[data-slot=date-picker]]:w-full',
          '[&>[data-slot=date-picker]>[data-slot=date-input-group]]:w-full',
          '[&>[data-slot=autocomplete]]:w-full',
          '[&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:w-full',
          '[&>[data-slot=autocomplete]_[data-slot=input]]:w-full',
          '[&>[data-slot=textarea]]:w-full',
          '[&>[data-slot=textarea]]:min-h-20',
          '[&>textarea]:w-full',
          '[&>[data-slot=input-wrapper]]:!h-10 [&>[data-slot=input-wrapper]]:!min-h-10 [&>[data-slot=input-wrapper]]:!rounded-md [&>[data-slot=input-wrapper]]:border [&>[data-slot=input-wrapper]]:border-slate-200 [&>[data-slot=input-wrapper]]:bg-white [&>[data-slot=input-wrapper]]:shadow-none [&>[data-slot=input-wrapper]]:hover:border-slate-300 [&>[data-slot=input-wrapper]]:focus-within:border-slate-400 [&>[data-slot=input-wrapper]]:focus-within:bg-slate-100',
          '[&>[data-slot=select]>[data-slot=select-trigger]]:!h-10 [&>[data-slot=select]>[data-slot=select-trigger]]:!min-h-10 [&>[data-slot=select]>[data-slot=select-trigger]]:!rounded-md [&>[data-slot=select]>[data-slot=select-trigger]]:border [&>[data-slot=select]>[data-slot=select-trigger]]:border-slate-200 [&>[data-slot=select]>[data-slot=select-trigger]]:bg-white [&>[data-slot=select]>[data-slot=select-trigger]]:shadow-none [&>[data-slot=select]>[data-slot=select-trigger]]:hover:border-slate-300',
          '[&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:!h-10 [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:!min-h-10 [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:!rounded-md [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:border [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:border-slate-200 [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:bg-white [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:shadow-none [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:hover:border-slate-300',
          '[&>[data-slot=date-picker]>[data-slot=date-input-group]]:!h-10 [&>[data-slot=date-picker]>[data-slot=date-input-group]]:!min-h-10 [&>[data-slot=date-picker]>[data-slot=date-input-group]]:!rounded-md [&>[data-slot=date-picker]>[data-slot=date-input-group]]:border [&>[data-slot=date-picker]>[data-slot=date-input-group]]:border-slate-200 [&>[data-slot=date-picker]>[data-slot=date-input-group]]:bg-white [&>[data-slot=date-picker]>[data-slot=date-input-group]]:shadow-none [&>[data-slot=date-picker]>[data-slot=date-input-group]]:hover:border-slate-300',
        )}
      >
        {children}
      </div>
      
      {error && <FieldError className="mt-1 text-xs font-medium">{error}</FieldError>}
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
