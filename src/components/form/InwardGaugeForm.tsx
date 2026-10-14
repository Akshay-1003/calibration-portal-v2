"use client";

import React, { Suspense, useCallback, useMemo, useRef, useEffect } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import {
  Input,
  Select,
  Button,
  Autocomplete,
  ListBox,
  Accordion,
} from "@heroui/react";
import { gaugeRegistrationSchema, zodResolver, type GaugeRegistrationFormData } from "../../lib/validations";
import { apiClient } from "../../services/api";
import { toast } from "sonner";
import type { GaugeMaster, CertificateType } from "../../store/useStore";
import { useDebounce } from "../../hooks/useDebounce";

type SelectOption = { value: string; label: string };

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
  <Select className="w-full" selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : "")} isDisabled={disabled} placeholder={placeholder} aria-label={ariaLabel}>
    <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover><ListBox>{options.map((option) => (
      <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
        {option.label}<ListBox.ItemIndicator />
      </ListBox.Item>
    ))}</ListBox></Select.Popover>
  </Select>
);

const GaugeSpecificationRenderer = React.lazy(() =>
  import("../specifications/GaugeSpecificationRenderer").then((module) => ({
    default: module.GaugeSpecificationRenderer,
  })),
);

interface SpecificationDataFormat {
  id: string;
  name: string;
  input_format: {
    gaugeName: string;
    format: {
      columns: Array<{
        key: string;
        label: string;
        type: string;
        editable: boolean;
      }>;
      rows: Array<{
        parameter: string;
        basic_size: string;
        specMax: string;
        specMin: string;
        wearLimit: string;
      }>;
    };
  };
  reading_format: {
    gaugeName: string;
    format: {
      columns: Array<{
        key: string;
        label: string;
        type: string;
        editable: boolean;
      }>;
      rows: Array<{
        parameter: string;
        basic_size: string;
        specMax: string;
        specMin: string;
        wearLimit: string;
      }>;
    };
  };
}

export interface InwardGaugeFormProps {
  onSubmit: (data: GaugeRegistrationFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  submitMode?: "create" | "map";
  initialData?: Partial<GaugeRegistrationFormData>;
  gaugeMasterList: GaugeMaster[];
  certificateTypes: CertificateType[];
  gaugeMasterLoading?: boolean;
  certificateTypeLoading?: boolean;
  isSubmitting?: boolean;
  isSubtypeForm?: boolean; // If true, this form is nested inside accordion (no process selection)
  onIdentificationNumberChange?: (identificationNumber: string) => void; // Callback for identification number changes
  legacySpecification?: string | null;
}

export interface InwardGaugeFormRef {
  reset: (data?: Partial<GaugeRegistrationFormData>) => void;
  setValue: (
    name: keyof GaugeRegistrationFormData,
    value: GaugeRegistrationFormData[keyof GaugeRegistrationFormData]
  ) => void;
  getValues: () => GaugeRegistrationFormData;
  saveFormData: () => Partial<GaugeRegistrationFormData> | null;
}

export const InwardGaugeForm = React.forwardRef<InwardGaugeFormRef, InwardGaugeFormProps>(({
  onSubmit,
  onCancel,
  isEditing = false,
  submitMode = "create",
  initialData,
  gaugeMasterList,
  certificateTypes,
  gaugeMasterLoading = false,
  certificateTypeLoading = false,
  isSubmitting = false,
  isSubtypeForm = false,
  onIdentificationNumberChange,
  legacySpecification,
}, ref) => {
  const [specificationDataformat, setSpecificationDataformat] = React.useState<string | null>(null);
  const isProgrammatic = useRef(false);
  const previousGaugeIdRef = useRef<string | null>(null);
  // Store subtype form data separately - each accordion maintains its own state
  const [subtypes, setSubtypes] = React.useState<Partial<GaugeRegistrationFormData>[]>([]);
  const subtypeFormRefs = React.useRef<Map<number, InwardGaugeFormRef>>(new Map());
  // Track subtype form data changes separately from parent form
  const subtypeFormDataRef = React.useRef<Map<number, Partial<GaugeRegistrationFormData>>>(new Map());

  const form = useForm<GaugeRegistrationFormData>({
    resolver: zodResolver(gaugeRegistrationSchema),
    defaultValues: {
      master_gauge_id: "",
      gauge_class: "",
      certificate_type_id: "",
      identification_number: "",
      calibration_frequency: "",
      calibration_frequency_unit: "months",
      make: "",
      manf_serial_number: "",
      process: "calibration",
      unit: "mm",
      calibration_location_type: "permanent_facility",
      calibration_done_under: "nabl",
      gauge_condition: "",
      specifications: {},
      subtype: [],
      ...initialData,
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = form;

  // Expose form methods via ref
  React.useImperativeHandle(ref, () => ({
    reset: (data?: Partial<GaugeRegistrationFormData>) => {
      isProgrammatic.current = true;
      previousGaugeIdRef.current = null;
      const resetData = data || {
        master_gauge_id: "",
        gauge_class: "",
        certificate_type_id: "",
        identification_number: "",
        calibration_frequency: "",
        calibration_frequency_unit: "months",
        make: "",
        manf_serial_number: "",
        process: "calibration",
        unit: "mm",
        calibration_location_type: "permanent_facility",
        calibration_done_under: "nabl",
        gauge_condition: "",
        specifications: {},
        subtype: [],
      };
      reset(resetData);
      setSpecificationDataformat(null);
      // Only clear subtypes if this is not a subtype form itself
      if (!isSubtypeForm) {
        setSubtypes([]);
        subtypeFormRefs.current.clear();
        subtypeFormDataRef.current.clear();
      }
      setTimeout(() => {
        isProgrammatic.current = false;
      }, 300);
    },
    setValue: (
      name: keyof GaugeRegistrationFormData,
      value: GaugeRegistrationFormData[keyof GaugeRegistrationFormData]
    ) => {
      setValue(name, value, { shouldValidate: true });
    },
    getValues: () => form.getValues(),
    saveFormData: () => formValuesRef.current,
  }), [reset, setValue, form, isSubtypeForm]);
  const handleGaugeSelection = useCallback(
    async (gaugeId: string, skipReset: boolean = false) => {
      const selectedGauge = gaugeMasterList.find(g => g.id === gaugeId);

      if (!selectedGauge) {
        toast.error("Gauge not found");
        return;
      }

      // If gauge changed, clear specification format and reset specs
      if (previousGaugeIdRef.current !== gaugeId && previousGaugeIdRef.current !== null) {
        setSpecificationDataformat(null);
        isProgrammatic.current = true;
        setValue("specifications", {}, { shouldValidate: false });
        // Extended timeout to ensure specifications don't vanish during edit
        setTimeout(() => {
          isProgrammatic.current = false;
        }, 500);
      } else {
        // For first time selection or same gauge, use shorter timeout
        setTimeout(() => {
          isProgrammatic.current = false;
        }, 200);
      }

      previousGaugeIdRef.current = gaugeId;

      if (!skipReset && !gaugeId) {
        setSpecificationDataformat(null);
        previousGaugeIdRef.current = null;
        return;
      }

      const certificateTypeId = selectedGauge.certificate_type_id;
      if (!certificateTypeId) return;

      try {
        const certificate =
          certificateTypes.find((certificateType) => certificateType.id === certificateTypeId) ??
          await apiClient.get(`/certificate/type/${certificateTypeId}`) as SpecificationDataFormat;
        if (!certificate) return;

        isProgrammatic.current = true;
        setValue("certificate_type_id", certificate.id, {
          shouldValidate: true,
        });
        setSpecificationDataformat(certificate.name);
        // Don't set subtypes here - subtypes array is managed separately
        // The hasSubtype check will handle showing the accordion
        // Extended timeout for editing to prevent specification vanishing
        setTimeout(() => {
          isProgrammatic.current = false;
        }, 500);
      } catch (error) {
        console.error("Error fetching certificate type data:", error);
        toast.error("Failed to load certificate info");
      }
    },
    [certificateTypes, gaugeMasterList, setValue]
  );
  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      isProgrammatic.current = true;
      previousGaugeIdRef.current = initialData.master_gauge_id || null;
      reset(initialData);
      if (initialData.master_gauge_id) {
        // Fetch certificate type to set specification format
        handleGaugeSelection(initialData.master_gauge_id, true);
      }
      // Extended timeout for editing to prevent specification vanishing
      setTimeout(() => {
        isProgrammatic.current = false;
      }, 600);
    } else if (!initialData || Object.keys(initialData).length === 0) {
      // Reset state when initialData is cleared
      previousGaugeIdRef.current = null;
      setSpecificationDataformat(null);
    }
  }, [initialData, reset, handleGaugeSelection]);

  // Watch identification_number and notify parent (only for main form, not subtypes)
  const identificationNumber = watch("identification_number");
  const debouncedIdentificationNumber = useDebounce(identificationNumber || "", 500);
  const selectedCertificateTypeId = watch("certificate_type_id");
  const selectedMasterGaugeId = watch("master_gauge_id");

  useEffect(() => {
    if (!isSubtypeForm && onIdentificationNumberChange) {
      onIdentificationNumberChange(debouncedIdentificationNumber);
    }
  }, [debouncedIdentificationNumber, onIdentificationNumberChange, isSubtypeForm]);

  // Store form values in ref for parent to access (preserve data when switching tabs)
  const formValuesRef = useRef<Partial<GaugeRegistrationFormData> | null>(null);

  // Update form values ref whenever form values change (debounced to avoid performance issues)
  useEffect(() => {
    if (!isSubtypeForm) {
      const currentValues = form.getValues();
      formValuesRef.current = currentValues;
    }
  });

  // Group gauges by certificate type
  const gaugesByCertificateType = useMemo(() => {
    const grouped: Record<string, GaugeMaster[]> = {};

    gaugeMasterList.forEach((gauge) => {
      const certTypeId = gauge.certificate_type_id || "uncategorized";
      if (!grouped[certTypeId]) {
        grouped[certTypeId] = [];
      }
      grouped[certTypeId].push(gauge);
    });

    return grouped;
  }, [gaugeMasterList]);

  // Get certificate type name for grouping
  const getCertificateTypeName = useCallback((certTypeId: string) => {
    const certType = certificateTypes.find((ct) => ct.id === certTypeId);
    return certType?.name || "Uncategorized";
  }, [certificateTypes]);

  // Filter gauges based on selected certificate_type_id
  const filteredGaugesByCertificateType = useMemo(() => {
    if (!selectedCertificateTypeId) {
      return gaugesByCertificateType;
    }

    const filtered = gaugesByCertificateType[selectedCertificateTypeId] || [];
    if (filtered.length === 0) {
      return {};
    }
    return {
      [selectedCertificateTypeId]: filtered,
    };
  }, [selectedCertificateTypeId, gaugesByCertificateType]);

  // Get sorted certificate type IDs for section ordering
  const sortedCertificateTypeIds = useMemo(() => {
    const allIds = Object.keys(gaugesByCertificateType);

    if (selectedCertificateTypeId && allIds.includes(selectedCertificateTypeId)) {
      return [selectedCertificateTypeId, ...allIds.filter((id) => id !== selectedCertificateTypeId)];
    }

    return allIds;
  }, [selectedCertificateTypeId, gaugesByCertificateType]);

  // Check if selected gauge has subtype
  const selectedGauge = useMemo(() => {
    return gaugeMasterList.find(g => g.id === selectedMasterGaugeId);
  }, [selectedMasterGaugeId, gaugeMasterList]);

  // Check for has_sub_part (API field) or hasSubtype (interface field)
  const hasSubtype = (selectedGauge?.has_sub_part === true) && !isSubtypeForm;

  // Initialize subtypes from initialData
  useEffect(() => {
    if (initialData?.subtype && Array.isArray(initialData.subtype) && initialData.subtype.length > 0) {
      setSubtypes(initialData.subtype);
      // Initialize subtype form data ref
      initialData.subtype.forEach((subtype, index) => {
        subtypeFormDataRef.current.set(index, subtype);
      });
    }
  }, [initialData?.subtype]);

  // Add new subtype accordion - each accordion is independent with its own data
  const handleAddSubtype = useCallback(() => {
    const newSubtype: Partial<GaugeRegistrationFormData> = {
      master_gauge_id: "",
      gauge_class: "",
      certificate_type_id: "",
      identification_number: "",
      calibration_frequency: "",
      calibration_frequency_unit: "months",
      make: "",
      manf_serial_number: "",
      unit: "mm",
      calibration_location_type: "permanent_facility",
      calibration_done_under: "nabl",
      gauge_condition: "",
      specifications: {},
    };
    setSubtypes(prev => [...prev, newSubtype]);
  }, []);

  // Remove subtype accordion
  const handleRemoveSubtype = useCallback((index: number) => {
    setSubtypes(prev => prev.filter((_, i) => i !== index));
    subtypeFormRefs.current.delete(index);
    subtypeFormDataRef.current.delete(index);
    // Reindex remaining subtypes
    const newMap = new Map<number, Partial<GaugeRegistrationFormData>>();
    const newRefs = new Map<number, InwardGaugeFormRef>();
    subtypeFormDataRef.current.forEach((data, oldIndex) => {
      if (oldIndex > index) {
        newMap.set(oldIndex - 1, data);
      } else if (oldIndex < index) {
        newMap.set(oldIndex, data);
      }
    });
    subtypeFormRefs.current.forEach((ref, oldIndex) => {
      if (oldIndex > index) {
        newRefs.set(oldIndex - 1, ref);
      } else if (oldIndex < index) {
        newRefs.set(oldIndex, ref);
      }
    });
    subtypeFormDataRef.current = newMap;
    subtypeFormRefs.current = newRefs;
  }, []);


  const stripProcessField = (values: GaugeRegistrationFormData) => {
    const { process: processField, ...subtypeValues } = values;
    void processField;
    return subtypeValues;
  };

  // Validate all subtypes before submission
  const validateSubtypes = useCallback(async (): Promise<boolean> => {
    if (!hasSubtype || subtypes.length === 0) return true;

    // Create schema without process field for subtype validation
    const subtypeSchema = gaugeRegistrationSchema.omit({ process: true });

    const validationPromises = subtypes.map(async (_, index) => {
      const formRef = subtypeFormRefs.current.get(index);
      if (!formRef) return false;

      try {
        const values = formRef.getValues();
        await subtypeSchema.parseAsync(stripProcessField(values));
        return true;
      } catch (error) {
        console.error(`Subtype ${index} validation error:`, error);
        return false;
      }
    });

    const results = await Promise.all(validationPromises);
    return results.every(result => result === true);
  }, [hasSubtype, subtypes]);



  const handleFormSubmit = useCallback(
    async (data: GaugeRegistrationFormData) => {
      // If this is a subtype form, don't submit here (handled by parent)
      if (isSubtypeForm) {
        return;
      }

      try {
        // Validate and collect subtypes if they exist
        if (hasSubtype && subtypes.length > 0) {
          const isValid = await validateSubtypes();
          if (!isValid) {
            toast.error("Please fix errors in subtype forms before submitting");
            return;
          }

          // Collect all subtype data from accordion forms
          // Use stored form data ref first, then fallback to getValues
          const subtypeData: GaugeRegistrationFormData[] = [];
          for (let i = 0; i < subtypes.length; i++) {
            // Try to get from stored data first
            let subtypeFormData = subtypeFormDataRef.current.get(i);

            // If not in stored data, get from form ref
            if (!subtypeFormData) {
              const formRef = subtypeFormRefs.current.get(i);
              if (formRef) {
                subtypeFormData = formRef.getValues();
              }
            }

            if (subtypeFormData) {
              subtypeData.push(stripProcessField(subtypeFormData as GaugeRegistrationFormData) as GaugeRegistrationFormData);
            }
          }

          // Add subtypes to main data
          if (subtypeData.length > 0) {
            data.subtype = subtypeData;
          }
        }

        // Call onSubmit and wait for it to complete
        // Only reset form if submission succeeds (no error thrown)
        await onSubmit(data);

        // Reset form ONLY after successful submission
        if (!isEditing && !isSubtypeForm) {
          isProgrammatic.current = true;
          previousGaugeIdRef.current = null;
          setSubtypes([]);
          subtypeFormRefs.current.clear();
          subtypeFormDataRef.current.clear();
          reset({
            master_gauge_id: "",
            gauge_class: "",
            certificate_type_id: "",
            identification_number: "",
            calibration_frequency: "",
            calibration_frequency_unit: "months",
            make: "",
            manf_serial_number: "",
            process: "calibration",
            unit: "mm",
            calibration_location_type: "permanent_facility",
            calibration_done_under: "nabl",
            gauge_condition: "",
            specifications: {},
            subtype: [],
          });
          setSpecificationDataformat(null);
          setTimeout(() => {
            isProgrammatic.current = false;
          }, 300);
        }
      } catch (error) {
        // Error is already handled in onSubmit callback
        // Don't reset form on error - let user fix and retry
        console.error("Form submission error:", error);
        // Re-throw to prevent form submission from appearing successful
        throw error;
      }
    },
    [onSubmit, isEditing, reset, hasSubtype, subtypes, validateSubtypes, isSubtypeForm]
  );

  // Create wrapper element - form for parent, div for subtypes
  const FormWrapper = isSubtypeForm ? 'div' : 'form';
  const wrapperProps = isSubtypeForm
    ? { className: "space-y-4" }
    : { onSubmit: handleSubmit(handleFormSubmit), className: "space-y-4" };

  return (
    <div className="p-4">
      <FormProvider {...form}>
        <FormWrapper {...wrapperProps}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gauge Name <span className="text-danger">*</span>
              </label>
              <Autocomplete className="w-full" selectedKey={watch("master_gauge_id") || null} aria-label="Gauge Name" onSelectionChange={(key) => {
                  const value = key as string | null;
                  if (value) {
                    setValue("master_gauge_id", value, {
                      shouldValidate: true,
                    });
                    handleGaugeSelection(value);
                  } else {
                    // Clear gauge selection - reset related state
                    previousGaugeIdRef.current = null;
                    setSpecificationDataformat(null);
                    isProgrammatic.current = true;
                    setValue("master_gauge_id", "", {
                      shouldValidate: true,
                    });
                    setValue("certificate_type_id", "", {
                      shouldValidate: false,
                    });
                    setValue("specifications", {}, {
                      shouldValidate: false,
                    });
                    setTimeout(() => {
                      isProgrammatic.current = false;
                    }, 100);
                  }
                }}
              >
                <Autocomplete.Trigger>
                  <Autocomplete.Filter><Input placeholder={gaugeMasterLoading ? "Loading gauges..." : "Search or select gauge name"} aria-label="Gauge Name" /></Autocomplete.Filter>
                  <Autocomplete.Indicator />
                </Autocomplete.Trigger>
                <Autocomplete.Popover>
                  <ListBox>
                {sortedCertificateTypeIds.length === 0 ? (
                  <ListBox.Item id="no-gauges" isDisabled textValue="No gauges available">
                    {watch("certificate_type_id")
                      ? `No gauges available for ${getCertificateTypeName(watch("certificate_type_id"))}`
                      : "No gauges available"}
                  </ListBox.Item>
                ) : (
                  sortedCertificateTypeIds.map((certTypeId) => {
                    const gauges = filteredGaugesByCertificateType[certTypeId] || [];
                    if (gauges.length === 0) return null;

                    return (
                      <ListBox.Section
                        key={certTypeId}
                      >
                        <div className="px-2 py-1 text-xs font-semibold text-muted">{getCertificateTypeName(certTypeId)}</div>
                        {gauges.map((gauge) => (
                          <ListBox.Item
                            key={gauge.id}
                            textValue={gauge.name}
                          >
                            {gauge.name}
                          </ListBox.Item>
                        ))}
                      </ListBox.Section>
                    );
                  }).filter(Boolean)
                )}
                  </ListBox>
                </Autocomplete.Popover>
              </Autocomplete>
              {errors.master_gauge_id && (
                <p className="text-danger text-sm mt-1">
                  {errors.master_gauge_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <V3Select value={watch("gauge_class")} ariaLabel="Class" placeholder="Select class" onChange={(value) => setValue("gauge_class", value, { shouldValidate: true })} options={[
                { value: "no_type", label: "No Type" }, { value: "digital", label: "Digital" },
                { value: "vernier", label: "Vernier" }, { value: "dial", label: "Dial" },
              ]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gauge Condition
              </label>
              <Controller
                name="gauge_condition"
                control={form.control}
                render={({ field }) => (
                  <Input
                    className="w-full"
                    {...field}
                    placeholder="Enter gauge condition"
                    aria-label="Gauge Condition"
                  />
                )}
              />
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Identification No. <span className="text-danger">*</span>
              </label>
              <Controller
                name="identification_number"
                control={form.control}
                render={({ field }) => (
                  <Input
                    className="w-full"
                    {...field}
                    placeholder="Enter identification number"
                    aria-label="Identification Number"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make
              </label>
              <Controller
                name="make"
                control={form.control}
                render={({ field }) => (
                  <Input
                    className="w-full"
                    {...field}
                    placeholder="Enter make"
                    aria-label="Make"
                  />
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer Serial No.
              </label>
              <Controller
                name="manf_serial_number"
                control={form.control}
                render={({ field }) => (
                  <Input
                    className="w-full"
                    {...field}
                    placeholder="Enter manufacturer serial number"
                    aria-label="Manufacturer Serial Number"

                  />
                )}
              />
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calibration Frequency <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-[7fr_3fr] gap-2">
                <Controller
                  name="calibration_frequency"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      className="w-full"
                      {...field}
                      placeholder="Enter calibration frequency"
                      aria-label="Make"
                    />
                  )}
                />
                <V3Select value={watch("calibration_frequency_unit")} ariaLabel="Calibration Frequency Unit" placeholder="Unit" onChange={(value) => setValue("calibration_frequency_unit", value as "months" | "years", { shouldValidate: true })} options={[{ value: "months", label: "months" }, { value: "years", label: "years" }]} />
              </div>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calibration under
              </label>
              <V3Select value={watch("calibration_done_under")} ariaLabel="Calibration under" placeholder="Select calibration type" onChange={(value) => setValue("calibration_done_under", value as "nabl" | "non_nabl", { shouldValidate: true })} options={[{ value: "nabl", label: "NABL" }, { value: "non_nabl", label: "Non NABL" }]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gauge Type <span className="text-danger">*</span>
              </label>
              <V3Select
                value={watch("certificate_type_id")}
                ariaLabel="Gauge Type"
                placeholder={certificateTypeLoading ? "Loading gauge types..." : "Select gauge type"}
                disabled={certificateTypeLoading}
                onChange={(value) => {
                  setValue("certificate_type_id", value, {
                    shouldValidate: true,
                  });

                  // Clear gauge selection if current gauge doesn't match new certificate type
                  const currentGaugeId = watch("master_gauge_id");
                  if (currentGaugeId) {
                    const currentGauge = gaugeMasterList.find(g => g.id === currentGaugeId);
                    if (currentGauge && currentGauge.certificate_type_id !== value) {
                      setValue("master_gauge_id", "", {
                        shouldValidate: true,
                      });
                      setSpecificationDataformat(null);
                    }
                  }
                }}
                options={certificateTypes.map((certType) => ({ value: certType.id, label: certType.name }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-danger">*</span>
              </label>
              <V3Select value={watch("unit")} ariaLabel="Unit" placeholder="Select unit" onChange={(value) => setValue("unit", value as "mm" | "µm" | "inch" | "kg/cm2" | "bar" | "Pa" | "degree", { shouldValidate: true })} options={[
                { value: "mm", label: "mm" }, { value: "µm", label: "µm" }, { value: "inch", label: "inch" },
                { value: "kg/cm2", label: "kg/cm2" }, { value: "bar", label: "bar" }, { value: "pa", label: "pa" }, { value: "degree", label: "degree" },
              ]} />
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calibration Location
              </label>
              <V3Select value={watch("calibration_location_type")} ariaLabel="Calibration Location Type" placeholder="Select location type" onChange={(value) => setValue("calibration_location_type", value as "permanent_facility" | "mobile_facility" | "customer_site", { shouldValidate: true })} options={[
                { value: "permanent_facility", label: "Permanent Facility" }, { value: "mobile_facility", label: "Mobile Facility" }, { value: "customer_site", label: "Customer Site" },
              ]} />
            </div>
          </div>

          {/* Specification Table */}
          {specificationDataformat && (
            <Suspense
              fallback={
                <div className="space-y-4 rounded-md border border-gray-200 p-4 animate-pulse">
                  <div className="h-6 w-48 rounded bg-gray-200" />
                  <div className="h-24 rounded bg-gray-100" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="h-10 rounded bg-gray-100" />
                    <div className="h-10 rounded bg-gray-100" />
                    <div className="h-10 rounded bg-gray-100" />
                  </div>
                </div>
              }
            >
              <GaugeSpecificationRenderer
                gaugeType={specificationDataformat}
                isProgrammatic={isProgrammatic}
                isSubmitting={isSubmitting}
              />
            </Suspense>
          )}
          {legacySpecification ? (
            <div className="mt-3 rounded-md border border-warning-200 bg-warning-50 p-3">
              <label className="mb-1 block text-sm font-medium text-warning-800">
                Old Specification
              </label>
              <Input
                value={legacySpecification}
                readOnly
                aria-label="Old Specification"
                className="w-full"
              />
              <p className="mt-2 text-sm text-warning-700">
                Please enter the specification again in the correct format.
              </p>
            </div>
          ) : null}
          {/* Subtype Accordion Section */}
          {hasSubtype && (
            <div className="pt-2 border-t">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onPress={handleAddSubtype}
                  >
                    Add Attachment
                  </Button>
                </div>
                {subtypes.length > 0 ? (
                  <Accordion variant="surface" className="space-y-2">
                    {subtypes.map((subtypeData, index) => (
                      <Accordion.Item key={index} id={`subtype-${index}`} className="font-semibold text-sm">
                        <Accordion.Heading>
                          <Accordion.Trigger>
                            <span className="text-gray-700 text-sm">Attachment {index + 1}{subtypeData.identification_number ? ` - ${subtypeData.identification_number}` : ''}</span>
                            <Accordion.Indicator />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel><Accordion.Body>
                        <div className="py-2">
                          <SubtypeFormWrapper
                            key={`subtype-${index}`}
                            index={index}
                            initialData={subtypeData}
                            onDataChange={(formData) => {
                              // Update subtype form data when it changes - isolated from parent
                              subtypeFormDataRef.current.set(index, formData);
                              setSubtypes(prev => {
                                const updated = [...prev];
                                updated[index] = formData;
                                return updated;
                              });
                            }}
                            onRefReady={(ref) => {
                              if (ref) {
                                subtypeFormRefs.current.set(index, ref);
                              } else {
                                subtypeFormRefs.current.delete(index);
                              }
                            }}
                            gaugeMasterList={gaugeMasterList}
                            certificateTypes={certificateTypes}
                            gaugeMasterLoading={gaugeMasterLoading}
                            certificateTypeLoading={certificateTypeLoading}
                            isSubmitting={isSubmitting}
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onPress={() => handleRemoveSubtype(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        </Accordion.Body></Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-gray-500 italic">No subtypes added yet. Click "Add Subtype" to add one.</p>
                )}
              </div>
            </div>
          )}

          {/* Process Selection Section */}
          {!isSubtypeForm && (
            <div className="pt-4 border-t mt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Process *
                </label>
                <V3Select
                  value={watch("process")}
                  ariaLabel="Process"
                  onChange={(value) => {
                    // Map UI value to schema value
                    const processValue = value === "calibration_and_repairing"
                      ? "calibration_and_repairing"
                      : value as "calibration" | "repair" | "calibration_and_repairing" | "data_save";
                    setValue("process", processValue, {
                      shouldValidate: true,
                    });
                  }}
                  placeholder="Select process"
                  options={[{ value: "calibration", label: "Calibration" }, { value: "repair", label: "Repair" }, { value: "calibration_and_repairing", label: "Repair & Calibration" }, { value: "data_save", label: "Data Save" }]}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isSubtypeForm && (
            <div className="flex gap-3 pt-4 border-t mt-4">
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting}
              >
                {isSubmitting
                  ? isEditing
                    ? "Updating..."
                    : submitMode === "map"
                      ? "Mapping..."
                    : watch("process") === "data_save"
                      ? "Saving..."
                      : "Adding..."
                  : isEditing
                    ? "Update"
                    : submitMode === "map"
                      ? watch("process") === "data_save"
                        ? "ADD"
                        : "ADD"
                    : watch("process") === "data_save"
                      ? "Save Data"
                      : "Add"}
              </Button>
              {isEditing && onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onPress={onCancel}
                >
                  Cancel Edit
                </Button>
              )}
              {onCancel && (
                <Button
                  type="button"
                  variant="secondary"
                  onPress={onCancel}
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </FormWrapper>
      </FormProvider>
    </div>
  );
});

InwardGaugeForm.displayName = "InwardGaugeForm";

// Separate component for subtype forms to ensure complete isolation
interface SubtypeFormWrapperProps {
  index: number;
  initialData?: Partial<GaugeRegistrationFormData>;
  onDataChange: (data: Partial<GaugeRegistrationFormData>) => void;
  onRefReady: (ref: InwardGaugeFormRef | null) => void;
  gaugeMasterList: GaugeMaster[];
  certificateTypes: CertificateType[];
  gaugeMasterLoading?: boolean;
  certificateTypeLoading?: boolean;
  isSubmitting?: boolean;
}

const SubtypeFormWrapper = React.memo(({
  initialData,
  onDataChange,
  onRefReady,
  gaugeMasterList,
  certificateTypes,
  gaugeMasterLoading = false,
  certificateTypeLoading = false,
  isSubmitting = false,
}: SubtypeFormWrapperProps) => {
  const formRef = useRef<InwardGaugeFormRef>(null);
  const lastDataRef = useRef<string>("");
  const dataChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify parent when ref is ready
  useEffect(() => {
    if (formRef.current) {
      onRefReady(formRef.current);
    } else {
      onRefReady(null);
    }
    return () => {
      onRefReady(null);
    };
  }, [onRefReady]);

  // Watch for form changes using a debounced approach
  const handleFormDataSync = useCallback(() => {
    if (dataChangeTimeoutRef.current) {
      clearTimeout(dataChangeTimeoutRef.current);
    }

    dataChangeTimeoutRef.current = setTimeout(() => {
      if (formRef.current) {
        const currentData = formRef.current.getValues();
        const dataString = JSON.stringify(currentData);

        // Only update if data actually changed
        if (dataString !== lastDataRef.current) {
          lastDataRef.current = dataString;
          onDataChange(currentData);
        }
      }
    }, 300); // Debounce to avoid too many updates
  }, [onDataChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dataChangeTimeoutRef.current) {
        clearTimeout(dataChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      onBlur={handleFormDataSync}
      onChange={handleFormDataSync}
      onClick={handleFormDataSync}
    >
      <InwardGaugeForm
        ref={formRef}
        onSubmit={async () => {
          // Not used - data is collected via onChange/blur
          handleFormDataSync();
        }}
        isSubtypeForm={true}
        gaugeMasterList={gaugeMasterList}
        certificateTypes={certificateTypes}
        gaugeMasterLoading={gaugeMasterLoading}
        certificateTypeLoading={certificateTypeLoading}
        isSubmitting={isSubmitting}
        initialData={initialData}
      />
    </div>
  );
});

SubtypeFormWrapper.displayName = "SubtypeFormWrapper";
