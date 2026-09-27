import { useEffect, useMemo, useRef } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { UserIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useOrganizations, type Organization } from "../../hooks/useOrganizations";
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
  AutocompleteItem,
  Input,
  Button,
  Card,
  CardHeader,
  CardBody,
  Select,
  SelectItem,
  Checkbox,
} from "@heroui-v2/react";

interface PartyMasterFormProps {
  mode?: 'create' | 'edit';
  organizationId?: string;
  directory?: Extract<OrganizationDirectory, 'customers' | 'laboratories'>;
  returnPath?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

const INPUT_CLASS_NAMES = {
  inputWrapper: "border border-gray-300 hover:border-gray-400 focus:border-primary bg-white",
};

const SELECT_CLASS_NAMES = {
  trigger: "border border-gray-300 hover:border-gray-400 focus:border-primary bg-white",
};

const AUTOCOMPLETE_CLASS_NAMES = {
  inputWrapper: "border border-gray-300 hover:border-gray-400 focus-within:border-primary bg-white",
};

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

      const submitData: OrganizationFormData = {
        ...data,
        description: data.description?.trim() || '',
        parent_id: data.parent_id?.trim() || '',
        gst: data.gst?.trim() || '',
        gst_type: data.gst_type?.trim() || '',
        contacts: normalizedContacts,
        address: {
          ...data.address,
          address_line_1: data.address.address_line_1?.trim() || '',
          address_line_2: data.address.address_line_2?.trim() || '',
          city: data.address.city?.trim() || '',
          state: data.address.state?.trim() || '',
          zip_code: data.address.zip_code?.trim() || '',
          country: data.address.country?.trim() || '',
        },
        archived: data.archived ?? false,
        contract: {
          ...data.contract,
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
          <CardBody className="p-6">
            <div className="flex flex-col gap-4">
          <p className="text-danger-600 text-sm font-medium">{organizationLabel} not found or failed to load.</p>
              <Button
                variant="flat"
                color="primary"
                onPress={returnToList}
              >
                Back to {directory === 'laboratories' ? 'Laboratories' : 'Clients'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <UserIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {isEditMode ? `Edit ${organizationLabel}` : `Create ${organizationLabel}`}
              </h1>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-4">
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
                <Input
                  {...register('name')}
                  placeholder={`Enter ${organizationLabel.toLowerCase()} name`}
                  isInvalid={!!errors.name}
                  errorMessage={errors.name?.message}
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <FormField label="GST No">
                <Input
                  {...register('gst')}
                  placeholder="GST number"
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <FormField label="GST Type">  
                 <Select
                  placeholder="Select GST Type"
                  selectedKeys={watch('gst_type') ? [watch('gst_type')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setValue('gst_type', value, { shouldDirty: true });
                  }}
                  classNames={SELECT_CLASS_NAMES}
                >
                    <SelectItem key='Cgst_Sgst'>CGST/SGST</SelectItem>
                    <SelectItem key='Igst'>IGST</SelectItem>

                </Select>
              </FormField>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900">Contact Details</p>
                <Button
                  type="button"
                  onPress={addContact}
                  variant="flat"
                  color="primary"
                  size="sm"
                  startContent={<PlusIcon className="h-4 w-4" />}
                >
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
                      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                    >
                      <FormField label={index === 0 ? "Name" : undefined}>
                        <Input
                          {...register(`contacts.${index}.name`)}
                          placeholder="Contact name"
                          classNames={INPUT_CLASS_NAMES}
                        />
                      </FormField>

                      <FormField label={index === 0 ? "Email" : undefined}>
                        <Input
                          {...register(`contacts.${index}.email`)}
                          placeholder="contact@example.com / NA"
                          classNames={INPUT_CLASS_NAMES}
                        />
                      </FormField>

                      <FormField label={index === 0 ? "Phone" : undefined}>
                        <Input
                          {...register(`contacts.${index}.phone`)}
                          placeholder="Phone number / -"
                          classNames={INPUT_CLASS_NAMES}
                        />
                      </FormField>

                      <Button
                        type="button"
                        onPress={() => removeContact(index)}
                        variant="flat"
                        color="danger"
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
                  isInvalid={!!errors.address?.address_line_1}
                  errorMessage={errors.address?.address_line_1?.message}
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <FormField label="City">
                <Input
                  {...register('address.city')}
                  placeholder="City / NA"
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <FormField label="State">
                <Controller
                  name="address.state"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      aria-label="State"
                      selectedKey={field.value || null}
                      inputValue={field.value || ''}
                      onInputChange={(value) => field.onChange(value)}
                      onSelectionChange={(key) => field.onChange((key as string | null) || '')}
                      placeholder={selectedCountry ? "Search and select state" : "Select country first"}
                      allowsCustomValue
                      isDisabled={!selectedCountry}
                      classNames={AUTOCOMPLETE_CLASS_NAMES}
                    >
                      {states.map((state) => (
                        <AutocompleteItem key={state.name} textValue={state.name}>
                          {state.name}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  )}
                />
              </FormField>

              <FormField label="ZIP Code">
                <Input
                  {...register('address.zip_code')}
                  placeholder="ZIP / -"
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <FormField label="Country">
                <Controller
                  name="address.country"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      aria-label="Country"
                      selectedKey={field.value || null}
                      inputValue={field.value || ''}
                      onInputChange={(value) => field.onChange(value)}
                      onSelectionChange={(key) => {
                        const nextValue = (key as string | null) || '';
                        field.onChange(nextValue);
                        if (nextValue !== selectedCountryName) {
                          setValue('address.state', '', { shouldDirty: true });
                        }
                      }}
                      placeholder="Search and select country"
                      allowsCustomValue
                      classNames={AUTOCOMPLETE_CLASS_NAMES}
                    >
                      {countries.map((country) => (
                        <AutocompleteItem key={country.name} textValue={country.name}>
                          {country.name}
                        </AutocompleteItem>
                      ))}
                    </Autocomplete>
                  )}
                />
              </FormField>

              <FormField
                label="Calibration Method"
                required
                error={errors.contract?.calibration_method?.message}
              >
                <Select
                  placeholder="Select method"
                  selectedKeys={watch('contract.calibration_method') ? [watch('contract.calibration_method')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setValue('contract.calibration_method', value, { shouldDirty: true });
                  }}
                  isInvalid={!!errors.contract?.calibration_method}
                  errorMessage={errors.contract?.calibration_method?.message}
                  classNames={SELECT_CLASS_NAMES}
                >
                  <SelectItem key="lab_method">Lab Method</SelectItem>
                  <SelectItem key="standard_method">Standard Method</SelectItem>
                </Select>
              </FormField>

              <FormField
                label="Reporting Method"
                required
                error={errors.contract?.reporting_method?.message}
              >
                <Select
                  placeholder="Select method"
                  selectedKeys={watch('contract.reporting_method') ? [watch('contract.reporting_method')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setValue('contract.reporting_method', value, { shouldDirty: true });
                  }}
                  isInvalid={!!errors.contract?.reporting_method}
                  errorMessage={errors.contract?.reporting_method?.message}
                  classNames={SELECT_CLASS_NAMES}
                >
                  <SelectItem key="lab_format">Lab Format</SelectItem>
                  <SelectItem key="standard_format">Standard Format</SelectItem>
                </Select>
              </FormField>

              <FormField
                label="Collection Mode"
                required
                error={errors.contract?.collection_mode?.message}
              >
                <Select
                  placeholder="Select mode"
                  selectedKeys={watch('contract.collection_mode') ? [watch('contract.collection_mode')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setValue('contract.collection_mode', value, { shouldDirty: true });
                  }}
                  isInvalid={!!errors.contract?.collection_mode}
                  errorMessage={errors.contract?.collection_mode?.message}
                  classNames={SELECT_CLASS_NAMES}
                >
                  <SelectItem key="by_hand">By Hand</SelectItem>
                  <SelectItem key="by_courier">Courier</SelectItem>
                  <SelectItem key="pickup">Pickup</SelectItem>
                </Select>
              </FormField>

              <FormField
                label="Dispatch Mode"
                required
                error={errors.contract?.dispatch_mode?.message}
              >
                <Select
                  placeholder="Select mode"
                  selectedKeys={watch('contract.dispatch_mode') ? [watch('contract.dispatch_mode')] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as string;
                    setValue('contract.dispatch_mode', value, { shouldDirty: true });
                  }}
                  isInvalid={!!errors.contract?.dispatch_mode}
                  errorMessage={errors.contract?.dispatch_mode?.message}
                  classNames={SELECT_CLASS_NAMES}
                >
                  <SelectItem key="by_hand">By Hand</SelectItem>
                  <SelectItem key="by_courier">Courier</SelectItem>
                  <SelectItem key="pickup">Pickup</SelectItem>
                </Select>
              </FormField>

              <FormField label="Specific Requirements" className="md:col-span-2 xl:col-span-4">
                <Input
                  {...register('contract.specific_requirements')}
                  placeholder="Optional notes / - / NA"
                  classNames={INPUT_CLASS_NAMES}
                />
              </FormField>

              <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center md:gap-6">
                <Controller
                  name="contract.conformity_statement"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      isSelected={field.value || false}
                      onValueChange={field.onChange}
                      classNames={{
                        label: "text-sm text-gray-700",
                      }}
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
                      onValueChange={field.onChange}
                      classNames={{
                        label: "text-sm text-gray-700",
                      }}
                    >
                      Confirmatory Accepted (If applicable, the decision rule has been discussed, understood, and accepted)

                    </Checkbox>
                  )}
                />
              </div>
            </div>

            {error && (
              <Card className="border border-danger-200 bg-danger-50">
                <CardBody className="p-4">
                  <p className="text-danger-600 text-sm">{error}</p>
                </CardBody>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <Button
                type="button"
                variant="flat"
                onPress={returnToList}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                isLoading={loading || isSubmitting}
                className="min-w-[150px]"
                startContent={!loading && !isSubmitting && <UserIcon className="h-4 w-4" />}
              >
                {loading || isSubmitting
                  ? (isEditMode ? 'Updating...' : 'Creating...')
                  : (isEditMode ? `Update ${organizationLabel}` : `Create ${organizationLabel}`)}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default PartyMasterForm;
