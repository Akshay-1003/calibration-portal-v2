import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@heroui/react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface FixedRangeProps {
  unit?: string;
  leastCount?: boolean;
  readOnly?: boolean;
  initialData?: {
    range?: { min?: number; max?: number };
    least_count?: number;
  };
}

export default function FixedRange({ unit, leastCount = true, readOnly = false, initialData }: FixedRangeProps) {
  const { register, setValue, watch } = useFormContext();
  // Get unit from form context if not provided as prop (fallback)
  const formUnit = watch('unit') || 'mm';
  const displayUnit = unit || formUnit;

  const specs = watch("specifications");
  
  useEffect(() => {
    if (readOnly) return;
    if (initialData) {
      setValue("specifications", {
        range: initialData.range || { min: undefined, max: undefined },
        least_count: initialData.least_count
      }, { shouldValidate: false });
    } else if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
      setValue("specifications", { 
        range: { min: undefined, max: undefined }, 
        least_count: undefined 
      });
    }
  }, [initialData, readOnly, setValue]);

  if (readOnly) {
    const data = initialData ?? specs;
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className={`grid grid-cols-1 gap-3 ${leastCount ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <SpecificationReadOnlyField label={`Range From (${displayUnit})`} value={data?.range?.min} />
          <SpecificationReadOnlyField label={`Range To (${displayUnit})`} value={data?.range?.max} />
          {leastCount && (
            <SpecificationReadOnlyField label={`Least Count (${displayUnit})`} value={data?.least_count} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Input
        {...register("specifications.range.min")}
        placeholder="0"
        size="sm"
        label={`Range From (${displayUnit})`}
        labelPlacement="outside"
        variant="bordered"
        classNames={{
          label: "text-xs font-semibold text-gray-700 uppercase mb-1",
        }}
      />

      <Input
        {...register("specifications.range.max")}
        placeholder="100"
        size="sm"
        label={`Range To (${displayUnit})`}
        labelPlacement="outside"
        variant="bordered"
        classNames={{
          label: "text-xs font-semibold text-gray-700 uppercase mb-1",
        }}
      />

      {leastCount && (
        <Input
          {...register("specifications.least_count")}
          placeholder="0.01"
          size="sm"
          label={`Least Count (${displayUnit})`}
          labelPlacement="outside"
          variant="bordered"
          classNames={{
            label: "text-xs font-semibold text-gray-700 uppercase mb-1",
          }}
        />
      )}
    </div>
  );
}
