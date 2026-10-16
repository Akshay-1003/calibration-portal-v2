/**
 * Zod validation schemas for all forms in the application
 * Provides consistent validation rules and error messages
 */

import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

const requiredStringSchema = (fieldName: string, minLength = 1) =>
  z.string()
    .min(1, `${fieldName} is required`)
    .min(minLength, `${fieldName} must be at least ${minLength} characters`);

const optionalStringSchema = () =>
  z.string().optional().or(z.literal(''));

const optionalLooseStringSchema = () =>
  z.string().trim().optional().or(z.literal(''));

// Authentication Schemas
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z.object({
  firstName: requiredStringSchema('First name', 2)
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  lastName: requiredStringSchema('Last name', 2)
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[@$!%*?&_#-])/, 'Password must contain at least one special character (@$!%*?&_#-)')
    .refine(
      (password) => !/^(.)\1+$/.test(password),
      'Password cannot be all the same character'
    )
    .refine(
      (password) => !/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password),
      'Password cannot contain common sequences'
    ),
});

// Password reset schemas
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[@$!%*?&_#-])/, 'Password must contain at least one special character (@$!%*?&_#-)'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Email verification schema
export const verifyEmailSchema = z.object({
  code: z.string()
    .min(1, 'Verification code is required')
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

// User Management Schema
export const createUserSchema = z.object({
  firstName: requiredStringSchema('First name'),
  lastName: requiredStringSchema('Last name'),
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['admin', 'user', 'viewer', 'manager'], { message: 'Please select a valid role' }),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateUserSchema = z.object({
  firstName: requiredStringSchema('First name'),
  lastName: requiredStringSchema('Last name'),
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'user', 'viewer', 'manager'], { message: 'Please select a valid role' }),
  permissions: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// Contact Schema (reusable)
export const contactSchema = z.object({
  name: optionalLooseStringSchema(),
  email: optionalLooseStringSchema(),
  phone: optionalLooseStringSchema(),
});

// Address Schema (reusable)
export const addressSchema = z.object({
  address_line_1: requiredStringSchema('Address'),
  address_line_2: optionalLooseStringSchema(),
  city: optionalStringSchema(),
  state: optionalStringSchema(),
  zip_code: optionalStringSchema(),
  country: optionalStringSchema(),
});

// Rate Card Entry Schema (for API/store)
export const rateCardEntrySchema = z.object({
  rate_type: z.string().min(1, 'Rate type is required'),
  range: z.object({
    min: z.number().min(0, 'Min range must be >= 0'),
    max: z.number().min(0, 'Max range must be >= 0'),
  }).refine((r) => r.min <= r.max, { message: 'Min range must be ≤ max range', path: ['min'] }),
  description: optionalStringSchema(),
  rate: z.number().min(0, 'Rate must be >= 0'),
  discount: z.number().min(0, 'Discount must be >= 0').max(100, 'Discount must be <= 100'),
  unit: z.string().min(1, 'Unit is required'),
});

// Inward Rate Card Entry Schema (aligned to API spec)
const inwardRateRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const inwardRateCardEntrySchema = z.object({
  rate_type: z.string().min(1, 'Rate type is required'),
  range: z.union([inwardRateRangeSchema, z.number(), z.null()]).nullable(),
  range_unit: z.string().nullable().optional(),
  description: optionalStringSchema(),
  rate: z.union([z.number(), z.null()]).nullable().optional(),
  discount: z.union([z.number(), z.null()]).nullable().optional(),
  unit: z.string().default('rs/unit'),
  standard_specification: z.string().nullable().optional(),
});

const rateCardNumberInput = z.union([z.string(), z.number()]).transform((val) => {
  if (val === '' || val === null || val === undefined) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return Number.isNaN(num) ? 0 : num;
});

const optionalRateCardNumberInput = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .optional()
  .transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return Number.isNaN(num) ? undefined : num;
  });

const rateCardPricingRowFormSchema = z.object({
  range: z
    .object({
      min: rateCardNumberInput.pipe(z.number().min(0, 'Min range must be >= 0')),
      max: rateCardNumberInput.pipe(z.number().min(0, 'Max range must be >= 0')),
    })
    .optional()
    .refine((r) => !r || r.min <= r.max, {
      message: 'Min range must be <= max range',
      path: ['min'],
    }),
  standard_specification: z.string().optional(),
  basic_size: optionalRateCardNumberInput.pipe(z.number().optional()),
  least_count: optionalRateCardNumberInput.pipe(z.number().optional()),
  rate: rateCardNumberInput.pipe(z.number().min(0, 'Rate must be >= 0')),
});

// Rate Card Form Schema (for batch form with string inputs that get converted to numbers)
export const rateCardFormSchema = z.object({
  gauge_id: z.string().min(1, 'Gauge name is required'),
  rate_type: z.enum(['discount', 'flat']),
  range_type: z.enum(['range', 'specification', 'basic_size']),
  description: optionalStringSchema(),
  discount: rateCardNumberInput.pipe(
    z.number().min(0, 'Discount must be >= 0').max(100, 'Discount must be <= 100')
  ),
  unit: z.string().min(1, 'Unit is required'),
  entries: z.array(rateCardPricingRowFormSchema).min(1, 'At least one rate row is required'),
}).superRefine((data, ctx) => {
  data.entries.forEach((entry, index) => {
    if (data.range_type === 'range' && !entry.range) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide range values',
        path: ['entries', index, 'range'],
      });
    }

    if (data.range_type === 'specification' && !entry.standard_specification?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a specification',
        path: ['entries', index, 'standard_specification'],
      });
    }

    if (
      data.range_type === 'basic_size' &&
      (entry.basic_size === undefined || entry.basic_size === null)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide a basic size',
        path: ['entries', index, 'basic_size'],
      });
    }
  });
});

export type RateCardFormData = z.infer<typeof rateCardFormSchema>;

// Contract Schema (reusable)
export const contractSchema = z.object({
  calibration_method: requiredStringSchema('Calibration method'),
  reporting_method: requiredStringSchema('Reporting method'),
  collection_mode: requiredStringSchema('Collection mode'),
  dispatch_mode: requiredStringSchema('Dispatch mode'),
  conformity_statement: z.boolean().default(false),
  conformity_accepted: z.boolean().default(false),
  specific_requirements: optionalLooseStringSchema(),
  rate_card: z.record(z.string(), rateCardEntrySchema).optional().or(z.record(z.string(), rateCardEntrySchema).nullable()),
});

// Organization/Party Master Schema
export const organizationSchema = z.object({
  name: requiredStringSchema('Organization name'),
  description: optionalLooseStringSchema(),
  parent_id: optionalLooseStringSchema(),
  gst: optionalLooseStringSchema(),
  gst_type: optionalLooseStringSchema(),
  contacts: z.array(contactSchema).default([]),
  address: addressSchema,
  contract: contractSchema,
  archived: z.boolean().default(false),
});

// Gauge Master Schema
export const gaugeMasterSchema = z.object({
  name: requiredStringSchema('Gauge name'),
  is_standard_no: requiredStringSchema('IS standard number'),
  non_nabl_cert_frmt_no: optionalStringSchema(),
  nabl_cert_frmt_no: optionalStringSchema(),
  raw_datasheet_frmt_no: optionalStringSchema(),
  certificate_code: optionalStringSchema(),
  calibration_method: optionalStringSchema(),
  environmental_conditions: optionalStringSchema(),
  certificate_type_id: requiredStringSchema('Certificate type'),
});

// Subtype Schema (same structure as main form but without process)
const gaugeSpecificationsSchema = z
  .object({
    surface_material: z
      .enum(["granite", "cast_iron", "steel"])
      .optional()
      .or(z.literal("")),
    surface_plate_ref_id: optionalLooseStringSchema(),
    length: optionalLooseStringSchema(),
    width: optionalLooseStringSchema(),
    block_size: optionalLooseStringSchema(),
    method: z
      .enum(["division", "micron_per_block", "micron_per_meter"])
      .optional()
      .or(z.literal("")),
    lc: optionalLooseStringSchema(),
  })
  .catchall(z.unknown())
  .optional();

const gaugeSubtypeSchema = z.object({
  master_gauge_id: requiredStringSchema('Gauge name'),
  gauge_class: requiredStringSchema('Gauge class'),
  certificate_type_id: requiredStringSchema('Certificate type'),
  identification_number: requiredStringSchema('Identification number'),
  calibration_frequency: z.string()
    .min(1, 'frequency is required')
    .regex(/^\d+$/, 'Calibration frequency must be a number'),
  calibration_frequency_unit: z.enum(['months', 'years'], {
    message: 'Please select a valid frequency unit',
  }),
  make: optionalStringSchema(),
  manf_serial_number: optionalStringSchema(),
  unit: z.enum(['mm', 'µm', 'inch', 'kg/cm2', 'bar', 'Pa', 'degree'], {
    message: 'Please select a valid unit',
  }),
  calibration_location_type: z.enum(['permanent_facility', 'site_facility', 'mobile_facility'], {
    message: 'Please select a valid location type',
  }),
  calibration_done_under: z.enum(['nabl', 'non_nabl'], {
    message: 'Please select a valid calibration type',
  }).optional(),
  gauge_condition: requiredStringSchema('Gauge condition'),
  specifications: gaugeSpecificationsSchema,
});

// Gauge Registration Schema
export const gaugeRegistrationSchema = z.object({
  master_gauge_id: requiredStringSchema('Gauge name'),
  gauge_class: requiredStringSchema('Gauge class akshay'),
  certificate_type_id: requiredStringSchema('Certificate type'),
  identification_number: requiredStringSchema('Identification number'),
  calibration_frequency: z.string()
    .min(1, 'Calibration frequency is required')
    .regex(/^\d+$/, 'Calibration frequency must be a number'),
  calibration_frequency_unit: z.enum(['months', 'years'], {
    message: 'Please select a valid frequency unit',
  }),
  make: optionalStringSchema(),
  manf_serial_number: optionalStringSchema(),
  process: z.enum(['calibration', 'repair', 'calibration_and_repairing', 'data_save'], {
    message: 'Please select a valid process',
  }),
  unit: z.enum(['mm', 'µm', 'inch', 'kg/cm2', 'bar', 'Pa', 'degree'], {
    message: 'Please select a valid unit',
  }),
  calibration_location_type: z.enum(['permanent_facility', 'site_facility', 'mobile_facility'], {
    message: 'Please select a valid location type',
  }),
  calibration_done_under: z.enum(['nabl', 'non_nabl'], {
    message: 'Please select a valid calibration type',
  }),
  gauge_condition: requiredStringSchema('Gauge condition'),
  specifications: gaugeSpecificationsSchema,
  subtype: z.array(gaugeSubtypeSchema).optional(),
});

// Dial Table Master Schema
export const dialTableMasterSchema = z.object({
  dial_type: z.enum(['plunger', 'lever'], {
    message: 'Please select a valid dial type',
  }),
  range: z.string()
    .min(1, 'Range is required')
    .regex(/^\d*\.?\d+$/, 'Range must be a valid number'),
  travel: z.string()
    .min(1, 'Travel is required')
    .regex(/^\d*\.?\d+$/, 'Travel must be a valid number'),
});
export const equipmentSchema = z.object({
  range: requiredStringSchema("Range"),
  max_error: requiredStringSchema("Max error"),
});
// Equipment Master Schema - matches API schema exactly
export const equipmentMasterSchema = z.object({
  equipment_name: z.string().min(1, 'Equipment name is required'),
  code_no: z.string().min(1, 'Code number is required'),
  serial_no: z.string().min(1, 'Serial number is required'),
  mfg_date: z.string().min(1, 'Manufacturing date is required'),
  date_of_installation: z.string().min(1, 'Date of installation is required'),
  reference_std: z.string().min(1, 'Reference standard is required'),
  least_count: z.string().min(1, 'Least count is required'),
  cal_agency: z.string().min(1, 'Calibration agency is required'),
  make: z.string().min(1, 'Make is required'),
  size_range: z.string().min(1, 'Size range is required'),
  periodicity_no: z.string().min(1, 'Periodicity is required'),
  equipment_location: z.string().min(1, 'Equipment location is required'),
  ranges: z.array(equipmentSchema).optional(),
});

export const equipmentRangeSchema = z.object({
  range: requiredStringSchema("Range"),
  max_permissible_error: requiredStringSchema("Max permissible error"),
  uncertainty: requiredStringSchema("Uncertainty"),
});
// Equipment History Schema
export const equipmentHistorySchema = z.object({
  master_equipment_id: requiredStringSchema("Equipment"),

  cal_by: requiredStringSchema("Calibrated by"),

  cal_date: z
    .string()
    .min(1, "Calibration date is required"),

  calibration_due_date: z
    .string()
    .min(1, "Calibration due date is required"),

  cal_certificate_no: requiredStringSchema("Calibration certificate number"),

  format_no: requiredStringSchema("Format number"),

  traceability: requiredStringSchema("Traceability"),

  remark: z.string().optional(),

  ranges: z
    .array(equipmentRangeSchema)
    .min(1, "At least one range is required"),
});


// Enhanced Inward Form Schema
export const enhancedInwardFormSchema = z.object({
  client_org_id: requiredStringSchema('Client organization'),
  billing_org_id: requiredStringSchema('Billing organization'),
  delivery_org_id: requiredStringSchema('Delivery organization'),
  other_access_org_id: requiredStringSchema('Other access organization'),
  client_dc_no: requiredStringSchema('Client DC number'),
  client_dc_date: z.date({ message: 'Client DC date is required' }),
  through: z.string(),
  inward_date: z.date({ message: 'Inward date is required' }),
  received_date: z.date({ message: 'Received date is required' }),
  commit_date: z.date().optional(),
  calibration_method: z.enum(['lab_method', 'customer_specified_method', 'standard_method']).default('lab_method'),
  reporting_method: z.enum(['lab_format', 'customer_specified_format', 'standard_format']).default('lab_format'),
  collection_mode: z.enum(['by_hand', 'by_courier']).default('by_hand'),
  dispatch_mode: z.enum(['by_hand', 'by_courier']).default('by_hand'),
  conformity_statement: z.boolean().default(false),
  conformity_accepted: z.boolean().default(false),
  specific_requirements: z.string().default(''),
  additional_requirements: optionalStringSchema(),
  rate_card: z.record(z.string(), z.array(inwardRateCardEntrySchema)).optional().nullable(),
  archived: z.boolean().default(false),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
  lab_authorized_person_id: requiredStringSchema('Lab authorized person', 2),
  lab_authorized_person_designation: requiredStringSchema('Lab authorized person designation', 2),
  client_authorized_person_id: optionalStringSchema(),
  client_authorized_person_contact: z.string().optional(),
  client_org_name: requiredStringSchema('Client organization name'),
  billing_org_name: requiredStringSchema('Billing organization name'),
  delivery_org_name: requiredStringSchema('Delivery organization name'),
});

// Gauge Inward Form Schema
export const gaugeInwardFormSchema = z.object({
  gauge_name: requiredStringSchema('Gauge name'),
  gauge_option: optionalStringSchema(),
  gauge_class: requiredStringSchema('Gauge class'),
  gauge_type: requiredStringSchema('Gauge type'),
  identification_number: requiredStringSchema('Identification number'),
  calibration_frequency: optionalStringSchema(),
  make: optionalStringSchema(),
  manufacturer_serial_number: optionalStringSchema(),
  process: z.enum(['calibration', 'inspection'], {
    message: 'Please select a valid process',
  }),
  unit: requiredStringSchema('Unit'),
  calibration_location: requiredStringSchema('Calibration location'),
  calibration_location_details: optionalStringSchema(),
  calibration_under: requiredStringSchema('Calibration under'),
  gauge_condition: optionalStringSchema(),
});

// Reading Master Form Schema
export const readingMasterFormSchema = z.object({
  master_gauge_id: requiredStringSchema('Master gauge'),
  readings: z
    .array(
      z
        .string()
        .regex(/^\d{1,8}(\.\d{1,3})?$/, 'Reading must be a valid number (max 8 digits, 3 decimals)')
        .or(z.literal('')) // Allow empty string for new rows
    )
    .min(1, 'At least one reading is required')
    .refine(
      (readings) => {
        const numbers = readings
          .map((r) => r.trim())
          .filter((r) => r !== '')
          .map(Number)
          .filter((n) => !isNaN(n));
        return numbers.length > 0;
      },
      { message: 'At least one valid reading is required' }
    ),
});

const surfacePlateNumericFieldSchema = (fieldName: string) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine((value) => value !== '', `${fieldName} is required`)
    .refine((value) => !Number.isNaN(Number(value)), `${fieldName} must be a valid number`);

export const surfacePlateReferenceStandardFormSchema = z.object({
  master_gauge_id: requiredStringSchema('Master gauge'),
  master_gauge_name: requiredStringSchema('Master gauge'),
  shape: z.enum(['rectangular', 'square'], {
    message: 'Please select a valid shape',
  }),
  length: surfacePlateNumericFieldSchema('Length'),
  width: surfacePlateNumericFieldSchema('Width'),
  unit: requiredStringSchema('Unit'),
  tolerances: z.object({
    grade_0: surfacePlateNumericFieldSchema('Grade 0'),
    grade_1: surfacePlateNumericFieldSchema('Grade 1'),
    grade_2: surfacePlateNumericFieldSchema('Grade 2'),
    grade_3: surfacePlateNumericFieldSchema('Grade 3'),
  }),
});

export type SurfacePlateReferenceStandardFormData = z.infer<
  typeof surfacePlateReferenceStandardFormSchema
>;

// Scope Master Form Schema
export const scopeMasterFormSchema = z.object({
  master_gauge_id: requiredStringSchema('Master gauge'),
  unit: z.enum(['mm', 'µm', 'inch', 'kg/cm2', 'bar', 'Pa', 'degree'], {
    message: 'Please select a valid unit',
  }).default('mm'),
  range: z.object({
    min: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return '0';
        return String(val);
      }),
    max: z
      .union([z.string(), z.number()])
      .transform((val) => {
        if (val === '' || val === null || val === undefined) return '0';
        return String(val);
      }),
  })
    .refine(
      (r) => {
        const min = Number(r.min);
        const max = Number(r.max);
        return !isNaN(min) && !isNaN(max) && min <= max;
      },
      { message: 'Range min must be ≤ max', path: ['min'] }
    ),
  least_count: z
    .union([z.string(), z.number()])
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return '0';
      return String(val);
    })
    .pipe(
      z.string().refine(
        (val) => {
          const num = Number(val);
          return !isNaN(num) && num >= 0;
        },
        { message: 'Least count must be >= 0' }
      )
    ),
  valid_until: z.string().min(1, 'Valid until is required'),
  uncertainty: optionalStringSchema(),
  confidence_level_and_coverage: optionalStringSchema(),
  calibration_location: z.enum(['permanent_facility', 'site_facility', 'mobile_facility'], { 
    message: 'Please select a valid location' 
  }),
  remarks: optionalStringSchema(),
  calibration_equipments: z.array(z.string()).optional(),
  master_equipments: z.array(z.string()).optional(),
});

// Thread Ring Plug Form Schema
// Note: Form uses flat structure for better UX, but API expects nested specification_table
export const threadRingPlugFormSchema = z.object({
  gauge_type: requiredStringSchema('Gauge type'),
  standard_specification: optionalStringSchema(),
  go_max_wear_limit: optionalStringSchema(),
  go_min_wear_limit: optionalStringSchema(),
  go_wear_limit: optionalStringSchema(),
  no_go_max_wear_limit: optionalStringSchema(),
  no_go_min_wear_limit: optionalStringSchema(),
  no_go_wear_limit: optionalStringSchema(),
});

// Calibration Method Form Schema
export const calibrationMethodFormSchema = z.object({
  method: z.enum(['grade', 'tolerance'], {
    message: 'Please select a valid method',
  }),
  // Grade method fields
  diameter: z.string().optional(),
  grade: z.string().optional(),
  // Tolerance method fields
  basic_size: z.string().optional(),
  upperTolerance: z.string().optional(),
  lowerTolerance: z.string().optional(),
}).refine(
  (data) => {
    if (data.method === 'grade') {
      return data.diameter && data.grade;
    }
    if (data.method === 'tolerance') {
      return data.basic_size && data.upperTolerance && data.lowerTolerance;
    }
    return false;
  },
  {
    message: 'Please fill in all required fields for the selected method',
  }
);

// Register Gauge Form Schema (alternative implementation)
export const registerGaugeFormSchema = z.object({
  gaugeName: requiredStringSchema('Gauge name'),
  gaugeClass: z.enum(['digital', 'analog', 'mechanical', 'electronic', 'optical'], {
    message: 'Please select a valid gauge class',
  }),
  make: requiredStringSchema('Make'),
  identificationNumber: requiredStringSchema('Identification number'),
  serialNumber: requiredStringSchema('Serial number'),
  calibrationFrequency: z.string()
    .min(1, 'Calibration frequency is required')
    .regex(/^\d+$/, 'Frequency must be a number')
    .refine((val) => parseInt(val) >= 1, 'Frequency must be at least 1'),
  calibrationFrequencyUnit: z.enum(['months', 'days', 'weeks', 'years'], {
    message: 'Please select a valid frequency unit',
  }),
  process: z.enum(['calibration', 'verification', 'testing', 'inspection'], {
    message: 'Please select a valid process',
  }),
  unit: z.enum(['mm', 'µm', 'inch', 'kg/cm2', 'bar', 'Pa', 'degree'], {
    message: 'Please select a valid unit',
  }),
  calibrationLocationType: z.enum(['permanent_facility', 'on_site', 'mobile'], {
    message: 'Please select a valid location type',
  }),
  calibrationLocation: requiredStringSchema('Calibration location'),
  calibrationDoneUnder: z.enum(['nabl', 'non_nabl'], {
    message: 'Please select a valid calibration standard',
  }),
  gaugeCondition: z.enum(['excellent', 'good', 'fair', 'poor', 'damaged'], {
    message: 'Please select a valid gauge condition',
  }),
});

// Inward Form Schema (basic version)
export const inwardFormSchema = z.object({
  client_org_id: requiredStringSchema('Client organization'),
  billing_org_id: requiredStringSchema('Billing organization'),
  inward_date: z.string().min(1, 'Inward date is required'),
  reference_number: optionalStringSchema(),
  description: optionalStringSchema(),
  total_gauges: z.number().min(0, 'Total gauges must be a positive number'),
});

// Outward Form Schema
export const outwardFormSchema = z.object({
  clientOrgId: requiredStringSchema('Client organization'),
  outwardDate: z.date({
    error: 'Outward date is required',
  }),
  transportBy: requiredStringSchema('Transport by').min(2, 'Transport By must be at least 2 characters'),
});

// Sign In Form Schema
export const signInFormSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
});

// Type exports for TypeScript
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type OrganizationFormData = z.infer<typeof organizationSchema>;
export type GaugeMasterFormData = z.infer<typeof gaugeMasterSchema>;
export type GaugeRegistrationFormData = z.infer<typeof gaugeRegistrationSchema>;
export type DialTableMasterFormData = z.infer<typeof dialTableMasterSchema>;
export type EquipmentMasterFormData = z.infer<typeof equipmentMasterSchema>;
export type EquipmentHistoryFormData = z.infer<typeof equipmentHistorySchema>;
export type InwardFormData = z.infer<typeof inwardFormSchema>;
export type EnhancedInwardFormData = z.infer<typeof enhancedInwardFormSchema>;
export type GaugeInwardFormData = z.infer<typeof gaugeInwardFormSchema>;
export type ReadingMasterFormData = z.infer<typeof readingMasterFormSchema>;
export type ScopeMasterFormData = z.infer<typeof scopeMasterFormSchema>;
export type ThreadRingPlugFormData = z.infer<typeof threadRingPlugFormSchema>;

// Taper Thread Readings Form Schema
// Note: API structure has pitch_dial as {max_diameter, min_diameter} object
// Other fields (max_step, basic_step, min_step, total_length) are single values (can be "nan" string)
export const taperThreadReadingsFormSchema = z.object({
  gauge_type: requiredStringSchema('Gauge type'),
  gauge_sub_type: optionalStringSchema(),
  standard_specification: optionalStringSchema(),
  pitch_dial_max: optionalStringSchema(),
  pitch_dial_min: optionalStringSchema(),
  max_step: optionalStringSchema(),
  basic_step: optionalStringSchema(),
  min_step: optionalStringSchema(),
  total_length: optionalStringSchema(),
});

export type CalibrationMethodFormData = z.infer<typeof calibrationMethodFormSchema>;
export type RegisterGaugeFormData = z.infer<typeof registerGaugeFormSchema>;
export type ContactFormData = z.infer<typeof contactSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type ContractFormData = z.infer<typeof contractSchema>;
export type TaperThreadReadingsFormData = z.infer<typeof taperThreadReadingsFormSchema>;
export type OutwardFormData = z.infer<typeof outwardFormSchema>;
export type SignInFormData = z.infer<typeof signInFormSchema>;
