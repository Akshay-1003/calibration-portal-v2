
export interface SpecificationType {
  type: string;
  label: string;
  value: string; // Formatted value to display
  hasValue: boolean;
  fullValue?: string; // Full value for tooltip/display fallback
}

/**
 * Format number with precision up to 4 decimal places, preserving original precision
 * If value has 1, 2, 3, or 4 decimal places, show that many
 * If value has more than 4 decimal places, round to 4
 * If value is integer, show as integer
 */
function formatNumberWithPrecision(value: number): string {
  // Convert to string to analyze decimal places
  const valueStr = value.toString();
  
  // Check if it's an integer
  if (Number.isInteger(value)) {
    return value.toFixed(2);
  }
  
  // Count decimal places
  const decimalIndex = valueStr.indexOf('.');
  const decimalPlaces = decimalIndex !== -1 ? valueStr.length - decimalIndex - 1 : 0;
  
  // Show original precision up to 4 decimal places
  if (decimalPlaces <= 4) {
    return value.toFixed(4);
  } else {
    // Round to 4 decimal places if more than 4
    return value.toFixed(4);
  }
}

/**
 * Summarize long measurement arrays for chip display.
 * Example: "1.0000 mm, 2.0000 mm, 3.0000 mm +2 more"
 */
function formatMeasurementList(values: string[], unit: string, maxItems: number = 3): { displayValue: string; fullValue: string } {
  const normalizedValues = values.filter(Boolean);
  if (normalizedValues.length === 0) {
    return { displayValue: "", fullValue: "" };
  }

  const measurements = normalizedValues.map((value) => `${value} ${unit}`);
  const fullValue = measurements.join(", ");

  if (measurements.length <= maxItems) {
    return { displayValue: fullValue, fullValue };
  }

  const preview = measurements.slice(0, maxItems).join(", ");
  const remaining = measurements.length - maxItems;
  return {
    displayValue: `${preview} +${remaining} more`,
    fullValue,
  };
}

function normalizeSpecificationUnit(unit: string): string {
  const normalized = unit.trim();
  return /^(mm|cm|m|inch|in|um|μm|µm)$/i.test(normalized) ? normalized : 'mm';
}

function isConcentricGauge(gaugeType?: string | null): boolean {
  return /concentric/i.test(gaugeType || '');
}

function getConcentricSizeTypes(values: unknown[], unit: string): SpecificationType[] {
  return values.flatMap((value, index) => {
    if (!hasValue(value)) return [];
    return [{
      type: 'concentric_size',
      label: `Size ${index < 26 ? String.fromCharCode(65 + index) : index + 1}`,
      value: `${formatValueNoUnit(value)} ${unit}`,
      hasValue: true,
    }];
  });
}

/**
 * Map of specification keys to display labels
 */
const SPEC_LABEL_MAP: Record<string, string> = {
  // Limit Gauges
  go: 'Go',
  no_go: 'No-Go',
  inputs: 'Inputs',
  
  // Common fields
  basic_size: 'Basic Size',
  standard_specification: 'Standard Spec',
  
  // Fixed Range
  range: 'Range',
  from: 'From',
  to: 'To',
  least_count: 'Least Count',
  leastCount: 'Least Count',
  
  // Thread Gauges
  pitch_dial: 'Pitch Dial',
  max_step: 'Max Step',
  basic_step: 'Basic Step',
  min_step: 'Min Step',
  total_length: 'Total Length',
  
  // Taper Gauges
  taper_angle: 'Taper Angle',
  
  // Surface Plate
  surface_material: 'Surface Material',
  length: 'Length',
  width: 'Width',
  block_size: 'Block Size',
  method: 'Method',
  lc: 'LC',
  
  // Spline Gauges
  specification: 'Specification',
  numberOfSplines: 'Splines',
  majorDiameterMin: 'Major Dia Min',
  majorDiameterMax: 'Major Dia Max',
  dimensionOverPinMin: 'DOP Min',
  dimensionOverPinMax: 'DOP Max',
  pinDiameter: 'Pin Dia',
  diameterBetweenPin: 'Dia Between Pin',
};

/**
 * Format a number value for display with unit
 * Shows full precision up to 4 decimal places, preserving original precision
 */
function formatValue(value: unknown, _unit: string = 'mm'): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Show full precision up to 4 decimal places, preserving original precision
    const formatted = formatNumberWithPrecision(value);
    return formatted;
  }
  if (typeof value === 'string') return value;
  return String(value);
}

/**
 * Format a number value for display without unit (for internal calculations)
 * Shows full precision up to 4 decimal places, preserving original precision
 */
function formatValueNoUnit(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    // Show full precision up to 4 decimal places, preserving original precision
    const formatted = formatNumberWithPrecision(value);
    return formatted;
  }
  if (typeof value === 'string') return value;
  return String(value);
}

/**
 * Get primary value from Go specification (returns value without unit)
 */
function getGoValue(go: unknown, _unit: string = 'mm'): string {
  if (!go || typeof go !== 'object') return '';
  const goObj = go as Record<string, unknown>;
  // Priority: basic_size > specification_limit_max > specification_limit_min
  if (goObj.basic_size !== undefined) return formatValueNoUnit(goObj.basic_size);
  if (goObj.specification_limit_max !== undefined) return formatValueNoUnit(goObj.specification_limit_max);
  if (goObj.specification_limit_min !== undefined) return formatValueNoUnit(goObj.specification_limit_min);
  return '';
}

/**
 * Get primary value from No-Go specification (returns value without unit)
 */
function getNoGoValue(noGo: unknown, _unit: string = 'mm'): string {
  if (!noGo || typeof noGo !== 'object') return '';
  const noGoObj = noGo as Record<string, unknown>;
  // Priority: basic_size > specification_limit_max > specification_limit_min
  if (noGoObj.basic_size !== undefined) return formatValueNoUnit(noGoObj.basic_size);
  if (noGoObj.specification_limit_max !== undefined) return formatValueNoUnit(noGoObj.specification_limit_max);
  if (noGoObj.specification_limit_min !== undefined) return formatValueNoUnit(noGoObj.specification_limit_min);
  return '';
}

/**
 * Check if a value has meaningful data (not null, undefined, or empty)
 */
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * Recursively check if a nested object has any values
 */
function hasNestedValue(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return hasValue(obj);
  if (Array.isArray(obj)) return obj.length > 0;
  
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  
  // Check if any key has a value
  return keys.some(key => {
    const val = (obj as Record<string, unknown>)[key];
    if (val === null || val === undefined) return false;
    if (typeof val === 'object' && !Array.isArray(val)) {
      return hasNestedValue(val);
    }
    return hasValue(val);
  });
}

/**
 * Extract specification types from a specification object
 * Dynamically analyzes the structure and returns detected types
 */
export function extractSpecificationTypes(
  specifications: unknown,
  gaugeType?: string | null,
  unit: string = 'mm'
): SpecificationType[] {
  const types: SpecificationType[] = [];
  unit = normalizeSpecificationUnit(unit);
  
  if (!specifications || typeof specifications !== 'object') {
    return types;
  }
  
  const specs = specifications as Record<string, unknown>;
  // Handle array specifications (Master Piece, etc.)
  // Format: 100.00 mm, 200.00 mm (readable measurements)
  if (Array.isArray(specifications)) {
    if (specifications.length > 0) {
      if (isConcentricGauge(gaugeType)) {
        return getConcentricSizeTypes(specifications, unit);
      }
      const values = specifications.map(v => formatValueNoUnit(v)).filter(Boolean);
      const { displayValue, fullValue } = formatMeasurementList(values, unit);
      types.push({
        type: 'basic_size',
        label: '',
        value: displayValue || `${specifications.length} items`,
        hasValue: true,
        fullValue,
      });
    }
    return types;
  }
  
  // Handle string specifications
  if (typeof specifications === 'string') {
    const specString = specifications as string;
    const trimmed = specString.trim();
    if (trimmed !== '') {
      types.push({
        type: 'specification',
        label: 'Specification',
        value: trimmed,
        hasValue: true,
      });
    }
    return types;
  }
  
  // Check for tolerance method (ID/OD limit gauges)
  // Tolerance method has: inputs.method === "tolerance" with basic_size, upper_tolerance, lower_tolerance
  if (specs.inputs && typeof specs.inputs === 'object' && !specs.standard_specification) {
    const inputs = specs.inputs as Record<string, unknown>;
    if (inputs.method === 'tolerance' && inputs.inputs && typeof inputs.inputs === 'object') {
      const toleranceInputs = inputs.inputs as Record<string, unknown>;
      const basic_size = toleranceInputs.basic_size;
      const upperTolerance = toleranceInputs.upper_tolerance;
      const lowerTolerance = toleranceInputs.lower_tolerance;
      
      if (hasValue(basic_size) && hasValue(upperTolerance) && hasValue(lowerTolerance)) {
        const basic_sizeStr = formatValueNoUnit(basic_size);
        const upperTolStr = formatValueNoUnit(upperTolerance);
        const lowerTolStr = formatValueNoUnit(lowerTolerance);
        // Format: 10.00 (0.200/0.100) mm - readable measurement format
        types.push({
          type: 'tolerance_method',
          label: '',
          value: `${basic_sizeStr} (${upperTolStr}/${lowerTolStr}) ${unit}`,
          hasValue: true,
        });
        // Don't show go/no_go for tolerance method
        return types;
      }
    }
  }
  
  // Check for direct go/no_go method (Limit Gauges)
  // Direct method has: method === "direct_go_no_go" or just go/no_go directly
  if ((specs.go || specs.no_go) && !specs.standard_specification) {
    const goValue = getGoValue(specs.go, unit);
    const noGoValue = getNoGoValue(specs.no_go, unit);
    
    // For direct go/no_go, show values without labels: (10.20 / 10.30) mm
    if (goValue && noGoValue) {
      types.push({
        type: 'go_no_go_direct',
        label: '',
        value: `(${goValue} / ${noGoValue}) ${unit}`,
        hasValue: true,
      });
    } else if (goValue) {
      types.push({
        type: 'go',
        label: '',
        value: `${goValue} ${unit}`,
        hasValue: true,
      });
    } else if (noGoValue) {
      types.push({
        type: 'no_go',
        label: '',
        value: `${noGoValue} ${unit}`,
        hasValue: true,
      });
    }
  }
  
  // Check for standard_specification (Thread Gauges)
  if (specs.standard_specification && hasValue(specs.standard_specification)) {
    types.push({
      type: 'standard_specification',
      label: '',
      value: formatValue(specs.standard_specification, unit),
      hasValue: true,
    });
  }
  
  // Check for range (Fixed Range Gauges) - Format: (1.00 - 100.00) mm
  if (specs.range && hasNestedValue(specs.range)) {
    const range = specs.range as Record<string, unknown>;
    const min = formatValueNoUnit(range.min);
    const max = formatValueNoUnit(range.max);
    const rangeValue = min && max ? `(${min} - ${max}) ${unit}` : min || max || '';
    types.push({
      type: 'range',
      label: '',
      value: rangeValue || 'Range',
      hasValue: true,
    });
  }
  
  // Check for from/to (Alternative Fixed Range structure) - Format: (1.00 - 100.00) mm
  if (specs.from !== undefined || specs.to !== undefined) {
    if (hasValue(specs.from) || hasValue(specs.to)) {
      const from = formatValueNoUnit(specs.from);
      const to = formatValueNoUnit(specs.to);
      const rangeValue = from && to ? `(${from} - ${to}) ${unit}` : from || to || '';
      types.push({
        type: 'range',
        label: '',
        value: rangeValue || 'Range',
        hasValue: true,
      });
    }
  }
  
  // Check for least_count - Format: LC: 0.01 mm (readable measurement)
  if ((specs.least_count !== undefined || specs.leastCount !== undefined) &&
      (hasValue(specs.least_count) || hasValue(specs.leastCount))) {
    const lc = formatValueNoUnit(specs.least_count || specs.leastCount);
    types.push({
      type: 'least_count',
      label: 'LC',
      value: `${lc} ${unit}`,
      hasValue: true,
    });
  }
  
  // Check for basic_size (Master Piece, etc.) - Format: 100.00 mm, 200.00 mm (if multiple)
  if (specs.basic_size) {
    if (Array.isArray(specs.basic_size) && specs.basic_size.length > 0) {
      if (isConcentricGauge(gaugeType)) {
        types.push(...getConcentricSizeTypes(specs.basic_size, unit));
        return types;
      }
      const values = specs.basic_size.map(v => formatValueNoUnit(v)).filter(Boolean);
      const { displayValue, fullValue } = formatMeasurementList(values, unit);
      types.push({
        type: 'basic_size',
        label: '',
        value: displayValue || `${specs.basic_size.length} items`,
        hasValue: true,
        fullValue,
      });
    } else if (hasValue(specs.basic_size)) {
      types.push({
        type: 'basic_size',
        label: '',
        value: `${formatValueNoUnit(specs.basic_size)} ${unit}`,
        hasValue: true,
      });
    }
  }
  
  // Check for taper_angle - Format: 5.00° (with degree symbol if applicable)
  if (specs.taper_angle !== undefined && hasValue(specs.taper_angle)) {
    types.push({
      type: 'taper_angle',
      label: 'Taper',
      value: `${formatValueNoUnit(specs.taper_angle)}°`,
      hasValue: true,
    });
  }

  
  // Check for surface plate fields - show main dimensions
//   if (specs.surface_material || (specs.length && specs.width) || specs.block_size || specs.method || specs.lc) {
//     if (hasValue(specs.surface_material) || hasValue(specs.length) || hasValue(specs.width) ||
//         hasValue(specs.block_size) || hasValue(specs.method) || hasValue(specs.lc)) {
//       const values: string[] = [];
//       if (hasValue(specs.length)) values.push(`L: ${formatValueNoUnit(specs.length)} ${unit}`);
//       if (hasValue(specs.width)) values.push(`W: ${formatValueNoUnit(specs.width)} ${unit}`);
// // if (hasValue(specs.block_size)) values.push(`BS: ${formatValueNoUnit(specs.block_size)} ${unit}`);
//       if (values.length > 0) {
//         types.push({
//           type: 'surface_plate',
//           label: 'Surface',
//           value: values.slice(0, 2).join(', '),
//           hasValue: true,
//         });
//       } 
//     }
//   }
  if ((specs.length && specs.width) || specs.height) {
    if (hasValue(specs.length) || hasValue(specs.width) || hasValue(specs.height)) {
      const values: string[] = [];
      if (hasValue(specs.length)) values.push(`${formatValueNoUnit(specs.length)} ${unit}`);
      if (hasValue(specs.width)) values.push(`${formatValueNoUnit(specs.width)} ${unit}`);
      if (hasValue(specs.height)) values.push(`${formatValueNoUnit(specs.height)} ${unit}`);

// if (hasValue(specs.block_size)) values.push(`BS: ${formatValueNoUnit(specs.block_size)} ${unit}`);
      if (values.length > 0) {
        types.push({
          type: 'v_block',
          label: '',
          value: values.slice(0, 3).join(' X '),
          hasValue: true,
        });
      } 
    }
  }
  
  // Check for spline gauge fields - show main values
  if (specs.specification || specs.numberOfSplines || specs.majorDiameterMin || 
      specs.majorDiameterMax || specs.dimensionOverPinMin || specs.dimensionOverPinMax ||
      specs.pinDiameter || specs.diameterBetweenPin) {
    if (hasValue(specs.specification) || hasValue(specs.numberOfSplines) ||
        hasValue(specs.majorDiameterMin) || hasValue(specs.majorDiameterMax) ||
        hasValue(specs.dimensionOverPinMin) || hasValue(specs.dimensionOverPinMax) ||
        hasValue(specs.pinDiameter) || hasValue(specs.diameterBetweenPin)) {
      const values: string[] = [];
      if (hasValue(specs.specification)) values.push(formatValue(specs.specification, unit));
      if (hasValue(specs.numberOfSplines)) values.push(`${formatValueNoUnit(specs.numberOfSplines)} splines`);
      if (hasValue(specs.majorDiameterMin) || hasValue(specs.majorDiameterMax)) {
        const min = formatValueNoUnit(specs.majorDiameterMin);
        const max = formatValueNoUnit(specs.majorDiameterMax);
        values.push(min && max ? `MD: ${min}-${max} ${unit}` : `MD: ${min || max} ${unit}`);
      }
      if (values.length > 0) {
        types.push({
          type: 'spline',
          label: 'Spline',
          value: values.slice(0, 2).join(', '),
          hasValue: true,
        });
      } else {
        types.push({
          type: 'spline',
          label: 'Spline',
          value: 'Spline',
          hasValue: true,
        });
      }
    }
  }
  
  // If no types found but object has keys, show generic specification
  if (types.length === 0 && Object.keys(specs).length > 0) {
    // Check if it's not just empty nested objects
    if (hasNestedValue(specs)) {
      // Try to extract first meaningful value
      const firstKey = Object.keys(specs).find(key => hasValue(specs[key]));
      const firstValue = firstKey ? formatValue(specs[firstKey], unit) : '';
      types.push({
        type: 'specification',
        label: 'Spec',
        value: firstValue || 'Specification',
        hasValue: true,
      });
    }
  }
  
  return types;
}

/**
 * Get a display name for a specification type
 */
export function getSpecTypeLabel(type: string): string {
  return SPEC_LABEL_MAP[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Export the label map for reference
 */
export { SPEC_LABEL_MAP };
