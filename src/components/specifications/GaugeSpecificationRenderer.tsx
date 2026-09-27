import React, { memo, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@heroui/react";
import { getFieldError } from "../../lib/validations";
import LimitgaugeTable from "../gaugeTypes/LimitGauges";
import MasterPieceTable from "../gaugeTypes/MasterPiece/MasterPiece";
import FixedRange from "../gaugeTypes/FixedRange/FixedRangeType";
import VBlockType from "../gaugeTypes/VBlock/VBlockType";
import BenchCenter from "../gaugeTypes/BenchCenter/BenchCenter";
import PlungerDial from "../gaugeTypes/DialTypeGauges/PlungerDial";
import SurfacePlateType from "../gaugeTypes/SurfacePlate/SurfacePlateType";
import SplineTypeGauge from "../gaugeTypes/SplineTypeGauges/SplineTypeGauge";
import PlainThreadPlugGauge from "../gaugeTypes/PlainThreadPlugGauge/PlainThreadPlugGauge";
import TaperThreadPlugGauge from "../gaugeTypes/TaperThreadPlugGauge/TaperThreadPlugGauge";
import PlainTaperRingGauge from "../gaugeTypes/PlainTaperRingGauge/PlainTaperRingGauge";
import SpecificationReadOnlyField from "./SpecificationReadOnlyField";
import { PlainTaperPlugGauge } from "../gaugeTypes/PlainTaperPlugGauge";

interface GaugeSpecificationRendererProps {
  gaugeType: string | null | undefined;
  isProgrammatic?: React.RefObject<boolean>;
  isSubmitting?: boolean;
  specifications?: unknown;
  readOnly?: boolean;
  showCalculatedTable?: boolean;
}

const fixedRangeTypes = new Set([
  "fixed range gauge",
  "external micrometer",
  "internal micrometer",
  "depth caliper",
  "caliper",
  "fixed range gauge (degree, min)",
  "pressure gauge",
  "height gauge",
  "electronic height gauge",
  "digital dial gauge",
  "depth caliper.",
  "plunger dial",
]);

const normalizeGaugeType = (value: string | null | undefined): string =>
  (value || "").toLowerCase().trim();

const getSpecificationRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const isPlainNumericValue = (value: string): boolean => /^-?\d*\.?\d+$/.test(value);

const EditableSimpleSpecificationInput = memo(
  ({
    name,
    label,
    unit,
    value,
    readOnly = false,
    fieldError,
  }: {
    name: string;
    label: string;
    unit?: string;
    value?: unknown;
    readOnly?: boolean;
    fieldError?: string;
  }) => {
    const { register } = useFormContext();
    const displayLabel = unit ? `${label} (${unit})` : label;

    if (readOnly) {
      return <SpecificationReadOnlyField label={displayLabel} value={value} />;
    }

    return (
      <>
        <div className="text-sm font-medium text-gray-700">Specifications</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            {...register(name, {
              validate: (inputValue: unknown) => {
                const normalizedValue = String(inputValue ?? "").trim();

                if (!normalizedValue) {
                  return true;
                }

                if (isPlainNumericValue(normalizedValue)) {
                  return true;
                }

                return `${displayLabel} must be a plain numeric value. Example: 0.75185. Remove brackets, tolerances, or text like (+0.00048).`;
              },
            })}
            placeholder="0"
            size="sm"
            label={displayLabel}
            labelPlacement="outside"
            inputMode="decimal"
            isInvalid={!!fieldError}
            errorMessage={fieldError}
            description="Enter a plain numeric value only."
            classNames={{
              label: "text-xs font-semibold text-gray-700 uppercase mb-1",
            }}
          />
        </div>

      </>

    );
  }
);

EditableSimpleSpecificationInput.displayName = "EditableSimpleSpecificationInput";

export const GaugeSpecificationRenderer: React.FC<GaugeSpecificationRendererProps> = memo(
  ({
    gaugeType,
    isProgrammatic = { current: false },
    isSubmitting = false,
    specifications,
    readOnly = false,
    showCalculatedTable = true,
  }) => {
    const {
      watch,
      formState: { errors },
    } = useFormContext();
    const currentUnit = watch("unit") || "mm";
    const normalizedGaugeType = useMemo(() => normalizeGaugeType(gaugeType), [gaugeType]);
    const specificationRecord = useMemo(
      () => getSpecificationRecord(specifications),
      [specifications]
    );

    if (normalizedGaugeType === "od limit gauge" || normalizedGaugeType === "id limit gauge") {
      return (
        <LimitgaugeTable
          isSubmitting={isSubmitting}
          isProgrammatic={isProgrammatic}
          gaugeType={gaugeType}
          readOnly={readOnly}
          showCalculatedTable={showCalculatedTable}
        />
      );
    }

    if (normalizedGaugeType === "master piece" || normalizedGaugeType === "slip / feeler gauge") {
      return (
        <MasterPieceTable
          basic_size
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (
      normalizedGaugeType === "plunger dial" ||
      normalizedGaugeType === "plunger dial std" ||
      normalizedGaugeType === "lever dial"
    ) {
      return (
        <PlungerDial
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "dial snap gauge") {
      return (
        <FixedRange
          leastCount={false}
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "surface roughness master/tester") {
      return (
        <FixedRange
          unit="µm"
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "coating thickness gauge") {
      return (
        <FixedRange
          unit="µm"
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (fixedRangeTypes.has(normalizedGaugeType)) {
      return (
        <FixedRange
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (
      normalizedGaugeType === "thread plug gauge" ||
      normalizedGaugeType === "thread ring gauge"
    ) {
      return <PlainThreadPlugGauge isSubmitting={isSubmitting} readOnly={readOnly} />;
    }

    if (
      normalizedGaugeType === "taper thread ring gauge" ||
      normalizedGaugeType === "taper thread plug gauge"
    ) {
      return <TaperThreadPlugGauge isSubmitting={isSubmitting} readOnly={readOnly} initialData={specifications} />;
    }
    if (normalizedGaugeType === "plain taper plug gauge") {
      return (
        <PlainTaperPlugGauge
          isSubmitting={isSubmitting}
          initialData={specifications}
          isProgrammatic={isProgrammatic}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "plain taper ring gauge") {
      return (
        <PlainTaperRingGauge
          isSubmitting={isSubmitting}
          readOnly={readOnly}
          initialData={specificationRecord ?? undefined}
        />
      );
    }

    if (normalizedGaugeType === "comparator stand") {
      return (
        <VBlockType
          title="Base Size"
          unit={currentUnit}
          initialData={specificationRecord as {
            length?: number | string;
            width?: number | string;
            height?: number | string;
          } | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "v block") {
      return (
        <VBlockType
          unit={currentUnit}
          initialData={specifications as Record<string, unknown> | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "bench center") {
      return (
        <BenchCenter
          initialData={specifications as { range?: number | string; base_width?: number | string } | undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "master ring" || normalizedGaugeType === "id master") {
      return (
        <EditableSimpleSpecificationInput
          name="specifications.basic_size"
          label="Basic Size"
          unit={currentUnit}
          value={specificationRecord?.basic_size}
          readOnly={readOnly}
          fieldError={getFieldError(errors, "specifications.basic_size")}
        />
      );
    }

    if (normalizedGaugeType === "surface plate") {
      return (
        <SurfacePlateType
          initialData={specificationRecord ?? undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "spline gauge" || normalizedGaugeType === "spline type gauge") {
      return (
        <SplineTypeGauge
          initialData={specificationRecord ?? undefined}
          readOnly={readOnly}
        />
      );
    }

    if (normalizedGaugeType === "thread gauge" || normalizedGaugeType === "thread") {
      return (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="text-center text-yellow-800">
            <p className="text-sm font-medium">Thread Gauge Component</p>
            <p className="text-xs mt-1">
              Component under development for: <strong>{gaugeType}</strong>
            </p>
          </div>
        </div>
      );
    }

    if (normalizedGaugeType === "no type") {
      return null;
    }

    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="text-center text-gray-600">
          <p className="text-sm">
            Unknown gauge type: <strong>{normalizedGaugeType}</strong>
          </p>
        </div>
      </div>
    );
  }
);

GaugeSpecificationRenderer.displayName = "GaugeSpecificationRenderer";

export default GaugeSpecificationRenderer;
