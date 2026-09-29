import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient, type ApiResponse } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { queryKeys } from './queryKeys';
import type { CompanyWithOutward, InvoiceDraftResponse } from '../../store/invoiceStore';
import {
  createInvoiceHeaderFormSchema,
  invoiceDraftRequestSchema,
  type CreateInvoiceHeaderFormData,
  type InvoiceDraftRequest,
} from '../../lib/validations/invoiceSchemas';
import type { Invoice } from '../../types/types';
import type { InvoicePdfColumnVisibility } from '../../utils/invoicePdfColumns';
import { useInvoiceStore } from '../../store/invoiceStore';
import type { InvoiceStatusFilter } from '../../utils/invoiceLifecycle';
import { normalizeInvoiceStatus } from '../../utils/invoiceLifecycle';

export interface InvoiceCompaniesListResponse {
  data: CompanyWithOutward[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary?: InvoiceSummary;
}

export interface InvoiceSummary {
  total_invoice_value: number;
  collected_amount: number;
  pending_amount: number;
  overdue_amount: number;
}

interface RawInvoiceCompaniesListResponse extends ApiResponse<CompanyWithOutward[]> {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  summary?: InvoiceSummary;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface CreateInvoicePayload {
  billing_firm_id: string;
  billing_firm_name: string;
  party_id: string;
  client_org_id: string;
  billing_date: string;
  date_of_issue: string;
  outward_id?: string | null;
  outward_ids: string[];
  outward_no?: string | null;
  outward_nos: Array<string | number>;
  gauge_inward_ids: string[];
  order_number: string | null;
  order_date: string | null;
  from_date: string | null;
  to_date: string | null;
  status: 'draft';
  discount_mode?: 'invoice' | 'line';
  credit_days: number;
  pdf_columns?: Partial<InvoicePdfColumnVisibility>;
  pdf_columns_user_configured?: boolean;
}

export interface MarkInvoicePaidPayload {
  payment_date: string;
  payment_mode: 'NEFT' | 'RTGS' | 'UPI' | 'Cheque' | 'Cash';
  payment_reference_no?: string | null;
  payment_remarks?: string | null;
}

const mapInvoiceToListEntry = (invoice: Invoice): CompanyWithOutward => {
  const grandTotal =
    invoice.invoice_details?.grand_total ??
    invoice.invoice_details?.sub_total ??
    0;
  const billingDate = invoice.billing_date || invoice.date_of_issue || '';

  return {
    company_id: invoice.client_org_id,
    company_name: invoice.client_details?.name ?? '',
    outward_count: invoice.outward_ids?.length ?? (invoice.outward_id ? 1 : 0),
    total_amount: grandTotal,
    grand_total: grandTotal,
    invoice_details: {
      grand_total: grandTotal,
      sub_total: invoice.invoice_details?.sub_total ?? 0,
    },
    status: invoice.status,
    display_status: (invoice as any).display_status,
    billing_date: billingDate,
    credit_days: invoice.credit_days,
    payment_due_date: invoice.payment_due_date,
    payment_date: invoice.payment_date,
    payment_mode: invoice.payment_mode,
    payment_reference_no: invoice.payment_reference_no,
    payment_remarks: invoice.payment_remarks,
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    date_of_issue: invoice.date_of_issue || billingDate,
    outward_id: invoice.outward_id,
    outward_ids: invoice.outward_ids ?? (invoice.outward_id ? [invoice.outward_id] : []),
    outward_nos: invoice.outward_nos ?? (invoice.outward_no == null ? [] : [invoice.outward_no]),
    client_org: invoice.client_details?.name ?? '',
    id: invoice.id,
  };
};

const toFiniteAmount = (value: unknown): number | undefined => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : undefined;

  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const resolveInvoiceListAmount = (invoice: CompanyWithOutward): number =>
  toFiniteAmount(invoice.grand_total) ??
  toFiniteAmount(invoice.total_amount) ??
  toFiniteAmount(invoice.invoice_details?.grand_total) ??
  toFiniteAmount(invoice.invoice_details?.sub_total) ??
  0;

const normalizeInvoiceListEntries = (items: CompanyWithOutward[]): CompanyWithOutward[] =>
  items.map((item) => {
    const amount = resolveInvoiceListAmount(item);
    const billingDate = item.billing_date || item.date_of_issue || '';

    return {
      ...item,
      total_amount: amount,
      grand_total: amount,
      billing_date: billingDate,
      date_of_issue: item.date_of_issue || billingDate,
      status: item.status || 'draft',
      display_status: item.display_status,
      credit_days: item.credit_days ?? 0,
      payment_due_date: item.payment_due_date ?? null,
      payment_date: item.payment_date ?? null,
      payment_mode: item.payment_mode ?? null,
      payment_reference_no: item.payment_reference_no ?? null,
      payment_remarks: item.payment_remarks ?? null,
    };
  });

const updateInvoiceListCaches = (
  queryClient: QueryClient,
  updater: (items: CompanyWithOutward[]) => CompanyWithOutward[],
) => {
  queryClient.setQueriesData(
    { queryKey: queryKeys.invoices.lists() },
    (oldData: InvoiceCompaniesListResponse | CompanyWithOutward[] | undefined) => {
      if (!oldData) {
        return oldData;
      }

      if (Array.isArray(oldData)) {
        return updater(oldData);
      }

      if (Array.isArray(oldData.data)) {
        const nextItems = updater(oldData.data);
        const removedCount = oldData.data.length - nextItems.length;

        return {
          ...oldData,
          data: nextItems,
          total: removedCount > 0 ? Math.max((oldData.total ?? nextItems.length) - removedCount, 0) : oldData.total,
          totalPages: Math.max(
            Math.ceil(
              (removedCount > 0
                ? Math.max((oldData.total ?? nextItems.length) - removedCount, 0)
                : oldData.total) / Math.max(oldData.limit ?? 1, 1),
            ),
            1,
          ),
        };
      }

      return oldData;
    },
  );
};

const patchInvoiceInListCaches = (queryClient: QueryClient, invoice: Invoice) => {
  const nextEntry = mapInvoiceToListEntry(invoice);

  updateInvoiceListCaches(queryClient, (items) =>
    items.map((item) => {
      const itemInvoiceId = item.invoice_id || item.id;
      if (itemInvoiceId !== invoice.id) {
        return item;
      }

      return {
        ...item,
        ...nextEntry,
      };
    }),
  );
};

const removeInvoiceFromListCaches = (queryClient: QueryClient, invoiceId: string) => {
  updateInvoiceListCaches(queryClient, (items) =>
    items.filter((item) => (item.invoice_id || item.id) !== invoiceId),
  );
};

const normalizeDraftResponseToInvoice = (
  response: InvoiceDraftResponse,
  payload?: Partial<CreateInvoicePayload>,
): Invoice => {
  const billingDate = payload?.billing_date || response.billing_date || response.date_of_issue || '';
  const issueDate = response.date_of_issue || payload?.date_of_issue || billingDate;
  const legacyOutwardId =
    response.outward_id ??
    payload?.outward_id ??
    response.outward_ids?.[0] ??
    payload?.outward_ids?.[0] ??
    null;
  const legacyOutwardNo =
    response.outward_no ??
    payload?.outward_no ??
    response.outward_nos?.[0] ??
    payload?.outward_nos?.[0] ??
    null;

  return {
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    deleted_at: null,
    archived: false,
    billing_firm_id: payload?.billing_firm_id || '',
    billing_firm_name: payload?.billing_firm_name || '',
    party_id: payload?.party_id || payload?.client_org_id || '',
    billing_date: billingDate,
    invoice_number: response.invoice_number,
    date_of_issue: issueDate,
    order_number: payload?.order_number ?? null,
    order_date: payload?.order_date ?? null,
    from_date: payload?.from_date ?? null,
    to_date: payload?.to_date ?? null,
    invoice_from_date: payload?.from_date ?? null,
    invoice_to_date: payload?.to_date ?? null,
    credit_days: payload?.credit_days ?? 0,
    payment_due_date: response.payment_due_date ?? null,
    payment_date: response.payment_date ?? null,
    payment_mode:
      response.payment_mode === 'NEFT' || response.payment_mode === 'RTGS' ||
      response.payment_mode === 'UPI' || response.payment_mode === 'Cheque' ||
      response.payment_mode === 'Cash' ? response.payment_mode : null,
    payment_reference_no: response.payment_reference_no ?? null,
    payment_remarks: response.payment_remarks ?? null,
    status: 'draft',
    client_org_id: response.client_org_id || payload?.client_org_id || '',
    outward_id: legacyOutwardId,
    outward_ids:
      response.outward_ids ??
      payload?.outward_ids ??
      (legacyOutwardId ? [legacyOutwardId] : []),
    outward_no: legacyOutwardNo,
    outward_nos:
      response.outward_nos ??
      payload?.outward_nos ??
      (legacyOutwardNo == null ? [] : [legacyOutwardNo]),
    gauge_inward_ids: response.gauge_inward_ids ?? payload?.gauge_inward_ids ?? [],
    client_details: {
      name: response.client_details?.name ?? '',
      client_gst_no: response.client_details?.client_gst_no ?? '',
      address: {
        address_line_1: String(response.client_details?.address?.address_line_1 ?? ''),
        address_line_2: String(response.client_details?.address?.address_line_2 ?? ''),
        city: String(response.client_details?.address?.city ?? ''),
        state: String(response.client_details?.address?.state ?? ''),
        zip_code: String(response.client_details?.address?.zip_code ?? ''),
        country: String(response.client_details?.address?.country ?? ''),
      },
    },
    invoice_details: {
      billing_items: (response.invoice_details?.billing_items ?? []).map((item) => ({
        ...item,
        specifications: typeof item.specifications === 'string' ? null : item.specifications,
      })),
      sub_total: response.invoice_details?.sub_total ?? 0,
      packing: response.invoice_details?.packing ?? 0,
      courier: response.invoice_details?.courier ?? 0,
      discount: response.invoice_details?.discount ?? 0,
      cgst: response.invoice_details?.cgst ?? 0,
      sgst: response.invoice_details?.sgst ?? 0,
      grand_total: response.invoice_details?.grand_total ?? 0,
      pdf_columns: response.invoice_details?.pdf_columns ?? payload?.pdf_columns,
    },
    id: response.id,
  };
};

export function useInvoiceCompaniesQuery(options?: {
  enabled?: boolean;
  staleTime?: number;
  page?: number;
  limit?: number;
  statusFilter?: InvoiceStatusFilter;
  search?: string;
  companyName?: string;
  billingMonth?: string;
  billingYear?: string;
}) {
  const page = options?.page ?? 0;
  const limit = options?.limit ?? 10;
  const statusFilter = options?.statusFilter ?? 'all';
  const search = options?.search?.trim() ?? '';
  const companyName = options?.companyName?.trim() ?? '';
  const billingMonth = options?.billingMonth ?? 'all';
  const billingYear = options?.billingYear ?? 'all';

  return useQuery({
    queryKey: queryKeys.invoices.list({ page, limit, statusFilter, search, companyName, billingMonth, billingYear }),
    queryFn: async (): Promise<InvoiceCompaniesListResponse> => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter !== 'all') {
        params.set('status_filter', statusFilter);
      }
      if (search) {
        params.set('search', search);
      }
      if (companyName) {
        params.set('company_name', companyName);
      }
      if (billingMonth !== 'all') {
        params.set('billing_month', billingMonth);
      }
      if (billingYear !== 'all') {
        params.set('billing_year', billingYear);
      }

      const response = await apiClient.getApiResponse<
        CompanyWithOutward[] | RawInvoiceCompaniesListResponse
      >(
        `${API_ENDPOINTS.INVOICES.LIST}?${params.toString()}`
      );

      if (Array.isArray(response)) {
        const items = normalizeInvoiceListEntries(response);

        return {
        data: items,
        total: items.length,
        page,
        limit,
        totalPages: Math.max(Math.ceil(items.length / Math.max(limit, 1)), 1),
        summary: undefined,
      };
      }

      const normalized = response as RawInvoiceCompaniesListResponse;

      const items = normalizeInvoiceListEntries(normalized?.data || []);
      const pagination = normalized?.pagination;
      const resolvedLimit = Number(pagination?.limit ?? normalized?.limit ?? limit) || limit;
      const resolvedTotal = Number(pagination?.total ?? normalized?.total ?? items.length) || items.length;
      const resolvedPage = Number(pagination?.page ?? normalized?.page ?? page) || 0;
      const resolvedTotalPages =
        Number(pagination?.totalPages ?? normalized?.totalPages) ||
        Math.max(Math.ceil(resolvedTotal / Math.max(resolvedLimit, 1)), 1);

      return {
        data: items,
        total: resolvedTotal,
        page: resolvedPage,
        limit: resolvedLimit,
        totalPages: resolvedTotalPages,
        summary: normalized?.summary,
      };
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

export function useInvoiceDraftQuery(
  payload: InvoiceDraftRequest,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const clientOrgId = payload.client_org_id ?? '';
  const outwardId = payload.outward_id ?? '';

  return useQuery({
    queryKey: queryKeys.invoices.draft(clientOrgId, outwardId),
    queryFn: async (): Promise<InvoiceDraftResponse> => {
      const validatedPayload = invoiceDraftRequestSchema.parse(payload);
      const response = await apiClient.postApiResponse<InvoiceDraftResponse>(
        API_ENDPOINTS.INVOICES.CREATE,
        validatedPayload,
      );

      if (response && typeof response === 'object' && 'data' in response) {
        return (response as ApiResponse<InvoiceDraftResponse>).data as InvoiceDraftResponse;
      }

      return response as unknown as InvoiceDraftResponse;
    },
    enabled: (options?.enabled ?? true) && Boolean(clientOrgId && outwardId),
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useInvoiceDetailQuery(invoiceId: string | null, options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId ?? ''),
    queryFn: async (): Promise<Invoice> => {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      const response = await apiClient.getApiResponse<Invoice>(
        `${API_ENDPOINTS.INVOICES.GET}${invoiceId}`,
      );

      return (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);
    },
    enabled: (options?.enabled ?? true) && Boolean(invoiceId),
    staleTime: options?.staleTime ?? 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useCreateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateInvoicePayload): Promise<Invoice> => {
      const validated = createInvoiceHeaderFormSchema.parse({
        billing_firm_id: payload.billing_firm_id,
        billing_firm_name: payload.billing_firm_name,
        party_id: payload.party_id,
        billing_date: payload.billing_date,
        outward_no: payload.outward_no ?? '',
        order_number: payload.order_number ?? '',
        order_date: payload.order_date ?? '',
        from_date: payload.from_date ?? '',
        to_date: payload.to_date ?? '',
        pdf_columns: payload.pdf_columns,
        credit_days: payload.credit_days,
      }) as CreateInvoiceHeaderFormData;
      const {
        pdf_columns: omittedPdfColumns,
        outward_id: omittedOutwardId,
        outward_no: omittedOutwardNo,
        ...apiPayload
      } = payload;
      void omittedPdfColumns;
      void omittedOutwardId;
      void omittedOutwardNo;

      const response = await apiClient.postApiResponse<InvoiceDraftResponse>(
        API_ENDPOINTS.INVOICES.CREATE,
        {
          ...apiPayload,
          billing_firm_id: validated.billing_firm_id,
          billing_firm_name: validated.billing_firm_name,
          party_id: validated.party_id,
          billing_date: validated.billing_date,
          credit_days: validated.credit_days,
        },
      );

      const draft =
        (response as ApiResponse<InvoiceDraftResponse>)?.data ||
        (response as unknown as InvoiceDraftResponse);

      return normalizeDraftResponseToInvoice(draft, payload);
    },
    onSuccess: (invoice) => {
      if (!invoice.id) {
        return;
      }

      queryClient.setQueryData(queryKeys.invoices.detail(invoice.id), invoice);
      patchInvoiceInListCaches(queryClient, invoice);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      useInvoiceStore.getState().seedInvoiceCache(invoice);
    },
  });
}

const mergeInvoiceResponse = (fallback: Invoice, response: ApiResponse<Invoice> | Invoice): Invoice => {
  const updatedInvoice =
    (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);

  return {
    ...fallback,
    ...updatedInvoice,
    status: normalizeInvoiceStatus(updatedInvoice?.status ?? fallback.status),
    client_details: {
      ...fallback.client_details,
      ...updatedInvoice?.client_details,
      address: {
        ...fallback.client_details.address,
        ...updatedInvoice?.client_details?.address,
      },
    },
    invoice_details: {
      ...fallback.invoice_details,
      ...updatedInvoice?.invoice_details,
    },
  };
};

export function useUpdateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: Invoice;
    }): Promise<Invoice> => {
      const response = await apiClient.putApiResponse<Invoice>(
        API_ENDPOINTS.INVOICES.UPDATE(invoiceId),
        data,
      );

      return mergeInvoiceResponse(data, response);
    },
    onSuccess: (invoice, variables) => {
      queryClient.setQueryData(queryKeys.invoices.detail(variables.invoiceId), invoice);
      patchInvoiceInListCaches(queryClient, invoice);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      useInvoiceStore.getState().seedInvoiceCache(invoice);
    },
  });
}

export function useGenerateInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<Invoice> => {
      const response = await apiClient.patchApiResponse<Invoice>(
        API_ENDPOINTS.INVOICES.GENERATE(invoiceId),
      );
      return (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);
    },
    onSuccess: (invoice, invoiceId) => {
      queryClient.setQueryData(queryKeys.invoices.detail(invoiceId), invoice);
      patchInvoiceInListCaches(queryClient, invoice);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      useInvoiceStore.getState().seedInvoiceCache(invoice);
    },
  });
}

export function useMarkInvoicePaidMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: MarkInvoicePaidPayload;
    }): Promise<Invoice> => {
      const response = await apiClient.patchApiResponse<Invoice>(
        API_ENDPOINTS.INVOICES.MARK_PAID(invoiceId),
        data,
      );
      return (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);
    },
    onSuccess: (invoice, variables) => {
      queryClient.setQueryData(queryKeys.invoices.detail(variables.invoiceId), invoice);
      patchInvoiceInListCaches(queryClient, invoice);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      useInvoiceStore.getState().seedInvoiceCache(invoice);
    },
  });
}

export function useCancelInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      remarks,
    }: {
      invoiceId: string;
      remarks?: string | null;
    }): Promise<Invoice> => {
      const response = await apiClient.patchApiResponse<Invoice>(
        API_ENDPOINTS.INVOICES.CANCEL(invoiceId),
        { remarks: remarks || null },
      );
      return (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);
    },
    onSuccess: (invoice, variables) => {
      queryClient.setQueryData(queryKeys.invoices.detail(variables.invoiceId), invoice);
      patchInvoiceInListCaches(queryClient, invoice);
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      useInvoiceStore.getState().seedInvoiceCache(invoice);
    },
  });
}

export function useDeleteInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string): Promise<void> => {
      await apiClient.deleteApiResponse<void>(API_ENDPOINTS.INVOICES.DELETE(invoiceId));
    },
    onSuccess: (_, invoiceId) => {
      removeInvoiceFromListCaches(queryClient, invoiceId);
      queryClient.removeQueries({ queryKey: queryKeys.invoices.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
    },
  });
}
