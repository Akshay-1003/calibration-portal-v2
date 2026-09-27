import React, { useEffect, useMemo } from 'react';
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@heroui/react";
import { ObservationSection } from '../od-id-limit-gauges/ObservationSection';
import { TypeAReadingSection } from './TypeAReadingSection';
import { GO_NO_GO_TABLE_KEYS, type GoNoGoTableKey, type LimitGaugeObservations } from "../observationSchemas";
import { parseNumber } from "../../../utils/calibrationCalculations";
import {
  formatLimitGaugeStatusLines,
  getAggregateLimitGaugeStatusKey,
  getGoGaugeStatus,
  getLimitGaugeStatusStyles,
  getNoGoGaugeStatus,
  type LimitGaugeStatusResult,
  type LimitGaugeSpec,
} from "../common/limitGaugeDecision";

// Function to format number with 4 decimal places without rounding
const formatFourDecimals = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "";
  // Convert to string, split at decimal, and pad/truncate to 4 decimal places
  const str = num.toString();
  const parts = str.split('.');
  if (parts.length === 1) {
    return `${parts[0]}.0000`;
  }
  const integer = parts[0];
  const decimal = (parts[1] || '').padEnd(4, '0').substring(0, 4);
  return `${integer}.${decimal}`;
};
void formatFourDecimals;
// Props interface for GO/NO-GO gauge calibration
type LimitSpec = {
  basic_size?: number | string;
  specification_limit_max?: number;
  specification_limit_min?: number;
  wear_limit?: number;
};
type Specifications = {
  go?: LimitSpec;
  no_go?: LimitSpec;
};

const getRemarkBoxColor = (
  first: LimitGaugeStatusResult | null,
  second: LimitGaugeStatusResult | null,
) => {
  if (first?.color === "red" || second?.color === "red") return "red";
  if (first?.color === "orange" || second?.color === "orange") return "orange";
  if (first?.color === "gray" || second?.color === "gray") return "gray";
  if (first || second) return "green";
  return "gray";
};

function RemarkStatusBox({
  first,
  second,
}: {
  first: LimitGaugeStatusResult | null;
  second: LimitGaugeStatusResult | null;
}) {
  const lines = formatLimitGaugeStatusLines(first, second);
  const boxStyles = getLimitGaugeStatusStyles(getRemarkBoxColor(first, second));

  if (lines.length === 0) {
    return (
      <div className="flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-500">
        -
      </div>
    );
  }

  return (
    <div
      className={[
        "flex flex-col justify-center gap-1 rounded-md border px-1 py-1",
        boxStyles.inputWrapper,
      ].join(" ")}
    >
      {lines.map((line) => {
        const lineStyles = getLimitGaugeStatusStyles(line.result?.color ?? "gray");

        return (
          <div
            key={line.label}
            className={[
              "whitespace-normal break-words text-[13px] font-semibold leading-snug",
              lineStyles.input,
            ].join(" ")}
          >
            <span className="font-bold">{line.label}:</span>{" "}
            <span>{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface GaugeCalibrationProps {
  onCancel: () => void;
  isReadOnly?: boolean;
  observations: LimitGaugeObservations;
  specifications: Specifications;
  uncertainty?: string | number;
}

/**
 * Child Component 1: GO/NO-GO Gauge Calibration
 * Features:
 * - Observation A and B readings (GO and NO-GO parameters)
 * - Type A readings (5 measurements)
 * - Automatic average calculations
 * - Action buttons for submit and cancel
 * 
 * @param calibrationValues - Current calibration readings
 * @param onValueChange - Handler for value changes

 * @param onCancel - Cancel handler
 */
export const GoNoGoGaugeCalibration: React.FC<GaugeCalibrationProps> = ({
  observations,
  specifications,
  isReadOnly = false,
  uncertainty,
}) => {
  void uncertainty;
  const { control, setValue } = useFormContext();
  const tablesToPrintField = useWatch({ control, name: "observations.tables_to_print" });
  const tablesToPrint = useMemo(() => {
    if (!Array.isArray(tablesToPrintField)) return [...GO_NO_GO_TABLE_KEYS];
    return tablesToPrintField.filter((value): value is GoNoGoTableKey =>
      GO_NO_GO_TABLE_KEYS.includes(value as GoNoGoTableKey)
    );
  }, [tablesToPrintField]);
  const showGo = tablesToPrint.includes("go");
  const showNoGo = tablesToPrint.includes("nogo");

  const goAAvgField = useWatch({ control, name: "observations.go.a.average" });
  const goBAvgField = useWatch({ control, name: "observations.go.b.average" });
  const noGoAAvgField = useWatch({ control, name: "observations.no_go.a.average" });
  const noGoBAvgField = useWatch({ control, name: "observations.no_go.b.average" });

  const goAAvg = parseNumber(goAAvgField);
  const goBAvg = parseNumber(goBAvgField);
  const noGoAAvg = parseNumber(noGoAAvgField);
  const noGoBAvg = parseNumber(noGoBAvgField);

  const goSpec: LimitGaugeSpec = useMemo(() => ({
    specification_limit_max: specifications?.go?.specification_limit_max,
    specification_limit_min: specifications?.go?.specification_limit_min,
    wear_limit: specifications?.go?.wear_limit,
  }), [specifications?.go?.specification_limit_max, specifications?.go?.specification_limit_min, specifications?.go?.wear_limit]);

  const noGoSpec: LimitGaugeSpec = useMemo(() => ({
    specification_limit_max: specifications?.no_go?.specification_limit_max,
    specification_limit_min: specifications?.no_go?.specification_limit_min,
  }), [specifications?.no_go?.specification_limit_max, specifications?.no_go?.specification_limit_min]);

  const goRemarkAResult = useMemo(
    () => (goAAvg === null ? null : getGoGaugeStatus(goAAvg, goSpec)),
    [goAAvg, goSpec]
  );
  const goRemarkBResult = useMemo(
    () => (goBAvg === null ? null : getGoGaugeStatus(goBAvg, goSpec)),
    [goBAvg, goSpec]
  );
  const noGoRemarkAResult = useMemo(
    () => (noGoAAvg === null ? null : getNoGoGaugeStatus(noGoAAvg, noGoSpec)),
    [noGoAAvg, noGoSpec]
  );
  const noGoRemarkBResult = useMemo(
    () => (noGoBAvg === null ? null : getNoGoGaugeStatus(noGoBAvg, noGoSpec)),
    [noGoBAvg, noGoSpec]
  );

  const goOverallStatus = useMemo(() => {
    return getAggregateLimitGaugeStatusKey(goRemarkAResult, goRemarkBResult);
  }, [goRemarkAResult, goRemarkBResult]);

  const noGoOverallStatus = useMemo(() => {
    return getAggregateLimitGaugeStatusKey(noGoRemarkAResult, noGoRemarkBResult);
  }, [noGoRemarkAResult, noGoRemarkBResult]);

  useEffect(() => {
    setValue("observations.remarks.go", goOverallStatus);
    setValue("observations.remarks.no_go", noGoOverallStatus);
    setValue("observations.go.remark", goOverallStatus);
    setValue("observations.no_go.remark", noGoOverallStatus);
  }, [goOverallStatus, noGoOverallStatus, setValue]);

  useEffect(() => {
    setValue(
      "observations.tables_to_print",
      observations?.tables_to_print?.length ? observations.tables_to_print : [...GO_NO_GO_TABLE_KEYS],
      { shouldDirty: false, shouldValidate: false }
    );
  }, [observations?.tables_to_print, setValue]);

  const toggleTableToPrint = (key: GoNoGoTableKey, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...tablesToPrint, key]))
      : tablesToPrint.filter((entry) => entry !== key);
    setValue("observations.tables_to_print", next, { shouldDirty: true, shouldValidate: false });
  };

  return (
    <>
      <div className='mt-2'>
          <div className="bg-white border rounded-md overflow-hidden mb-2">
        <div className="bg-gray-700 text-white px-4 py-3">
          <h3 className="text-sm font-semibold tracking-wide">Specification Table</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 uppercase w-24">Parameter (MM)</th>
                <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Basic Size (MM)</th>
                <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Specified Limit Max (MM)</th>
                <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Specified Limit Min (MM)</th>
                <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Wear Limit (MM)</th>
                <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Remark</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className={`border-b transition-opacity ${showGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                <td className="px-1 py-2">
                  <label className="flex items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={showGo}
                      disabled={isReadOnly}
                      onChange={(event) => toggleTableToPrint("go", event.target.checked)}
                    />
                    <span>Go</span>
                  </label>
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.go?.basic_size ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.go?.specification_limit_max ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.go?.specification_limit_min ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.go?.wear_limit ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2">
                  <RemarkStatusBox first={goRemarkAResult} second={goRemarkBResult} />
                </td>
              </tr>

              <tr className={`transition-opacity ${showNoGo ? "hover:bg-gray-50" : "opacity-45"}`}>
                <td className="px-1 py-2">
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
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.no_go?.basic_size ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.no_go?.specification_limit_max ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value={specifications?.no_go?.specification_limit_min ?? ""}
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2 text-center">
                  <Input
                    isReadOnly
                    value="-"
                    classNames={{
                      inputWrapper: "h-9 border-1 border-gray-300 bg-gray-100 rounded-md",
                      input: "text-sm text-center font-medium",
                    }}
                    placeholder="--"
                  />
                </td>
                <td className="px-1 py-2">
                  <RemarkStatusBox first={noGoRemarkAResult} second={noGoRemarkBResult} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
        <ObservationSection
          type="A"
          observations={observations}
          disabled={isReadOnly}
          parameterSelection={{ go: showGo, no_go: showNoGo }}
        />
        <ObservationSection
          type="B"
          observations={observations}
          disabled={isReadOnly}
          parameterSelection={{ go: showGo, no_go: showNoGo }}
        />
      </div>
    
      <TypeAReadingSection observations={observations} disabled={isReadOnly} />
      </div>
    </>
  );
};

GoNoGoGaugeCalibration.displayName = 'GoNoGoGaugeCalibration';
