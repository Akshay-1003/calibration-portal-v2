/**
 * Inward Entry List Filter Validation Schemas
 * Single source of truth for validation of list filter objects used before API calls.
 */

import { z } from 'zod';

const optionalNonEmptyTrimmedString = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: 'Value cannot be empty' })
  .optional();

// Dates are sent to API in DD/MM/YYYY format.
const optionalDdMmYyyy = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { message: 'Date cannot be empty' })
  .refine((v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v), { message: 'Invalid date format' })
  .optional();

export const inwardEntriesListFiltersSchema = z
  .object({
    client_org_id: optionalNonEmptyTrimmedString,
    inward_date_from: optionalDdMmYyyy,
    inward_date_to: optionalDdMmYyyy,
  })
  .strict();

export type InwardEntriesListFilters = z.infer<typeof inwardEntriesListFiltersSchema>;


