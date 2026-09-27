// src/components/LimitGuageTable/ToleranceInputs.tsx
import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import type { UseFormSetValue } from "react-hook-form";
import type { Specifications } from "../../../types"; // optional central types

interface ToleranceInputsProps {
  watchedInputs?: NonNullable<Specifications["inputs"]>["inputs"];
  setValue: UseFormSetValue<any>;
  onManualCalculate: () => Promise<void>;
  onUserInteraction?: () => void;
}

const ToleranceInputs: React.FC<ToleranceInputsProps> = ({ watchedInputs, setValue, onManualCalculate, onUserInteraction }) => {
  return (
    <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200 mt-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Basic Size</label>
          <Input
            type="number"
            step="0.0001"
            value={watchedInputs?.basic_size ?? ""}
            onChange={(e) => {
              onUserInteraction?.();
              const v = e.target.value;
              setValue("specifications.inputs.inputs.basic_size" as const, v === "" ? undefined : Number(v));
            }}
            placeholder="Enter basic size"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upper Tolerance</label>
          <Input
            type="number"
            step="0.0001"
            value={watchedInputs?.upper_tolerance ?? ""}
            onChange={(e) => {
              onUserInteraction?.();
              const v = e.target.value;
              setValue("specifications.inputs.inputs.upper_tolerance" as const, v === "" ? undefined : Number(v));
            }}
            placeholder="Enter upper tolerance"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Lower Tolerance</label>
          <Input
            type="number"
            step="0.0001"
            value={watchedInputs?.lower_tolerance ?? ""}
            onChange={(e) => {
              onUserInteraction?.();
              const v = e.target.value;
              setValue("specifications.inputs.inputs.lower_tolerance" as const, v === "" ? undefined : Number(v));
            }}
            placeholder="Enter lower tolerance"
            className="w-full"
          />
        </div>
       <div className="flex items-end">
  <Button
    type="button"
    onClick={onManualCalculate}
    className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
  >
    Calculate
  </Button>
</div>
      </div>
      
    </div>
  );
};

export default ToleranceInputs;
