import React from "react";
import { Input } from "@heroui/react";
import { Controller, useFormContext } from "react-hook-form";
import type { RepeatabilityForm, RepeatabilityObservations } from "../observationSchemas";
import useObservationAutoSync from "../../../hooks/useObservationAutoSync";

export const RepeatabilitySection: React.FC<{
  disabled?: boolean;
  observations?: RepeatabilityObservations;
}> = ({ disabled, observations }) => {
  const { control, formState: { errors } } = useFormContext<RepeatabilityForm>();
  const { syncToTypeA, hasBothFields } = useObservationAutoSync();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-2">
      <div className="bg-slate-100 text-gray-800 px-3 py-2 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 uppercase">
          Repeatability
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[0, 1, 2, 3, 4].map((idx) => (
                <th
                  key={idx}
                  className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase"
                >
                  Reading {idx + 1}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr className="hover:bg-gray-50">
              {[0, 1, 2, 3, 4].map((idx) => (
                <td key={idx} className="px-2 py-2">
                  <Controller
                    name={`observations.repeatability.${idx}`}
                    control={control}
                    defaultValue={observations?.repeatability?.[idx] ?? ""}
                    rules={{
                      required: `Reading ${idx + 1} is required`,
                      validate: (value) => {
                        if (value === null || value === undefined || value === "") {
                          return `Reading ${idx + 1} is required`;
                        }
                        const num = Number(value);
                        if (isNaN(num)) {
                          return `Reading ${idx + 1} must be a valid number`;
                        }
                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <div>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          value={field.value ?? ""}
                          disabled={disabled}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            field.onChange(newValue);
                            
                            // Auto-sync to type_a_readings if both fields exist
                            if (hasBothFields()) {
                              const currentRepeatability = control._formValues?.observations?.repeatability || [];
                              const updatedRepeatability = [...currentRepeatability];
                              updatedRepeatability[idx] = newValue;
                              syncToTypeA(updatedRepeatability);
                            }
                          }}
                          classNames={{
                            inputWrapper: `h-9 px-2 border-1 ${
                              fieldState.error || errors?.observations?.repeatability?.[idx] 
                                ? "border-red-500" 
                                : "border-gray-300"
                            } bg-white`,
                            input: "text-sm text-center",
                          }}
                          placeholder="0.000"
                        />
                        {(fieldState.error || errors?.observations?.repeatability?.[idx]) && (
                          <p className="text-xs text-red-500 mt-1">
                            {fieldState.error?.message || errors?.observations?.repeatability?.[idx]?.message as string}
                          </p>
                        )}
                      </div>
                    )}
                  />

                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

RepeatabilitySection.displayName = "RepeatabilitySection";
