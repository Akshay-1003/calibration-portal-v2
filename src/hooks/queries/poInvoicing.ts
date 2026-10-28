import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ApiResponse } from '../../services/api';
import type { Invoice, InvoiceBillingItem } from '../../types/types';
import type { CreateInvoicePayload } from './invoices';

export interface CustomerPo {
  id: string;
  po_number: string;
  po_date: string;
  status: 'active' | 'closed';
  lines: Array<{ id: string; price_list_item_id: string; description: string }>;
}
export interface PoAssignment { source_key: string; po_id: string; price_list_item_id: string }
export interface PoOption extends Omit<PoAssignment, 'source_key'> { po_number: string; po_line_id: string; label: string }
export interface PoAllocationIssue { source_key: string; label: string; source: string | null; reason: string; options: PoOption[] }
export interface PoAllocationRow {
  source_key: string;
  source_keys: string[];
  status: 'allocated' | 'unresolved' | 'excluded' | 'reserved' | 'invoiced';
  item: InvoiceBillingItem;
  options: PoOption[];
  allocation: PoOption | null;
  owner: { invoice_id: string; invoice_number: string; po_number?: string; status: string } | null;
}
export type PoBatchRequest = Partial<CreateInvoicePayload> & {
  client_org_id: string;
  billing_firm_id: string;
  billing_date: string;
  outward_ids: string[];
  repair_ids: string[];
  assignments?: PoAssignment[];
  excluded_source_keys?: string[];
};
export interface PoBatch {
  id: string;
  client_org_id: string;
  billing_firm_id: string;
  groups: Array<{ po_id: string; po_number: string; expected_count: number; error: string | null; invoice: Invoice | null }>;
  summary: Record<'selected' | 'draft' | 'invoiced' | 'elsewhere' | 'pending', number>;
  rows: PoAllocationRow[];
}
function unwrap<T>(response: ApiResponse<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) return (response as ApiResponse<T>).data;
  return response as T;
}
export function useCustomerPos(customerId?: string) {
  return useQuery({ queryKey: ['customer-pos', customerId], enabled: Boolean(customerId),
    refetchOnMount: 'always', refetchOnWindowFocus: true,
    queryFn: async () => unwrap(await apiClient.getApiResponse<{ items: CustomerPo[] }>(`/customers/${customerId}/purchase-orders`)) });
}
export function useSaveCustomerPo(customerId: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (data: { id?: string; po_number: string; po_date: string; status: 'active' | 'closed'; price_list_item_ids: string[] }) => {
    const { id, ...body } = data;
    return id ? unwrap(await apiClient.putApiResponse<CustomerPo>(`/customers/${customerId}/purchase-orders/${id}`, body))
      : unwrap(await apiClient.postApiResponse<CustomerPo>(`/customers/${customerId}/purchase-orders`, body));
  }, onSuccess: () => client.invalidateQueries({ queryKey: ['customer-pos', customerId] }) });
}
export function useCreatePoBatch() {
  const client = useQueryClient();
  return useMutation({ mutationFn: async (request: PoBatchRequest & { request_id: string }) => unwrap(await apiClient.postApiResponse<PoBatch>('/invoice/batches', request)),
    onSuccess: () => client.invalidateQueries() });
}
export function usePoBatch(batchId: string) {
  return useQuery({ queryKey: ['po-batch', batchId], enabled: Boolean(batchId),
    queryFn: async () => unwrap(await apiClient.getApiResponse<PoBatch>(`/invoice/batches/${batchId}`)) });
}
export async function retryPoBatch(batchId: string) {
  return unwrap(await apiClient.postApiResponse<PoBatch>(`/invoice/batches/${batchId}/retry`, {}));
}
export async function addPoInvoiceItem(invoiceId: string, assignment: PoAssignment, revision: number) {
  return unwrap(await apiClient.postApiResponse<Invoice>(`/invoice/${invoiceId}/po-items`, { assignment, revision }));
}

export interface OutwardBillingAvailability {
  total: number; available: number; reserved: number; invoiced: number;
  items: Array<{ gauge_inward_id: string; label: string; status: string; invoice: PoAllocationRow['owner'] }>;
}
export function useBillingAvailability(customerId?: string) {
  return useQuery({ queryKey: ['billing-availability', customerId], enabled: Boolean(customerId),
    queryFn: async () => unwrap(await apiClient.getApiResponse<{ outwards: Record<string, OutwardBillingAvailability> }>(`/customers/${customerId}/billing-availability`)) });
}
