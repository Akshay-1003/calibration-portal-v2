import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@heroui/react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface BenchCenterProps {
  readOnly?: boolean;
  initialData?: {
    range?: number | string;
    base_width?: number | string;
  };
}

export default function BenchCenter({ readOnly = false, initialData }: BenchCenterProps) {
  const { register, setValue, watch } = useFormContext();
  // Get unit from form context if not provided as prop (fallback)
  const formUnit = watch('unit') || 'mm';

  const specs = watch("specifications");
  useEffect(() => {
    if (readOnly) return;
    if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
      setValue("specifications", { range: undefined, base_width: undefined });
    }
  }, [readOnly, specs, setValue]);

  if (readOnly) {
    const data = initialData ?? specs;
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SpecificationReadOnlyField label={`Range (${formUnit})`} value={data?.range} />
          <SpecificationReadOnlyField label={`Base Width (${formUnit})`} value={data?.base_width} />
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Title */}
      <div className="text-sm font-medium text-gray-700">
        Specifications
      </div>

      {/* Main Container - Responsive flex layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 lg:gap-10 border rounded-md  px-3 py-3 sm:px-5 sm:py-4">
        {/* Range From */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium shrink-0">Range</label>
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Input
              {...register("specifications.range")}
              placeholder="0"
              aria-label="Range"
              className="w-full sm:w-[140px] border border-gray-300 bg-white shadow-none"
            />
            {formUnit && <span className="text-xs font-medium shrink-0">{formUnit}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label className="text-sm font-medium shrink-0">Base Width</label>
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Input
              {...register("specifications.base_width")}
              placeholder="100"
              aria-label="Base Width"
              className="w-full sm:w-[140px] border border-gray-300 bg-white shadow-none"
            />
            {formUnit && <span className="text-xs font-medium shrink-0">{formUnit}</span>}
          </div>
        </div>
      </div>
    </>
  );
}
