"use client"
import { useForm, Controller, useWatch } from "react-hook-form"
import { useMemo, useCallback, useEffect, useRef, useState, memo } from "react"
import { Calendar, DateField, DatePicker, Input, Button, Card, Checkbox, ListBox, Select, Spinner } from "@heroui/react"
import { parseDate } from "@internationalized/date"
import { FormField } from "../ui/form-field"
import { useNavigate, useSearchParams, useParams } from "react-router-dom"
import { toast } from "sonner"
import { useOrganizations } from "../../hooks/useOrganizations"
import { format } from "date-fns"
import { enhancedInwardFormSchema, zodResolver } from "../../lib/validations"
import type { InwardFormData as InwardBaseFormData } from "../../types"
import type { InwardEntry } from "../../types"
import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline"
import { FormDateProvider } from "./FormDateProvider"
import { useCreateInwardEntryMutation, useInwardEntryQuery, useUpdateInwardEntryMutation } from "../../hooks/queries/inwards";
import { buildRegisterGaugeRoute } from "../../utils/inwardRoutes";

// Use the type from validations with date adjustments for form handling
type InwardFormData = Omit<InwardBaseFormData, 'created_at' | 'updated_at'> & {
  client_org_name: string;
  billing_org_name: string;
  delivery_org_name: string;
  created_at: string | null;
  updated_at: string | null;
}

// API request type (dates as strings, excluding auto-managed fields)
type InwardApiRequest = Omit<InwardFormData, 'client_dc_date' | 'inward_date' | 'received_date' | 'commit_date' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  client_dc_date: string;
  inward_date: string;
  received_date: string;
  commit_date: string;
}

const getFormErrorMessage = (error: unknown): string | undefined => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message
    return typeof message === 'string' ? message : undefined
  }
  return undefined
}

type SelectOption = { value: string; label: string }

const V3Select = ({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) => (
  <Select selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : "")} isDisabled={disabled} placeholder={placeholder} aria-label={ariaLabel}>
    <Select.Trigger className="w-full">
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox>
        {options.map((option) => (
          <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
            {option.label}
            <ListBox.ItemIndicator />
          </ListBox.Item>
        ))}
      </ListBox>
    </Select.Popover>
  </Select>
)

const V3DatePicker = ({
  value,
  onChange,
  ariaLabel,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  ariaLabel: string;
}) => (
  <DatePicker
    value={value ? parseDate(format(value, "yyyy-MM-dd")) : null}
    onChange={(date) => onChange(date ? new Date(String(date)) : undefined)}
    className="w-full"
  >
    <DateField.Group fullWidth>
      <DateField.Input aria-label={ariaLabel}>
        {(segment) => <DateField.Segment segment={segment} />}
      </DateField.Input>
      <DateField.Suffix>
        <DatePicker.Trigger>
          <DatePicker.TriggerIndicator />
        </DatePicker.Trigger>
      </DateField.Suffix>
    </DateField.Group>
    <DatePicker.Popover>
      <Calendar aria-label={ariaLabel}>
        <Calendar.Header>
          <Calendar.NavButton slot="previous" />
          <Calendar.Heading />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>
            {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
          </Calendar.GridHeader>
          <Calendar.GridBody>
            {(date) => <Calendar.Cell date={date} />}
          </Calendar.GridBody>
        </Calendar.Grid>
      </Calendar>
    </DatePicker.Popover>
  </DatePicker>
)

const InwardForm = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const params = useParams<{ inwardId?: string }>()
  const [loading, setLoading] = useState(false)
  const { organizations, loading: orgLoading } = useOrganizations("customers")
  const isEditMode = !!params.inwardId
  const hasHandledLoadError = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    control
  } = useForm<InwardFormData>({
    resolver: zodResolver(enhancedInwardFormSchema) as any,
    defaultValues: {
      client_org_id: "",
      billing_org_id: "",
      delivery_org_id: "",
      other_access_org_id: "",
      client_org_name: "",
      billing_org_name: "",
      delivery_org_name: "",
      client_dc_no: "",
      client_dc_date: undefined,
      through: "",
      inward_date: undefined,
      received_date: undefined,
      commit_date: undefined,
      calibration_method: "lab_method",
      reporting_method: "lab_format",
      collection_mode: "by_hand",
      dispatch_mode: "by_hand",
      additional_requirements: "",
      specific_requirements: "",
      rate_card: null,
      archived: false,
      created_at: null,
      updated_at: null,
      deleted_at: null,
      lab_authorized_person_id: "",
      lab_authorized_person_designation: "",
      client_authorized_person_id: "",
      client_authorized_person_contact: "",
      conformity_statement: false,
      conformity_accepted: false,
    },
    // Changed from 'onChange' to 'onBlur' for better performance with large forms
    // Validates only when user leaves a field, reducing re-renders
    mode: "onBlur",
    // Re-validate on submit only
    reValidateMode: "onChange"
  })

  // Use useWatch for specific fields instead of watch() to reduce re-renders
  const calibrationMethod = useWatch({ control, name: "calibration_method" })
  const reportingMethod = useWatch({ control, name: "reporting_method" })
  const collectionMode = useWatch({ control, name: "collection_mode" })
  const dispatchMode = useWatch({ control, name: "dispatch_mode" })
  const conformityStatement = useWatch({ control, name: "conformity_statement" })
  const conformityAccepted = useWatch({ control, name: "conformity_accepted" })

  // Watch organization fields to set selectedKeys in Select components
  const clientOrgId = useWatch({ control, name: "client_org_id" })
  const billingOrgId = useWatch({ control, name: "billing_org_id" })
  const deliveryOrgId = useWatch({ control, name: "delivery_org_id" })
  const otherAccessOrgId = useWatch({ control, name: "other_access_org_id" })

  const inwardEntryQuery = useInwardEntryQuery(params.inwardId ?? null, {
    enabled: isEditMode && !!params.inwardId,
  })
  const loadingData = isEditMode && (inwardEntryQuery.isLoading || inwardEntryQuery.isFetching)

  // Memoize organization selection handler to prevent unnecessary re-renders
  const handleOrganizationSelect = useCallback((orgId: string, fieldType: 'client' | 'billing' | 'delivery' | 'other') => {
    const selectedOrg = organizations.find(org => org.id === orgId)

    if (selectedOrg) {
      const fieldName = fieldType === 'other' ? 'other_access_org_id' : `${fieldType}_org_id`
      setValue(fieldName as keyof InwardFormData, orgId, { shouldValidate: false })

      // Auto-populate all fields when client is selected
      if (fieldType === 'client') {
        setValue("billing_org_id", orgId, { shouldValidate: false })
        setValue("delivery_org_id", orgId, { shouldValidate: false })
        setValue("other_access_org_id", orgId, { shouldValidate: false })
        setValue("client_org_name", selectedOrg.name, { shouldValidate: false })
        setValue("billing_org_name", selectedOrg.name, { shouldValidate: false })
        setValue("delivery_org_name", selectedOrg.name, { shouldValidate: false })
        console.log('selectedOrg.contract', selectedOrg.contract);
        // Auto-populate contract details if available
        if (selectedOrg.contract) {
          setValue("calibration_method", (selectedOrg.contract.calibration_method || "lab_method") as "lab_method" | "customer_specified_method" | "standard_method", { shouldValidate: false })
          setValue("reporting_method", (selectedOrg.contract.reporting_method || "lab_format") as "lab_format" | "customer_specified_format" | "standard_format", { shouldValidate: false })
          setValue("collection_mode", (selectedOrg.contract.collection_mode || "by_hand") as "by_hand" | "by_courier", { shouldValidate: false })
          setValue("dispatch_mode", (selectedOrg.contract.dispatch_mode || "by_hand") as "by_hand" | "by_courier", { shouldValidate: false })
          setValue("conformity_statement", selectedOrg.contract.conformity_statement ?? false, { shouldValidate: false })
          setValue("conformity_accepted", selectedOrg.contract.conformity_accepted ?? false, { shouldValidate: false })
          setValue("specific_requirements", selectedOrg.contract.specific_requirements || "", { shouldValidate: false })
          setValue("rate_card", selectedOrg.contract.rate_card ?? null, { shouldValidate: false })
        }
      }
    }
  }, [organizations, setValue])
  // Convert form data to API format - memoized to prevent recreation
  // Excludes created_at, updated_at, deleted_at as they are auto-managed by backend
  const convertToApiFormat = useCallback((data: InwardFormData): InwardApiRequest => {
    const { created_at, updated_at, deleted_at, ...formData } = data;
    return {
      ...formData,
      client_dc_date: data.client_dc_date ? format(data.client_dc_date, "yyyy-MM-dd") : "",
      inward_date: data.inward_date ? format(data.inward_date, "yyyy-MM-dd") : "",
      received_date: data.received_date ? format(data.received_date, "yyyy-MM-dd") : "",
      commit_date: data.commit_date ? format(data.commit_date, "yyyy-MM-dd") : "",
    };
  }, []);

  const mapInwardToFormData = useCallback((inwardData: InwardEntry): Partial<InwardFormData> => {
    return {
      client_org_id: inwardData.client_org_id,
      billing_org_id: inwardData.billing_org_id,
      delivery_org_id: inwardData.delivery_org_id,
      other_access_org_id: inwardData.other_access_org_id,
      client_org_name: inwardData.client_org_name,
      billing_org_name: inwardData.billing_org_name,
      delivery_org_name: inwardData.delivery_org_name,
      client_dc_no: inwardData.client_dc_no,
      client_dc_date: inwardData.client_dc_date ? new Date(String(inwardData.client_dc_date)) : undefined,
      through: inwardData.through,
      inward_date: inwardData.inward_date ? new Date(String(inwardData.inward_date)) : undefined,
      received_date: inwardData.received_date ? new Date(String(inwardData.received_date)) : undefined,
      commit_date: inwardData.commit_date ? new Date(String(inwardData.commit_date)) : undefined,
      calibration_method: inwardData.calibration_method,
      reporting_method: inwardData.reporting_method,
      collection_mode: inwardData.collection_mode,
      dispatch_mode: inwardData.dispatch_mode,
      conformity_statement: inwardData.conformity_statement,
      conformity_accepted: inwardData.conformity_accepted,
      specific_requirements: inwardData.specific_requirements,
      additional_requirements: inwardData.additional_requirements,
      rate_card: inwardData.rate_card ?? null,
      archived: inwardData.archived ?? false,
      created_at: inwardData.created_at,
      updated_at: inwardData.updated_at,
      deleted_at: inwardData.deleted_at ?? null,
      lab_authorized_person_id: inwardData.lab_authorized_person_id,
      lab_authorized_person_designation: inwardData.lab_authorized_person_designation,
      client_authorized_person_id: inwardData.client_authorized_person_id,
      client_authorized_person_contact: inwardData.client_authorized_person_contact,
    };
  }, [])

  useEffect(() => {
    if (!isEditMode || !inwardEntryQuery.data) return

    const formData = mapInwardToFormData(inwardEntryQuery.data)
    reset(formData)

    Object.keys(formData).forEach((key) => {
      const value = formData[key as keyof typeof formData]
      if (value !== undefined && value !== null) {
        setValue(
          key as keyof InwardFormData,
          value as InwardFormData[keyof InwardFormData],
          { shouldValidate: false }
        )
      }
    })
  }, [isEditMode, inwardEntryQuery.data, mapInwardToFormData, reset, setValue])

  useEffect(() => {
    hasHandledLoadError.current = false
  }, [params.inwardId])

  useEffect(() => {
    if (!isEditMode || !inwardEntryQuery.isError || hasHandledLoadError.current) return

    hasHandledLoadError.current = true
    const errorMessage = inwardEntryQuery.error instanceof Error
      ? inwardEntryQuery.error.message
      : "Unknown error"
    toast.error(`Failed to load inward entry data: ${errorMessage}`)
    navigate('/transactions/inward')
  }, [inwardEntryQuery.error, inwardEntryQuery.isError, isEditMode, navigate])

  // Mutations for optimistic updates
  const createInwardMutation = useCreateInwardEntryMutation();
  const updateInwardMutation = useUpdateInwardEntryMutation();

  // Handle form submission with optimistic updates - memoized
  const onSubmit = useCallback(async (data: InwardFormData) => {
    setLoading(true);

    try {
      const apiData = convertToApiFormat(data) as any;

      if (isEditMode && params.inwardId) {
        await updateInwardMutation.mutateAsync({
          id: params.inwardId,
          data: apiData
        });
        reset();

        const returnTo = searchParams.get('returnTo');
        navigate(returnTo || '/transactions/inward');
      } else {
        const createdInward = await createInwardMutation.mutateAsync(apiData);
        reset();

        navigate(
          buildRegisterGaugeRoute({
            inwardId: createdInward.id,
            clientOrgId: createdInward.client_org_id || apiData.client_org_id,
            inwardNo: createdInward.inward_no,
            clientOrgName: createdInward.client_org_name || data.client_org_name || "",
            inwardDate: createdInward.inward_date || apiData.inward_date,
          })
        );
      }

    } catch {
      // Error handling is already done in the mutation hooks
    } finally {
      setLoading(false);
    }
  }, [isEditMode, params.inwardId, convertToApiFormat, updateInwardMutation, createInwardMutation, reset, searchParams, navigate]);

  // Form field configurations
  const formFields = {
    organizations: [
      { key: 'client_org_id', label: 'Client Name', required: true },
      { key: 'billing_org_id', label: 'Billing To', required: true },
      { key: 'delivery_org_id', label: 'Deliver To', required: true },
      { key: 'other_access_org_id', label: 'Other Access To', required: true },
    ],
    textInputs: [
      { key: 'client_dc_no', label: 'Client DC No', placeholder: 'Enter Client DC No', required: true, minLength: 3 },
      { key: 'through', label: 'Through', placeholder: 'Enter Through', required: false, minLength: 2 },
    ],
    selects: [
      {
        key: 'calibration_method',
        label: 'Calibration Method',
        required: true,
        options: [
          { value: 'lab_method', label: 'Lab Method' },
          { value: 'customer_specified_method', label: 'Customer Specified Method' },
          { value: 'standard_method', label: 'Standard Method' }
        ]
      },
      {
        key: 'reporting_method',
        label: 'Reporting Method',
        required: true,
        options: [
          { value: 'lab_format', label: 'Lab Format' },
          { value: 'customer_specified_format', label: 'Customer Specified Format' },
          { value: 'standard_format', label: 'Standard Format' }
        ]
      },
      {
        key: 'collection_mode',
        label: 'Collection Mode',
        required: true,
        options: [
          { value: 'by_hand', label: 'By Hand' },
          { value: 'by_courier', label: 'Courier' }
        ]
      },
      {
        key: 'dispatch_mode',
        label: 'Dispatch Mode',
        required: true,
        options: [
          { value: 'by_hand', label: 'By Hand' },
          { value: 'by_courier', label: 'Courier' }
        ]
      },
    ],
    dates: [
      { key: 'client_dc_date', label: 'Client DC Date', required: true },
      { key: 'inward_date', label: 'Inward Date', required: true },
      { key: 'received_date', label: 'Received Date', required: true },
      { key: 'commit_date', label: 'Commit Date', required: false },
    ],
    checkboxes: [
      { key: 'conformity_statement', label: 'Conformity Statement Required', options: ['Required', 'Not Required'] },
      { key: 'conformity_accepted', label: 'Conformity Accepted (If applicable, has the decision rule been discussed, understood, and accepted?)', options: ['Yes', 'No'] },
    ],
    labPersonFields: [
      { key: 'lab_authorized_person_id', label: 'Lab Authorized Person', placeholder: 'Enter Lab Authorized Person Name', required: true, minLength: 2 },
      { key: 'lab_authorized_person_designation', label: 'Designation', placeholder: 'Enter Lab Authorized Person Designation', required: true, minLength: 2 },
    ],
    clientPersonFields: [
      { key: 'client_authorized_person_id', label: 'Customer Authorized Person', placeholder: 'Enter Customer Authorized Person Name', required: true, minLength: 2 },
      { key: 'client_authorized_person_contact', label: 'Contact', placeholder: 'Enter Customer Authorized Person Contact Number', required: true, minLength: 10, pattern: /^[0-9+\-\s()]+$/ },
    ]
  }

  // Memoize organization options to prevent re-renders
  const organizationOptions = useMemo<SelectOption[]>(() => (
    organizations.map((org) => ({ value: org.id, label: org.name }))
  ), [organizations]);

  // Don't block render - show form immediately, loading states only in Select components
  return (
    <FormDateProvider>
      <div className="w-full p-2" role="main" aria-label={isEditMode ? "Edit Inward Challan Form" : "Create Inward Challan Form"}>

        <Card className="shadow-sm">
          <Card.Header className="pb-4 border-b border-gray-200 bg-blue-600 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-md">
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">
                  {isEditMode ? 'Edit Inward Challan' : 'Create Inward Challan'}
                </h1>
                <p className="text-sm text-white mt-1">
                  {isEditMode ? 'Update inward challan details and information' : 'Add a new inward challan to the system'}
                </p>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="p-4 border border-gray-200">
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Spinner size="lg" color="accent" aria-label="Loading inward entry data" />
                <p className="text-sm text-gray-600">Loading inward entry data...</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                aria-labelledby="form-title"
                noValidate
              >
                {/* Row 1: Client Name, Billing To, Deliver To - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Client Name */}
                  <FormField
                    label="Client Name"
                    required={true}
                    error={errors.client_org_id?.message}
                  >
                    <V3Select
                      value={clientOrgId}
                      options={organizationOptions}
                      ariaLabel="Select client organization"
                      placeholder={orgLoading ? "Loading organizations..." : "Select Client Name"}
                      disabled={orgLoading || loadingData}
                      onChange={(value) => handleOrganizationSelect(value, 'client')}
                    />
                    {errors.client_org_id && (
                      <span id="client-org-error" className="sr-only" role="alert">
                        {errors.client_org_id.message}
                      </span>
                    )}
                  </FormField>

                  {/* Billing To */}
                  <FormField
                    label="Billing To"
                    required={true}
                    error={errors.billing_org_id?.message}
                  >
                    <V3Select
                      value={billingOrgId}
                      options={organizationOptions}
                      ariaLabel="Select billing organization"
                      placeholder={orgLoading ? "Loading organizations..." : "Select Billing To"}
                      disabled={orgLoading || loadingData}
                      onChange={(value) => handleOrganizationSelect(value, 'billing')}
                    />
                    {errors.billing_org_id && (
                      <span id="billing-org-error" className="sr-only" role="alert">
                        {errors.billing_org_id.message}
                      </span>
                    )}
                  </FormField>

                  {/* Deliver To */}
                  <FormField
                    label="Deliver To"
                    required={true}
                    error={errors.delivery_org_id?.message}
                  >
                    <V3Select
                      value={deliveryOrgId}
                      options={organizationOptions}
                      ariaLabel="Select delivery organization"
                      placeholder={orgLoading ? "Loading organizations..." : "Select Deliver To"}
                      disabled={orgLoading || loadingData}
                      onChange={(value) => handleOrganizationSelect(value, 'delivery')}
                    />
                    {errors.delivery_org_id && (
                      <span id="delivery-org-error" className="sr-only" role="alert">
                        {errors.delivery_org_id.message}
                      </span>
                    )}
                  </FormField>
                </div>

                {/* Row 2: Other Access To, Client DC No, Client DC Date - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Other Access To */}
                  <FormField
                    label="Other Access To"
                    required={true}
                    error={errors.other_access_org_id?.message}
                  >
                    <V3Select
                      value={otherAccessOrgId}
                      options={organizationOptions}
                      ariaLabel="Select other access organization"
                      placeholder={orgLoading ? "Loading organizations..." : "Select Other Access To"}
                      disabled={orgLoading || loadingData}
                      onChange={(value) => handleOrganizationSelect(value, 'other')}
                    />
                    {errors.other_access_org_id && (
                      <span id="other-access-org-error" className="sr-only" role="alert">
                        {errors.other_access_org_id.message}
                      </span>
                    )}
                  </FormField>

                  {/* Client DC No */}
                  <FormField
                    label="Client DC No"
                    required={true}
                    error={errors.client_dc_no?.message}
                  >
                    <Input
                      placeholder="Enter Client DC No"
                      aria-label="Client DC number"
                      aria-describedby={errors.client_dc_no ? "client-dc-error" : undefined}
                      aria-required="true"
                      {...register('client_dc_no', {
                        required: 'Client DC No is required',
                        minLength: { value: 3, message: 'Client DC No must be at least 3 characters' }
                      })}
                    />
                    {errors.client_dc_no && (
                      <span id="client-dc-error" className="sr-only" role="alert">
                        {errors.client_dc_no.message}
                      </span>
                    )}
                  </FormField>

                  {/* Client DC Date */}
                  <FormField
                    label="Client DC Date"
                    required={true}
                    error={errors.client_dc_date?.message}
                  >
                    <Controller
                      name="client_dc_date"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <V3DatePicker value={value as Date | undefined} onChange={onChange} ariaLabel="Select client DC date" />
                      )}
                    />
                    {errors.client_dc_date && (
                      <span id="client-dc-date-error" className="sr-only" role="alert">
                        {errors.client_dc_date.message}
                      </span>
                    )}
                  </FormField>
                </div>

                {/* Row 3: Inward Date, Received Date, Through - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Inward Date */}
                  <FormField
                    label="Inward Date"
                    required={true}
                    error={errors.inward_date?.message}
                  >
                    <Controller
                      name="inward_date"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <V3DatePicker value={value as Date | undefined} onChange={onChange} ariaLabel="Select inward date" />
                      )}
                    />
                    {errors.inward_date && (
                      <span id="inward-date-error" className="sr-only" role="alert">
                        {errors.inward_date.message}
                      </span>
                    )}
                  </FormField>

                  {/* Received Date */}
                  <FormField
                    label="Received Date"
                    required={true}
                    error={errors.received_date?.message}
                  >
                    <Controller
                      name="received_date"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <V3DatePicker value={value as Date | undefined} onChange={onChange} ariaLabel="Select received date" />
                      )}
                    />
                    {errors.received_date && (
                      <span id="received-date-error" className="sr-only" role="alert">
                        {errors.received_date.message}
                      </span>
                    )}
                  </FormField>

                  {/* Through */}
                  <FormField
                    label="Through"
                    error={errors.through?.message}
                  >
                    <Input
                      placeholder="Enter Through"
                      aria-label="Through field"
                      aria-describedby={errors.through ? "through-error" : undefined}
                      aria-required="true"
                      {...register('through', {
                        minLength: { value: 2, message: 'Through must be at least 2 characters' }
                      })}
                    />

                  </FormField>
                </div>

                {/* Row 4: Calibration Method, Reporting Method, Collection Mode - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Calibration Method */}
                  <FormField
                    label="Calibration Method"
                    required={true}
                    error={errors.calibration_method?.message}
                  >
                    <V3Select value={calibrationMethod} ariaLabel="Select calibration method" placeholder="Select Calibration Method" onChange={(value) => setValue('calibration_method', value as InwardFormData['calibration_method'], { shouldValidate: false })} options={[
                      { value: 'lab_method', label: 'Lab Method' },
                      { value: 'customer_specified_method', label: 'Customer Specified Method' },
                      { value: 'standard_method', label: 'Standard Method' },
                    ]} />
                    {errors.calibration_method && (
                      <span id="calibration-method-error" className="sr-only" role="alert">
                        {errors.calibration_method.message}
                      </span>
                    )}
                  </FormField>

                  {/* Reporting Method */}
                  <FormField
                    label="Reporting Method"
                    required={true}
                    error={errors.reporting_method?.message}
                  >
                    <V3Select value={reportingMethod} ariaLabel="Select reporting method" placeholder="Select Reporting Method" onChange={(value) => setValue('reporting_method', value as InwardFormData['reporting_method'], { shouldValidate: false })} options={[
                      { value: 'lab_format', label: 'Lab Format' },
                      { value: 'customer_specified_format', label: 'Customer Specified Format' },
                      { value: 'standard_format', label: 'Standard Format' },
                    ]} />
                    {errors.reporting_method && (
                      <span id="reporting-method-error" className="sr-only" role="alert">
                        {errors.reporting_method.message}
                      </span>
                    )}
                  </FormField>

                  {/* Collection Mode */}
                  <FormField
                    label="Collection Mode"
                    required={true}
                    error={errors.collection_mode?.message}
                  >
                    <V3Select value={collectionMode} ariaLabel="Select collection mode" placeholder="Select Collection Mode" onChange={(value) => setValue('collection_mode', value as InwardFormData['collection_mode'], { shouldValidate: false })} options={[
                      { value: 'by_hand', label: 'By Hand' },
                      { value: 'by_courier', label: 'Courier' },
                    ]} />
                    {errors.collection_mode && (
                      <span id="collection-mode-error" className="sr-only" role="alert">
                        {errors.collection_mode.message}
                      </span>
                    )}
                  </FormField>
                </div>

                {/* Row 5: Dispatch Mode, Commit Date, Additional Requirements - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Dispatch Mode */}
                  <FormField
                    label="Dispatch Mode"
                    required={true}
                    error={errors.dispatch_mode?.message}
                  >
                    <V3Select value={dispatchMode} ariaLabel="Select dispatch mode" placeholder="Select Dispatch Mode" onChange={(value) => setValue('dispatch_mode', value as InwardFormData['dispatch_mode'], { shouldValidate: false })} options={[
                      { value: 'by_hand', label: 'By Hand' },
                      { value: 'by_courier', label: 'Courier' },
                    ]} />
                    {errors.dispatch_mode && (
                      <span id="dispatch-mode-error" className="sr-only" role="alert">
                        {errors.dispatch_mode.message}
                      </span>
                    )}
                  </FormField>

                  {/* Commit Date */}
                  <FormField
                    label="Commit Date"
                    required={false}
                    error={errors.commit_date?.message}
                  >
                    <Controller
                      name="commit_date"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <V3DatePicker value={value as Date | undefined} onChange={onChange} ariaLabel="Select commit date (optional)" />
                      )}
                    />
                    {errors.commit_date && (
                      <span id="commit-date-error" className="sr-only" role="alert">
                        {errors.commit_date.message}
                      </span>
                    )}
                  </FormField>

                  {/* Additional Requirements */}
                  <FormField
                    label="Additional Requirements"
                    required={false}
                    error={errors.additional_requirements?.message}
                  >
                    <Input
                      placeholder="Enter any additional requirements"
                      aria-label="Additional requirements (optional)"
                      aria-describedby={errors.additional_requirements ? "additional-requirements-error" : undefined}
                      {...register('additional_requirements')}
                    />
                    {errors.additional_requirements && (
                      <span id="additional-requirements-error" className="sr-only" role="alert">
                        {errors.additional_requirements.message}
                      </span>
                    )}
                  </FormField>
                </div>

                {/* Row 6: Specific Requirements, History Card Reference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Specific Requirements"
                    required={false}
                    error={errors.specific_requirements?.message}
                  >
                    <Input
                      placeholder="Enter specific requirements"
                      aria-label="Specific requirements (optional)"
                      aria-describedby={errors.specific_requirements ? "specific-requirements-error" : undefined}
                      {...register('specific_requirements')}
                    />
                    {errors.specific_requirements && (
                      <span id="specific-requirements-error" className="sr-only" role="alert">
                        {errors.specific_requirements.message}
                      </span>
                    )}
                  </FormField>
                </div>

                {/* Checkbox Fields - Inline layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-100 rounded-md border border-slate-200">
                  {formFields.checkboxes.map((field) => (
                    <FormField
                      key={field.key}
                      label={field.label}
                      required={true}
                      error={getFormErrorMessage(errors[field.key as keyof InwardFormData])}
                    >
                      <div className="flex items-center gap-6 mt-2">
                        {field.options.map((option, index) => {
                          const fieldValue = field.key === 'conformity_statement'
                            ? conformityStatement
                            : conformityAccepted;
                          const isChecked = fieldValue === (index === 0);

                          return (
                            <>
                              <div key={option} className="flex items-center gap-2">
                                {/* <Checkbox
                                  id={`${field.key}_${index}`}
                                  aria-label={`${field.label} - ${option}`}
                                  isSelected={isChecked}
                                  onChange={(isSelected: boolean) => {
                                    if (isSelected) {
                                      setValue(field.key as keyof InwardFormData, index === 0, { shouldValidate: false })
                                    } else {
                                      setValue(field.key as keyof InwardFormData, index === 1, { shouldValidate: false })
                                    }
                                  }}
                                />

                                <label htmlFor={`${field.key}_${index}`} className="text-sm font-medium text-secondary-700 cursor-pointer">
                                  {option}
                                </label> */}
                                <Checkbox
                                  id={`${field.key}_${index}`}
                                  aria-label={`${field.label} - ${option}`}
                                  isSelected={isChecked}
                                  onChange={(isSelected: boolean) => {
                                    if (isSelected) {
                                      setValue(field.key as keyof InwardFormData, index === 0, { shouldValidate: false })
                                    } else {
                                      setValue(field.key as keyof InwardFormData, index === 1, { shouldValidate: false })
                                    }
                                  }} render={(props) => <div {...props} />}>
                                  <Checkbox.Content>
                                    <Checkbox.Control>
                                      <Checkbox.Indicator />
                                    </Checkbox.Control>
                                    {option}
                                  </Checkbox.Content>
                                </Checkbox>
                              </div>


                            </>
                          );
                        })}
                      </div>
                    </FormField>
                  ))}
                </div>

                {/* Lab Person Fields - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formFields.labPersonFields.map((field) => (
                    <FormField
                      key={field.key}
                      label={field.label}
                      required={true}
                      error={getFormErrorMessage(errors[field.key as keyof InwardFormData])}
                    >
                      <Input
                        placeholder={field.placeholder}
                        {...register(field.key as keyof InwardFormData, {
                          required: `${field.label} is required`,
                          minLength: { value: field.minLength!, message: `${field.label} must be at least ${field.minLength} characters` }
                        })}
                      />
                    </FormField>
                  ))}
                </div>

                {/* Client Person Fields - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formFields.clientPersonFields.map((field) => (
                    <FormField
                      key={field.key}
                      label={field.label}
                      required={true}
                      error={getFormErrorMessage(errors[field.key as keyof InwardFormData])}
                    >
                      <Input
                        placeholder={field.placeholder}
                        {...register(field.key as keyof InwardFormData, {
                          required: `${field.label} is required`,
                          minLength: { value: field.minLength!, message: `${field.label} must be at least ${field.minLength} characters` },
                          pattern: field.pattern ? {
                            value: field.pattern,
                            message: "Please enter a valid contact number"
                          } : undefined
                        })}
                      />
                    </FormField>
                  ))}
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-secondary-200" role="group" aria-label="Form actions">
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    isDisabled={loading || isSubmitting || loadingData}
                    className="w-full md:w-auto"
                    aria-label={loading || isSubmitting ? (isEditMode ? "Updating challan, please wait" : "Creating challan, please wait") : (isEditMode ? "Submit form to update challan" : "Submit form to create challan")}

                  >
                    {isEditMode ? "Update Challan" : "Create Challan"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onPress={() => navigate(-1)}
                    isDisabled={loading || isSubmitting}
                    className="w-full md:w-auto"
                    aria-label="Cancel and go back"

                  >
                    Back
                  </Button>
                </div>
              </form>
            )}
          </Card.Content>
        </Card>
      </div>
    </FormDateProvider>
  )
}

// Export memoized component for better performance
export default memo(InwardForm)
