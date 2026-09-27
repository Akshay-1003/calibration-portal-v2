import { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Input, Select, SelectItem } from "@heroui-v2/react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";
import { getFieldError } from "../../../lib/validations";
import { useSurfacePlateReferenceStandardsListQuery } from "../../../hooks/queries/surfacePlateReferenceStandards";

interface SurfacePlateTypeProps {
  readOnly?: boolean;
  initialData?: Record<string, unknown>;
}

type SurfacePlateReferenceStandardOption = {
  id: string;
  label: string;
  length: number;
  width: number;
};

const surface_materialLabels: Record<string, string> = {
  granite: "Granite",
  cast_iron: "Cast Iron",
  steel: "Steel",
};

const methodLabels: Record<string, string> = {
  division: "Division",
  micron_per_block: "μm / block size",
  micron_per_meter: "μm / meter",
};

const isPlainNumericValue = (value: string): boolean => /^-?\d*\.?\d+$/.test(value);

export default function SurfacePlateType({ readOnly = false, initialData }: SurfacePlateTypeProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const specs = watch("specifications");
  const surface_material = watch("specifications.surface_material");
  const surfacePlateRefId = watch("specifications.surface_plate_ref_id");
  const method = watch("specifications.method");
  const selectedLength = watch("specifications.length");
  const selectedWidth = watch("specifications.width");
  const { data: referenceStandardsData, isLoading: referenceStandardsLoading } =
    useSurfacePlateReferenceStandardsListQuery(
      {
        page: 0,
        limit: 500,
      },
      {
        enabled: true,
      }
    );

  const referenceOptions = useMemo<SurfacePlateReferenceStandardOption[]>(
    () =>
      (referenceStandardsData?.items ?? []).map((item) => ({
        id: item.id,
        label: `${item.length} x ${item.width}`,
        length: item.length,
        width: item.width,
      })),
    [referenceStandardsData?.items]
  );
  const selectedSizeLabel = useMemo(() => {
    const matchedOption = referenceOptions.find((option) => option.id === String(surfacePlateRefId ?? ""));
    if (matchedOption) return matchedOption.label;

    if (selectedLength !== undefined && selectedWidth !== undefined && selectedLength !== "" && selectedWidth !== "") {
      return `${selectedLength} x ${selectedWidth}`;
    }

    const initialLength = initialData?.length;
    const initialWidth = initialData?.width;
    if (initialLength !== undefined && initialWidth !== undefined && initialLength !== "" && initialWidth !== "") {
      return `${initialLength} x ${initialWidth}`;
    }

    return "";
  }, [initialData?.length, initialData?.width, referenceOptions, selectedLength, selectedWidth, surfacePlateRefId]);
  
  useEffect(() => {
    if (readOnly) return;
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
      setValue("specifications", {
        surface_material: "",
        surface_plate_ref_id: "",
        length: "",
        width: "",
        block_size: "",
        method: "",
        lc: "",
      });
    }
  }, [readOnly, specs, setValue]);

  useEffect(() => {
    if (readOnly || referenceOptions.length === 0) return;

    const currentRefId = String(surfacePlateRefId ?? "").trim();
    if (currentRefId) {
      const matchedById = referenceOptions.find((option) => option.id === currentRefId);
      if (matchedById) {
        setValue("specifications.length", String(matchedById.length), { shouldDirty: false, shouldValidate: true });
        setValue("specifications.width", String(matchedById.width), { shouldDirty: false, shouldValidate: true });
      }
      return;
    }

    const length = String(selectedLength ?? initialData?.length ?? "").trim();
    const width = String(selectedWidth ?? initialData?.width ?? "").trim();
    if (!length || !width) return;

    const matchedByDimensions = referenceOptions.find(
      (option) => String(option.length) === length && String(option.width) === width
    );

    if (matchedByDimensions) {
      setValue("specifications.surface_plate_ref_id", matchedByDimensions.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    initialData?.length,
    initialData?.width,
    readOnly,
    referenceOptions,
    selectedLength,
    selectedWidth,
    setValue,
    surfacePlateRefId,
  ]);

  if (readOnly) {
    const data = initialData ?? specs ?? {};
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <SpecificationReadOnlyField
            label="Surface Material"
            value={surface_materialLabels[String(data.surface_material ?? "")] ?? data.surface_material}
          />
          <SpecificationReadOnlyField label="Size" value={selectedSizeLabel} />
          <SpecificationReadOnlyField label="Block Size" value={data.block_size ?? data.block_size} />
          <SpecificationReadOnlyField
            label="Method"
            value={methodLabels[String(data.method ?? "")] ?? data.method}
          />
          <SpecificationReadOnlyField label="LC" value={data.lc} />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Title */}
      <div className="mb-1 text-sm font-medium text-gray-700">
        Specifications
      </div>

      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:px-5 sm:py-4">
        <div className="mb-5 grid grid-cols-1 gap-4 md:max-w-sm">
          <Select
            size="md"
            label="Surface Material"
            labelPlacement="outside"
            placeholder="Select Surface Material"
            selectedKeys={surface_material ? [surface_material] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setValue("specifications.surface_material", value || "");
            }}
            isInvalid={!!getFieldError(errors, "specifications.surface_material")}
            errorMessage={getFieldError(errors, "specifications.surface_material")}
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
              trigger:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          >
            <SelectItem key="granite">
              Granite
            </SelectItem>
            <SelectItem key="cast_iron">
              Cast Iron
            </SelectItem>
            <SelectItem key="steel">
              Steel
            </SelectItem>
            </Select>
        </div>

        <input type="hidden" {...register("specifications.surface_plate_ref_id")} />
        <input type="hidden" {...register("specifications.length")} />
        <input type="hidden" {...register("specifications.width")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            size="md"
            label="Select Size"
            labelPlacement="outside"
            placeholder="Select Size"
            selectedKeys={surfacePlateRefId ? [String(surfacePlateRefId)] : []}
            isLoading={referenceStandardsLoading}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string | undefined;
              const selectedOption = referenceOptions.find((option) => option.id === value);

              setValue("specifications.surface_plate_ref_id", value || "", {
                shouldDirty: true,
                shouldValidate: true,
              });

              if (selectedOption) {
                setValue("specifications.length", String(selectedOption.length), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setValue("specifications.width", String(selectedOption.width), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
              trigger:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          >
            {referenceOptions.map((option) => (
              <SelectItem key={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </Select>

          <Input
            {...register("specifications.block_size", {
              validate: (inputValue: unknown) => {
                const normalizedValue = String(inputValue ?? "").trim();
                if (!normalizedValue) return true;
                return isPlainNumericValue(normalizedValue)
                  ? true
                  : "Block Size must be a plain numeric value.";
              },
            })}
            placeholder="0"
            size="md"
            radius="sm"
            label="Block Size"
            labelPlacement="outside"
            inputMode="decimal"
            isInvalid={!!getFieldError(errors, "specifications.block_size")}
            errorMessage={getFieldError(errors, "specifications.block_size")}
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
              inputWrapper:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          />

          <Select
            size="md"
            label="Method"
            labelPlacement="outside"
            placeholder="Select Method"
            selectedKeys={method ? [method] : []}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setValue("specifications.method", value || "");
            }}
            isInvalid={!!getFieldError(errors, "specifications.method")}
            errorMessage={getFieldError(errors, "specifications.method")}
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
              trigger:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          >
            <SelectItem key="division">
              Division
            </SelectItem>
            <SelectItem key="micron_per_block">
              μm / block size
            </SelectItem>
            <SelectItem key="micron_per_meter">
              μm / meter
            </SelectItem>
          </Select>

          <Input
            {...register("specifications.lc", {
              validate: (inputValue: unknown) => {
                const normalizedValue = String(inputValue ?? "").trim();
                if (!normalizedValue) return true;
                return isPlainNumericValue(normalizedValue)
                  ? true
                  : "LC must be a plain numeric value.";
              },
            })}
            placeholder="0"
            size="md"
            radius="sm"
            label="LC"
            labelPlacement="outside"
            inputMode="decimal"
            isInvalid={!!getFieldError(errors, "specifications.lc")}
            errorMessage={getFieldError(errors, "specifications.lc")}
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
              inputWrapper:
                "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
            }}
            className="w-full"
          />
        </div>
      </div>
    </>
  );
}
