import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';

/**
 * Hook to auto-sync repeatability and type_a_readings fields in calibration forms
 * 
 * When user enters values in repeatability, automatically populate type_a_readings
 * This works only when both fields exist in the observation schema
 * 
 * Usage:
 * ```tsx
 * const { syncToTypeA, syncToRepeatability } = useObservationAutoSync();
 * 
 * // In repeatability field onChange
 * onChange={(e) => {
 *   syncToTypeA(e.target.value);
 *   // ... other logic
 * }}
 * 
 * // In type_a_readings field onChange  
 * onChange={(e) => {
 *   syncToRepeatability(e.target.value);
 *   // ... other logic
 * }}
 * ```
 */
export function useObservationAutoSync() {
  const { getValues, setValue } = useFormContext();

  const normalizeToNumbers = useCallback((values: Array<string | number | null | undefined>) => {
    return values.map((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return Number.isNaN(num) ? null : num;
    });
  }, []);

  const normalizeToStrings = useCallback((values: Array<string | number | null | undefined>) => {
    return values.map((val) => {
      if (val === '' || val === null || val === undefined) return '';
      return String(val);
    });
  }, []);

  /**
   * Sync repeatability values to type_a_readings
   * Converts string values to numbers for type_a_readings
   */
  const syncToTypeA = useCallback((repeatabilityValues: string[] | number[] | undefined) => {
    if (!repeatabilityValues || !Array.isArray(repeatabilityValues)) return;

    const numericValues = normalizeToNumbers(repeatabilityValues).filter((val): val is number => val !== null);
    const currentTypeA = getValues('observations.type_a_readings');
    const currentNormalized = Array.isArray(currentTypeA)
      ? normalizeToNumbers(currentTypeA).filter((val): val is number => val !== null)
      : [];

    // Avoid redundant form writes that can create update loops
    if (JSON.stringify(currentNormalized) === JSON.stringify(numericValues)) {
      return;
    }

    // Update type_a_readings
    setValue('observations.type_a_readings', numericValues, { 
      shouldDirty: true,
      shouldTouch: true
    });
  }, [getValues, normalizeToNumbers, setValue]);

  /**
   * Sync type_a_readings values to repeatability
   * Converts numbers to strings for repeatability
   */
  const syncToRepeatability = useCallback((typeAValues: number[] | undefined) => {
    if (!typeAValues || !Array.isArray(typeAValues)) return;

    const stringValues = normalizeToStrings(typeAValues);
    const currentRepeatability = getValues('observations.repeatability');
    const currentNormalized = Array.isArray(currentRepeatability)
      ? normalizeToStrings(currentRepeatability)
      : [];

    // Avoid redundant form writes that can create update loops
    if (JSON.stringify(currentNormalized) === JSON.stringify(stringValues)) {
      return;
    }

    // Update repeatability
    setValue('observations.repeatability', stringValues, {
      shouldDirty: true,
      shouldTouch: true
    });
  }, [getValues, normalizeToStrings, setValue]);

  /**
   * Check if both fields are available in the current form
   */
  const hasBothFields = useCallback(() => {
    const observations = getValues('observations') || {};
    return (
      typeof observations === 'object' &&
      observations !== null &&
      'repeatability' in observations &&
      'type_a_readings' in observations
    );
  }, [getValues]);

  return {
    syncToTypeA,
    syncToRepeatability,
    hasBothFields
  };
}

export default useObservationAutoSync;
