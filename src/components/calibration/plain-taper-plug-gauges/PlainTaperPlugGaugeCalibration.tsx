import React, { useEffect, useMemo, useState } from "react";
import { useFormContext, useFieldArray, useWatch } from "react-hook-form";
import { Input } from "../../ui/input";
import { Button, Input as HeroInput } from "@heroui/react";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { GO_NO_GO_TABLE_KEYS, type GoNoGoTableKey, type PlainTaperPlugGaugeObservations } from "../observationSchemas";
import { TrashIcon } from "@heroicons/react/24/outline";
import { parseNumber } from "../../../utils/calibrationCalculations";
import {
  decideCalibrationRemark,
  type CalibrationSpecLimits,
} from "../common/calibrationRemarkValidator";

type LimitSpec = {
  basic_size?: number | string;
  specification_limit_max?: number;
  specification_limit_min?: number;
  wear_limit?: number;
};

type Specifications = {
  go?: LimitSpec;
  no_go?: LimitSpec;
  taper?: string;
  total_gauge_length_1?: number | string;
  total_gauge_length_2?: number | string;
};

type MeasurementRow = {
  id: string;
  parameter: string;
  measured_value: string | number;
  enabled: boolean;
};

type StepRow = {
  id: string;
  term: string;
  observed_value: string | number;
};

type PlainTaperObservationExtras = PlainTaperPlugGaugeObservations & {
  measurements?: MeasurementRow[];
  steps?: Array<{
    term?: string;
    observed_value?: string | number;
  }>;
};

const DEFAULT_MEASUREMENTS: MeasurementRow[] = [
  { id: '1', parameter: 'Taper Angle', measured_value: '', enabled: true },
  { id: '2', parameter: 'Major Diameter (Big End)', measured_value: '', enabled: true },
  { id: '3', parameter: 'Minor Diameter (Small End)', measured_value: '', enabled: true },
  { id: '4', parameter: 'Gauge Length L1', measured_value: '', enabled: true },
  { id: '5', parameter: 'Gauge Length L2', measured_value: '', enabled: true },
];

const DEFAULT_STEPS: StepRow[] = [
  { id: '1', term: 'STEP MN', observed_value: '' },
  { id: '2', term: 'STEP B', observed_value: '' },
  { id: '3', term: 'STEP MT', observed_value: '' },
  { id: '4', term: 'STEP MX', observed_value: '' },
  { id: '5', term: 'STEP BT', observed_value: '' },
  { id: '6', term: 'STEP MXT', observed_value: '' },
  // { id: '7', term: 'MAJOR DIA', observed_value: '' },
];

export interface PlainTaperPlugGaugeCalibrationProps {
  onCancel: () => void;
  isReadOnly?: boolean;
  observations: PlainTaperPlugGaugeObservations;
  specifications: Specifications;
  master_gauge_id?: string;
  uncertainty?: string | number;
}

/**
 * Plain Taper Plug Gauge Calibration Component
 * Features:
 * - Gauge specifications (TAPER, TOTAL GAUGE LENGTH 1, TOTAL GAUGE LENGTH 2)
 * - Parameter specifications table (Go/NoGo with observed size and remarks)
 * - Type A readings section
 */
export const PlainTaperPlugGaugeCalibration: React.FC<PlainTaperPlugGaugeCalibrationProps> = ({
  observations,
  specifications,
  isReadOnly = false,
  uncertainty,
}) => {
  const { register, setValue, control } = useFormContext();
  const [measurements, setMeasurements] = useState<MeasurementRow[]>(DEFAULT_MEASUREMENTS);
  const [removedMeasurements, setRemovedMeasurements] = useState<MeasurementRow[]>([]);
  const extendedObservations = observations as PlainTaperObservationExtras | undefined;
  const tablesToPrintField = useWatch({ control, name: "observations.tables_to_print" });
  const tablesToPrint = useMemo(() => {
    if (!Array.isArray(tablesToPrintField)) return [...GO_NO_GO_TABLE_KEYS];
    return tablesToPrintField.filter((value): value is GoNoGoTableKey =>
      GO_NO_GO_TABLE_KEYS.includes(value as GoNoGoTableKey)
    );
  }, [tablesToPrintField]);
  const showGo = tablesToPrint.includes("go");
  const showNoGo = tablesToPrint.includes("nogo");

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: "observations.steps"
  });

  // Initialize form values from observations prop
  useEffect(() => {
    if (observations) {
      // Initialize measurements if they exist
      if (extendedObservations?.measurements) {
        setMeasurements(extendedObservations.measurements);
      }

      // Initialize steps if they exist
      if (extendedObservations?.steps && extendedObservations.steps.length > 0) {
        setValue("observations.steps", extendedObservations.steps);
      } else {
        // Set default steps
        setValue("observations.steps", DEFAULT_STEPS);
      }

      setValue("observations.go.observed_size", observations?.go?.observed_size ?? "");
      setValue("observations.no_go.observed_size", observations?.no_go?.observed_size ?? "");
      setValue("observations.go.remark", observations?.go?.remark ?? "");
      setValue("observations.no_go.remark", observations?.no_go?.remark ?? "");
      setValue(
        "observations.tables_to_print",
        observations?.tables_to_print?.length ? observations.tables_to_print : [...GO_NO_GO_TABLE_KEYS],
        { shouldDirty: false, shouldValidate: false }
      );
    } else {
      // Set default steps if no observations
      setValue("observations.steps", DEFAULT_STEPS);
      setValue("observations.tables_to_print", [...GO_NO_GO_TABLE_KEYS], {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [extendedObservations, observations, setValue]);

  const goObservedSizeField = useWatch({ control, name: "observations.go.observed_size" });
  const noGoObservedSizeField = useWatch({ control, name: "observations.no_go.observed_size" });
  const goObservedSize = parseNumber(goObservedSizeField);
  const noGoObservedSize = parseNumber(noGoObservedSizeField);

  // Use wear_limit when provided; fallback to spec min for backward compatibility.
  const goSpec: CalibrationSpecLimits = useMemo(() => ({
    max_limit: parseNumber(specifications?.go?.specification_limit_max) ?? undefined,
    wear_limit:
      parseNumber(specifications?.go?.wear_limit) ??
      parseNumber(specifications?.go?.specification_limit_min) ??
      undefined,
  }), [specifications?.go?.specification_limit_max, specifications?.go?.wear_limit, specifications?.go?.specification_limit_min]);

  const noGoSpec: CalibrationSpecLimits = useMemo(() => ({
    max_limit: parseNumber(specifications?.no_go?.specification_limit_max) ?? undefined,
    min_limit: parseNumber(specifications?.no_go?.specification_limit_min) ?? undefined,
    wear_limit: parseNumber(specifications?.no_go?.wear_limit) ?? undefined,
  }), [specifications?.no_go?.specification_limit_max, specifications?.no_go?.specification_limit_min, specifications?.no_go?.wear_limit]);

  const goRemarkResult = useMemo(
    () => (goObservedSize === null ? null : decideCalibrationRemark(goObservedSize, goSpec, "GO", uncertainty)),
    [goObservedSize, goSpec, uncertainty]
  );
  const noGoRemarkResult = useMemo(
    () => (noGoObservedSize === null ? null : decideCalibrationRemark(noGoObservedSize, noGoSpec, "NO_GO", uncertainty)),
    [noGoObservedSize, noGoSpec, uncertainty]
  );

  const goRemark = goRemarkResult?.remark ?? "";
  const noGoRemark = noGoRemarkResult?.remark ?? "";

  useEffect(() => {
    const normalizeRemark = (remark: string): string => {
      if (!remark) return "";
      if (remark === "Out of Specification Limit") return "out_of_specification_limit";
      if (remark === "Within Wear Limit") return "within_wear_limit";
      if (remark === "Within Specification Limit") return "within_specification_limit";
      return "";
    };

    setValue("observations.go.remark", normalizeRemark(goRemark));
    setValue("observations.no_go.remark", normalizeRemark(noGoRemark));
    setValue("observations.remarks.go", normalizeRemark(goRemark));
    setValue("observations.remarks.no_go", normalizeRemark(noGoRemark));
  }, [goRemark, noGoRemark, setValue]);

  const handleRemoveMeasurement = (index: number) => {
    const removed = measurements[index];
    setRemovedMeasurements([...removedMeasurements, removed]);
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  const handleAddMeasurement = (measurement: MeasurementRow) => {
    setMeasurements([...measurements, measurement]);
    setRemovedMeasurements(removedMeasurements.filter(m => m.id !== measurement.id));
  };

  const handleAddCustomMeasurement = () => {
    const newId = String(Date.now());
    const newMeasurement: MeasurementRow = {
      id: newId,
      parameter: '',
      measured_value: '',
      enabled: true
    };
    setMeasurements([...measurements, newMeasurement]);
  };

  // Update form value when measurements change
  useEffect(() => {
    setValue("observations.measurements", measurements.filter(m => m.measured_value !== ''));
  }, [measurements, setValue]);

  const toggleTableToPrint = (key: GoNoGoTableKey, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...tablesToPrint, key]))
      : tablesToPrint.filter((entry) => entry !== key);
    setValue("observations.tables_to_print", next, { shouldDirty: true, shouldValidate: false });
  };

  return (
    <>
      <div className="space-y-3 p-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
          {/* Measurements Table */}
          <div className="border border-gray-200 bg-white">
            <div className="bg-slate-700 text-white px-2 py-1.5 flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Measurements</h3>
              {!isReadOnly && (
                <Button
                  variant="primary"
                  className="text-white"
                  onPress={handleAddCustomMeasurement}
                >
                  + Add Row
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                      Parameter
                    </th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                      Measured Value
                    </th>
                    {!isReadOnly && (
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((measurement, index) => (
                    <tr key={measurement.id} className="border-b border-gray-200">
                      <td className="px-2 py-1.5 border-r">
                        {measurement.parameter === '' ? (
                          <Input
                            type="text"
                            disabled={isReadOnly}
                            value={measurement.parameter}
                            onChange={(e) => {
                              const updated = [...measurements];
                              updated[index].parameter = e.target.value;
                              setMeasurements(updated);
                            }}
                            placeholder="Enter parameter name"
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium text-gray-900 text-sm">{measurement.parameter}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 border-r">
                        <Input
                          type="text"
                          disabled={isReadOnly}
                          value={measurement.measured_value}
                          onChange={(e) => {
                            const updated = [...measurements];
                            updated[index].measured_value = e.target.value;
                            setMeasurements(updated);
                          }}
                          placeholder="Enter value"
                          className="w-full text-center"
                        />
                      </td>
                      {!isReadOnly && (
                        <td className="px-2  text-center">
                          <Button
                            variant="danger"
                            className="text-white"
                            onPress={() => handleRemoveMeasurement(index)}
                          >
                            <TrashIcon className="h-4 w-4"></TrashIcon>

                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Show removed measurements that can be re-added */}
            {!isReadOnly && removedMeasurements.length > 0 && (
              <div className="px-2 py-1.5 bg-gray-50 border-t">
                <p className="text-xs font-medium text-gray-600 mb-2">Removed rows (click to add back):</p>
                <div className="flex flex-wrap gap-2">
                  {removedMeasurements.map((measurement) => (
                    <Button
                      key={measurement.id}
                      variant="outline"
                      onPress={() => handleAddMeasurement(measurement)}
                    >
                      + {measurement.parameter}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Steps Table */}
          <div className="border border-gray-200 bg-white">
            <div className="bg-slate-700 text-white px-2 py-1.5 flex justify-between items-center">
              <h3 className="text-sm font-semibold uppercase tracking-wide">Steps</h3>
              {!isReadOnly && (
                <Button
                  variant="primary"
                  className="text-white"
                  onPress={() => appendStep({ term: '', observed_value: '' })}
                >
                  + Add Step
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                      Terms
                    </th>
                    <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                      Observed Values
                    </th>
                    {!isReadOnly && (
                      <th className="px-2 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stepFields.map((field, index) => (
                    <tr key={field.id} className="border-b border-gray-200">
                      <td className="px-2 py-1.5 border-r">
                        <Input
                          type="text"
                          disabled={isReadOnly}
                          {...register(`observations.steps.${index}.term`)}
                          placeholder="Enter term"
                          className="w-full text-sm"
                        />
                      </td>
                      <td className="px-2 py-1.5 border-r">
                        <Input
                          type="text"
                          disabled={isReadOnly}
                          {...register(`observations.steps.${index}.observed_value`)}
                          placeholder="Enter observed value"
                          className="w-full text-center"
                        />
                      </td>
                      {!isReadOnly && (
                        <td className="text-center">
                          <Button
                            className="text-white"
                            type="button"
                            onPress={() => removeStep(index)}
                          >
                            <TrashIcon className="h-4 w-4"></TrashIcon>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Specification Table */}
        <div className="bg-white border rounded-md overflow-hidden">
          <div className="bg-gray-700 text-white px-4 py-3">
            <h3 className="text-sm font-semibold tracking-wide">Specification Table</h3>
          </div>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase w-24">Parameter (MM)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Specified Limit Max (MM)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Specified Limit Min (MM)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Wear Limit (MM)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase bg-yellow-50">Observed Size (MM)</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase min-w-[220px]">Remark</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className={`border-b transition-opacity ${showGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={showGo}
                        disabled={isReadOnly}
                        onChange={(event) => toggleTableToPrint("go", event.target.checked)}
                      />
                      <span>Go</span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.go?.specification_limit_max ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.go?.specification_limit_min ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.go?.wear_limit ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 bg-yellow-50">
                    <Input
                      type="number"
                      step="0.001"
                      disabled={isReadOnly || !showGo}
                      {...register("observations.go.observed_size", { valueAsNumber: true })}
                      className="text-center h-9 bg-white"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <HeroInput
                      readOnly
                      value={goRemark}
                      className={`${goRemark === "Out of Specification Limit"
                          ? "text-red-600 font-semibold"
                          : goRemark === "Within Wear Limit"
                            ? "text-green-600 font-semibold"
                            : "text-blue-600 font-semibold"} ${goRemark === "Out of Specification Limit"
                          ? "bg-red-50 border-red-300"
                          : goRemark === "Within Wear Limit"
                            ? "bg-green-50 border-green-300"
                            : "bg-blue-50 border-blue-300"}`}
                      placeholder="-"
                    />
                  </td>
                </tr>

                <tr className={`transition-opacity ${showNoGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                  <td className="px-3 py-2">
                    <label className="flex items-center gap-2 font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={showNoGo}
                        disabled={isReadOnly}
                        onChange={(event) => toggleTableToPrint("nogo", event.target.checked)}
                      />
                      <span>No Go</span>
                    </label>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.no_go?.specification_limit_max ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.no_go?.specification_limit_min ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HeroInput
                      readOnly
                      value={String(specifications?.no_go?.wear_limit ?? "")}
                      className="h-9 border border-gray-300 bg-gray-100 text-sm text-center font-medium"
                      placeholder="--"
                    />
                  </td>
                  <td className="px-3 py-2 bg-yellow-50">
                    <Input
                      type="number"
                      step="0.001"
                      disabled={isReadOnly || !showNoGo}
                      {...register("observations.no_go.observed_size", { valueAsNumber: true })}
                      className="text-center h-9 bg-white"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <HeroInput
                      readOnly
                      value={noGoRemark}
                      className={`${noGoRemark === "Out of Specification Limit"
                        ? "text-red-600 font-semibold bg-red-50 border-red-300"
                        : noGoRemark === "Within Wear Limit"
                          ? "text-green-600 font-semibold bg-green-50 border-green-300"
                          : noGoRemark === "Within Specification Limit"
                            ? "text-blue-600 font-semibold bg-blue-50 border-blue-300"
                            : "text-gray-600 bg-white border border-gray-300"}`}
                      placeholder="-"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Type A Reading Section */}
        <TypeAReadingSection observations={observations} />
      </div>
    </>
  );
};

PlainTaperPlugGaugeCalibration.displayName = "PlainTaperPlugGaugeCalibration";
