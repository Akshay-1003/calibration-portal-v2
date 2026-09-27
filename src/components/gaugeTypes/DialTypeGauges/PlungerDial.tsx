import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input, Select, SelectItem } from "@heroui-v2/react";
import { useDialTablesQuery } from "../../../hooks/queries/dialTables";
import { useDialReadingTableQuery } from "../../../hooks/queries/dialReadingTable";
import {
    DialTableMasterData,
} from "../../Tables/DialTableMasterListTable";
import SpecificationReadOnlyField from "../../specifications/SpecificationReadOnlyField";

interface PlungerDialProps {
    readOnly?: boolean;
    initialData?: {
        range?: { min?: number; max?: number };
        least_count?: number;
        reading_table_id?: string;
    };
}

export default function PlungerDial({ initialData, readOnly = false }: PlungerDialProps) {
    const { register, setValue, watch } = useFormContext();
    const dialTablesQuery = useDialTablesQuery() as { data?: DialTableMasterData[] };
    const data = dialTablesQuery.data ?? [];
    const specs = watch("specifications");
    const readingTableId = initialData?.reading_table_id || specs?.reading_table_id;
    const readingTableQuery = useDialReadingTableQuery(readingTableId);
    console.log("PlungerDial specs:", data, specs, readingTableId, readingTableQuery.data);
    useEffect(() => {
        if (readOnly) return;
        if (initialData) {
            setValue("specifications", {
                range: initialData.range || { min: undefined, max: undefined },
                least_count: initialData.least_count,
                reading_table_id: initialData.reading_table_id
            }, { shouldValidate: false });
        } else if (!specs || typeof specs !== "object" || Array.isArray(specs)) {
            setValue("specifications", {
                range: { min: undefined, max: undefined },
                least_count: undefined,
                reading_table_id: undefined
            });
        }
    }, [initialData, readOnly, setValue, specs]);

    if (readOnly) {
        const resolvedTableName =
            readingTableQuery.data?.table_name ||
            data.find((item) => item.id === readingTableId)?.table_name ||
            readingTableId;

        return (
            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                    Specifications
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SpecificationReadOnlyField label="Range From" value={initialData?.range?.min ?? specs?.range?.min} />
                    <SpecificationReadOnlyField label="Range To" value={initialData?.range?.max ?? specs?.range?.max} />
                    <SpecificationReadOnlyField label="Least Count" value={initialData?.least_count ?? specs?.least_count} />
                    <SpecificationReadOnlyField label="Dial Table" value={resolvedTableName} />
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">
                Specifications
            </h3>
            <Input
                {...register("specifications.range.min")}
                placeholder="0"
                size="sm"
                label="Range From"
                labelPlacement="outside"
                variant="bordered"
                classNames={{
                    label: "text-xs font-semibold text-gray-700 uppercase mb-1",
                }}
            />

            <Input
                {...register("specifications.range.max")}
                placeholder="100"
                size="sm"
                label="Range To"
                labelPlacement="outside"
                variant="bordered"
                classNames={{
                    label: "text-xs font-semibold text-gray-700 uppercase mb-1",
                }}
            />

            <Input
                {...register("specifications.least_count")}
                placeholder="0.01"
                size="sm"
                label="Least Count"
                labelPlacement="outside"
                variant="bordered"
                classNames={{
                    label: "text-xs font-semibold text-gray-700 uppercase mb-1",
                }}
            />

            <Select
                size="sm"
                label="Dial Table"
                labelPlacement="outside"
                placeholder="Select Dial Table"
                variant="bordered"
                selectedKeys={readingTableId ? [readingTableId] : []}
                onChange={(e) => setValue("specifications.reading_table_id", e.target.value)}
                classNames={{
                    label: "text-xs font-semibold text-gray-700 uppercase mb-1",
                }}
            >
                {data.map((item) => (
                    <SelectItem key={item.id}>
                        {item.table_name}
                    </SelectItem>
                ))}
            </Select>
        </div>
    );
}
