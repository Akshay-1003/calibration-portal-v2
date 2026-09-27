import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CalibrationLinearUnit = "mm" | "cm" | "m" | "inch" | "ft";

export const CALIBRATION_LINEAR_UNIT_OPTIONS: CalibrationLinearUnit[] = [
  "mm",
  "cm",
  "m",
  "inch",
  "ft",
];

const LINEAR_UNIT_TO_MM: Record<CalibrationLinearUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
  ft: 304.8,
};

const trimFormattedNumber = (value: number, maxDecimals: number): string => {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(maxDecimals).replace(/\.?0+$/, "");
};

const toNumericValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) return null;
    const parsed = Number(trimmedValue);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const convertLinearValue = (
  value: number,
  fromUnit: CalibrationLinearUnit,
  toUnit: CalibrationLinearUnit
): number => {
  if (!Number.isFinite(value)) return value;
  return (value * LINEAR_UNIT_TO_MM[fromUnit]) / LINEAR_UNIT_TO_MM[toUnit];
};

type CalibrationUnitContextValue = {
  selectedUnit: CalibrationLinearUnit;
  setSelectedUnit: React.Dispatch<React.SetStateAction<CalibrationLinearUnit>>;
  getDisplayValue: (
    value: unknown,
    options?: {
      convert?: boolean;
      maxDecimals?: number;
    }
  ) => string;
  toBaseUnitInputValue: (value: string) => string;
  getLinearUnitLabel: () => CalibrationLinearUnit;
};

const CalibrationUnitContext = createContext<CalibrationUnitContextValue | null>(null);

export const CalibrationUnitProvider: React.FC<{
  children: React.ReactNode;
  defaultUnit?: CalibrationLinearUnit;
}> = ({ children, defaultUnit = "mm" }) => {
  const [selectedUnit, setSelectedUnit] = useState<CalibrationLinearUnit>(defaultUnit);

  const getDisplayValue = useCallback(
    (
      value: unknown,
      options?: {
        convert?: boolean;
        maxDecimals?: number;
      }
    ): string => {
      if (value === null || value === undefined || value === "") return "";

      const { convert = true, maxDecimals = 6 } = options ?? {};
      const numericValue = toNumericValue(value);

      if (numericValue === null) {
        return String(value);
      }

      const resolvedValue = convert
        ? convertLinearValue(numericValue, "mm", selectedUnit)
        : numericValue;

      return trimFormattedNumber(resolvedValue, maxDecimals);
    },
    [selectedUnit]
  );

  const toBaseUnitInputValue = useCallback(
    (value: string): string => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return "";

      const parsedValue = Number(trimmedValue);
      if (!Number.isFinite(parsedValue)) {
        return value;
      }

      return trimFormattedNumber(
        convertLinearValue(parsedValue, selectedUnit, "mm"),
        12
      );
    },
    [selectedUnit]
  );

  const contextValue = useMemo<CalibrationUnitContextValue>(
    () => ({
      selectedUnit,
      setSelectedUnit,
      getDisplayValue,
      toBaseUnitInputValue,
      getLinearUnitLabel: () => selectedUnit,
    }),
    [getDisplayValue, selectedUnit, setSelectedUnit, toBaseUnitInputValue]
  );

  return (
    <CalibrationUnitContext.Provider value={contextValue}>
      {children}
    </CalibrationUnitContext.Provider>
  );
};

export const useCalibrationUnitContext = (): CalibrationUnitContextValue => {
  const context = useContext(CalibrationUnitContext);

  if (!context) {
    throw new Error("useCalibrationUnitContext must be used within CalibrationUnitProvider");
  }

  return context;
};
