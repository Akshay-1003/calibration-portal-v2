/**
 * Thread Gauge Calculation Utilities
 * 
 * Common utility functions for thread plug/ring gauge calculations
 * Can be reused across different thread gauge calibration components
 */

export interface ThreadGaugeCalculationParams {
  mean: number | null;
  wireDia: number | null | undefined;
  constant: number | null | undefined;
  pitch: number | null | undefined;
}

export interface ThreadGaugeValidationResult {
  isValid: boolean;
  error?: string;
  calculatedValue?: number;
}

export interface SpecificationValidationResult {
  status: 'within_specification' | 'out_of_specification' | 'specification_missing';
  remark: string;
  isWithinSpec: boolean;
}

/**
 * Calculates Observation Size for thread gauges
 * Formula: Observation Size = Mean - (3 × wireDia) + (constant × pitch)
 * 
 * @param params - Calculation parameters
 * @returns Validation result with calculated value or error
 */
export function calculateThreadGaugeObservationSize(
  params: ThreadGaugeCalculationParams
): ThreadGaugeValidationResult {
  const { mean, wireDia, constant, pitch } = params;

  // Validate mean
  if (mean === null || mean === undefined || isNaN(mean)) {
    return {
      isValid: false,
      error: 'Mean value is required',
    };
  }

  // Validate wireDia
  if (wireDia === null || wireDia === undefined || isNaN(wireDia) || wireDia <= 0) {
    return {
      isValid: false,
      error: 'Wire Diameter (d) must be a positive number',
    };
  }

  // Validate constant
  if (constant === null || constant === undefined || isNaN(constant)) {
    return {
      isValid: false,
      error: 'Constant (c) is required',
    };
  }

  // Validate pitch
  if (pitch === null || pitch === undefined || isNaN(pitch) || pitch <= 0) {
    return {
      isValid: false,
      error: 'Pitch (P) must be a positive number',
    };
  }

  // Calculate: Mean - (3 × wireDia) + (constant × pitch)
  const calculatedValue = Number(
    (mean - 3 * wireDia + constant * pitch).toFixed(3)
  );

  return {
    isValid: true,
    calculatedValue,
  };
}

/**
 * Validates calculated observation size against specification limits
 * 
 * Decision Logic:
 * - Wear Limit (lower boundary)
 * - Max Wear Limit (upper boundary)
 * 
 * Mathematical Rule:
 * Within Specification: Wear Limit ≤ Observed Value ≤ Max Wear Limit
 * Out of Specification: Observed Value < Wear Limit OR Observed Value > Max Wear Limit
 * 
 * @param observedSize - The calculated observation size
 * @param spec - Specification limits with wear_limit and max_wear_limit
 * @returns Validation result with status and remark
 */
export interface SpecificationValidationResult {
  status:
    | 'within_specification'
    | 'out_of_specification'
    | 'specification_missing'
    | 'observation_missing';
  remark: string;
  isWithinSpec: boolean;
}

export function validateObservationAgainstSpecification(
  observedSize: number | null | undefined,
  spec?: {
    max_limit?: number;   // Upper acceptance limit
    wear_limit?: number;  // Lower acceptance limit
  }
): SpecificationValidationResult {

  /* -------------------------------------------------- */
  /* STEP 1 — Check Observation Exists                  */
  /* -------------------------------------------------- */
  if (observedSize === null || observedSize === undefined || isNaN(observedSize)) {
    return {
      status: 'observation_missing',
      remark: 'Observation Missing',
      isWithinSpec: false,
    };
  }

  /* -------------------------------------------------- */
  /* STEP 2 — Check Specification Exists                */
  /* -------------------------------------------------- */
  if (!spec) {
    return {
      status: 'specification_missing',
      remark: 'Specification Missing',
      isWithinSpec: false,
    };
  }

  const { wear_limit, max_limit } = spec;

  if (wear_limit === undefined || max_limit === undefined) {
    return {
      status: 'specification_missing',
      remark: 'Specification Missing',
      isWithinSpec: false,
    };
  }

  /* -------------------------------------------------- */
  /* STEP 3 — Calibration Acceptance Logic              */
  /* Real metrology rule:                               */
  /* Wear Limit ≤ Observed Value ≤ Max Limit            */
  /* -------------------------------------------------- */
console.log(observedSize,spec)
  const isWithinSpec = observedSize >= wear_limit && observedSize <= max_limit;
  console.log('isWithinSpec', isWithinSpec);
  /* -------------------------------------------------- */
  /* STEP 4 — Return Result                             */
  /* -------------------------------------------------- */
  if (isWithinSpec) {
    return {
      status: 'within_specification',
      remark: 'Within Specification',
      isWithinSpec: true,
    };
  }

  return {
    status: 'out_of_specification',
    remark: 'Out of Specification',
    isWithinSpec: false,
  };
}

/**
 * Validates thread gauge parameters
 * 
 * @param wireDia - Wire diameter
 * @param constant - Constant value
 * @param pitch - Pitch value
 * @returns Error message if invalid, undefined if valid
 */
export function validateThreadGaugeParameters(
  wireDia: number | null | undefined,
  constant: number | null | undefined,
  pitch: number | null | undefined
): string | undefined {
  if (wireDia === null || wireDia === undefined || isNaN(wireDia) || wireDia <= 0) {
    return 'Wire Diameter (d) must be a positive number';
  }

  if (constant === null || constant === undefined || isNaN(constant)) {
    return 'Constant (c) is required';
  }

  if (pitch === null || pitch === undefined || isNaN(pitch) || pitch <= 0) {
    return 'Pitch (P) must be a positive number';
  }

  return undefined;
}






