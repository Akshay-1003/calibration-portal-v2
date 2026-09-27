import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_ENDPOINTS } from '../../config/api';
import {
  type Quotation,
  type QuotationItem,
  type QuotationListItem,
} from '../../store/quotationStore';
import { ApiError, apiClient } from '../../services/api';
import { queryKeys } from './queryKeys';
import { extractPaginatedList } from '../../utils/paginatedResponse';
import { buildQuotationRangeLabel } from '../../utils/quotationMeasurement';
import {
  calculateQuotationFinalPrice,
  calculateQuotationLineSubtotal,
  calculateQuotationTotals as calculateQuotationTaxTotals,
  DEFAULT_QUOTATION_HSN_SAC,
  mapQuotationGstTypeToApi,
  normalizeQuotationGstType,
  normalizeQuotationQuantity,
  resolveQuotationRangeSize,
} from '../../utils/quotationDocumentUtils';

type QuotationApiDiscountType =
  | 'Percentage Discount'
  | 'Flat Discount Amount'
  | string
  | null
  | undefined;

interface QuotationRecordLike extends Record<string, unknown> {
  id?: string;
  _id?: string;
  quotation_number?: string;
  quotation_date?: string;
  billing_firm_id?: string;
  client_org_id?: string;
  sender_details?: Record<string, unknown>;
  client_details?: Record<string, unknown>;
  quotation_items?: unknown[];
  items?: unknown[];
  terms_and_conditions?: unknown[];
  terms_conditions?: unknown[];
  status?: string;
  revision_number?: number;
  parent_quotation_id?: string | null;
  root_quotation_id?: string | null;
  revision_date?: string | null;
  revision_reason?: string | null;
}

export interface QuotationListQueryData {
  quotations: QuotationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuotationPayloadItem {
  master_gauge_id?: string;
  gauge_name: string;
  serial_number?: string;
  make?: string;
  hsn_sac?: string;
  quantity?: number;
  range_from?: number;
  range_to?: number;
  basic_size?: string;
  range_size?: string;
  specifications?: unknown;
  unit?: string;
  base_price: number;
  discount_type?: 'Percentage Discount' | 'Flat Discount Amount';
  discount_value?: number;
}

export interface QuotationCorePayload {
  billing_firm_id?: string;
  quotation_date: string;
  client_org_id?: string;
  sender_details: {
    firm_name: string;
    address: string;
    contact_no: string;
    email: string;
    gst_no?: string;
  };
  client_details: {
    name: string;
    address: string;
    contact_no: string;
    email: string;
    gst_no?: string;
  };
  quotation_items: QuotationPayloadItem[];
  terms_and_conditions: string[];
  status: string;
  gst_type?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
}

export interface QuotationExtendedPayload extends QuotationCorePayload {
  subject_line?: string;
  intro_note?: string;
  footer_note?: string;
  payment_terms?: string;
  delivery_terms?: string;
  validity_days?: number;
  tax_note?: string;
  prepared_by?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string'
    ? value
    : typeof value === 'number'
      ? String(value)
      : fallback;

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizeDiscountTypeFromApi = (
  value: QuotationApiDiscountType,
): QuotationItem['discount_type'] => {
  const normalized = toStringValue(value).trim().toLowerCase();

  if (normalized === 'percentage discount') {
    return 'percentage';
  }

  if (normalized === 'flat discount amount') {
    return 'flat';
  }

  return null;
};

const normalizeDiscountTypeToApi = (
  value: QuotationItem['discount_type'],
): 'Percentage Discount' | 'Flat Discount Amount' | undefined => {
  if (value === 'percentage') {
    return 'Percentage Discount';
  }

  if (value === 'flat') {
    return 'Flat Discount Amount';
  }

  return undefined;
};

const calculateFinalPrice = (
  basePrice: number,
  quantity: number,
  discountType: QuotationItem['discount_type'],
  discountValue: number,
): number => {
  return calculateQuotationFinalPrice(
    basePrice,
    quantity,
    discountType,
    discountValue,
  );
};

const buildAddressString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    return '';
  }

  const parts = [
    value.address_line_1,
    value.address_line_2,
    value.city,
    value.state,
    value.zip_code,
    value.country,
  ]
    .map((part) => toStringValue(part).trim())
    .filter(Boolean);

  return parts.join(', ');
};

const normalizeQuotationItem = (raw: unknown, index: number): QuotationItem => {
  const record = (isRecord(raw) ? raw : {}) as Record<string, unknown>;
  const rangeFrom = toNumberValue(record.range_from ?? record.rangeFrom);
  const rangeTo = toNumberValue(record.range_to ?? record.rangeTo);
  const basicSize = toStringValue(record.basic_size ?? record.basicSize).trim();
  const basePrice = toNumberValue(record.base_price ?? record.basePrice) ?? 0;
  const discountType = normalizeDiscountTypeFromApi(
    record.discount_type ?? record.discountType,
  );
  const discountValue =
    toNumberValue(record.discount_value ?? record.discountValue) ?? 0;
  const quantity = normalizeQuotationQuantity(
    toNumberValue(record.quantity ?? record.qty),
  );
  const dimensionMode =
    basicSize && rangeFrom !== undefined && rangeTo !== undefined
      ? 'range_and_basic_size'
      : basicSize
        ? 'basic_size_only'
        : 'range_only';

  return {
    id:
      toStringValue(record.id || record._id).trim() ||
      `quotation-item-${index + 1}`,
    gauge_id: toStringValue(
      record.master_gauge_id ?? record.gauge_id ?? record.gaugeId,
    ).trim(),
    gauge_name: toStringValue(record.gauge_name ?? record.gaugeName).trim(),
    gauge_type: toStringValue(record.gauge_type ?? record.gaugeType).trim(),
    serial_number: toStringValue(
      record.serial_number ?? record.serialNumber ?? record.manf_serial_number,
    ).trim(),
    make: toStringValue(record.make ?? record.manufacturer).trim(),
    hsn_sac:
      toStringValue(
        record.hsn_sac ?? record.hsnSac ?? record.hsn_code ?? record.hsn,
      ).trim() || DEFAULT_QUOTATION_HSN_SAC,
    quantity,
    dimension_mode: dimensionMode,
    range_from: rangeFrom,
    range_to: rangeTo,
    basic_size: basicSize || undefined,
    range_size: resolveQuotationRangeSize({
      rangeSize:
        toStringValue(
          record.range_size ??
            record.rangeSize ??
            record.quotation_label ??
            record.quotationLabel,
        ).trim() ||
        buildQuotationRangeLabel({
          dimension_mode: dimensionMode,
          range_from: rangeFrom,
          range_to: rangeTo,
          basic_size: basicSize || undefined,
        }),
      specifications: record.specifications,
      unit: toStringValue(record.unit).trim() || 'mm',
    }),
    specifications: record.specifications,
    unit: toStringValue(record.unit).trim() || 'mm',
    base_price: basePrice,
    discount_type: discountType,
    discount_value: discountValue,
    final_price:
      toNumberValue(record.final_price ?? record.finalPrice) ??
      calculateFinalPrice(basePrice, quantity, discountType, discountValue),
  };
};

const normalizeQuotationListItem = (raw: unknown): QuotationListItem => {
  const record = (isRecord(raw) ? raw : {}) as Record<string, unknown>;

  return {
    id: toStringValue(record.id ?? record._id).trim(),
    quotation_number: toStringValue(record.quotation_number).trim(),
    revision_number: toNumberValue(record.revision_number) ?? 0,
    parent_quotation_id: toStringValue(record.parent_quotation_id).trim() || null,
    root_quotation_id: toStringValue(record.root_quotation_id).trim() || null,
    quotation_date: toStringValue(record.quotation_date).trim(),
    client_name: toStringValue(record.client_name).trim(),
    billing_firm_name: toStringValue(record.billing_firm_name).trim(),
    status: toStringValue(record.status).trim() || 'draft',
    grand_total: toNumberValue(record.grand_total) ?? 0,
  };
};

export const normalizeQuotation = (raw: unknown): Quotation => {
  const record = (isRecord(raw) ? raw : {}) as QuotationRecordLike;
  const senderDetails = isRecord(record.sender_details)
    ? record.sender_details
    : {};
  const clientDetails = isRecord(record.client_details)
    ? record.client_details
    : {};
  const itemsRaw = Array.isArray(record.quotation_items)
    ? record.quotation_items
    : Array.isArray(record.items)
      ? record.items
      : [];
  const items = itemsRaw.map((item, index) =>
    normalizeQuotationItem(item, index),
  );

  const subtotal =
    toNumberValue(record.subtotal) ??
    items.reduce(
      (sum, item) =>
        sum + calculateQuotationLineSubtotal(item.base_price, item.quantity),
      0,
    );
  const totalDiscount =
    toNumberValue(record.total_discount) ??
    items.reduce(
      (sum, item) =>
        sum +
        (calculateQuotationLineSubtotal(item.base_price, item.quantity) -
          item.final_price),
      0,
    );
  const gstType = normalizeQuotationGstType(
    record.gst_type as string | undefined,
  );
  const taxableAmount =
    toNumberValue(record.taxable_amount ?? record.taxableAmount) ??
    Math.max(0, subtotal - totalDiscount);
  const cgstRate = toNumberValue(record.cgst_rate ?? record.cgstRate) ?? 0;
  const sgstRate = toNumberValue(record.sgst_rate ?? record.sgstRate) ?? 0;
  const igstRate = toNumberValue(record.igst_rate ?? record.igstRate) ?? 0;
  const fallbackTotals = calculateQuotationTaxTotals({
    subtotal,
    totalDiscount,
    gstType,
    cgstRate,
    sgstRate,
    igstRate,
  });
  const grandTotal =
    toNumberValue(record.grand_total) ?? fallbackTotals.grandTotal;
  const cgstAmount =
    toNumberValue(record.cgst_amount ?? record.cgstAmount ?? record.cgst) ??
    fallbackTotals.cgstAmount;
  const sgstAmount =
    toNumberValue(record.sgst_amount ?? record.sgstAmount ?? record.sgst) ??
    fallbackTotals.sgstAmount;
  const igstAmount =
    toNumberValue(record.igst_amount ?? record.igstAmount ?? record.igst) ??
    fallbackTotals.igstAmount;

  return {
    id: toStringValue(record.id ?? record._id),
    quotation_number: toStringValue(record.quotation_number),
    revision_number: toNumberValue(record.revision_number) ?? 0,
    parent_quotation_id: toStringValue(record.parent_quotation_id).trim() || null,
    root_quotation_id: toStringValue(record.root_quotation_id).trim() || null,
    revision_date: toStringValue(record.revision_date).trim() || null,
    revision_reason: toStringValue(record.revision_reason).trim() || null,
    quotation_date: toStringValue(record.quotation_date),
    quotation_type: 'regular',
    client_org_id: toStringValue(record.client_org_id),
    billing_firm_id: toStringValue(record.billing_firm_id),
    billing_firm_name: toStringValue(
      record.billing_firm_name ?? senderDetails.firm_name,
    ),
    billing_firm_contact: toStringValue(
      senderDetails.contact_no ?? record.billing_firm_contact,
    ),
    billing_firm_email: toStringValue(
      senderDetails.email ?? record.billing_firm_email,
    ),
    billing_firm_gst: toStringValue(
      senderDetails.gst_no ?? record.billing_firm_gst,
    ),
    billing_firm_address:
      buildAddressString(
        senderDetails.address ?? record.billing_firm_address,
      ) || toStringValue(record.billing_firm_address),
    customer_name: toStringValue(
      clientDetails.name ?? record.customer_name ?? record.client_name,
    ),
    customer_contact: toStringValue(
      clientDetails.contact_no ?? record.customer_contact,
    ),
    customer_email: toStringValue(clientDetails.email ?? record.customer_email),
    customer_gst: toStringValue(clientDetails.gst_no ?? record.customer_gst),
    customer_address:
      buildAddressString(clientDetails.address ?? record.customer_address) ||
      toStringValue(record.customer_address),
    subject_line: toStringValue(record.subject_line),
    intro_note: toStringValue(record.intro_note),
    footer_note: toStringValue(record.footer_note),
    payment_terms: toStringValue(record.payment_terms),
    delivery_terms: toStringValue(record.delivery_terms),
    validity_days: toNumberValue(record.validity_days),
    tax_note: toStringValue(record.tax_note),
    gst_type: gstType,
    cgst_rate: cgstRate || fallbackTotals.cgstRate,
    sgst_rate: sgstRate || fallbackTotals.sgstRate,
    igst_rate: igstRate || fallbackTotals.igstRate,
    taxable_amount: taxableAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    round_off: toNumberValue(record.round_off ?? record.roundOff) ?? 0,
    prepared_by: toStringValue(record.prepared_by),
    terms_conditions: (Array.isArray(record.terms_and_conditions)
      ? record.terms_and_conditions
      : Array.isArray(record.terms_conditions)
        ? record.terms_conditions
        : []
    )
      .map((term) => toStringValue(term).trim())
      .filter(Boolean),
    items,
    subtotal,
    total_discount: totalDiscount,
    grand_total: grandTotal,
    status: toStringValue(record.status) || 'draft',
    created_at: toStringValue(record.created_at) || new Date().toISOString(),
    updated_at: toStringValue(record.updated_at) || new Date().toISOString(),
  };
};

const normalizeQuotationListResponse = (
  payload: unknown,
  fallbackLimit: number,
): QuotationListQueryData => {
  const result = extractPaginatedList(payload, {
    arrayKeys: ['data'],
    mapItem: normalizeQuotationListItem,
    fallbackLimit,
  });

  return {
    quotations: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

const trimOptionalString = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const buildQuotationCorePayload = (
  quotation: Partial<Quotation>,
): QuotationCorePayload => {
  const billingFirmId = trimOptionalString(quotation.billing_firm_id);
  const clientOrgId = trimOptionalString(quotation.client_org_id);

  return {
    ...(billingFirmId ? { billing_firm_id: billingFirmId } : {}),
    quotation_date:
      toStringValue(quotation.quotation_date).trim() ||
      new Date().toISOString().split('T')[0],
    ...(clientOrgId ? { client_org_id: clientOrgId } : {}),
    sender_details: {
      firm_name: toStringValue(quotation.billing_firm_name).trim(),
      address: toStringValue(quotation.billing_firm_address).trim(),
      contact_no: toStringValue(quotation.billing_firm_contact).trim(),
      email: toStringValue(quotation.billing_firm_email).trim(),
      ...(trimOptionalString(quotation.billing_firm_gst)
        ? { gst_no: trimOptionalString(quotation.billing_firm_gst) }
        : {}),
    },
    client_details: {
      name: toStringValue(quotation.customer_name).trim(),
      address: toStringValue(quotation.customer_address).trim(),
      contact_no: toStringValue(quotation.customer_contact).trim(),
      email: toStringValue(quotation.customer_email).trim(),
      ...(trimOptionalString(quotation.customer_gst)
        ? { gst_no: trimOptionalString(quotation.customer_gst) }
        : {}),
    },
    quotation_items: (quotation.items ?? []).map((item) => ({
      ...(item.gauge_id && !item.gauge_id.startsWith('new-gauge-')
        ? { master_gauge_id: item.gauge_id }
        : {}),
      gauge_name: item.gauge_name,
      ...(trimOptionalString(item.serial_number)
        ? { serial_number: trimOptionalString(item.serial_number) }
        : {}),
      ...(trimOptionalString(item.make)
        ? { make: trimOptionalString(item.make) }
        : {}),
      hsn_sac: trimOptionalString(item.hsn_sac) || DEFAULT_QUOTATION_HSN_SAC,
      quantity: normalizeQuotationQuantity(item.quantity),
      ...(typeof item.range_from === 'number'
        ? { range_from: item.range_from }
        : {}),
      ...(typeof item.range_to === 'number' ? { range_to: item.range_to } : {}),
      ...(trimOptionalString(item.basic_size)
        ? { basic_size: trimOptionalString(item.basic_size) }
        : {}),
      ...(trimOptionalString(item.range_size)
        ? { range_size: trimOptionalString(item.range_size) }
        : {}),
      ...(item.specifications ? { specifications: item.specifications } : {}),
      ...(trimOptionalString(item.unit)
        ? { unit: trimOptionalString(item.unit) }
        : {}),
      base_price: item.base_price,
      ...(normalizeDiscountTypeToApi(item.discount_type)
        ? { discount_type: normalizeDiscountTypeToApi(item.discount_type) }
        : {}),
      ...(item.discount_value > 0
        ? { discount_value: item.discount_value }
        : {}),
    })),
    terms_and_conditions: (quotation.terms_conditions ?? [])
      .map((term) => term.trim())
      .filter(Boolean),
    status: trimOptionalString(quotation.status) || 'draft',
    gst_type: mapQuotationGstTypeToApi(quotation.gst_type),
    cgst_rate:
      quotation.gst_type === 'cgst_sgst' ? Number(quotation.cgst_rate || 0) : 0,
    sgst_rate:
      quotation.gst_type === 'cgst_sgst' ? Number(quotation.sgst_rate || 0) : 0,
    igst_rate:
      quotation.gst_type === 'igst' ? Number(quotation.igst_rate || 0) : 0,
  };
};

const buildQuotationExtendedPayload = (
  quotation: Partial<Quotation>,
): QuotationExtendedPayload => {
  const payload: QuotationExtendedPayload =
    buildQuotationCorePayload(quotation);

  const optionalFields: Array<
    keyof Omit<QuotationExtendedPayload, keyof QuotationCorePayload>
  > = [
    'subject_line',
    'intro_note',
    'footer_note',
    'payment_terms',
    'delivery_terms',
    'tax_note',
    'prepared_by',
  ];

  optionalFields.forEach((field) => {
    const value = trimOptionalString(quotation[field] as string | undefined);
    if (value) {
      payload[field] = value;
    }
  });

  if (
    typeof quotation.validity_days === 'number' &&
    Number.isFinite(quotation.validity_days)
  ) {
    payload.validity_days = quotation.validity_days;
  }

  return payload;
};

const submitQuotationWithFallback = async (
  submit: (
    payload: QuotationCorePayload | QuotationExtendedPayload,
  ) => Promise<unknown>,
  quotation: Partial<Quotation>,
): Promise<Quotation> => {
  const extendedPayload = buildQuotationExtendedPayload(quotation);

  try {
    const response = await submit(extendedPayload);
    return normalizeQuotation(
      isRecord(response) && 'data' in response ? response.data : response,
    );
  } catch (error) {
    if (!(error instanceof ApiError) || ![400, 422].includes(error.status)) {
      throw error;
    }

    const corePayload = buildQuotationCorePayload(quotation);
    const response = await submit(corePayload);
    return normalizeQuotation(
      isRecord(response) && 'data' in response ? response.data : response,
    );
  }
};

export const buildQuotationUpsertPayload = (
  quotation: Partial<Quotation>,
): QuotationExtendedPayload => buildQuotationExtendedPayload(quotation);

export function useQuotationsQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 0;
  const limit = options?.limit ?? 10;

  return useQuery({
    queryKey: queryKeys.quotations.list({ page, limit }),
    queryFn: async (): Promise<QuotationListQueryData> => {
      const response = await apiClient.getApiResponse<unknown>(
        API_ENDPOINTS.QUOTATIONS.LIST,
        {
          page,
          limit,
        },
      );

      return normalizeQuotationListResponse(response, limit);
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useQuotationDetailQuery(
  quotationId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.quotations.detail(quotationId || ''),
    queryFn: async (): Promise<Quotation> => {
      if (!quotationId) {
        throw new Error('Quotation id is required');
      }

      const response = await apiClient.getApiResponse<unknown>(
        API_ENDPOINTS.QUOTATIONS.GET(quotationId),
      );

      return normalizeQuotation(response?.data ?? response);
    },
    enabled: (options?.enabled ?? true) && !!quotationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotation: Partial<Quotation>): Promise<Quotation> =>
      submitQuotationWithFallback(
        (payload) =>
          apiClient.postApiResponse<unknown>(
            API_ENDPOINTS.QUOTATIONS.CREATE,
            payload,
          ),
        quotation,
      ),
    onSuccess: (createdQuotation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.setQueryData(
        queryKeys.quotations.detail(createdQuotation.id),
        createdQuotation,
      );
      toast.success('Quotation created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create quotation');
    },
  });
}

export function useUpdateQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quotation,
    }: {
      id: string;
      quotation: Partial<Quotation>;
    }): Promise<Quotation> =>
      submitQuotationWithFallback(
        (payload) =>
          apiClient.putApiResponse<unknown>(
            API_ENDPOINTS.QUOTATIONS.UPDATE(id),
            payload,
          ),
        quotation,
      ),
    onSuccess: (updatedQuotation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.setQueryData(
        queryKeys.quotations.detail(updatedQuotation.id),
        updatedQuotation,
      );
      toast.success('Quotation updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update quotation');
    },
  });
}

export function useCreateQuotationRevisionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quotationId, reason }: { quotationId: string; reason?: string }) => {
      const response = await apiClient.postApiResponse<unknown>(
        `${API_ENDPOINTS.QUOTATIONS.CREATE_REVISION(quotationId)}${
          reason?.trim() ? `?reason=${encodeURIComponent(reason.trim())}` : ''
        }`,
      );
      return normalizeQuotation(response?.data ?? response);
    },
    onSuccess: (revision) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      queryClient.setQueryData(queryKeys.quotations.detail(revision.id), revision);
      toast.success('Quotation revision created as a draft');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to create quotation revision'),
  });
}

export function useQuotationRevisionsQuery(quotationId: string | null) {
  return useQuery({
    queryKey: queryKeys.quotations.revisions(quotationId || ''),
    queryFn: async (): Promise<Quotation[]> => {
      if (!quotationId) throw new Error('Quotation id is required');
      const response = await apiClient.getApiResponse<unknown>(API_ENDPOINTS.QUOTATIONS.REVISIONS(quotationId));
      const values = Array.isArray(response) ? response : [];
      return values.map(normalizeQuotation);
    },
    enabled: Boolean(quotationId),
  });
}

export function useDeleteQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string): Promise<void> => {
      await apiClient.deleteApiResponse<void>(
        API_ENDPOINTS.QUOTATIONS.DELETE(quotationId),
      );
    },
    onSuccess: (_, deletedQuotationId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.quotations.detail(deletedQuotationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations.lists() });
      toast.success('Quotation deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete quotation');
    },
  });
}
