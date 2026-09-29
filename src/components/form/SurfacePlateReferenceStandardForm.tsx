"use client";

import { useEffect, useMemo } from "react";
import { z } from "zod";
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
  } = useForm<
    z.input<typeof surfacePlateReferenceStandardFormSchema>,
    unknown,
    z.output<typeof surfacePlateReferenceStandardFormSchema>
  >({
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
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {submitError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="master_gauge_name"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Master Gauge
              <Input
                {...field}
                className="w-full"
                placeholder={gaugeLoading ? "Loading..." : "Surface Plate"}
                readOnly
                disabled={isSubmitting || gaugeLoading}
                aria-invalid={Boolean(errors.master_gauge_name || errors.master_gauge_id)}
              />
              {errors.master_gauge_name?.message ?? errors.master_gauge_id?.message ? (
                <span className="font-normal text-red-600">{errors.master_gauge_name?.message ?? errors.master_gauge_id?.message}</span>
              ) : null}
            </label>
          )}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Shape</p>
          <Chip size="lg" variant="soft" color="accent" className="capitalize">
            {derivedShape}
          </Chip>
        </div>

        <Controller
          name="length"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Length (mm)
              <Input {...field} className="w-full" value={String(field.value ?? "")} type="number" step="any" placeholder="630" disabled={isSubmitting} aria-invalid={Boolean(errors.length)} />
              {errors.length?.message ? <span className="font-normal text-red-600">{errors.length.message}</span> : null}
            </label>
          )}
        />

        <Controller
          name="width"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Width (mm)
              <Input {...field} className="w-full" value={String(field.value ?? "")} type="number" step="any" placeholder="630" disabled={isSubmitting} aria-invalid={Boolean(errors.width)} />
              {errors.width?.message ? <span className="font-normal text-red-600">{errors.width.message}</span> : null}
            </label>
          )}
        />

        <Controller
          name="unit"
          control={control}
          render={({ field }) => (
            <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
              Unit
              <Input {...field} className="w-full" placeholder="µm" disabled={isSubmitting} aria-invalid={Boolean(errors.unit)} />
              {errors.unit?.message ? <span className="font-normal text-red-600">{errors.unit.message}</span> : null}
            </label>
          )}
        />
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50/60 p-4">
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
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  {`Grade ${index}`}
                  <Input {...field} className="w-full" value={String(field.value ?? "")} type="number" step="any" placeholder="0" disabled={isSubmitting} aria-invalid={Boolean(errors.tolerances?.[gradeKey])} />
                  {errors.tolerances?.[gradeKey]?.message ? <span className="font-normal text-red-600">{errors.tolerances[gradeKey]?.message}</span> : null}
                </label>
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onPress={onCancel} isDisabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isDisabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "edit" ? "Update Standard" : "Create Standard"}
        </Button>
      </div>
    </form>
  );
}
