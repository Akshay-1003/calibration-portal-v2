// src/components/LimitGuageTable/index.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import GradeInputs from "./GradeInputs";
import ToleranceInputs from "./ToleranceMethod";
import DirectInputs from "./DirectMethod";
import SpecTable from "./SepcTable";
import { fixedTo4Digit } from "../../../utils/formathelper";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";
interface SpecificationData {
    range?: {
        min?: number | string;
        max?: number | string;
    };
    least_count?: number | string;
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

interface FormData {
    unit?: string;
    specifications?: SpecificationData;
}

/* --- Payload types --- */
type TolerancePayload = { method: "tolerance"; inputs: { basic_size: number; upper_tolerance: number; lower_tolerance: number }; diameter_type?: "inner" | "outer" };
type GradePayload = { method: "grade"; inputs: { diameter: number; grade: string }; diameter_type?: "inner" | "outer" };
type DirectPayload = { method: "direct_go_no_go"; inputs: { go: number; no_go: number }; diameter_type?: "inner" | "outer" };
type SpecPayload = TolerancePayload | GradePayload | DirectPayload;

interface ApiSpecResponse {
    go?: { basic_size: number; specification_limit_max: number; specification_limit_min: number; wear_limit?: number };
    no_go?: { basic_size: number; specification_limit_max: number; specification_limit_min: number };
    inputs?: { inputs: { basic_size: number; lower_tolerance: number } };
}

const fixedNumber = (value?: number | null): number | undefined => {
    const formatted = fixedTo4Digit(value);
    return formatted === "" ? undefined : Number(formatted);
};

interface CalculationRequestOptions {
    showSuccessToast?: boolean;
}

export const buildDirectPayload = (go: number, noGo: number, diameterType?: "inner" | "outer"): DirectPayload => ({
    method: "direct_go_no_go",
    inputs: { go, no_go: noGo },
    ...(diameterType && { diameter_type: diameterType }),
});

/* --- debounce hook --- */
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

/* --- validators --- */
const isValidCompleteNumber = (v: any): boolean => {
    if (v === undefined || v === null) return false;
    const s = String(v).trim();
    if (s === "" || s === ".") return false;
    if (s.endsWith(".")) return false;
    const n = Number(s);
    return !isNaN(n) && isFinite(n);
};

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
    if (!isFinite(n)) return s;
    return n.toFixed(3);
};

/* --- main component --- */
interface LimitGuageTableProps {
    isSubmitting?: boolean;
    isProgrammatic?: React.RefObject<boolean>;
    isMethod?: string;
    gaugeType?: string | null;
    readOnly?: boolean;
    showCalculatedTable?: boolean;
}

const LimitGuageTable: React.FC<LimitGuageTableProps> = ({
    isSubmitting = false,
    isProgrammatic = { current: false },
    isMethod = '',
    gaugeType = null,
    readOnly = false,
    showCalculatedTable = true,
}) => {
    const { control, setValue, getValues } = useFormContext<FormData>();
    const unit = useWatch({ control, name: "unit" }) || "mm";

    const specifications = useWatch({ control, name: "specifications" }) as FormData["specifications"];
    const watchedInputs = useWatch({ control, name: "specifications.inputs.inputs" }) as NonNullable<SpecificationData["inputs"]>["inputs"] | undefined;
    const method = specifications?.inputs?.method ?? isMethod ?? "";

    const previousPayloadRef = useRef<string>("");
    const isInitializingRef = useRef<boolean>(true);
    const hasExistingSpecsRef = useRef<boolean>(false);
    const userInteractionRef = useRef<boolean>(false);

    // Determine diameter type from gauge type
    const diameterType = React.useMemo(() => {
        if (!gaugeType) return undefined;
        const type = gaugeType.toLowerCase().trim();
        if (type.includes('id limit') || type.includes('inner')) {
            return "inner" as const;
        }
        if (type.includes('od limit') || type.includes('outer')) {
            return "outer" as const;
        }
        return undefined;
    }, [gaugeType]);

    /* --- API call --- */
    const rawCallApi = useCallback(async (payload: SpecPayload, options?: CalculationRequestOptions) => {
        try {
            // Add diameter_type to payload if not already present
            const payloadWithDiameterType = diameterType
                ? { ...payload, diameter_type: diameterType }
                : payload;

            const resp = await apiClient.post("/od-limit/specifications", payloadWithDiameterType) as ApiSpecResponse;
            if (resp?.go) {
                setValue("specifications.go" as const, {
                    basic_size: fixedNumber(resp.go.basic_size),
                    specification_limit_max: fixedNumber(resp.go.specification_limit_max),
                    specification_limit_min: fixedNumber(resp.go.specification_limit_min),
                    wear_limit: resp.go.wear_limit == null && resp.inputs
                      ? fixedNumber(resp.inputs.inputs.basic_size - Math.abs(resp.inputs.inputs.lower_tolerance))
                      : fixedNumber(resp.go.wear_limit),
                });
            }
            if (resp?.no_go) {
                setValue("specifications.no_go" as const, {
                    basic_size: fixedNumber(resp.no_go.basic_size),
                    specification_limit_max: fixedNumber(resp.no_go.specification_limit_max),
                    specification_limit_min: fixedNumber(resp.no_go.specification_limit_min),
                });
            }
            if (options?.showSuccessToast) {
                toast.success("✅ Table refreshed with backend calculation");
            }
        } catch (err) {
            console.error("Calculation API error", err);
            toast.error("Calculation failed. Try again.");
        }
    }, [setValue, diameterType]);

    const getPayloadKey = useCallback((payload: SpecPayload) => {
        return JSON.stringify(payload);
    }, []);

    const debouncedApiCall = useDebouncedCallback(async (payload: SpecPayload) => {
        const key = getPayloadKey(payload);
        if (key === previousPayloadRef.current) return;
        previousPayloadRef.current = key;
        await rawCallApi(payload);
    }, 700);

    const [directLoading, setDirectLoading] = useState(false);
    const debouncedDirectCall = useDebouncedCallback(async (payload: DirectPayload) => {
        const key = getPayloadKey(payload);
        if (key === previousPayloadRef.current) return;
        previousPayloadRef.current = key;
        setDirectLoading(true);
        try {
            await rawCallApi(payload);
        } finally {
            setDirectLoading(false);
        }
    }, 300);

    const [tableErrors, setTableErrors] = useState<{
        go?: Record<string, string>;
        no_go?: Record<string, string>;
    }>({});

    /* --- Track initialization and existing specs --- */
    useEffect(() => {
        if (readOnly) return;
        // Check if we have existing specifications (from editing existing gauge)
        // Existing specs have calculated values (specification_limit_max/min), not just inputs
        const hasExistingGo = specifications?.go?.specification_limit_max !== undefined &&
            specifications?.go?.specification_limit_min !== undefined;
        const hasExistingNoGo = specifications?.no_go?.specification_limit_max !== undefined &&
            specifications?.no_go?.specification_limit_min !== undefined;

        const hadExistingSpecs = hasExistingSpecsRef.current;
        hasExistingSpecsRef.current = hasExistingGo || hasExistingNoGo;

        // If specs were cleared (reset), reset user interaction flag
        if (hadExistingSpecs && !hasExistingSpecsRef.current) {
            userInteractionRef.current = false;
        }

        // Mark initialization complete after a short delay
        // This allows form to settle after programmatic updates
        if (isProgrammatic?.current) {
            isInitializingRef.current = true;
            // Only reset user interaction if we're actually resetting (specs cleared)
            if (!hasExistingSpecsRef.current) {
                userInteractionRef.current = false;
            }
            const timer = setTimeout(() => {
                isInitializingRef.current = false;
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // For non-programmatic updates, mark as initialized after first render
            const timer = setTimeout(() => {
                isInitializingRef.current = false;
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [readOnly, specifications, isProgrammatic]);

    /* --- effect: auto-calc based on watchedInputs & method --- */
    useEffect(() => {
        if (readOnly) return;
        // GUARD 1: Don't call API during initialization, submission, or programmatic updates
        if (isProgrammatic?.current || isSubmitting || isInitializingRef.current) {
            return;
        }

        // GUARD 2: Only proceed if method is selected
        if (!method) {
            return;
        }

        // GUARD 3: For existing gauges with complete specs, only call API if user made changes
        // For new gauges (no existing specs), allow API calls when inputs are filled
        if (hasExistingSpecsRef.current && !userInteractionRef.current) {
            return;
        }

        if (method === "tolerance") {
            const basic = watchedInputs?.basic_size;
            const upper = watchedInputs?.upper_tolerance;
            const lower = watchedInputs?.lower_tolerance;
            if (isValidCompleteNumber(basic) && isValidCompleteNumber(upper) && isValidCompleteNumber(lower)) {
                const payload: TolerancePayload = {
                    method: "tolerance",
                    inputs: {
                        basic_size: Number(basic),
                        upper_tolerance: Number(upper),
                        lower_tolerance: Number(lower),
                    },
                    ...(diameterType && { diameter_type: diameterType }),
                };
                debouncedApiCall(payload);
            }
        } else if (method === "grade") {
            const diameter = watchedInputs?.diameter;
            const grade = watchedInputs?.grade;
            if (isValidCompleteNumber(diameter) && grade) {
                const payload: GradePayload = {
                    method: "grade",
                    inputs: {
                        diameter: Number(diameter),
                        grade,
                    },
                    ...(diameterType && { diameter_type: diameterType }),
                };
                debouncedApiCall(payload);
            }
        } else if (method === "direct_go_no_go") {
            const hasLegacyKeys = watchedInputs && ("go_basic_size" in (watchedInputs as Record<string, unknown>) || "no_go_basic_size" in (watchedInputs as Record<string, unknown>));
            if (hasLegacyKeys) {
                toast.error("Invalid input keys detected. Use 'go' and 'no_go' only.");
                return;
            }
            const goStr = watchedInputs?.go;
            const noStr = watchedInputs?.no_go;
            const goValid = isValidDecimalString(goStr);
            const noValid = isValidDecimalString(noStr);
            // keep errors in child -> but we set some here for safety
            if (goValid && noValid) {
                const goNum = parseFloat(formatDecimalToFixed3(goStr!));
                const noNum = parseFloat(formatDecimalToFixed3(noStr!));
                const payload = {
                    ...buildDirectPayload(goNum, noNum),
                    ...(diameterType && { diameter_type: diameterType }),
                };
                debouncedDirectCall(payload);
            }
        }
    }, [watchedInputs, method, debouncedApiCall, debouncedDirectCall, isProgrammatic, isSubmitting, diameterType, readOnly]);

    /* --- manual calculate handler used by ToleranceInputs -> calls API immediately --- */
    const handleManualCalculate = useCallback(async () => {
        if (!method) return toast.error("Select a method first.");
        if (method === "tolerance") {
            const basic = getValues("specifications.inputs.inputs.basic_size");
            const upper = getValues("specifications.inputs.inputs.upper_tolerance");
            const lower = getValues("specifications.inputs.inputs.lower_tolerance");
            if (!isValidCompleteNumber(basic) || !isValidCompleteNumber(upper) || !isValidCompleteNumber(lower)) {
                return toast.error("Fill all three tolerance inputs with valid numbers before calculating.");
            }
            const payload: TolerancePayload = {
                method: "tolerance",
                inputs: {
                    basic_size: Number(basic),
                    upper_tolerance: Number(upper),
                    lower_tolerance: Number(lower),
                },
                ...(diameterType && { diameter_type: diameterType }),
            };
            await rawCallApi(payload, { showSuccessToast: true });
        } else if (method === "grade") {
            const diameter = getValues("specifications.inputs.inputs.diameter");
            const grade = getValues("specifications.inputs.inputs.grade");
            if (!isValidCompleteNumber(diameter) || !grade) return toast.error("Provide diameter and grade.");
            const payload: GradePayload = {
                method: "grade",
                inputs: { diameter: Number(diameter), grade },
                ...(diameterType && { diameter_type: diameterType }),
            };
            await rawCallApi(payload, { showSuccessToast: true });
        }
        // 'direct_go_no_go' manual button is not required because auto debounced call handles it.
    }, [method, getValues, rawCallApi, diameterType]);

    /* --- handle changes to basic sizes in the table (Go / NoGo) --- */
    const handleTablebasic_sizeChange = useCallback((type: "go" | "nogo", rawValue: string) => {
        userInteractionRef.current = true;
        const s = rawValue.trim();

        // Clear error when value is empty
        if (s === "") {
            setTableErrors(prev => ({
                ...prev,
                [type === "go" ? "go" : "no_go"]: {
                    ...prev[type === "go" ? "go" : "no_go"],
                    basic_size: undefined
                }
            }));
            if (type === "go") setValue("specifications.go.basic_size" as const, undefined);
            else setValue("specifications.no_go.basic_size" as const, undefined);
            return;
        }

        // Validate and set error if invalid
        if (!isValidDecimalString(s)) {
            setTableErrors(prev => ({
                ...prev,
                [type === "go" ? "go" : "no_go"]: {
                    ...prev[type === "go" ? "go" : "no_go"],
                    basic_size: "Please enter a valid number"
                }
            }));
            return;
        }

        // Clear error on valid input
        setTableErrors(prev => ({
            ...prev,
            [type === "go" ? "go" : "no_go"]: {
                ...prev[type === "go" ? "go" : "no_go"],
                basic_size: undefined
            }
        }));

        const valueNum = Number(s);
        if (type === "go") setValue("specifications.go.basic_size" as const, valueNum);
        else setValue("specifications.no_go.basic_size" as const, valueNum);

        if (method === "tolerance") {
            const originalBasic = getValues("specifications.inputs.inputs.basic_size");
            if (!isValidCompleteNumber(originalBasic)) {
                toast.error("Please set original basic size (inputs.basic_size) first.");
                return;
            }
            const original = Number(originalBasic);

            if (type === "go") {
                const newLower = Number((original - valueNum).toFixed(6));
                setValue("specifications.inputs.inputs.lower_tolerance" as const, newLower);
            } else {
                const newUpper = Number((original - valueNum).toFixed(6));
                setValue("specifications.inputs.inputs.upper_tolerance" as const, newUpper);
            }
            // setting inputs triggers the useEffect -> debounced API
        }
    }, [method, getValues, setValue]);

    /* --- UI helpers --- */
    const dataColumns = ["basic_size", "specMax", "specMin", "wearLimit"] as const;
    const getColumnDisplayName = (k: string) =>
        k === "basic_size" ? "Basic Size" : k === "specMax" ? "Spec Limit Max" : k === "specMin" ? "Spec Limit Min" : k === "wearLimit" ? "Wear Limit" : k;
    const getPlaceholderText = (k: string) =>
        k === "basic_size" ? "basic size" : k === "specMax" ? "spec limit max" : k === "specMin" ? "spec limit min" : k === "wearLimit" ? "wear limit" : k;

    if (readOnly) {
        const range = specifications?.range;
        const inputs = specifications?.inputs?.inputs;
        console.log('specifications',typeof specifications)
        const detailFields = [
            {
                label: `Range From (${unit})`,
                value: range?.min,
            },
            {
                label: `Range To (${unit})`,
                value: range?.max,
            },
            {
                label: `Least Count (${unit})`,
                value: specifications?.least_count,
            },
            {
                label: "Method",
                value: method ? method.replace(/_/g, " ") : undefined,
            },
            {
                label: `Basic Size (${unit})`,
                value: inputs?.basic_size,
            },
            {
                label: `Upper Tolerance (${unit})`,
                value: inputs?.upper_tolerance,
            },
            {
                label: `Lower Tolerance (${unit})`,
                value: inputs?.lower_tolerance,
            },
            {
                label: `Diameter (${unit})`,
                value: inputs?.diameter,
            },
            {
                label: "Grade",
                value: inputs?.grade,
            },
            {
                label: `Go (${unit})`,
                value: inputs?.go,
            },
            {
                label: `No Go (${unit})`,
                value: inputs?.no_go,
            },
        ].filter((field) => field.value !== undefined && field.value !== null && field.value !== "");
        return (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                    Specifications
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {detailFields.map((field) => (
                        <SpecificationReadOnlyField
                            key={field.label}
                            label={field.label}
                            value={field.value}
                        />
                    ))}
                </div>
                {detailFields.length === 0 ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        No specification details available.
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Calibration Method</label>
                <Select
                    value={method}
                    onValueChange={(v: string | null) => {
                        userInteractionRef.current = true;
                        setValue("specifications.inputs.method" as const, v ?? "");
                        if (v === "direct_go_no_go") toast.info("Direct method chosen; enter Go and No Go sizes.");
                    }}
                >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select calibration method" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="grade">Grade Method</SelectItem>
                        <SelectItem value="tolerance">Tolerance Method</SelectItem>
                        <SelectItem value="direct_go_no_go">Direct Go/No-Go Method</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {method === "grade" && <GradeInputs
                watchedInputs={watchedInputs as any}
                setValue={setValue}
                onUserInteraction={() => { userInteractionRef.current = true; }}
            />}

            {(method === "tolerance" || method === "direct_go_no_go") && (
                <>
                    {method === "tolerance" && (
                        <ToleranceInputs
                            watchedInputs={watchedInputs as any}
                            setValue={setValue}
                            onManualCalculate={async () => {
                                userInteractionRef.current = true;
                                await handleManualCalculate();
                            }}
                            onUserInteraction={() => { userInteractionRef.current = true; }}
                        />
                    )}
                    {method === "direct_go_no_go" && <DirectInputs
                        watchedInputs={watchedInputs}
                        setValue={setValue}
                        loading={directLoading}
                        onUserInteraction={() => { userInteractionRef.current = true; }}
                    />}
                    {showCalculatedTable ? (
                        <div className="mt-4">
                            <SpecTable
                                specifications={specifications}
                                handleTablebasic_sizeChange={handleTablebasic_sizeChange}
                                setValue={setValue}
                                dataColumns={dataColumns}
                                getColumnDisplayName={getColumnDisplayName}
                                getPlaceholderText={getPlaceholderText}
                                editable={method !== "direct_go_no_go"}
                                errors={tableErrors}
                            />
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
};

export default LimitGuageTable;
