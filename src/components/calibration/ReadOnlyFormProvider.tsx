/**
 * ReadOnlyFormProvider
 * 
 * Provides a form context for read-only calibration components without actual form functionality.
 * This allows us to reuse the same calibration components for history display.
 * 
 * Key Features:
 * - Provides full form context for components that use useFormContext
 * - Prevents mutations while maintaining read-only functionality
 * - Each instance is isolated - no shared state between history entries
 */

import React, { useMemo, useEffect } from 'react';
import { FormProvider, useForm, UseFormReturn } from 'react-hook-form';

interface ReadOnlyFormProviderProps {
  defaultValues?: any;
  children: React.ReactNode;
}

/**
 * Wrapper component that provides a read-only form context
 * This allows calibration components that use useFormContext to work in read-only mode
 * 
 * IMPORTANT: Each history entry gets its own isolated form instance.
 * No state is shared between entries or with the edit form.
 */
export const ReadOnlyFormProvider: React.FC<ReadOnlyFormProviderProps> = ({
  defaultValues = {},
  children,
}) => {
  // Create a form instance with default values
  // Each instance is completely isolated - no shared state
  const methods = useForm({
    defaultValues,
    mode: 'onChange',
    shouldUnregister: false,
  });

  // Ensure form is initialized with default values
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      methods.reset(defaultValues, {
        keepDefaultValues: true,
        keepValues: true,
      });
    }
  }, [defaultValues, methods]);

  // Create read-only methods that maintain form structure but prevent mutations
  // Components will still receive form context but inputs will be disabled via isReadOnly prop
  // The actual disabling happens at the Input component level via disabled={isReadOnly}
  const readOnlyMethods = useMemo(() => {
    return {
      ...methods,
      formState: {
        ...methods.formState,
        isSubmitting: false,
        isValid: true,
        isDirty: false,
      },
    } as UseFormReturn<any>;
  }, [methods]);

  return (
    <FormProvider {...readOnlyMethods}>
      {children}
    </FormProvider>
  );
};

