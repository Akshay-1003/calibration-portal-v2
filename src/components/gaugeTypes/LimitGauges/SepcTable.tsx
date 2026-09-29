
import React from "react";
import { Input } from "../../ui/input";
import type { UseFormSetValue } from "react-hook-form";

type GoKeys =
  | "basic_size"
  | "specification_limit_max"
  | "specification_limit_min"
  | "wear_limit";

type NoGoKeys =
  | "basic_size"
  | "specification_limit_max"
  | "specification_limit_min";


interface SpecificationData {
  go?: {
    basic_size?: number;
    specification_limit_max?: number;
    specification_limit_min?: number;
    wear_limit?: number;
  };
  no_go?: {
    basic_size?: number;
    specification_limit_max?: number;
    specification_limit_min?: number;
  };
  inputs?: {
    method?: string;
    inputs?: {
      basic_size?: number;
      upper_tolerance?: number;
      lower_tolerance?: number;
      diameter?: number;
      grade?: string;
      go?: string;
      no_go?: string;
    };
  };
}
interface Props {
  specifications?: SpecificationData;
  handleTablebasic_sizeChange: (type: "go" | "nogo", rawValue: string) => void;
  setValue: UseFormSetValue<any>;
  dataColumns: readonly string[];
  getColumnDisplayName: (k: string) => string;
  getPlaceholderText: (k: string) => string;
  editable?: boolean;
  errors?: {
    go?: Record<string, string>;
    no_go?: Record<string, string>;
  };
}

const SpecTable: React.FC<Props> = ({ specifications, handleTablebasic_sizeChange, setValue, dataColumns, getColumnDisplayName, getPlaceholderText, editable = true, errors }) => {
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg mt-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Parameter</th>
            {dataColumns.map((col) => (
              <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">{getColumnDisplayName(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Go row */}
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 text-sm font-medium text-gray-900 border-r align-top">Go</td>
            {dataColumns.map((col) => {
              const fieldKey = (col === "basic_size" ? "basic_size" : col === "specMax" ? "specification_limit_max" : col === "specMin" ? "specification_limit_min" : col === "wearLimit" ? "wear_limit" : col) as GoKeys;
              const value = specifications?.go ? specifications.go[fieldKey] : undefined;
              const inputValue = value === undefined || value === null ? "" : String(value);
              const errorMsg = errors?.go?.[fieldKey];
              return (
                <td key={col} className="px-4 py-2 border-r align-top">
                  {editable ? (
                    <Input
                      value={inputValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (col === "basic_size") {
                          handleTablebasic_sizeChange("go", v);
                        } else {
                          const parsed = v === "" ? undefined : Number(v);
                          setValue(`specifications.go.${fieldKey}` as const, parsed);
                        }
                      }}
                      placeholder={`Enter ${getPlaceholderText(col)}`}
                      className="w-full text-sm"
                      aria-invalid={Boolean(errorMsg)}
                    />
                  ) : (
                    <div className="text-sm">{inputValue || "-"}</div>
                  )}
                </td>
              );
            })}
          </tr>

          {/* NoGo row */}
          <tr className="hover:bg-gray-50">
            <td className="px-4 py-2 text-sm font-medium text-gray-900 border-r align-top">NoGo</td>
            {dataColumns.map((col) => {
              const fieldKey = (col === "basic_size" ? "basic_size" : col === "specMax" ? "specification_limit_max" : col === "specMin" ? "specification_limit_min" : col) as NoGoKeys;
              const value = specifications?.no_go ? specifications.no_go[fieldKey] : undefined;
              const inputValue = value === undefined || value === null ? "" : String(value);
              const errorMsg = errors?.no_go?.[fieldKey];
              return (
                <td key={col} className="px-4 py-2 border-r align-top">
                  {editable ? (
                    <Input
                      value={inputValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (col === "basic_size") {
                          handleTablebasic_sizeChange("nogo", v);
                        } else {
                          const parsed = v === "" ? undefined : Number(v);
                          setValue(`specifications.no_go.${fieldKey}` as const, parsed);
                        }
                      }}
                      placeholder={`Enter ${getPlaceholderText(col)}`}
                      className="w-full text-sm"
                      aria-invalid={Boolean(errorMsg)}
                    />
                  ) : (
                    <div className="text-sm">{inputValue || "-"}</div>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SpecTable;
