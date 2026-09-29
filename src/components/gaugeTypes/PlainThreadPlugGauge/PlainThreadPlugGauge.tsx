import React, { useEffect, useCallback, useRef, useState } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Autocomplete, Button, Input, ListBox } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useInfiniteThreadRingPlugsQuery,
  useThreadRingPlugByIdQuery,
  useThreadRingPlugBySpecificationQuery,
} from "../../../hooks/queries/threadRingPlugs";
import { queryKeys } from "../../../hooks/queries/queryKeys";
import type { ThreadRingPlugData } from "../../../store/threadRingPlugStore";
import { formatSpecificationValue } from "../../specifications/SpecificationReadOnlyField";

interface PlainThreadPlugGaugeProps {
  isSubmitting?: boolean;
  readOnly?: boolean;
}

const PlainThreadPlugGauge: React.FC<PlainThreadPlugGaugeProps> = ({
  isSubmitting = false,
  readOnly = false,
}) => {
  const { setValue, getValues, control, watch } = useFormContext();
  const queryClient = useQueryClient();
  const unit = watch('unit') || 'mm';
  const lastPopulatedSpecRef = useRef<string | null>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  const selectedSpecificationId = useWatch({
    control,
    name: "specifications.standard_specification_id",
  }) as string | undefined;
  
  const selectedSpecification = useWatch({
    control,
    name: "specifications.standard_specification",
  }) as string | undefined;
  
  const selectedSpecKey = selectedSpecificationId || selectedSpecification;
  const specificationPagesQuery = useInfiniteThreadRingPlugsQuery(
    { limit: 100 },
    {
      enabled: !readOnly,
      staleTime: 5 * 60 * 1000,
    }
  );

  const loadedSpecifications = React.useMemo(() => {
    const flattenedPages = specificationPagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
    const seenKeys = new Set<string>();

    return flattenedPages.filter((spec) => {
      const uniqueKey = spec.id || spec.standard_specification;
      if (!uniqueKey || seenKeys.has(uniqueKey)) {
        return false;
      }

      seenKeys.add(uniqueKey);
      return true;
    });
  }, [specificationPagesQuery.data]);

  const selectedSpecFromLoadedPages = React.useMemo(() => {
    if (!selectedSpecKey || !loadedSpecifications.length) return null;

    return loadedSpecifications.find(
      (spec) =>
        spec.id === selectedSpecKey ||
        spec.id === selectedSpecificationId ||
        spec.standard_specification === selectedSpecKey ||
        spec.standard_specification === selectedSpecification
    ) ?? null;
  }, [loadedSpecifications, selectedSpecKey, selectedSpecificationId, selectedSpecification]);

  const selectedSpecByIdQuery = useThreadRingPlugByIdQuery(selectedSpecificationId ?? "", {
    enabled: Boolean(selectedSpecificationId) && !selectedSpecFromLoadedPages,
    staleTime: 5 * 60 * 1000,
  });

  const selectedSpecBySpecificationQuery = useThreadRingPlugBySpecificationQuery(
    selectedSpecification ?? "",
    {
      enabled:
        !selectedSpecificationId &&
        Boolean(selectedSpecification) &&
        !selectedSpecFromLoadedPages,
      staleTime: 5 * 60 * 1000,
    }
  );

  const selectedSpecData =
    selectedSpecFromLoadedPages ??
    selectedSpecByIdQuery.data ??
    selectedSpecBySpecificationQuery.data ??
    null;

  const specificationList = React.useMemo(() => {
    const items = [...loadedSpecifications];

    if (
      selectedSpecData &&
      !items.some(
        (spec) =>
          spec.id === selectedSpecData.id ||
          spec.standard_specification === selectedSpecData.standard_specification
      )
    ) {
      items.unshift(selectedSpecData);
    }

    return items;
  }, [loadedSpecifications, selectedSpecData]);

  const totalSpecifications =
    specificationPagesQuery.data?.pages[0]?.total ?? specificationList.length;
  const hasMoreSpecifications = Boolean(specificationPagesQuery.hasNextPage);
  const isLoading =
    specificationPagesQuery.isLoading ||
    selectedSpecByIdQuery.isLoading ||
    selectedSpecBySpecificationQuery.isLoading;

  useEffect(() => {
    if (
      readOnly ||
      !isAutocompleteOpen ||
      !hasMoreSpecifications ||
      specificationPagesQuery.isFetchingNextPage
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void specificationPagesQuery.fetchNextPage();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    hasMoreSpecifications,
    isAutocompleteOpen,
    readOnly,
    specificationPagesQuery,
    specificationPagesQuery.isFetchingNextPage,
  ]);

  const selectedAutocompleteKey = React.useMemo(() => {
    if (selectedSpecData?.id) return selectedSpecData.id;
    if (selectedSpecificationId) return selectedSpecificationId;
    if (selectedSpecification) {
      const matched = specificationList.find(
        (spec) => spec.standard_specification === selectedSpecification
      );
      return matched?.id ?? null;
    }
    return null;
  }, [selectedSpecData, selectedSpecificationId, selectedSpecification, specificationList]);

  const tableData = React.useMemo(() => {
    if (!selectedSpecData) return null;
    
    return {
      go: {
        max_wear_limit: selectedSpecData.go_max_wear_limit ?? 0,
        min_wear_limit: selectedSpecData.go_min_wear_limit ?? 0,
        wear_limit: selectedSpecData.go_wear_limit ?? 0,
      },
      no_go: {
        max_wear_limit: selectedSpecData.no_go_max_wear_limit ?? 0,
        min_wear_limit: selectedSpecData.no_go_min_wear_limit ?? 0,
        wear_limit: selectedSpecData.no_go_wear_limit ?? 0,
      },
    };
  }, [selectedSpecData]);

  useEffect(() => {
    if (readOnly) return;
    if (!selectedSpecKey || !tableData || !selectedSpecData || isSubmitting) return;

    const specValue = selectedSpecData.standard_specification;
    if (lastPopulatedSpecRef.current === specValue) return;

    const currentSpecs = getValues("specifications");
    const currentSpecInForm = currentSpecs?.standard_specification;
    const currentSpecIdInForm = currentSpecs?.standard_specification_id;

    const isEditModeSameSpec =
      (currentSpecInForm === selectedSpecification || 
       currentSpecInForm === specValue ||
       currentSpecIdInForm === selectedSpecificationId ||
       currentSpecIdInForm === selectedSpecData.id ||
       currentSpecInForm === selectedSpecData.id) &&
      currentSpecs?.go?.specification_limit_max !== undefined &&
      currentSpecs?.go?.specification_limit_max !== null;

    if (isEditModeSameSpec) {
      lastPopulatedSpecRef.current = specValue;
      return;
    }

    const goMaxWearLimit = typeof tableData.go.max_wear_limit === 'number' 
      ? tableData.go.max_wear_limit 
      : (typeof tableData.go.max_wear_limit === 'string' ? parseFloat(tableData.go.max_wear_limit) || 0 : 0);
    const goMinWearLimit = typeof tableData.go.min_wear_limit === 'number' 
      ? tableData.go.min_wear_limit 
      : (typeof tableData.go.min_wear_limit === 'string' ? parseFloat(tableData.go.min_wear_limit) || 0 : 0);
    const goWearLimit = typeof tableData.go.wear_limit === 'number' 
      ? tableData.go.wear_limit 
      : (typeof tableData.go.wear_limit === 'string' ? parseFloat(tableData.go.wear_limit) || 0 : 0);

    setValue("specifications.go.basic_size", goMaxWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.go.specification_limit_max", goMaxWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.go.specification_limit_min", goMinWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.go.wear_limit", goWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });

    const noGoMaxWearLimit = typeof tableData.no_go.max_wear_limit === 'number' 
      ? tableData.no_go.max_wear_limit 
      : (typeof tableData.no_go.max_wear_limit === 'string' ? parseFloat(tableData.no_go.max_wear_limit) || 0 : 0);
    const noGoMinWearLimit = typeof tableData.no_go.min_wear_limit === 'number' 
      ? tableData.no_go.min_wear_limit 
      : (typeof tableData.no_go.min_wear_limit === 'string' ? parseFloat(tableData.no_go.min_wear_limit) || 0 : 0);
    const noGoWearLimit = typeof tableData.no_go.wear_limit === 'number' 
      ? tableData.no_go.wear_limit 
      : (typeof tableData.no_go.wear_limit === 'string' ? parseFloat(tableData.no_go.wear_limit) || 0 : 0);

    setValue("specifications.no_go.basic_size", noGoMaxWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.no_go.specification_limit_max", noGoMaxWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.no_go.specification_limit_min", noGoMinWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });
    setValue("specifications.no_go.wear_limit", noGoWearLimit, { 
      shouldDirty: false, 
      shouldValidate: false 
    });

    lastPopulatedSpecRef.current = specValue;
  }, [readOnly, selectedSpecKey, selectedSpecificationId, selectedSpecification, selectedSpecData, tableData, setValue, getValues, isSubmitting]);

  const handleCalculateTable = useCallback(async () => {
    if (!selectedSpecKey) {
      toast.error("Please select a specification first");
      return;
    }

    try {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.threadRingPlugs.all,
      });
      toast.success("Table calculated successfully");
    } catch {
      toast.error("Failed to calculate table");
    }
  }, [selectedSpecKey, queryClient]);

  if (readOnly) {
    const specificationValue =
      selectedSpecData?.standard_specification ||
      selectedSpecification ||
      selectedSpecificationId;

    return (
      <div className=" mb-2 rounded-ms border border-slate-200 bg-white p-2 shadow-sm">
        <h3 className="mb-2 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="mb-2">
          <div className="text-xs font-semibold text-gray-700 uppercase mb-1">Standard Specification</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            {formatSpecificationValue(specificationValue)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Specification Select */}
      <div className="text-sm font-medium text-gray-700 mb-1">
        Specification
      </div>

      <div className="w-full bg-gray-100 border rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        <Autocomplete
          selectedKey={selectedAutocompleteKey}
          onOpenChange={setIsAutocompleteOpen}
          onSelectionChange={(key) => {
            const value = key as string | null;
            if (!value) return;

            const selectedSpec = specificationList.find(
              (spec) => spec.id === value || spec.standard_specification === value
            );
            
            if (selectedSpec) {
              setValue("specifications.standard_specification_id", selectedSpec.id, {
                shouldDirty: true,
                shouldValidate: false,
              });
              setValue("specifications.standard_specification", selectedSpec.standard_specification, {
                shouldDirty: true,
                shouldValidate: false,
              });
            } 

            setValue("specifications.go", {}, { shouldDirty: false, shouldValidate: false });
            setValue("specifications.no_go", {}, { shouldDirty: false, shouldValidate: false });
            lastPopulatedSpecRef.current = null;
          }}
          aria-label="Select specification"
        >
          <Autocomplete.Trigger>
            <Autocomplete.Filter>
              <Input placeholder="Select specification" className="bg-white border border-gray-300" />
            </Autocomplete.Filter>
            <Autocomplete.Indicator />
          </Autocomplete.Trigger>
          <Autocomplete.Popover>
            <ListBox>
              {isLoading ? (
                <ListBox.Item id="loading" isDisabled>
                  {specificationPagesQuery.error ? "Unable to load specifications" : "Loading specifications..."}
                </ListBox.Item>
              ) : specificationList.length === 0 ? (
                <ListBox.Item id="empty" isDisabled>No specifications found</ListBox.Item>
              ) : (
                specificationList.map((spec: ThreadRingPlugData) => (
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
              {specificationList.length > 0 && (
                <ListBox.Item id="status" isDisabled>
                  {specificationPagesQuery.isFetchingNextPage
                    ? "Loading remaining specifications..."
                    : `Loaded ${specificationList.length} of ${totalSpecifications} specifications`}
                </ListBox.Item>
              )}
            </ListBox>
          </Autocomplete.Popover>
        </Autocomplete>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-700 text-white">
          <div className="grid grid-cols-5 text-center text-xs font-medium">
            <div className="p-2.5 border-r">PARAMETER ({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">BASIC SIZE ({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">SPECIFICATION LIMIT MAX ({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">SPECIFICATION LIMIT MIN ({unit.toUpperCase()})</div>
            <div className="p-2.5">WEAR LIMIT ({unit.toUpperCase()})</div>
          </div>
        </div>

        {/* GO */}
        <div className="grid grid-cols-5 border-b">
          <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">
            Go
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.go.basic_size"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Basic Size"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.go.specification_limit_max"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Specification Limit Max"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.go.specification_limit_min"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Specification Limit Min"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 bg-background">
            <Controller
              name="specifications.go.wear_limit"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Wear Limit"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
        </div>

        {/* NO GO */}
        <div className="grid grid-cols-5">
          <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">
            No Go
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.no_go.basic_size"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Basic Size"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.no_go.specification_limit_max"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Specification Limit Max"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 border-r bg-background">
            <Controller
              name="specifications.no_go.specification_limit_min"
              control={control}
              render={({ field }) => (
                <Input
                  type="number"
                  step="0.001"
                  aria-label="Specification Limit Min"
                  placeholder="0"
                  className="h-9 text-sm"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="p-2 bg-background flex items-center justify-center">
            <Button
              variant="primary"
              aria-label="Calculate Table"
              onPress={handleCalculateTable}
              isDisabled={!selectedSpecKey || isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Calculate Table
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlainThreadPlugGauge;
