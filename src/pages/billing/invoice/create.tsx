import { z } from 'zod';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { parseDate } from '@internationalized/date';
import { UserIcon } from '@heroicons/react/24/outline';
import {
  Autocomplete,
  SearchField,
  Calendar,
  Card,
  Checkbox,
  Chip,
  DateField,
  DatePicker,
  Input,
  Label,
  ListBox,
  Select,
} from '@heroui/react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { FormDateProvider } from '../../../components/form/FormDateProvider';
import { FormField } from '../../../components/ui/form-field';
import { PageMeta } from '../../../components/common/PageMeta';
import { useOrganizationsQuery } from '../../../hooks/queries/organizations';
import { useOutwardEntriesQuery } from '../../../hooks/queries/outwards';
import { useClientRepairsQuery } from '../../../hooks/queries/repairs';
import { useCustomerPos, useCreatePoBatch, useBillingAvailability, type PoAssignment, type PoAllocationIssue, type PoBatchRequest } from '../../../hooks/queries/poInvoicing';
import { ApiError } from '../../../services/api';
import { useCreateInvoiceMutation } from '../../../hooks/queries/invoices';
import { useAccountDetailsQuery } from '../../../hooks/queries/accountDetails';
import {
  createInvoiceHeaderFormSchema,
  type CreateInvoiceHeaderFormData,
} from '../../../lib/validations/invoiceSchemas';
import {
  DEFAULT_INVOICE_PDF_COLUMNS,
  INVOICE_PDF_OPTIONAL_COLUMN_OPTIONS,
  normalizeInvoicePdfColumns,
} from '../../../utils/invoicePdfColumns';
import { PAYMENT_TERMS } from '../../../utils/invoiceLifecycle';
import { getCurrentIsoDate } from '../../../utils/dateAdapter';

const EMPTY_ORGANIZATIONS: Array<{ id: string; name: string }> = [];

const filterOptions = (text: string, query: string) => text.toLocaleLowerCase().includes(query.toLocaleLowerCase());

type Option = { value: string; label: string };

const V3Select = ({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: Option[]; ariaLabel: string }) => (
  <Select aria-label={ariaLabel} selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')}>
    <Select.Trigger className={`h-10 min-h-10 rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${value ? '!bg-slate-100' : '!bg-white'}`}><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const V3Autocomplete = ({ value, onChange, options, placeholder, ariaLabel, disabled = false }: { value: string | null; onChange: (value: string | null) => void; options: Option[]; placeholder: string; ariaLabel: string; disabled?: boolean }) => (
  <Autocomplete aria-label={ariaLabel} placeholder={placeholder} selectedKey={value} onSelectionChange={(key) => onChange(key ? String(key) : null)} isDisabled={disabled}>
    <Autocomplete.Trigger className={`h-10 min-h-10 rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${value ? '!bg-slate-100' : '!bg-white'}`}>
      <Autocomplete.Value />
      <Autocomplete.Indicator />
    </Autocomplete.Trigger>
    <Autocomplete.Popover>
      <Autocomplete.Filter filter={filterOptions}><SearchField><SearchField.Group><SearchField.Input aria-label={`Search ${ariaLabel}`} placeholder="Search..." /></SearchField.Group></SearchField>
      <ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Autocomplete.Filter>
    </Autocomplete.Popover>
  </Autocomplete>
);

const V3DatePicker = ({ value, onChange, ariaLabel }: { value?: string; onChange: (value: string) => void; ariaLabel: string }) => (
  <DatePicker value={value ? parseDate(value) : null} onChange={(date) => onChange(date ? String(date) : '')}>
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

export default function CreateInvoicePage() {
  const navigate = useNavigate();
  const createInvoiceMutation = useCreateInvoiceMutation();
  const batchMutation = useCreatePoBatch();
  const batchRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [poIssues, setPoIssues] = useState<PoAllocationIssue[]>([]);
  const [poAssignments, setPoAssignments] = useState<Record<string, PoAssignment>>({});
  const [excludedSourceKeys, setExcludedSourceKeys] = useState<string[]>([]);

  const organizationsQuery = useOrganizationsQuery({ directory: 'customers' });
  const organizations = organizationsQuery.data?.organizations ?? EMPTY_ORGANIZATIONS;
  const organizationsLoading = organizationsQuery.isLoading || organizationsQuery.isFetching;
  const accountDetailsQuery = useAccountDetailsQuery();
  const accountDetails = accountDetailsQuery.data?.accountDetails ?? [];
  const billingFirmsLoading = accountDetailsQuery.isLoading || accountDetailsQuery.isFetching;

  const form = useForm<
    z.input<typeof createInvoiceHeaderFormSchema>,
    unknown,
    z.output<typeof createInvoiceHeaderFormSchema>
  >({
    resolver: zodResolver(createInvoiceHeaderFormSchema),
    defaultValues: {
      billing_firm_id: '',
      billing_firm_name: '',
      party_id: '',
      billing_date: getCurrentIsoDate(),
      outward_no: '',
      outward_ids: [],
      outward_nos: [],
      repair_ids: [],
      repair_nos: [],
      order_number: '',
      order_date: '',
      po_number: '',
      po_date: '',
      from_date: '',
      to_date: '',
      credit_days: 0,
      pdf_columns: DEFAULT_INVOICE_PDF_COLUMNS,
      pdf_columns_user_configured: false,
    },
    mode: 'onChange',
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const pdfColumns = normalizeInvoicePdfColumns(watch('pdf_columns'));
  const selectedPartyId = watch('party_id');
  const posQuery = useCustomerPos(selectedPartyId);
  const poMode = Boolean((watch('outward_ids') ?? []).length && posQuery.data?.items.some(po => po.status === 'active'));
  const repairOnly = (watch('outward_ids') ?? []).length === 0 && (watch('repair_ids') ?? []).length > 0;
  const availabilityQuery = useBillingAvailability(poMode ? selectedPartyId : undefined);
  const submitting = createInvoiceMutation.isPending || batchMutation.isPending;
  const outwardEntriesQuery = useOutwardEntriesQuery({
    enabled: Boolean(selectedPartyId) && !posQuery.isLoading && !posQuery.isError,
    organizationId: selectedPartyId,
    limit: 500,
    searchAll: true,
    excludeInvoiced: !poMode,
  });
  const outwardEntries = outwardEntriesQuery.data ?? [];
  const repairsQuery = useClientRepairsQuery(selectedPartyId, { enabled: Boolean(selectedPartyId), limit: 500 });
  const repairEntries = (repairsQuery.data ?? []).filter(repair => repair.client_org_id === selectedPartyId && !repair.archived);

  const getOutwardNumbers = (outwardIds: string[]) =>
    outwardIds
      .map((outwardId) => outwardEntries.find((outward) => outward.id === outwardId)?.outward_no)
      .filter((outwardNo): outwardNo is string | number => outwardNo !== undefined && outwardNo !== null)
      .map(String);

  const resetPoResolution = () => {
    setBatchError(null);
    setPoIssues([]);
    setPoAssignments({});
    setExcludedSourceKeys([]);
    batchRequest.current = null;
  };

  const onSubmit = async (data: CreateInvoiceHeaderFormData) => {
    setBatchError(null);
    try {
      if (posQuery.isLoading) { toast.error('Customer PO mappings are still loading.'); return; }
      if (posQuery.error) { toast.error(posQuery.error.message); return; }
      if (poMode) {
        if (!data.outward_ids.length && !data.repair_ids.length) {
          toast.error('Select at least one Outward or Repair number.'); return;
        }
        if (!posQuery.data?.items.some(po => po.status === 'active')) {
          toast.error('This customer has no active PO. Open or create a PO on the Rate Card first.'); return;
        }
        const request: PoBatchRequest = {
          client_org_id: data.party_id, billing_firm_id: data.billing_firm_id, billing_date: data.billing_date,
          outward_ids: data.outward_ids, repair_ids: data.repair_ids,
          order_number: data.order_number?.trim() || null, order_date: data.order_date?.trim() || null,
          from_date: data.from_date?.trim() || null, to_date: data.to_date?.trim() || null,
          credit_days: data.credit_days, discount_mode: 'line', pdf_columns: normalizeInvoicePdfColumns(data.pdf_columns),
          pdf_columns_user_configured: data.pdf_columns_user_configured,
          assignments: Object.values(poAssignments), excluded_source_keys: excludedSourceKeys,
        };
        const fingerprint = JSON.stringify(request);
        if (batchRequest.current?.fingerprint !== fingerprint) batchRequest.current = { fingerprint, id: crypto.randomUUID() };
        const batch = await batchMutation.mutateAsync({ ...request, request_id: batchRequest.current.id });
        navigate(`/billing/invoice/batch/${batch.id}/edit`); return;
      }
      const selectedOutwardNumbers = getOutwardNumbers(data.outward_ids);
      const selectedRepairNumbers = data.repair_ids.map(id => repairEntries.find(repair => (repair.id || repair.repair_id) === id)?.repair_no).filter((value): value is string => Boolean(value));

      const invoice = await createInvoiceMutation.mutateAsync({
        billing_firm_id: data.billing_firm_id,
        billing_firm_name: data.billing_firm_name,
        party_id: data.party_id,
        client_org_id: data.party_id,
        billing_date: data.billing_date,
        date_of_issue: data.billing_date,
        outward_ids: data.outward_ids,
        outward_nos: selectedOutwardNumbers.length > 0 ? selectedOutwardNumbers : data.outward_nos,
        gauge_inward_ids: [],
        repair_ids: data.repair_ids,
        repair_nos: selectedRepairNumbers,
        order_number: data.order_number?.trim() || null,
        order_date: data.order_date?.trim() || null,
        po_number: repairOnly ? null : data.po_number?.trim() || null,
        po_date: repairOnly ? null : data.po_date?.trim() || null,
        from_date: data.from_date?.trim() || null,
        to_date: data.to_date?.trim() || null,
        status: 'draft',
        discount_mode: 'line',
        credit_days: data.credit_days,
        pdf_columns: normalizeInvoicePdfColumns(data.pdf_columns),
        pdf_columns_user_configured: data.pdf_columns_user_configured,
      });

      toast.success('Draft invoice created successfully!');
      navigate(`/billing/invoice/${invoice.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create invoice draft';
      if (poMode) {
        setBatchError(message);
        const detail = error instanceof ApiError && error.status === 422 ? error.details?.response?.detail : null;
        setPoIssues(Array.isArray(detail?.unresolved) ? detail.unresolved : []);
        toast.error('PO drafts were not created. Review the allocation details below.');
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <FormDateProvider>
      <PageMeta title="Create Invoice" />
      <div className="max-w-7xl mx-auto space-y-4">
        <Card className="border border-slate-200 shadow-none">
          <Card.Header className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Create Invoice</h1>
              </div>
            </div>
          </Card.Header>

          <Card.Content className="p-4 lg:p-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register('billing_firm_id')} />
              <input type="hidden" {...register('billing_firm_name')} />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <FormField label="Billing From" required>
                  <Controller
                    control={control}
                    name="billing_firm_id"
                    render={({ field }) => (
                      <V3Autocomplete
                        ariaLabel="Billing Firm"
                        placeholder={billingFirmsLoading ? 'Loading billing firms...' : 'Select billing firm'}
                        value={field.value || null}
                        onChange={(key) => {
                          const selected = key ? String(key) : '';
                          const selectedFirm = accountDetails.find((account) => account.id === selected);
                          field.onChange(selected);
                          setValue('billing_firm_name', selectedFirm?.firm_name || '', {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        disabled={billingFirmsLoading}
                        options={accountDetails.map((account) => ({ value: account.id, label: account.firm_name }))}
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label="Billing To"
                  required
                  error={errors.party_id?.message}
                >
                  <Controller
                    control={control}
                    name="party_id"
                    render={({ field }) => (
                      <V3Autocomplete
                        ariaLabel="Party"
                        placeholder={organizationsLoading ? 'Loading customers...' : 'Select customer'}
                        value={field.value || null}
                        onChange={(key) => {
                          const selected = key ? String(key) : '';
                          resetPoResolution();
                          field.onChange(selected);
                          setValue('outward_ids', [], { shouldDirty: true, shouldValidate: true });
                          setValue('outward_nos', [], { shouldDirty: true, shouldValidate: true });
                          setValue('repair_ids', [], { shouldDirty: true, shouldValidate: true });
                          setValue('repair_nos', [], { shouldDirty: true, shouldValidate: true });
                        }}
                        disabled={organizationsLoading}
                        options={organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
                      />
                    )}
                  />
                </FormField>

                <FormField
                  label="Billing Date"
                  required
                  error={errors.billing_date?.message}
                  className="md:max-w-sm"
                >
                  <Controller
                    control={control}
                    name="billing_date"
                    render={({ field }) => (
                      <V3DatePicker ariaLabel="Billing Date" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormField label="Outward Numbers">
                  <Controller
                    control={control}
                    name="outward_ids"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Autocomplete aria-label="Outward Numbers" placeholder={!selectedPartyId ? 'Select customer first' : 'Select outward number'} selectedKey={null} isDisabled={!selectedPartyId || outwardEntriesQuery.isLoading || outwardEntriesQuery.isFetching} onSelectionChange={(key) => {
                            if (!key) return;

                            const outwardId = String(key);
                            resetPoResolution();
                            const nextOutwardIds = Array.from(
                              new Set([...(field.value ?? []), outwardId]),
                            );
                            field.onChange(nextOutwardIds);
                            setValue('outward_nos', getOutwardNumbers(nextOutwardIds), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                        >
                          <Autocomplete.Trigger>
                            <Autocomplete.Value />
                            <Autocomplete.Indicator />
                          </Autocomplete.Trigger>
                          <Autocomplete.Popover>
                            <Autocomplete.Filter filter={filterOptions}><SearchField><SearchField.Group><SearchField.Input aria-label="Search outward numbers" placeholder="Search..." /></SearchField.Group></SearchField>
                            <ListBox>
                            {outwardEntries
                              .filter((outward) => !(field.value ?? []).includes(outward.id))
                              .map((outward) => {
                                const availability = availabilityQuery.data?.outwards[outward.id];
                                const isFullyBilled = poMode && availability?.available === 0;
                                return <ListBox.Item key={outward.id} id={outward.id} isDisabled={isFullyBilled} textValue={`Outward ${String(outward.outward_no ?? outward.id)} ${outward.outward_date ?? ''}`}>
                                  {String(outward.outward_no ?? outward.id)}{outward.outward_date ? ` · ${outward.outward_date}` : ''}{poMode && availability ? ` · ${availability.available} available · ${availability.reserved} in drafts · ${availability.invoiced} invoiced` : ''}{isFullyBilled ? ' · Fully billed' : ''}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>;
                              })}
                            </ListBox></Autocomplete.Filter>
                          </Autocomplete.Popover>
                        </Autocomplete>

                        {(field.value ?? []).length > 0 && (
                          <div className="flex flex-wrap gap-2" aria-label="Selected outward numbers">
                            {(field.value ?? []).map((outwardId) => {
                              const outward = outwardEntries.find((entry) => entry.id === outwardId);
                              const outwardNumber = String(outward?.outward_no ?? outwardId);

                              return (
                                <Chip
                                  key={outwardId}
                                  size="sm"
                                  variant="soft"
                                  color="accent"
                                  onClick={() => {
                                    resetPoResolution();
                                    const nextOutwardIds = (field.value ?? []).filter(
                                      (id) => id !== outwardId,
                                    );
                                    field.onChange(nextOutwardIds);
                                    setValue('outward_nos', getOutwardNumbers(nextOutwardIds), {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="max-w-full"
                                >
                                  <span className="block max-w-[200px] truncate">{outwardNumber}</span>
                                  <button type="button" aria-label={`Remove outward ${outwardNumber}`} className="ml-1" onClick={(event) => { event.stopPropagation(); resetPoResolution(); const nextOutwardIds = (field.value ?? []).filter((id) => id !== outwardId); field.onChange(nextOutwardIds); setValue('outward_nos', getOutwardNumbers(nextOutwardIds), { shouldDirty: true, shouldValidate: true }); }}>x</button>
                                </Chip>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  />
                </FormField>

                <FormField label="Repair Numbers">
                  <Controller control={control} name="repair_ids" render={({ field }) => <div className="space-y-2">
                    <Autocomplete allowsEmptyCollection aria-label="Repair Numbers" placeholder={!selectedPartyId ? 'Select customer first' : 'Select repair number'} selectedKey={null} isDisabled={!selectedPartyId} onSelectionChange={key => {
                      if (!key) return;
                      resetPoResolution();
                      const next = [...new Set([...(field.value ?? []), String(key)])];
                      field.onChange(next);
                      setValue('repair_nos', next.map(id => repairEntries.find(repair => (repair.id || repair.repair_id) === id)?.repair_no).filter((value): value is string => Boolean(value)), { shouldDirty: true });
                    }}>
                      <Autocomplete.Trigger><Autocomplete.Value /><Autocomplete.Indicator /></Autocomplete.Trigger>
                      <Autocomplete.Popover><Autocomplete.Filter filter={filterOptions}><SearchField><SearchField.Group><SearchField.Input aria-label="Search repair numbers" placeholder="Search..." /></SearchField.Group></SearchField><ListBox>
                        {repairsQuery.isLoading && <ListBox.Item id="loading-repairs" isDisabled>Loading repairs...</ListBox.Item>}
                        {repairEntries.filter(repair => !(field.value ?? []).includes(String(repair.id || repair.repair_id))).map(repair => <ListBox.Item key={String(repair.id || repair.repair_id)} id={String(repair.id || repair.repair_id)} textValue={String(repair.repair_no || repair.id)}>{repair.repair_no || repair.id}<ListBox.ItemIndicator /></ListBox.Item>)}
                      </ListBox></Autocomplete.Filter></Autocomplete.Popover>
                    </Autocomplete>
                    {repairsQuery.isError && <p role="alert" className="text-sm text-red-600">Unable to load repair numbers. <button type="button" className="underline" onClick={() => void repairsQuery.refetch()}>Retry</button></p>}
                    {selectedPartyId && repairsQuery.isSuccess && !repairEntries.length && <p className="text-sm text-slate-500">No repairs available for this customer.</p>}
                    <div className="flex flex-wrap gap-2">{(field.value ?? []).map(id => <Chip key={id} size="sm" variant="soft" color="accent"><span>{repairEntries.find(repair => (repair.id || repair.repair_id) === id)?.repair_no || id}</span><button type="button" aria-label={`Remove repair ${id}`} className="ml-1" onClick={() => { resetPoResolution(); const next = (field.value ?? []).filter(value => value !== id); field.onChange(next); setValue('repair_nos', next.map(value => repairEntries.find(repair => (repair.id || repair.repair_id) === value)?.repair_no).filter((item): item is string => Boolean(item)), { shouldDirty: true }); }}>×</button></Chip>)}</div>
                  </div>} />
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
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    )}
                  />
                </FormField>

                <FormField label="Order Date">
                  <Controller
                    control={control}
                    name="order_date"
                    render={({ field }) => (
                      <V3DatePicker ariaLabel="Order Date" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>
                {!poMode && !repairOnly && <FormField label="PO Number">
                  <Controller control={control} name="po_number" render={({ field }) => (
                    <Input aria-label="PO Number" placeholder="Enter PO number" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  )} />
                </FormField>}
                {!poMode && !repairOnly && <FormField label="PO Date">
                  <Controller control={control} name="po_date" render={({ field }) => (
                    <V3DatePicker ariaLabel="PO Date" value={field.value} onChange={field.onChange} />
                  )} />
                </FormField>}
              </div>

              {poMode && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-slate-700">
                <strong>PO invoice drafts</strong> · {posQuery.data?.items.filter(po => po.status === 'active').length} active PO groups. Selected items will be allocated using the customer’s Rate Card mappings and reviewed in separate invoice tabs.
                {!posQuery.data?.items.some(po => po.status === 'active') && <p className="mt-1 text-amber-700">No active PO. Open or create a PO on the Rate Card first.</p>}
                {(watch('outward_ids') ?? []).map(id => { const availability = availabilityQuery.data?.outwards[id]; if (!availability) return null;
                  const invoices = [...new Map(availability.items.filter(item => item.invoice?.invoice_id).map(item => [item.invoice!.invoice_id, item.invoice!])).values()];
                  return <p key={id}>{getOutwardNumbers([id])[0] || id}: {availability.available} available · {availability.reserved} in drafts · {availability.invoiced} invoiced
                    {invoices.map(invoice => <button key={invoice.invoice_id} type="button" className="ml-2 text-blue-700 underline" onClick={() => navigate(`/billing/invoice/${invoice.invoice_id}/edit`)}>{invoice.invoice_number}</button>)}
                  </p>;
                })}
              </div>}
              {poMode && batchError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                <strong>PO drafts were not created</strong>
                <p className="mt-1 whitespace-pre-line">{batchError}</p>
                {poIssues.length > 0 && <div className="mt-3 max-h-80 space-y-3 overflow-y-auto">
                  {poIssues.map((issue) => {
                    const excluded = excludedSourceKeys.includes(issue.source_key);
                    const selected = poAssignments[issue.source_key];
                    const selectedIndex = selected ? issue.options.findIndex((option) => option.po_id === selected.po_id && option.price_list_item_id === selected.price_list_item_id) : -1;
                    return <div key={issue.source_key} className="rounded-md border border-red-200 bg-white p-3">
                      <p className="font-medium">{issue.label}{issue.source ? ` · Source ${issue.source}` : ''}</p>
                      <p className="mt-1 text-xs">{issue.reason}</p>
                      {issue.options.length > 0 && <select
                        aria-label={`PO allocation for ${issue.label}`}
                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                        value={selectedIndex < 0 ? '' : String(selectedIndex)}
                        disabled={excluded}
                        onChange={(event) => {
                          const option = issue.options[Number(event.target.value)];
                          setPoAssignments((current) => {
                            const next = { ...current };
                            if (event.target.value && option) next[issue.source_key] = { source_key: issue.source_key, po_id: option.po_id, price_list_item_id: option.price_list_item_id };
                            else delete next[issue.source_key];
                            return next;
                          });
                          if (option) setExcludedSourceKeys((current) => current.filter((key) => key !== issue.source_key));
                        }}
                      >
                        <option value="">Choose PO and Price List row</option>
                        {issue.options.map((option, index) => <option key={`${option.po_id}:${option.price_list_item_id}`} value={String(index)}>{option.po_number} · {option.label || option.price_list_item_id}</option>)}
                      </select>}
                      <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={excluded} onChange={(event) => {
                          setExcludedSourceKeys((current) => event.target.checked ? [...new Set([...current, issue.source_key])] : current.filter((key) => key !== issue.source_key));
                          if (event.target.checked) setPoAssignments((current) => { const next = { ...current }; delete next[issue.source_key]; return next; });
                        }} />
                        Exclude this item from this batch; it remains available for later invoicing
                      </label>
                    </div>;
                  })}
                </div>}
                {selectedPartyId && <Button type="button" variant="outline" className="mt-3" onClick={() => navigate(`/masters/party-master/${selectedPartyId}/rate-card`)}>Open customer Rate Card</Button>}
              </div>}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <FormField label="From Date">
                  <Controller
                    control={control}
                    name="from_date"
                    render={({ field }) => (
                      <V3DatePicker ariaLabel="From Date" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="To Date">
                  <Controller
                    control={control}
                    name="to_date"
                    render={({ field }) => (
                      <V3DatePicker ariaLabel="To Date" value={field.value} onChange={field.onChange} />
                    )}
                  />
                </FormField>

                <FormField label="Payment Terms / Credit Period">
                  <Controller
                    control={control}
                    name="credit_days"
                    render={({ field }) => (
                      <V3Select ariaLabel="Payment Terms" value={String(field.value ?? 0)} onChange={(value) => field.onChange(Number(value))} options={PAYMENT_TERMS.map((term) => ({ value: String(term.creditDays), label: term.label }))} />
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
                      onChange={(isSelected) => {
                        setValue(
                          'pdf_columns',
                          {
                            ...pdfColumns,
                            [option.key]: isSelected,
                          },
                          { shouldDirty: true, shouldValidate: true },
                        );
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

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/billing/invoice')}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={submitting || (poMode && !posQuery.data?.items.some(po => po.status === 'active'))}
                  loading={submitting}
                >
                  {poMode ? 'Create Invoice Drafts' : 'Create Invoice'}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </FormDateProvider>
  );
}
