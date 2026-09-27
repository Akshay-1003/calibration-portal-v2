/**
 * Calibration Remark Validator for Thread Plug Gauges
 * 
 * Implements ISO 14253-1 decision rule with measurement uncertainty
 * for GO and NO-GO thread plug gauge calibration decisions.
 */

export interface CalibrationSpecLimits {
  max_limit?: number;    // Upper acceptance limit
  min_limit?: number;    // Lower acceptance limit (NO-GO only)
  wear_limit?: number;   // Wear limit / allowed wear threshold
}

export interface CalibrationRemarkResult {
  remark: 'Within Wear Limit' | 'Within Specification Limit' | 'Out of Specification Limit';
  isWithinSpec: boolean;
  uncertaintyBand: {
    lower_bound: number;
    upper_bound: number;
    observed: number;
  };
}

export type GaugeType = 'GO' | 'NO_GO';

/**
 * Parses uncertainty value from string format (e.g., "± 2.2 µm") to mm
 * @param uncertaintyValue - Uncertainty value as string or number
 * @returns Uncertainty value in mm
 */
function parseUncertainty(uncertaintyValue: string | number | undefined): number {
  if (uncertaintyValue === undefined || uncertaintyValue === null || uncertaintyValue === '') {
    return 0.0022; // Default fallback: ± 2.2 µm = ± 0.0022 mm
  }

  if (typeof uncertaintyValue === 'number') {
    return uncertaintyValue;
  }

  // Parse string format like "± 2.2 µm" or "2.2 µm" or "0.0022 mm"
  const uncertaintyStr = uncertaintyValue.toString().trim();

  // Extract numeric value
  const numericMatch = uncertaintyStr.match(/([+-]?\s*[\d.]+)/);
  if (!numericMatch) {
    return 0.0022; // Default fallback
  }

  let numericValue = parseFloat(numericMatch[1].replace(/[+\s]/g, ''));

  // Convert based on unit
  if (uncertaintyStr.includes('µm') || uncertaintyStr.includes('um')) {
    // Convert micrometers to millimeters
    numericValue = numericValue / 1000;
  } else if (uncertaintyStr.includes('mm')) {
    // Already in millimeters
    numericValue = numericValue;
  } else {
    // Assume mm if no unit specified
    numericValue = numericValue;
  }

  return numericValue;
}

/**
 * Decides calibration remark for GO and NO-GO thread plug gauges
 * using specification limits and measurement uncertainty.
 * 
 * Implements ISO 14253-1 decision rule with uncertainty band.
 * 
 * @param observedSize - Observed measurement value (mm)
 * @param specLimits - Specification limits for the gauge
 * @param gaugeType - Type of gauge: 'GO' or 'NO_GO'
 * @param uncertainty - Measurement uncertainty (string like "± 2.2 µm" or number in mm)
 * @returns Calibration remark result with uncertainty band
 */
export function decideCalibrationRemark(
  observedSize: number,
  specLimits: CalibrationSpecLimits,
  gaugeType: GaugeType,
  uncertainty: string | number | undefined
): CalibrationRemarkResult {
  // Parse uncertainty value to mm
  const uncertaintyInMm = parseUncertainty(uncertainty);

  // Calculate uncertainty band (ISO 14253-1 decision rule)
  const lower_bound = observedSize - uncertaintyInMm;
  const upper_bound = observedSize + uncertaintyInMm;

  // Decision logic based on gauge type
  if (gaugeType === 'GO') {
    // GO gauge is controlled by Wear Limit (lower safety boundary)
    const wear_limit = specLimits.wear_limit;
    const max_limit = specLimits.max_limit;

    if (max_limit !== undefined && upper_bound > max_limit) {
      return {
        remark: 'Out of Specification Limit',
        isWithinSpec: false,
        uncertaintyBand: {
          lower_bound,
          upper_bound,
          observed: observedSize
        }
      };
    }

    if (wear_limit === undefined) {
      return {
        remark: 'Out of Specification Limit',
        isWithinSpec: false,
        uncertaintyBand: {
          lower_bound,
          upper_bound,
          observed: observedSize
        }
      };
    }

    // IF Lower_Bound < Wear_Limit → Out of Specification Limit
    if (lower_bound < wear_limit) {
      return {
        remark: 'Out of Specification Limit',
        isWithinSpec: false,
        uncertaintyBand: {
          lower_bound,
          upper_bound,
          observed: observedSize
        }
      };
    }

    // ELSE → Within Wear Limit
    return {
      remark: 'Within Wear Limit',
      isWithinSpec: true,
      uncertaintyBand: {
        lower_bound,
        upper_bound,
        observed: observedSize
      }
    };

  } else if (gaugeType === 'NO_GO') {
    const wear_limit = specLimits.wear_limit;
    const min_limit = specLimits.min_limit;
    const max_limit = specLimits.max_limit;

    // Prefer explicit wear-limit rule when available.
    if (wear_limit !== undefined && wear_limit > 0) {
      if (upper_bound > wear_limit) {
        return {
          remark: 'Out of Specification Limit',
          isWithinSpec: false,
          uncertaintyBand: {
            lower_bound,
            upper_bound,
            observed: observedSize
          }
        };
      }
      return {
        remark: 'Within Wear Limit',
        isWithinSpec: true,
        uncertaintyBand: {
          lower_bound,
          upper_bound,
          observed: observedSize
        }
      };
    }

    // Fall back to specification limits when available.
    if (
      (min_limit !== undefined && lower_bound < min_limit) ||
      (max_limit !== undefined && upper_bound > max_limit)
  ) {
      return {
        remark: 'Out of Specification Limit',
        isWithinSpec: false,
        uncertaintyBand: {
          lower_bound,
          upper_bound,
          observed: observedSize
        }
      };
    }

 
    return {
      remark: 'Within Specification Limit',
      isWithinSpec: true,
      uncertaintyBand: {
        lower_bound,
        upper_bound,
        observed: observedSize
      }
    };
  }

  // Fallback for invalid gauge type
  return {
    remark: 'Out of Specification Limit',
    isWithinSpec: false,
    uncertaintyBand: {
      lower_bound,
      upper_bound,
      observed: observedSize
    }
  };
}

/**
 * Validates calibration remark for all gauge readings (GO A, GO B, NO_GO A, NO_GO B)
 * 
 * @param observedValues - Object containing all observed values
 * @param goSpec - GO specification limits
 * @param noGoSpec - NO_GO specification limits
 * @param uncertainty - Measurement uncertainty (string like "± 2.2 µm" or number in mm)
 * @returns Object with calibration remark results for each reading
 */
export function validateAllCalibrationRemarks(
  observedValues: {
    goA?: number | null;
    goB?: number | null;
    noGoA?: number | null;
    noGoB?: number | null;
  },
  goSpec: CalibrationSpecLimits,
  noGoSpec: CalibrationSpecLimits,
  uncertainty: string | number | undefined,
): {
  goA: CalibrationRemarkResult | null;
  goB: CalibrationRemarkResult | null;
  noGoA: CalibrationRemarkResult | null;
  noGoB: CalibrationRemarkResult | null;
  overall: {
    remark: string;
    isWithinSpec: boolean;
  };
} {
  // Validate each reading
  const goAResult = observedValues.goA !== null && observedValues.goA !== undefined
    ? decideCalibrationRemark(observedValues.goA, goSpec, 'GO', uncertainty)
    : null;

  const goBResult = observedValues.goB !== null && observedValues.goB !== undefined
    ? decideCalibrationRemark(observedValues.goB, goSpec, 'GO', uncertainty)
    : null;

  const noGoAResult = observedValues.noGoA !== null && observedValues.noGoA !== undefined
    ? decideCalibrationRemark(observedValues.noGoA, noGoSpec, 'NO_GO', uncertainty)
    : null;

  const noGoBResult = observedValues.noGoB !== null && observedValues.noGoB !== undefined
    ? decideCalibrationRemark(observedValues.noGoB, noGoSpec, 'NO_GO', uncertainty)
    : null;

  // Determine overall status
  const allResults = [goAResult, goBResult, noGoAResult, noGoBResult].filter(r => r !== null) as CalibrationRemarkResult[];
  const allWithinSpec = allResults.every(r => r.isWithinSpec);
  const anyOutSpec = allResults.some(r => !r.isWithinSpec);

  let overallRemark: string;
  let overallIsWithinSpec: boolean;

  if (anyOutSpec) {
    overallRemark = 'Out of Specification Limit';
    overallIsWithinSpec = false;
  } else if (allWithinSpec) {
    // Check if all are "Within Wear Limit" (GO only) or "Within Specification Limit"
    const allWearLimit = allResults.every(r => r.remark === 'Within Wear Limit');
    overallRemark = allWearLimit ? 'Within Wear Limit' : 'Within Specification Limit';
    overallIsWithinSpec = true;
  } else {
    overallRemark = 'Specification Missing';
    overallIsWithinSpec = false;
  }

  return {
    goA: goAResult,
    goB: goBResult,
    noGoA: noGoAResult,
    noGoB: noGoBResult,
    overall: {
      remark: overallRemark,
      isWithinSpec: overallIsWithinSpec
    }
  };
}

/**
 * Gets CSS class names for styling based on calibration remark
 * 
 * @param result - Calibration remark result
 * @returns Object with CSS class names for different styling purposes
 */
export function getCalibrationRemarkStyles(result: CalibrationRemarkResult | null): {
  textColor: string;
  backgroundColor: string;
  borderColor: string;
} {
  if (!result) {
    return {
      textColor: 'text-gray-600',
      backgroundColor: 'bg-white',
      borderColor: 'border-gray-300'
    };
  }

  switch (result.remark) {
    case 'Within Wear Limit':
      return {
        textColor: 'text-green-600 font-semibold',
        backgroundColor: 'bg-green-50',
        borderColor: 'border-green-300'
      };
    case 'Within Specification Limit':
      return {
        textColor: 'text-blue-600 font-semibold',
        backgroundColor: 'bg-blue-50',
        borderColor: 'border-blue-300'
      };
    case 'Out of Specification Limit':
      return {
        textColor: 'text-red-600 font-semibold',
        backgroundColor: 'bg-red-50',
        borderColor: 'border-red-300'
      };
    default:
      return {
        textColor: 'text-gray-600',
        backgroundColor: 'bg-white',
        borderColor: 'border-gray-300'
      };
  }
}
