import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../../components/ui/button';
import { Dropdown, Input, ListBox, Pagination, Select, Table, Button as HeroUIButton } from '@heroui/react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { OutwardGaugeItem } from '../../../../store/outwardStore';
import { useInvoiceStore } from '../../../../store/invoiceStore';
// InvoiceItemDataLocal is defined locally, no need to import
import { TablePageWrapper } from '../../../../components/layout/TablePageWrapper';
import { format } from 'date-fns';
import { type InvoiceDetails, type ClientDetails, Invoice } from '../../../../types/types';
import { InvoiceFormData, invoiceFormSchema } from '../../../../lib/validations/invoiceSchemas';
// HSN Codes with names
const HSN_CODES = [
  { code: '998346', name: 'Calibration' },
  { code: '998729', name: 'Repair' },
  { code: '90173010', name: 'New Gauges' },
  // { code: '998349', name: 'Verification Services' },
];

const DEFAULT_HSN = '998346'; // Calibration HSN


interface InvoiceItemHSN {
  id: string;
  hsnCode: string;
  hsnName: string;
  rate: string;
  quantity: number;
}

// Helper function to format specifications object to string
const formatSpecifications = (specs: unknown): string => {
  if (!specs) return '-';
  if (typeof specs === 'string') return specs;
  if (typeof specs !== 'object') return String(specs);

  const specObj = specs as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof specObj.standard_specification === 'string') {
    return specObj.standard_specification;
  }

  // Handle simple key-value pairs
  if (specObj.basic_size) {
    parts.push(`${specObj.basic_size}`);
  }

  // Handle range specifications
  if (specObj.from !== undefined && specObj.to !== undefined) {
    parts.push(`${specObj.from} - ${specObj.to}`);
  }


  // Handle go/no-go specifications
  if (specObj.go) {
    const go = specObj.go as Record<string, unknown>;
    if (go.basic_size !== undefined) {
      parts.push(`${go.basic_size}`);
    }
  }
  if (specObj.no_go) {
    const noGo = specObj.no_go as Record<string, unknown>;
    if (noGo.basic_size !== undefined) {
      parts.push(`${noGo.basic_size}`);
    }
  }

  if (typeof specObj.legacy_value === 'string' && specObj.legacy_value.trim()) {
    return specObj.legacy_value;
  }

  // If we have parts, join them
  if (parts.length > 0) {
    return parts.join(', ');
  }

  // Fallback: try to stringify the object in a readable way
  try {
    return JSON.stringify(specObj, null, 2).replace(/[{}"]/g, '').trim();
  } catch {
    return '-';
  }
};

interface InvoiceItemDataLocal {
  gaugeItem: OutwardGaugeItem;
  hsnEntries: InvoiceItemHSN[];
}


interface OutwardInvoiceEditorProps {
  invoiceId: string;
  outwardId?: string;
  outwardNo?: string;
  backRoute: string;
  embedded?: boolean;
  onBack?: () => void;
}

// Draft persistence types
const DRAFT_VERSION = '1.0.0';
const DRAFT_DEBOUNCE_MS = 500; // 400-600ms range, using 500ms

// Minimal draft structure - only store user input, not full API objects
interface MinimalHSNEntry {
  id: string;
  hsnCode: string;
  rate: string;
  quantity: number;
}

interface MinimalInvoiceItem {
  gaugeId: string; // Only store ID to match with API data
  hsnEntries: MinimalHSNEntry[];
}

interface InvoiceDraft {
  version: string;
  invoiceId: string;
  timestamp: number;
  formData: InvoiceFormData;
  invoiceItems: MinimalInvoiceItem[]; // Minimal data only
}

// Draft storage utilities
const getDraftKey = (invoiceId: string): string => `invoice:draft:${invoiceId}`;

// Convert full invoice items to minimal draft format
const toMinimalDraft = (invoiceItemsData: InvoiceItemDataLocal[]): MinimalInvoiceItem[] => {
  return invoiceItemsData.map((item) => ({
    gaugeId: item.gaugeItem.gauge_id || item.gaugeItem.id || '',
    hsnEntries: item.hsnEntries.map((entry) => ({
      id: entry.id,
      hsnCode: entry.hsnCode,
      rate: entry.rate,
      quantity: entry.quantity,
    })),
  }));
};

// Convert minimal draft back to full format (requires API data for gaugeItem)
const fromMinimalDraft = (
  minimalItems: MinimalInvoiceItem[],
  apiBillingItems: any[]
): InvoiceItemDataLocal[] => {
  if (!minimalItems || minimalItems.length === 0) {
    console.warn('fromMinimalDraft: minimalItems is empty');
    return [];
  }

  if (!apiBillingItems || apiBillingItems.length === 0) {
    // If no API data yet, return empty array (will be reconstructed when API loads)
    console.warn('fromMinimalDraft: apiBillingItems is empty, cannot reconstruct');
    return [];
  }

  return minimalItems.map((minimalItem) => {
    // Find matching API item by gauge_id, inward_gauge_lab_id, or inward_id
    const apiItem = apiBillingItems.find(
      (item: any) =>
        item.gauge_id === minimalItem.gaugeId ||
        item.inward_gauge_lab_id === minimalItem.gaugeId ||
        item.inward_id === minimalItem.gaugeId
    );

    if (!apiItem) {
      // Fallback if API item not found
      return {
        gaugeItem: {
          id: minimalItem.gaugeId,
          gauge_id: minimalItem.gaugeId,
        } as OutwardGaugeItem,
        hsnEntries: minimalItem.hsnEntries.map((entry) => ({
          id: entry.id,
          hsnCode: entry.hsnCode,
          hsnName: HSN_CODES.find((h) => h.code === entry.hsnCode)?.name || 'Calibration Services',
          rate: entry.rate,
          quantity: entry.quantity,
        })),
      };
    }

    // Format specifications
    const formattedSpecs = formatSpecifications(apiItem.specifications);

    const gaugeItem: OutwardGaugeItem = {
      id: apiItem.gauge_id || apiItem.inward_gauge_lab_id || minimalItem.gaugeId,
      inward_id: apiItem.inward_id,
      gauge_inward_id: apiItem.inward_id || apiItem.gauge_id || apiItem.inward_gauge_lab_id || minimalItem.gaugeId,
      gauge_id: apiItem.gauge_id,
      inward_gauge_lab_id: apiItem.inward_gauge_lab_id,
      master_gauge_name: apiItem.master_gauge_name,
      identification_number: apiItem.identification_number,
      manf_serial_number: '',
      inward_date: apiItem.inward_date || '',
      process: apiItem.billing_components?.[0]?.process || '',
      status: '',
      specification: formattedSpecs,
      specifications: apiItem.specifications,
    };

    // Map minimal HSN entries back to full format
    const hsnEntries: InvoiceItemHSN[] = minimalItem.hsnEntries.map((entry) => ({
      id: entry.id,
      hsnCode: entry.hsnCode,
      hsnName: HSN_CODES.find((h) => h.code === entry.hsnCode)?.name || 'Calibration Services',
      rate: entry.rate,
      quantity: entry.quantity,
    }));

    return {
      gaugeItem,
      hsnEntries,
    };
  });
};

const saveDraft = (invoiceId: string, formData: InvoiceFormData, invoiceItemsData: InvoiceItemDataLocal[]): void => {
  try {
    const draft: InvoiceDraft = {
      version: DRAFT_VERSION,
      invoiceId,
      timestamp: Date.now(),
      formData,
      invoiceItems: toMinimalDraft(invoiceItemsData),
    };
    sessionStorage.setItem(getDraftKey(invoiceId), JSON.stringify(draft));
  } catch (error) {
    // Handle quota exceeded or other storage errors silently
    console.warn('Failed to save draft:', error);
  }
};

const loadDraft = (invoiceId: string): InvoiceDraft | null => {
  try {
    const stored = sessionStorage.getItem(getDraftKey(invoiceId));
    if (!stored) return null;

    const draft: InvoiceDraft = JSON.parse(stored);

    // Version check - ignore incompatible versions
    if (draft.version !== DRAFT_VERSION) {
      console.warn(`Draft version mismatch: expected ${DRAFT_VERSION}, got ${draft.version}`);
      return null;
    }

    // Validate draft structure
    if (!draft.invoiceId || !draft.formData || !Array.isArray(draft.invoiceItems)) {
      console.warn('Invalid draft structure');
      return null;
    }

    return draft;
  } catch (error) {
    console.warn('Failed to load draft:', error);
    return null;
  }
};

const clearDraft = (invoiceId: string): void => {
  try {
    sessionStorage.removeItem(getDraftKey(invoiceId));
  } catch (error) {
    console.warn('Failed to clear draft:', error);
  }
};
export function OutwardInvoiceEditor({
  invoiceId,
  outwardId,
  outwardNo,
  backRoute,
  embedded = false,
  onBack,
}: OutwardInvoiceEditorProps) {
  const navigate = useNavigate();

  const {
    updateInvoice,
    fetchInvoice,
    creatingInvoice,
    loadingCurrentInvoice,
    currentInvoice,
  } = useInvoiceStore();

  // Alias for clarity - this is the invoice data from GET /invoice API
  const invoiceData = currentInvoice;
  const loadingInvoice = loadingCurrentInvoice;
  // React Hook Form setup
  const form = useForm<
    z.input<typeof invoiceFormSchema>,
    unknown,
    z.output<typeof invoiceFormSchema>
  >({
    resolver: zodResolver(invoiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      invoice_number: '',
      date_of_issue: format(new Date(), 'yyyy-MM-dd'),
      packing: 0,
      courier: 0,
      cgst_rate: 9,
      sgst_rate: 9,
    },
  });

  const { watch, setValue } = form;
  const packing = watch('packing');
  const courier = watch('courier');
  const cgstRate = watch('cgst_rate');
  const sgstRate = watch('sgst_rate');

  const [invoiceItemsData, setInvoiceItemsData] = useState<InvoiceItemDataLocal[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Debounced save timer ref - use browser-compatible type
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref to track if draft data was already set - prevents API from overwriting
  const draftDataSetRef = useRef(false);

  // Debounced save function
  const debouncedSaveDraft = useCallback((invoiceId: string, formData: InvoiceFormData, invoiceItemsData: InvoiceItemDataLocal[]) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveDraft(invoiceId, formData, invoiceItemsData);
    }, DRAFT_DEBOUNCE_MS);
  }, []);

  // Cleanup timer and save pending changes on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Save any pending changes immediately on unmount
      if (invoiceId && isHydrated) {
        const formValues = form.getValues();
        saveDraft(invoiceId, formValues as InvoiceFormData, invoiceItemsData);
      }
    };
  }, [invoiceId, isHydrated, form, invoiceItemsData]);

  // Fetch invoice data from API using invoice ID from route params
  useEffect(() => {
    if (!invoiceId) {
      toast.error('Invalid invoice ID');
      navigate(backRoute);
      return;
    }

    let isMounted = true;

    // Check for draft FIRST - before any API calls
    const draft = loadDraft(invoiceId);
    const loadInvoice = async () => {
      try {
        const invoice = await fetchInvoice(invoiceId, true);
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        if (!invoice) {
          console.error('No invoice data received');
          if (!draft) {
            toast.error('Failed to load invoice data');
          }
          return;
        }
        
      } catch (error) {
        console.error('Error fetching invoice:', error);
        if (!draft) {
          toast.error('Failed to load invoice data');
        } else {
          console.warn('API fetch failed, but draft is loaded:', error);
        }
      }
    };
    
    if (draft) {
      // Valid draft exists - hydrate form values immediately
      setHasDraft(true);
      draftDataSetRef.current = true; // Mark that we have draft data

      // Hydrate form values immediately from draft
      setValue('invoice_number', draft.formData.invoice_number);
      setValue('date_of_issue', draft.formData.date_of_issue);
      setValue('packing', draft.formData.packing);
      setValue('courier', draft.formData.courier);
      setValue('cgst_rate', draft.formData.cgst_rate);
      setValue('sgst_rate', draft.formData.sgst_rate);

      // Mark as hydrated - invoiceItemsData will be reconstructed when API data arrives
      setIsHydrated(true);

      // Fetch API data ONLY to get gaugeItem details for reconstruction
      // The reconstruction effect will handle merging draft + API data
      loadInvoice();
    } else {
      // No draft - fetch from API normally
      setHasDraft(false);
      draftDataSetRef.current = false;
      
      // Always fetch invoice data - await to ensure state is updated
      loadInvoice();
    }

    return () => {
      isMounted = false;
    };
  }, [backRoute, invoiceId, navigate, fetchInvoice, setValue]);


  // Initialize from API response OR reconstruct from draft + API data
  useEffect(() => {
    if (!invoiceData) {
      return;
    }

    // Get invoice_details - handle both InvoiceDraftResponse and Invoice types
    const invoiceDetails = (invoiceData as any).invoice_details;
    if (!invoiceDetails || !invoiceDetails.billing_items) {
      return;
    }

    // CRITICAL: Check for draft FIRST - even if hasDraft flag isn't set yet
    // This prevents API data from overwriting draft on refresh
    const draft = loadDraft(invoiceId!);

    if (draft) {
      // We have a draft - reconstruct from it (don't use API data for user input)
      try {
        const reconstructed = fromMinimalDraft(draft.invoiceItems, invoiceDetails.billing_items);
        if (reconstructed && reconstructed.length > 0) {
          setInvoiceItemsData(reconstructed);
          setHasDraft(true);
          setIsHydrated(true);
          draftDataSetRef.current = true; // Mark that draft data was set
          // CRITICAL: Exit early - don't let API overwrite draft data
          return;
        } else {
          console.warn('Draft reconstruction returned empty array, falling back to API');
        }
      } catch (error) {
        console.error('Failed to reconstruct from draft:', error);
        // Fall through to API initialization if reconstruction fails
      }
    }

    // No draft or draft reconstruction failed - initialize from API
    // BUT only if we haven't already set draft data
    if (draftDataSetRef.current) {
      return; // Draft data was already set - don't overwrite with API
    }

    if (isHydrated && hasDraft) {
      return; // Already hydrated from draft - don't overwrite
    }


    const invoiceNumber = (invoiceData as any).invoice_number || (invoiceData as any).invoice_no || '';
    const billingDate =
      (invoiceData as any).billing_date ||
      (invoiceData as any).date_of_issue ||
      (invoiceData as any).invoice_date ||
      '';
    setValue('invoice_number', invoiceNumber);
    setValue('date_of_issue', billingDate);

    // Initialize invoice items from invoice_details.billing_items
    const items: InvoiceItemDataLocal[] = invoiceDetails.billing_items.flatMap(
      (item: any, index: number) => {
        // Format specifications
        const formattedSpecs = formatSpecifications(item.specifications);

        const gaugeItem: OutwardGaugeItem = {
          id: item.gauge_id || item.inward_gauge_lab_id || `invoice-${index}`,
          inward_id: item.inward_id,
          gauge_inward_id: item.inward_id || item.gauge_id || item.inward_gauge_lab_id || `invoice-${index}`,
          gauge_id: item.gauge_id,
          inward_gauge_lab_id: item.inward_gauge_lab_id,
          master_gauge_name: item.master_gauge_name,
          identification_number: item.identification_number,
          manf_serial_number: '',
          inward_date: item.inward_date || '',
          process: item.billing_components?.[0]?.process || '',
          status: '',
          specification: formattedSpecs,
          specifications: item.specifications,
        };

        // Map billing components to HSN entries
        const hsnEntries: InvoiceItemHSN[] = item.billing_components?.map(
          (component: any, compIndex: number) => {
            const processType = component.process?.toLowerCase() || 'calibration';
            const hsnCode =
              processType === 'calibration' ? '998346' :
                processType === 'repair' ? '998347' :
                  processType === 'inspection' ? '998348' :
                    '998349';
            const hsnName = HSN_CODES.find((h) => h.code === hsnCode)?.name || 'Calibration Services';

            return {
              id: `${gaugeItem.id}-hsn-${compIndex}-${Date.now()}-${Math.random()}`,
              hsnCode,
              hsnName,
              rate: component.rate ? String(component.rate) : '',
              quantity: component.quantity ?? 1,
            };
          }
        ) || [
            {
              id: `${gaugeItem.id}-hsn-${Date.now()}`,
              hsnCode: DEFAULT_HSN,
              hsnName: HSN_CODES.find((h) => h.code === DEFAULT_HSN)?.name || 'Calibration Services',
              rate: '',
              quantity: 1,
            },
          ];

        return {
          gaugeItem,
          hsnEntries,
        };
      }
    );

    // Only set invoiceItemsData if we haven't already set draft data
    if (!draftDataSetRef.current) {
      setInvoiceItemsData(items);
    }

    // Set form values for packing, courier, and tax rates
    if (invoiceDetails.packing !== undefined && invoiceDetails.packing !== null) {
      setValue('packing', invoiceDetails.packing);
    }
    if (invoiceDetails.courier !== undefined && invoiceDetails.courier !== null) {
      setValue('courier', invoiceDetails.courier);
    }

    // Calculate CGST and SGST rates from amounts
    const subTotal = invoiceDetails.sub_total || 0;
    if (subTotal > 0) {
      const cgstAmount = invoiceDetails.cgst || 0;
      const sgstAmount = invoiceDetails.sgst || 0;
      const cgstRate = (cgstAmount / subTotal) * 100;
      const sgstRate = (sgstAmount / subTotal) * 100;
      setValue('cgst_rate', cgstRate || 9);
      setValue('sgst_rate', sgstRate || 9);
    }

    setIsHydrated(true);
  }, [invoiceData, setValue, isHydrated, hasDraft, invoiceId]);

  // Consolidated draft persistence - single debounced effect for all changes
  useEffect(() => {
    if (!invoiceId || !isHydrated || invoiceItemsData.length === 0) {
      return;
    }

    // Debounced save of form values and invoice items
    const formValues = form.getValues();
      debouncedSaveDraft(invoiceId, formValues as InvoiceFormData, invoiceItemsData);
  }, [
    invoiceId,
    isHydrated,
    packing,
    courier,
    cgstRate,
    sgstRate,
    invoiceItemsData,
    form,
    debouncedSaveDraft,
  ]);

  // Add HSN entry for a gauge
  const handleAddHSN = useCallback((gaugeIndex: number) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const newHSN: InvoiceItemHSN = {
        id: `${Date.now()}-${Math.random()}`,
        hsnCode: DEFAULT_HSN,
        hsnName: HSN_CODES.find(h => h.code === DEFAULT_HSN)?.name || 'Calibration Services',
        rate: '',
        quantity: 1,
      };
      updated[gaugeIndex].hsnEntries.push(newHSN);

      // Save draft immediately for critical operations
      if (invoiceId) {
        const formValues = form.getValues();
        debouncedSaveDraft(invoiceId, formValues as InvoiceFormData, updated);
      }

      return updated;
    });
  }, [invoiceId, form, debouncedSaveDraft]);

  // Remove HSN entry - if it's the last one, remove the entire gauge row
  const handleRemoveHSN = useCallback((gaugeIndex: number, hsnId: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      if (updated[gaugeIndex].hsnEntries.length > 1) {
        // Remove only the HSN entry
        updated[gaugeIndex].hsnEntries = updated[gaugeIndex].hsnEntries.filter(
          (entry) => entry.id !== hsnId
        );
      } else {
        // If it's the last HSN entry, remove the entire gauge row
        const filtered = updated.filter((_, index) => index !== gaugeIndex);
        if (filtered.length === 0) {
          toast.error('At least one gauge item is required');
          return prev; // Don't allow removing the last gauge
        }
        // Save draft immediately after deletion
        if (invoiceId) {
          const formValues = form.getValues();
          debouncedSaveDraft(invoiceId, formValues as InvoiceFormData, filtered);
        }
        return filtered;
      }

      // Save draft immediately after deletion
      if (invoiceId) {
        const formValues = form.getValues();
        debouncedSaveDraft(invoiceId, formValues as InvoiceFormData, updated);
      }

      return updated;
    });
  }, [invoiceId, form, debouncedSaveDraft]);

  // Update HSN code
  const handleHSNChange = useCallback((gaugeIndex: number, hsnId: string, hsnCode: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.hsnCode = hsnCode;
        entry.hsnName = HSN_CODES.find((h) => h.code === hsnCode)?.name || '';
      }
      return updated;
    });
  }, []);

  // Update rate
  const handleRateChange = useCallback((gaugeIndex: number, hsnId: string, rate: string) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.rate = rate;
      }
      return updated;
    });
  }, []);

  // Update quantity
  const handleQuantityChange = useCallback((gaugeIndex: number, hsnId: string, quantity: number) => {
    setInvoiceItemsData((prev) => {
      const updated = [...prev];
      const entry = updated[gaugeIndex].hsnEntries.find((e) => e.id === hsnId);
      if (entry) {
        entry.quantity = quantity;
      }
      return updated;
    });
  }, []);

  // Validate form data
  const validateData = (): boolean => {
    if (!invoiceItemsData || invoiceItemsData.length === 0) {
      toast.error('Please add at least one invoice item');
      return false;
    }

    for (const itemData of invoiceItemsData) {
      if (!itemData.hsnEntries || itemData.hsnEntries.length === 0) {
        toast.error(`Please add at least one HSN entry for ${itemData.gaugeItem.master_gauge_name}`);
        return false;
      }

      for (const hsnEntry of itemData.hsnEntries) {
        if (!hsnEntry.hsnCode) {
          toast.error(`Please select HSN code for ${itemData.gaugeItem.master_gauge_name}`);
          return false;
        }
        if (!hsnEntry.rate || parseFloat(hsnEntry.rate) <= 0) {
          toast.error(`Please enter valid rate for ${itemData.gaugeItem.master_gauge_name} - ${hsnEntry.hsnName}`);
          return false;
        }
        if (hsnEntry.quantity <= 0) {
          toast.error(`Please enter valid quantity for ${itemData.gaugeItem.master_gauge_name} - ${hsnEntry.hsnName}`);
          return false;
        }
      }
    }

    // Validate form fields
    const formValues = form.getValues();
    if (!formValues.invoice_number || formValues.invoice_number.trim() === '') {
      toast.error('Please enter invoice number');
      return false;
    }
    if (!formValues.date_of_issue || formValues.date_of_issue.trim() === '') {
      toast.error('Please enter date of issue');
      return false;
    }

    return true;
  };

  // Calculate subtotal amount
  const subtotalAmount = useMemo(() => {
    return invoiceItemsData.reduce((total, itemData) => {
      return total + itemData.hsnEntries.reduce((itemTotal, hsnEntry) => {
        const rate = parseFloat(hsnEntry.rate) || 0;
        return itemTotal + (rate * hsnEntry.quantity);
      }, 0);
    }, 0);
  }, [invoiceItemsData]);

  // Calculate GST amounts
  const cgstAmount = useMemo(() => {
    return (subtotalAmount * cgstRate) / 100;
  }, [subtotalAmount, cgstRate]);

  const sgstAmount = useMemo(() => {
    return (subtotalAmount * sgstRate) / 100;
  }, [subtotalAmount, sgstRate]);

  // Calculate final total with GST, packing, and courier
  const finalAmount = useMemo(() => {
    return subtotalAmount + packing + courier + cgstAmount + sgstAmount;
  }, [subtotalAmount, packing, courier, cgstAmount, sgstAmount]);

  // Transform invoiceItemsData to PUT payload format
  const buildInvoicePayload = useCallback((): Invoice => {
    const now = new Date().toISOString();
    const formValues = form.getValues();

    // Build billing items from invoiceItemsData
    const billingItems = invoiceItemsData.map((itemData) => {
      const billingComponents = itemData.hsnEntries.map((hsnEntry) => {
        const processType = hsnEntry.hsnCode === '998346' ? 'calibration' :
          hsnEntry.hsnCode === '998347' ? 'repair' :
            hsnEntry.hsnCode === '998348' ? 'inspection' :
              'verification';
        const rate = parseFloat(hsnEntry.rate) || 0;
        const quantity = hsnEntry.quantity || 1;
        const amount = rate * quantity;

        return {
          process: processType as 'calibration' | 'repair' | 'inspection' | 'verification',
          quantity,
          rate,
          amount,
        };
      });

      const itemTotal = billingComponents.reduce((sum, comp) => sum + comp.amount, 0);

      // Get specifications - handle both object and string formats
      // Ensure specifications is never null - use empty object as fallback
      let specifications: Record<string, unknown> = {};
      const itemSpecs = (itemData.gaugeItem as any).specifications;
      if (itemSpecs) {
        if (typeof itemSpecs === 'object' && itemSpecs !== null) {
          specifications = itemSpecs as Record<string, unknown>;
        } else if (typeof itemSpecs === 'string') {
          try {
            const parsed = JSON.parse(itemSpecs);
            specifications = typeof parsed === 'object' && parsed !== null ? parsed : { value: itemSpecs };
          } catch {
            specifications = { value: itemSpecs };
          }
        }
      }

      return {
        gauge_id: itemData.gaugeItem.gauge_id || itemData.gaugeItem.id || '',
        inward_id: itemData.gaugeItem.inward_id || '',
        master_gauge_id: String((itemData.gaugeItem as any).master_gauge_id || itemData.gaugeItem.gauge_id || itemData.gaugeItem.id || ''),
        master_gauge_name: itemData.gaugeItem.master_gauge_name || '',
        identification_number: itemData.gaugeItem.identification_number || '',
        inward_gauge_lab_id: itemData.gaugeItem.inward_gauge_lab_id || '',
        specifications: specifications || {}, // Convert null to empty object for payload
        billing_components: billingComponents,
        total: itemTotal,
      };
    });

    // Calculate totals
    const subTotal = billingItems.reduce((sum, item) => sum + item.total, 0);
    const cgst = (subTotal * formValues.cgst_rate) / 100;
    const sgst = (subTotal * formValues.sgst_rate) / 100;
    const grandTotal = subTotal + formValues.packing + formValues.courier + cgst + sgst;

    // Get gauge_inward_ids from invoice data
    const gaugeInwardIds = invoiceData?.gauge_inward_ids || [];

    // Get client_details with proper structure
    const clientDetails: ClientDetails = invoiceData?.client_details || {
      name: '',
      address: {
        address_line_1: '',
        address_line_2: '',
        city: '',
        state: '',
        zip_code: '',
        country: '',
      },
    };

    // Build invoice_details with proper typing
    const invoiceDetails: InvoiceDetails = {
      billing_items: billingItems,
      sub_total: subTotal,
      packing: formValues.packing,
      courier: formValues.courier,
      cgst: cgst,
      sgst: sgst,
      grand_total: grandTotal,
    };

    // Build payload matching exact API format
    const payload: Invoice = {
      updated_at: now,
      created_at: now,
      deleted_at: null,
      archived: false,
      invoice_number: formValues.invoice_number || `INV-${Date.now()}`,
      date_of_issue: formValues.date_of_issue,
      billing_date: formValues.date_of_issue,
      status: 'draft',
      client_org_id: invoiceData?.client_org_id || '',
      outward_id: outwardId || '',
      outward_no: Number(outwardNo || null),
      gauge_inward_ids: gaugeInwardIds,
      client_details: clientDetails,
      invoice_details: invoiceDetails,
    };

    return payload;
  }, [invoiceItemsData, invoiceData, form]);

  // Flatten all items for table display
  const flattenedItems = useMemo(() => {
    return invoiceItemsData.flatMap((itemData, gaugeIndex) =>
      itemData.hsnEntries.map((hsnEntry, hsnIndex) => ({
        gaugeIndex,
        isFirstHSN: hsnIndex === 0,
        hsnEntry,
        itemData,
        amount: (parseFloat(hsnEntry.rate) || 0) * hsnEntry.quantity,
      }))
    );
  }, [invoiceItemsData]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return flattenedItems.slice(start, end);
  }, [flattenedItems, page, rowsPerPage]);

  const totalPages = Math.ceil(flattenedItems.length / rowsPerPage);

  const resolveCancel = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(backRoute);
  }, [backRoute, navigate, onBack]);

  // Handle create/update invoice
  const handleCreateInvoice = async (_data?: InvoiceFormData) => {
    // Validate data first
    if (!validateData()) {
      return;
    }

    if (!invoiceId) {
      toast.error('Invoice ID not found. Please refresh the page.');
      return;
    }

    if (!invoiceItemsData || invoiceItemsData.length === 0) {
      toast.error('Please add at least one invoice item');
      return;
    }

    try {
      // Build PUT payload with exact format
      const invoicePayload = buildInvoicePayload();
      // Update invoice with PUT using the exact payload format
      await updateInvoice(invoiceId, invoicePayload);

      // Clear draft after successful save
      if (invoiceId) {
        clearDraft(invoiceId);
      }

      toast.success('Invoice created successfully!');
      resolveCancel();
    } catch (error) {
      console.error('Error creating invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice. Please try again.';
      toast.error(errorMessage);

      // Log full error for debugging
      if (error instanceof Error) {
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
    }
  };

  const editorBody = (
    <div className={`flex flex-col ${embedded ? 'min-h-[640px]' : 'h-[calc(100vh-160px)]'}`}>
      {/* Table Section with Fixed Height */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-200 rounded-t-lg">
          <Table aria-label="Invoice items table">
            <Table.Header>
              <Table.Column width="4%" className="text-sm font-semibold py-3">SR</Table.Column>
              <Table.Column width="14%" className="text-sm font-semibold py-3">Gauge Name</Table.Column>
              <Table.Column width="12%" className="text-sm font-semibold py-3">Identification</Table.Column>
              <Table.Column width="12%" className="text-sm font-semibold py-3">Specification</Table.Column>
              <Table.Column width="12%" className="text-sm font-semibold py-3">HSN Code</Table.Column>
              <Table.Column width="10%" className="text-sm font-semibold py-3">Rate (₹)</Table.Column>
              <Table.Column width="6%" className="text-sm font-semibold py-3">Qty</Table.Column>
              <Table.Column width="10%" className="text-sm font-semibold py-3">Amount (₹)</Table.Column>
              <Table.Column width="10%" className="text-sm font-semibold py-3">Action</Table.Column>
            </Table.Header>
            <Table.Body items={paginatedItems} renderEmptyState={() => (
                loadingInvoice ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">Loading invoice data...</span>
                  </div>
                ) : paginatedItems.length === 0 ? (
                  'No invoice items found'
                ) : null
              )}>
              {paginatedItems.map((item) => {
                const { gaugeIndex, hsnEntry, itemData, amount } = item;
                return (
                  <Table.Row key={`${gaugeIndex}-${hsnEntry.id}`} aria-label="Invoice item row">
                    <Table.Cell className="py-2">
                      <div className="font-semibold text-sm">{gaugeIndex + 1}</div>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <div className="font-semibold text-sm">{itemData.gaugeItem.master_gauge_name || 'Unknown'}</div>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <div className="text-xs text-gray-700 font-medium">
                        {itemData.gaugeItem.identification_number || '-'}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {itemData.gaugeItem.inward_gauge_lab_id || '-'}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <div className="text-xs text-gray-700">
                        {formatSpecifications(
                          (itemData.gaugeItem as any).specification ||
                          (itemData.gaugeItem as any).gauge_specification ||
                          (itemData.gaugeItem as any).specifications
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <Dropdown>
                        <Dropdown.Trigger aria-label="HSN Code Selection Trigger">
                          <HeroUIButton
                            variant="secondary"

                            className="h-8 min-h-8 text-xs justify-between border border-gray-300"
                          >
                            <span className="truncate">
                              {hsnEntry.hsnCode} - {hsnEntry.hsnName}
                            </span>
                          </HeroUIButton>
                        </Dropdown.Trigger>
                        <Dropdown.Menu
                          aria-label="HSN Code Selection"
                          selectedKeys={[hsnEntry.hsnCode]}
                          selectionMode="single"
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys)[0] as string;
                            if (selectedKey) {
                              handleHSNChange(gaugeIndex, hsnEntry.id, selectedKey);
                            }
                          }}
                        >
                          {HSN_CODES.map((hsn) => (
                            <Dropdown.Item key={hsn.code} textValue={`${hsn.code} - ${hsn.name}`} aria-label="HSN Code Selection Item">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold">{hsn.code}</span>
                                <span className="text-xs text-gray-500">{hsn.name}</span>
                              </div>
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <Input
                        type="number"
                        aria-label="Rate"
                        value={hsnEntry.rate}
                        onChange={(e) => handleRateChange(gaugeIndex, hsnEntry.id, e.target.value)}

                        min="0"
                        step="0.01"
                      />
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <Input
                        type="number"
                        aria-label="Quantity"
                        value={hsnEntry.quantity.toString()}
                        onChange={(e) =>
                          handleQuantityChange(
                            gaugeIndex,
                            hsnEntry.id,
                            parseInt(e.target.value) || 1
                          )
                        }

                        min="1"
                      />
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <div className="font-semibold text-sm">
                        ₹{amount.toFixed(2)}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      <div className="flex gap-1">
                        <Button

                          variant="ghost"
                          aria-label="Remove HSN"
                          onClick={() => handleRemoveHSN(gaugeIndex, hsnEntry.id)}
                          className="h-7 w-7 min-w-7 p-0 text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button

                          variant="ghost"
                          aria-label="Add HSN"
                          onClick={() => handleAddHSN(gaugeIndex)}
                          className="h-7 w-7 min-w-7 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>

        {flattenedItems.length > 0 && (
          <div className="flex justify-between items-center flex-shrink-0 px-4 py-2 bg-gray-50 border-x border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, flattenedItems.length)} of {flattenedItems.length} entries
            </div>
            <div className="flex items-center gap-3">
              <Select
                selectedKey={rowsPerPage.toString()}
                aria-label="Rows per page"
                onSelectionChange={(key) => {
                  const value = key ? String(key) : String(rowsPerPage);
                  setRowsPerPage(parseInt(value));
                  setPage(1);
                }}

                className="w-24"
              >
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>
                  {['25','50','100','200','500'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}
                </ListBox></Select.Popover>
              </Select>
              <Pagination aria-label="Pagination"><Pagination.Content>
                <Pagination.Previous isDisabled={page <= 1} onPress={() => setPage(Math.max(1, page - 1))}><Pagination.PreviousIcon /></Pagination.Previous>
                {Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1).map((pageNumber) => <Pagination.Item key={pageNumber}><Pagination.Link isActive={pageNumber === page} onPress={() => setPage(pageNumber)}>{pageNumber}</Pagination.Link></Pagination.Item>)}
                <Pagination.Next isDisabled={page >= Math.max(totalPages, 1)} onPress={() => setPage(Math.min(Math.max(totalPages, 1), page + 1))}><Pagination.NextIcon /></Pagination.Next>
              </Pagination.Content></Pagination>
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-gray-300 bg-white rounded-b-lg">
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-gray-600">Packing (₹)</label>
              <Controller
                name="packing"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="number"
                    aria-label="Packing"
                    value={field.value.toString()}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}

                    min="0"
                    step="0.01"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Courier (₹)</label>
              <Controller
                name="courier"
                control={form.control}
                render={({ field }) => (
                  <Input
                    type="number"
                    aria-label="Courier"
                    value={field.value.toString()}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}

                    min="0"
                    step="0.01"
                  />
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">CGST (%)</label>
              <Controller
                name="cgst_rate"
                control={form.control}
                render={({ field }) => (
                  <Select selectedKey={field.value.toString()} aria-label="CGST" onSelectionChange={(key) => field.onChange(parseFloat(key ? String(key) : "0"))}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>
                    {[0, 5, 9, 12, 18, 28].map((rate) => (
                      <ListBox.Item key={rate.toString()} id={rate.toString()} textValue={rate.toString()}>{rate}%<ListBox.ItemIndicator /></ListBox.Item>
                    ))}
                    </ListBox></Select.Popover></Select>
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">SGST (%)</label>
              <Controller
                name="sgst_rate"
                control={form.control}
                render={({ field }) => (
                  <Select selectedKey={field.value.toString()} aria-label="SGST" onSelectionChange={(key) => field.onChange(parseFloat(key ? String(key) : "0"))}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>
                    {[0, 5, 9, 12, 18, 28].map((rate) => (
                      <ListBox.Item key={rate.toString()} id={rate.toString()} textValue={rate.toString()}>{rate}%<ListBox.ItemIndicator /></ListBox.Item>
                    ))}
                    </ListBox></Select.Popover></Select>
                )}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">₹{subtotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">CGST</span>
                <span className="font-medium text-gray-800">₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">SGST</span>
                <span className="font-medium text-gray-800">₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="text-base font-semibold text-gray-900">Final Amount</span>
                <span className="text-xl font-bold text-blue-700">₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-gray-200 pt-3">
              <Button
                variant="outline"
                onClick={resolveCancel}
              >
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit((data) => handleCreateInvoice(data))}
                loading={creatingInvoice}
                className="bg-blue-600 text-white"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {embedded ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-0 overflow-hidden">
            {editorBody}
          </div>
        </div>
      ) : (
      <TablePageWrapper
        pageTitle="Create Invoice"
        title={
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Create Invoice</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
              <span>Client: <span className="font-medium text-gray-900">{invoiceData?.client_details.name ?? 'N/A'}</span></span>
              <span>Outward No: <span className="font-medium text-blue-700">{outwardNo ?? 'N/A'}</span></span>
              <span>Invoice No: <span className="font-medium text-blue-700">{invoiceData?.invoice_number ?? 'N/A'}</span></span>
            </div>
          </div>
        }
        contentClassName="p-0"
      >
        {editorBody}
      </TablePageWrapper>
      )}
    </>
  );
}

export default function CreateInvoicePage() {
  const { invoiceId, outwardId, outwardNo } = useParams<{ invoiceId: string; outwardId: string; outwardNo: string }>();

  if (!invoiceId) {
    return null;
  }

  return (
    <OutwardInvoiceEditor
      invoiceId={invoiceId}
      outwardId={outwardId}
      outwardNo={outwardNo}
      backRoute={outwardId ? `/transactions/outward/${outwardId}` : '/transactions/outward'}
    />
  );
}
