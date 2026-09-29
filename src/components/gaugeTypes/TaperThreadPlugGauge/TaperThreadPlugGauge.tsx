import React, { useEffect, useRef } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Input, Autocomplete, ListBox } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { fetchTaperThreadReadingsRaw } from "../../../services/apiServices";
import type { TaperThreadReadingsApiResponse } from "../../../store/taperThreadReadingsStore";
import { formatSpecificationValue } from "../../specifications/SpecificationReadOnlyField";

interface TaperThreadPlugGaugeProps {
  isSubmitting?: boolean;
  readOnly?: boolean;
  initialData: any;
}
const TaperThreadPlugGauge: React.FC<TaperThreadPlugGaugeProps> = ({
  initialData: specifications,
  isSubmitting = false,
  readOnly = false,
}) => {
  const { setValue, getValues, control, watch } = useFormContext();

  // Get unit from form context
  const unit = watch('unit') || 'mm';

  // Track last populated spec to prevent re-population
  const lastPopulatedSpecRef = useRef<string | null>(null);

  /* Watch selected specification - check both ID and value for editing support */
  const selectedSpecificationId = useWatch({
    control,
    name: "specifications.standard_specification_id",
  }) as string | undefined;

  const selectedSpecification = useWatch({
    control,
    name: "specifications.standard_specification",
  }) as string | undefined;

  // Use ID if available, otherwise fallback to value
  const selectedSpecKey = selectedSpecificationId || selectedSpecification;

  /* Dropdown list - fetch raw API data for component use */
  const { data: specificationList = [], isLoading } = useQuery({
    queryKey: ["taper-thread-readings-raw"],
    queryFn: fetchTaperThreadReadingsRaw,
    staleTime: 5 * 60 * 1000,
  });

  /* Find selected specification from list */
  const selectedSpecData = React.useMemo(() => {
    if (!selectedSpecKey || !specificationList.length) return null;
    return (specificationList.find(
      (spec: TaperThreadReadingsApiResponse) =>
        spec.id === selectedSpecKey ||
        spec.id === selectedSpecificationId ||
        spec.standard_specification === selectedSpecKey ||
        spec.standard_specification === selectedSpecification
    ) || null);
  }, [selectedSpecKey, selectedSpecificationId, selectedSpecification, specificationList]);

  /* Helper to parse value (handle "nan" string) */
  const parseValue = (value: any): number | undefined => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && (value.toLowerCase() === "nan" || value.trim() === "")) return undefined;
    const parsed = typeof value === "number" ? value : parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  };

  /* Populate table when spec changes - use data directly from selectedSpecData (no API call needed) */
  useEffect(() => {
    if (readOnly) return;
    if (!selectedSpecKey || !selectedSpecData || isSubmitting) return;

    // Get the actual spec value (standard_specification) for comparison
    const specValue = selectedSpecData.standard_specification;

    // Skip if we already populated this spec
    if (lastPopulatedSpecRef.current === specValue) return;

    const currentSpecs = getValues("specifications");
    const currentSpecInForm = currentSpecs?.standard_specification;
    const currentSpecIdInForm = currentSpecs?.standard_specification_id;

    /**
     * EDIT MODE GUARD
     * If same spec & data already exists → don't overwrite
     * Compare both ID and value to handle both cases
     */
    const isEditModeSameSpec =
      (currentSpecInForm === selectedSpecification ||
        currentSpecInForm === specValue ||
        currentSpecIdInForm === selectedSpecificationId ||
        currentSpecIdInForm === selectedSpecData.id ||
        currentSpecInForm === selectedSpecData.id) &&
      currentSpecs?.pitch_dial?.specified_limit_max !== undefined &&
      currentSpecs?.pitch_dial?.specified_limit_max !== null;

    if (isEditModeSameSpec) {
      lastPopulatedSpecRef.current = specValue;
      return;
    }

    /* Populate PITCH DIAL - data already available in selectedSpecData */
    const pitchDialMax = parseValue(selectedSpecData.pitch_dial?.max_diameter);
    const pitchDialMin = parseValue(selectedSpecData.pitch_dial?.min_diameter);

    if (pitchDialMax !== undefined) {
      setValue("specifications.pitch_dial.specified_limit_max", pitchDialMax, {
        shouldDirty: false,
        shouldValidate: false
      });
    }
    if (pitchDialMin !== undefined) {
      setValue("specifications.pitch_dial.specified_limit_min", pitchDialMin, {
        shouldDirty: false,
        shouldValidate: false
      });
    }

    /* Populate MAX STEP - data already available in selectedSpecData */
    const maxStepValue = parseValue(selectedSpecData.max_step);
    if (maxStepValue !== undefined) {
      setValue("specifications.max_step.specified_limit_max", maxStepValue, {
        shouldDirty: false,
        shouldValidate: false
      });
    }

    /* Populate BASIC STEP - data already available in selectedSpecData */
    const basicStepValue = parseValue(selectedSpecData.basic_step);
    if (basicStepValue !== undefined) {
      setValue("specifications.basic_step.specified_limit_max", basicStepValue, {
        shouldDirty: false,
        shouldValidate: false
      });
    }

    /* Populate MIN STEP - data already available in selectedSpecData */
    const minStepValue = parseValue(selectedSpecData.min_step);
    if (minStepValue !== undefined) {
      setValue("specifications.min_step.specified_limit_max", minStepValue, {
        shouldDirty: false,
        shouldValidate: false
      });
    }

    /* Populate TOTAL LENGTH - data already available in selectedSpecData */
    const totalLengthValue = parseValue(selectedSpecData.total_length);
    if (totalLengthValue !== undefined) {
      setValue("specifications.total_length.specified_limit_max", totalLengthValue, {
        shouldDirty: false,
        shouldValidate: false
      });
    }

    // Mark as populated (use spec value, not ID)
    lastPopulatedSpecRef.current = specValue;
  }, [readOnly, selectedSpecKey, selectedSpecificationId, selectedSpecification, selectedSpecData, setValue, getValues, isSubmitting]);

  // Parameters to display
  const parameters = [
    { key: "pitch_dial", label: "PITCH DIAL" },
    { key: "max_step", label: "MAX STEP" },
    { key: "basic_step", label: "BASIC STEP" },
    { key: "min_step", label: "MIN STEP" },
    { key: "total_length", label: "TOTAL LENGTH" },
  ];

  if (readOnly) {
    const specificationValue =
      selectedSpecData?.standard_specification ||
      selectedSpecification ||
      selectedSpecificationId;
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-2">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Standard Specification</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {formatSpecificationValue(specificationValue)}
          </div>
        </div>
        {!readOnly && (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700 text-white">
                  <th className="p-2.5 text-left text-xs font-medium border-r">PARAMETER ({unit.toUpperCase()})</th>
                <th className="p-2.5 text-center text-xs font-medium border-r">SPECIFIED LIMIT MAX ({unit.toUpperCase()})</th>
                <th className="p-2.5 text-center text-xs font-medium">SPECIFIED LIMIT MIN ({unit.toUpperCase()})</th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((param, index) => {
                const row = specifications?.[param.key as keyof typeof specifications] as { specified_limit_max?: unknown; specified_limit_min?: unknown } | undefined;
                const isPitchDial = param.key === "pitch_dial";
                return (
                  <tr key={param.key} className={index < parameters.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="p-2.5 border-r bg-muted/30 text-sm font-medium text-foreground/70">{param.label}</td>
                    <td className="p-2 text-sm border-r">{formatSpecificationValue(row?.specified_limit_max)}</td>
                    <td className="p-2 text-sm">{isPitchDial ? formatSpecificationValue(row?.specified_limit_min) : "N/A"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="w-full rounded-md">
        <label className="mb-2 block text-sm font-medium text-gray-700">Select standard specification</label>
        <Autocomplete
          selectedKey={
            selectedSpecKey && selectedSpecData?.id
              ? selectedSpecData.id
              : selectedSpecificationId || selectedSpecification || undefined
          }
          onSelectionChange={(key) => {
            if (!key) return;

            const value = key as string;

            // Find the selected spec to get its ID and value
            const selectedSpec = specificationList.find(
              (spec: TaperThreadReadingsApiResponse) =>
                spec.id === value || spec.standard_specification === value
            );

            if (selectedSpec) {
              // Store both ID and value for API payload
              setValue("specifications.standard_specification_id", selectedSpec.id, {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue("specifications.standard_specification", selectedSpec.standard_specification, {
                shouldDirty: true,
                shouldValidate: false,
              });
            } else {
              // Fallback if spec not found
              setValue("specifications.standard_specification_id", value, {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue("specifications.standard_specification", value, {
                shouldDirty: true,
                shouldValidate: false,
              });
            }

            /* Clear old data so new spec always refreshes */
            parameters.forEach((param) => {
              setValue(`specifications.${param.key}`, {}, { shouldDirty: false, shouldValidate: false });
            });

            // Reset populated spec tracking
            lastPopulatedSpecRef.current = null;
          }}
        >
          <Autocomplete.Trigger>
            <Autocomplete.Filter>
              <Input placeholder="Type to search specifications..." disabled={isSubmitting} />
            </Autocomplete.Filter>
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <ListBox>
              {isLoading ? (
                <ListBox.Item id="loading" isDisabled>Loading specifications...</ListBox.Item>
              ) : specificationList.length === 0 ? (
                <ListBox.Item id="empty" isDisabled>No specifications found</ListBox.Item>
              ) : (
                specificationList.map((spec: TaperThreadReadingsApiResponse) => (
                  <ListBox.Item
                    key={spec.id || spec.standard_specification}
                    id={spec.id || spec.standard_specification || "unknown"}
                    textValue={spec.standard_specification || "N/A"}
                  >
                    {spec.standard_specification || "N/A"}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))
              )}
            </ListBox>
          </Autocomplete.Popover>
        </Autocomplete>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="p-2.5 text-left text-xs font-medium border-r">PARAMETER ({unit.toUpperCase()})</th>
              <th className="p-2.5 text-center text-xs font-medium border-r">SPECIFIED LIMIT MAX ({unit.toUpperCase()})</th>
              <th className="p-2.5 text-center text-xs font-medium border-r">SPECIFIED LIMIT MIN ({unit.toUpperCase()})</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => {
              const isPitchDial = param.key === "pitch_dial";

              return (
                <tr key={param.key} className={index < parameters.length - 1 ? 'border-b border-gray-200' : ''}>
                  {/* Parameter Name */}
                  <td className="p-2.5 border-r bg-muted/30 text-sm font-medium text-foreground/70">
                    {param.label}
                  </td>

                  {/* Specified Limit Columns */}
                  {isPitchDial ? (
                    <>
                      <td className="p-2 border-r bg-background">
                        <Controller
                          name={`specifications.${param.key}.specified_limit_max`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              aria-label="Specified Limit Max"
                              step="0.001"
                              placeholder="-"
                              className="h-9 text-sm w-full"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                              onBlur={field.onBlur}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                      </td>
                      <td className="p-2 border-r bg-background">
                        <Controller
                          name={`specifications.${param.key}.specified_limit_min`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              aria-label="Specified Limit Min"
                              step="0.001"
                              placeholder="-"
                              className="h-9 text-xs w-full"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                              onBlur={field.onBlur}
                              disabled={isSubmitting}
                            />
                          )}
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Merged cell spanning both MAX and MIN columns - centered value */}
                      <td colSpan={2} className="p-2 border-r bg-background text-center">
                        <div className="flex items-center justify-center">
                          <Controller
                            name={`specifications.${param.key}.specified_limit_max`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                aria-label="Specified Limit Max"
                                step="0.001"
                                placeholder="-"
                                className="h-9 text-sm w-full max-w-[160px]"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                                onBlur={field.onBlur}
                                disabled={isSubmitting}
                              />
                            )}
                          />
                        </div>
                      </td>
                    </>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaperThreadPlugGauge;
