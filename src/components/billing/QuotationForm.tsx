import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  Button,
  Input,
  Label,
  ListBox,
  Select,
} from '@heroui/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGaugeMastersWithQuery } from '../../hooks/useGaugeMastersWithQuery';
import { useQuotationStore } from '../../store/quotationStore';
import {
  buildQuotationItemPayload,
  quotationItemFormSchema,
  type QuotationItemFormData,
  type QuotationItemFormInput,
} from '../../lib/validations';
import { useOrganizationsWithQuery } from '../../hooks/useOrganizationsWithQuery';
import {
  buildQuotationRangeLabel,
  inferQuotationDimensionMode,
} from '../../utils/quotationMeasurement';
import { toast } from 'sonner';
import { useAccountDetailsQuery } from '../../hooks/queries/accountDetails';
import {
  DEFAULT_QUOTATION_HSN_SAC,
  resolveQuotationRangeSize,
} from '../../utils/quotationDocumentUtils';

interface QuotationFormProps {
  onItemAdded?: () => void;
}

const SECTION_CLASS_NAME = 'px-1 py-2 md:px-2 md:py-3';

const INPUT_CLASS_NAMES = {
  inputWrapper:
    'h-10 min-h-10 rounded-md border border-slate-200 bg-white shadow-none hover:border-slate-300 focus-within:border-slate-400 focus-within:bg-slate-100',
  input: 'text-sm',
};

type QuotationAutocompleteOption = { id: string; label: string };

const QuotationAutocomplete = ({
  label,
  placeholder,
  selectedKey,
  inputValue,
  onSelectionChange,
  onInputChange,
  options,
  isLoading = false,
  allowsCustomValue = false,
  isRequired = false,
  isInvalid = false,
  errorMessage,
}: {
  label: string;
  placeholder: string;
  selectedKey: string | null;
  inputValue: string;
  onSelectionChange: (key: React.Key | null) => void;
  onInputChange: (value: string) => void;
  options: QuotationAutocompleteOption[];
  isLoading?: boolean;
  allowsCustomValue?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}) => (
  void allowsCustomValue,
  <div className="flex flex-col gap-2">
    <Label className="text-sm font-medium text-slate-800" isRequired={isRequired}>{label}</Label>
    <Autocomplete
      selectedKey={selectedKey || undefined}
      onSelectionChange={onSelectionChange}
      isInvalid={isInvalid}
      aria-label={label}
      className="w-full"
    >
      <Autocomplete.Trigger className={`h-10 min-h-10 rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${selectedKey ? 'bg-slate-100' : 'bg-white'}`}>
        <Autocomplete.Filter>
          <Input className="w-full" placeholder={placeholder} value={inputValue} onChange={(event) => onInputChange(event.target.value)} />
        </Autocomplete.Filter>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover>
        <ListBox>
          {isLoading ? (
            <ListBox.Item id="loading" isDisabled>Loading...</ListBox.Item>
          ) : options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Autocomplete.Popover>
    </Autocomplete>
    {isInvalid && errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
  </div>
);

const QuotationSelect = ({
  label,
  selectedKey,
  onSelectionChange,
  isInvalid = false,
  errorMessage,
}: {
  label: string;
  selectedKey: string;
  onSelectionChange: (key: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}) => (
  <div className="flex flex-col gap-2">
    <Label className="text-sm font-medium text-slate-800">{label}</Label>
    <Select
      selectedKey={selectedKey}
      aria-label={label}
      isInvalid={isInvalid}
      onSelectionChange={(key) => key !== null && onSelectionChange(String(key))}
    >
      <Select.Trigger className={`h-10 min-h-10 w-full rounded-md border border-slate-200 shadow-none hover:border-slate-300 ${selectedKey ? 'bg-slate-100' : 'bg-white'}`}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="none" textValue="No Discount">No Discount<ListBox.ItemIndicator /></ListBox.Item>
          <ListBox.Item id="percentage" textValue="Percentage Discount">Percentage Discount<ListBox.ItemIndicator /></ListBox.Item>
          <ListBox.Item id="flat" textValue="Flat Discount Amount">Flat Discount Amount<ListBox.ItemIndicator /></ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
    {isInvalid && errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
  </div>
);

type QuotationFieldProps = React.ComponentProps<typeof Input> & {
  label?: string;
  labelPlacement?: string;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  classNames?: { input?: string; inputWrapper?: string };
  startContent?: React.ReactNode;
};

const QuotationField = ({
  label,
  labelPlacement: _labelPlacement,
  isReadOnly,
  isRequired,
  isDisabled,
  isInvalid,
  errorMessage,
  classNames: _classNames,
  startContent,
  ...inputProps
}: QuotationFieldProps) => (
  <div className="flex flex-col gap-2">
    {label && <Label isRequired={isRequired}>{label}</Label>}
    <div className="flex items-center gap-1">
      {startContent}
      <Input {...inputProps} aria-invalid={isInvalid} className={`w-full ${inputProps.className || _classNames?.input || ''}`} disabled={isReadOnly || isDisabled} />
    </div>
    {isInvalid && errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
  </div>
);

export const QuotationForm: React.FC<QuotationFormProps> = ({
  onItemAdded,
}) => {
  const { gaugeMasterList, loading: gaugeLoading } = useGaugeMastersWithQuery();
  const { organizations, loading: orgLoading } = useOrganizationsWithQuery({ directory: 'customers' });
  const accountDetailsQuery = useAccountDetailsQuery();
  const { addItemToQuotation, currentQuotation, setCurrentQuotation } =
    useQuotationStore();

  const quotationDateValue =
    currentQuotation?.quotation_date || new Date().toISOString().split('T')[0];
  const customerName = currentQuotation?.customer_name || '';
  const customerContact = currentQuotation?.customer_contact || '';
  const customerEmail = currentQuotation?.customer_email || '';
  const customerAddress = currentQuotation?.customer_address || '';
  const billingFirmId = currentQuotation?.billing_firm_id || '';
  const billingFirmName = currentQuotation?.billing_firm_name || '';
  const billingFirmContact = currentQuotation?.billing_firm_contact || '';
  const billingFirmEmail = currentQuotation?.billing_firm_email || '';
  const billingFirmAddress = currentQuotation?.billing_firm_address || '';
  const billingFirmGst = currentQuotation?.billing_firm_gst || '';
  const selectedClientId = useMemo(() => {
    if (currentQuotation?.client_org_id) {
      return currentQuotation.client_org_id;
    }

    const matchingOrganization = organizations.find(
      (org) =>
        org.name.trim().toLowerCase() === customerName.trim().toLowerCase(),
    );

    return matchingOrganization?.id || '';
  }, [currentQuotation?.client_org_id, customerName, organizations]);
  const accountDetails = useMemo(
    () => accountDetailsQuery.data?.accountDetails ?? [],
    [accountDetailsQuery.data?.accountDetails],
  );
  const selectedBillingFirm = useMemo(
    () => accountDetails.find((account) => account.id === billingFirmId),
    [accountDetails, billingFirmId],
  );
  const selectedClient = useMemo(
    () => organizations.find((org) => org.id === selectedClientId),
    [organizations, selectedClientId],
  );
  const customerGst = currentQuotation?.customer_gst || '';

  const quotationItemForm = useForm<
    QuotationItemFormInput,
    unknown,
    QuotationItemFormData
  >({
    resolver: zodResolver(quotationItemFormSchema),
    mode: 'onChange',
    defaultValues: {
      gauge_id: '',
      gauge_name: '',
      gauge_type: '',
      serial_number: '',
      make: '',
      hsn_sac: DEFAULT_QUOTATION_HSN_SAC,
      quantity: '1',
      unit: 'mm',
      dimension_mode: 'range_only',
      range_from: '',
      range_to: '',
      basic_size: '',
      base_price: '',
      discount_type: 'none',
      discount_value: '',
    },
  });

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = quotationItemForm;

  const selectedGaugeId = watch('gauge_id') || '';
  const gaugeInputValue = watch('gauge_name') || '';
  const gaugeTypeValue = watch('gauge_type') || '';
  const hsnSacValue = watch('hsn_sac') || DEFAULT_QUOTATION_HSN_SAC;
  const serialNumberValue = watch('serial_number') || '';
  const makeValue = watch('make') || '';
  const unitValue = watch('unit') || 'mm';
  const quantityValue = watch('quantity') || '1';
  const rangeFrom = watch('range_from') || '';
  const rangeTo = watch('range_to') || '';
  const basicSize = watch('basic_size') || '';
  const basePrice = watch('base_price') || '';
  const discountType = watch('discount_type');
  const discountValue = watch('discount_value') || '';
  const dimensionMode = watch('dimension_mode');

  const updateQuotationDraft = useCallback(
    (updates: Record<string, unknown>) => {
      setCurrentQuotation({
        quotation_type: 'regular',
        quotation_date: quotationDateValue,
        ...updates,
      });
    },
    [quotationDateValue, setCurrentQuotation],
  );

  const handleClientSelectionChange = (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      const selectedClient = organizations.find((org) => org.id === key);
      if (selectedClient) {
        updateQuotationDraft({
          client_org_id: selectedClient.id,
          customer_name: selectedClient.name,
          customer_contact: selectedClient.contacts?.[0]?.phone || undefined,
          customer_email: selectedClient.contacts?.[0]?.email || undefined,
          customer_gst: selectedClient.gst || undefined,
          customer_address: selectedClient.address
            ? `${selectedClient.address.address_line_1 || ''}${selectedClient.address.city ? `, ${selectedClient.address.city}` : ''}${selectedClient.address.state ? `, ${selectedClient.address.state}` : ''}${selectedClient.address.zip_code ? ` - ${selectedClient.address.zip_code}` : ''}`
            : undefined,
        });
      }
      return;
    }

    updateQuotationDraft({
      client_org_id: '',
      customer_name: '',
      customer_contact: undefined,
      customer_email: undefined,
      customer_address: undefined,
    });
  };

  const fillBillingFirmDetails = (
    selectedFirm: (typeof accountDetails)[number],
  ) => {
    updateQuotationDraft({
      billing_firm_id: selectedFirm.id,
      billing_firm_name: selectedFirm.firm_name,
      billing_firm_contact: selectedFirm.contact_no || undefined,
      billing_firm_email: selectedFirm.email || undefined,
      billing_firm_address: selectedFirm.address || undefined,
      billing_firm_gst: selectedFirm.gst_no || undefined,
    });
  };

  const handleBillingFirmSelectionChange = (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      const selectedFirm = accountDetails.find((account) => account.id === key);
      if (selectedFirm) {
        fillBillingFirmDetails(selectedFirm);
      }
      return;
    }

    updateQuotationDraft({
      billing_firm_id: '',
      billing_firm_name: '',
      billing_firm_contact: undefined,
      billing_firm_email: undefined,
      billing_firm_address: undefined,
      billing_firm_gst: undefined,
    });
  };

  const handleBillingFirmInputChange = (value: string) => {
    const matchedFirm = accountDetails.find(
      (account) =>
        account.firm_name.trim().toLowerCase() === value.trim().toLowerCase(),
    );

    if (matchedFirm) {
      fillBillingFirmDetails(matchedFirm);
      return;
    }

    updateQuotationDraft({
      billing_firm_id: '',
      billing_firm_name: value,
      ...(billingFirmId
        ? {
            billing_firm_contact: undefined,
            billing_firm_email: undefined,
            billing_firm_address: undefined,
            billing_firm_gst: undefined,
          }
        : {}),
    });
  };

  const handleClientInputChange = (value: string) => {
    const matchedOrganization = organizations.find(
      (org) => org.name.toLowerCase() === value.toLowerCase(),
    );

    if (matchedOrganization) {
      updateQuotationDraft({
        client_org_id: matchedOrganization.id,
        customer_name: matchedOrganization.name,
        customer_contact: matchedOrganization.contacts?.[0]?.phone || undefined,
        customer_email: matchedOrganization.contacts?.[0]?.email || undefined,
        customer_gst: matchedOrganization.gst || undefined,
        customer_address: matchedOrganization.address
          ? `${matchedOrganization.address.address_line_1 || ''}${matchedOrganization.address.city ? `, ${matchedOrganization.address.city}` : ''}${matchedOrganization.address.state ? `, ${matchedOrganization.address.state}` : ''}${matchedOrganization.address.zip_code ? ` - ${matchedOrganization.address.zip_code}` : ''}`
          : undefined,
      });
      return;
    }

    updateQuotationDraft({
      client_org_id: '',
      customer_name: value,
      customer_contact: undefined,
      customer_email: undefined,
      customer_address: undefined,
      customer_gst: undefined,
    });
  };

  const handleGaugeSelectionChange = (key: React.Key | null) => {
    if (key && typeof key === 'string') {
      const selectedGauge = gaugeMasterList.find((g) => g.id === key);
      if (selectedGauge) {
        setValue('gauge_id', key, { shouldValidate: true, shouldDirty: true });
        setValue('gauge_name', selectedGauge.name, {
          shouldValidate: true,
          shouldDirty: true,
        });
        setValue('gauge_type', selectedGauge.certificate_type_name || '', {
          shouldValidate: true,
        });
        setValue('unit', selectedGauge.unit || 'mm', {
          shouldValidate: true,
          shouldDirty: true,
        });
        if (selectedGauge.hsn_sac) {
          setValue('hsn_sac', selectedGauge.hsn_sac, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
      return;
    }

    setValue('gauge_id', '', { shouldValidate: true, shouldDirty: true });
    setValue('gauge_type', '', { shouldValidate: true });
  };

  const handleGaugeInputChange = (value: string) => {
    setValue('gauge_name', value, { shouldValidate: true, shouldDirty: true });
    setValue('gauge_id', '', { shouldValidate: true, shouldDirty: true });
  };

  const selectedGauge = useMemo(
    () => gaugeMasterList.find((g) => g.id === selectedGaugeId),
    [gaugeMasterList, selectedGaugeId],
  );

  const inferredDimensionMode = useMemo(
    () =>
      inferQuotationDimensionMode(
        selectedGauge?.certificate_type_name,
        gaugeInputValue,
      ),
    [selectedGauge?.certificate_type_name, gaugeInputValue],
  );

  useEffect(() => {
    if (dimensionMode !== inferredDimensionMode) {
      setValue('dimension_mode', inferredDimensionMode, {
        shouldValidate: true,
      });
    }

    if (inferredDimensionMode === 'range_only') {
      setValue('basic_size', '', { shouldValidate: true });
    }

    if (inferredDimensionMode === 'basic_size_only') {
      setValue('range_from', '', { shouldValidate: true });
      setValue('range_to', '', { shouldValidate: true });
    }
  }, [dimensionMode, inferredDimensionMode, setValue]);

  useEffect(() => {
    if (!selectedBillingFirm || billingFirmGst) {
      return;
    }

    updateQuotationDraft({
      billing_firm_gst: selectedBillingFirm.gst_no || undefined,
    });
  }, [billingFirmGst, selectedBillingFirm, updateQuotationDraft]);

  useEffect(() => {
    if (!selectedClient || customerGst) {
      return;
    }

    updateQuotationDraft({
      customer_gst: selectedClient.gst || undefined,
    });
  }, [customerGst, selectedClient, updateQuotationDraft]);

  const showRangeFields =
    dimensionMode === 'range_only' || dimensionMode === 'range_and_basic_size';
  const showBasicSizeField =
    dimensionMode === 'basic_size_only' ||
    dimensionMode === 'range_and_basic_size';

  const finalPrice = useMemo(() => {
    const base = parseFloat(basePrice) || 0;
    const quantity = Math.max(1, parseFloat(quantityValue) || 1);
    const lineSubtotal = base * quantity;
    if (discountType === 'none' || !discountValue) return lineSubtotal;

    const discount = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      const discountAmount = (lineSubtotal * discount) / 100;
      return Math.max(0, lineSubtotal - discountAmount);
    }

    return Math.max(0, lineSubtotal - discount);
  }, [basePrice, discountType, discountValue, quantityValue]);

  const measurementPreview = useMemo(
    () =>
      buildQuotationRangeLabel({
        dimension_mode: dimensionMode,
        range_from: rangeFrom !== '' ? Number(rangeFrom) : undefined,
        range_to: rangeTo !== '' ? Number(rangeTo) : undefined,
        basic_size: basicSize,
      }),
    [basicSize, dimensionMode, rangeFrom, rangeTo],
  );

  const handleAddItem = handleSubmit(
    (formData) => {
      const normalizedGaugeId = selectedGaugeId || `new-gauge-${Date.now()}`;
      const payload = buildQuotationItemPayload({
        ...formData,
        gauge_id: normalizedGaugeId,
        gauge_name: formData.gauge_name.trim(),
        gauge_type: selectedGauge?.certificate_type_name || gaugeTypeValue,
        unit: formData.unit?.trim() || selectedGauge?.unit || 'mm',
      });
      const resolvedRangeSize = resolveQuotationRangeSize({
        rangeSize: payload.range_size,
        specifications: selectedGauge?.specifications,
        unit: payload.unit || selectedGauge?.unit || 'mm',
      });

      const createdItemId = addItemToQuotation({
        gauge_id: payload.gauge_id,
        gauge_name: payload.gauge_name,
        gauge_type: payload.gauge_type,
        serial_number: payload.serial_number,
        make: payload.make,
        hsn_sac:
          payload.hsn_sac ||
          selectedGauge?.hsn_sac ||
          DEFAULT_QUOTATION_HSN_SAC,
        quantity: payload.quantity,
        dimension_mode: payload.dimension_mode,
        range_from: payload.range_from,
        range_to: payload.range_to,
        basic_size: payload.basic_size,
        range_size: resolvedRangeSize,
        specifications: selectedGauge?.specifications,
        unit: payload.unit || selectedGauge?.unit || 'mm',
        base_price: payload.base_price,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
      });

      if (!createdItemId) {
        toast.error('Failed to add item to quotation');
        return;
      }

      reset({
        gauge_id: '',
        gauge_name: '',
        gauge_type: '',
        serial_number: '',
        make: '',
        hsn_sac: DEFAULT_QUOTATION_HSN_SAC,
        quantity: '1',
        unit: 'mm',
        dimension_mode: 'range_only',
        range_from: '',
        range_to: '',
        basic_size: '',
        base_price: '',
        discount_type: 'none',
        discount_value: '',
      });

      onItemAdded?.();
      toast.success('Item added to quotation');
    },
    () => {
      toast.error('Please complete the required gauge fields');
    },
  );

  return (
    <div className="space-y-3">
      <div className={SECTION_CLASS_NAME}>
        <div className="mb-3 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Quotation From
            </h3>
            <p className="text-sm text-slate-500">
              Choose which firm should send this quotation to the customer.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
            <QuotationAutocomplete
              label="From"
              placeholder={accountDetailsQuery.isLoading || accountDetailsQuery.isFetching ? 'Loading firms...' : 'Select or type sender firm'}
              selectedKey={billingFirmId || null}
              inputValue={billingFirmName}
              onSelectionChange={handleBillingFirmSelectionChange}
              onInputChange={handleBillingFirmInputChange}
              isLoading={accountDetailsQuery.isLoading || accountDetailsQuery.isFetching}
              allowsCustomValue
              isRequired
              options={accountDetails.map((account) => ({ id: account.id, label: account.firm_name }))}
            />
            <QuotationField
              label="Firm Address"
              placeholder="Enter firm address"
              value={billingFirmAddress}
              onChange={(e) =>
                updateQuotationDraft({
                  billing_firm_address: e.target.value || undefined,
                })
              }
              labelPlacement="outside"
              isReadOnly={!!selectedBillingFirm}
              classNames={{
                ...INPUT_CLASS_NAMES,
                input: `${INPUT_CLASS_NAMES.input} ${selectedBillingFirm ? 'bg-gray-50' : ''}`,
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
            <QuotationField
              label="Contact"
              placeholder="Enter contact number"
              value={billingFirmContact}
              onChange={(e) =>
                updateQuotationDraft({
                  billing_firm_contact: e.target.value || undefined,
                })
              }
              labelPlacement="outside"
              isReadOnly={!!selectedBillingFirm}
              classNames={{
                ...INPUT_CLASS_NAMES,
                input: `${INPUT_CLASS_NAMES.input} ${selectedBillingFirm ? 'bg-gray-50' : ''}`,
              }}
            />
            <QuotationField
              label="Email"
              placeholder="Enter email"
              value={billingFirmEmail}
              onChange={(e) =>
                updateQuotationDraft({
                  billing_firm_email: e.target.value || undefined,
                })
              }
              labelPlacement="outside"
              isReadOnly={!!selectedBillingFirm}
              classNames={{
                ...INPUT_CLASS_NAMES,
                input: `${INPUT_CLASS_NAMES.input} ${selectedBillingFirm ? 'bg-gray-50' : ''}`,
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
            <QuotationField
              label="GST No"
              placeholder="Enter GST number"
              value={billingFirmGst}
              onChange={(e) =>
                updateQuotationDraft({
                  billing_firm_gst: e.target.value || undefined,
                })
              }
              labelPlacement="outside"
              isReadOnly={!!selectedBillingFirm}
              classNames={{
                ...INPUT_CLASS_NAMES,
                input: `${INPUT_CLASS_NAMES.input} ${selectedBillingFirm ? 'bg-gray-50' : ''}`,
              }}
            />
          </div>
          <div className="pt-1">
            <div className="mb-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Customer Details
                </h3>
                <p className="text-sm text-slate-500">
                  Select an existing client or type a custom customer for this
                  quotation.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
              <QuotationAutocomplete
                label="Client Name"
                placeholder={orgLoading ? 'Loading clients...' : 'Select or type new client name'}
                selectedKey={selectedClientId || null}
                inputValue={customerName}
                onSelectionChange={handleClientSelectionChange}
                onInputChange={handleClientInputChange}
                isLoading={orgLoading}
                allowsCustomValue
                isRequired
                options={organizations.map((org) => ({ id: org.id, label: org.name }))}
              />

            <QuotationField
                label="Address"
                placeholder="Enter address"
                value={customerAddress}
                onChange={(e) =>
                  updateQuotationDraft({
                    customer_address: e.target.value || undefined,
                  })
                }
                labelPlacement="outside"
                isReadOnly={!!selectedClientId}
                classNames={{
                  ...INPUT_CLASS_NAMES,
                  input: `${INPUT_CLASS_NAMES.input} ${selectedClientId ? 'bg-gray-50' : ''}`,
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mt-2.5">
            <QuotationField
                label="Quotation Date"
                type="date"
                value={quotationDateValue}
                onChange={(e) =>
                  updateQuotationDraft({
                    quotation_date: e.target.value,
                  })
                }
                labelPlacement="outside"
                classNames={INPUT_CLASS_NAMES}
              />
            <QuotationField
                label="Contact Number"
                placeholder="Enter contact number"
                value={customerContact}
                onChange={(e) =>
                  updateQuotationDraft({
                    customer_contact: e.target.value || undefined,
                  })
                }
                labelPlacement="outside"
                isReadOnly={!!selectedClientId}
                classNames={{
                  ...INPUT_CLASS_NAMES,
                  input: `${INPUT_CLASS_NAMES.input} ${selectedClientId ? 'bg-gray-50' : ''}`,
                }}
              />
            <QuotationField
                label="Email"
                placeholder="Enter email address"
                type="email"
                value={customerEmail}
                onChange={(e) =>
                  updateQuotationDraft({
                    customer_email: e.target.value || undefined,
                  })
                }
                labelPlacement="outside"
                isReadOnly={!!selectedClientId}
                classNames={{
                  ...INPUT_CLASS_NAMES,
                  input: `${INPUT_CLASS_NAMES.input} ${selectedClientId ? 'bg-gray-50' : ''}`,
                }}
              />
            <QuotationField
                label="GST No"
                placeholder="Enter GST number"
                value={customerGst}
                onChange={(e) =>
                  updateQuotationDraft({
                    customer_gst: e.target.value || undefined,
                  })
                }
                labelPlacement="outside"
                isReadOnly={!!selectedClientId}
                classNames={{
                  ...INPUT_CLASS_NAMES,
                  input: `${INPUT_CLASS_NAMES.input} ${selectedClientId ? 'bg-gray-50' : ''}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={SECTION_CLASS_NAME}>
        <div className="mb-3 border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Add Gauge to Quotation
            </h3>
            <p className="text-sm text-slate-500">
              Keep adding gauges as usual. You can duplicate rows later for
              repeated ranges of the same gauge.
            </p>
          </div>
        </div>
        <div>
          <form
            onSubmit={handleAddItem}
            className="space-y-3"
            aria-label="Add quotation item form"
          >
            <QuotationAutocomplete
              label="Select Gauge"
              placeholder={gaugeLoading ? 'Loading gauges...' : 'Select or type new gauge name'}
              selectedKey={selectedGaugeId || null}
              inputValue={gaugeInputValue}
              onSelectionChange={handleGaugeSelectionChange}
              onInputChange={handleGaugeInputChange}
              isLoading={gaugeLoading}
              allowsCustomValue
              isRequired
              isInvalid={!!errors.gauge_name}
              errorMessage={errors.gauge_name?.message}
              options={gaugeMasterList.map((gauge) => ({ id: gauge.id, label: gauge.name }))}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <QuotationField
                label="Serial Number"
                placeholder="Enter serial number"
                value={serialNumberValue}
                onChange={(e) =>
                  setValue('serial_number', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                labelPlacement="outside"
                classNames={INPUT_CLASS_NAMES}
              />
            <QuotationField
                label="Make"
                placeholder="Enter make"
                value={makeValue}
                onChange={(e) =>
                  setValue('make', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                labelPlacement="outside"
                classNames={INPUT_CLASS_NAMES}
              />
            <QuotationField
                label="Unit"
                placeholder="mm"
                value={unitValue}
                onChange={(e) =>
                  setValue('unit', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                labelPlacement="outside"
                classNames={INPUT_CLASS_NAMES}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <QuotationField
                label="HSN / SAC"
                placeholder="Enter HSN/SAC"
                value={hsnSacValue}
                onChange={(e) =>
                  setValue('hsn_sac', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                labelPlacement="outside"
                classNames={INPUT_CLASS_NAMES}
              />
            <QuotationField
                label="Qty"
                placeholder="1"
                type="number"
                value={quantityValue}
                onChange={(e) =>
                  setValue('quantity', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                isRequired
                isInvalid={!!errors.quantity}
                errorMessage={errors.quantity?.message}
                labelPlacement="outside"
                min="1"
                step="1"
                classNames={INPUT_CLASS_NAMES}
              />
              {showRangeFields ? (
                <>
            <QuotationField
                    label="Range From"
                    placeholder="Enter range start"
                    value={rangeFrom}
                    onChange={(e) =>
                      setValue('range_from', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    isRequired
                    isInvalid={!!errors.range_from}
                    errorMessage={errors.range_from?.message}
                    labelPlacement="outside"
                    type="number"
                    step="0.01"
                    min="0"
                    classNames={INPUT_CLASS_NAMES}
                  />
            <QuotationField
                    label="Range To"
                    placeholder="Enter range end"
                    value={rangeTo}
                    onChange={(e) =>
                      setValue('range_to', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    isRequired
                    isInvalid={!!errors.range_to}
                    errorMessage={errors.range_to?.message}
                    labelPlacement="outside"
                    type="number"
                    step="0.01"
                    min="0"
                    classNames={INPUT_CLASS_NAMES}
                  />
                </>
              ) : null}
              {showBasicSizeField ? (
            <QuotationField
                  label="Basic Size "
                  placeholder="Enter basic size"
                  value={basicSize}
                  onChange={(e) =>
                    setValue('basic_size', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  isRequired
                  isInvalid={!!errors.basic_size}
                  errorMessage={errors.basic_size?.message}
                  labelPlacement="outside"
                  classNames={INPUT_CLASS_NAMES}
                />
              ) : null}
            <QuotationField
                label="Base Price "
                placeholder="Enter base price"
                type="number"
                value={basePrice}
                onChange={(e) =>
                  setValue('base_price', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                isRequired
                isInvalid={!!errors.base_price}
                errorMessage={errors.base_price?.message}
                labelPlacement="outside"
                startContent={<span className="text-gray-500">₹</span>}
                min="0"
                step="0.01"
                classNames={INPUT_CLASS_NAMES}
              />
              <Controller
                name="discount_type"
                control={control}
                render={({ field, fieldState }) => (
                  <QuotationSelect
                    label="Discount Type"
                    selectedKey={field.value || 'none'}
                    onSelectionChange={(value) => {
                      const discountTypeValue = value as QuotationItemFormInput['discount_type'];
                      field.onChange(discountTypeValue);
                      if (discountTypeValue === 'none') {
                        setValue('discount_value', '', {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }
                    }}
                    isInvalid={fieldState.invalid}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            <QuotationField
                label={
                  discountType === 'percentage'
                    ? 'Discount %'
                    : 'Discount Amount'
                }
                placeholder={
                  discountType === 'percentage' ? '10' : 'Enter amount'
                }
                type="number"
                value={discountValue}
                onChange={(e) =>
                  setValue('discount_value', e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                labelPlacement="outside"
                isDisabled={discountType === 'none'}
                isInvalid={!!errors.discount_value}
                errorMessage={errors.discount_value?.message}
                startContent={
                  discountType === 'percentage' ? (
                    <span className="text-gray-500">%</span>
                  ) : (
                    <span className="text-gray-500">₹</span>
                  )
                }
                min="0"
                step="0.01"
                max={discountType === 'percentage' ? '100' : undefined}
                classNames={INPUT_CLASS_NAMES}
              />
            </div>

            {basePrice && (
              <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-orange-50 p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                  {/* <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Live Price Summary
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {measurementPreview
                        ? `Quotation label: ${measurementPreview}`
                        : 'Final commercial amount for this row after discount.'}
                    </p>
                  </div> */}
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Range / Size</p>
                    <p className="mb-1 text-sm font-medium text-slate-700">
                      {measurementPreview || '-'}
                    </p>
                    <p className="text-xs text-slate-500">Final Price</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₹{finalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              isDisabled={!gaugeInputValue.trim() || !basePrice}
            >
              Add to Quotation
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
