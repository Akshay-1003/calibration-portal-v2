import { useEffect, useMemo, useRef } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { UserIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useOrganizations, type Organization, type OrganizationFormData as HookOrganizationFormData } from "../../hooks/useOrganizations";
import type { OrganizationDirectory } from "../../hooks/queries/organizations";
import { toast } from "sonner";
import { organizationSchema, zodResolver, type OrganizationFormData } from "../../lib/validations";
import { FormField } from "../ui/form-field";
import { PageLoader } from "../ui/AppLoader";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../hooks/queries/queryKeys";
import type { OrganizationsQueryData } from "../../hooks/queries/organizations";
import { Country, State } from "country-state-city";

import {
  Autocomplete,
  Input,
  Button,
  Card,
  ListBox,
  Select,
  Checkbox,
} from "@heroui/react";

interface PartyMasterFormProps {
  mode?: 'create' | 'edit';
  organizationId?: string;
  directory?: Extract<OrganizationDirectory, 'customers' | 'laboratories'>;
  returnPath?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type Option = { key: string; label: string };

const FormSelect = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}) => (
  <Select className="w-full" selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')} placeholder={placeholder}>
    <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => (
      <ListBox.Item key={option.key} id={option.key} textValue={option.label}>
        {option.label}<ListBox.ItemIndicator />
      </ListBox.Item>
    ))}</ListBox></Select.Popover>
  </Select>
);

const FormAutocomplete = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) => (
  <Autocomplete className="w-full" selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')} isDisabled={disabled}>
    <Autocomplete.Trigger>
      <Autocomplete.Filter>
        <Input aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      </Autocomplete.Filter>
      <Autocomplete.Indicator />
    </Autocomplete.Trigger>
    <Autocomplete.Popover><ListBox>{options.map((option) => (
      <ListBox.Item key={option.key} id={option.key} textValue={option.label}>
        {option.label}<ListBox.ItemIndicator />
      </ListBox.Item>
    ))}</ListBox></Autocomplete.Popover>
  </Autocomplete>
);

const PartyMasterForm = ({
  mode = 'create',
  organizationId,
  directory = 'customers',
  returnPath = '/masters/party-master',
  onComplete,
  onCancel,
}: PartyMasterFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const countries = useMemo(() => Country.getAllCountries(), []);
  const {
    organizations,
    addOrganization,
    updateOrganization,
    refreshOrganizations,
    loading,
    error
  } = useOrganizations(directory);

  const organizationLabel = directory === 'laboratories' ? 'Laboratory' : 'Client';
  const returnToList = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(returnPath);
  };

  const attemptedEditFetchRef = useRef<string | null>(null);

  const isEditMode = mode === 'edit' || !!id || !!organizationId;
  const editId = id || organizationId;
  const organization = isEditMode ? organizations.find(org => org.id === editId) : null;

  const computedDefaultValues = useMemo<OrganizationFormData>(
    () => {
      const organizationWithGst = organization as (Organization & {
        gst?: string;
        gst_type?: string;
      }) | null;

      return isEditMode && organizationWithGst
        ? {
          name: organizationWithGst.name || '',
          description: organizationWithGst.description || '',
          parent_id: organizationWithGst.parent_id || '',
          gst: organizationWithGst.gst || '',
          gst_type: organizationWithGst.gst_type || '',
          contacts: organizationWithGst.contacts?.length
            ? organizationWithGst.contacts.map((contact) => ({
              name: contact.name || '',
              email: contact.email || '',
              phone: contact.phone || '',
            }))
            : [],
          address: {
            address_line_1: organizationWithGst.address?.address_line_1 || '',
            address_line_2: organizationWithGst.address?.address_line_2 || '',
            city: organizationWithGst.address?.city || '',
            state: organizationWithGst.address?.state || '',
            zip_code: organizationWithGst.address?.zip_code || '',
            country: organizationWithGst.address?.country || 'India',
          },
          contract: {
            calibration_method: organizationWithGst.contract?.calibration_method || '',
            reporting_method: organizationWithGst.contract?.reporting_method || '',
            collection_mode: organizationWithGst.contract?.collection_mode || '',
            dispatch_mode: organizationWithGst.contract?.dispatch_mode || '',
            conformity_statement:
              organizationWithGst.contract?.conformity_statement ??
              (organizationWithGst.contract as { conformity_statement?: boolean } | undefined)?.conformity_statement ??
              false,
            conformity_accepted:
              organizationWithGst.contract?.conformity_accepted ??
              (organizationWithGst.contract as { conformity_accepted?: boolean } | undefined)?.conformity_accepted ??
              false,
            specific_requirements: organizationWithGst.contract?.specific_requirements || '',
          },
          archived: organizationWithGst.archived || false,
        }
        : {
          name: '',
          description: '',
          parent_id: '',
          gst: '',
          gst_type: '',
          contacts: [],
          address: {
            address_line_1: '',
            address_line_2: '',
            city: '',
            state: '',
            zip_code: '',
            country: 'India',
          },
          contract: {
            calibration_method: '',
            reporting_method: '',
            collection_mode: '',
            dispatch_mode: '',
            conformity_statement: false,
            conformity_accepted: false,
            specific_requirements: '',
          },
          archived: false,
        };
    },
    [isEditMode, organization]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    control,
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema) as Resolver<OrganizationFormData>,
    defaultValues: computedDefaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (!isEditMode || !editId || organization || loading) return;
    if (attemptedEditFetchRef.current === editId) return;

    attemptedEditFetchRef.current = editId;
    void refreshOrganizations();
  }, [isEditMode, editId, organization, loading, refreshOrganizations]);

  useEffect(() => {
    if (isEditMode && organization) {
      reset(computedDefaultValues);
    }
  }, [isEditMode, organization, computedDefaultValues, reset]);

  const upsertOrganizationInQueryCache = (
    organizationData: Organization,
    operation: "create" | "update"
  ) => {
    queryClient.setQueriesData<OrganizationsQueryData>(
      { queryKey: queryKeys.organizations.lists() },
      (previous) => {
        if (!previous || previous.organizations.length === 0) {
          return {
            organizations: [organizationData],
            total: 1,
            page: 0,
            limit: 1,
            totalPages: 1,
          };
        }

        const existingIndex = previous.organizations.findIndex((org) => org.id === organizationData.id);
        if (existingIndex === -1) {
          if (operation !== "create") return previous;
          const nextOrganizations = [organizationData, ...previous.organizations];
          return {
            ...previous,
            organizations: nextOrganizations,
            total: previous.total + 1,
            totalPages: Math.max(Math.ceil((previous.total + 1) / Math.max(previous.limit, 1)), 1),
          };
        }

        const next = [...previous.organizations];
        next[existingIndex] = { ...next[existingIndex], ...organizationData };
        return {
          ...previous,
          organizations: next,
        };
      }
    );

    queryClient.setQueryData(
      queryKeys.organizations.detail(organizationData.id),
      organizationData
    );
  };

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      const normalizedContacts = (data.contacts || [])
        .map((contact) => ({
          name: contact.name?.trim() || '',
          email: contact.email?.trim() || '',
          phone: contact.phone?.trim() || '',
        }))
        .filter((contact) => contact.name || contact.email || contact.phone);

      const submitData: HookOrganizationFormData = {
        name: data.name,
        description: data.description?.trim() || '',
        parent_id: data.parent_id?.trim() || '',
        gst: data.gst?.trim() || '',
        gst_type: data.gst_type?.trim() || '',
        contacts: normalizedContacts,
        address: {
          address_line_1: data.address.address_line_1?.trim() || '',
          address_line_2: data.address.address_line_2?.trim() || '',
          city: data.address.city?.trim() || '',
          state: data.address.state?.trim() || '',
          zip_code: data.address.zip_code?.trim() || '',
          country: data.address.country?.trim() || '',
        },
        contract: {
          calibration_method: data.contract.calibration_method,
          reporting_method: data.contract.reporting_method,
          collection_mode: data.contract.collection_mode,
          dispatch_mode: data.contract.dispatch_mode,
          conformity_statement: data.contract.conformity_statement,
          conformity_accepted: data.contract.conformity_accepted,
          specific_requirements: data.contract.specific_requirements?.trim() || '',
        },
      };

      let result;

      if (isEditMode) {
        if (!editId) {
        toast.error(`${organizationLabel} ID not found`);
          return;
        }
        result = await updateOrganization(editId, submitData);
      } else {
        result = await addOrganization(submitData);
      }

      if (result) {
        upsertOrganizationInQueryCache(
          result,
          isEditMode ? "update" : "create"
        );
        toast.success(`${organizationLabel} ${isEditMode ? 'updated' : 'created'} successfully!`);
        if (onComplete) {
          onComplete();
        } else {
          navigate(returnPath);
        }
      } else {
        toast.error(`Failed to ${isEditMode ? 'update' : 'create'} ${organizationLabel.toLowerCase()}. Please try again.`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ${organizationLabel.toLowerCase()}:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} ${organizationLabel.toLowerCase()}. Please try again.`);
    }
  };

  const addContact = () => {
    const currentContacts = watch('contacts') || [];
    setValue('contacts', [...currentContacts, { name: '', email: '', phone: '' }], {
      shouldDirty: true,
    });
  };

  const removeContact = (index: number) => {
    const currentContacts = watch('contacts') || [];
    setValue(
      'contacts',
      currentContacts.filter((_, i) => i !== index),
      { shouldDirty: true }
    );
  };

  const contacts = watch('contacts') || [];
  const selectedCountryName = watch('address.country');
  const selectedCountry = useMemo(
    () => countries.find((country) => country.name === selectedCountryName) ?? null,
    [countries, selectedCountryName]
  );
  const states = useMemo(
    () => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []),
    [selectedCountry]
  );

  if (isEditMode && !organization && !error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PageLoader message="Loading organization..." />
      </div>
    );
  }

  if (isEditMode && !organization && error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="border border-danger-200 bg-danger-50">
          <Card.Content className="p-6">
            <div className="flex flex-col gap-4">
          <p className="text-danger-600 text-sm font-medium">{organizationLabel} not found or failed to load.</p>
              <Button
                variant="secondary"
                onPress={returnToList}
              >
                Back to {directory === 'laboratories' ? 'Laboratories' : 'Clients'}
              </Button>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Card className="shadow-sm border border-gray-200">
        <Card.Header className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-md">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {isEditMode ? `Edit ${organizationLabel}` : `Create ${organizationLabel}`}
              </h1>
            </div>
          </div>
        </Card.Header>

        <Card.Content className="p-4">
          <form
            key={isEditMode ? `edit-${organization?.id || 'new'}` : 'create'}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                label={`${organizationLabel} Name`}
                required
                className="xl:col-span-2"
              >
                <Input {...register('name')} placeholder={`Enter ${organizationLabel.toLowerCase()} name`} aria-invalid={!!errors.name} />
              </FormField>

              <FormField label="GST No">
                <Input {...register('gst')} placeholder="GST number" />
              </FormField>

              <FormField label="GST Type">  
                <FormSelect value={watch('gst_type') || ''} onChange={(value) => setValue('gst_type', value, { shouldDirty: true })} placeholder="Select GST Type" options={[{ key: 'Cgst_Sgst', label: 'CGST/SGST' }, { key: 'Igst', label: 'IGST' }]} />
              </FormField>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Contact Details</p>
                <Button
                  type="button"
                  onPress={addContact}
                  variant="secondary"
                  size="sm"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>

              {contacts.length === 0 ? (
                <p className="text-sm text-gray-500">Add contact only if needed.</p>
              ) : (
                <div className="space-y-3">
                  {contacts.map((_, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                    >
                      <FormField label={index === 0 ? "Name" : undefined}>
                        <Input
                          {...register(`contacts.${index}.name`)}
                          placeholder="Contact name"
                        />
                      </FormField>

                      <FormField label={index === 0 ? "Email" : undefined}>
                        <Input
                          {...register(`contacts.${index}.email`)}
                          placeholder="contact@example.com / NA"
                        />
                      </FormField>

                      <FormField label={index === 0 ? "Phone" : undefined}>
                        <Input
                          {...register(`contacts.${index}.phone`)}
                          placeholder="Phone number / -"
                        />
                      </FormField>

                      <Button
                        type="button"
                        onPress={() => removeContact(index)}
                        variant="danger-soft"
                        size="sm"
                        isIconOnly
                        aria-label={`Remove contact ${index + 1}`}
                        className="h-10 min-w-10"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField
                label="Address"
                required
                className="md:col-span-2 xl:col-span-4"
              >
                <Input
                  {...register('address.address_line_1')}
                  placeholder="Enter address"
                />
              </FormField>

              <FormField label="City">
                <Input
                  {...register('address.city')}
                  placeholder="City / NA"
                />
              </FormField>

              <FormField label="State">
                <Controller
                  name="address.state"
                  control={control}
                  render={({ field }) => (
                    <FormAutocomplete
                      value={field.value || ''}
                      onChange={field.onChange}
                      options={states.map((state) => ({ key: state.name, label: state.name }))}
                      placeholder={selectedCountry ? "Search and select state" : "Select country first"}
                      disabled={!selectedCountry}
                    />
                  )}
                />
              </FormField>

              <FormField label="ZIP Code">
                <Input
                  {...register('address.zip_code')}
                  placeholder="ZIP / -"
                />
              </FormField>

              <FormField label="Country">
                <Controller
                  name="address.country"
                  control={control}
                  render={({ field }) => (
                    <FormAutocomplete
                      value={field.value || ''}
                      onChange={(nextValue) => {
                        field.onChange(nextValue);
                        if (nextValue !== selectedCountryName) setValue('address.state', '', { shouldDirty: true });
                      }}
                      options={countries.map((country) => ({ key: country.name, label: country.name }))}
                      placeholder="Search and select country"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Calibration Method"
                required
                error={errors.contract?.calibration_method?.message}
              >
                <FormSelect value={watch('contract.calibration_method') || ''} onChange={(value) => setValue('contract.calibration_method', value, { shouldDirty: true })} placeholder="Select method" options={[{ key: 'lab_method', label: 'Lab Method' }, { key: 'standard_method', label: 'Standard Method' }]} />
              </FormField>

              <FormField
                label="Reporting Method"
                required
                error={errors.contract?.reporting_method?.message}
              >
                <FormSelect value={watch('contract.reporting_method') || ''} onChange={(value) => setValue('contract.reporting_method', value, { shouldDirty: true })} placeholder="Select method" options={[{ key: 'lab_format', label: 'Lab Format' }, { key: 'standard_format', label: 'Standard Format' }]} />
              </FormField>

              <FormField
                label="Collection Mode"
                required
                error={errors.contract?.collection_mode?.message}
              >
                <FormSelect value={watch('contract.collection_mode') || ''} onChange={(value) => setValue('contract.collection_mode', value, { shouldDirty: true })} placeholder="Select mode" options={[{ key: 'by_hand', label: 'By Hand' }, { key: 'by_courier', label: 'Courier' }, { key: 'pickup', label: 'Pickup' }]} />
              </FormField>

              <FormField
                label="Dispatch Mode"
                required
                error={errors.contract?.dispatch_mode?.message}
              >
                <FormSelect value={watch('contract.dispatch_mode') || ''} onChange={(value) => setValue('contract.dispatch_mode', value, { shouldDirty: true })} placeholder="Select mode" options={[{ key: 'by_hand', label: 'By Hand' }, { key: 'by_courier', label: 'Courier' }, { key: 'pickup', label: 'Pickup' }]} />
              </FormField>

              <FormField label="Specific Requirements" className="md:col-span-2 xl:col-span-4">
                <Input
                  {...register('contract.specific_requirements')}
                  placeholder="Optional notes / - / NA"
                />
              </FormField>

              <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center md:gap-6">
                <Controller
                  name="contract.conformity_statement"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      isSelected={field.value || false}
                      onChange={field.onChange}
                    >
                      Confirmatory Required
                    </Checkbox>
                  )}
                />
                <Controller
                  name="contract.conformity_accepted"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      isSelected={field.value || false}
                      onChange={field.onChange}
                    >
                      Confirmatory Accepted (If applicable, the decision rule has been discussed, understood, and accepted)

                    </Checkbox>
                  )}
                />
              </div>
            </div>

            {error && (
              <Card className="border border-danger-200 bg-danger-50">
                <Card.Content className="p-4">
                  <p className="text-danger-600 text-sm">{error}</p>
                </Card.Content>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onPress={returnToList}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={loading || isSubmitting}
                className="min-w-[150px]"
              >
                {!loading && !isSubmitting && <UserIcon className="h-4 w-4" />}
                {loading || isSubmitting
                  ? (isEditMode ? 'Updating...' : 'Creating...')
                  : (isEditMode ? `Update ${organizationLabel}` : `Create ${organizationLabel}`)}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
};

export default PartyMasterForm;
