/**
 * FormDateProvider - Wrapper component to ensure all DatePickers use DD/MM/YYYY format
 * 
 * Wraps forms with I18nProvider to set the locale to "en-GB" which uses DD/MM/YYYY format
 * This ensures consistency across all forms in the application
 */

import { ReactNode } from 'react';
import { I18nProvider } from '@react-aria/i18n';

interface FormDateProviderProps {
  children: ReactNode;
}

/**
 * Use this wrapper around any form that contains DatePicker components
 * to ensure they display dates in DD/MM/YYYY format
 * 
 * @example
 * <FormDateProvider>
 *   <form>
 *     <DatePicker ... />
 *   </form>
 * </FormDateProvider>
 */
export function FormDateProvider({ children }: FormDateProviderProps) {
  return (
    <I18nProvider locale="en-GB">
      {children}
    </I18nProvider>
  );
}


