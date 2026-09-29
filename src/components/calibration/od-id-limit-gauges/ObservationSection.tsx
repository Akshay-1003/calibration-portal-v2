import React, { useEffect, useRef } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Input } from "@heroui/react";
import type { LimitGaugeObservations } from "../observationSchemas";
import { calculateMeanFromReadings, generateReadingsFromMean, parseNumber } from "../../../utils/calibrationCalculations";

const PARAM_KEYS = ["go", "no_go"] as const;

export interface ObservationSectionProps {
  type: "A" | "B";
  disabled?: boolean;
  observations: LimitGaugeObservations;
  visibleParameters?: Array<(typeof PARAM_KEYS)[number]>;
  parameterSelection?: Partial<Record<(typeof PARAM_KEYS)[number], boolean>>;
}

export const ObservationSection: React.FC<ObservationSectionProps> = React.memo(
  ({ type, disabled, observations, visibleParameters = [...PARAM_KEYS], parameterSelection }) => {
    const { setValue, control, getValues } = useFormContext();
    const prefix = type.toLowerCase() as "a" | "b";
    
    // Refs for mean logic
    const meanEditingRef = useRef<Record<string, boolean>>({});
    const meanManuallySetRef = useRef<Record<string, boolean>>({});
    const isUpdatingRef = useRef(false);
    const hasHydratedRef = useRef(false);

    const config = {
      A: { headerBg: "bg-yellow-50", headerBorder: "border-yellow-200", avgBg: "bg-yellow-100" },
      B: { headerBg: "bg-blue-50", headerBorder: "border-blue-200", avgBg: "bg-blue-100" },
    }[type];

    // Watch readings
    const goWatch = useWatch({
      control,
      name: `observations.go.${prefix}.values`,
      defaultValue: [],
    });
    const noGoWatch = useWatch({
      control,
      name: `observations.no_go.${prefix}.values`,
      defaultValue: [],
    });

    // Auto-calculate mean from readings - similar to RingGaugeCalibration
    useEffect(() => {
      // Skip if we're already updating to prevent loops
      if (isUpdatingRef.current) {
        isUpdatingRef.current = false;
        return;
      }

      // Process Go readings
      const goReadings = goWatch ?? [];
      const goMeanPath = `observations.go.${prefix}.average`;
      const goManualKey = `go-${prefix}`;
      
      // Check if we have valid readings
      const goValidReadings = goReadings.filter((r: any) => r !== "" && r !== null && r !== undefined);
      const goHasValidReadings = goValidReadings.length > 0 && goValidReadings.every((r: any) => parseNumber(r) !== null);
      
      // Get current mean value
      const goCurrentMeanValue = getValues(goMeanPath as any);
      const goCurrentMean = parseNumber(goCurrentMeanValue);
      
      if (!goHasValidReadings) {
        // Clear mean if no valid readings
        if (goCurrentMeanValue !== "") {
          isUpdatingRef.current = true;
          setValue(goMeanPath as any, "", { shouldDirty: true });
        }
      } else {
        // Calculate mean from readings
        const goCalculatedMean = calculateMeanFromReadings(goReadings);

        if (goCalculatedMean !== null) {
          // Only update if:
          // 1. Current mean is empty/invalid, OR
          // 2. User hasn't manually set this mean, AND
          // 3. Calculated mean is different from current mean
          const goShouldUpdate = 
            goCurrentMean === null || 
            goCurrentMeanValue === "" || 
            (!meanManuallySetRef.current[goManualKey] && Math.abs((goCurrentMean || 0) - goCalculatedMean) > 0.00001);

          if (goShouldUpdate) {
            isUpdatingRef.current = true;
            setValue(goMeanPath as any, goCalculatedMean, { shouldDirty: true });
            // Reset manual flag when auto-calculating
            meanManuallySetRef.current[goManualKey] = false;
          }
        }
      }

      // Process NoGo readings (same logic as Go)
      const noGoReadings = noGoWatch ?? [];
      const noGoMeanPath = `observations.no_go.${prefix}.average`;
      const noGoManualKey = `no_go-${prefix}`;
      
      const noGoValidReadings = noGoReadings.filter((r: any) => r !== "" && r !== null && r !== undefined);
      const noGoHasValidReadings = noGoValidReadings.length > 0 && noGoValidReadings.every((r: any) => parseNumber(r) !== null);
      
      const noGoCurrentMeanValue = getValues(noGoMeanPath as any);
      const noGoCurrentMean = parseNumber(noGoCurrentMeanValue);
      
      if (!noGoHasValidReadings) {
        if (noGoCurrentMeanValue !== "") {
          isUpdatingRef.current = true;
          setValue(noGoMeanPath as any, "", { shouldDirty: true });
        }
      } else {
        const noGoCalculatedMean = calculateMeanFromReadings(noGoReadings);

        if (noGoCalculatedMean !== null) {
          const noGoShouldUpdate = 
            noGoCurrentMean === null || 
            noGoCurrentMeanValue === "" || 
            (!meanManuallySetRef.current[noGoManualKey] && Math.abs((noGoCurrentMean || 0) - noGoCalculatedMean) > 0.00001);

          if (noGoShouldUpdate) {
            isUpdatingRef.current = true;
            setValue(noGoMeanPath as any, noGoCalculatedMean, { shouldDirty: true });
            meanManuallySetRef.current[noGoManualKey] = false;
          }
        }
      }
    }, [goWatch, noGoWatch, prefix, setValue, getValues]);

    useEffect(() => {
      // Load initial values ONCE
      if (observations && !hasHydratedRef.current) {
        PARAM_KEYS.forEach((key) => {
          const section = observations[key]?.[prefix];
          if (!section) return;

          section.values?.forEach((v, i) => {
            setValue(`observations.${key}.${prefix}.values.${i}`, v);
          });

          if (section.average !== undefined) {
            setValue(`observations.${key}.${prefix}.average`, section.average);
          }
        });
        hasHydratedRef.current = true;
      }
    }, [observations, prefix, setValue]);

    // -------------------------------------------------
    // UI Rendering
    // -------------------------------------------------
    return (
      <div className="border rounded-sm overflow-hidden bg-white">
        <div className={`${config.headerBg} ${config.headerBorder} border-b px-4 py-2`}>
          <h3 className="text-sm font-semibold text-gray-800">Observation {type} (All sizes in mm)</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-2 text-left font-medium">Parameter</th>
                <th className="px-1 py-2 text-center font-medium">R1</th>
                <th className="px-1 py-2 text-center font-medium">R2</th>
                <th className="px-1 py-2 text-center font-medium">R3</th>
                <th className={`px-1 py-2 text-center font-semibold ${config.avgBg}`}>
                  Average
                </th>
              </tr>
            </thead>

            <tbody>
              {PARAM_KEYS.filter((param) => visibleParameters.includes(param)).map((param) => {
                const isActive = parameterSelection?.[param] ?? true;
                const rowDisabled = disabled || !isActive;

                return (
                <tr
                  key={param}
                  className={`border-b transition-opacity ${isActive ? "hover:bg-gray-50" : "opacity-45"}`}
                >
                  <td className="px-2 py-2 font-medium">
                    {param === "go" ? "GO" : "NO GO"}
                  </td>

                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-1 py-2">
                      <Controller
                        control={control}
                        name={`observations.${param}.${prefix}.values.${i}` as any}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.001"
                            disabled={rowDisabled}
                            value={field.value?.toString() ?? ""}
                            onChange={(e) => {
                              field.onChange(e);
                              // When user manually changes a reading, clear the manual mean flag
                              // so the mean can be auto-calculated again
                              meanManuallySetRef.current[`${param}-${prefix}`] = false;
                            }}
                            className="h-9 rounded-sm border border-gray-300 bg-white text-center text-sm"
                            placeholder="0.000"
                          />
                        )}
                      />
                    </td>
                  ))}

                  <td className={`px-1 py-2 text-center font-bold ${config.avgBg}`}>
                    <Controller
                      control={control}
                      name={`observations.${param}.${prefix}.average` as any}
                        render={({ field }) => (
                          <Input
                            type="text"
                            inputMode="decimal"
                            disabled={rowDisabled}
                            value={field.value?.toString() ?? ""}
                          className="h-9 rounded-sm border border-gray-300 bg-gray-100 text-center text-sm font-semibold"
                          placeholder="0.000"
                          onFocus={() => {
                            meanEditingRef.current[`${param}-${prefix}`] = true;
                          }}
                          onChange={(e) => {
                            field.onChange(e);
                            
                            if (rowDisabled) return;

                            const meanValue = parseNumber(e.target.value);
                            
                            // If mean is cleared, clear all readings and reset manual flag
                            if (meanValue === null) {
                              setValue(`observations.${param}.${prefix}.values.0` as any, "", { shouldDirty: true });
                              setValue(`observations.${param}.${prefix}.values.1` as any, "", { shouldDirty: true });
                              setValue(`observations.${param}.${prefix}.values.2` as any, "", { shouldDirty: true });
                              meanManuallySetRef.current[`${param}-${prefix}`] = false;
                              return;
                            }

                            // Mark that user manually set this mean
                            meanManuallySetRef.current[`${param}-${prefix}`] = true;

                            // Always generate readings when mean has a value
                            const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                              deltas: [0.001, 0.002],
                            });

                            // Update readings with generated values
                            setValue(`observations.${param}.${prefix}.values.0` as any, r1, { shouldDirty: true });
                            setValue(`observations.${param}.${prefix}.values.1` as any, r2, { shouldDirty: true });
                            setValue(`observations.${param}.${prefix}.values.2` as any, r3, { shouldDirty: true });
                          }}
                          onBlur={() => {
                            meanEditingRef.current[`${param}-${prefix}`] = false;
                            field.onBlur();
                          }}
                        />
                      )}
                    />
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

ObservationSection.displayName = "ObservationSection";
