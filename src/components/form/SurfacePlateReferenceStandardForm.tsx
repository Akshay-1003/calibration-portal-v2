"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { Button, Chip, Input } from "@heroui/react";
import { useGaugeStore } from "../../store/gaugeStore";
import {
  surfacePlateReferenceStandardFormSchema,
  zodResolver,
  type SurfacePlateReferenceStandardFormData,
} from "../../lib/validations";
import type { SurfacePlateReferenceStandardRecord, SurfacePlateShape } from "../../types/surfacePlateReferenceStandards";

interface SurfacePlateReferenceStandardFormProps {
  mode: "create" | "edit";
  initialData?: SurfacePlateReferenceStandardRecord | null;
  isSubmitting?: boolean;
  submitError?: string | null;
  onCancel: () => void;
  onSubmit: (values: SurfacePlateReferenceStandardFormData) => Promise<void> | void;
}

const defaultValues: SurfacePlateReferenceStandardFormData = {
  master_gauge_id: "",
  master_gauge_name: "",
  shape: "rectangular",
  length: "",
  width: "",
  unit: "µm",
  tolerances: {
    grade_0: "",
    grade_1: "",
    grade_2: "",
    grade_3: "",
  },
};

const deriveShapeFromDimensions = (
  lengthValue: string | number | undefined,
  widthValue: string | number | undefined
): SurfacePlateShape => {
  const length = Number(lengthValue);
  const width = Number(widthValue);

  if (Number.isFinite(length) && Number.isFinite(width) && length > 0 && width > 0) {
    return length === width ? "square" : "rectangular";
  }

  return "rectangular";
};

export default function SurfacePlateReferenceStandardForm({
  mode,
  initialData,
  isSubmitting = false,
  submitError,
  onCancel,
  onSubmit,
}: SurfacePlateReferenceStandardFormProps) {
  const { gaugeMasterList, fetchGauges, loading: gaugeLoading } = useGaugeStore();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SurfacePlateReferenceStandardFormData>({
    resolver: zodResolver(surfacePlateReferenceStandardFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const lengthValue = useWatch({ control, name: "length" });
  const widthValue = useWatch({ control, name: "width" });
  const derivedShape = useMemo(
    () => deriveShapeFromDimensions(lengthValue, widthValue),
    [lengthValue, widthValue]
  );

  const surfacePlateGauge = useMemo(
    () =>
      gaugeMasterList.find((gauge) =>
        gauge.name.trim().toLowerCase().includes("surface plate")
      ),
    [gaugeMasterList]
  );

  useEffect(() => {
    if (gaugeMasterList.length === 0) {
      void fetchGauges();
    }
  }, [fetchGauges, gaugeMasterList.length]);

  useEffect(() => {
    if (!initialData) {
      reset(defaultValues);
      return;
    }

    reset({
      master_gauge_id: initialData.master_gauge_id,
      master_gauge_name: initialData.master_gauge_name ?? "Surface Plate",
      shape: initialData.shape,
      length: String(initialData.length),
      width: String(initialData.width),
      unit: initialData.unit || "µm",
      tolerances: {
        grade_0: String(initialData.tolerances.grade_0),
        grade_1: String(initialData.tolerances.grade_1),
        grade_2: String(initialData.tolerances.grade_2),
        grade_3: String(initialData.tolerances.grade_3),
      },
    });
  }, [initialData, reset]);

  useEffect(() => {
    if (mode !== "create" || !surfacePlateGauge) return;

    setValue("master_gauge_id", surfacePlateGauge.id, { shouldDirty: false, shouldValidate: true });
    setValue("master_gauge_name", surfacePlateGauge.name, { shouldDirty: false, shouldValidate: true });
  }, [mode, setValue, surfacePlateGauge]);

  useEffect(() => {
    setValue("shape", derivedShape, { shouldDirty: false, shouldValidate: true });
  }, [derivedShape, setValue]);

  return (
    <form className="space-y-5" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {submitError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="master_gauge_name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Master Gauge"
              labelPlacement="outside"
              placeholder={gaugeLoading ? "Loading..." : "Surface Plate"}
              isReadOnly
              isDisabled={isSubmitting || gaugeLoading}
              isInvalid={Boolean(errors.master_gauge_name || errors.master_gauge_id)}
              errorMessage={errors.master_gauge_name?.message ?? errors.master_gauge_id?.message}
            />
          )}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Shape</p>
          <Chip size="lg" variant="flat" color="primary" className="capitalize">
            {derivedShape}
          </Chip>
        </div>

        <Controller
          name="length"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              step="any"
              label="Length (mm)"
              labelPlacement="outside"
              placeholder="630"
              isDisabled={isSubmitting}
              isInvalid={Boolean(errors.length)}
              errorMessage={errors.length?.message}
            />
          )}
        />

        <Controller
          name="width"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              step="any"
              label="Width (mm)"
              labelPlacement="outside"
              placeholder="630"
              isDisabled={isSubmitting}
              isInvalid={Boolean(errors.width)}
              errorMessage={errors.width?.message}
            />
          )}
        />

        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              label="Unit"
              labelPlacement="outside"
              placeholder="µm"
              isDisabled={isSubmitting}
              isInvalid={Boolean(errors.unit)}
              errorMessage={errors.unit?.message}
            />
          )}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-4">
          Tolerances
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {(["grade_0", "grade_1", "grade_2", "grade_3"] as const).map((gradeKey, index) => (
            <Controller
              key={gradeKey}
              name={`tolerances.${gradeKey}`}
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  step="any"
                  label={`Grade ${index}`}
                  labelPlacement="outside"
                  placeholder="0"
                  isDisabled={isSubmitting}
                  isInvalid={Boolean(errors.tolerances?.[gradeKey])}
                  errorMessage={errors.tolerances?.[gradeKey]?.message}
                />
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="flat" onPress={onCancel} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button color="primary" type="submit" isLoading={isSubmitting}>
          {mode === "edit" ? "Update Standard" : "Create Standard"}
        </Button>
      </div>
    </form>
  );
}
