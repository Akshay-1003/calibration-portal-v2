import React from 'react';
import { Input } from "@heroui/react";
import { Controller, useFormContext } from 'react-hook-form';
import type { TypeAObservations } from "../observationSchemas";
import useObservationAutoSync from "../../../hooks/useObservationAutoSync";

type TypeAReadingFormValues = {
  observations: {
    type_a_readings?: Array<number | string | null>;
    repeatability?: Array<number | string | null>;
  };
};

/**
 * 
 * @param calibrationValues - Current calibration readings
 * @param onValueChange - Handler for value changes
 */
export const TypeAReadingSection: React.FC<{
  disabled?: boolean;
  observations: TypeAObservations;
  note?: boolean;
}> = ({ disabled, observations, note = true }) => {
  const { setValue, control, formState: { errors }, getValues } = useFormContext<TypeAReadingFormValues>();
  const previousValuesRef = React.useRef<string | null>(null);
  const { syncToRepeatability, hasBothFields } = useObservationAutoSync();
  
  React.useEffect(() => {
    const typeAReadings = observations?.type_a_readings;
    
    // Create a stable string key for comparison
    const currentKey = typeAReadings 
      ? JSON.stringify(typeAReadings.filter((v): v is string | number => v !== null && v !== undefined))
      : null;
    
    // Skip if values haven't actually changed
    if (previousValuesRef.current === currentKey) {
      return;
    }
    
    // Only set values if they exist and are different from current form values
    if (typeAReadings && Array.isArray(typeAReadings) && typeAReadings.length > 0) {
      let hasChanges = false;
      
      typeAReadings.forEach((value, index) => {
        if (value !== undefined && value !== null) {
          const currentFormValue = getValues(`observations.type_a_readings.${index}`);
          // Only update if the value is different
          if (currentFormValue !== value) {
            setValue(`observations.type_a_readings.${index}`, value, { shouldDirty: false });
            hasChanges = true;
          }
        }
      });
      
      // Update ref only if we made changes
      if (hasChanges) {
        previousValuesRef.current = currentKey;
      }
    } else {
      previousValuesRef.current = currentKey;
    }
  }, [observations?.type_a_readings, setValue, getValues]);

  return (
    <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
      <div className="bg-slate-100 text-gray-800 px-3 py-2 border-b border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 uppercase">Type A Reading</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {[0, 1, 2, 3, 4].map((idx) => (
                <th key={idx} className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">
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
                    name={`observations.type_a_readings.${idx}`}
                    control={control}
                    defaultValue={observations?.type_a_readings?.[idx] ?? ""}
                    rules={{
                      required: `Type A Reading ${idx + 1} is required`,
                      validate: (value) => {
                        // Check if repeatability can be used instead
                        const repeatability = control._formValues?.observations?.repeatability;
                        if (repeatability && repeatability[idx] !== null && repeatability[idx] !== undefined && repeatability[idx] !== "") {
                          // If repeatability exists for this index, it's valid
                          return true;
                        }
                        
                        // Otherwise, Type A reading must be provided
                        if (value === null || value === undefined || value === "") {
                          return `Type A Reading ${idx + 1} is required`;
                        }
                        const num = Number(value);
                        if (isNaN(num)) {
                          return `Type A Reading ${idx + 1} must be a valid number`;
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
                          disabled={disabled}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            field.onChange(newValue);
                            
                            // Auto-sync to repeatability if both fields exist
                            if (hasBothFields()) {
                              const currentTypeAReadings = control._formValues?.observations?.type_a_readings || [];
                              const updatedTypeAReadings = [...currentTypeAReadings];
                              updatedTypeAReadings[idx] = newValue ? parseFloat(newValue) : null;
                              syncToRepeatability(updatedTypeAReadings);
                            }
                          }}
                          classNames={{
                            inputWrapper: `h-9 px-2 border-1 rounded-md ${
                              fieldState.error || errors?.observations?.type_a_readings?.[idx] 
                                ? "border-red-500" 
                                : "border-gray-300"
                            } bg-white`,
                            input: "text-sm text-center",
                          }}
                          placeholder="0.000"
                        />
                        {(fieldState.error || errors?.observations?.type_a_readings?.[idx]) && (
                          <p className="text-xs text-red-500 mt-1">
                            {fieldState.error?.message || errors?.observations?.type_a_readings?.[idx]?.message as string}
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
        {note && (
          <p className="text-xs text-gray-600 px-3 py-2 text-center italic bg-gray-50">
            Standard deviation readings at (No Go – B)
          </p>
        )}
      </div>
    </div>
  );
};

TypeAReadingSection.displayName = 'TypeAReadingSection';
