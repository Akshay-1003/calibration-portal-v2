// src/components/LimitGuageTable/GradeInputs.tsx
import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "../../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../ui/select";
import type { UseFormSetValue } from "react-hook-form";
import type { Specifications } from "../../../types"; // optional central types

/* Props */
interface GradeInputsProps {
    watchedInputs?: NonNullable<Specifications["inputs"]>["inputs"];
    setValue: UseFormSetValue<any>;
    onUserInteraction?: () => void;
}
const GradeInputs: React.FC<GradeInputsProps> = ({ watchedInputs, setValue, onUserInteraction }) => {
    const { watch } = useFormContext();
    const unit = watch('unit') || 'mm';
    
    return (
        <div className="space-y-3 p-3 bg-white rounded-lg border border-gray-200 mt-3">
            <h4 className="text-sm font-medium text-gray-800">Grade Method Parameters</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diameter ({unit})</label>
                    <Input
                        type="number"
                        step="0.0001"
                        value={watchedInputs?.diameter ?? ""}
                        onChange={(e) => {
                            onUserInteraction?.();
                            setValue("specifications.inputs.inputs.diameter" as const, e.target.value === "" ? undefined : Number(e.target.value));
                        }}
                        placeholder="Enter diameter"
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                    <Select
                        value={watchedInputs?.grade ?? ""}
                        onValueChange={(v: string | null) => {
                            onUserInteraction?.();
                            setValue("specifications.inputs.inputs.grade" as const, v ?? "");
                        }}
                    >
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="H5">H5</SelectItem>
                            <SelectItem value="H6">H6</SelectItem>
                            <SelectItem value="H7">H7</SelectItem>
                            <SelectItem value="H8">H8</SelectItem>
                            <SelectItem value="H9">H9</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
};

export default GradeInputs;
