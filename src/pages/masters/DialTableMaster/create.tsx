"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { FormField } from "../../../components/ui/form-field";
import {
  Input,
  Select,
  SelectItem,
  Button,
  Checkbox,
  Spinner,
} from "@heroui-v2/react";
import { useNavigate, useParams } from "react-router-dom";
import { useDialTable } from "../../../hooks/useDialTableMaster";
import { useQueryClient } from "@tanstack/react-query";
import { dialTableKeys } from "../../../hooks/queries/dialTables";

/* ---------------- Types ---------------- */

interface FormValues {
  range: number;
  travel: number;
  dial_type: "plunger" | "lever";
  table_name: string;
}

interface ReadingRow {
  turn: number;
  range: number;
  value: number;
  selected: boolean;
}

interface DialTableResponse {
  reading_table: {
    turn: number;
    range: number;
    value: number;
  }[];
}

interface StoredReadingRow {
  turn: number;
  range: number;
  value: number;
}

/* ---------------- Component ---------------- */

export default function DialTableMasterForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  /* ---------- Form ---------- */
  const {
    control,
    handleSubmit,
    setValue,
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      range: 0,
      travel: 0,
      dial_type: "plunger",
      table_name: "",
    },
  });

  /* ---------- State ---------- */
  const [tableData, setTableData] = useState<ReadingRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasTable = tableData.length > 0;

  /* ---------- Edit Mode Load ---------- */
  const { data } = useDialTable(id);

  useEffect(() => {
    if (!data) return;

    reset({
      range: data.range,
      travel: data.travel,
      dial_type: data.dial_type,
      table_name: data.table_name,
    });

    if (data.reading_table?.length) {
      setTableData(
        data.reading_table.map((r: StoredReadingRow) => ({
          ...r,
          selected: true,
        }))
      );
    }
  }, [data, reset]);

  /* ---------- Generate ---------- */
  const onGenerate = async (form: FormValues) => {
    try {
      setIsGenerating(true);

      console.log("Generate payload:", form);

      const res = await apiClient.get<DialTableResponse>(
        "/generate/dial-reading-table",
        {
          
            max_range: form.range,
            travel: form.travel,
        
        }
      );

      const rows: ReadingRow[] = res.reading_table.map((r) => ({
        ...r,
        selected: true,
      }));

      setTableData(rows);
      toast.success("Dial reading table generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate table");
    } finally {
      setIsGenerating(false);
    }
  };

  /* ---------- Save ---------- */
  const selectedRows = useMemo(
    () => tableData.filter((r) => r.selected),
    [tableData]
  );

  const onSave = async (form: FormValues) => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one reading");
      return;
    }

    try {
      const payload = {
        dial_type: form.dial_type,
        table_name: form.table_name,
        range: form.range,
        travel: form.travel,
        reading_table: selectedRows.map((row) => ({
          turn: row.turn,
          range: row.range,
          value: row.value,
        })),
      };

      if (isEditMode && id) {
        await apiClient.put(`/dial-reading-table/${id}`, payload);
      } else {
        await apiClient.post("/dial-reading-table", payload);
      }

      await queryClient.invalidateQueries({
        queryKey: dialTableKeys.all,
      });
      await queryClient.invalidateQueries({
        queryKey: ["dial-reading-table"],
      });
      if (id) {
        queryClient.removeQueries({
          queryKey: ["dial-reading-table", id],
        });
      }

      toast.success(isEditMode ? "Dial table updated successfully" : "Dial table saved successfully");
      navigate("/masters/dial-table-master");
    } catch (err) {
      console.error(err);
      toast.error(isEditMode ? "Failed to update dial table" : "Failed to save dial table");
    }
  };

  /* ---------- Table Helpers ---------- */
  const toggleRow = (index: number) => {
    setTableData((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row
      )
    );
  };

  /* ---------- JSX ---------- */
  return (
    <div className="space-y-4">
      <Button onPress={() => navigate(-1)}>Back</Button>

      {/* -------- Generate -------- */}
      <div className="shadow border rounded-xl bg-white">
        <div className={`${isEditMode ? "bg-amber-500" : "bg-blue-600"} text-white px-4 py-3 rounded-t-xl text-xl font-semibold flex items-center justify-between`}>
          <span>Generate Dial Reading Table</span>
          {isEditMode && (
            <span className="text-xs font-semibold bg-amber-700/80 px-2 py-1 rounded-md">
              Edit Mode
            </span>
          )}
        </div>

        <form
          onSubmit={handleSubmit(onGenerate)}
          className="p-4 grid md:grid-cols-3 gap-4 items-end"
        >
          <FormField label="Range (mm)">
            <Controller
              name="range"
              control={control}
              render={({ field }) => (
                <Input type="number" step="0.001" {...field} />
              )}
            />
          </FormField>

          <FormField label="Travel (mm)">
            <Controller
              name="travel"
              control={control}
              render={({ field }) => (
                <Input type="number" step="0.001" {...field} />
              )}
            />
          </FormField>

          <Button type="submit" color="primary" isDisabled={isGenerating}>
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" /> Generating…
              </span>
            ) : (
              "Generate"
            )}
          </Button>
        </form>
      </div>

      {/* -------- Save + Table -------- */}
      {hasTable && (
        <div className="shadow border rounded-xl bg-white">
          <div className="bg-gray-100 px-4 py-3 rounded-t-xl font-semibold">
            {isEditMode ? "Edit Dial Reading Table" : "Generated Dial Reading Table"}
          </div>

          <form
            onSubmit={handleSubmit(onSave)}
            className="p-4 grid md:grid-cols-3 gap-4"
          >
            <FormField label="Dial Type">
              <Controller
                name="dial_type"
                control={control}
                render={({ field }) => (
                  <Select
                    selectedKeys={[field.value]}
                    onSelectionChange={(keys) =>
                      setValue("dial_type", Array.from(keys)[0] as FormValues["dial_type"])
                    }
                  >
                    <SelectItem key="plunger">Plunger</SelectItem>
                    <SelectItem key="lever">Lever</SelectItem>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Table Name">
              <Controller
                name="table_name"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </FormField>

            <Button type="submit" color="primary">
              {isEditMode ? "Update Table" : "Save Table"}
            </Button>
          </form>

          {/* -------- Table -------- */}
          <div className="px-4 pb-4">
            <table className="w-full border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">#</th>
                  <th className="p-2 border">Turn</th>
                  <th className="p-2 border">Range</th>
                  <th className="p-2 border">Value</th>
                  <th className="p-2 border">Select</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, index) => (
                  <tr key={index}>
                    <td className="p-2 border text-center">{index + 1}</td>
                    <td className="p-2 border text-center">{row.turn}</td>
                    <td className="p-2 border text-center">{row.range}</td>
                    <td className="p-2 border text-center">
                      {row.value.toFixed(3)}
                    </td>
                    <td className="p-2 border text-center">
                      <Checkbox
                        isSelected={row.selected}
                        onValueChange={() => toggleRow(index)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
