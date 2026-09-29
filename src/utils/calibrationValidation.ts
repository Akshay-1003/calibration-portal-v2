/**
 * Calibration Form Validation Utilities
 * Provides dynamic validation based on gauge type
 * Uses Zod schemas for type-safe validation
 */

import { getCalibrationSchema, canReuseRepeatabilityForTypeA } from "../lib/validations/calibrationSchemas";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates plunger dial calibration observations
 */
export function validatePlungerDialObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate readings
  const readings = formData?.observations?.readings || [];
  if (!readings || readings.length === 0) {
    errors.push({
      field: "observations.readings",
      message: "At least one reading row is required",
    });
  } else {
    readings.forEach((reading: any, index: number) => {
      // Validate turn, range, value (required fields)
      if (!reading.turn || reading.turn.toString().trim() === "") {
        errors.push({
          field: `observations.readings.${index}.turn`,
          message: `Turn is required for row ${index + 1}`,
        });
      }
      if (!reading.range || reading.range.toString().trim() === "") {
        errors.push({
          field: `observations.readings.${index}.range`,
          message: `Range is required for row ${index + 1}`,
        });
      }
      if (!reading.value || reading.value.toString().trim() === "") {
        errors.push({
          field: `observations.readings.${index}.value`,
          message: `Value is required for row ${index + 1}`,
        });
      }
    });
  }

  // Validate Type A readings (5 readings required)
  const typeAReadings = formData?.observations?.type_a_readings || [];
  if (!typeAReadings || typeAReadings.length === 0) {
    errors.push({
      field: "observations.type_a_readings",
      message: "Type A readings are required (5 readings)",
    });
  } else {
    const validReadings = typeAReadings.filter(
      (r: any) => r !== null && r !== undefined && r !== ""
    );
    if (validReadings.length < 5) {
      errors.push({
        field: "observations.type_a_readings",
        message: "All 5 Type A readings are required",
      });
    }
  }

  // Validate Repeatability (5 readings required)
  const repeatability = formData?.observations?.repeatability || [];
  if (!repeatability || repeatability.length === 0) {
    errors.push({
      field: "observations.repeatability",
      message: "Repeatability readings are required (5 readings)",
    });
  } else {
    const validRepeatability = repeatability.filter(
      (r: any) => r !== null && r !== undefined && r !== ""
    );
    if (validRepeatability.length < 5) {
      errors.push({
        field: "observations.repeatability",
        message: "All 5 Repeatability readings are required",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates OD/ID Limit Gauge observations
 */
export function validateODIDLimitGaugeObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate GO observations
  const goObservations = formData?.observations?.go;
  if (!goObservations) {
    errors.push({
      field: "observations.go",
      message: "GO observations are required",
    });
  }

  // Validate NO-GO observations
  const noGoObservations = formData?.observations?.no_go;
  if (!noGoObservations) {
    errors.push({
      field: "observations.no_go",
      message: "NO-GO observations are required",
    });
  }

  // Validate Type A readings
  const typeAReadings = formData?.observations?.type_a_readings || [];
  if (!typeAReadings || typeAReadings.length === 0) {
    errors.push({
      field: "observations.type_a_readings",
      message: "Type A readings are required (5 readings)",
    });
  } else {
    const validReadings = typeAReadings.filter(
      (r: any) => r !== null && r !== undefined && r !== ""
    );
    if (validReadings.length < 5) {
      errors.push({
        field: "observations.type_a_readings",
        message: "All 5 Type A readings are required",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Master Piece observations
 */
export function validateMasterPieceObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  const readings = formData?.observations?.readings || [];
  if (!Array.isArray(readings) || readings.length === 0) {
    errors.push({
      field: "observations.readings",
      message: "Master Piece observations are required",
    });
  } else {
    readings.forEach((row: any, index: number) => {
      const hasR1 = row?.reading_1 !== null && row?.reading_1 !== undefined && row?.reading_1 !== "";
      const hasR2 = row?.reading_2 !== null && row?.reading_2 !== undefined && row?.reading_2 !== "";
      const hasR3 = row?.reading_3 !== null && row?.reading_3 !== undefined && row?.reading_3 !== "";

      if (!hasR1 || !hasR2 || !hasR3) {
        errors.push({
          field: `observations.readings.${index}`,
          message: `All 3 readings are required for row ${index + 1}`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Fixed Range Gauge observations
 */
export function validateFixedRangeObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Add specific validation for fixed range gauges
  const observations = formData?.observations;
  if (!observations) {
    errors.push({
      field: "observations",
      message: "Observations are required",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Master Ring observations
 */
export function validateMasterRingObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Add specific validation for master ring gauges
  const observations = formData?.observations;
  if (!observations) {
    errors.push({
      field: "observations",
      message: "Observations are required",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates Thread Plug/Ring Gauge observations
 * Checks for incomplete readings and observed sizes
 */
export function validateThreadPlugRingGaugeObservations(formData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const observations = formData?.observations || {};

  // Validate parameters
  const parameters = observations.parameters || {};
  if (!parameters.wire_dia || parameters.wire_dia <= 0) {
    errors.push({
      field: "observations.parameters.wire_dia",
      message: "Wire Diameter (d) is required and must be positive",
    });
  }
  if (parameters.constant === null || parameters.constant === undefined) {
    errors.push({
      field: "observations.parameters.constant",
      message: "Constant (c) is required",
    });
  }
  if (!parameters.pitch || parameters.pitch <= 0) {
    errors.push({
      field: "observations.parameters.pitch",
      message: "Pitch (P) is required and must be positive",
    });
  }

  // Validate GO observations
  const goObservations = observations.go;
  if (!goObservations) {
    errors.push({
      field: "observations.go",
      message: "GO observations are required",
    });
  } else {
    // Check GO A readings (3 readings required)
    const goAValues = goObservations.a?.values || [];
    const validGoA = goAValues.filter((v: any) => v !== null && v !== undefined && v !== "");
    if (validGoA.length < 3) {
      errors.push({
        field: "observations.go.a.values",
        message: "All 3 GO readings for Observation A are required",
      });
    }

    // Check GO B readings (3 readings required)
    const goBValues = goObservations.b?.values || [];
    const validGoB = goBValues.filter((v: any) => v !== null && v !== undefined && v !== "");
    if (validGoB.length < 3) {
      errors.push({
        field: "observations.go.b.values",
        message: "All 3 GO readings for Observation B are required",
      });
    }

    // Check GO observed sizes
    if (goObservations.observed_size_a === null || goObservations.observed_size_a === undefined || goObservations.observed_size_a === "") {
      errors.push({
        field: "observations.go.observed_size_a",
        message: "GO Observation Size A is required",
      });
    }
    if (goObservations.observed_size_b === null || goObservations.observed_size_b === undefined || goObservations.observed_size_b === "") {
      errors.push({
        field: "observations.go.observed_size_b",
        message: "GO Observation Size B is required",
      });
    }
  }

  // Validate NO-GO observations
  const noGoObservations = observations.no_go;
  if (!noGoObservations) {
    errors.push({
      field: "observations.no_go",
      message: "NO-GO observations are required",
    });
  } else {
    // Check NO-GO A readings (3 readings required)
    const noGoAValues = noGoObservations.a?.values || [];
    const validNoGoA = noGoAValues.filter((v: any) => v !== null && v !== undefined && v !== "");
    if (validNoGoA.length < 3) {
      errors.push({
        field: "observations.no_go.a.values",
        message: "All 3 NO-GO readings for Observation A are required",
      });
    }

    // Check NO-GO B readings (3 readings required)
    const noGoBValues = noGoObservations.b?.values || [];
    const validNoGoB = noGoBValues.filter((v: any) => v !== null && v !== undefined && v !== "");
    if (validNoGoB.length < 3) {
      errors.push({
        field: "observations.no_go.b.values",
        message: "All 3 NO-GO readings for Observation B are required",
      });
    }

    // Check NO-GO observed sizes
    if (noGoObservations.observed_size_a === null || noGoObservations.observed_size_a === undefined || noGoObservations.observed_size_a === "") {
      errors.push({
        field: "observations.no_go.observed_size_a",
        message: "NO-GO Observation Size A is required",
      });
    }
    if (noGoObservations.observed_size_b === null || noGoObservations.observed_size_b === undefined || noGoObservations.observed_size_b === "") {
      errors.push({
        field: "observations.no_go.observed_size_b",
        message: "NO-GO Observation Size B is required",
      });
    }
  }

  // Validate Type A readings (5 readings required)
  const typeAReadings = observations.type_a_readings || [];
  if (!typeAReadings || typeAReadings.length === 0) {
    errors.push({
      field: "observations.type_a_readings",
      message: "Type A readings are required (5 readings)",
    });
  } else {
    const validReadings = typeAReadings.filter(
      (r: any) => r !== null && r !== undefined && r !== ""
    );
    if (validReadings.length < 5) {
      errors.push({
        field: "observations.type_a_readings",
        message: "All 5 Type A readings are required",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Main validation function using Zod schemas
 * Routes to appropriate validator based on gauge type
 */
export function validateCalibrationForm(
  gaugeType: string,
  formData: any
): ValidationResult {
  try {
    const type = (gaugeType || "").toLowerCase().trim();
    
    // Thread Plug/Ring Gauge validation (before schema validation)
    if (
      type === "thread plug gauge" ||
      type === "thread ring gauge" ||
      type === "plain thread plug gauge" ||
      type === "plain thread ring gauge" ||
      type === "plain taper plug gauge" ||
      type === "plain taper ring gauge" ||
      type === "taper thread plug gauge" ||
      type === "taper thread ring gauge"
    ) {
      const threadValidation = validateThreadPlugRingGaugeObservations(formData);
      if (!threadValidation.isValid) {
        return threadValidation;
      }
    }
    
    const schema = getCalibrationSchema(gaugeType);
    
    // Handle Repeatability/Type A shared logic
    const observations = formData?.observations || {};
    const repeatability = observations.repeatability;
    const typeA = observations.type_a_readings;
    
    // If Repeatability exists and is valid, and Type A is empty/incomplete, sync them
    if (canReuseRepeatabilityForTypeA(repeatability, typeA)) {
      // Create a copy with Type A synced from Repeatability
      const syncedData = {
        ...formData,
        observations: {
          ...observations,
          type_a_readings: repeatability,
        },
      };
      
      const result = schema.safeParse(syncedData);
      
      if (result.success) {
        return {
          isValid: true,
          errors: [],
        };
      }
      
      // Convert Zod errors to ValidationError format
      const errors: ValidationError[] = result.error.issues.map((err) => {
        const field = err.path.join(".");
        return {
          field,
          message: err.message,
        };
      });
      
      return {
        isValid: false,
        errors,
      };
    }
    
    // Normal validation
    const result = schema.safeParse(formData);
    
    if (result.success) {
      return {
        isValid: true,
        errors: [],
      };
    }
    
    // Convert Zod errors to ValidationError format
    const errors: ValidationError[] = result.error.issues.map((err) => {
      const field = err.path.join(".");
      return {
        field,
        message: err.message,
      };
    });
    
    return {
      isValid: false,
      errors,
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      isValid: false,
      errors: [
        {
          field: "general",
          message: "Validation failed. Please check all required fields.",
        },
      ],
    };
  }
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return "";
  
  return errors.map((err) => err.message).join("\n");
}
