import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { apiClient, ApiResponse } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'sonner';
import { OutwardGaugeItem } from './outwardStore';
import {
  invoiceDraftRequestSchema,
  type InvoiceDraftRequest,
} from '../lib/validations/invoiceSchemas';
import { Invoice } from '../types/types';
import type { InvoicePdfColumnVisibility } from '../utils/invoicePdfColumns';
import { StoreCache, InFlightManager, createCacheKey } from '../utils/storeCache';

// Create cache instances for invoice store
const invoiceCache = new StoreCache<Invoice>({ ttl: 10 * 60 * 1000 }); // 10 minutes cache
const invoiceInFlight = new InFlightManager();

// Type definitions
export interface CompanyWithOutward {
  company_id: string;
  company_name: string;
  outward_count: number;
  total_amount?: number;
  grand_total?: number;
  invoice_details?: {
    grand_total?: number | string | null;
    sub_total?: number | string | null;
  };
  status?: 'draft' | 'generated' | 'cancelled' | 'paid' | 'finalized' | 'sent' | 'canceled' | string;
  display_status?: string;
  billing_date?: string;
  credit_days?: number;
  payment_due_date?: string | null;
  payment_date?: string | null;
  payment_mode?: string | null;
  payment_reference_no?: string | null;
  payment_remarks?: string | null;
  // Invoice fields (when API returns invoice data)
  invoice_id?: string;
  invoice_number?: string;
  date_of_issue?: string;
  outward_id?: string | null;
  outward_ids?: string[];
  outward_nos?: Array<string | number>;
  client_org?: string;
  id?: string; // Invoice ID alias
}

// Legacy Invoice interface - kept for backward compatibility
// Use Invoice from types/types.ts for new code
export interface LegacyInvoice {
  id: string;
  invoice_no: string;
  billing_date: string;
  company_id: string;
  company_name: string;
  outward_items: OutwardGaugeItem[];
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface InvoiceItemPayload {
  outward_gauge_item_id: string;
  hsn_code: string;
  rate: number;
  quantity: number;
  gauge_name?: string;
  identification_number?: string;
  dc_no?: string;
  specification?: string;
}

export interface CreateInvoiceData {
  outward_id: string;
  outward_ids?: string[];
  outward_nos?: Array<string | number>;
  company_id: string;
  billing_date: string;
  items: InvoiceItemPayload[];
  notes?: string;
}

export interface InvoiceBillingComponent {
  process: string;
  quantity: number;
  rate: number;
  amount: number;
  service_type?: string;
  line_type?: 'calibration' | 'repair' | 'spare_part' | 'custom';
  description?: string;
  hsn_sac?: string;
  tax_category?: string;
  tax_rate?: number;
  discount_type?: 'none' | 'percentage' | 'flat';
  discount_value?: number;
  discount_amount?: number;
  net_amount?: number;
}

export interface InvoiceBillingItem {
  gauge_id: string;
  inward_id: string;
  client_dc_no: string | null;
  client_dc_date: string | null;
  inward_date: string | null;
  master_gauge_id: string;
  master_gauge_name: string;
  identification_number: string;
  inward_gauge_lab_id: string;
  specifications: Record<string, unknown> | string | null;
  billing_components: InvoiceBillingComponent[];
  total: number;
  instrument_quantity?: number;
}

export interface InvoiceDraftDetails {
  sub_total: number;
  billing_items: InvoiceBillingItem[];
  packing?: number;
  courier?: number;
  cgst?: number;
  sgst?: number;
  grand_total?: number;
  pdf_columns?: Partial<InvoicePdfColumnVisibility>;
}

export interface InvoiceDraftResponse {
  invoice_number: string;
  date_of_issue: string;
  billing_date: string;
  client_org_id: string;
  outward_id: string | null;
  outward_ids?: string[];
  outward_no: string | number; // Can be string or number from API, but we convert to string
  outward_nos?: Array<string | number>;
  id: string;
  credit_days?: number;
  payment_due_date?: string | null;
  payment_date?: string | null;
  payment_mode?: string | null;
  payment_reference_no?: string | null;
  payment_remarks?: string | null;
  gauge_inward_ids?: string[] | null;
  client_details: {
    name: string;
    client_gst_no?: string;
    address?: Record<string, unknown>;
  };
  invoice_details: InvoiceDraftDetails;
}

interface InvoiceStore {
  // Companies with outward entries
  companies: CompanyWithOutward[];
  loadingCompanies: boolean;
  errorCompanies: string | null;

  // Outward items for a specific company
  outwardItems: OutwardGaugeItem[];
  loadingOutwardItems: boolean;
  errorOutwardItems: string | null;

  // Invoices - using Invoice type from types/types.ts
  invoices: Invoice[];
  loadingInvoices: boolean;
  errorInvoices: string | null;

  // Current invoice - using Invoice type from types/types.ts
  currentInvoice: Invoice | null;
  loadingCurrentInvoice: boolean;
  errorCurrentInvoice: string | null;
  invoiceDraft: InvoiceDraftResponse | null;
  loadingInvoiceDraft: boolean;
  errorInvoiceDraft: string | null;

  // Create invoice
  creatingInvoice: boolean;

  // Cache instances
  _cache: StoreCache<Invoice>;
  _inFlight: InFlightManager;

  // Actions
  fetchCompaniesWithOutward: () => Promise<void>;
  fetchOutwardItemsByCompany: (companyId: string) => Promise<void>;
  fetchInvoices: () => Promise<void>;
  fetchInvoice: (invoiceId: string, useCache?: boolean) => Promise<Invoice | null>;
  getCachedInvoice: (invoiceId: string) => Invoice | null;
  createInvoice: (data: CreateInvoiceData) => Promise<Invoice>;
  updateInvoice: (invoiceId: string, data: Invoice) => Promise<Invoice>;
  fetchInvoiceDraft: (payload: InvoiceDraftRequest) => Promise<InvoiceDraftResponse>;
  seedInvoiceCache: (invoice: Invoice) => void;
  resetOutwardItems: () => void;
  resetStore: () => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  devtools(
    immer((set) => ({
      // Initial state
      companies: [],
      loadingCompanies: false,
      errorCompanies: null,

      outwardItems: [],
      loadingOutwardItems: false,
      errorOutwardItems: null,

      // Cache instances
      _cache: invoiceCache,
      _inFlight: invoiceInFlight,

      invoices: [],
      loadingInvoices: false,
      errorInvoices: null,

      currentInvoice: null,
      loadingCurrentInvoice: false,
      errorCurrentInvoice: null,
      invoiceDraft: null,
      loadingInvoiceDraft: false,
      errorInvoiceDraft: null,

      creatingInvoice: false,
      // Fetch companies with outward entries
      fetchCompaniesWithOutward: async () => {
        set((state) => {
          state.loadingCompanies = true;
          state.errorCompanies = null;
        });
        try {
          const response = await apiClient.getApiResponse<CompanyWithOutward[]>(
            API_ENDPOINTS.INVOICES.LIST
          );

          const data = Array.isArray(response)
            ? response
            : (response as ApiResponse<CompanyWithOutward[]>)?.data || [];

          set((state) => {
            state.companies = data;
          });
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to fetch companies with outward entries';

          set((state) => {
            state.errorCompanies = errorMessage;
            state.companies = [];
          });

          toast.error(errorMessage);
        } finally {
          set((state) => {
            state.loadingCompanies = false;
          });
        }
      },

      // Fetch outward items by company
      fetchOutwardItemsByCompany: async (companyId: string) => {
        set((state) => {
          state.loadingOutwardItems = true;
          state.errorOutwardItems = null;
        });

        try {
          const response = await apiClient.getApiResponse<OutwardGaugeItem[]>(
            API_ENDPOINTS.INVOICES.OUTWARD_ITEMS_BY_COMPANY(companyId)
          );

          const data = Array.isArray(response)
            ? response
            : (response as ApiResponse<OutwardGaugeItem[]>)?.data || [];

          set((state) => {
            state.outwardItems = data;
          });
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to fetch outward items';

          set((state) => {
            state.errorOutwardItems = errorMessage;
            state.outwardItems = [];
          });

          toast.error(errorMessage);
        } finally {
          set((state) => {
            state.loadingOutwardItems = false;
          });
        }
      },

      // Fetch all invoices
      fetchInvoices: async () => {
        set((state) => {
          state.loadingInvoices = true;
          state.errorInvoices = null;
        });

        try {
          const response = await apiClient.getApiResponse<Invoice[]>(
            API_ENDPOINTS.INVOICES.LIST
          );

          const data = Array.isArray(response)
            ? response
            : (response as ApiResponse<Invoice[]>)?.data || [];

          set((state) => {
            // Map to Invoice type from types/types.ts
            state.invoices = data as Invoice[];
          });
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to fetch invoices';

          set((state) => {
            state.errorInvoices = errorMessage;
            state.invoices = [];
          });

          toast.error(errorMessage);
        } finally {
          set((state) => {
            state.loadingInvoices = false;
          });
        }
      },

      // Get cached invoice
      getCachedInvoice: (invoiceId: string) => {
        const cacheKey = createCacheKey('invoice', invoiceId);
        return invoiceCache.get(cacheKey) || null;
      },

      // Fetch single invoice - returns Invoice type from types/types.ts
      // Uses cache by default, set useCache=false to force fetch
      fetchInvoice: async (invoiceId: string, useCache: boolean = true) => {
        const cacheKey = createCacheKey('invoice', invoiceId);

        // Check cache first if enabled
        if (useCache) {
          const cached = invoiceCache.get(cacheKey);
          if (cached) {
            // Ensure state is updated synchronously for cached data
            set((state) => {
              state.currentInvoice = cached;
              state.loadingCurrentInvoice = false;
              state.errorCurrentInvoice = null;
            });
            return cached;
          }
        }

        // Use in-flight manager to prevent duplicate requests
        const result = await invoiceInFlight.getOrCreate(cacheKey, async () => {
          set((state) => {
            state.loadingCurrentInvoice = true;
            state.errorCurrentInvoice = null;
          });

          try {
            const response = await apiClient.getApiResponse<Invoice>(
              `${API_ENDPOINTS.INVOICES.GET}${invoiceId}`
            );

            // Extract data from response - handle both wrapped and direct responses
            const data = (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);
            if (!data) {
              throw new Error('No invoice data received from API');
            }

            // Cache the invoice
            invoiceCache.set(cacheKey, data);

            // Update state synchronously
            set((state) => {
              state.currentInvoice = data;
              state.loadingCurrentInvoice = false;
              state.errorCurrentInvoice = null;
            });

            return data;
          } catch (err) {
            const errorMessage = err instanceof Error
              ? err.message
              : 'Failed to fetch invoice';

            set((state) => {
              state.errorCurrentInvoice = errorMessage;
              state.currentInvoice = null;
              state.loadingCurrentInvoice = false;
            });

            toast.error(errorMessage);
            throw err; // Re-throw to let caller handle
          }
        });

        return result;
      },

      // Create invoice (legacy - kept for backward compatibility)
      createInvoice: async (data: CreateInvoiceData): Promise<Invoice> => {
        set((state) => {
          state.creatingInvoice = true;
        });
        
        try {
          // Use POST to create invoice, then return the created invoice
          const response = await apiClient.postApiResponse<Invoice>(
            API_ENDPOINTS.INVOICES.CREATE,
            data
          );

          const invoice = (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);

          // Add to invoices list
          set((state) => {
            state.invoices.unshift(invoice);
          });

          toast.success('Invoice created successfully!');

          return invoice;
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to create invoice';

          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.creatingInvoice = false;
          });
        }
      },

      // Update invoice (PATCH request) - accepts InvoiceUpdatePayload, returns Invoice
      updateInvoice: async (invoiceId: string, data: Invoice): Promise<Invoice> => {
        set((state) => {
          state.creatingInvoice = true;
        });
        
        try {
          const response = await apiClient.putApiResponse<Invoice>(
            API_ENDPOINTS.INVOICES.UPDATE(invoiceId),
            data
          );

          // Extract data from response - handle both wrapped and direct responses
          const invoice = (response as ApiResponse<Invoice>)?.data || (response as unknown as Invoice);

          // Cache the updated invoice
          const cacheKey = createCacheKey('invoice', invoiceId);
          invoiceCache.set(cacheKey, invoice);

          // Update in invoices list if exists
          set((state) => {
            const index = state.invoices.findIndex((inv) => inv.id === invoiceId);
            if (index !== -1) {
              state.invoices[index] = invoice;
            } else {
              state.invoices.unshift(invoice);
            }
            state.currentInvoice = invoice;
          });

          toast.success('Invoice updated successfully!');

          return invoice;
        } catch (err) {
          const errorMessage = err instanceof Error
            ? err.message
            : 'Failed to update invoice';

          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.creatingInvoice = false;
          });
        }
      },

      fetchInvoiceDraft: async (payload: InvoiceDraftRequest): Promise<InvoiceDraftResponse> => {
        set((state) => {
          state.loadingInvoiceDraft = true;
          state.errorInvoiceDraft = null;
        });
        try {
          const validatedPayload = invoiceDraftRequestSchema.parse(payload);
          const response = await apiClient.postApiResponse<InvoiceDraftResponse>(
            API_ENDPOINTS.INVOICES.CREATE,
            validatedPayload,
          );
          // Extract data from response - handle both wrapped and direct responses
          let draft: InvoiceDraftResponse;
          if (response && typeof response === 'object' && 'data' in response) {
            draft = (response as ApiResponse<InvoiceDraftResponse>).data as InvoiceDraftResponse;
          } else {
            draft = response as unknown as InvoiceDraftResponse;
          }

          set((state) => {
            state.invoiceDraft = draft;
          });

          return draft;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch invoice draft';

          set((state) => {
            state.errorInvoiceDraft = errorMessage;
            state.invoiceDraft = null;
          });

          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.loadingInvoiceDraft = false;
          });
        }
      },

      seedInvoiceCache: (invoice: Invoice) => {
        if (!invoice.id) {
          return;
        }

        const cacheKey = createCacheKey('invoice', invoice.id);
        invoiceCache.set(cacheKey, invoice);

        set((state) => {
          const index = state.invoices.findIndex((entry) => entry.id === invoice.id);
          if (index !== -1) {
            state.invoices[index] = invoice;
          } else {
            state.invoices.unshift(invoice);
          }
          state.currentInvoice = invoice;
          state.errorCurrentInvoice = null;
        });
      },

      // Reset outward items
      resetOutwardItems: () => {
        set((state) => {
          state.outwardItems = [];
          state.errorOutwardItems = null;
        });
      },

      // Reset store
      resetStore: () => {
        set((state) => {
          state.companies = [];
          state.outwardItems = [];
          state.invoices = [];
          state.currentInvoice = null;
          state.invoiceDraft = null;
          state.loadingCompanies = false;
          state.loadingOutwardItems = false;
          state.loadingInvoices = false;
          state.loadingCurrentInvoice = false;
          state.loadingInvoiceDraft = false;
          state.creatingInvoice = false;
          state.errorCompanies = null;
          state.errorOutwardItems = null;
          state.errorInvoices = null;
          state.errorCurrentInvoice = null;
          state.errorInvoiceDraft = null;
        });
      },
    })),
    { name: 'InvoiceStore' }
  )
);
