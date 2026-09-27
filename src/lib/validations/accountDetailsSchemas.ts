import { z } from 'zod';

export const accountDetailTypes = [
  'Calibration Lab',
  'Trading',
  'Sales',
  'Service',
] as const;

const optionalTrimmedString = z.string().trim().optional().or(z.literal(''));

export const accountBankDetailsSchema = z.object({
  bank_name: z.string().trim().min(1, 'Bank name is required'),
  account_no: z.string().trim().min(1, 'Account number is required'),
  ifsc: z.string().trim().min(1, 'IFSC is required'),
  branch: z.string().trim().min(1, 'Branch is required'),
});

export const accountDetailFormSchema = z.object({
  firm_name: z.string().trim().min(1, 'Firm name is required'),
  type: z.enum(accountDetailTypes, {
    errorMap: () => ({ message: 'Type is required' }),
  }),
  gst_no: optionalTrimmedString,
  pan_no: optionalTrimmedString,
  address: optionalTrimmedString,
  contact_no: optionalTrimmedString,
  email: z
    .union([z.string().trim().email('Enter a valid email'), z.literal('')])
    .optional(),
  website: optionalTrimmedString,
  logo: optionalTrimmedString,
  bank_details: accountBankDetailsSchema,
  is_active: z.boolean().default(true),
});

export type AccountDetailFormData = z.infer<typeof accountDetailFormSchema>;
