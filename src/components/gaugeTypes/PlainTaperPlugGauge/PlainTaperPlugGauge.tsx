import React, { useCallback, useState, useEffect, useRef } from "react";
import { useFormContext, Controller, useWatch } from "react-hook-form";
import { Input, Button } from "@heroui/react";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { fixedTo4Digit } from "../../../utils/formathelper";

interface PlainTaperPlugGaugeProps {
  isSubmitting?: boolean;
  isProgrammatic?: React.RefObject<boolean>;
  readOnly?: boolean;
  initialData?: any; // Replace 'any' with the actual type of your initial data if available
}

interface SpecificationData {
  taper_angle?: string;
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
    go?: string;
    no_go?: string;
  };
}

interface ApiSpecResponse {
  go?: { basic_size: number; specification_limit_max: number; specification_limit_min: number; wear_limit?: number };
  no_go?: { basic_size: number; specification_limit_max: number; specification_limit_min: number };
}

const isValidDecimalString = (s: string | undefined) => {
  if (s === undefined) return false;
  const trimmed = String(s).trim();
  if (trimmed === "") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed) === false) return false;
  if (trimmed.endsWith(".")) return false;
  return true;
};
const formatDecimalToFixed3 = (s: string) => {
  const n = parseFloat(s);
  return n.toFixed(3);
};

const buildSpecificationsPayload = (specifications: SpecificationData | undefined) => {
  if (!specifications) return {};
  
  const payload: any = {};
  
  // Include taper_angle if it exists and is not empty
  if (specifications.taper_angle && specifications.taper_angle.trim() !== '') {
    payload.taper_angle = specifications.taper_angle.trim();
  }
  
  // Include Go specifications if they exist
  if (specifications.go && (
    specifications.go.basic_size !== undefined ||
    specifications.go.specification_limit_max !== undefined ||
    specifications.go.specification_limit_min !== undefined ||
    specifications.go.wear_limit !== undefined
  )) {
    payload.go = specifications.go;
  }
  
  // Include No Go specifications if they exist
  if (specifications.no_go && (
    specifications.no_go.basic_size !== undefined ||
    specifications.no_go.specification_limit_max !== undefined ||
    specifications.no_go.specification_limit_min !== undefined
  )) {
    payload.no_go = specifications.no_go;
  }
  
  // Include inputs if they exist (for form state)
  if (specifications.inputs) {
    payload.inputs = specifications.inputs;
  }
  
  return payload;
};

void buildSpecificationsPayload;

function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T, delay = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => cbRef.current(...args), delay);
  }, [delay]) as T;
}

const PlainTaperPlugGauge: React.FC<PlainTaperPlugGaugeProps> = ({
  isSubmitting = false,
  isProgrammatic = { current: false },
  readOnly = false,
  initialData,    
}) => {
  void readOnly;
  void initialData;
  const { control, watch, setValue } = useFormContext();
  
  const unit = watch('unit') || 'mm';
  const specifications = useWatch({ control, name: "specifications" }) as SpecificationData | undefined;
  const watchedInputs = useWatch({ control, name: "specifications.inputs" }) as SpecificationData["inputs"] | undefined;
  
  const [loading, setLoading] = useState(false);
  const [inputErrors, setInputErrors] = useState<{ go?: string; noGo?: string }>({});
  const [showGoNoGo, setShowGoNoGo] = useState(false);
  const isInitializingRef = useRef<boolean>(true);
  const hasExistingSpecsRef = useRef<boolean>(false);
  const userInteractionRef = useRef<boolean>(false);
  const previousPayloadRef = useRef<string>("");

  useEffect(() => {
    const hasExistingGo = specifications?.go?.specification_limit_max !== undefined &&
      specifications?.go?.specification_limit_min !== undefined;
    const hasExistingNoGo = specifications?.no_go?.specification_limit_max !== undefined &&
      specifications?.no_go?.specification_limit_min !== undefined;

    const hadExistingSpecs = hasExistingSpecsRef.current;
    hasExistingSpecsRef.current = hasExistingGo || hasExistingNoGo;

    if (hadExistingSpecs && !hasExistingSpecsRef.current) {
      userInteractionRef.current = false;
    }

    if (isProgrammatic?.current) {
      isInitializingRef.current = true;
      if (!hasExistingSpecsRef.current) {
        userInteractionRef.current = false;
      }
      const timer = setTimeout(() => {
        isInitializingRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        isInitializingRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [specifications, isProgrammatic]);

  const rawCallApi = useCallback(async (payload: { method: string; inputs: { go: number; no_go: number }; diameter_type: string }) => {
    try {
      const resp = await apiClient.post("/od-limit/specifications", payload) as ApiSpecResponse;
      if (resp?.go) {
        setValue("specifications.go" as const, {
          basic_size: fixedTo4Digit(resp.go.basic_size),
          specification_limit_max: fixedTo4Digit(resp.go.specification_limit_max),
          specification_limit_min: fixedTo4Digit(resp.go.specification_limit_min),
          wear_limit: resp.go.wear_limit != null ? fixedTo4Digit(resp.go.wear_limit) : fixedTo4Digit(resp.go.basic_size),
        });
      }
      if (resp?.no_go) {
        setValue("specifications.no_go" as const, {
          basic_size: fixedTo4Digit(resp.no_go.basic_size),
          specification_limit_max: fixedTo4Digit(resp.no_go.specification_limit_max),
          specification_limit_min: fixedTo4Digit(resp.no_go.specification_limit_min),
        });
      }
      toast.success("✅ Table calculated successfully");
    } catch (err) {
      console.error("Calculation API error", err);
      toast.error("Calculation failed. Try again.");
    }
  }, [setValue]);

  const debouncedApiCall = useDebouncedCallback(async (payload: { method: string; inputs: { go: number; no_go: number }; diameter_type: string }) => {
    const key = JSON.stringify(payload);
    if (key === previousPayloadRef.current) return;
    previousPayloadRef.current = key;
    
    setLoading(true);
    try {
      await rawCallApi(payload);
    } finally {
      setLoading(false);
    }
  }, 700);

  useEffect(() => {
    // Only validate if Go/No-Go section is visible
    if (!showGoNoGo) {
      setInputErrors({});
      return;
    }

    const goStr = watchedInputs?.go;
    const noStr = watchedInputs?.no_go;
    const goValid = isValidDecimalString(goStr);
    const noValid = isValidDecimalString(noStr);
    setInputErrors({
      go: goValid ? undefined : (goStr ? "Enter valid Go basic size" : undefined),
      noGo: noValid ? undefined : (noStr ? "Enter valid No Go basic size" : undefined),
    });
  }, [watchedInputs, showGoNoGo]);

  useEffect(() => {
    // Only trigger API calls if Go/No-Go section is visible
    if (!showGoNoGo) {
      return;
    }

    if (isProgrammatic?.current || isSubmitting || isInitializingRef.current) {
      return;
    }

    if (hasExistingSpecsRef.current && !userInteractionRef.current) {
      return;
    }

    const goStr = watchedInputs?.go;
    const noStr = watchedInputs?.no_go;
    const goValid = isValidDecimalString(goStr);
    const noValid = isValidDecimalString(noStr);

    if (goValid && noValid) {
      const goNum = parseFloat(formatDecimalToFixed3(goStr!));
      const noNum = parseFloat(formatDecimalToFixed3(noStr!));
      const payload = {
        method: "direct_go_no_go",
        inputs: { go: goNum, no_go: noNum },
        diameter_type: "outer"
      };
      debouncedApiCall(payload);
    }
  }, [watchedInputs, debouncedApiCall, isProgrammatic, isSubmitting, showGoNoGo]);

  return (
    <div className="space-y-4">
      <div className="w-full bg-gray-100 border rounded-md px-3 py-3 sm:px-5 sm:py-4">
        <Controller
          name="specifications.taper_angle"
          control={control}
          render={({ field }) => (
            <Input
              type="text"
              placeholder="e.g., 45° or 30° 15' 20' or 1/2 14 NPTF"
              label="Specifications / Taper Angle (Included Angle)"
              labelPlacement="outside"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              disabled={isSubmitting}
              classNames={{
                inputWrapper:
                  "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
              }}
            />
          )}
        />
      </div>

      {/* Button to toggle Go/No-Go section */}
      {!showGoNoGo && (
        <div className="flex justify-center">
          <Button
            color="primary"
            variant="flat"
            onPress={() => setShowGoNoGo(true)}
            className="font-medium"
          >
            + Add Go/No-Go Specifications
          </Button>
        </div>
      )}

      {/* Go/No-Go Input Section */}
      {showGoNoGo && (
        <>
          <div className="w-full bg-gray-100 border rounded-md px-3 py-3 sm:px-5 sm:py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">Go Basic Size ({unit})</label>
                <Input
                  type="text"
                  placeholder="Enter Go basic size"
                  value={watchedInputs?.go ?? ''}
                  onChange={(e) => {
                    userInteractionRef.current = true;
                    setValue("specifications.inputs.go", e.target.value);
                  }}
                  disabled={isSubmitting || loading}
                  classNames={{
                    inputWrapper: inputErrors.go
                      ? "bg-white border border-red-500 hover:border-red-600 focus:border-red-600 shadow-none"
                      : "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                  }}
                />
                {inputErrors.go && <div className="text-xs text-red-600 mt-1">{inputErrors.go}</div>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">No Go Basic Size ({unit})</label>
                <Input
                  type="text"
                  placeholder="Enter No Go basic size"
                  value={watchedInputs?.no_go ?? ''}
                  onChange={(e) => {
                    userInteractionRef.current = true;
                    setValue("specifications.inputs.no_go", e.target.value);
                  }}
                  disabled={isSubmitting || loading}
                  classNames={{
                    inputWrapper: inputErrors.noGo
                      ? "bg-white border border-red-500 hover:border-red-600 focus:border-red-600 shadow-none"
                      : "bg-white border border-gray-300 hover:border-gray-400 focus:border-primary shadow-none",
                  }}
                />
                {inputErrors.noGo && <div className="text-xs text-red-600 mt-1">{inputErrors.noGo}</div>}
              </div>
            </div>
            {loading && (
              <div className="mt-3 text-sm text-blue-600 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </div>
            )}
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <div className="bg-gray-700 text-white">
          <div className="grid grid-cols-5 text-center text-xs font-medium">
            <div className="p-2.5 border-r">PARAMETER ({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">BASIC SIZE ({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">SPECIFICATION LIMIT MAX({unit.toUpperCase()})</div>
            <div className="p-2.5 border-r">SPECIFICATION LIMIT MIN({unit.toUpperCase()})</div>
            <div className="p-2.5">WEAR LIMIT ({unit.toUpperCase()})</div>
          </div>
        </div>

        {/* GO */}
        <div className="grid grid-cols-5 border-b">
          <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">
            Go
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.go?.basic_size !== undefined ? specifications.go.basic_size : '-'}
            </span>
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.go?.specification_limit_max !== undefined ? specifications.go.specification_limit_max : '-'}
            </span>
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.go?.specification_limit_min !== undefined ? specifications.go.specification_limit_min : '-'}
            </span>
          </div>
          <div className="p-2.5 bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.go?.wear_limit !== undefined ? specifications.go.wear_limit : '-'}
            </span>
          </div>
        </div>

        {/* NO GO */}
        <div className="grid grid-cols-5">
          <div className="p-2.5 border-r flex items-center text-sm font-medium text-foreground/70 bg-muted/30">
            No Go
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.no_go?.basic_size !== undefined ? specifications.no_go.basic_size : '-'}
            </span>
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.no_go?.specification_limit_max !== undefined ? specifications.no_go.specification_limit_max : '-'}
            </span>
          </div>
          <div className="p-2.5 border-r bg-background flex items-center">
            <span className="text-sm text-gray-900">
              {specifications?.no_go?.specification_limit_min !== undefined ? specifications.no_go.specification_limit_min : '-'}
            </span>
          </div>
          <div className="p-2.5 bg-background flex items-center justify-center">
            {loading ? (
              <span className="text-xs text-gray-500">Calculating...</span>
            ) : (
              <span className="text-xs text-gray-400">Auto-calculated</span>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default PlainTaperPlugGauge;
