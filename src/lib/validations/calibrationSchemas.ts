/**
 * Calibration Form Validation Schemas
 * Provides Zod schemas for all gauge type calibration forms
 */

import { z } from "zod";

/**
 * Shared validation schemas for common fields
 */
const readingValueSchema = z.union([
  z.string().min(1, "Reading value is required"),
  z.number(),
]).refine(
  (val) => {
    if (typeof val === "string") {
      const num = Number(val);
      return !isNaN(num) && val.trim() !== "";
    }
    return !isNaN(val);
  },
  { message: "Reading must be a valid number" }
);

// Type A readings schema - can be flexible if Repeatability exists
const typeAReadingSchema = z.array(readingValueSchema).refine(
  (arr) => arr.length === 5 && arr.every(r => r !== null && r !== undefined && r !== ""),
  { message: "All 5 Type A readings are required" }
);

// Repeatability schema - always requires 5 readings
const repeatabilitySchema = z.array(readingValueSchema).length(5, "All 5 Repeatability readings are required");

/**
 * Plunger Dial Calibration Schema
 */
const plungerDialReadingSchema = z.object({
  turn: z.union([z.string().min(1, "Turn is required"), z.number()]),
  range: z.union([z.string().min(1, "Range is required"), z.number()]),
  value: z.union([z.string().min(1, "Value is required"), z.number()]),
  upward_reading: z.object({
    actual_reading: z.union([z.string(), z.number()]).optional(),
    observed_error: z.union([z.string(), z.number()]).optional(),
  }).optional(),
  downward_reading: z.object({
    actual_reading: z.union([z.string(), z.number()]).optional(),
    observed_error: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

export const plungerDialCalibrationSchema = z.object({
  observations: z.object({
    readings: z.array(plungerDialReadingSchema).min(1, "At least one reading row is required"),
    type_a_readings: typeAReadingSchema,
    repeatability: repeatabilitySchema,
    tables_to_print: z.array(z.string()).optional(),
  }),
}).refine(
  (data) => {
    // If repeatability exists and is valid, Type A can reuse those values
    const repeatability = data.observations.repeatability;
    const typeA = data.observations.type_a_readings;
    
    // If repeatability is complete, Type A can be optional or match repeatability
    if (repeatability && repeatability.length === 5 && repeatability.every(r => r !== null && r !== undefined && r !== "")) {
      return true; // Repeatability is valid, Type A can reuse
    }
    
    // Otherwise, Type A must be complete
    return typeA && typeA.length === 5 && typeA.every(r => r !== null && r !== undefined && r !== "");
  },
  {
    message: "Type A readings are required. If Repeatability readings exist, they can be reused for Type A.",
    path: ["observations", "type_a_readings"],
  }
);

/**
 * OD/ID Limit Gauge Calibration Schema
 */
const goNoGoObservationSchema = z.object({
  a: z.object({
    values: z.array(z.number()).length(3, "3 readings required for A"),
    average: z.number().optional(),
  }).optional(),
  b: z.object({
    values: z.array(z.number()).length(3, "3 readings required for B"),
    average: z.number().optional(),
  }).optional(),
});

export const odIdLimitGaugeCalibrationSchema = z.object({
  observations: z.object({
    go: goNoGoObservationSchema,
    no_go: goNoGoObservationSchema,
    type_a_readings: typeAReadingSchema,
  }),
});

/**
 * Master Piece Calibration Schema
 */
const masterPieceReadingRowSchema = z.object({
  basic_size: z.union([z.string(), z.number()]).optional(),
  reading_1: readingValueSchema,
  reading_2: readingValueSchema,
  reading_3: readingValueSchema,
  mean: z.union([z.string(), z.number()]).optional(),
  observed_error: z.union([z.string(), z.number()]).optional(),
});

export const masterPieceCalibrationSchema = z.object({
  observations: z.object({
    readings: z.array(masterPieceReadingRowSchema).min(1, "At least one reading row is required"),
    type_a_readings: typeAReadingSchema.optional(), // Optional for master piece
  }),
});

const idMasterReadingRowSchema = z.object({
  basic_size: z.union([z.string(), z.number()]).optional(),
  readings: z.array(readingValueSchema).min(1, "At least one reading is required"),
  mean: z.union([z.string(), z.number()]).optional(),
  parameter: z.enum(["A", "B"]).optional(),
});

export const idMasterCalibrationSchema = z.object({
  observations: z.object({
    readings: z.array(idMasterReadingRowSchema).min(1, "At least one reading row is required"),
    type_a_readings: typeAReadingSchema.optional(),
  }),
});

/**
 * Fixed Range Gauge Calibration Schema
 */
const fixedRangeReadingSchema = z.object({
  measured_dimension: z.number(),
  readings: z.array(z.union([z.string(), z.number()])).length(3, "3 readings required"),
  mean: z.number().optional(),
  observed_error: z.number().optional(),
  setAs: z.string().optional(),
});

export const fixedRangeCalibrationSchema = z.object({
  observations: z.object({
    readings: z.array(fixedRangeReadingSchema).min(1, "At least one reading row is required"),
    type_a_readings: typeAReadingSchema,
    repeatability: repeatabilitySchema,
  }),
}).refine(
  (data) => {
    // If repeatability exists and is valid, Type A can reuse those values
    const repeatability = data.observations.repeatability;
    const typeA = data.observations.type_a_readings;
    
    // If repeatability is complete, Type A can be optional or match repeatability
    if (repeatability && repeatability.length === 5 && repeatability.every(r => r !== null && r !== undefined && r !== "")) {
      return true; // Repeatability is valid, Type A can reuse
    }
    
    // Otherwise, Type A must be complete
    return typeA && typeA.length === 5 && typeA.every(r => r !== null && r !== undefined && r !== "");
  },
  {
    message: "Type A readings are required. If Repeatability readings exist, they can be reused for Type A.",
    path: ["observations", "type_a_readings"],
  }
);

/**
 * Master Ring Calibration Schema
 */
export const masterRingCalibrationSchema = z.object({
  observations: z.object({
    readings: z.array(z.any()).min(1, "At least one reading is required"),
    type_a_readings: typeAReadingSchema.optional(),
    repeatability: repeatabilitySchema.optional(),
  }),
});

/**
 * Comparator Stand Calibration Schema
 */
const comparatorStandParameterSchema = z.object({
  parameter: z.string().min(1, "Parameter is required"),
  readings: z.array(readingValueSchema).length(3, "3 readings required"),
  observed_size_mean: z.union([z.string(), z.number()]).optional(),
});

export const comparatorStandCalibrationSchema = z.object({
  observations: z.object({
    parameters: z.array(comparatorStandParameterSchema).min(1, "At least one parameter is required"),
    type_a_readings: typeAReadingSchema,
  }),
});

/**
 * Dynamic schema selector based on gauge type
 */
export function getCalibrationSchema(gaugeType: string) {
  const type = (gaugeType || "").toLowerCase().trim();
  
  switch (type) {
    case "plunger dial":
      return plungerDialCalibrationSchema;
    case "od limit gauge":
    case "id limit gauge":
      return odIdLimitGaugeCalibrationSchema;
    case "master piece":
      return masterPieceCalibrationSchema;
    case "id master":
    case "id master gauge":
      return idMasterCalibrationSchema;
    case "fixed range gauge":
      return fixedRangeCalibrationSchema;
    case "master ring":
      return masterRingCalibrationSchema;
    case "comparator stand":
      return comparatorStandCalibrationSchema;
    default:
      // Generic schema - at least check observations exist
      return z.object({
        observations: z.any().refine(
          (val) => val !== null && val !== undefined,
          { message: "Observations are required" }
        ),
      });
  }
}

/**
 * Helper function to check if Repeatability can be reused for Type A
 */
export function canReuseRepeatabilityForTypeA(
  repeatability: any[] | undefined | null,
  typeA: any[] | undefined | null
): boolean {
  if (!repeatability || repeatability.length !== 5) {
    return false;
  }
  
  const validRepeatability = repeatability.filter(
    (r) => r !== null && r !== undefined && r !== ""
  );
  
  if (validRepeatability.length !== 5) {
    return false;
  }
  
  // If Type A is empty or incomplete, we can use Repeatability
  if (!typeA || typeA.length !== 5) {
    return true;
  }
  
  const validTypeA = typeA.filter(
    (r) => r !== null && r !== undefined && r !== ""
  );
  
  // If Type A is incomplete, we can use Repeatability
  return validTypeA.length < 5;
}

/**
 * Helper function to sync Repeatability to Type A if applicable
 */
export function syncRepeatabilityToTypeA(
  formData: any,
  setValue: (path: string, value: any) => void
): void {
  const repeatability = formData?.observations?.repeatability;
  const typeA = formData?.observations?.type_a_readings;
  
  if (canReuseRepeatabilityForTypeA(repeatability, typeA)) {
    // Copy repeatability values to Type A
    repeatability.forEach((value: any, index: number) => {
      setValue(`observations.type_a_readings.${index}`, value);
    });
  }
}
