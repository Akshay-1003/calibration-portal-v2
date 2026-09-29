import { useState } from 'react';
import { z } from 'zod';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { parseDate } from '@internationalized/date';
import { UserIcon } from '@heroicons/react/24/outline';
import {
  Autocomplete,
  Calendar,
  Card,
  Checkbox,
  Chip,
  DateField,
  DatePicker,
  Input,
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

type Option = { value: string; label: string };

const V3Select = ({ value, onChange, options, ariaLabel }: { value: string; onChange: (value: string) => void; options: Option[]; ariaLabel: string }) => (
  <Select aria-label={ariaLabel} selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')}>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>
);

const V3Autocomplete = ({ value, onChange, options, placeholder, ariaLabel, disabled = false }: { value: string | null; onChange: (value: string | null) => void; options: Option[]; placeholder: string; ariaLabel: string; disabled?: boolean }) => (
  <Autocomplete selectedKey={value} onSelectionChange={(key) => onChange(key ? String(key) : null)} isDisabled={disabled}>
    <Autocomplete.Trigger>
      <Autocomplete.Filter><Input aria-label={ariaLabel} placeholder={placeholder} /></Autocomplete.Filter>
      <Autocomplete.Indicator />
    </Autocomplete.Trigger>
    <Autocomplete.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Autocomplete.Popover>
  </Autocomplete>
);

const V3DatePicker = ({ value, onChange, ariaLabel }: { value?: string; onChange: (value: string) => void; ariaLabel: string }) => (
  <DatePicker value={value ? parseDate(value) : null} onChange={(date) => onChange(date ? String(date) : '')}>
    <DateField.Group fullWidth>
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
  const [outwardSearchValue, setOutwardSearchValue] = useState('');

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
      order_number: '',
      order_date: '',
      from_date: '',
      to_date: '',
      credit_days: 0,
      pdf_columns: DEFAULT_INVOICE_PDF_COLUMNS,
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
  const outwardEntriesQuery = useOutwardEntriesQuery({
    enabled: Boolean(selectedPartyId),
    organizationId: selectedPartyId,
    limit: 500,
  });
  const outwardEntries = outwardEntriesQuery.data ?? [];

  const getOutwardNumbers = (outwardIds: string[]) =>
    outwardIds
      .map((outwardId) => outwardEntries.find((outward) => outward.id === outwardId)?.outward_no)
      .filter((outwardNo): outwardNo is string | number => outwardNo !== undefined && outwardNo !== null)
      .map(String);

  const onSubmit = async (data: CreateInvoiceHeaderFormData) => {
    try {
      const selectedOutwardNumbers = getOutwardNumbers(data.outward_ids);

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
        order_number: data.order_number?.trim() || null,
        order_date: data.order_date?.trim() || null,
        from_date: data.from_date?.trim() || null,
        to_date: data.to_date?.trim() || null,
        status: 'draft',
        discount_mode: 'line',
        credit_days: data.credit_days,
        pdf_columns: normalizeInvoicePdfColumns(data.pdf_columns),
        pdf_columns_user_configured: false,
      });

      toast.success('Draft invoice created successfully!');
      navigate(`/billing/invoice/${invoice.id}/edit`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create invoice draft';
      toast.error(message);
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
                          field.onChange(selected);
                          setValue('outward_ids', [], { shouldDirty: true, shouldValidate: true });
                          setValue('outward_nos', [], { shouldDirty: true, shouldValidate: true });
                          setOutwardSearchValue('');
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
                        <Autocomplete aria-label="Outward Numbers" selectedKey={null} isDisabled={!selectedPartyId || outwardEntriesQuery.isLoading || outwardEntriesQuery.isFetching} onSelectionChange={(key) => {
                            if (!key) return;

                            const outwardId = String(key);
                            const nextOutwardIds = Array.from(
                              new Set([...(field.value ?? []), outwardId]),
                            );
                            field.onChange(nextOutwardIds);
                            setValue('outward_nos', getOutwardNumbers(nextOutwardIds), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            setOutwardSearchValue('');
                          }}
                        >
                          <Autocomplete.Trigger>
                            <Autocomplete.Filter><Input aria-label="Outward Numbers" placeholder={!selectedPartyId ? 'Select customer first' : 'Search outward numbers'} value={outwardSearchValue} onChange={(event) => setOutwardSearchValue(event.target.value)} /></Autocomplete.Filter>
                            <Autocomplete.Indicator />
                          </Autocomplete.Trigger>
                          <Autocomplete.Popover><ListBox>
                          {outwardEntries
                            .filter((outward) => !(field.value ?? []).includes(outward.id))
                            .map((outward) => (
                              <ListBox.Item key={outward.id} id={outward.id} textValue={`Outward ${String(outward.outward_no ?? outward.id)}`}>
                                {String(outward.outward_no ?? outward.id)}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox></Autocomplete.Popover>
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
                                  <button type="button" aria-label={`Remove outward ${outwardNumber}`} className="ml-1" onClick={(event) => { event.stopPropagation(); const nextOutwardIds = (field.value ?? []).filter((id) => id !== outwardId); field.onChange(nextOutwardIds); setValue('outward_nos', getOutwardNumbers(nextOutwardIds), { shouldDirty: true, shouldValidate: true }); }}>x</button>
                                </Chip>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
              </div>

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
                      isSelected={pdfColumns[option.key]}
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
                      {option.label}
                    </Checkbox>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/billing/invoice')}
                  disabled={createInvoiceMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={createInvoiceMutation.isPending}
                  loading={createInvoiceMutation.isPending}
                >
                  Create Invoice
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      </div>
    </FormDateProvider>
  );
}
