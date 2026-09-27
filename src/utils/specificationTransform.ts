/**
 * Specification Transformation Utilities
 * Converts string numbers to proper numbers (int or float) in specifications
 * and handles standard_specification ID conversion
 */

/**
 * Converts a string value to a number (int or float) if it's a valid number
 * Preserves the original type if it's already a number or not a valid number string
 */
const NUMERIC_STRING_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

function convertStringToNumber(value: unknown): unknown {
  // If already a number, return as-is
  if (typeof value === 'number') {
    return value;
  }

  // If not a string, return as-is
  if (typeof value !== 'string') {
    return value;
  }

  // Empty string or whitespace-only string -> return as-is (or undefined)
  if (value.trim() === '' || value === '') {
    return undefined;
  }

  const trimmedValue = value.trim();

  // Only convert when the whole string is numeric.
  // This prevents IDs like "6a3ececa..." from becoming 6.
  if (!NUMERIC_STRING_PATTERN.test(trimmedValue)) {
    return value;
  }

  // Try to parse as number
  const num = Number(trimmedValue);
  
  // If not a valid number, return original string
  if (isNaN(num)) {
    return value;
  }

  // Check if it's a whole number (integer) or decimal (float)
  // If the string representation matches the number exactly (no decimals), it's an integer
  // Otherwise, it's a float
  const isInteger = Number.isInteger(num) && !value.includes('.');
  
  return isInteger ? Math.round(num) : num;
}

/**
 * Fields that should remain as strings (never converted to numbers)
 */
const STRING_FIELDS = new Set([
  'standard_specification',
  'gauge_type',
  'gauge_class',
  'identification_number',
  'make',
  'manf_serial_number',
  'calibration_done_under',
  'gauge_condition',
  'calibration_location_type',
  'unit',
  'process',
  'method',
  'diameter_type',
  'surface_plate_ref_id',
  'standard_specification_id',
]);

/**
 * Recursively converts string numbers to proper numbers in an object
 * Handles nested objects, arrays, and preserves non-numeric strings
 * Skips conversion for fields that should remain as strings (like standard_specification)
 */
function convertSpecificationNumbers(obj: unknown, parentKey?: string): unknown {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertSpecificationNumbers(item, parentKey));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if this field should remain as string
      const shouldKeepAsString = STRING_FIELDS.has(key);
      
      // Recursively process nested objects/arrays
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = convertSpecificationNumbers(value, key);
      } else if (shouldKeepAsString) {
        // Keep as string - don't convert to number
        result[key] = value;
      } else {
        // Convert string numbers to numbers
        result[key] = convertStringToNumber(value);
      }
    }
    
    return result;
  }

  // Handle primitives - check parent key to see if we should keep as string
  if (parentKey && STRING_FIELDS.has(parentKey)) {
    return obj; // Keep as string
  }
  
  return convertStringToNumber(obj);
}

/**
 * Converts standard_specification value to ID if needed
 * For PlainThreadPlugGauge and TaperThreadPlugGauge components
 */
function convertStandardSpecificationToId(
  specifications: Record<string, unknown>,
  specificationList: Array<{ id: string; standard_specification: string }>
): Record<string, unknown> {
  if (!specifications || typeof specifications !== 'object') {
    return specifications;
  }

  const standardSpec = specifications.standard_specification;
  
  // If standard_specification exists and is a string (not already an ID)
  if (standardSpec && typeof standardSpec === 'string') {
    // Check if it's already an ID (UUID format or numeric ID)
    // If it matches an ID in the list, use it
    const foundById = specificationList.find(spec => spec.id === standardSpec);
    if (foundById) {
      // Already an ID, keep it
      return specifications;
    }

    // Otherwise, find by standard_specification value and use its ID
    const foundByValue = specificationList.find(
      spec => spec.standard_specification === standardSpec
    );
    if (foundByValue) {
      return {
        ...specifications,
        standard_specification: foundByValue.id,
      };
    }
  }

  return specifications;
}

/**
 * Main function to transform specifications before sending to API
 * - Converts string numbers to proper numbers (int/float)
 * - Converts standard_specification value to ID if needed
 */
export function transformSpecificationsForPayload(
  specifications: unknown,
  options?: {
    specificationList?: Array<{ id: string; standard_specification: string }>;
  }
): unknown {
  if (!specifications) {
    return specifications;
  }

  // First, convert all string numbers to proper numbers
  let transformed = convertSpecificationNumbers(specifications);
  // Then, convert standard_specification to ID if needed
  if (
    options?.specificationList &&
    transformed &&
    typeof transformed === 'object' &&
    !Array.isArray(transformed)
  ) {
    transformed = convertStandardSpecificationToId(
      transformed as Record<string, unknown>,
      options.specificationList
    );
  }

  return transformed;
}

/**
 * Type guard to check if value is a numeric string
 */
export function isNumericString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.trim() === '') return false;
  return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
}



