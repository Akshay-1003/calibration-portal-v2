import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input, Label, ListBox, Select } from "@heroui/react";
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
            <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
                Range From
                <Input {...register("specifications.range.min")} placeholder="0" className="border border-gray-300" />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
                Range To
                <Input {...register("specifications.range.max")} placeholder="100" className="border border-gray-300" />
            </label>

            <label className="flex flex-col gap-2 text-xs font-semibold uppercase text-gray-700">
                Least Count
                <Input {...register("specifications.least_count")} placeholder="0.01" className="border border-gray-300" />
            </label>

            <Select selectedKey={readingTableId || null} placeholder="Select Dial Table" onSelectionChange={(key) => setValue("specifications.reading_table_id", key as string)}>
                <Label>Dial Table</Label>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                    <ListBox>
                {data.map((item) => (
                    <ListBox.Item key={item.id} id={item.id} textValue={item.table_name}>
                        {item.table_name}
                        <ListBox.ItemIndicator />
                    </ListBox.Item>
                ))}
                    </ListBox>
                </Select.Popover>
            </Select>
        </div>
    );
}
