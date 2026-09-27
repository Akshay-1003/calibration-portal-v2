import React, { forwardRef } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
    message?: string;
  };
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({
    label,
    error,
    touched,
    required,
    validationRules,
    onValidationChange,
    className,
    onChange,
    onBlur,
    ...props
  }, ref) => {
    const [localError, setLocalError] = React.useState<string>('');
    const [isTouched, setIsTouched] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Validate on change if validation rules are provided
      if (validationRules) {
        const errors = validateField(value, validationRules);
        const isValid = errors.length === 0;
        setLocalError(errors[0] || '');
        
        if (onValidationChange) {
          onValidationChange(isValid, errors);
        }
      }
      
      if (onChange) {
        onChange(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsTouched(true);
      
      // Validate on blur if validation rules are provided
      if (validationRules) {
        const value = e.target.value;
        const errors = validateField(value, validationRules);
        const isValid = errors.length === 0;
        setLocalError(errors[0] || '');
        
        if (onValidationChange) {
          onValidationChange(isValid, errors);
        }
      }
      
      if (onBlur) {
        onBlur(e);
      }
    };

    const displayError = error || localError;
    const showError = (touched || isTouched) && displayError;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={props.id} className={cn(required && "after:content-['*'] after:text-red-500 after:ml-1")}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          className={cn(
            showError && "border-red-500 focus:border-red-500 focus:ring-red-500",
            className
          )}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {showError && (
          <p className="text-sm text-red-500 mt-1">
            {displayError}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

// Validation function (simplified version for this component)
const validateField = (value: any, rules: any): string[] => {
  const errors: string[] = [];
  
  if (rules.required && (!value || value.toString().trim() === '')) {
    errors.push(rules.message || 'This field is required');
    return errors;
  }
  
  if (!value || value.toString().trim() === '') {
    return errors;
  }
  
  const stringValue = value.toString();
  
  if (rules.minLength && stringValue.length < rules.minLength) {
    errors.push(rules.message || `Must be at least ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    errors.push(rules.message || `Must be no more than ${rules.maxLength} characters`);
  }
  
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    errors.push(rules.message || 'Invalid format');
  }
  
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }
  
  return errors;
};

export default ValidatedInput;
