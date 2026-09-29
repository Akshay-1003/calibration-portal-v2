import { Input } from "@heroui/react";

interface SpecificationReadOnlyFieldProps {
  label: string;
  value: unknown;
  className?: string;
  inputClassName?: string;
}

export const formatSpecificationValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  return String(value);
};

export default function SpecificationReadOnlyField({
  label,
  value,
  className,
  inputClassName,
}: SpecificationReadOnlyFieldProps) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <Input
        value={formatSpecificationValue(value)}
        readOnly
        className={`border border-slate-200 bg-slate-50 shadow-sm text-sm font-medium text-slate-700 ${inputClassName ?? ""}`.trim()}
      />
    </div>
  );
}
