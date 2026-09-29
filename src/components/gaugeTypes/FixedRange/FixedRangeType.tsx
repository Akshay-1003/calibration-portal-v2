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
      <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
        {`Range From (${displayUnit})`}
        <Input {...register("specifications.range.min")} placeholder="0" className="border border-gray-300" />
      </label>

      <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
        {`Range To (${displayUnit})`}
        <Input {...register("specifications.range.max")} placeholder="100" className="border border-gray-300" />
      </label>

      {leastCount && (
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
          {`Least Count (${displayUnit})`}
          <Input {...register("specifications.least_count")} placeholder="0.01" className="border border-gray-300" />
        </label>
      )}
    </div>
  );
}
