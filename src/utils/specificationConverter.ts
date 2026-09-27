/**
 * Simple Specification Converter
 * 
 * Only converts string values in specifications to proper numeric types.
 * Leaves the rest of the payload structure untouched.
 */

import { CertificateType } from '../store/useStore';

type SpecificationRecord = Record<string, unknown>;

/**
 * Convert string values to numbers in specifications object
 */
export function convertSpecificationValues(
  specifications: Record<string, unknown>,
  certificateType: CertificateType
): Record<string, unknown> {
  if (!specifications || typeof specifications !== 'object') {
    return specifications;
  }

  const certTypeName = certificateType.name.toLowerCase().trim();

  // Handle different gauge types based on exact case values from SpecificationTable.tsx
  switch (certTypeName) {
    case 'od limit gauge':
    case 'id limit gauge':
      return convertLimitGaugeSpecifications(specifications);

    case 'master piece':
    case 'slip / feeler gauge':
    case 'slip/ feeler gauge':
      return convertMasterPieceSpecifications(specifications);

    case 'surface plate':
      return convertSurfacePlateSpecifications(specifications);

    case 'dial snap gauge':
    case 'plunger dial':
    case 'lever dial':
      return convertDialGaugeSpecifications(specifications);

    case 'spline gauge':
    case 'spline type gauge':
      return convertSplineGaugeSpecifications(specifications);

    case 'thread plug gauge':
    case 'thread ring gauge':
    case 'taper thread ring gauge':
    case 'taper thread plug gauge':
      return convertTaperThreadGaugeSpecifications(specifications);


    case 'plain taper plug gauge':
    case 'plain taper ring gauge':
      return convertPalinTaperGaugeSpecifications(specifications);

    case 'fixed range gauge':
    case 'external micrometer':
    case 'internal micrometer':
    case 'depth caliper':
    case 'caliper':
    case 'fixed range gauge (degree, min)':
    case 'pressure gauge':
    case 'height gauge':
    case 'electronic height gauge':
    case 'digital dial gauge':
    case 'depth caliper.':
    case 'surface roughness master/tester':
      return convertFixedRangeSpecifications(specifications);

    case 'v block':
      return convertVBlockSpecifications(specifications);

    case 'comparator stand':
      return convertSimpleFieldSpecifications(specifications, ['length', 'width', 'height']);

    case 'bench center':
    case 'master ring':
    case 'id master':
      return convertSimpleFieldSpecifications(specifications, ['basic_size', 'range', 'base_width']);

    case 'no type':
      return specifications;

    default:
      return convertDefaultSpecifications(specifications);
  }
}

/**
 * Convert fixed range gauge specifications
 */
function convertFixedRangeSpecifications(
  specifications: SpecificationRecord
): SpecificationRecord {

  if (!specifications || typeof specifications !== "object") return specifications;

  const result: SpecificationRecord = { ...specifications };
  const range = result.range as SpecificationRecord | undefined;

  // ✅ Handle range object
  if (range && typeof range === "object") {
    result.range = {
      min: range.min !== undefined ? Number(range.min) : range.min,
      max: range.max !== undefined ? Number(range.max) : range.max,
    };
  }

  const numericFields = ["least_count", "basic_size"];

  numericFields.forEach((field) => {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = Number(result[field]);
    }
  });

  return result;
}


/**
 * Convert V Block specifications - only length, width, height
 */
function convertVBlockSpecifications(
  specifications: SpecificationRecord
): SpecificationRecord {
  if (!specifications || typeof specifications !== "object") return specifications;

  const result: SpecificationRecord = {};

  // Only allow length, width, height fields for V Block
  const allowedFields = ['length', 'width', 'height'];
  
  allowedFields.forEach(field => {
    if (specifications[field] !== undefined && specifications[field] !== null) {
      result[field] = Number(specifications[field]);
    }
  });

  return result;
}

/**
 * Convert simple field specifications (like basic_size, range)
 */
function convertSimpleFieldSpecifications(
  specifications: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...specifications };
  fields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = convertToNumber(result[field] as string);
    }
  });
  return result;
}

/**
 * Convert thread gauge specifications
 */
function convertTaperThreadGaugeSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  return {
    standard_specification_id: specifications.standard_specification_id,
    standard_specification: specifications.standard_specification
  };
}
function convertPalinTaperGaugeSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  return specifications;
}

/**
 * Convert limit gauge specifications (ID/OD limit gauges)
 */
function convertLimitGaugeSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...specifications };

  // Convert go and no_go objects
  ['go', 'no_go'].forEach(key => {
    if (result[key] && typeof result[key] === 'object') {
      result[key] = convertObjectValues(result[key] as Record<string, unknown>);
    }
  });

  // Convert inputs object if present
  if (result.inputs && typeof result.inputs === 'object') {
    result.inputs = convertObjectValues(result.inputs as Record<string, unknown>);
  }

  // Convert other numeric fields
  const numericFields = ['basic_size', 'least_count', 'accuracy', 'wear_limit'];
  numericFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = convertToNumber(result[field] as string);
    }
  });

  return result;
}

/**
 * Convert master piece specifications
 */
function convertMasterPieceSpecifications(
  specifications: SpecificationRecord
): SpecificationRecord {

  if (!specifications || typeof specifications !== "object") return specifications;

  const result: SpecificationRecord = { ...specifications };

  // Handle basic_size specifically
  if (result.basic_size !== undefined) {
    const value = result.basic_size;

    // If already array → convert values to number
    if (Array.isArray(value)) {
      result.basic_size = value.map(v => Number(v));
    }
    // If string or number → wrap into array
    else if (typeof value === "string" || typeof value === "number") {
      result.basic_size = [Number(value)];
    }
  }

  return result;
}


/**
 * Convert surface plate specifications
 */
function convertSurfacePlateSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...specifications };

  const numericFields = ['length', 'width', 'block_size', 'block_size', 'lc'];
  numericFields.forEach(field => {
    if (result[field] !== undefined && result[field] !== null && typeof result[field] === 'string') {
      const value = result[field] as string;
      result[field] = value.trim() === '' ? '' : convertToNumber(value);
    }
  });

  return result;
}

/**
 * Convert dial gauge specifications
 */
function convertDialGaugeSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...specifications };

  // Convert nested objects
  const objectFields = ['range', 'accuracy', 'repeatability'];
  objectFields.forEach(field => {
    if (result[field] && typeof result[field] === 'object') {
      result[field] = convertObjectValues(result[field] as Record<string, unknown>);
    }
  });

  // Convert direct numeric fields
  const numericFields = ['least_count', 'dial_diameter', 'stem_length'];
  numericFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = convertToNumber(result[field] as string);
    }
  });

  return result;
}

/**
 * Convert spline gauge specifications
 */
function convertSplineGaugeSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...specifications };

  // Convert various numeric fields
  const numericFields = [
    'major_diameter', 'minor_diameter', 'pitch_diameter',
    'number_of_teeth', 'module', 'pressure_angle',
    'base_tangent_length', 'tooth_thickness'
  ];

  numericFields.forEach(field => {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = convertToNumber(result[field] as string);
    }
  });

  // Convert nested objects if present
  const objectFields = ['measurements', 'tolerances'];
  objectFields.forEach(field => {
    if (result[field] && typeof result[field] === 'object') {
      result[field] = convertObjectValues(result[field] as Record<string, unknown>);
    }
  });

  return result;
}

/**
 * Default conversion for unknown gauge types
 */
function convertDefaultSpecifications(
  specifications: Record<string, unknown>
): Record<string, unknown> {
  return convertObjectValues(specifications);
}

/**
 * Convert all string values in an object to numbers where appropriate
 */
function convertObjectValues(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...obj };

  Object.keys(result).forEach(key => {
    const value = result[key];

    if (typeof value === 'string') {
      // Try to convert to number
      const converted = convertToNumber(value);
      if (converted !== null) {
        result[key] = converted;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively convert nested objects
      result[key] = convertObjectValues(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Convert arrays of objects
      result[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return convertObjectValues(item as Record<string, unknown>);
        }
        return item;
      });
    }
  });

  return result;
}

/**
 * Convert string to number with proper type detection
 */
function convertToNumber(value: string): number | null {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  // Check if it's a number
  if (!isNaN(Number(trimmed))) {
    const num = Number(trimmed);

    // Determine if it should be float or integer
    if (trimmed.includes('.')) {
      return num; // Float/decimal
    } else {
      return num; // Integer
    }
  }

  return null; // Not a number
}

/**
 * Simple function to convert specifications in form data
 */
export function convertFormSpecifications(
  formData: Record<string, unknown>,
  certificateTypes: CertificateType[],
  gaugeMasterList: Array<{ id: string; certificate_type_id: string }>
): Record<string, unknown> {
  const result = { ...formData };

  // Find the gauge master to get certificate type
  const gaugeMaster = gaugeMasterList.find(g => g.id === formData.master_gauge_id);
  if (!gaugeMaster?.certificate_type_id) {
    return result;
  }

  const certificateType = certificateTypes.find(ct => ct.id === gaugeMaster.certificate_type_id);
  if (!certificateType) {
    return result;
  }

  // Convert specifications
  if (result.specifications && typeof result.specifications === 'object') {
    result.specifications = convertSpecificationValues(
      result.specifications as Record<string, unknown>,
      certificateType
    );
  }

  // Convert subtypes if present
  if (result.subtype && Array.isArray(result.subtype)) {
    result.subtype = result.subtype.map((subtype: Record<string, unknown>) => {
      const subtypeResult = { ...subtype };

      // Find subtype gauge master
      const subtypeGaugeMaster = gaugeMasterList.find(g => g.id === subtype.master_gauge_id);
      if (subtypeGaugeMaster?.certificate_type_id) {
        const subtypeCertificateType = certificateTypes.find(ct => ct.id === subtypeGaugeMaster.certificate_type_id);
        if (subtypeCertificateType && subtypeResult.specifications && typeof subtypeResult.specifications === 'object') {
          subtypeResult.specifications = convertSpecificationValues(
            subtypeResult.specifications as Record<string, unknown>,
            subtypeCertificateType
          );
        }
      }

      return subtypeResult;
    });
  }

  return result;
}
