import { useState, useEffect, useMemo, useCallback, useRef, useImperativeHandle } from 'react';
import type { Ref } from 'react';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseDate } from '@internationalized/date';
import { Button } from '../../../components/ui/button';
import {
  Calendar,
  Card,
  Checkbox,
  DatePicker,
  DateField,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
} from '@heroui/react';
import { UserIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  type Invoice,
  type InvoiceBillingComponent,
  type InvoiceBillingItem,
  type InvoiceDetails,
  type ClientDetails,
} from '../../../types/types';
import { editInvoiceFormSchema } from '../../../lib/validations/invoiceSchemas';
import {
  useGenerateInvoiceMutation,
  useInvoiceDetailQuery,
  useUpdateInvoiceMutation,
} from '../../../hooks/queries/invoices';
import { useOrganizationsQuery } from '../../../hooks/queries/organizations';
import { useRateCard } from '../../../hooks/useRateCard';
import { useThreadSpecificationLabelsQuery } from '../../../hooks/queries/threadRingPlugs';
import { getStandardSpecificationId } from '../../../utils/standardSpecificationResolver';
import { useAccountDetailQuery } from '../../../hooks/queries/accountDetails';
import { FormField } from '../../../components/ui/form-field';
import { FormDateProvider } from '../../../components/form/FormDateProvider';
import { PageMeta } from '../../../components/common/PageMeta';
import { PageLoader } from '../../../components/ui/AppLoader';
import {
  calculateInvoiceTotalsFromPercentage,
  calculateLineAmount,
  clampPercentage,
  deriveDiscountPercentFromAmount,
  roundCurrency,
} from '../../../utils/invoiceCalculations';
import { formatSpecificationForPrint } from '../../../utils/specificationPrintFormatter';
import InvoiceItemsBillingTable from '../../../components/billing/InvoiceItemsBillingTable';
import {
  DEFAULT_INVOICE_HSN,
  getInvoiceHsnName,
  getInvoiceProcessFromHsn,
  RETURN_AS_IS_CODE,
  RETURN_AS_IS_LABEL,
  isReturnAsIsEntry,
  type EditableGaugeField,
  type InvoiceItemDataLocal,
  type InvoiceItemHSN,
  type InvoiceTableGaugeItem,
} from '../../../components/billing/invoiceItemTableShared';
import {
  DEFAULT_INVOICE_PDF_COLUMNS,
  INVOICE_PDF_OPTIONAL_COLUMN_OPTIONS,
  normalizeInvoicePdfColumns,
} from '../../../utils/invoicePdfColumns';
import {
  PAYMENT_TERMS,
  getInvoiceDisplayStatus,
  invoiceDisplayStatusLabel,
  normalizeInvoiceStatus,
} from '../../../utils/invoiceLifecycle';
import { getRateCardEntriesMap } from '../../../services/apiServices';
import { useExistingGaugeStore, type ExistingGaugeData } from '../../../store/existingGaugeStore';
import {
  getInvoiceRateCardPricing,
  isUnchangedLegacyRateCardListPrice,
  shouldAutofillInvoiceRate,
} from '../../../utils/rateCardLookup';

const DEFAULT_BILLING_FIRM_ID = '';
const DEFAULT_BILLING_FIRM_NAME = '';

const InvoiceSelect = ({
  value,
  onChange,
  options,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  ariaLabel: string;
  disabled?: boolean;
}) => (
  <Select aria-label={ariaLabel} selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')} isDisabled={disabled}>
    <Select.Trigger className={`h-10 min-h-10 rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${value ? '!bg-slate-100' : '!bg-white'}`}><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const InvoiceDatePicker = ({
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) => (
  <DatePicker value={value ? parseDate(value) : null} onChange={(date) => onChange(date ? String(date) : '')} isDisabled={disabled}>
    <DateField.Group className={`h-10 min-h-10 rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${value ? '!bg-slate-100' : '!bg-white'}`} fullWidth>
      <DateField.Input aria-label={ariaLabel}>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
      <DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix>
    </DateField.Group>
    <DatePicker.Popover><Calendar aria-label={ariaLabel}>
      <Calendar.Header><Calendar.NavButton slot="previous" /><Calendar.Heading /><Calendar.NavButton slot="next" /></Calendar.Header>
      <Calendar.Grid><Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader><Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody></Calendar.Grid>
    </Calendar></DatePicker.Popover>
  </DatePicker>
);

const INDIAN_CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `₹${INDIAN_CURRENCY_FORMATTER.format(Object.is(safeValue, -0) ? 0 : safeValue)}`;
};

const MONEY_TEXT_CLASS = 'whitespace-nowrap text-right [font-variant-numeric:tabular-nums]';

type InvoiceSummaryCardRow = {
  key: string;
  label: string;
  value: number;
  emphasis?: 'subtotal' | 'total';
  tone?: 'negative';
};

const hasCurrencyAmount = (value?: number | null) => Math.abs(Number(value || 0)) >= 0.005;

const formatPercentageForLabel = (value: number) => {
  const rounded = roundCurrency(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const formatSignedCurrency = (value: number) =>
  value < -0.005 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value);

const normalizeDateField = (value?: string | null) =>
  (value || '').split('T')[0] || '';

const formatDateForDisplay = (value?: string | null) => {
  const normalized = normalizeDateField(value);
  if (!normalized) return 'Not calculated';
  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
};

const normalizeOptionalText = (value?: string | number | null) =>
  value === null || value === undefined ? '' : String(value);

const trimOrNull = (value?: string) => {
  const trimmed = value?.trim() || '';
  return trimmed ? trimmed : null;
};

const getOutwardIds = (invoice?: Invoice | null) =>
  invoice?.outward_ids?.length
    ? invoice.outward_ids
    : invoice?.outward_id
      ? [invoice.outward_id]
      : [];

const getOutwardNumbers = (invoice?: Invoice | null) =>
  invoice?.outward_nos?.length
    ? invoice.outward_nos.map(String)
    : invoice?.outward_no === null || invoice?.outward_no === undefined
      ? []
      : [String(invoice.outward_no)];

type InvoiceBillingComponentApi = {
  process?: string;
  service_type?: string;
  line_type?: 'calibration' | 'repair' | 'spare_part' | 'custom' | 'return_as_is';
  return_as_is?: boolean;
  description?: string;
  hsn_sac?: string;
  tax_category?: string;
  tax_rate?: number;
  rate?: number | string | null;
  quantity?: number | null;
  discount_type?: 'none' | 'percentage' | 'flat';
  discount_value?: number;
  discount_amount?: number;
  net_amount?: number;
  rate_card_list_rate?: number;
  rate_card_discount_percentage?: number;
  rate_card_discount_amount?: number;
};

type InvoiceUpdatePayload = Omit<Invoice, 'updated_at' | 'created_at' | 'deleted_at' | 'id'>;

const createDefaultHsnEntry = (seed: string): InvoiceItemHSN => ({
  id: `${seed}-hsn-${Date.now()}`,
  hsnCode: DEFAULT_INVOICE_HSN,
  hsnName: getInvoiceHsnName(DEFAULT_INVOICE_HSN, 'Calibration'),
  rate: '',
  quantity: 1,
  lineType: 'calibration',
  description: 'Calibration',
});

const createManualInvoiceItemData = (isGenerated: boolean): InvoiceItemDataLocal => {
  const seed = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    isManual: true,
    gaugeItem: {
      id: seed,
      inward_id: '',
      gauge_inward_id: '',
      gauge_id: '',
      inward_gauge_lab_id: '',
      master_gauge_name: '',
      identification_number: '',
      manf_serial_number: '',
      inward_date: '',
      process: 'manual',
      status: isGenerated ? 'generated' : 'draft',
      specification: '',
      specifications: {},
      master_gauge_id: '',
    } satisfies InvoiceTableGaugeItem,
    hsnEntries: [createDefaultHsnEntry(seed)],
  };
};

export interface InvoiceEditorHandle { save: () => Promise<boolean> }
interface InvoiceEditorProps {
  invoiceId?: string;
  controlRef?: Ref<InvoiceEditorHandle>;
  onSaved?: () => void;
  onGenerated?: () => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function InvoiceEditor({ invoiceId: invoiceIdOverride, controlRef, onSaved, onGenerated, onCancel, onDirtyChange }: InvoiceEditorProps = {}) {
  const navigate = useNavigate();
  const { invoiceId: routeInvoiceId } = useParams<{ invoiceId: string }>();
  const invoiceId = invoiceIdOverride || routeInvoiceId;
  const updateInvoiceMutation = useUpdateInvoiceMutation();
  const [existingGaugeDialogOpen, setExistingGaugeDialogOpen] = useState(false);
  const [existingGaugeSearch, setExistingGaugeSearch] = useState('');
  const { existingGauges, loading: existingGaugesLoading, fetchExistingGauges } = useExistingGaugeStore();
  const generateInvoiceMutation = useGenerateInvoiceMutation();
  // Invoice parties are laboratory customers, not the platform-wide directory.
  // The customer endpoint applies the active laboratory scope for both lab
  // admins and audited super-admin laboratory sessions.
  const organizationsQuery = useOrganizationsQuery({ directory: 'customers' });
  const organizations = useMemo(
    () => organizationsQuery.data?.organizations ?? [],
    [organizationsQuery.data?.organizations],
  );
  const organizationsLoading = organizationsQuery.isLoading || organizationsQuery.isFetching;
  const {
    data: invoiceData,
    isLoading: loadingInvoice,
    error: invoiceError,
  } = useInvoiceDetailQuery(invoiceId ?? null);
  const billingFirmId = invoiceData?.billing_firm_id?.trim() || null;
  const billingFirmDetailQuery = useAccountDetailQuery(billingFirmId, {
    enabled: Boolean(billingFirmId),
  });
  const resolvedBillingFirmName =
    invoiceData?.billing_firm_name?.trim() ||
    billingFirmDetailQuery.data?.firm_name?.trim() ||
    DEFAULT_BILLING_FIRM_NAME;

  // React Hook Form setup
  const form = useForm<
    z.input<typeof editInvoiceFormSchema>,
    unknown,
    z.output<typeof editInvoiceFormSchema>
  >({
    resolver: zodResolver(editInvoiceFormSchema),
    mode: 'onChange',
    defaultValues: {
      billing_firm_id: DEFAULT_BILLING_FIRM_ID,
      billing_firm_name: DEFAULT_BILLING_FIRM_NAME,
      party_id: '',
      billing_date: format(new Date(), 'yyyy-MM-dd'),
      outward_no: '',
      outward_ids: [],
      outward_nos: [],
      order_number: '',
      order_date: '',
      po_number: '',
      po_date: '',
      from_date: '',
      to_date: '',
      credit_days: 0,
      invoice_number: '',
      date_of_issue: format(new Date(), 'yyyy-MM-dd'),
      packing: 0,
      courier: 0,
      discount: 0,
      discount_mode: undefined,
      pdf_columns_user_configured: false,
      cgst_rate: 9,
      sgst_rate: 9,
      pdf_columns: DEFAULT_INVOICE_PDF_COLUMNS,
    },
  });

  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const billingFirmName = watch('billing_firm_name');
  const billingFirmInputPlaceholder =
    billingFirmId && billingFirmDetailQuery.isLoading ? 'Loading firm...' : '';
  const packing = watch('packing');
  const courier = watch('courier');
  const discount = watch('discount');
  const cgstRate = watch('cgst_rate');
  const sgstRate = watch('sgst_rate');
  const selectedPartyId = watch('party_id') || invoiceData?.client_org_id || '';

  useEffect(() => {
    if (existingGaugeDialogOpen && selectedPartyId) {
      void fetchExistingGauges(selectedPartyId, { page: 1, limit: 500 });
    }
  }, [existingGaugeDialogOpen, selectedPartyId, fetchExistingGauges]);
  const pdfColumns = normalizeInvoicePdfColumns(watch('pdf_columns'));
  const normalizedInvoiceStatus = normalizeInvoiceStatus(invoiceData?.status);
  const invoiceDisplayStatus = getInvoiceDisplayStatus({
    status: invoiceData?.status,
    payment_due_date: invoiceData?.payment_due_date,
  });
  const isDraftInvoice = normalizedInvoiceStatus === 'draft';
  const isGeneratedInvoice = normalizedInvoiceStatus === 'generated';
  const invoiceOutwardIds = getOutwardIds(invoiceData);
  const canEditSummaryTotals = isDraftInvoice || isGeneratedInvoice;
  const isAccountingLocked = !isDraftInvoice;
  const canEditInvoiceLines = isDraftInvoice || (isGeneratedInvoice && !invoiceData?.batch_id);
  const lineMode = invoiceData?.invoice_details?.discount_mode === 'line';

  const [invoiceItemsData, setInvoiceItemsData] = useState<InvoiceItemDataLocal[]>([]);
  const manuallyEditedRateIdsRef = useRef(new Set<string>());
  const standardSpecificationIds = useMemo(() => [...new Set(invoiceItemsData.map((item) =>
    getStandardSpecificationId(item.gaugeItem.specifications)
  ).filter(Boolean))], [invoiceItemsData]);
  const standardSpecifications = useThreadSpecificationLabelsQuery(standardSpecificationIds);
  const itemBaselineRef = useRef('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [hydratedInvoiceId, setHydratedInvoiceId] = useState<string | null>(null);
  const legacyRateBaselineRef = useRef<Record<string, number>>({});
  const reconciledDraftInvoiceIdRef = useRef<string | null>(null);
  const rateCardQuery = useRateCard(selectedPartyId || undefined);
  const rateCardEntries = useMemo(
    () => getRateCardEntriesMap(rateCardQuery.data),
    [rateCardQuery.data],
  );

  useEffect(() => {
    if (!invoiceId) {
      toast.error('Invalid invoice ID');
      navigate('/billing/invoice');
    }
  }, [invoiceId, navigate]);

  useEffect(() => {
    setHydratedInvoiceId(null);
    setInvoiceItemsData([]);
    setPage(1);
    legacyRateBaselineRef.current = {};
    manuallyEditedRateIdsRef.current.clear();
    reconciledDraftInvoiceIdRef.current = null;
  }, [invoiceId]);

  // Initialize from API response or cached query data
  useEffect(() => {
    if (!invoiceData?.id || hydratedInvoiceId === invoiceData.id) {
      return;
    }

    const invoiceDetails = invoiceData.invoice_details;
    const invoiceNumber = invoiceData.invoice_number || '';
    const billingDate =
      normalizeDateField(invoiceData.billing_date) ||
      normalizeDateField(invoiceData.date_of_issue) ||
      format(new Date(), 'yyyy-MM-dd');

    let nextCgstRate = 9;
    let nextSgstRate = 9;
    const subTotal = invoiceDetails?.sub_total || 0;
    const storedDiscountAmount = invoiceDetails?.discount ?? 0;
    const taxableBase = Math.max(0, subTotal - storedDiscountAmount);

    if (taxableBase > 0) {
      const cgstAmount = invoiceDetails?.cgst || 0;
      const sgstAmount = invoiceDetails?.sgst || 0;
      nextCgstRate = (cgstAmount / taxableBase) * 100 || 9;
      nextSgstRate = (sgstAmount / taxableBase) * 100 || 9;
    }
    const pdfColumnDefaults = normalizeInvoicePdfColumns(
      invoiceDetails?.pdf_columns,
      (invoiceDetails?.billing_items ?? []).flatMap((item: InvoiceBillingItem) =>
        item.billing_components?.map((component: InvoiceBillingComponentApi) => ({
          repair_new:
            component.process?.toLowerCase() === 'repair'
              ? component.rate ?? 0
              : 0,
        })) ?? [],
      ),
      {
        autoEnableServiceColumns: false,
      },
    );

    form.reset({
      billing_firm_id: invoiceData.billing_firm_id || DEFAULT_BILLING_FIRM_ID,
      billing_firm_name: resolvedBillingFirmName,
      party_id: invoiceData.party_id || invoiceData.client_org_id || '',
      billing_date: billingDate,
      outward_no: getOutwardNumbers(invoiceData).join(', '),
      outward_ids: getOutwardIds(invoiceData),
      outward_nos: getOutwardNumbers(invoiceData),
      order_number: normalizeOptionalText(invoiceData.order_number),
      order_date: normalizeDateField(invoiceData.order_date),
      po_number: normalizeOptionalText(invoiceData.po_number),
      po_date: normalizeDateField(invoiceData.po_date),
      from_date: normalizeDateField(invoiceData.from_date || invoiceData.invoice_from_date),
      to_date: normalizeDateField(invoiceData.to_date || invoiceData.invoice_to_date),
      credit_days: invoiceData.credit_days ?? 0,
      invoice_number: invoiceNumber,
      date_of_issue: billingDate,
      packing: invoiceDetails?.packing ?? 0,
      courier: invoiceDetails?.courier ?? 0,
      discount: deriveDiscountPercentFromAmount(subTotal, storedDiscountAmount),
      discount_mode: invoiceDetails?.discount_mode,
      pdf_columns_user_configured: invoiceDetails?.pdf_columns_user_configured ?? false,
      cgst_rate: nextCgstRate,
      sgst_rate: nextSgstRate,
      pdf_columns: pdfColumnDefaults,
    });

    const legacyRateBaselines: Record<string, number> = {};
    const items: InvoiceItemDataLocal[] = (invoiceDetails?.billing_items ?? []).map((item: InvoiceBillingItem, index: number) => {
      const formattedSpecs = formatSpecificationForPrint(item.specifications);
      const isManualItem = item.source_type === 'manual' || (!item.inward_id && !item.gauge_inward_id && !item.repair_id && !!item.master_gauge_id);
      const sourceType = isManualItem ? 'manual' : item.source_type || 'outward';

      const gaugeItem: InvoiceTableGaugeItem = {
        id: item.gauge_id || item.master_gauge_id || item.inward_gauge_lab_id || `invoice-${index}`,
        inward_id: item.inward_id || '',
        gauge_inward_id: item.gauge_inward_id || item.inward_id || item.inward_gauge_lab_id || '',
        gauge_id: item.gauge_id || '',
        inward_gauge_lab_id: item.inward_gauge_lab_id || '',
        master_gauge_name: item.master_gauge_name || '',
        identification_number: item.identification_number || '',
        manf_serial_number: '',
        inward_date: item.inward_date || '',
        process: item.billing_components?.[0]?.process || '',
        status: invoiceData.status || 'draft',
        specification: formattedSpecs,
        specifications: item.specifications || {},
        master_gauge_id: item.master_gauge_id || '',
        price_list_item_id: item.price_list_item_id || undefined,
        source_type: sourceType as InvoiceTableGaugeItem['source_type'],
      };

      const hsnEntries: InvoiceItemHSN[] =
        item.billing_components?.map((component: InvoiceBillingComponentApi, compIndex: number) => {
          const returnAsIs = component.return_as_is === true || component.line_type === 'return_as_is' || component.process === 'return_as_is' || component.service_type === 'return_as_is';
          const processType = component.process?.toLowerCase() || 'calibration';
          const hsnCode = returnAsIs ? RETURN_AS_IS_CODE :
            component.hsn_sac ||
            (processType === 'calibration'
              ? '998346'
              : processType === 'repair'
                ? '998347'
                : processType === 'inspection'
                  ? '998348'
                  : '998349');

          const entryId = `${gaugeItem.id}-hsn-${compIndex}-${Date.now()}-${Math.random()}`;
          const savedRate = Number(component.rate);
          if (
            Number.isFinite(savedRate) &&
            component.rate_card_list_rate == null &&
            component.rate_card_discount_percentage == null
          ) {
            legacyRateBaselines[entryId] = savedRate;
          }

          return {
            id: entryId,
            hsnCode,
            hsnName: getInvoiceHsnName(hsnCode, 'Calibration'),
            rate: returnAsIs ? '0' : component.rate != null ? String(component.rate) : '',
            rateCardListRate: component.rate_card_list_rate,
            rateCardDiscountPercentage: component.rate_card_discount_percentage,
            rateCardDiscountAmount: component.rate_card_discount_amount,
            quantity: component.quantity ?? 1,
            lineType: returnAsIs ? 'return_as_is' : component.line_type || (processType === 'repair' ? 'repair' : processType === 'calibration' ? 'calibration' : 'custom'),
            description: returnAsIs ? RETURN_AS_IS_LABEL : component.description || (processType === 'calibration' ? 'Calibration' : processType === 'repair' ? 'Repair / Servicing' : ''),
            discountType: lineMode ? (component.discount_type || 'none') : 'none',
            discountValue: lineMode && component.discount_value !== undefined ? String(component.discount_value) : '',
          };
        }) ?? [createDefaultHsnEntry(String(gaugeItem.id ?? index))];

      return {
        isManual: isManualItem,
        gaugeItem,
        hsnEntries,
        sourceItem: item,
      };
    });

    legacyRateBaselineRef.current = legacyRateBaselines;
    setInvoiceItemsData(items);
    itemBaselineRef.current = JSON.stringify(items);
    setHydratedInvoiceId(invoiceData.id);
  }, [form, hydratedInvoiceId, invoiceData, lineMode, resolvedBillingFirmName]);

  useEffect(() => {
    const firmName = billingFirmDetailQuery.data?.firm_name?.trim();
    if (!invoiceData?.id || !firmName) {
      return;
    }

    if (billingFirmId && form.getValues('billing_firm_id') !== billingFirmId) {
      setValue('billing_firm_id', billingFirmId, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }

    if (form.getValues('billing_firm_name') !== firmName) {
      setValue('billing_firm_name', firmName, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    billingFirmDetailQuery.data?.firm_name,
    billingFirmId,
    form,
    invoiceData?.id,
    setValue,
  ]);

  const autofillRatesForItem = useCallback((
    item: InvoiceItemDataLocal,
    options?: { force?: boolean },
  ): InvoiceItemDataLocal => {
    let changed = false;
    const nextEntries = item.hsnEntries.map((entry) => {
      if (isReturnAsIsEntry(entry)) return entry;
      if (!options?.force && (manuallyEditedRateIdsRef.current.has(entry.id) || !shouldAutofillInvoiceRate(entry.rate))) {
        return entry;
      }

      const pricing = getInvoiceRateCardPricing(
        rateCardEntries,
        item.gaugeItem,
        entry.hsnCode,
        standardSpecifications,
      );
      if (!pricing) {
        return entry;
      }

      const nextRate = String(pricing.netRate);
      if (nextRate === entry.rate &&
        entry.rateCardListRate === pricing.listRate &&
        entry.rateCardDiscountPercentage === pricing.discountPercentage) return entry;

      changed = true;
      return {
        ...entry,
        rate: nextRate,
        rateCardListRate: pricing.listRate,
        rateCardDiscountPercentage: pricing.discountPercentage,
        rateCardDiscountAmount: pricing.discountAmount,
      };
    });

    return changed ? { ...item, hsnEntries: nextEntries } : item;
  }, [rateCardEntries, standardSpecifications]);

  useEffect(() => {
    if (!isDraftInvoice || !hydratedInvoiceId || hydratedInvoiceId !== invoiceData?.id || !Object.keys(rateCardEntries).length) {
      return;
    }

    setInvoiceItemsData((prev) => {
      let changed = false;
      const nextItems = prev.map((item) => {
        const nextItem = autofillRatesForItem(item);
        if (nextItem !== item) {
          changed = true;
        }
        return nextItem;
      });

      return changed ? nextItems : prev;
    });
  }, [autofillRatesForItem, rateCardEntries, hydratedInvoiceId, invoiceData?.id, isDraftInvoice]);

  useEffect(() => {
    const currentInvoiceId = invoiceData?.id;
    if (
      !currentInvoiceId ||
      hydratedInvoiceId !== currentInvoiceId ||
      !isDraftInvoice ||
      !rateCardQuery.isSuccess ||
      reconciledDraftInvoiceIdRef.current === currentInvoiceId
    ) {
      return;
    }

    setInvoiceItemsData((items) => {
      let changed = false;
      const reconciledItems = items.map((item) => {
        let itemChanged = false;
        const hsnEntries = item.hsnEntries.map((entry) => {
          const baselineRate = legacyRateBaselineRef.current[entry.id];
          if (
            baselineRate === undefined ||
            isReturnAsIsEntry(entry) ||
            manuallyEditedRateIdsRef.current.has(entry.id) ||
            entry.rateCardListRate != null ||
            entry.rateCardDiscountPercentage != null
          ) {
            return entry;
          }

          const pricing = getInvoiceRateCardPricing(rateCardEntries, item.gaugeItem, entry.hsnCode, standardSpecifications);
          if (
            !pricing ||
            pricing.discountPercentage <= 0 ||
            !isUnchangedLegacyRateCardListPrice(entry.rate, baselineRate, pricing.listRate)
          ) {
            return entry;
          }

          itemChanged = true;
          return {
            ...entry,
            rate: String(pricing.netRate),
            rateCardListRate: pricing.listRate,
            rateCardDiscountPercentage: pricing.discountPercentage,
            rateCardDiscountAmount: pricing.discountAmount,
          };
        });

        if (itemChanged) changed = true;
        return itemChanged ? { ...item, hsnEntries } : item;
      });

      return changed ? reconciledItems : items;
    });
    reconciledDraftInvoiceIdRef.current = currentInvoiceId;
  }, [
    hydratedInvoiceId,
    invoiceData?.id,
    isDraftInvoice,
    rateCardEntries,
    rateCardQuery.isSuccess,
    standardSpecifications,
  ]);

  const handleHsnSelectionChange = useCallback((gaugeIndex: number, hsnCodes: string[]) => {
    const requestedCodes = Array.from(new Set(hsnCodes.map((code) => code.trim()).filter(Boolean)));
    if (requestedCodes.length === 0) return;

    setInvoiceItemsData((prev) => prev.map((item, index) => {
      if (index !== gaugeIndex) return item;
      const hadReturnAsIs = item.hsnEntries.some((entry) => entry.hsnCode === RETURN_AS_IS_CODE);
      const selectedCodes = requestedCodes.includes(RETURN_AS_IS_CODE)
        ? hadReturnAsIs && requestedCodes.length > 1
          ? requestedCodes.filter((code) => code !== RETURN_AS_IS_CODE)
          : [RETURN_AS_IS_CODE]
        : requestedCodes;
      const quantity = item.hsnEntries[0]?.quantity || 1;
      const existingEntries = new Map(item.hsnEntries.map((entry) => [entry.hsnCode, entry]));
      const seed = String(item.gaugeItem.id || gaugeIndex);
      const hsnEntries = selectedCodes.map((hsnCode, entryIndex) => {
        const existing = existingEntries.get(hsnCode);
        if (existing) return { ...existing, quantity };
        if (hsnCode === RETURN_AS_IS_CODE) return {
          ...createDefaultHsnEntry(`${seed}-${entryIndex}`),
          id: `${seed}-return-as-is-${Date.now()}`,
          hsnCode: RETURN_AS_IS_CODE,
          hsnName: RETURN_AS_IS_LABEL,
          rate: '0',
          quantity,
          lineType: 'return_as_is' as const,
          description: RETURN_AS_IS_LABEL,
          discountType: 'none' as const,
          discountValue: '0',
        };
        const process = getInvoiceProcessFromHsn(hsnCode);
        const hsnName = getInvoiceHsnName(hsnCode);
        return {
          ...createDefaultHsnEntry(`${seed}-${entryIndex}`),
          id: `${seed}-hsn-${hsnCode}-${Date.now()}-${entryIndex}`,
          hsnCode,
          hsnName,
          rate: '',
          quantity,
          lineType: process === 'calibration' ? 'calibration' as const : process === 'repair' ? 'repair' as const : 'custom' as const,
          description: process === 'repair' ? 'Repair / Servicing' : hsnName,
        };
      });
      return autofillRatesForItem({ ...item, hsnEntries });
    }));
  }, [autofillRatesForItem]);

  const handleRemoveItem = useCallback((gaugeIndex: number) => {
    setInvoiceItemsData((prev) => prev.filter((_, index) => index !== gaugeIndex));
  }, []);

  const handleAddManualItem = useCallback(() => {
    setInvoiceItemsData((prev) => [...prev, createManualInvoiceItemData(isGeneratedInvoice)]);
    setPage(1);
  }, [isGeneratedInvoice]);

  const handleAddExistingItem = useCallback((gauge: ExistingGaugeData) => {
    const item = createManualInvoiceItemData(isGeneratedInvoice);
    item.gaugeItem = {
      ...item.gaugeItem,
      master_gauge_id: gauge.id,
      master_gauge_name: gauge.master_gauge || gauge.gauge_type || 'Existing gauge',
      identification_number: gauge.identification_number || '',
      gauge_id: '',
      specifications: gauge.specifications || {},
      specification: formatSpecificationForPrint(gauge.specifications || {}),
      process: gauge.process || 'calibration',
    };
    setInvoiceItemsData((prev) => [...prev, autofillRatesForItem(item)]);
    setExistingGaugeDialogOpen(false);
    setExistingGaugeSearch('');
    setPage(1);
  }, [isGeneratedInvoice, autofillRatesForItem]);

  // Update rate
  const handleRateChange = useCallback((gaugeIndex: number, hsnId: string, rate: string) => {
    manuallyEditedRateIdsRef.current.add(hsnId);
    setInvoiceItemsData((prev) => {
      return prev.map((item, index) => {
        if (index !== gaugeIndex) {
          return item;
        }

        return {
          ...item,
          hsnEntries: item.hsnEntries.map((entry) =>
            entry.id === hsnId ? {
              ...entry,
              rate,
              rateCardListRate: undefined,
              rateCardDiscountPercentage: undefined,
              rateCardDiscountAmount: undefined,
            } : entry
          ),
        };
      });
    });
  }, []);

  // Update quantity
  const handleQuantityChange = useCallback((gaugeIndex: number, quantity: number) => {
    setInvoiceItemsData((prev) => {
      return prev.map((item, index) => {
        if (index !== gaugeIndex) {
          return item;
        }

        return {
          ...item,
          hsnEntries: item.hsnEntries.map((entry) => ({ ...entry, quantity })),
        };
      });
    });
  }, []);

  const handleDiscountChange = useCallback((gaugeIndex: number, hsnId: string, type: 'none' | 'percentage' | 'flat', value: string) => {
    setInvoiceItemsData((prev) => prev.map((item, index) => index !== gaugeIndex ? item : {
      ...item,
      hsnEntries: item.hsnEntries.map((entry) => entry.id !== hsnId ? entry : { ...entry, discountType: type, discountValue: value }),
    }));
  }, []);

  const handleGaugeFieldChange = useCallback((
    gaugeIndex: number,
    field: EditableGaugeField,
    value: string,
  ) => {
    setInvoiceItemsData((prev) => {
      const target = prev[gaugeIndex];
      if (!target) {
        return prev;
      }

      return prev.map((item, index) => {
        if (index !== gaugeIndex) {
          return item;
        }

        const nextGaugeItem = {
          ...item.gaugeItem,
          [field]: value,
          ...(field === 'specification'
            ? { specifications: value ? { value } : {} }
            : {}),
        };

        return autofillRatesForItem({
          ...item,
          gaugeItem: nextGaugeItem,
        }, { force: field === 'specification' });
      });
    });
  }, [autofillRatesForItem]);

  const handleManualGaugeSelect = useCallback((
    gaugeIndex: number,
    gaugeId: string,
    gaugeName: string,
  ) => {
    setInvoiceItemsData((prev) =>
      prev.map((item, index) => {
        if (index !== gaugeIndex) {
          return item;
        }

        return autofillRatesForItem({
          ...item,
          gaugeItem: {
            ...item.gaugeItem,
            gauge_id: '',
            master_gauge_id: gaugeId,
            master_gauge_name: gaugeName,
            source_type: 'manual',
          },
        }, { force: true });
      }),
    );
  }, [autofillRatesForItem]);

  // Validate form data
  const validateData = (requireItems = false): boolean => {
    if (!invoiceItemsData || invoiceItemsData.length === 0) {
      if (requireItems) {
        toast.error('Please add at least one invoice item');
        return false;
      }
      return true;
    }

    for (const itemData of invoiceItemsData) {
      if (
        itemData.isManual &&
        !itemData.gaugeItem.master_gauge_id?.trim()
      ) {
        toast.error('Please select a gauge name for each manual item');
        return false;
      }

      if (!itemData.hsnEntries || itemData.hsnEntries.length === 0) {
        toast.error(`Please add at least one HSN entry for ${itemData.gaugeItem.master_gauge_name}`);
        return false;
      }

      for (const hsnEntry of itemData.hsnEntries) {
        if (isReturnAsIsEntry(hsnEntry)) continue;
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
    if (!formValues.party_id || formValues.party_id.trim() === '') {
      toast.error('Please select party');
      return false;
    }
    if (!formValues.billing_date || formValues.billing_date.trim() === '') {
      toast.error('Please enter billing date');
      return false;
    }

    return true;
  };

  // Calculate subtotal amount
  const subtotalAmount = useMemo(() => {
    const subtotal = invoiceItemsData.reduce(
      (itemSum, itemData) => itemSum + itemData.hsnEntries.reduce((sum, hsnEntry) => {
        const gross = calculateLineAmount(parseFloat(hsnEntry.rate) || 0, hsnEntry.quantity || 1);
        if (!lineMode) return sum + gross;
        const value = Number(hsnEntry.discountValue || 0);
        const discountAmount = hsnEntry.discountType === 'percentage'
          ? calculateLineAmount(gross * value, 0.01)
          : hsnEntry.discountType === 'flat' ? Math.min(gross, value) : 0;
        return sum + Math.max(0, gross - discountAmount);
      }, 0),
      0,
    );
    return Math.round(subtotal * 100) / 100;
  }, [invoiceItemsData, lineMode]);

  const grossSubtotalAmount = useMemo(
    () => invoiceItemsData.reduce(
      (itemSum, itemData) => itemSum + itemData.hsnEntries.reduce(
        (sum, hsnEntry) => sum + calculateLineAmount(parseFloat(hsnEntry.rate) || 0, hsnEntry.quantity || 1),
        0,
      ),
      0,
    ),
    [invoiceItemsData],
  );

  const calibrationGrossSubtotalAmount = useMemo(
    () => invoiceItemsData.reduce(
      (itemSum, itemData) => itemSum + itemData.hsnEntries.reduce((sum, hsnEntry) => {
        const process = getInvoiceProcessFromHsn(hsnEntry.hsnCode);
        return process === 'calibration'
          ? sum + calculateLineAmount(parseFloat(hsnEntry.rate) || 0, hsnEntry.quantity || 1)
          : sum;
      }, 0),
      0,
    ),
    [invoiceItemsData],
  );

  const repairGrossSubtotalAmount = useMemo(
    () => invoiceItemsData.reduce(
      (itemSum, itemData) => itemSum + itemData.hsnEntries.reduce((sum, hsnEntry) => {
        const process = getInvoiceProcessFromHsn(hsnEntry.hsnCode);
        return process === 'repair'
          ? sum + calculateLineAmount(parseFloat(hsnEntry.rate) || 0, hsnEntry.quantity || 1)
          : sum;
      }, 0),
      0,
    ),
    [invoiceItemsData],
  );

  const lineDiscountAmount = Math.max(0, grossSubtotalAmount - subtotalAmount);

  const invoiceTotals = useMemo(
    () =>
      calculateInvoiceTotalsFromPercentage({
        subtotal: subtotalAmount,
        discountBase: lineMode ? undefined : calibrationGrossSubtotalAmount,
        discountPercent: lineMode ? 0 : discount,
        packing,
        courier,
        cgstRate,
        sgstRate,
      }),
    [subtotalAmount, calibrationGrossSubtotalAmount, discount, lineMode, packing, courier, cgstRate, sgstRate],
  );

  const discountAmount = invoiceTotals.discountAmount;
  const taxableAmount = invoiceTotals.taxableAmount;
  const cgstAmount = invoiceTotals.cgstAmount;
  const sgstAmount = invoiceTotals.sgstAmount;
  const finalAmount = invoiceTotals.finalAmount;

  const invoiceSummaryRows = useMemo<InvoiceSummaryCardRow[]>(() => {
    const rows: InvoiceSummaryCardRow[] = [];
    const otherServiceAmount = roundCurrency(
      Math.max(0, grossSubtotalAmount - calibrationGrossSubtotalAmount - repairGrossSubtotalAmount),
    );

    if (lineMode) {
      rows.push({
        key: 'gross-service-amount',
        label: 'Gross Service Amount',
        value: grossSubtotalAmount,
      });

      if (hasCurrencyAmount(lineDiscountAmount)) {
        rows.push({
          key: 'service-discounts',
          label: 'Less: Service Discounts',
          value: -lineDiscountAmount,
          tone: 'negative',
        });
      }
    } else {
      if (hasCurrencyAmount(calibrationGrossSubtotalAmount) || hasCurrencyAmount(discountAmount)) {
        rows.push({
          key: 'calibration-charges',
          label: 'Calibration Charges',
          value: calibrationGrossSubtotalAmount,
        });
      }

      if (hasCurrencyAmount(discountAmount)) {
        rows.push({
          key: 'calibration-discount',
          label: `Less: Calibration Discount (${formatPercentageForLabel(invoiceTotals.discountPercent)}%)`,
          value: -discountAmount,
          tone: 'negative',
        });
        rows.push({
          key: 'net-calibration-charges',
          label: 'Net Calibration Charges',
          value: roundCurrency(Math.max(0, calibrationGrossSubtotalAmount - discountAmount)),
          emphasis: 'subtotal',
        });
      }
    }

    if (!lineMode) {
      if (hasCurrencyAmount(repairGrossSubtotalAmount)) {
        rows.push({
          key: 'repair-servicing-charges',
          label: 'Add: Repair / Servicing Charges',
          value: repairGrossSubtotalAmount,
        });
      }

      if (hasCurrencyAmount(otherServiceAmount)) {
        rows.push({
          key: 'other-service-charges',
          label: 'Add: Other Service Charges',
          value: otherServiceAmount,
        });
      }
    }

    if (!rows.length && hasCurrencyAmount(subtotalAmount)) {
      rows.push({
        key: 'service-charges',
        label: 'Service Charges',
        value: subtotalAmount,
      });
    }

    rows.push({
      key: 'taxable-value',
      label: 'Taxable Value',
      value: taxableAmount,
      emphasis: 'subtotal',
    });

    if (hasCurrencyAmount(packing)) {
      rows.push({
        key: 'packing-forwarding',
        label: 'Add: P&F Charges',
        value: packing,
      });
    }

    if (hasCurrencyAmount(courier)) {
      rows.push({
        key: 'courier-transport',
        label: 'Add: Courier/Transport Charges',
        value: courier,
      });
    }

    if (hasCurrencyAmount(cgstAmount)) {
      rows.push({
        key: 'cgst',
        label: `CGST (${formatPercentageForLabel(cgstRate)}%)`,
        value: cgstAmount,
      });
    }

    if (hasCurrencyAmount(sgstAmount)) {
      rows.push({
        key: 'sgst',
        label: `SGST (${formatPercentageForLabel(sgstRate)}%)`,
        value: sgstAmount,
      });
    }

    rows.push({
      key: 'grand-total',
      label: 'Grand Total',
      value: finalAmount,
      emphasis: 'total',
    });

    return rows;
  }, [
    calibrationGrossSubtotalAmount,
    cgstAmount,
    cgstRate,
    courier,
    discountAmount,
    finalAmount,
    grossSubtotalAmount,
    invoiceTotals.discountPercent,
    lineDiscountAmount,
    lineMode,
    packing,
    repairGrossSubtotalAmount,
    sgstAmount,
    sgstRate,
    subtotalAmount,
    taxableAmount,
  ]);

  // Transform invoiceItemsData to PUT payload format
  const buildInvoicePayload = useCallback((): InvoiceUpdatePayload => {
    const formValues = form.getValues();
    const existingInvoice = invoiceData ?? null;

    // Build billing items from invoiceItemsData
    const billingItems: InvoiceBillingItem[] = invoiceItemsData.map((itemData) => {
      const isManualItem = itemData.isManual === true;
      const sourceType = itemData.gaugeItem.source_type || (isManualItem ? 'manual' : 'outward');
      const billingComponents: InvoiceBillingComponent[] = itemData.hsnEntries.map((hsnEntry) => {
        const returnAsIs = isReturnAsIsEntry(hsnEntry);
        const processType = getInvoiceProcessFromHsn(hsnEntry.hsnCode);
        const rate = returnAsIs ? 0 : parseFloat(hsnEntry.rate) || 0;
        const quantity = hsnEntry.quantity || 1;
        const amount = calculateLineAmount(rate, quantity);
        const discountType = lineMode ? (hsnEntry.discountType || 'none') : 'none';
        const discountValue = lineMode ? Number(hsnEntry.discountValue || 0) : 0;
        const discountAmount = lineMode && discountType === 'percentage'
          ? calculateLineAmount(amount * discountValue, 0.01)
          : lineMode && discountType === 'flat' ? Math.min(amount, discountValue) : 0;

        return {
          process: (returnAsIs ? 'return_as_is' : processType) as 'calibration' | 'repair' | 'inspection' | 'verification' | 'spare_part' | 'return_as_is',
          quantity,
          rate,
          rate_card_list_rate: hsnEntry.rateCardListRate,
          rate_card_discount_percentage: hsnEntry.rateCardDiscountPercentage,
          rate_card_discount_amount: hsnEntry.rateCardDiscountAmount,
          amount,
          service_type: returnAsIs ? 'return_as_is' : processType,
          line_type: returnAsIs ? 'return_as_is' : hsnEntry.lineType || (processType === 'repair' || processType === 'calibration' ? processType : 'custom'),
          return_as_is: returnAsIs,
          description: returnAsIs ? RETURN_AS_IS_LABEL : hsnEntry.description || undefined,
          hsn_sac: returnAsIs ? undefined : hsnEntry.hsnCode,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount,
          net_amount: amount - discountAmount,
        };
      });

      const itemTotal = billingComponents.reduce(
        (sum, comp) => sum + (lineMode ? (comp.net_amount ?? comp.amount) : comp.amount),
        0,
      );

      // Get specifications - handle both object and string formats
      // Ensure specifications is never null - use empty object as fallback
      let specifications: Record<string, unknown> = {};
      const itemSpecs = itemData.gaugeItem.specifications;
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
        ...itemData.sourceItem,
        source_type: sourceType,
        gauge_id: invoiceData?.batch_id && itemData.sourceItem ? itemData.sourceItem.gauge_id : isManualItem
          ? null
          : itemData.gaugeItem.gauge_id || itemData.gaugeItem.id || '',
        inward_id: invoiceData?.batch_id && itemData.sourceItem ? itemData.sourceItem.inward_id : isManualItem ? null : itemData.gaugeItem.inward_id || '',
        master_gauge_id: invoiceData?.batch_id && itemData.sourceItem ? itemData.sourceItem.master_gauge_id : isManualItem
          ? itemData.gaugeItem.master_gauge_id || null
          : String(
              itemData.gaugeItem.master_gauge_id ||
              itemData.gaugeItem.gauge_id ||
              itemData.gaugeItem.id ||
              '',
            ),
        master_gauge_name: itemData.gaugeItem.master_gauge_name || '',
        identification_number: itemData.gaugeItem.identification_number || '',
        inward_gauge_lab_id: itemData.gaugeItem.inward_gauge_lab_id || '',
          specifications: specifications || {}, // Convert null to empty object for payload
          billing_components: billingComponents,
          instrument_quantity: itemData.gaugeItem.instrument_quantity || 1,
          total: itemTotal,
      };
    });

    // Calculate totals
    const subTotal = billingItems.reduce((sum, item) => sum + item.total, 0);
    const calculatedTotals = calculateInvoiceTotalsFromPercentage({
      subtotal: subTotal,
      discountBase: lineMode
        ? undefined
        : billingItems.reduce(
            (sum, item) => sum + item.billing_components.reduce(
              (componentSum, component) => component.process === 'calibration'
                ? componentSum + component.amount
                : componentSum,
              0,
            ),
            0,
          ),
      discountPercent: lineMode ? 0 : formValues.discount,
      packing: formValues.packing,
      courier: formValues.courier,
      cgstRate: formValues.cgst_rate,
      sgstRate: formValues.sgst_rate,
    });

    // Get gauge_inward_ids from invoice data
    const gaugeInwardIds = billingItems
      .filter((item) => item.source_type === 'inward')
      .map((item) => item.inward_id)
      .filter(Boolean);
    const outwardIds = getOutwardIds(existingInvoice);
    const outwardNumbers = getOutwardNumbers(existingInvoice);

    const selectedOrganization =
      organizations.find((organization) => organization.id === formValues.party_id) ?? null;

    // Get client_details with proper structure
    const clientDetails: ClientDetails = {
      name: selectedOrganization?.name || existingInvoice?.client_details?.name || '',
      client_gst_no: selectedOrganization?.gst || existingInvoice?.client_details?.client_gst_no || '',
      address: {
        address_line_1:
          selectedOrganization?.address?.address_line_1 ||
          existingInvoice?.client_details?.address?.address_line_1 ||
          '',
        address_line_2:
          selectedOrganization?.address?.address_line_2 ||
          existingInvoice?.client_details?.address?.address_line_2 ||
          '',
        city:
          selectedOrganization?.address?.city ||
          existingInvoice?.client_details?.address?.city ||
          '',
        state:
          selectedOrganization?.address?.state ||
          existingInvoice?.client_details?.address?.state ||
          '',
        zip_code:
          selectedOrganization?.address?.zip_code ||
          existingInvoice?.client_details?.address?.zip_code ||
          '',
        country:
          selectedOrganization?.address?.country ||
          existingInvoice?.client_details?.address?.country ||
          '',
      },
    };

    // Build invoice_details with proper typing
    const invoiceDetails: InvoiceDetails = {
      billing_items: billingItems,
      sub_total: calculatedTotals.subtotal,
      packing: calculatedTotals.packing,
      courier: calculatedTotals.courier,
      discount: lineMode ? 0 : calculatedTotals.discountAmount,
      discount_mode: lineMode ? 'line' : 'invoice',
      total_discount: billingItems.reduce((sum, item) => sum + item.billing_components.reduce((inner, component) => inner + (component.discount_amount || 0), 0), 0),
      cgst: calculatedTotals.cgstAmount,
      sgst: calculatedTotals.sgstAmount,
      grand_total: calculatedTotals.finalAmount,
      pdf_columns: normalizeInvoicePdfColumns(formValues.pdf_columns),
      pdf_columns_user_configured: formValues.pdf_columns_user_configured,
    };

    // Build payload matching exact API format
    const payload: InvoiceUpdatePayload = {
      batch_id: existingInvoice?.batch_id,
      po_id: existingInvoice?.po_id,
      revision: existingInvoice?.revision,
      archived: existingInvoice?.archived || false,
      billing_firm_id: formValues.billing_firm_id || DEFAULT_BILLING_FIRM_ID,
      billing_firm_name:
        formValues.billing_firm_name ||
        billingFirmDetailQuery.data?.firm_name?.trim() ||
        DEFAULT_BILLING_FIRM_NAME,
      party_id: formValues.party_id || existingInvoice?.party_id || existingInvoice?.client_org_id || '',
      billing_date: formValues.billing_date || formValues.date_of_issue,
      invoice_number: formValues.invoice_number || `INV-${Date.now()}`,
      date_of_issue: formValues.billing_date || formValues.date_of_issue,
      order_number: trimOrNull(formValues.order_number),
      order_date: trimOrNull(formValues.order_date),
      po_number: trimOrNull(formValues.po_number),
      po_date: trimOrNull(formValues.po_date),
      from_date: trimOrNull(formValues.from_date),
      to_date: trimOrNull(formValues.to_date),
      invoice_from_date: trimOrNull(formValues.from_date),
      invoice_to_date: trimOrNull(formValues.to_date),
      credit_days: Number(formValues.credit_days) || 0,
      payment_due_date: existingInvoice?.payment_due_date ?? null,
      payment_date: existingInvoice?.payment_date ?? null,
      payment_mode: existingInvoice?.payment_mode ?? null,
      payment_reference_no: existingInvoice?.payment_reference_no ?? null,
      payment_remarks: existingInvoice?.payment_remarks ?? null,
      status: 'draft',
      client_org_id: formValues.party_id || existingInvoice?.client_org_id || '',
      outward_id: outwardIds[0] ?? null,
      outward_ids: outwardIds,
      outward_no: outwardNumbers[0] ?? trimOrNull(formValues.outward_no),
      outward_nos: outwardNumbers,
      repair_ids: existingInvoice?.repair_ids,
      repair_nos: existingInvoice?.repair_nos,
      gauge_inward_ids: (gaugeInwardIds ?? []).filter((id): id is string => typeof id === 'string'),
      client_details: clientDetails,
      invoice_details: invoiceDetails,
    };

    return payload;
  }, [invoiceItemsData, invoiceData, form, lineMode, organizations, billingFirmDetailQuery.data?.firm_name]);

  const groupedItems = useMemo(() => invoiceItemsData.map((itemData, gaugeIndex) => {
    const calibrationEntry = itemData.hsnEntries.find(
      (entry) => entry.hsnCode !== RETURN_AS_IS_CODE && getInvoiceProcessFromHsn(entry.hsnCode) === 'calibration',
    );
    const repairEntry = itemData.hsnEntries.find(
      (entry) => entry.hsnCode !== RETURN_AS_IS_CODE && getInvoiceProcessFromHsn(entry.hsnCode) === 'repair',
    );
    const otherEntries = itemData.hsnEntries.filter((entry) => entry !== calibrationEntry && entry !== repairEntry);
    const amount = itemData.hsnEntries.reduce((sum, entry) => {
      const gross = calculateLineAmount(entry.rate, entry.quantity);
      if (!lineMode) return sum + gross;
      const value = Number(entry.discountValue || 0);
      const discountAmount = entry.discountType === 'percentage'
        ? calculateLineAmount(gross * value, 0.01)
        : entry.discountType === 'flat' ? Math.min(gross, value) : 0;
      return sum + Math.max(0, gross - discountAmount);
    }, 0);

    return {
      gaugeIndex,
      itemData,
      amount,
      quantity: itemData.hsnEntries[0]?.quantity || 1,
      calibrationEntry,
      repairEntry,
      otherEntries,
    };
  }), [invoiceItemsData, lineMode]);

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return groupedItems.slice(start, end);
  }, [groupedItems, page, rowsPerPage]);

  const totalPages = Math.ceil(groupedItems.length / rowsPerPage);

  const handleCancel = useCallback(() => {
    if (onCancel) onCancel(); else navigate('/billing/invoice');
  }, [navigate, onCancel]);

  const saveDraft = async (
    successMessage = 'Draft saved successfully!',
    options?: { requireItems?: boolean },
  ) => {
    // Validate data first
    if (!validateData(options?.requireItems ?? false)) {
      return false;
    }

    if (!invoiceId) {
      toast.error('Invoice ID not found. Please refresh the page.');
      return false;
    }

    if (!canEditSummaryTotals) {
      toast.error('Only draft or generated invoices can be edited.');
      return false;
    }

    try {
      const invoicePayload = buildInvoicePayload();
      await updateInvoiceMutation.mutateAsync({
        invoiceId,
        data: invoicePayload as Invoice,
      });

      itemBaselineRef.current = JSON.stringify(invoiceItemsData);
      form.reset(form.getValues());
      onDirtyChange?.(false);
      onSaved?.();

      toast.success(successMessage);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice. Please try again.';
      toast.error(errorMessage);
      return false;
    }
  };

  const handleSaveDraft = async () => {
    const saved = await saveDraft(
      isGeneratedInvoice ? 'Generated invoice totals updated successfully!' : 'Draft saved successfully!',
      { requireItems: isGeneratedInvoice },
    );
    if (saved) {
      if (!invoiceIdOverride) navigate('/billing/invoice');
    }
  };

  useImperativeHandle(controlRef, () => ({ save: () => saveDraft('Draft saved successfully!') }));
  useEffect(() => {
    if (hydratedInvoiceId === invoiceId) {
      onDirtyChange?.(form.formState.isDirty || JSON.stringify(invoiceItemsData) !== itemBaselineRef.current);
    }
  }, [form.formState.isDirty, invoiceItemsData, hydratedInvoiceId, invoiceId, onDirtyChange]);

  const handleGenerateInvoice = async () => {
    const saved = await saveDraft('Draft saved. Generating invoice...', {
      requireItems: true,
    });
    if (!saved || !invoiceId) {
      return;
    }

    try {
      await generateInvoiceMutation.mutateAsync(invoiceId);
      toast.success('Invoice generated successfully!');
      onGenerated?.();
      if (!invoiceIdOverride) navigate('/billing/invoice');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoice.';
      toast.error(errorMessage);
    }
  };

  if (invoiceError) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <PageMeta title="Edit Invoice" />
        <Card className="border border-danger-200 bg-danger-50">
          <Card.Content className="p-6">
            <div className="text-sm text-danger-600">
              {(invoiceError as Error).message || 'Failed to load invoice details'}
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (loadingInvoice && !invoiceData) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <PageMeta title="Edit Invoice" />
        <Card className="shadow-sm border border-gray-200">
          <Card.Content className="p-6">
            <PageLoader message="Loading invoice..." />
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <PageMeta title="Edit Invoice" />
        <Card className="border border-danger-200 bg-danger-50">
          <Card.Content className="p-6">
            <div className="text-sm text-danger-600">
              Invoice not found or failed to load.
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <FormDateProvider>
      <PageMeta title="Edit Invoice" />
      <div className="max-w-7xl mx-auto space-y-4">
        <Card className="border border-slate-200 shadow-none">
          <Card.Header className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Edit Invoice</h1>
              </div>
              {invoiceData.batch_id && !invoiceIdOverride && <Button type="button" variant="outline" className="ml-auto" onClick={() => navigate(`/billing/invoice/batch/${invoiceData.batch_id}/edit`)}>Open PO batch</Button>}
            </div>
          </Card.Header>

          <Card.Content className="p-2 lg:p-2">
            <form onSubmit={(event) => event.preventDefault()} className="space-y-2">
              <input type="hidden" {...register('billing_firm_id')} />
              <input type="hidden" {...register('billing_firm_name')} />
              <input type="hidden" {...register('date_of_issue')} />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {invoiceDisplayStatusLabel[invoiceDisplayStatus]}
                    </p>
                    <p className="text-xs text-slate-500">
                      Payment due date: {formatDateForDisplay(invoiceData.payment_due_date)}
                    </p>
                  </div>
                  {isAccountingLocked && (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {isGeneratedInvoice ? 'Core fields locked' : 'Accounting fields locked'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField label="Billing Firm" required>
                    <Input
                      aria-label="Billing Firm"
                      value={billingFirmName}
                      placeholder={billingFirmInputPlaceholder}
                      readOnly
                    />
                  </FormField>

                  <FormField label="Party" required error={errors.party_id?.message}>
                    <Controller
                      control={control}
                      name="party_id"
                      render={({ field }) => (
                        <InvoiceSelect
                          ariaLabel="Party"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          options={organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
                          disabled={organizationsLoading || isAccountingLocked}
                        />
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Invoice No"
                    required
                    error={errors.invoice_number?.message}
                  >
                    <Input
                      aria-label="Invoice Number"
                      placeholder="Enter invoice number"
                      {...register('invoice_number')}
                      readOnly={isAccountingLocked}
                    />
                  </FormField>

                  <FormField
                    label="Billing Date"
                    required
                    error={errors.billing_date?.message}
                  >
                    <Controller
                      name="billing_date"
                      control={control}
                      render={({ field }) => (
                        <InvoiceDatePicker
                          ariaLabel="Billing Date"
                          value={field.value ?? ''}
                          onChange={(nextValue) => {
                            field.onChange(nextValue);
                            setValue('date_of_issue', nextValue, { shouldDirty: true });
                          }}
                          disabled={isAccountingLocked}
                        />
                      )}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <FormField label="Outward No(s)">
                    <Controller
                      control={control}
                      name="outward_no"
                      render={({ field }) => (
                        <Input
                          aria-label="Outward Number"
                          placeholder="Enter outward number"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          readOnly={isAccountingLocked || invoiceOutwardIds.length > 0}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Order No">
                    <Controller
                      control={control}
                      name="order_number"
                      render={({ field }) => (
                        <Input
                          aria-label="Order Number"
                          placeholder="Enter order number"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          readOnly={isAccountingLocked}
                        />
                      )}
                    />
                  </FormField>

                  <FormField label="Order Date">
                    <Controller
                      control={control}
                      name="order_date"
                      render={({ field }) => (
                        <InvoiceDatePicker ariaLabel="Order Date" value={field.value ?? ''} onChange={field.onChange} disabled={isAccountingLocked} />
                      )}
                    />
                  </FormField>

                  <FormField label="PO Number">
                    <Controller control={control} name="po_number" render={({ field }) => (
                      <Input aria-label="PO Number" placeholder="Enter PO number" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} readOnly={isAccountingLocked} />
                    )} />
                  </FormField>

                  <FormField label="PO Date">
                    <Controller control={control} name="po_date" render={({ field }) => (
                      <InvoiceDatePicker ariaLabel="PO Date" value={field.value ?? ''} onChange={field.onChange} disabled={isAccountingLocked} />
                    )} />
                  </FormField>

                  <FormField label="From Date">
                    <Controller
                      control={control}
                      name="from_date"
                      render={({ field }) => (
                        <InvoiceDatePicker ariaLabel="From Date" value={field.value ?? ''} onChange={field.onChange} disabled={isAccountingLocked} />
                      )}
                    />
                  </FormField>

                  <FormField label="To Date">
                    <Controller
                      control={control}
                      name="to_date"
                      render={({ field }) => (
                        <InvoiceDatePicker ariaLabel="To Date" value={field.value ?? ''} onChange={field.onChange} disabled={isAccountingLocked} />
                      )}
                    />
                  </FormField>

                  <FormField label="Payment Terms">
                    <Controller
                      control={control}
                      name="credit_days"
                      render={({ field }) => (
                        <InvoiceSelect
                          ariaLabel="Payment Terms"
                          value={String(field.value ?? 0)}
                          onChange={(value) => field.onChange(Number(value || 0))}
                          options={PAYMENT_TERMS.map((term) => ({ value: String(term.creditDays), label: term.label }))}
                          disabled={isAccountingLocked}
                        />
                      )}
                    />
                  </FormField>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-slate-900">PDF Columns</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {INVOICE_PDF_OPTIONAL_COLUMN_OPTIONS.map((option) => (
                      <Checkbox
                        key={option.key}
                        isSelected={Boolean(pdfColumns[option.key])}
                        isDisabled={!canEditSummaryTotals}
                        onChange={(isSelected) => {
                          setValue(
                            'pdf_columns',
                            {
                              ...pdfColumns,
                              [option.key]: isSelected,
                            },
                            { shouldDirty: true, shouldValidate: true },
                          );
                          setValue('pdf_columns_user_configured', true, { shouldDirty: true });
                        }}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Label>{option.label}</Label>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </div>
                </div>
              </div>

              <InvoiceItemsBillingTable
                rows={paginatedItems}
                totalRows={groupedItems.length}
                loading={loadingInvoice}
                page={page}
                rowsPerPage={rowsPerPage}
                totalPages={totalPages}
                onPageChange={setPage}
                onRowsPerPageChange={(value) => {
                  setRowsPerPage(value);
                  setPage(1);
                }}
                onAddItem={invoiceData.batch_id ? () => toast.error('Add mapped items from the PO batch review.') : handleAddManualItem}
                onAddExistingItem={() => invoiceData.batch_id ? toast.error('Add mapped items from the PO batch review.') : setExistingGaugeDialogOpen(true)}
                onHsnSelectionChange={handleHsnSelectionChange}
                onRemoveItem={handleRemoveItem}
                onRateChange={handleRateChange}
                onQuantityChange={handleQuantityChange}
                onDiscountChange={lineMode ? handleDiscountChange : undefined}
                onGaugeFieldChange={handleGaugeFieldChange}
                onManualGaugeSelect={handleManualGaugeSelect}
                isReadOnly={!canEditInvoiceLines}
              />

              <Modal.Root
                isOpen={existingGaugeDialogOpen}
                onOpenChange={(open) => {
                  setExistingGaugeDialogOpen(open);
                  if (!open) setExistingGaugeSearch('');
                }}
              >
                <Modal.Backdrop variant="opaque">
                  <Modal.Container size="lg" scroll="inside">
                    <Modal.Dialog>
                      <Modal.Header>
                        <Modal.Heading>Add Existing Gauge</Modal.Heading>
                        <Modal.CloseTrigger aria-label="Close existing gauge dialog" />
                      </Modal.Header>
                      <Modal.Body>
                        <p className="text-sm text-slate-500">Select a gauge already registered for this customer.</p>
                        <Input
                          aria-label="Search existing gauges"
                          placeholder="Search by gauge name or identification number"
                          value={existingGaugeSearch}
                          onChange={(event) => setExistingGaugeSearch(event.target.value)}
                        />
                        <div className="max-h-80 overflow-y-auto">
                          {existingGaugesLoading ? <div className="py-4 text-sm text-slate-500">Loading gauges...</div> : (
                            <ListBox aria-label="Existing customer gauges">
                              {existingGauges.filter((gauge) => `${gauge.master_gauge} ${gauge.gauge_type} ${gauge.identification_number}`.toLowerCase().includes(existingGaugeSearch.toLowerCase())).map((gauge) => (
                                <ListBox.Item key={gauge.id} id={gauge.id} textValue={`${gauge.master_gauge || gauge.gauge_type} ${gauge.identification_number || ''}`} onAction={() => handleAddExistingItem(gauge)}>
                                  <div className="flex w-full items-center justify-between gap-4">
                                    <span className="font-medium text-slate-800">{gauge.master_gauge || gauge.gauge_type}</span>
                                    <span className="text-sm text-slate-500">{gauge.identification_number || 'No identification number'}</span>
                                  </div>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          )}
                          {!existingGaugesLoading && existingGauges.length === 0 && <div className="py-4 text-sm text-slate-500">No registered gauges found for this customer.</div>}
                        </div>
                      </Modal.Body>
                      <Modal.Footer>
                        <Button type="button" variant="outline" onClick={() => setExistingGaugeDialogOpen(false)}>Cancel</Button>
                      </Modal.Footer>
                    </Modal.Dialog>
                  </Modal.Container>
                </Modal.Backdrop>
              </Modal.Root>

              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
                    {!lineMode && <FormField label="Discount (%)">
                      <Controller
                        name="discount"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            aria-label="Discount Percentage"
                            value={field.value.toString()}
                            onChange={(e) =>
                              field.onChange(clampPercentage(parseFloat(e.target.value) || 0))
                            }
                            min="0"
                            step="0.01"
                            max="100"
                            readOnly={!canEditSummaryTotals}
                          />
                        )}
                      />
                    </FormField>}

                    <FormField label="CGST (%)">
                      <Controller
                        name="cgst_rate"
                        control={control}
                        render={({ field }) => (
                          <InvoiceSelect
                            ariaLabel="CGST"
                            value={field.value.toString()}
                            onChange={(value) => field.onChange(parseFloat(value || '0'))}
                            options={[0, 5, 9, 12, 18, 28].map((rate) => ({ value: rate.toString(), label: `${rate}%` }))}
                            disabled={!canEditSummaryTotals}
                          />
                        )}
                      />
                    </FormField>

                    <FormField label="SGST (%)">
                      <Controller
                        name="sgst_rate"
                        control={control}
                        render={({ field }) => (
                          <InvoiceSelect
                            ariaLabel="SGST"
                            value={field.value.toString()}
                            onChange={(value) => field.onChange(parseFloat(value || '0'))}
                            options={[0, 5, 9, 12, 18, 28].map((rate) => ({ value: rate.toString(), label: `${rate}%` }))}
                            disabled={!canEditSummaryTotals}
                          />
                        )}
                      />
                    </FormField>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Invoice Summary</h2>
                        <p className="text-xs text-slate-500">Review billing totals before saving</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-sm">
                      {invoiceSummaryRows.map((row) => {
                        const isTotal = row.emphasis === 'total';
                        const isSubtotal = row.emphasis === 'subtotal';
                        const labelClassName = isTotal || isSubtotal
                          ? 'font-semibold text-slate-900'
                          : 'text-slate-600';
                        const valueClassName = row.tone === 'negative'
                          ? 'font-semibold text-red-600'
                          : isTotal
                            ? 'text-xl font-bold text-blue-700'
                            : isSubtotal
                              ? 'font-semibold text-slate-900'
                              : 'font-medium text-slate-800';

                        return (
                          <div
                            key={row.key}
                            className={`flex items-center justify-between gap-4 ${
                              isTotal ? 'mt-1 border-t border-slate-200 pt-3' : ''
                            }`}
                          >
                            <span className={isTotal ? 'text-base font-semibold text-slate-900' : labelClassName}>
                              {row.label}
                            </span>
                            <span className={`${valueClassName} ${MONEY_TEXT_CLASS}`}>
                              {formatSignedCurrency(row.value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        {isDraftInvoice ? 'Cancel' : 'Back'}
                      </Button>
                      {isDraftInvoice && (
                        <>
                          <Button
                            type="button"
                            loading={updateInvoiceMutation.isPending}
                            onClick={form.handleSubmit(handleSaveDraft)}
                            className="bg-slate-700 text-white"
                          >
                            Save Draft
                          </Button>
                          <Button
                            type="button"
                            loading={updateInvoiceMutation.isPending || generateInvoiceMutation.isPending}
                            onClick={form.handleSubmit(handleGenerateInvoice)}
                            className="bg-blue-600 text-white"
                          >
                            Generate Invoice
                          </Button>
                        </>
                      )}
                      {isGeneratedInvoice && (
                        <Button
                          type="button"
                          loading={updateInvoiceMutation.isPending}
                          onClick={form.handleSubmit(handleSaveDraft)}
                          className="bg-blue-600 text-white"
                        >
                          Save Changes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </FormDateProvider>
  );
}

export default function EditInvoicePage() { return <InvoiceEditor />; }
