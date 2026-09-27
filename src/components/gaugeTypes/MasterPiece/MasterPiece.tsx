import { useEffect, useCallback } from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Input, Button } from "@heroui/react";
import { Plus, X } from "lucide-react";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface MasterPieceTableProps {
  basic_size?: boolean;
  readOnly?: boolean;
  initialData?: {
    basic_size?: (string | number)[];
  };
}

const normalizeBasicSizeRows = (value: unknown): (string | number)[] => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : [""];
  }

  if (value !== null && value !== undefined && String(value).trim() !== "") {
    return [value as string | number];
  }

  return [""];
};

export default function MasterPieceTable({ basic_size, readOnly = false, initialData }: MasterPieceTableProps) {
  void basic_size;

  const { control, setValue, watch } = useFormContext();
  const formUnit = watch("unit");
  const basicSizeRows = watch("specifications.basic_size");

  const specs = watch("specifications");

  useEffect(() => {
    if (readOnly) return;
    const sourceValue = initialData?.basic_size ?? specs?.basic_size;
    const normalizedRows = normalizeBasicSizeRows(sourceValue);
    const currentRows = normalizeBasicSizeRows(basicSizeRows);

    if (!Array.isArray(basicSizeRows) || JSON.stringify(normalizedRows) !== JSON.stringify(currentRows)) {
      setValue("specifications.basic_size", normalizedRows, { shouldValidate: false });
    }
  }, [basicSizeRows, initialData, readOnly, setValue, specs?.basic_size]);

  const handleAdd = useCallback(() => {
    const currentRows = Array.isArray(basicSizeRows) ? basicSizeRows : [];
    setValue("specifications.basic_size", [...currentRows, ""], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }, [basicSizeRows, setValue]);

  const handleRemove = useCallback(
    (index: number) => {
      const currentRows = Array.isArray(basicSizeRows) ? basicSizeRows : [];
      const nextRows = currentRows.filter((_: unknown, rowIndex: number) => rowIndex !== index);
      setValue("specifications.basic_size", nextRows, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    },
    [basicSizeRows, setValue]
  );

  const currentRows = Array.isArray(basicSizeRows) ? basicSizeRows : [""];

  if (readOnly) {
    const rows = Array.isArray(initialData?.basic_size)
      ? initialData.basic_size
      : Array.isArray(specs?.basic_size)
        ? specs.basic_size
        : [];

    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
          Specifications
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((value: string | number, index: number) => (
            <SpecificationReadOnlyField
              key={`basic-size-readonly-${index}`}
              label={`Basic Size ${index + 1} (${formUnit})`}
              value={value}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <label className="text-xs font-semibold text-gray-700 uppercase">Basic Size ({formUnit})</label>
      </div>

      <div className="space-y-2">
        {currentRows.map((_, index) => (
          <div key={`basic-size-${index}`} className="flex items-start gap-2">
            <div className="flex-shrink-0 w-8 h-9 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
            </div>
            
            <div className="flex-1">
                <Controller
                  name={`specifications.basic_size.${index}`}
                  control={control}
                  rules={{
                    required: "Basic size is required",
                    validate: (value) => {
                      if (value === null || value === undefined || String(value).trim() === "") {
                        return "Basic size is required";
                      }

                      const raw = String(value).trim();
                      const numeric = Number(raw);

                      if (Number.isNaN(numeric)) {
                        return "Enter a valid number";
                      }

                      const decimalPart = raw.split(".")[1];
                      if (decimalPart && decimalPart.length > 4) {
                        return "Maximum 4 digits allowed after decimal";
                      }

                      return true;
                    },
                  }}
                  render={({ field: controllerField, fieldState }) => (
                    <Input
                      {...controllerField}
                      value={controllerField.value ?? ""}
                      type="number"
                      step="0.0001"
                      inputMode="decimal"
                      size="sm"
                      placeholder="Enter size value"
                      variant="bordered"
                      isInvalid={!!fieldState.error}
                      errorMessage={fieldState.error?.message}
                      onChange={(e) => controllerField.onChange(e.target.value)}
                      onBlur={(event) => {
                        controllerField.onBlur();
                        const raw = event.target.value;
                        if (!raw) return;
                        const numeric = Number(raw);
                        if (Number.isNaN(numeric)) return;
                        controllerField.onChange(numeric.toFixed(4));
                      }}
                    />
                  )}
                />
              </div>

            {currentRows.length > 1 && (
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={() => handleRemove(index)}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          variant="flat"
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={handleAdd}
          className="w-full sm:w-auto"
        >
          Add More Size
        </Button>
      </div>
    </div>
  );
}
