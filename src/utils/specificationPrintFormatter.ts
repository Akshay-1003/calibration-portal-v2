/**
 * Specification formatter for print/PDF
 * Extracts concise, readable specification values for print documents
 */

/**
 * Format a number value for display.
 */
function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(2) : value.toFixed(4);
  }
  if (typeof value === 'string') return value;
  return String(value);
}

function normalizeUnit(unit: string): string {
  return unit.trim() || 'mm';
}

function hasPrintableUnit(value: string): boolean {
  return /(mm|cm|inch|in|um|μm)\b|°/i.test(value);
}

function appendUnitIfMeasurement(value: string, unit: string): string {
  const text = value.trim();
  if (!text || text === '-' || hasPrintableUnit(text)) return text;

  const resolvedUnit = normalizeUnit(unit);
  const numericPattern = /^[+-]?\d+(?:\.\d+)?$/;
  const rangePattern = /^\(?\s*[+-]?\d+(?:\.\d+)?\s*(?:-|–|to)\s*[+-]?\d+(?:\.\d+)?\s*\)?$/i;
  const labelledNumericPattern = /^(Spec(?:ification)?|Basic Size|Size):\s*([+-]?\d+(?:\.\d+)?)$/i;
  const labelledMatch = text.match(labelledNumericPattern);

  if (labelledMatch) {
    return `${labelledMatch[1]}: ${labelledMatch[2]} ${resolvedUnit}`;
  }

  if (numericPattern.test(text) || rangePattern.test(text)) {
    return `${text} ${resolvedUnit}`;
  }

  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractStandardSpecificationValue(value: unknown): string | null {
  if (!hasValue(value)) return null;

  if (isRecord(value)) {
    const nestedValue = value.standard_specification ?? value.name ?? value.label ?? value.value;
    return hasValue(nestedValue) ? extractStandardSpecificationValue(nestedValue) : null;
  }

  return formatNumber(value);
}

/**
 * Check if a value has meaningful data
 */
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

/**
 * Extract Go value from specification
 */
function extractGoValue(go: unknown): string | null {
  if (!go || typeof go !== 'object') return null;
  const goObj = go as Record<string, unknown>;
  
  if (goObj.basic_size !== undefined) return formatNumber(goObj.basic_size);
  if (goObj.specification_limit_max !== undefined) return formatNumber(goObj.specification_limit_max);
  if (goObj.specification_limit_min !== undefined) return formatNumber(goObj.specification_limit_min);
  
  return null;
}

/**
 * Extract No-Go value from specification
 */
function extractNoGoValue(noGo: unknown): string | null {
  if (!noGo || typeof noGo !== 'object') return null;
  const noGoObj = noGo as Record<string, unknown>;
  
  if (noGoObj.basic_size !== undefined) return formatNumber(noGoObj.basic_size);
  if (noGoObj.specification_limit_max !== undefined) return formatNumber(noGoObj.specification_limit_max);
  if (noGoObj.specification_limit_min !== undefined) return formatNumber(noGoObj.specification_limit_min);
  
  return null;
}

/**
 * Format specifications for print display
 * Returns a concise, readable string suitable for PDF/print
 * 
 * @param specifications - The specification object (can be any format)
 * @param unit - Unit for measurements (mm, inch, cm, m) - defaults to 'mm'
 * @returns Formatted string with key specification values
 */
export function formatSpecificationForPrint(specifications: unknown, unit: string = 'mm'): string {
  if (!specifications) return '-';
  
  // Handle null or undefined
  if (specifications === null || specifications === undefined) {
    return '-';
  }
  
  // Handle string specifications
  if (typeof specifications === 'string') {
    return appendUnitIfMeasurement(specifications, unit) || '-';
  }
  
  // Handle array specifications (e.g., Master Piece)
  // Format: 100.00 mm, 200.00 mm (readable measurements)
  if (Array.isArray(specifications)) {
    if (specifications.length === 0) return '-';
    
    const values = specifications
      .map(v => formatNumber(v))
      .filter(Boolean);
    
    if (values.length === 0) return '-';
    
    // Format as readable measurements: 100.00 mm, 200.00 mm
    const formattedValues = values.map(v => appendUnitIfMeasurement(v, unit));
    if (formattedValues.length <= 4) {
      return formattedValues.join(', ');
    }
    return `${formattedValues.slice(0, 4).join(', ')} (+${formattedValues.length - 4} more)`;
  }
  
  // Handle object specifications
  if (typeof specifications === 'object') {
    const specs = specifications as Record<string, unknown>;
    const parts: string[] = [];
    
    // Check for tolerance method (ID/OD limit gauges)
    // Format: basic_size (upper_tolerance/lower_tolerance) mm
    if (specs.inputs && typeof specs.inputs === 'object') {
      const inputs = specs.inputs as Record<string, unknown>;
      if (inputs.method === 'tolerance' && inputs.inputs && typeof inputs.inputs === 'object') {
        const toleranceInputs = inputs.inputs as Record<string, unknown>;
        const basic_size = toleranceInputs.basic_size;
        const upperTolerance = toleranceInputs.upper_tolerance;
        const lowerTolerance = toleranceInputs.lower_tolerance;
        
        if (hasValue(basic_size) && hasValue(upperTolerance) && hasValue(lowerTolerance)) {
          const basic_sizeStr = formatNumber(basic_size);
          const upperTolStr = formatNumber(upperTolerance);
          const lowerTolStr = formatNumber(lowerTolerance);
          // Format: 10.00 (0.200/0.100) mm - readable measurement format
          parts.push(`${basic_sizeStr} (${upperTolStr}/${lowerTolStr}) ${unit}`);
          // Don't show go/no_go for tolerance method
          return parts.join('; ');
        }
      }
    }
    
    // Extract direct Go/No-Go values (Limit Gauges)
    // Format: (10.200 / 10.300) mm (no labels)
    const goValue = extractGoValue(specs.go);
    const noGoValue = extractNoGoValue(specs.no_go);
    
    if (goValue && noGoValue) {
      parts.push(`(${goValue} / ${noGoValue}) ${unit}`);
    } else if (goValue) {
      parts.push(`${goValue} ${unit}`);
    } else if (noGoValue) {
      parts.push(`${noGoValue} ${unit}`);
    }
    
    // Extract Range (Fixed Range Gauges)
    // Format: (1.00 - 100.00) mm
    if (specs.range && typeof specs.range === 'object') {
      const range = specs.range as Record<string, unknown>;
      const min = formatNumber(range.min);
      const max = formatNumber(range.max);
      if (min && max) {
        parts.push(`(${min} - ${max}) ${unit}`);
      } else if (min || max) {
        parts.push(`${min || max} ${unit}`);
      }
    }
    
    // Extract from/to (Alternative range format)
    // Format: (1.00 - 100.00) mm
    if (hasValue(specs.from) || hasValue(specs.to)) {
      const from = formatNumber(specs.from);
      const to = formatNumber(specs.to);
      if (from && to) {
        parts.push(`(${from} - ${to}) ${unit}`);
      } else if (from || to) {
        parts.push(`${from || to} ${unit}`);
      }
    }
    
    // Extract Least Count - Format: LC: 0.01 mm (readable measurement)
    const lc = specs.least_count || specs.leastCount;
    if (hasValue(lc)) {
      parts.push(`LC: ${formatNumber(lc)} ${unit}`);
    }
    
    // Extract Basic Size
    // Format: 100.00 mm, 200.00 mm (if multiple) - readable measurements
    if (specs.basic_size) {
      if (Array.isArray(specs.basic_size)) {
        const values = specs.basic_size
          .map(v => formatNumber(v))
          .filter(Boolean);
        if (values.length > 0) {
          parts.push(values.map(v => `${v} ${unit}`).join(', '));
        }
      } else if (hasValue(specs.basic_size)) {
        parts.push(`${formatNumber(specs.basic_size)} ${unit}`);
      }
    }
    
    // Thread gauges store both an internal standard_specification_id and the
    // printable standard_specification. Never show the internal ID when the
    // readable value is available.
    const standardSpecification = extractStandardSpecificationValue(specs.standard_specification);
    if (standardSpecification) {
      parts.push(standardSpecification);
    }
    
    // Extract Taper Angle - Format: 5.00° (with degree symbol)
    if (hasValue(specs.taper_angle)) {
      parts.push(`Taper: ${formatNumber(specs.taper_angle)}°`);
    }
    
    // Extract Thread Gauge specifics - Format: PD: 10.00 mm
    if (specs.pitch_dial && typeof specs.pitch_dial === 'object') {
      const pd = specs.pitch_dial as Record<string, unknown>;
      if (hasValue(pd.specified_limit_max)) {
        parts.push(`PD: ${formatNumber(pd.specified_limit_max)} ${unit}`);
      }
    }
    
    // Extract Surface Plate dimensions - Format: L:100.00 mm × W:50.00 mm
    if (hasValue(specs.length) || hasValue(specs.width)) {
      const dims: string[] = [];
      if (hasValue(specs.length)) dims.push(`L:${formatNumber(specs.length)} ${unit}`);
      if (hasValue(specs.width)) dims.push(`W:${formatNumber(specs.width)} ${unit}`);
      if (dims.length > 0) parts.push(dims.join(' × '));
    }
    
    // Extract Spline Gauge specifics
    if (hasValue(specs.specification)) {
      parts.push(appendUnitIfMeasurement(formatNumber(specs.specification), unit));
    }
    
    if (hasValue(specs.numberOfSplines)) {
      parts.push(`${formatNumber(specs.numberOfSplines)} Splines`);
    }
    
    if (hasValue(specs.majorDiameterMin) || hasValue(specs.majorDiameterMax)) {
      const min = formatNumber(specs.majorDiameterMin);
      const max = formatNumber(specs.majorDiameterMax);
      if (min || max) {
        parts.push(`MD: ${min && max ? `${min}-${max} ${unit}` : `${min || max} ${unit}`}`);
      }
    }
    
    // Return formatted parts
    if (parts.length === 0) {
      // Last resort: try to find any meaningful value
      const keys = Object.keys(specs).filter((key) => key !== 'standard_specification_id');
      for (const key of keys) {
        const value = specs[key];
        if (hasValue(value) && typeof value !== 'object') {
          return appendUnitIfMeasurement(formatNumber(value), unit);
        }
      }
      return '-';
    }
    
    // Join parts with semicolon for better readability in print
    return parts.join('; ');
  }
  
  // Fallback for any other type
  return appendUnitIfMeasurement(String(specifications), unit) || '-';
}

/**
 * Format Lab ID for display - ensures full visibility
 * Returns the full Lab ID as-is for display
 */
export function formatLabIdForPrint(labId: string | number | null | undefined): string {
  if (!labId) return '-';
  
  const labIdStr = String(labId).trim();
  if (!labIdStr) return '-';
  
  // Return the full Lab ID without truncation
  return labIdStr;
}
