import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  SelectItem,
} from '@heroui-v2/react';
import { ArrowLeftIcon, BuildingOffice2Icon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CustomerTable } from '../../components/Tables/customerTable';
import { FormField } from '../../components/ui/form-field';
import { apiService } from '../../services/apiService';
import { queryKeys } from '../../hooks/queries/queryKeys';
import { useOrganizationsQuery } from '../../hooks/queries/organizations';
import type { Address, Contact, Organization } from '../../types';
import { toast } from 'sonner';
import { Country, State } from 'country-state-city';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../features/auth/store/authStore';
import { decodeCalibrationAccessToken } from '../../features/auth/utils/calibrationToken';

type LaboratoryEditorState =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'edit'; id: string; laboratory: Organization };

type LaboratoryType = 'NABL Lab' | 'Non-NABL Lab';
type LaboratoryStatus = 'active' | 'deactive';

type LaboratoryFormValues = {
  name: string;
  description: string;
  gst: string;
  gst_type: string;
  contacts: Contact[];
  address: Address;
  lab_type: LaboratoryType;
  lab_certificate_number: string;
  status: LaboratoryStatus;
};

type LaboratoryPayload = {
  name: string;
  description: string;
  org_type: 'laboratory';
  contacts: Contact[];
  address: Address;
  contract: null;
  gst: string | null;
  gst_type: string | null;
  lab_ids: string[];
  lab_type: LaboratoryType;
  lab_certificate_number: string;
  is_active: boolean;
};

type LaboratoryFormErrors = Partial<Record<'name' | 'lab_certificate_number' | 'address_line_1', string>>;

const INPUT_CLASS_NAMES = {
  inputWrapper: 'border border-gray-300 hover:border-gray-400 focus:border-primary bg-white',
};

const SELECT_CLASS_NAMES = {
  trigger: 'border border-gray-300 hover:border-gray-400 focus:border-primary bg-white',
};

const AUTOCOMPLETE_CLASS_NAMES = {
  inputWrapper: 'border border-gray-300 hover:border-gray-400 focus-within:border-primary bg-white',
};

const LAB_TYPE_OPTIONS: Array<{ key: LaboratoryType; label: string }> = [
  { key: 'NABL Lab', label: 'NABL Lab' },
  { key: 'Non-NABL Lab', label: 'Non-NABL Lab' },
];

const LAB_STATUS_OPTIONS: Array<{ key: LaboratoryStatus; label: string }> = [
  { key: 'active', label: 'Active' },
  { key: 'deactive', label: 'Deactive' },
];

const normalizeLaboratoryType = (value: Organization['lab_type']): LaboratoryType => {
  const normalizedValue = String(value ?? '').trim().toLowerCase();
  if (normalizedValue === 'non_nabl' || normalizedValue === 'non-nabl lab' || normalizedValue === 'non nabl lab') {
    return 'Non-NABL Lab';
  }
  return 'NABL Lab';
};

const buildInitialLaboratoryValues = (laboratory?: Organization): LaboratoryFormValues => ({
  name: laboratory?.name ?? '',
  description: laboratory?.description ?? '',
  gst: laboratory?.gst ?? '',
  gst_type: laboratory?.gst_type ?? '',
  contacts: laboratory?.contacts?.length
    ? laboratory.contacts.map((contact) => ({
      name: contact.name ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
    }))
    : [],
  address: {
    address_line_1: laboratory?.address?.address_line_1 ?? '',
    address_line_2: laboratory?.address?.address_line_2 ?? '',
    city: laboratory?.address?.city ?? '',
    state: laboratory?.address?.state ?? '',
    zip_code: laboratory?.address?.zip_code ?? '',
    country: laboratory?.address?.country || 'India',
  },
  lab_type: normalizeLaboratoryType(laboratory?.lab_type),
  lab_certificate_number: laboratory?.lab_certificate_number ?? '',
  status: laboratory?.is_active === false ? 'deactive' : 'active',
});

const buildLaboratoryPayload = (values: LaboratoryFormValues): LaboratoryPayload => {
  const contacts = values.contacts
    .map((contact) => ({
      name: contact.name?.trim() || '',
      email: contact.email?.trim() || '',
      phone: contact.phone?.trim() || '',
    }))
    .filter((contact) => contact.name || contact.email || contact.phone);

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    org_type: 'laboratory',
    contacts,
    address: {
      address_line_1: values.address.address_line_1.trim(),
      address_line_2: values.address.address_line_2?.trim() || '',
      city: values.address.city.trim(),
      state: values.address.state.trim(),
      zip_code: values.address.zip_code.trim(),
      country: values.address.country.trim() || 'India',
    },
    contract: null,
    gst: values.gst.trim() || null,
    gst_type: values.gst_type.trim() || null,
    lab_ids: [],
    lab_type: values.lab_type,
    lab_certificate_number: values.lab_certificate_number.trim(),
    is_active: values.status === 'active',
  };
};

function LaboratoryForm({
  mode,
  laboratory,
  isSaving,
  onCancel,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  laboratory?: Organization;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (payload: LaboratoryPayload) => void;
}) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const [values, setValues] = useState<LaboratoryFormValues>(() => buildInitialLaboratoryValues(laboratory));
  const [errors, setErrors] = useState<LaboratoryFormErrors>({});
  const selectedCountryName = values.address.country;
  const selectedCountry = useMemo(
    () => countries.find((country) => country.name === selectedCountryName) ?? null,
    [countries, selectedCountryName],
  );
  const states = useMemo(
    () => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []),
    [selectedCountry],
  );

  const updateValue = <Key extends keyof LaboratoryFormValues>(
    key: Key,
    value: LaboratoryFormValues[Key],
  ) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
    if (key === 'name' || key === 'lab_certificate_number') {
      setErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }));
    }
  };

  const updateAddressValue = (key: keyof Address, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      address: {
        ...currentValues.address,
        [key]: value,
      },
    }));
    if (key === 'address_line_1') {
      setErrors((currentErrors) => ({ ...currentErrors, address_line_1: undefined }));
    }
  };

  const updateContactValue = (index: number, key: keyof Contact, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      contacts: currentValues.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [key]: value } : contact
      ),
    }));
  };

  const addContact = () => {
    setValues((currentValues) => ({
      ...currentValues,
      contacts: [...currentValues.contacts, { name: '', email: '', phone: '' }],
    }));
  };

  const removeContact = (index: number) => {
    setValues((currentValues) => ({
      ...currentValues,
      contacts: currentValues.contacts.filter((_, contactIndex) => contactIndex !== index),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: LaboratoryFormErrors = {};
    if (!values.name.trim()) {
      nextErrors.name = 'Laboratory name is required';
    }
    if (!values.lab_certificate_number.trim()) {
      nextErrors.lab_certificate_number = 'Lab CC number or certificate number is required';
    }
    if (!values.address.address_line_1.trim()) {
      nextErrors.address_line_1 = 'Address is required';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    onSubmit(buildLaboratoryPayload(values));
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-950">
            {mode === 'create' ? 'Create Laboratory' : 'Edit Laboratory'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Maintain the platform laboratory workspace and accreditation details.
          </p>
        </div>
      </CardHeader>
      <CardBody className="px-6 py-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Laboratory Name" required error={errors.name}>
              <Input
                value={values.name}
                onValueChange={(value) => updateValue('name', value)}
                placeholder="Enter laboratory name"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="Type of Lab" required>
              <Select
                aria-label="Type of Lab"
                selectedKeys={new Set([values.lab_type])}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0];
                  if (selectedKey) {
                    updateValue('lab_type', String(selectedKey) as LaboratoryType);
                  }
                }}
                isDisabled={isSaving}
                classNames={SELECT_CLASS_NAMES}
              >
                {LAB_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Certificate Number"
              required
              error={errors.lab_certificate_number}
            >
              <Input
                value={values.lab_certificate_number}
                onValueChange={(value) => updateValue('lab_certificate_number', value)}
                placeholder="Enter lab CC or certificate number"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="Status" required>
              <Select
                aria-label="Status"
                selectedKeys={new Set([values.status])}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0];
                  if (selectedKey) {
                    updateValue('status', String(selectedKey) as LaboratoryStatus);
                  }
                }}
                isDisabled={isSaving}
                classNames={SELECT_CLASS_NAMES}
              >
                {LAB_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.key}>{option.label}</SelectItem>
                ))}
              </Select>
            </FormField>

            <FormField label="GST No">
              <Input
                value={values.gst}
                onValueChange={(value) => updateValue('gst', value)}
                placeholder="GST number"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="GST Type">
              <Select
                placeholder="Select GST Type"
                selectedKeys={values.gst_type ? new Set([values.gst_type]) : new Set([])}
                onSelectionChange={(keys) => {
                  const selectedKey = Array.from(keys)[0];
                  updateValue('gst_type', selectedKey ? String(selectedKey) : '');
                }}
                isDisabled={isSaving}
                classNames={SELECT_CLASS_NAMES}
              >
                <SelectItem key="Cgst_Sgst">CGST/SGST</SelectItem>
                <SelectItem key="Igst">IGST</SelectItem>
              </Select>
            </FormField>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-gray-900">Contact Details</p>
              <Button
                type="button"
                onPress={addContact}
                variant="flat"
                color="primary"
                size="sm"
                startContent={<PlusIcon className="h-4 w-4" />}
                isDisabled={isSaving}
              >
                Add Contact
              </Button>
            </div>

            {values.contacts.length === 0 ? (
              <p className="text-sm text-gray-500">Add contact only if needed.</p>
            ) : (
              <div className="space-y-3">
                {values.contacts.map((contact, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                  >
                    <FormField label={index === 0 ? 'Name' : undefined}>
                      <Input
                        value={contact.name}
                        onValueChange={(value) => updateContactValue(index, 'name', value)}
                        placeholder="Contact name"
                        isDisabled={isSaving}
                        classNames={INPUT_CLASS_NAMES}
                      />
                    </FormField>

                    <FormField label={index === 0 ? 'Email' : undefined}>
                      <Input
                        value={contact.email}
                        onValueChange={(value) => updateContactValue(index, 'email', value)}
                        placeholder="contact@example.com / NA"
                        isDisabled={isSaving}
                        classNames={INPUT_CLASS_NAMES}
                      />
                    </FormField>

                    <FormField label={index === 0 ? 'Phone' : undefined}>
                      <Input
                        value={contact.phone}
                        onValueChange={(value) => updateContactValue(index, 'phone', value)}
                        placeholder="Phone number / -"
                        isDisabled={isSaving}
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
                      isDisabled={isSaving}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Address" required error={errors.address_line_1} className="md:col-span-2 xl:col-span-4">
              <Input
                value={values.address.address_line_1}
                onValueChange={(value) => updateAddressValue('address_line_1', value)}
                placeholder="Enter address"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="Address Line 2" className="md:col-span-2 xl:col-span-4">
              <Input
                value={values.address.address_line_2 ?? ''}
                onValueChange={(value) => updateAddressValue('address_line_2', value)}
                placeholder="Optional address line"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="City">
              <Input
                value={values.address.city}
                onValueChange={(value) => updateAddressValue('city', value)}
                placeholder="City / NA"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="State">
              <Autocomplete
                aria-label="State"
                selectedKey={values.address.state || null}
                inputValue={values.address.state || ''}
                onInputChange={(value) => updateAddressValue('state', value)}
                onSelectionChange={(key) => updateAddressValue('state', (key as string | null) || '')}
                placeholder={selectedCountry ? 'Search and select state' : 'Select country first'}
                allowsCustomValue
                isDisabled={!selectedCountry || isSaving}
                classNames={AUTOCOMPLETE_CLASS_NAMES}
              >
                {states.map((state) => (
                  <AutocompleteItem key={state.name} textValue={state.name}>
                    {state.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </FormField>

            <FormField label="ZIP Code">
              <Input
                value={values.address.zip_code}
                onValueChange={(value) => updateAddressValue('zip_code', value)}
                placeholder="ZIP / -"
                isDisabled={isSaving}
                classNames={INPUT_CLASS_NAMES}
              />
            </FormField>

            <FormField label="Country">
              <Autocomplete
                aria-label="Country"
                selectedKey={values.address.country || null}
                inputValue={values.address.country || ''}
                onInputChange={(value) => updateAddressValue('country', value)}
                onSelectionChange={(key) => {
                  const nextValue = (key as string | null) || '';
                  updateAddressValue('country', nextValue);
                  if (nextValue !== selectedCountryName) {
                    updateAddressValue('state', '');
                  }
                }}
                placeholder="Search and select country"
                allowsCustomValue
                isDisabled={isSaving}
                classNames={AUTOCOMPLETE_CLASS_NAMES}
              >
                {countries.map((country) => (
                  <AutocompleteItem key={country.name} textValue={country.name}>
                    {country.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button type="button" variant="flat" onPress={onCancel} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" color="primary" isLoading={isSaving}>
              {mode === 'create' ? 'Create Laboratory' : 'Save Laboratory'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

export const SettingsLaboratories = () => {
  const [editor, setEditor] = useState<LaboratoryEditorState>({ mode: 'list' });
  const [laboratoryAssignments, setLaboratoryAssignments] = useState<Record<string, string>>({});
  const [isRestoringPlatformAccess, setIsRestoringPlatformAccess] = useState(false);
  const [platformAccessError, setPlatformAccessError] = useState<string | null>(null);
  const { user, switchLaboratoryContext } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const tokenClaims = decodeCalibrationAccessToken(accessToken ?? '');
  const isLaboratoryContext = tokenClaims?.scope === 'laboratory';
  const isPlatformReady = Boolean(user) && !isLaboratoryContext && !isRestoringPlatformAccess;

  const restorePlatformAccess = useCallback(async () => {
    setIsRestoringPlatformAccess(true);
    setPlatformAccessError(null);
    try {
      await switchLaboratoryContext(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore platform access.';
      setPlatformAccessError(message);
      toast.error(message);
    } finally {
      setIsRestoringPlatformAccess(false);
    }
  }, [switchLaboratoryContext]);

  useEffect(() => {
    if (!isLaboratoryContext || isRestoringPlatformAccess || platformAccessError) {
      return;
    }

    void restorePlatformAccess();
  }, [isLaboratoryContext, isRestoringPlatformAccess, platformAccessError, restorePlatformAccess]);

  const queryClient = useQueryClient();
  const laboratoriesQuery = useOrganizationsQuery({
    directory: 'laboratories',
    limit: 500,
    enabled: isPlatformReady,
  });
  const unassignedCustomersQuery = useQuery({
    queryKey: ['organizations', 'unassigned-customers'],
    queryFn: async (): Promise<Organization[]> => {
      const response = await apiService.getUnassignedCustomerOrganizations({ page: 0, limit: 500 });
      return Array.isArray(response?.organizations) ? response.organizations as Organization[] : [];
    },
    enabled: isPlatformReady,
  });
  const saveLaboratoryMutation = useMutation({
    mutationFn: async ({
      id,
      mode,
      payload,
    }: {
      id?: string;
      mode: 'create' | 'edit';
      payload: LaboratoryPayload;
    }): Promise<Organization> => {
      return mode === 'create'
        ? apiService.createLaboratory(payload)
        : apiService.updateLaboratory(id!, payload);
    },
    onSuccess: (laboratory, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.lists() });
      if (laboratory?.id) {
        queryClient.setQueryData(queryKeys.organizations.detail(laboratory.id), laboratory);
      }
      toast.success(
        variables.mode === 'create'
          ? 'Laboratory created successfully'
          : 'Laboratory updated successfully',
      );
      setEditor({ mode: 'list' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to save laboratory');
    },
  });
  const assignCustomerMutation = useMutation({
    mutationFn: ({ customerId, laboratoryId }: { customerId: string; laboratoryId: string }) =>
      apiService.assignCustomerToLaboratory(customerId, laboratoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'unassigned-customers'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      toast.success('Customer linked to laboratory');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Unable to link customer to laboratory');
    },
  });
  const laboratories = useMemo(
    () => laboratoriesQuery.data?.organizations ?? [],
    [laboratoriesQuery.data?.organizations],
  );
  const selectedLaboratory = editor.mode === 'edit' ? editor.laboratory : undefined;
  const unassignedCustomers = useMemo(
    () => unassignedCustomersQuery.data ?? [],
    [unassignedCustomersQuery.data],
  );
  const defaultLaboratoryId = laboratories[0]?.id ?? '';
  const hasUnassignedCustomers = unassignedCustomers.length > 0;
  const assignmentRows = useMemo(
    () => unassignedCustomers.map((customer) => ({
      customer,
      laboratoryId: laboratoryAssignments[customer.id] ?? defaultLaboratoryId,
    })),
    [defaultLaboratoryId, laboratoryAssignments, unassignedCustomers],
  );

  const openLaboratoryEditor = useCallback((id: string) => {
    const laboratory = laboratories.find((candidate) => candidate.id === id);
    if (!laboratory) {
      toast.error('Laboratory details could not be found. Please refresh and try again.');
      return;
    }
    setEditor({ mode: 'edit', id, laboratory });
  }, [laboratories]);

  if (!isPlatformReady) {
    return (
      <div className="space-y-4 p-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardBody className="flex items-center justify-center gap-4 p-10 text-center">
            {platformAccessError ? (
              <>
                <p className="text-sm font-medium text-red-600">{platformAccessError}</p>
                <Button color="primary" onPress={() => void restorePlatformAccess()}>
                  Try again
                </Button>
              </>
            ) : (
              <p className="text-sm font-medium text-gray-600">
                Returning to platform access...
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (editor.mode !== 'list') {
    return (
      <div className="space-y-4 p-2">
        <Button
          variant="light"
          startContent={<ArrowLeftIcon className="h-4 w-4" />}
          onPress={() => setEditor({ mode: 'list' })}
        >
          Back to laboratories
        </Button>

        <LaboratoryForm
          mode={editor.mode}
          laboratory={selectedLaboratory}
          isSaving={saveLaboratoryMutation.isPending}
          onCancel={() => setEditor({ mode: 'list' })}
          onSubmit={(payload) => saveLaboratoryMutation.mutate({
            mode: editor.mode,
            id: editor.mode === 'edit' ? editor.id : undefined,
            payload,
          })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BuildingOffice2Icon className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold text-gray-900">Laboratories</h2>
            <p className="text-sm text-gray-500">Create and maintain laboratory workspaces.</p>
          </div>
        </div>
        <Button
          color="primary"
          startContent={<PlusIcon className="h-4 w-4" />}
          onPress={() => setEditor({ mode: 'create' })}
        >
          Create Laboratory
        </Button>
      </div>

      <CustomerTable
        directory="laboratories"
        entityLabel="Laboratory"
        tableStatePrefix="laboratories"
        showRateCard={false}
        canManage
        onEdit={openLaboratoryEditor}
      />

      {hasUnassignedCustomers && (
        <section className="border-t border-amber-200 bg-amber-50/60 px-4 py-5" aria-labelledby="unassigned-customers-title">
          <div className="mb-4">
            <h3 id="unassigned-customers-title" className="text-sm font-semibold text-amber-950">
              Unassigned customer organizations
            </h3>
            <p className="mt-1 text-sm text-amber-900/80">
              Assign each existing customer to its laboratory before staff can manage it in Client Master.
            </p>
          </div>
          <div className="space-y-3">
            {assignmentRows.map(({ customer, laboratoryId }) => (
              <div key={customer.id} className="grid gap-3 border border-amber-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_auto] md:items-center">
                <p className="truncate text-sm font-medium text-gray-900" title={customer.name}>{customer.name}</p>
                <Select
                  aria-label={`Laboratory for ${customer.name}`}
                  selectedKeys={laboratoryId ? [laboratoryId] : []}
                  onSelectionChange={(keys) => {
                    const nextLaboratoryId = String(Array.from(keys)[0] ?? '');
                    setLaboratoryAssignments((current) => ({ ...current, [customer.id]: nextLaboratoryId }));
                  }}
                  size="sm"
                  isDisabled={laboratories.length === 0 || assignCustomerMutation.isPending}
                >
                  {laboratories.map((laboratory) => (
                    <SelectItem key={laboratory.id}>{laboratory.name}</SelectItem>
                  ))}
                </Select>
                <Button
                  color="primary"
                  size="sm"
                  isDisabled={!laboratoryId}
                  isLoading={assignCustomerMutation.isPending}
                  onPress={() => assignCustomerMutation.mutate({ customerId: customer.id, laboratoryId })}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
