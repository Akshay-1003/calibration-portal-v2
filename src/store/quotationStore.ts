import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { QuotationDimensionMode } from '../utils/quotationMeasurement';
import {
  calculateQuotationDiscountAmount,
  calculateQuotationFinalPrice,
  calculateQuotationLineSubtotal,
  calculateQuotationTotals as calculateQuotationTaxTotals,
  DEFAULT_QUOTATION_CGST_RATE,
  DEFAULT_QUOTATION_IGST_RATE,
  DEFAULT_QUOTATION_SGST_RATE,
  normalizeQuotationQuantity,
  type QuotationGstType,
} from '../utils/quotationDocumentUtils';

export type QuotationType = 'regular';

// Type definitions
export interface QuotationItem {
  id: string;
  gauge_id: string;
  gauge_name: string;
  gauge_type?: string;
  serial_number?: string;
  make?: string;
  hsn_sac?: string;
  quantity: number;
  dimension_mode?: QuotationDimensionMode;
  range_from?: number;
  range_to?: number;
  basic_size?: string;
  range_size: string;
  specifications?: unknown;
  unit?: string;
  base_price: number;
  discount_type: 'percentage' | 'flat' | null;
  discount_value: number;
  final_price: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  revision_number?: number;
  parent_quotation_id?: string | null;
  root_quotation_id?: string | null;
  revision_date?: string | null;
  revision_reason?: string | null;
  quotation_date: string;
  quotation_type: QuotationType;
  client_org_id?: string;
  billing_firm_id?: string;
  billing_firm_name?: string;
  billing_firm_contact?: string;
  billing_firm_email?: string;
  billing_firm_address?: string;
  billing_firm_gst?: string;
  customer_name: string;
  customer_contact?: string;
  customer_email?: string;
  customer_address?: string;
  customer_gst?: string;
  subject_line?: string;
  intro_note?: string;
  footer_note?: string;
  payment_terms?: string;
  delivery_terms?: string;
  validity_days?: number;
  tax_note?: string;
  gst_type?: QuotationGstType;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  taxable_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  round_off?: number;
  prepared_by?: string;
  terms_conditions?: string[];
  items: QuotationItem[];
  subtotal: number;
  total_discount: number;
  grand_total: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationListItem {
  id: string;
  quotation_number: string;
  revision_number?: number;
  parent_quotation_id?: string | null;
  root_quotation_id?: string | null;
  quotation_date: string;
  client_name: string;
  billing_firm_name: string;
  status: string;
  grand_total: number;
}

interface QuotationStore {
  // Current quotation being created
  currentQuotation: Partial<Quotation> | null;

  // Saved quotations (local storage)
  quotations: Quotation[];

  // Actions
  setCurrentQuotation: (quotation: Partial<Quotation>) => void;
  addItemToQuotation: (
    item: Omit<QuotationItem, 'id' | 'final_price'>,
  ) => string | null;
  duplicateQuotationItem: (itemId: string) => string | null;
  updateQuotationItem: (
    itemId: string,
    updates: Partial<QuotationItem>,
  ) => void;
  removeQuotationItem: (itemId: string) => void;
  calculateQuotationTotals: () => void;
  clearCurrentQuotation: () => void;
  saveQuotation: () => Quotation | null;
  loadQuotations: () => void;
  getQuotationById: (id: string) => Quotation | undefined;
  deleteQuotation: (id: string) => void;
}

// Helper to calculate final price
const calculateFinalPrice = (
  basePrice: number,
  quantity: number,
  discountType: 'percentage' | 'flat' | null,
  discountValue: number,
): number => {
  return calculateQuotationFinalPrice(
    basePrice,
    quantity,
    discountType,
    discountValue,
  );
};

// Generate quotation number
const generateQuotationNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `QT-${year}${month}${day}-${random}`;
};

export const getQuotationDefaults = (): Pick<
  Quotation,
  | 'client_org_id'
  | 'billing_firm_id'
  | 'billing_firm_name'
  | 'billing_firm_contact'
  | 'billing_firm_email'
  | 'billing_firm_address'
  | 'billing_firm_gst'
  | 'quotation_type'
  | 'customer_gst'
  | 'subject_line'
  | 'intro_note'
  | 'footer_note'
  | 'payment_terms'
  | 'delivery_terms'
  | 'validity_days'
  | 'tax_note'
  | 'gst_type'
  | 'cgst_rate'
  | 'sgst_rate'
  | 'igst_rate'
  | 'taxable_amount'
  | 'cgst_amount'
  | 'sgst_amount'
  | 'igst_amount'
  | 'round_off'
  | 'prepared_by'
  | 'terms_conditions'
  | 'status'
> => {
  return {
    client_org_id: '',
    billing_firm_id: '',
    billing_firm_name: '',
    billing_firm_contact: '',
    billing_firm_email: '',
    billing_firm_address: '',
    billing_firm_gst: '',
    quotation_type: 'regular',
    customer_gst: '',
    payment_terms: '',
    delivery_terms: '',
    validity_days: 30,
    tax_note: '',
    gst_type: 'none',
    cgst_rate: DEFAULT_QUOTATION_CGST_RATE,
    sgst_rate: DEFAULT_QUOTATION_SGST_RATE,
    igst_rate: DEFAULT_QUOTATION_IGST_RATE,
    taxable_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    round_off: 0,
    prepared_by: '',
    terms_conditions: [],
    status: 'draft',
    subject_line: '',
    intro_note: '',
    footer_note: '',
  };
};

const createQuotationItem = (
  item: Omit<QuotationItem, 'id' | 'final_price'>,
): QuotationItem => {
  const finalPrice = calculateFinalPrice(
    item.base_price,
    normalizeQuotationQuantity(item.quantity),
    item.discount_type,
    item.discount_value,
  );

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...item,
    final_price: finalPrice,
  };
};

export const useQuotationStore = create<QuotationStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentQuotation: null,
      quotations: [],

      // Initialize: Load from localStorage
      loadQuotations: () => {
        try {
          const stored = localStorage.getItem('quotations');
          if (stored) {
            const parsed = JSON.parse(stored);
            set({ quotations: Array.isArray(parsed) ? parsed : [] });
          }
        } catch (error) {
          console.error('Error loading quotations from localStorage:', error);
          set({ quotations: [] });
        }
      },

      // Set current quotation
      setCurrentQuotation: (quotation) => {
        set((state) => {
          const existingQuotation = state.currentQuotation;
          const defaults = getQuotationDefaults();

          state.currentQuotation = {
            ...defaults,
            ...existingQuotation,
            ...quotation,
            quotation_number:
              quotation.quotation_number ||
              existingQuotation?.quotation_number ||
              generateQuotationNumber(),
            quotation_date:
              quotation.quotation_date ||
              existingQuotation?.quotation_date ||
              new Date().toISOString().split('T')[0],
            quotation_type: 'regular',
            items: quotation.items ?? existingQuotation?.items ?? [],
            client_org_id:
              quotation.client_org_id ??
              existingQuotation?.client_org_id ??
              defaults.client_org_id,
            billing_firm_id:
              quotation.billing_firm_id ??
              existingQuotation?.billing_firm_id ??
              defaults.billing_firm_id,
            billing_firm_name:
              quotation.billing_firm_name ??
              existingQuotation?.billing_firm_name ??
              defaults.billing_firm_name,
            billing_firm_contact:
              quotation.billing_firm_contact ??
              existingQuotation?.billing_firm_contact ??
              defaults.billing_firm_contact,
            billing_firm_email:
              quotation.billing_firm_email ??
              existingQuotation?.billing_firm_email ??
              defaults.billing_firm_email,
            billing_firm_address:
              quotation.billing_firm_address ??
              existingQuotation?.billing_firm_address ??
              defaults.billing_firm_address,
            billing_firm_gst:
              quotation.billing_firm_gst ??
              existingQuotation?.billing_firm_gst ??
              defaults.billing_firm_gst,
            customer_gst:
              quotation.customer_gst ??
              existingQuotation?.customer_gst ??
              defaults.customer_gst,
            subject_line:
              quotation.subject_line ??
              existingQuotation?.subject_line ??
              defaults.subject_line,
            intro_note:
              quotation.intro_note ??
              existingQuotation?.intro_note ??
              defaults.intro_note,
            footer_note:
              quotation.footer_note ??
              existingQuotation?.footer_note ??
              defaults.footer_note,
            payment_terms:
              quotation.payment_terms ??
              existingQuotation?.payment_terms ??
              defaults.payment_terms,
            delivery_terms:
              quotation.delivery_terms ??
              existingQuotation?.delivery_terms ??
              defaults.delivery_terms,
            validity_days:
              quotation.validity_days ??
              existingQuotation?.validity_days ??
              defaults.validity_days,
            tax_note:
              quotation.tax_note ??
              existingQuotation?.tax_note ??
              defaults.tax_note,
            gst_type:
              quotation.gst_type ??
              existingQuotation?.gst_type ??
              defaults.gst_type,
            cgst_rate:
              quotation.cgst_rate ??
              existingQuotation?.cgst_rate ??
              defaults.cgst_rate,
            sgst_rate:
              quotation.sgst_rate ??
              existingQuotation?.sgst_rate ??
              defaults.sgst_rate,
            igst_rate:
              quotation.igst_rate ??
              existingQuotation?.igst_rate ??
              defaults.igst_rate,
            taxable_amount:
              quotation.taxable_amount ??
              existingQuotation?.taxable_amount ??
              defaults.taxable_amount,
            cgst_amount:
              quotation.cgst_amount ??
              existingQuotation?.cgst_amount ??
              defaults.cgst_amount,
            sgst_amount:
              quotation.sgst_amount ??
              existingQuotation?.sgst_amount ??
              defaults.sgst_amount,
            igst_amount:
              quotation.igst_amount ??
              existingQuotation?.igst_amount ??
              defaults.igst_amount,
            round_off:
              quotation.round_off ??
              existingQuotation?.round_off ??
              defaults.round_off,
            prepared_by:
              quotation.prepared_by ??
              existingQuotation?.prepared_by ??
              defaults.prepared_by,
            terms_conditions:
              quotation.terms_conditions ??
              existingQuotation?.terms_conditions ??
              defaults.terms_conditions,
            status:
              quotation.status ?? existingQuotation?.status ?? defaults.status,
          };
        });
        get().calculateQuotationTotals();
      },

      // Add item to quotation
      addItemToQuotation: (item) => {
        let createdItemId: string | null = null;

        set((state) => {
          if (!state.currentQuotation) {
            const defaults = getQuotationDefaults();
            state.currentQuotation = {
              quotation_number: generateQuotationNumber(),
              quotation_date: new Date().toISOString().split('T')[0],
              ...defaults,
              items: [],
            };
          }

          const newItem = createQuotationItem(item);
          createdItemId = newItem.id;

          state.currentQuotation.items = [
            ...(state.currentQuotation.items || []),
            newItem,
          ];
        });
        get().calculateQuotationTotals();
        return createdItemId;
      },

      duplicateQuotationItem: (itemId) => {
        let duplicatedItemId: string | null = null;

        set((state) => {
          const sourceItem = state.currentQuotation?.items?.find(
            (item) => item.id === itemId,
          );
          if (!sourceItem || !state.currentQuotation) {
            return;
          }

          const duplicatedItem = createQuotationItem({
            gauge_id: sourceItem.gauge_id,
            gauge_name: sourceItem.gauge_name,
            gauge_type: sourceItem.gauge_type,
            serial_number: sourceItem.serial_number,
            make: sourceItem.make,
            dimension_mode: sourceItem.dimension_mode,
            range_from: sourceItem.range_from,
            range_to: sourceItem.range_to,
            basic_size: sourceItem.basic_size,
            range_size: sourceItem.range_size,
            hsn_sac: sourceItem.hsn_sac,
            quantity: sourceItem.quantity,
            specifications: sourceItem.specifications,
            unit: sourceItem.unit,
            base_price: sourceItem.base_price,
            discount_type: sourceItem.discount_type,
            discount_value: sourceItem.discount_value,
          });

          duplicatedItemId = duplicatedItem.id;
          state.currentQuotation.items = [
            ...(state.currentQuotation.items || []),
            duplicatedItem,
          ];
        });

        get().calculateQuotationTotals();
        return duplicatedItemId;
      },

      // Update quotation item
      updateQuotationItem: (itemId, updates) => {
        set((state) => {
          if (!state.currentQuotation?.items) return;

          const itemIndex = state.currentQuotation.items.findIndex(
            (item) => item.id === itemId,
          );

          if (itemIndex === -1) return;

          const updatedItem = {
            ...state.currentQuotation.items[itemIndex],
            ...updates,
          };

          // Recalculate final price if price or discount changed
          if (
            updates.base_price !== undefined ||
            updates.quantity !== undefined ||
            updates.discount_type !== undefined ||
            updates.discount_value !== undefined
          ) {
            updatedItem.final_price = calculateFinalPrice(
              updatedItem.base_price,
              normalizeQuotationQuantity(updatedItem.quantity),
              updatedItem.discount_type,
              updatedItem.discount_value,
            );
          }

          state.currentQuotation.items[itemIndex] = updatedItem;
        });
        get().calculateQuotationTotals();
      },

      // Remove quotation item
      removeQuotationItem: (itemId) => {
        set((state) => {
          if (!state.currentQuotation?.items) return;

          state.currentQuotation.items = state.currentQuotation.items.filter(
            (item) => item.id !== itemId,
          );
        });
        get().calculateQuotationTotals();
      },

      // Calculate totals
      calculateQuotationTotals: () => {
        set((state) => {
          if (!state.currentQuotation?.items) return;

          const subtotal = state.currentQuotation.items.reduce(
            (sum, item) =>
              sum +
              calculateQuotationLineSubtotal(item.base_price, item.quantity),
            0,
          );

          const totalDiscount = state.currentQuotation.items.reduce(
            (sum, item) => {
              return (
                sum +
                calculateQuotationDiscountAmount(
                  item.base_price,
                  item.quantity,
                  item.discount_type,
                  item.discount_value,
                )
              );
            },
            0,
          );

          const totals = calculateQuotationTaxTotals({
            subtotal,
            totalDiscount,
            gstType: state.currentQuotation.gst_type,
            cgstRate: state.currentQuotation.cgst_rate,
            sgstRate: state.currentQuotation.sgst_rate,
            igstRate: state.currentQuotation.igst_rate,
          });

          state.currentQuotation.subtotal = subtotal;
          state.currentQuotation.total_discount = totalDiscount;
          state.currentQuotation.taxable_amount = totals.taxableAmount;
          state.currentQuotation.gst_type = totals.gstType;
          state.currentQuotation.cgst_rate = totals.cgstRate;
          state.currentQuotation.sgst_rate = totals.sgstRate;
          state.currentQuotation.igst_rate = totals.igstRate;
          state.currentQuotation.cgst_amount = totals.cgstAmount;
          state.currentQuotation.sgst_amount = totals.sgstAmount;
          state.currentQuotation.igst_amount = totals.igstAmount;
          state.currentQuotation.round_off = totals.roundOff;
          state.currentQuotation.grand_total = totals.grandTotal;
        });
      },

      // Clear current quotation
      clearCurrentQuotation: () => {
        set({ currentQuotation: null });
      },

      // Save quotation
      saveQuotation: () => {
        const state = get();
        if (!state.currentQuotation || !state.currentQuotation.customer_name) {
          return null;
        }

        if (
          !state.currentQuotation.items ||
          state.currentQuotation.items.length === 0
        ) {
          return null;
        }

        const quotation: Quotation = {
          id: `quotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          quotation_number:
            state.currentQuotation.quotation_number ||
            generateQuotationNumber(),
          quotation_date:
            state.currentQuotation.quotation_date ||
            new Date().toISOString().split('T')[0],
          quotation_type: 'regular',
          client_org_id: state.currentQuotation.client_org_id,
          billing_firm_id: state.currentQuotation.billing_firm_id,
          billing_firm_name: state.currentQuotation.billing_firm_name,
          billing_firm_contact: state.currentQuotation.billing_firm_contact,
          billing_firm_email: state.currentQuotation.billing_firm_email,
          billing_firm_address: state.currentQuotation.billing_firm_address,
          billing_firm_gst: state.currentQuotation.billing_firm_gst,
          customer_name: state.currentQuotation.customer_name,
          customer_contact: state.currentQuotation.customer_contact,
          customer_email: state.currentQuotation.customer_email,
          customer_address: state.currentQuotation.customer_address,
          customer_gst: state.currentQuotation.customer_gst,
          subject_line: state.currentQuotation.subject_line,
          intro_note: state.currentQuotation.intro_note,
          footer_note: state.currentQuotation.footer_note,
          payment_terms: state.currentQuotation.payment_terms,
          delivery_terms: state.currentQuotation.delivery_terms,
          validity_days: state.currentQuotation.validity_days,
          tax_note: state.currentQuotation.tax_note,
          gst_type: state.currentQuotation.gst_type,
          cgst_rate: state.currentQuotation.cgst_rate,
          sgst_rate: state.currentQuotation.sgst_rate,
          igst_rate: state.currentQuotation.igst_rate,
          taxable_amount: state.currentQuotation.taxable_amount || 0,
          cgst_amount: state.currentQuotation.cgst_amount || 0,
          sgst_amount: state.currentQuotation.sgst_amount || 0,
          igst_amount: state.currentQuotation.igst_amount || 0,
          round_off: state.currentQuotation.round_off || 0,
          prepared_by: state.currentQuotation.prepared_by,
          terms_conditions: state.currentQuotation.terms_conditions || [],
          items: state.currentQuotation.items || [],
          subtotal: state.currentQuotation.subtotal || 0,
          total_discount: state.currentQuotation.total_discount || 0,
          grand_total: state.currentQuotation.grand_total || 0,
          status: state.currentQuotation.status || 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => {
          state.quotations = [quotation, ...state.quotations];
        });

        // Save to localStorage
        try {
          const updated = get().quotations;
          localStorage.setItem('quotations', JSON.stringify(updated));
        } catch (error) {
          console.error('Error saving quotation to localStorage:', error);
        }

        // Clear current quotation
        get().clearCurrentQuotation();

        return quotation;
      },

      // Get quotation by ID
      getQuotationById: (id) => {
        const state = get();
        return state.quotations.find((q) => q.id === id);
      },

      // Delete quotation
      deleteQuotation: (id) => {
        set((state) => {
          state.quotations = state.quotations.filter((q) => q.id !== id);
        });

        // Update localStorage
        try {
          const updated = get().quotations;
          localStorage.setItem('quotations', JSON.stringify(updated));
        } catch (error) {
          console.error('Error updating quotations in localStorage:', error);
        }
      },
    })),
    { name: 'QuotationStore' },
  ),
);

// Initialize: Load quotations on store creation (only in browser)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure store is fully initialized
  setTimeout(() => {
    useQuotationStore.getState().loadQuotations();
  }, 0);
}
