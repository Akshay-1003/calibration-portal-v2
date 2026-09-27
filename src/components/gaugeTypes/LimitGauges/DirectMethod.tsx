// src/components/LimitGuageTable/DirectInputs.tsx
import React, { useState, useEffect } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import type { UseFormSetValue } from "react-hook-form";

interface DirectInputsProps {
  watchedInputs?: { go?: string; no_go?: string };
  setValue: UseFormSetValue<any>;
  loading?: boolean;
  onUserInteraction?: () => void;
}

const isValidDecimalString = (s: string | undefined) => {
  if (s === undefined) return false;
  const trimmed = String(s).trim();
  if (trimmed === "") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed) === false) return false;
  if (trimmed.endsWith(".")) return false;
  return true;
};

const DirectInputs: React.FC<DirectInputsProps> = ({ watchedInputs, setValue, loading, onUserInteraction }) => {
  const [errors, setErrors] = useState<{ go?: string; noGo?: string }>({});

  useEffect(() => {
    const goStr = watchedInputs?.go;
    const noStr = watchedInputs?.no_go;
    const goValid = isValidDecimalString(goStr);
    const noValid = isValidDecimalString(noStr);
    setErrors({
      go: goValid ? undefined : (goStr ? "Enter valid Go basic size" : undefined),
      noGo: noValid ? undefined : (noStr ? "Enter valid No Go basic size" : undefined),
    });
  }, [watchedInputs]);

  return (
    <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200 mt-3">
      <h4 className="text-sm font-medium text-gray-800">Direct Method Parameters</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Go Basic Size</label>
          <Input
            type="text"
            inputMode="decimal"
            value={watchedInputs?.go ?? ""}
            onChange={(e) => {
              onUserInteraction?.();
              setValue("specifications.inputs.inputs.go" as const, e.target.value);
            }}   
            aria-invalid={!!errors.go}
            aria-describedby="go-basic-error"
            placeholder="Enter Go basic size"
            className="w-full"
          />
          {errors.go && <div className="text-xs text-destructive mt-1" id="go-basic-error">{errors.go}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">No Go Basic Size</label>
          <Input
            type="text"
            inputMode="decimal"
            value={watchedInputs?.no_go ?? ""}
            onChange={(e) => {
              onUserInteraction?.();
              setValue("specifications.inputs.inputs.no_go" as const, e.target.value);
            }}
            aria-invalid={!!errors.noGo}
            aria-describedby="no-go-basic-error"
            placeholder="Enter No Go basic size"
            className="w-full"
          />
          {errors.noGo && <div className="text-xs text-destructive mt-1" id="no-go-basic-error">{errors.noGo}</div>}
        </div>
      </div>

      <div className="flex justify-end pt-3">
        {loading && (
          <Button type="button" disabled className="bg-green-600 text-white px-4 py-2">
            Calculating...
          </Button>
        )}
      </div>
    </div>
  );
};

export default DirectInputs;
