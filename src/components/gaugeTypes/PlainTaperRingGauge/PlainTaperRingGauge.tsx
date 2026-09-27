import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@heroui/react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface PlainTaperRingGaugeProps {
  isSubmitting?: boolean;
  readOnly?: boolean;
  initialData?: {
    taper_angle?: unknown;
  };
}

const PlainTaperRingGauge: React.FC<PlainTaperRingGaugeProps> = ({
  isSubmitting = false,
  readOnly = false,
  initialData,
}) => {
  const { control, watch } = useFormContext();
  const taperAngle = watch("specifications.taper_angle");
  const displayTaperAngle = initialData?.taper_angle ?? taperAngle;

  if (readOnly) {
    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <SpecificationReadOnlyField label="Taper Angle (Included Angle) in degree" value={displayTaperAngle} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Taper Angle Input */}
      <div className="text-sm font-medium text-gray-700 mb-1">
        Taper Angle (Included Angle)
      </div>

      <div className="w-full bg-gray-100 border rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        <Controller
          name="specifications.taper_angle"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              step="0.001"
              placeholder="0"
              label="Taper Angle (Included Angle) in degree"
              labelPlacement="outside"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
              onBlur={field.onBlur}
              disabled={isSubmitting}
              classNames={{
                inputWrapper:
                  "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

export default PlainTaperRingGauge;
