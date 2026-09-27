import { z } from 'zod';
import { buildQuotationRangeLabel } from '../../utils/quotationMeasurement';

const optionalString = z.string().optional().or(z.literal(''));

const numericString = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldLabel} is required`)
    .refine((value) => !Number.isNaN(Number(value)), {
      message: `${fieldLabel} must be a valid number`,
    });

const optionalNumericString = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((value) => value === '' || !Number.isNaN(Number(value)), {
    message: 'Please enter a valid number',
  });

export const quotationDimensionModeSchema = z.enum([
  'range_only',
  'basic_size_only',
  'range_and_basic_size',
]);

export const quotationItemFormSchema = z
  .object({
    gauge_id: optionalString,
    gauge_name: z.string().trim().min(1, 'Gauge name is required'),
    gauge_type: optionalString,
    serial_number: optionalString,
    make: optionalString,
    hsn_sac: optionalString,
    quantity: numericString('Quantity'),
    unit: optionalString,
    dimension_mode: quotationDimensionModeSchema,
    range_from: optionalNumericString,
    range_to: optionalNumericString,
    basic_size: optionalString,
    base_price: numericString('Base price').refine(
      (value) => Number(value) > 0,
      {
        message: 'Base price must be greater than 0',
      },
    ),
    discount_type: z.enum(['none', 'percentage', 'flat']),
    discount_value: optionalNumericString,
  })
  .superRefine((data, ctx) => {
    if (Number(data.quantity) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantity must be greater than 0',
        path: ['quantity'],
      });
    }

    const hasRangeFrom =
      data.range_from !== undefined && data.range_from !== '';
    const hasRangeTo = data.range_to !== undefined && data.range_to !== '';
    const hasBasicSize = Boolean(data.basic_size?.trim());

    if (
      data.dimension_mode === 'range_only' ||
      data.dimension_mode === 'range_and_basic_size'
    ) {
      if (!hasRangeFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Range From is required',
          path: ['range_from'],
        });
      }

      if (!hasRangeTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Range To is required',
          path: ['range_to'],
        });
      }

      if (
        hasRangeFrom &&
        hasRangeTo &&
        Number(data.range_from) > Number(data.range_to)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Range From must be less than or equal to Range To',
          path: ['range_from'],
        });
      }
    }

    if (
      data.dimension_mode === 'basic_size_only' ||
      data.dimension_mode === 'range_and_basic_size'
    ) {
      if (!hasBasicSize) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Basic Size is required',
          path: ['basic_size'],
        });
      }
    }

    if (data.discount_type !== 'none') {
      if (data.discount_value === undefined || data.discount_value === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Discount value is required',
          path: ['discount_value'],
        });
      } else {
        const discountValue = Number(data.discount_value);
        if (discountValue < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Discount value cannot be negative',
            path: ['discount_value'],
          });
        }
        if (data.discount_type === 'percentage' && discountValue > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Discount % cannot exceed 100',
            path: ['discount_value'],
          });
        }
      }
    }
  });

export const quotationItemPayloadSchema = z.object({
  gauge_id: z.string().trim().min(1, 'Gauge id is required'),
  gauge_name: z.string().trim().min(1, 'Gauge name is required'),
  gauge_type: z.string().trim().optional(),
  serial_number: z.string().trim().optional(),
  make: z.string().trim().optional(),
  hsn_sac: z.string().trim().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  dimension_mode: quotationDimensionModeSchema,
  range_from: z.number().nonnegative().optional(),
  range_to: z.number().nonnegative().optional(),
  basic_size: z.string().trim().optional(),
  range_size: z.string().trim().min(1, 'Range/size label is required'),
  specifications: z.unknown().optional(),
  unit: z.string().trim().optional(),
  base_price: z.number().positive('Base price must be greater than 0'),
  discount_type: z.enum(['percentage', 'flat']).nullable(),
  discount_value: z.number().min(0, 'Discount value cannot be negative'),
});

export type QuotationItemFormInput = z.input<typeof quotationItemFormSchema>;
export type QuotationItemFormData = z.output<typeof quotationItemFormSchema>;
export type QuotationItemPayload = z.output<typeof quotationItemPayloadSchema>;

export const buildQuotationItemPayload = (
  data: QuotationItemFormData,
): QuotationItemPayload => {
  const payload = {
    gauge_id: data.gauge_id?.trim() || '',
    gauge_name: data.gauge_name.trim(),
    gauge_type: data.gauge_type?.trim() || undefined,
    serial_number: data.serial_number?.trim() || undefined,
    make: data.make?.trim() || undefined,
    hsn_sac: data.hsn_sac?.trim() || undefined,
    quantity: Number(data.quantity),
    unit: data.unit?.trim() || undefined,
    dimension_mode: data.dimension_mode,
    range_from:
      data.range_from !== undefined && data.range_from !== ''
        ? Number(data.range_from)
        : undefined,
    range_to:
      data.range_to !== undefined && data.range_to !== ''
        ? Number(data.range_to)
        : undefined,
    basic_size: data.basic_size?.trim() || undefined,
    range_size: buildQuotationRangeLabel({
      dimension_mode: data.dimension_mode,
      range_from:
        data.range_from !== undefined && data.range_from !== ''
          ? Number(data.range_from)
          : undefined,
      range_to:
        data.range_to !== undefined && data.range_to !== ''
          ? Number(data.range_to)
          : undefined,
      basic_size: data.basic_size?.trim() || undefined,
    }),
    base_price: Number(data.base_price),
    discount_type: data.discount_type === 'none' ? null : data.discount_type,
    discount_value:
      data.discount_type === 'none' ||
      data.discount_value === undefined ||
      data.discount_value === ''
        ? 0
        : Number(data.discount_value),
  };

  return quotationItemPayloadSchema.parse(payload);
};
