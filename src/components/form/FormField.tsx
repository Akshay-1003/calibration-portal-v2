import React from 'react';
import { cn } from '../../lib/utils';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helpText,
  children,
  className,
  htmlFor,
}) => {
  return (
    <div className={cn('form-field min-w-0', className)}>
      <label htmlFor={htmlFor} className="form-label">
        {label}
        {required && <span className="form-label-required">*</span>}
      </label>
      <div className="relative w-full min-w-0 [&>[data-slot=input]]:w-full [&>[data-slot=select]]:w-full [&>[data-slot=select]>[data-slot=select-trigger]]:w-full [&>[data-slot=date-picker]]:w-full [&>[data-slot=date-picker]>[data-slot=date-input-group]]:w-full [&>[data-slot=autocomplete]]:w-full [&>[data-slot=autocomplete]>[data-slot=autocomplete-trigger]]:w-full [&>[data-slot=autocomplete]_[data-slot=input]]:w-full [&>[data-slot=textarea]]:w-full [&>[data-slot=textarea]]:min-h-20 [&>textarea]:w-full">
        {children}
      </div>
      {error && (
        <div className="form-error">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {helpText && !error && (
        <div className="form-help-text">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {helpText}
        </div>
      )}
    </div>
  );
};

export interface FormSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  subtitle,
  children,
  className,
}) => {
  return (
    <div className={cn('form-section', className)}>
      <div className="form-section-header">
        <h3 className="form-section-title">{title}</h3>
        {subtitle && <p className="form-section-subtitle">{subtitle}</p>}
      </div>
      <div className="form-grid">
        {children}
      </div>
    </div>
  );
};

export interface FormSubmitSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const FormSubmitSection: React.FC<FormSubmitSectionProps> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('form-submit-section', className)}>
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        {children}
      </div>
    </div>
  );
};
