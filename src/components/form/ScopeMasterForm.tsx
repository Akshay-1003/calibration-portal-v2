"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { ComponentProps } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, DateField, DatePicker, Input, Button, Autocomplete, ListBox } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { toast } from "sonner";
import {
  scopeMasterFormSchema,
  zodResolver,
  type ScopeMasterFormData,
} from "../../lib/validations";
import { useMasterDataStore } from "../../store/useStore";
import { type ScopeMasterData, GaugeMaster } from "../../store/useStore";
import { useEquipmentsWithQuery } from "../../hooks/useEquipmentsWithQuery";
import EquipmentSelector from "../CalibrationEquipments/EquipmentSelector";
import { FormDateProvider } from "./FormDateProvider";

interface ScopeMasterFormProps {
  gaugeMasterList: GaugeMaster[];
  mode?: 'create' | 'edit';
  scopeId?: string;
  initialData?: ScopeMasterFormData;
  onSuccess?: (data?: any, currentMode?: 'create' | 'edit') => void;
  onCancel?: () => void;
}

const LabeledInput = ({ label, ...props }: { label: string } & ComponentProps<typeof Input>) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
    <Input {...props} className={`w-full ${props.className ?? ''}`} />
  </label>
);

const LabeledAutocomplete = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string }>;
  placeholder: string;
}) => (
  <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
    {label}
  <Autocomplete className="w-full" selectedKey={value || null} onSelectionChange={(key) => onChange(key ? String(key) : '')}>
      <Autocomplete.Trigger>
        <Autocomplete.Filter><Input aria-label={label} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></Autocomplete.Filter>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover><ListBox>{options.map((option) => <ListBox.Item key={option.key} id={option.key} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Autocomplete.Popover>
    </Autocomplete>
  </label>
);

const ScopeMasterForm = ({
  gaugeMasterList,
  mode = 'create',
  scopeId,
  initialData,
  onSuccess,
  onCancel,
}: ScopeMasterFormProps) => {
  const navigate = useNavigate();
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ScopeMasterFormData>({
    resolver: zodResolver(scopeMasterFormSchema) as any,
    defaultValues: {
      master_gauge_id: "",
      unit: "mm",
      range: { min: '0', max: '0' },
      least_count: '0',
      valid_until: "",
      uncertainty: "",
      confidence_level_and_coverage: "",
      calibration_location: "permanent_facility",
      remarks: "",
      calibration_equipments: [],
      master_equipments: [],
    },
    mode: "onChange",
  });

  // Watch the unit field for dynamic label updates
  const selectedUnit = watch("unit");

  const {
    createScopeMaster,
    updateScopeMaster,
  } = useMasterDataStore();

  const { loading: equipmentLoading } = useEquipmentsWithQuery();

  // Load initial data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Set form values from initialData
      Object.keys(initialData).forEach((key) => {
        const value = initialData[key as keyof ScopeMasterFormData];
        if (value !== undefined && value !== null) {
          setValue(key as keyof ScopeMasterFormData, value as any);
        }
      });
    }
  }, [mode, initialData, setValue]);

  /* -------------------- SUBMIT -------------------- */
  const onSubmit = async (data: ScopeMasterFormData): Promise<void> => {
    try {
      if (mode === 'edit' && scopeId) {
        await updateScopeMaster(scopeId, data as Partial<ScopeMasterData>);
        toast.success("Scope Master updated successfully");
      } else {
        await createScopeMaster(data as Partial<ScopeMasterData>);
        toast.success("Scope Master created successfully");
        reset();
      }

      // Call onSuccess callback if provided, otherwise navigate
      if (onSuccess) {
        onSuccess(data, mode);
      } else {
        navigate("/masters/scope-master");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      toast.error(errorMessage);
    }
  };


  /* -------------------- RENDER -------------------- */
  return (
    <FormDateProvider>
      <div className="w-full mx-auto">
        <div className="shadow-sm border rounded-md bg-card">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-md text-xl font-semibold">
            {mode === "edit" ? "Edit Scope Master" : "New Scope Master"}
          </div>

          <div className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Master + Unit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Controller
                name="master_gauge_id"
                control={control}
                render={({ field }) => (
                  <LabeledAutocomplete label="Master Gauge" value={field.value || ''} onChange={field.onChange} placeholder="Search and select Master Gauge" options={gaugeMasterList.map((item) => ({ key: item.id, label: item.name }))} />
                )}
              />
              <Controller
                name="unit"
                control={control}
                render={({ field }) => {
                  const unitOptions = [
                    { key: "mm", label: "mm" },
                    { key: "µm", label: "µm" },
                    { key: "inch", label: "inch" },
                    { key: "Kg/cm2", label: "Kg/cm2" },
                    { key: "bar", label: "bar" },
                    { key: "Pa", label: "Pa" },
                    { key: "Degree", label: "Degree" },
                  ];

                  return (
                    <LabeledAutocomplete label="Unit" value={field.value || 'mm'} onChange={(value) => field.onChange(value || 'mm')} placeholder="Select Unit" options={unitOptions} />
                  );
                }}
              />
            </div>

            {/* Range + Uncertainty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="range.min"
                  control={control}
                  render={({ field }) => (
                    <LabeledInput
                      label={`Range From ${selectedUnit ? `(${selectedUnit})` : ''}`}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter Range From"
                      aria-invalid={!!errors.range?.min}
                    />
                  )}
                />
                <Controller
                  name="range.max"
                  control={control}
                  render={({ field }) => (
                    <LabeledInput
                      label={`Range To ${selectedUnit ? `(${selectedUnit})` : ''}`}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter Range To"
                      aria-invalid={!!errors.range?.max}
                    />
                  )}
                />
              </div>
              <div>
                <LabeledInput
                  label="Uncertainty"
                  {...register("uncertainty")}
                  placeholder="Enter Uncertainty"
                  aria-invalid={!!errors.uncertainty}
                />
                {errors.uncertainty && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.uncertainty.message}
                  </p>
                )}
              </div>
              <div>
                <LabeledInput
                  label="Least Count"
                  {...register("least_count")}
                  placeholder="Enter Least Count"
                  aria-invalid={!!errors.least_count}
                />
              </div>
            </div>

            {/* Confidence + Location + Validity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabeledInput
                  label="Confidence level & coverage"
                  {...register("confidence_level_and_coverage")}
                  placeholder="Enter Confidence Level & Coverage"
                  aria-invalid={!!errors.confidence_level_and_coverage}
                />
                {errors.confidence_level_and_coverage && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.confidence_level_and_coverage.message}
                  </p>
                )}
              </div>

              <Controller
                name="calibration_location"
                control={control}
                render={({ field }) => {
                  const locationOptions = [
                    { key: "permanent_facility", label: "Permanent Facility" },
                    { key: "site_facility", label: "Site Facility" },
                    { key: "mobile_facility", label: "Mobile Facility" },
                  ];

                  return (
                    <LabeledAutocomplete label="Calibration Location" value={field.value || ''} onChange={field.onChange} placeholder="Search and select Calibration Location" options={locationOptions} />
                  );
                }}
              />

              <Controller
                name="valid_until"
                control={control}
                render={({ field }) => (
                  <div>
                    <label className="flex flex-col gap-2 text-sm font-medium text-foreground">Valid Until
                    <DatePicker
                      value={field.value ? parseDate(field.value) : null}
                      onChange={(d) => field.onChange(d ? String(d) : "")}
                      aria-label="Valid Until"
                      granularity="day"
                      className="w-full"
                    >
                      <DateField.Group fullWidth><DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input><DateField.Suffix><DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger></DateField.Suffix></DateField.Group>
                      <DatePicker.Popover><Calendar aria-label="Valid Until"><Calendar.Header><Calendar.NavButton slot="previous" /><Calendar.NavButton slot="next" /></Calendar.Header><Calendar.Grid><Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader><Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody></Calendar.Grid></Calendar></DatePicker.Popover>
                    </DatePicker></label>
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Controller
                name="calibration_equipments"
                control={control}
                render={({ field }) => (
                  <div>
                    <EquipmentSelector
                      value={field.value ?? []}
                      onChange={field.onChange}
                      loading={equipmentLoading}
                    />
                    {errors.calibration_equipments && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.calibration_equipments.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LabeledInput
                  label="Remarks"
                  {...register("remarks")}
                  placeholder="Enter remarks"
                  aria-invalid={!!errors.remarks}
                />
                {errors.remarks && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.remarks.message}
                  </p>
                )}
              </div>
              <div>
                <LabeledInput
                  label="Master Equipment List"
                  {...register("master_equipments")}
                  placeholder="Enter master equipments"
                  aria-invalid={!!errors.master_equipments}
                />
                {errors.master_equipments && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.master_equipments.message}
                  </p>
                )}
              </div>
            </div>


            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" isDisabled={isSubmitting}>
                {mode === "edit" ? "Update" : "Save"}
              </Button>
              <Button
                variant="outline"
                onPress={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate(-1);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </FormDateProvider>
  );
};

export default ScopeMasterForm;

/* -------------------- HELPERS -------------------- */
