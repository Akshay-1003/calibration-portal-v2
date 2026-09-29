import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@heroui/react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface VBlockProps {
  unit?: string;
  title?: string;
  readOnly?: boolean;
  initialData?: {
    length?: number | string;
    width?: number | string;
    height?: number | string;
  };
}

export default function VBlockType({ unit, title, readOnly = false, initialData }: VBlockProps) {
  const { register, setValue, watch } = useFormContext();
  const formUnit = watch('unit') || 'mm';
  const displayUnit = unit || formUnit;
  const specs = watch("specifications");

  useEffect(() => {
    if (readOnly) return;
    if (initialData) {
      setValue("specifications", {
        length: initialData.length,
        width: initialData.width,
        height: initialData.height
      }, { shouldValidate: false });
    } else if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
      setValue("specifications", { 
        length: undefined, 
        width: undefined, 
        height: undefined 
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SpecificationReadOnlyField label={`Length (${displayUnit})`} value={data?.length} />
          <SpecificationReadOnlyField label={`Width (${displayUnit})`} value={data?.width} />
          <SpecificationReadOnlyField label={`Height (${displayUnit})`} value={data?.height} />
        </div>
      </div>
    );
  }

  return (
    <>
      {title && <div className="text-sm font-medium text-gray-700">{title}</div>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
          {`Length (${displayUnit})`}
          <Input {...register('specifications.length')} placeholder="0" className="border border-gray-300" />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
          {`Width (${displayUnit})`}
          <Input {...register('specifications.width')} placeholder="0" className="border border-gray-300" />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
          {`Height (${displayUnit})`}
          <Input {...register('specifications.height')} placeholder="0" className="border border-gray-300" />
        </label>
      </div>
    </>
  );
}
