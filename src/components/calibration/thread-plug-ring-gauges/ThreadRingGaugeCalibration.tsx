import React, { useEffect, useMemo, useRef } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import { Input as CustomInput } from "../../ui/input";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { calculateMeanFromReadings, generateReadingsFromMean, parseNumber } from "../../../utils/calibrationCalculations";
import {
  calculateThreadGaugeObservationSize,
  
} from '../common/threadGaugeCalculations';
import { Input, Checkbox } from "@heroui/react";

import {
  decideCalibrationRemark,
  type CalibrationSpecLimits,
} from '../common/calibrationRemarkValidator';
import { GO_NO_GO_TABLE_KEYS, type GoNoGoTableKey, type ThreadPlugRingObservations } from "../observationSchemas";

type LimitSpec = {
  basic_size?: number | string;
  specification_limit_max?: number | string;
  specification_limit_min?: number | string;
  wear_limit?: number | string;
};

type Specifications = {
  go?: LimitSpec;
  no_go?: LimitSpec;
  standard_specification?: string;
  standard_specification_id?: string;
  specification_table?: {
    go?: {
      max_wear_limit?: number;
      min_wear_limit?: number;
      wear_limit?: number;
    };
    no_go?: {
      max_wear_limit?: number;
      min_wear_limit?: number;
      wear_limit?: number;
    };
  };
};

export interface ThreadPlugRingGaugeCalibrationProps {
  observations: ThreadPlugRingObservations;
  specifications: Specifications;
  isReadOnly?: boolean;
  uncertainty?: string | number; // Measurement uncertainty (e.g., "± 2.2 µm" or number in mm)
  showParameters?: boolean;
  manualObservedSizes?: boolean;
}

export const PlainThreadPlugRingGaugeCalibration: React.FC<ThreadPlugRingGaugeCalibrationProps> = ({
  observations,
  specifications,
  isReadOnly = false,
  uncertainty,
  showParameters = true,
  manualObservedSizes = false,
}) => {
  const { register, setValue, control, unregister } = useFormContext();
  const meanEditingRef = useRef<Record<string, boolean>>({});
  const tablesToPrintField = useWatch({ control, name: "observations.tables_to_print" });
  const tablesToPrint = useMemo(() => {
    if (!Array.isArray(tablesToPrintField)) return [...GO_NO_GO_TABLE_KEYS];
    return tablesToPrintField.filter((value): value is GoNoGoTableKey =>
      GO_NO_GO_TABLE_KEYS.includes(value as GoNoGoTableKey)
    );
  }, [tablesToPrintField]);
  const showGo = tablesToPrint.includes("go");
  const showNoGo = tablesToPrint.includes("nogo");

  const observationsSpecificationTable = useMemo(
    () => ({
      go: {
        max_wear_limit: specifications?.specification_table?.go?.max_wear_limit ?? "",
        min_wear_limit: specifications?.specification_table?.go?.min_wear_limit ?? "",
        wear_limit: specifications?.specification_table?.go?.wear_limit ?? "",
      },
      no_go: {
        max_wear_limit: specifications?.specification_table?.no_go?.max_wear_limit ?? "",
        min_wear_limit: specifications?.specification_table?.no_go?.min_wear_limit ?? "",
        wear_limit: specifications?.specification_table?.no_go?.wear_limit ?? "",
      },
    }),
    [
      specifications?.specification_table?.go?.max_wear_limit,
      specifications?.specification_table?.go?.min_wear_limit,
      specifications?.specification_table?.go?.wear_limit,
      specifications?.specification_table?.no_go?.max_wear_limit,
      specifications?.specification_table?.no_go?.min_wear_limit,
      specifications?.specification_table?.no_go?.wear_limit,
    ]
  );

  // Initialize form with observations and specifications data
  useEffect(() => {
    // Set observation parameters
    if (observations?.parameters) {
      setValue("observations.parameters.wire_dia", observations.parameters.wire_dia ?? "");
      setValue("observations.parameters.constant", observations.parameters.constant ?? "");
      setValue("observations.parameters.pitch", observations.parameters.pitch ?? "");
      setValue("observations.parameters.pitch_calculator", observations.parameters.pitch_calculator ?? "");
    }

    // Set GO readings and means
    if (observations?.go) {
      setValue("observations.go.a.values", observations.go.a?.values ?? [null, null, null]);
      setValue("observations.go.a.mean", observations.go.a?.mean ?? "");
      setValue("observations.go.b.values", observations.go.b?.values ?? [null, null, null]);
      setValue("observations.go.b.mean", observations.go.b?.mean ?? "");
    }

    // Set NO-GO readings and means
    if (observations?.no_go) {
      setValue("observations.no_go.a.values", observations.no_go.a?.values ?? [null, null, null]);
      setValue("observations.no_go.a.mean", observations.no_go.a?.mean ?? "");
      setValue("observations.no_go.b.values", observations.no_go.b?.values ?? [null, null, null]);
      setValue("observations.no_go.b.mean", observations.no_go.b?.mean ?? "");
    }

    // Build observations.specification_table from specifications props (copied, never mutating props)
    setValue(
      "observations.specification_table.go.max_wear_limit",
      observationsSpecificationTable.go.max_wear_limit
    );
    setValue(
      "observations.specification_table.go.min_wear_limit",
      observationsSpecificationTable.go.min_wear_limit
    );
    setValue("observations.specification_table.go.wear_limit", observationsSpecificationTable.go.wear_limit);
    setValue(
      "observations.specification_table.no_go.max_wear_limit",
      observationsSpecificationTable.no_go.max_wear_limit
    );
    setValue(
      "observations.specification_table.no_go.min_wear_limit",
      observationsSpecificationTable.no_go.min_wear_limit
    );
    setValue("observations.specification_table.no_go.wear_limit", observationsSpecificationTable.no_go.wear_limit);

    // Preserve any existing observed sizes from saved payloads (new and legacy)
    setValue(
      "observations.specification_table.go.observed_size_a",
      observations?.specification_table?.go?.observed_size_a ?? observations?.go?.observed_size_a ?? ""
    );
    setValue(
      "observations.specification_table.go.observed_size_b",
      observations?.specification_table?.go?.observed_size_b ?? observations?.go?.observed_size_b ?? ""
    );
    setValue(
      "observations.specification_table.no_go.observed_size_a",
      observations?.specification_table?.no_go?.observed_size_a ?? observations?.no_go?.observed_size_a ?? ""
    );
    setValue(
      "observations.specification_table.no_go.observed_size_b",
      observations?.specification_table?.no_go?.observed_size_b ?? observations?.no_go?.observed_size_b ?? ""
    );
    setValue(
      "observations.tables_to_print",
      observations?.tables_to_print?.length ? observations.tables_to_print : [...GO_NO_GO_TABLE_KEYS],
      { shouldDirty: false, shouldValidate: false }
    );

    // Ensure observations payload does not include standard_specification.
    unregister("observations.standard_specification");
    unregister("observations.specification_table.go.specification_limit_max");
    unregister("observations.specification_table.go.specification_limit_min");
    unregister("observations.specification_table.no_go.specification_limit_max");
    unregister("observations.specification_table.no_go.specification_limit_min");
  }, [observations, observationsSpecificationTable, setValue, unregister]);

  const toggleTableToPrint = (key: GoNoGoTableKey, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...tablesToPrint, key]))
      : tablesToPrint.filter((entry) => entry !== key);
    setValue("observations.tables_to_print", next, { shouldDirty: true, shouldValidate: false });
  };

  // Watch parameters
  const wireDia = useWatch({ control, name: "observations.parameters.wire_dia" });
  const constant = useWatch({ control, name: "observations.parameters.constant" });
  const pitch = useWatch({ control, name: "observations.parameters.pitch" });

  // Watch Go readings
  const goAValues = useWatch({
    control,
    name: "observations.go.a.values",
    defaultValue: [],
  });
  const goBValues = useWatch({
    control,
    name: "observations.go.b.values",
    defaultValue: [],
  });
  const goAMeanField = useWatch({ control, name: "observations.go.a.mean" });
  const goBMeanField = useWatch({ control, name: "observations.go.b.mean" });

  // Watch NoGo readings
  const noGoAValues = useWatch({
    control,
    name: "observations.no_go.a.values",
    defaultValue: [],
  });
  const noGoBValues = useWatch({
    control,
    name: "observations.no_go.b.values",
    defaultValue: [],
  });
  const noGoAMeanField = useWatch({ control, name: "observations.no_go.a.mean" });
  const noGoBMeanField = useWatch({ control, name: "observations.no_go.b.mean" });
  const goObservedSizeAField = useWatch({
    control,
    name: "observations.specification_table.go.observed_size_a",
  });
  const goObservedSizeBField = useWatch({
    control,
    name: "observations.specification_table.go.observed_size_b",
  });
  const noGoObservedSizeAField = useWatch({
    control,
    name: "observations.specification_table.no_go.observed_size_a",
  });
  const noGoObservedSizeBField = useWatch({
    control,
    name: "observations.specification_table.no_go.observed_size_b",
  });

  const resolveMean = (meanValue: unknown, readings: Array<number | string | null | undefined>) => {
    const parsedMean = parseNumber(meanValue);
    if (parsedMean !== null) return parsedMean;
    return calculateMeanFromReadings(readings, 3);
  };

  const goAMean = useMemo(() => resolveMean(goAMeanField, goAValues), [goAMeanField, goAValues]);
  const goBMean = useMemo(() => resolveMean(goBMeanField, goBValues), [goBMeanField, goBValues]);
  const noGoAMean = useMemo(() => resolveMean(noGoAMeanField, noGoAValues), [noGoAMeanField, noGoAValues]);
  const noGoBMean = useMemo(() => resolveMean(noGoBMeanField, noGoBValues), [noGoBMeanField, noGoBValues]);

  // Calculate observed sizes
  const goObservedSizeACalc = useMemo(() => {
    const result = calculateThreadGaugeObservationSize({
      mean: goAMean,
      wireDia,
      constant,
      pitch,
    });
    return result.isValid ? result.calculatedValue : null;
  }, [goAMean, wireDia, constant, pitch]);

  const goObservedSizeBCalc = useMemo(() => {
    const result = calculateThreadGaugeObservationSize({
      mean: goBMean,
      wireDia,
      constant,
      pitch,
    });
    return result.isValid ? result.calculatedValue : null;
  }, [goBMean, wireDia, constant, pitch]);

  const noGoObservedSizeACalc = useMemo(() => {
    const result = calculateThreadGaugeObservationSize({
      mean: noGoAMean,
      wireDia,
      constant,
      pitch,
    });
    return result.isValid ? result.calculatedValue : null;
  }, [noGoAMean, wireDia, constant, pitch]);

  const noGoObservedSizeBCalc = useMemo(() => {
    const result = calculateThreadGaugeObservationSize({
      mean: noGoBMean,
      wireDia,
      constant,
      pitch,
    });
    return result.isValid ? result.calculatedValue : null;
  }, [noGoBMean, wireDia, constant, pitch]);

  const goObservedSizeA = useMemo(
    () => (manualObservedSizes ? parseNumber(goObservedSizeAField) : goObservedSizeACalc),
    [goObservedSizeACalc, goObservedSizeAField, manualObservedSizes]
  );
  const goObservedSizeB = useMemo(
    () => (manualObservedSizes ? parseNumber(goObservedSizeBField) : goObservedSizeBCalc),
    [goObservedSizeBCalc, goObservedSizeBField, manualObservedSizes]
  );
  const noGoObservedSizeA = useMemo(
    () => (manualObservedSizes ? parseNumber(noGoObservedSizeAField) : noGoObservedSizeACalc),
    [manualObservedSizes, noGoObservedSizeACalc, noGoObservedSizeAField]
  );
  const noGoObservedSizeB = useMemo(
    () => (manualObservedSizes ? parseNumber(noGoObservedSizeBField) : noGoObservedSizeBCalc),
    [manualObservedSizes, noGoObservedSizeBCalc, noGoObservedSizeBField]
  );

  // Keep payload observed sizes in sync once calculable.
  useEffect(() => {
    if (manualObservedSizes) {
      const nextGoObservedSizeA = goAMean ?? "";
      const nextGoObservedSizeB = goBMean ?? "";
      const nextNoGoObservedSizeA = noGoAMean ?? "";
      const nextNoGoObservedSizeB = noGoBMean ?? "";

      setValue("observations.specification_table.go.observed_size_a", nextGoObservedSizeA, { shouldDirty: true });
      setValue("observations.specification_table.go.observed_size_b", nextGoObservedSizeB, { shouldDirty: true });
      setValue("observations.specification_table.no_go.observed_size_a", nextNoGoObservedSizeA, { shouldDirty: true });
      setValue("observations.specification_table.no_go.observed_size_b", nextNoGoObservedSizeB, { shouldDirty: true });

      setValue("observations.go.observed_size_a", nextGoObservedSizeA, { shouldDirty: true });
      setValue("observations.go.observed_size_b", nextGoObservedSizeB, { shouldDirty: true });
      setValue("observations.no_go.observed_size_a", nextNoGoObservedSizeA, { shouldDirty: true });
      setValue("observations.no_go.observed_size_b", nextNoGoObservedSizeB, { shouldDirty: true });
      return;
    }

    if (goObservedSizeACalc !== null) {
      setValue("observations.specification_table.go.observed_size_a", goObservedSizeACalc, { shouldDirty: true });
      setValue("observations.go.observed_size_a", goObservedSizeACalc, { shouldDirty: true });
    }
    if (goObservedSizeBCalc !== null) {
      setValue("observations.specification_table.go.observed_size_b", goObservedSizeBCalc, { shouldDirty: true });
      setValue("observations.go.observed_size_b", goObservedSizeBCalc, { shouldDirty: true });
    }
    if (noGoObservedSizeACalc !== null) {
      setValue("observations.specification_table.no_go.observed_size_a", noGoObservedSizeACalc, { shouldDirty: true });
      setValue("observations.no_go.observed_size_a", noGoObservedSizeACalc, { shouldDirty: true });
    }
    if (noGoObservedSizeBCalc !== null) {
      setValue("observations.specification_table.no_go.observed_size_b", noGoObservedSizeBCalc, { shouldDirty: true });
      setValue("observations.no_go.observed_size_b", noGoObservedSizeBCalc, { shouldDirty: true });
    }
  }, [
    goObservedSizeACalc,
    goAMean,
    goObservedSizeBCalc,
    goBMean,
    manualObservedSizes,
    noGoObservedSizeACalc,
    noGoAMean,
    noGoObservedSizeBCalc,
    noGoBMean,
    setValue,
  ]);

  // Validate against specifications and generate remarks using uncertainty bands
  const goRemarkAResult = useMemo(() => {
    if (goObservedSizeA === null) return null;
    
    const goSpec: CalibrationSpecLimits = {
      max_limit: parseNumber(specifications?.specification_table?.go?.max_wear_limit) ?? undefined,
      wear_limit: parseNumber(specifications?.specification_table?.go?.wear_limit) ?? undefined,
    };
    
    return decideCalibrationRemark(goObservedSizeA, goSpec, 'GO', uncertainty);
  }, [goObservedSizeA, specifications?.specification_table?.go, uncertainty]);

  const goRemarkBResult = useMemo(() => {
    if (goObservedSizeB === null) return null;
    
    const goSpec: CalibrationSpecLimits = {
      max_limit: parseNumber(specifications?.specification_table?.go?.max_wear_limit) ?? undefined,
      wear_limit: parseNumber(specifications?.specification_table?.go?.wear_limit) ?? undefined,
    };
    
    return decideCalibrationRemark(goObservedSizeB, goSpec, 'GO', uncertainty);
  }, [goObservedSizeB, specifications?.specification_table?.go, uncertainty]);

  const noGoRemarkAResult = useMemo(() => {
    if (noGoObservedSizeA === null) return null;
    
    const noGoSpec: CalibrationSpecLimits = {
      max_limit: parseNumber(specifications?.specification_table?.no_go?.max_wear_limit) ?? undefined,
      min_limit: parseNumber(specifications?.specification_table?.no_go?.min_wear_limit) ?? undefined,
      wear_limit: parseNumber(specifications?.specification_table?.no_go?.wear_limit) ?? undefined,
    };
    
    return decideCalibrationRemark(noGoObservedSizeA, noGoSpec, 'NO_GO', uncertainty);
  }, [noGoObservedSizeA, specifications?.specification_table?.no_go, uncertainty]);

  const noGoRemarkBResult = useMemo(() => {
    if (noGoObservedSizeB === null) return null;
    
    const noGoSpec: CalibrationSpecLimits = {
      max_limit: parseNumber(specifications?.specification_table?.no_go?.max_wear_limit) ?? undefined,
      min_limit: parseNumber(specifications?.specification_table?.no_go?.min_wear_limit) ?? undefined,
      wear_limit: parseNumber(specifications?.specification_table?.no_go?.wear_limit) ?? undefined,
    };
    
    return decideCalibrationRemark(noGoObservedSizeB, noGoSpec, 'NO_GO', uncertainty);
  }, [noGoObservedSizeB, specifications?.specification_table?.no_go, uncertainty]);

  // Extract remark strings for compatibility
  const goRemarkA = goRemarkAResult?.remark ?? '';
  const goRemarkB = goRemarkBResult?.remark ?? '';
  const noGoRemarkA = noGoRemarkAResult?.remark ?? '';
  const noGoRemarkB = noGoRemarkBResult?.remark ?? '';

  // Combined remark for Go (combines A and B)
  const goRemark = useMemo(() => {
    if (!goRemarkA && !goRemarkB) return '';
    if (goRemarkA === goRemarkB) return goRemarkA || '';
    return `A: ${goRemarkA || 'N/A'}, B: ${goRemarkB || 'N/A'}`;
  }, [goRemarkA, goRemarkB]);

  // Combined remark for NoGo (combines A and B)
  const noGoRemark = useMemo(() => {
    if (!noGoRemarkA && !noGoRemarkB) return '';
    if (noGoRemarkA === noGoRemarkB) return noGoRemarkA || '';
    return `A: ${noGoRemarkA || 'N/A'}, B: ${noGoRemarkB || 'N/A'}`;
  }, [noGoRemarkA, noGoRemarkB]);

  const normalizeOverallRemarkStatus = (remarks: string[]) => {
    const normalizedRemarks = remarks
      .map((remark) => remark.trim())
      .filter(Boolean);

    if (normalizedRemarks.length === 0) {
      return "";
    }

    if (normalizedRemarks.some((remark) => remark === "Out of Specification Limit")) {
      return "out_of_specification_limit";
    }

    if (normalizedRemarks.some((remark) => remark === "Within Wear Limit")) {
      return "within_wear_limit";
    }

    if (normalizedRemarks.some((remark) => remark === "Within Specification Limit")) {
      return "within_specification_limit";
    }

    return "specification_missing";
  };

  const goOverallStatus = useMemo(
    () => normalizeOverallRemarkStatus([goRemarkA, goRemarkB]),
    [goRemarkA, goRemarkB]
  );

  const noGoOverallStatus = useMemo(
    () => normalizeOverallRemarkStatus([noGoRemarkA, noGoRemarkB]),
    [noGoRemarkA, noGoRemarkB]
  );

  useEffect(() => {
    setValue("observations.remarks.go", goOverallStatus, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("observations.remarks.no_go", noGoOverallStatus, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("observations.go.remark", goOverallStatus, {
      shouldDirty: true,
      shouldValidate: false,
    });
    setValue("observations.no_go.remark", noGoOverallStatus, {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [goOverallStatus, noGoOverallStatus, setValue]);

  return (
    <div className="space-y-2 p-2">
      {showParameters ? (
      <div className="bg-white border rounded-md overflow-hidden">
        <div className="bg-slate-100 text-gray-800 border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900 tracking-wide">
            Parameters
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wire Dia. (d)
              </label>
              <Controller
                name="observations.parameters.wire_dia"
                control={control}
                rules={{
                  validate: (value) => {
                    if (value === null || value === undefined || value === '') {
                      return true; // Don't show error for empty field initially
                    }
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                      return 'Wire Diameter (d) must be a positive number';
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => {
                  const showError = fieldState.isTouched && fieldState.error;
                  return (
                    <div>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        onBlur={field.onBlur}
                        disabled={isReadOnly}
                        isInvalid={!!showError}
                        errorMessage={showError ? fieldState.error?.message : undefined}
                        classNames={{
                          inputWrapper: `bg-white border ${showError ? 'border-red-500' : 'border-gray-300 hover:border-gray-400 focus:border-primary'
                            } shadow-none`,
                        }}
                      />
                    </div>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Constant (c)
              </label>
              <Controller
                name="observations.parameters.constant"
                control={control}
                rules={{
                  validate: (value) => {
                    if (value === null || value === undefined || value === '') {
                      return true; // Don't show error for empty field initially
                    }
                    const num = Number(value);
                    if (isNaN(num)) {
                      return 'Constant (c) must be a valid number';
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => {
                  const showError = fieldState.isTouched && fieldState.error;
                  return (
                    <div>
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="0.866025"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        onBlur={field.onBlur}
                        disabled={isReadOnly}
                        isInvalid={!!showError}
                        errorMessage={showError ? fieldState.error?.message : undefined}
                        classNames={{
                          inputWrapper: `bg-white border ${showError ? 'border-red-500' : 'border-gray-300 hover:border-gray-400 focus:border-primary'
                            } shadow-none`,
                        }}
                      />
                    </div>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pitch (P)
              </label>
              <Controller
                name="observations.parameters.pitch"
                control={control}
                rules={{
                  validate: (value) => {
                    if (value === null || value === undefined || value === '') {
                      return true; // Don't show error for empty field initially
                    }
                    const num = Number(value);
                    if (isNaN(num) || num <= 0) {
                      return 'Pitch (P) must be a positive number';
                    }
                    return true;
                  },
                }}
                render={({ field, fieldState }) => {
                  const showError = fieldState.isTouched && fieldState.error;
                  return (
                    <div>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        onBlur={field.onBlur}
                        disabled={isReadOnly}
                        isInvalid={!!showError}
                        errorMessage={showError ? fieldState.error?.message : undefined}
                        classNames={{
                          inputWrapper: `bg-white border ${showError ? 'border-red-500' : 'border-gray-300 hover:border-gray-400 focus:border-primary'
                            } shadow-none`,
                        }}
                      />
                    </div>
                  );
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pitch Calculator (P1)
              </label>
              <Controller
                name="observations.parameters.pitch_calculator"
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    onBlur={field.onBlur}
                    disabled={isReadOnly}
                    classNames={{
                      inputWrapper: "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                    }}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {/* Observation A and B Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Observation A */}
        <div className="border rounded-md overflow-hidden bg-white">
          <div className="bg-yellow-50 border-yellow-200 border-b px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-800">Observation A</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-2 text-left font-medium w-24">Parameter</th>
                  <th className="px-2 py-2 text-center font-medium">R1</th>
                  <th className="px-2 py-2 text-center font-medium">R2</th>
                  <th className="px-2 py-2 text-center font-medium">R3</th>
                  <th className="px-2 py-2 text-center font-semibold bg-yellow-100">
                    Mean
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Go Row */}
                <tr className={`border-b transition-opacity ${showGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-2 py-2 font-medium">GO</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-2 py-1">
                      <CustomInput
                        type="number"
                        step="0.001"
                        disabled={isReadOnly || !showGo}
                        {...register(`observations.go.a.values.${i}`, {
                          valueAsNumber: true,
                        })}
                        className="text-center h-9"
                        placeholder="0.000"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-yellow-100">
                    <Controller
                      name="observations.go.a.mean"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          inputMode="decimal"
                          isDisabled={isReadOnly}
                          value={field.value ?? ""}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                            input: "text-sm text-center font-semibold",
                          }}
                          placeholder="0.000"
                          onFocus={() => {
                            meanEditingRef.current.goA = true;
                          }}
                          onBlur={(e) => {
                            meanEditingRef.current.goA = false;
                            field.onBlur();

                            if (isReadOnly || !showGo) return;

                            const hasAnyReading = (goAValues ?? []).some(
                              (value: string | number) => parseNumber(value) !== null
                            );
                            if (hasAnyReading) return;

                            const meanValue = parseNumber(e.target.value);
                            if (meanValue === null) return;

                            const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                              decimals: 3,
                              deltas: [0.001, 0.002],
                            });

                            setValue("observations.go.a.values.0", parseFloat(r1), { shouldDirty: true });
                            setValue("observations.go.a.values.1", parseFloat(r2), { shouldDirty: true });
                            setValue("observations.go.a.values.2", parseFloat(r3), { shouldDirty: true });
                          }}
                          onChange={(e) => field.onChange(e)}
                        />
                      )}
                    />
                  </td>
                </tr>
                {/* NoGo Row */}
                <tr className={`transition-opacity ${showNoGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-2 py-2 font-medium">NO GO</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-2 py-1">
                      <CustomInput
                        type="number"
                        step="0.001"
                        disabled={isReadOnly || !showNoGo}
                        {...register(`observations.no_go.a.values.${i}`, {
                          valueAsNumber: true,
                        })}
                        className="text-center h-9"
                        placeholder="0.000"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-yellow-100">
                    <Controller
                      name="observations.no_go.a.mean"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          inputMode="decimal"
                          isDisabled={isReadOnly}
                          value={field.value ?? ""}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                            input: "text-sm text-center font-semibold",
                          }}
                          placeholder="0.000"
                          onFocus={() => {
                            meanEditingRef.current.noGoA = true;
                          }}
                          onBlur={(e) => {
                            meanEditingRef.current.noGoA = false;
                            field.onBlur();

                            if (isReadOnly || !showNoGo) return;

                            const hasAnyReading = (noGoAValues ?? []).some(
                              (value: string | number) => parseNumber(value) !== null
                            );
                            if (hasAnyReading) return;

                            const meanValue = parseNumber(e.target.value);
                            if (meanValue === null) return;

                            const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                              decimals: 3,
                              deltas: [0.001, 0.002],
                            });

                            setValue("observations.no_go.a.values.0", parseFloat(r1), { shouldDirty: true });
                            setValue("observations.no_go.a.values.1", parseFloat(r2), { shouldDirty: true });
                            setValue("observations.no_go.a.values.2", parseFloat(r3), { shouldDirty: true });
                          }}
                          onChange={(e) => field.onChange(e)}
                        />
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Observation B */}
        <div className="border rounded-md overflow-hidden bg-white">
          <div className="bg-blue-50 border-blue-200 border-b px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-800">Observation B</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-2 text-left font-medium w-24">Parameter</th>
                  <th className="px-2 py-2 text-center font-medium">R1</th>
                  <th className="px-2 py-2 text-center font-medium">R2</th>
                  <th className="px-2 py-2 text-center font-medium">R3</th>
                  <th className="px-2 py-2 text-center font-semibold bg-blue-100">
                    Mean
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Go Row */}
                <tr className={`border-b transition-opacity ${showGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-2 py-2 font-medium">GO</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-2 py-1">
                      <CustomInput
                        type="number"
                        step="0.001"
                        disabled={isReadOnly || !showGo}
                        {...register(`observations.go.b.values.${i}`, {
                          valueAsNumber: true,
                        })}
                        className="text-center h-9"
                        placeholder="0.000"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-blue-100">
                    <Controller
                      name="observations.go.b.mean"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          inputMode="decimal"
                          isDisabled={isReadOnly}
                          value={field.value ?? ""}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                            input: "text-sm text-center font-semibold",
                          }}
                          placeholder="0.000"
                          onFocus={() => {
                            meanEditingRef.current.goB = true;
                          }}
                          onBlur={(e) => {
                            meanEditingRef.current.goB = false;
                            field.onBlur();

                            if (isReadOnly || !showGo) return;

                            const hasAnyReading = (goBValues ?? []).some(
                              (value: string | number) => parseNumber(value) !== null
                            );
                            if (hasAnyReading) return;

                            const meanValue = parseNumber(e.target.value);
                            if (meanValue === null) return;

                            const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                              decimals: 3,
                              deltas: [0.001, 0.002],
                            });

                            setValue("observations.go.b.values.0", parseFloat(r1), { shouldDirty: true });
                            setValue("observations.go.b.values.1", parseFloat(r2), { shouldDirty: true });
                            setValue("observations.go.b.values.2", parseFloat(r3), { shouldDirty: true });
                          }}
                          onChange={(e) => field.onChange(e)}
                        />
                      )}
                    />
                  </td>
                </tr>
                {/* NoGo Row */}
                <tr className={`transition-opacity ${showNoGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-2 py-2 font-medium">NO GO</td>
                  {[0, 1, 2].map((i) => (
                    <td key={i} className="px-2 py-1">
                      <CustomInput
                        type="number"
                        step="0.001"
                        disabled={isReadOnly || !showNoGo}
                        {...register(`observations.no_go.b.values.${i}`, {
                          valueAsNumber: true,
                        })}
                        className="text-center h-9"
                        placeholder="0.000"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-blue-100">
                    <Controller
                      name="observations.no_go.b.mean"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          inputMode="decimal"
                          isDisabled={isReadOnly}
                          value={field.value ?? ""}
                          classNames={{
                            inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                            input: "text-sm text-center font-semibold",
                          }}
                          placeholder="0.000"
                          onFocus={() => {
                            meanEditingRef.current.noGoB = true;
                          }}
                          onBlur={(e) => {
                            meanEditingRef.current.noGoB = false;
                            field.onBlur();

                            if (isReadOnly || !showNoGo) return;

                            const hasAnyReading = (noGoBValues ?? []).some(
                              (value: string | number) => parseNumber(value) !== null
                            );
                            if (hasAnyReading) return;

                            const meanValue = parseNumber(e.target.value);
                            if (meanValue === null) return;

                            const [r1, r2, r3] = generateReadingsFromMean(meanValue, {
                              decimals: 3,
                              deltas: [0.001, 0.002],
                            });

                            setValue("observations.no_go.b.values.0", parseFloat(r1), { shouldDirty: true });
                            setValue("observations.no_go.b.values.1", parseFloat(r2), { shouldDirty: true });
                            setValue("observations.no_go.b.values.2", parseFloat(r3), { shouldDirty: true });
                          }}
                          onChange={(e) => field.onChange(e)}
                        />
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Specification Table */}
      <div className="bg-white border rounded-md overflow-hidden">
        <div className="bg-gray-700 text-white px-4 py-3">
          <h3 className="text-sm font-semibold tracking-wide">
            Specification Table{" "}
          </h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="w-full min-w-[1400px] border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase w-24">PARAMETER (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">SPECIFIED LIMIT MAX (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">SPECIFIED LIMIT MIN (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">WEAR LIMIT (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-yellow-50">OBSERVED SIZE A (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-blue-50">OBSERVED SIZE B (MM)</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase min-w-[200px]">REMARK</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {/* Go Row */}
              <tr className={`border-b transition-opacity ${showGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                <td className="px-3 py-2">
                  <Checkbox
                    isSelected={showGo}
                    isDisabled={isReadOnly}
                    onValueChange={(value: boolean) => toggleTableToPrint("go", value)}
                    classNames={{
                      label: "text-sm font-medium text-gray-900",
                    }}
                  >
                    Go
                  </Checkbox>
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.go?.max_wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.go?.min_wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.go?.wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 min-w-[140px] max-w-[180px] bg-yellow-50">
                  <Controller
                    name="observations.specification_table.go.observed_size_a"
                    control={control}
                    render={({ field, fieldState }) => {
                      const calcResult = manualObservedSizes
                        ? null
                        : calculateThreadGaugeObservationSize({
                            mean: goAMean,
                            wireDia,
                            constant,
                            pitch,
                          });
                      const isValid = manualObservedSizes ? true : Boolean(calcResult?.isValid);
                      const showError = manualObservedSizes
                        ? false
                        : !isValid && (fieldState.isTouched || goAMean !== null);
                      return (
                        <div className="space-y-1 min-w-0">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0"
                            className="h-9 text-sm text-center"
                            value={field.value ?? (calcResult?.calculatedValue?.toString() || '') ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                            onBlur={field.onBlur}
                            disabled={isReadOnly || !showGo}
                            isReadOnly={isValid && !isReadOnly}
                            isInvalid={showError}
                            classNames={{
                              inputWrapper: isValid
                                ? "bg-gray-50 border-gray-300"
                                : "border-red-500",
                            }}
                          />
                          {showError && calcResult?.error && (
                            <p className="text-xs text-red-600 mt-1 break-words whitespace-normal">{calcResult.error}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </td>
                <td className="px-3 py-2 min-w-[140px] max-w-[180px] bg-blue-50">
                  <Controller
                    name="observations.specification_table.go.observed_size_b"
                    control={control}
                    render={({ field, fieldState }) => {
                      const calcResult = manualObservedSizes
                        ? null
                        : calculateThreadGaugeObservationSize({
                            mean: goBMean,
                            wireDia,
                            constant,
                            pitch,
                          });
                      const isValid = manualObservedSizes ? true : Boolean(calcResult?.isValid);
                      const showError = manualObservedSizes
                        ? false
                        : !isValid && (fieldState.isTouched || goBMean !== null);
                      return (
                        <div className="space-y-1 min-w-0">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0"
                            className="h-9 text-sm text-center"
                            value={field.value ?? (calcResult?.calculatedValue?.toString() || '') ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                            onBlur={field.onBlur}
                            disabled={isReadOnly || !showGo}
                            isReadOnly={isValid && !isReadOnly}
                            isInvalid={showError}
                            classNames={{
                              inputWrapper: isValid
                                ? "bg-gray-50 border-gray-300"
                                : "border-red-500",
                            }}
                          />
                          {showError && calcResult?.error && (
                            <p className="text-xs text-red-600 mt-1 break-words whitespace-normal">{calcResult.error}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  {(() => {
                   
                    // Determine overall status based on both results
                    const anyOutSpec = goRemarkAResult?.remark === 'Out of Specification Limit' || 
                                     goRemarkBResult?.remark === 'Out of Specification Limit';
                    const anyWithinWear = goRemarkAResult?.remark === 'Within Wear Limit' || 
                                        goRemarkBResult?.remark === 'Within Wear Limit';
                    
                    let overallStatus: string;
                    let remarkColor: string;
                    
                    if (anyOutSpec) {
                      overallStatus = 'out_of_specification';
                      remarkColor = 'text-red-600 font-semibold';
                    } else if (anyWithinWear) {
                      overallStatus = 'within_wear_limit';
                      remarkColor = 'text-green-600 font-semibold';
                    } else {
                      overallStatus = 'within_specification';
                      remarkColor = 'text-blue-600 font-semibold';
                    }

                    return (
                      <div>
                        <Input
                          type="text"
                          placeholder="-"
                          className="h-9 text-sm"
                          value={goRemark || ""}
                          disabled={true} // Always read-only since it's derived
                          classNames={{
                            input: remarkColor,
                            inputWrapper: overallStatus === 'out_of_specification'
                              ? "bg-red-50 border-red-300"
                              : overallStatus === 'within_wear_limit'
                              ? "bg-green-50 border-green-300"
                              : "bg-blue-50 border-blue-300",
                          }}
                        />
                      </div>
                    );
                  })()}
                </td>
              </tr>
              {/* NoGo Row */}
              <tr className={`transition-opacity ${showNoGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                <td className="px-3 py-2">
                  <Checkbox
                    isSelected={showNoGo}
                    isDisabled={isReadOnly}
                    onValueChange={(value: boolean) => toggleTableToPrint("nogo", value)}
                    classNames={{
                      label: "text-sm font-medium text-gray-900",
                    }}
                  >
                    No Go
                  </Checkbox>
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.no_go?.max_wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.no_go?.min_wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.specification_table?.no_go?.wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-3 py-2 min-w-[140px] max-w-[180px] bg-yellow-50">
                  <Controller
                    name="observations.specification_table.no_go.observed_size_a"
                    control={control}
                    render={({ field, fieldState }) => {
                      const calcResult = manualObservedSizes
                        ? null
                        : calculateThreadGaugeObservationSize({
                            mean: noGoAMean,
                            wireDia,
                            constant,
                            pitch,
                          });
                      const isValid = manualObservedSizes ? true : Boolean(calcResult?.isValid);
                      const showError = manualObservedSizes
                        ? false
                        : !isValid && (fieldState.isTouched || noGoAMean !== null);
                      return (
                        <div className="space-y-1 min-w-0">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0"
                            className="h-9 text-sm text-center"
                            value={field.value ?? (calcResult?.calculatedValue?.toString() || '') ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                            onBlur={field.onBlur}
                            disabled={isReadOnly || !showNoGo}
                            isReadOnly={isValid && !isReadOnly}
                            isInvalid={showError}
                            classNames={{
                              inputWrapper: isValid
                                ? "bg-gray-50 border-gray-300"
                                : "border-red-500",
                            }}
                          />
                          {showError && calcResult?.error && (
                            <p className="text-xs text-red-600 mt-1 break-words whitespace-normal">{calcResult.error}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </td>
                <td className="px-3 py-2 min-w-[140px] max-w-[180px] bg-blue-50">
                  <Controller
                    name="observations.specification_table.no_go.observed_size_b"
                    control={control}
                    render={({ field, fieldState }) => {
                      const calcResult = manualObservedSizes
                        ? null
                        : calculateThreadGaugeObservationSize({
                            mean: noGoBMean,
                            wireDia,
                            constant,
                            pitch,
                          });
                      const isValid = manualObservedSizes ? true : Boolean(calcResult?.isValid);
                      const showError = manualObservedSizes
                        ? false
                        : !isValid && (fieldState.isTouched || noGoBMean !== null);
                      return (
                        <div className="space-y-1 min-w-0">
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="0"
                            className="h-9 text-sm text-center"
                            value={field.value ?? (calcResult?.calculatedValue?.toString() || '') ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                            onBlur={field.onBlur}
                            disabled={isReadOnly || !showNoGo}
                            isReadOnly={isValid && !isReadOnly}
                            isInvalid={showError}
                            classNames={{
                              inputWrapper: isValid
                                ? "bg-gray-50 border-gray-300"
                                : "border-red-500",
                            }}
                          />
                          {showError && calcResult?.error && (
                            <p className="text-xs text-red-600 mt-1 break-words whitespace-normal">{calcResult.error}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    // Determine overall status based on both results
                    const anyOutSpec = noGoRemarkAResult?.remark === 'Out of Specification Limit' || 
                                     noGoRemarkBResult?.remark === 'Out of Specification Limit';
                    const anyWithinWear = noGoRemarkAResult?.remark === 'Within Wear Limit' ||
                                         noGoRemarkBResult?.remark === 'Within Wear Limit';
                    const anyWithinSpec = noGoRemarkAResult?.remark === 'Within Specification Limit' || 
                                        noGoRemarkBResult?.remark === 'Within Specification Limit';
                    
                    let overallStatus: string;
                    let remarkColor: string;
                    
                    if (anyOutSpec) {
                      overallStatus = 'out_of_specification';
                      remarkColor = 'text-red-600 font-semibold';
                    } else if (anyWithinWear) {
                      overallStatus = 'within_wear_limit';
                      remarkColor = 'text-green-600 font-semibold';
                    } else if (anyWithinSpec) {
                      overallStatus = 'within_specification';
                      remarkColor = 'text-blue-600 font-semibold';
                    } else {
                      overallStatus = 'specification_missing';
                      remarkColor = 'text-gray-600';
                    }

                    return (
                      <div>
                        <Input
                          type="text"
                          placeholder="-"
                          className="h-9 text-sm"
                          value={noGoRemark || ""}
                          disabled={true} // Always read-only since it's derived
                          classNames={{
                            input: remarkColor,
                            inputWrapper: overallStatus === 'out_of_specification'
                              ? "bg-red-50 border-red-300"
                              : overallStatus === 'within_wear_limit'
                                ? "bg-green-50 border-green-300"
                              : overallStatus === 'within_specification'
                                ? "bg-blue-50 border-blue-300"
                                : "bg-white border border-gray-300",
                          }}
                        />
                      </div>
                    );
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Type A Reading Section */}
      <TypeAReadingSection
        observations={observations}
        disabled={isReadOnly}
        note={true}
      />
    </div>
  );
};

PlainThreadPlugRingGaugeCalibration.displayName = 'PlainThreadPlugRingGaugeCalibration';

export const PlainThreadRingGaugeCalibration: React.FC<ThreadPlugRingGaugeCalibrationProps> = (
  props
) => (
  <PlainThreadPlugRingGaugeCalibration
    {...props}
    showParameters={false}
    manualObservedSizes
  />
);

PlainThreadRingGaugeCalibration.displayName = "PlainThreadRingGaugeCalibration";
