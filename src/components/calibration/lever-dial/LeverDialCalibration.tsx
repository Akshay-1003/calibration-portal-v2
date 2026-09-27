"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  Input,
  Checkbox,
  Spinner,
} from "@heroui/react";
import { useFieldArray, useFormContext, useWatch, Controller } from "react-hook-form";
import { useDialReadingTableQuery } from "../../../hooks/queries/dialReadingTable";
import { TypeAReadingSection } from "../od-id-limit-gauges/TypeAReadingSection";
import { RepeatabilitySection } from "../common/RepeatabilitySection";
import {
  calculateObservedErrorInMicronAsString as computeErrorInMicron,
  isValidDecimalInput,
} from "../../../utils/calibrationCalculations";
import type {
  LeverDialReadingRow as ReadingRow,
  LeverDialCalibrationForm as CalibrationForm,
  LeverDialObservationsObj as ObservationsObj,
} from "../observationSchemas";

/* ================================================================
   TYPES
==================================================================*/

interface Props {
  observations?: CalibrationForm["observations"];
  isReadOnly?: boolean;
  master_gauge_id?: string;
  specifications?: any;
}

function isObservationsObj(val: unknown): val is ObservationsObj {
  return (
    typeof val === "object" &&
    val !== null &&
    (val as any).readings !== undefined
  );
}

/* ================================================================
   HELPER FUNCTIONS
==================================================================*/

/* ================================================================
   COMPONENT
==================================================================*/

export function LeverDialCalibration({
  observations: initialObservations,
  isReadOnly = false,
  specifications,
}: Props) {
  const { control, setValue } = useFormContext<CalibrationForm>();

  const readingsFields = useFieldArray({
    control,
    name: "observations.readings",
  });

  const readingsRows = useWatch({
    control,
    name: "observations.readings",
    defaultValue: [],
  });

  const initializedRef = useRef(false);
  const lastObservationsRef = useRef<string | null>(null);
  const tableIdRef = useRef<string | undefined>(specifications?.reading_table_id);
  const hasObservationsData =
    isObservationsObj(initialObservations) &&
    Array.isArray(initialObservations.readings) &&
    initialObservations.readings.length > 0;
  const tableId = specifications?.reading_table_id;
  const dialTableQuery = useDialReadingTableQuery(hasObservationsData ? null : tableId);

  // Create a stable key for observations comparison
  const getObservationsKey = useCallback((obs: any): string => {
    if (!obs) return "null";
    if (isObservationsObj(obs)) {
      return JSON.stringify({
        readingsCount: obs.readings?.length || 0,
        hasRepeatability: !!obs.repeatability,
        hasTypeA: !!obs.type_a_readings,
      });
    }
    return "empty";
  }, []);

  /* --------------------------------------------------------------
     INITIAL LOAD
  ---------------------------------------------------------------*/
  useEffect(() => {
    const currentKey = getObservationsKey(initialObservations);
    const tableIdChanged = tableIdRef.current !== tableId;

    // Skip if already initialized with the same observations and reading_table_id
    if (
      initializedRef.current &&
      lastObservationsRef.current === currentKey &&
      !tableIdChanged
    ) {
      return;
    }

    // Update reading_table_id ref
    tableIdRef.current = tableId;

    // If we have observations data, load it directly without API call
    if (hasObservationsData) {
      // Load readings
      if (initialObservations.readings && initialObservations.readings.length > 0) {
        readingsFields.replace(
          initialObservations.readings.map((row) => ({
            turn: String(row.turn ?? ""),
            range: String(row.range ?? ""),
            value: String(row.value ?? ""),
            upward_direction: {
              stylus_up_actual_reading: String(row.upward_direction?.stylus_up_actual_reading ?? ""),
              stylus_up_observed_error:
                computeErrorInMicron(
                  row.upward_direction?.stylus_up_actual_reading,
                  row.value,
                ) || "",
              stylus_down_actual_reading: String(row.upward_direction?.stylus_down_actual_reading ?? ""),
              stylus_down_observed_error:
                computeErrorInMicron(
                  row.upward_direction?.stylus_down_actual_reading,
                  row.value,
                ) || "",
            },
            downward_direction: {
              stylus_up_actual_reading: String(row.downward_direction?.stylus_up_actual_reading ?? ""),
              stylus_up_observed_error:
                computeErrorInMicron(
                  row.downward_direction?.stylus_up_actual_reading,
                  row.value,
                ) || "",
              stylus_down_actual_reading: String(row.downward_direction?.stylus_down_actual_reading ?? ""),
              stylus_down_observed_error:
                computeErrorInMicron(
                  row.downward_direction?.stylus_down_actual_reading,
                  row.value,
                ) || "",
            },
          }))
        );
      } else {
        readingsFields.replace([]);
      }

      // Set tables_to_print
      if (initialObservations.tables_to_print) {
        setValue("observations.tables_to_print", initialObservations.tables_to_print);
      }

      // Set repeatability and type_a_readings
      if (initialObservations.repeatability) {
        const repeatability = Array.isArray(initialObservations.repeatability)
          ? initialObservations.repeatability.map(String)
          : [];
        setValue("observations.repeatability", repeatability);
      }

      if (initialObservations.type_a_readings) {
        const typeA = Array.isArray(initialObservations.type_a_readings)
          ? initialObservations.type_a_readings.map(String)
          : [];
        setValue("observations.type_a_readings", typeA);
      }

      initializedRef.current = true;
      lastObservationsRef.current = currentKey;
      return;
    }

    if (!tableId) {
      readingsFields.replace([]);
      initializedRef.current = true;
      lastObservationsRef.current = "empty";
      return;
    }

    if (dialTableQuery.isPending) {
      return;
    }

    if (dialTableQuery.isError) {
      readingsFields.replace([]);
      initializedRef.current = true;
      lastObservationsRef.current = "error";
      return;
    }

    const table = dialTableQuery.data?.reading_table ?? [];

    if (table.length > 0) {
      const initialRows = table.map((r) => ({
        turn: String(r.turn ?? ""),
        range: String(r.range ?? ""),
        value: String(r.value ?? ""),
        upward_direction: {
          stylus_up_actual_reading: String((r as any).upward_stylus_up_actual ?? ""),
          stylus_up_observed_error:
            computeErrorInMicron((r as any).upward_stylus_up_actual, r.value) || "",
          stylus_down_actual_reading: String((r as any).upward_stylus_down_actual ?? ""),
          stylus_down_observed_error:
            computeErrorInMicron((r as any).upward_stylus_down_actual, r.value) || "",
        },
        downward_direction: {
          stylus_up_actual_reading: String((r as any).downward_stylus_up_actual ?? ""),
          stylus_up_observed_error:
            computeErrorInMicron((r as any).downward_stylus_up_actual, r.value) || "",
          stylus_down_actual_reading: String((r as any).downward_stylus_down_actual ?? ""),
          stylus_down_observed_error:
            computeErrorInMicron((r as any).downward_stylus_down_actual, r.value) || "",
        },
      }));

      readingsFields.replace(initialRows);
      initializedRef.current = true;
      lastObservationsRef.current = `table-${tableId}`;
      return;
    }

    readingsFields.replace([]);
    initializedRef.current = true;
    lastObservationsRef.current = "empty";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialObservations,
    tableId,
    dialTableQuery.data,
    dialTableQuery.isPending,
    dialTableQuery.isError,
    // Note: readingsFields.replace is stable but we exclude it from deps to prevent infinite loops
    setValue,
    getObservationsKey,
  ]);

  /* --------------------------------------------------------------
     RENDER
  ---------------------------------------------------------------*/
  const tablesToPrint = useWatch({
    control,
    name: "observations.tables_to_print",
    defaultValue: [],
  }) ?? [];

  // Only show loading if we're actually fetching table data (not in edit mode with observations)
  if (!hasObservationsData && dialTableQuery.isPending) {
    return (
      <div className="py-12 flex justify-center items-center gap-2 text-sm text-gray-500">
        <Spinner size="sm" />
        <span>Loading calibration data...</span>
      </div>
    );
  }

  return (
    <>
      {/* Main Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mb-4">
        {/* Section Header */}
        <div className="bg-gradient-to-b from-slate-600 to-slate-700 text-white px-4 py-3.5">
          <h3 className="text-sm font-bold uppercase">Observations</h3>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-[100] bg-white">
              {/* Main Header Row */}
              <tr>
                <th rowSpan={2} className="sticky left-0 top-0 z-[110] bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase tracking-wider  border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '120px', width: '120px', maxWidth: '120px' }}>
                  TURN
                </th>
                <th rowSpan={2} className="sticky left-[120px] top-0 z-[110] bg-gradient-to-b from-slate-50 to-slate-100 px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase  border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>
                  RANGE
                </th>
                <th rowSpan={2} className="sticky left-[220px] top-0 z-[110] bg-gradient-to-b from-slate-50 to-slate-100 px-3 py-3 text-center text-xs font-bold text-slate-700 uppercase border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '120px', width: '120px', maxWidth: '120px' }}>
                  VALUE
                </th>
                
                {/* UPWARD DIRECTION Section */}
                <th colSpan={4} className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-b from-emerald-500 to-emerald-600 border-r border-emerald-600/30">
                  UPWARD DIRECTION
                </th>
                
                {/* DOWNWARD DIRECTION Section */}
                <th colSpan={4} className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider bg-gradient-to-b from-pink-600 to-pink-700 border-r border-pink-700/30">
                  DOWNWARD DIRECTION
                </th>
              </tr>
              
              {/* Column Headers Row */}
              <tr>
                {/* UPWARD DIRECTION Columns */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 border-b border-emerald-200/50">
                  STYLUS UP ACTUAL READING
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 border-b border-emerald-200/50">
                  OBSERVED ERROR (μm)
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 border-b border-emerald-200/50">
                  STYLUS DOWN ACTUAL READING
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-emerald-50 to-emerald-100 border-b border-emerald-200/50 border-r border-emerald-300/50">
                  OBSERVED ERROR (μm)
                </th>
                
                {/* DOWNWARD DIRECTION Columns */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-pink-50 to-pink-100 border-b border-pink-200/50">
                  STYLUS UP ACTUAL READING
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-pink-50 to-pink-100 border-b border-pink-200/50">
                  OBSERVED ERROR (μm)
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-pink-50 to-pink-100 border-b border-pink-200/50">
                  STYLUS DOWN ACTUAL READING
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700 uppercase bg-gradient-to-b from-pink-50 to-pink-100 border-b border-pink-200/50 border-r border-pink-300/50">
                  OBSERVED ERROR (μm)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {readingsFields.fields.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500 bg-slate-50/30">
                    No readings available
                  </td>
                </tr>
              ) : (
                readingsFields.fields.map((field: any, index: number) => {
                  const row = readingsRows?.[index];
                  
                  // Calculate errors
                  const upwardStylusUpError = computeErrorInMicron(
                    row?.upward_direction?.stylus_up_actual_reading,
                    row?.value
                  );
                  const upwardStylusDownError = computeErrorInMicron(
                    row?.upward_direction?.stylus_down_actual_reading,
                    row?.value
                  );
                  const downwardStylusUpError = computeErrorInMicron(
                    row?.downward_direction?.stylus_up_actual_reading,
                    row?.value
                  );
                  const downwardStylusDownError = computeErrorInMicron(
                    row?.downward_direction?.stylus_down_actual_reading,
                    row?.value
                  );

                  return (
                    <tr key={field.id} className="transition-colors duration-150 border-b border-slate-100">
                      {/* TURN - Fixed Column (Sticky Left & Top) */}
                      <td className="sticky left-0 z-[90] bg-white px-4 py-2.5 whitespace-nowrap  border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '120px', width: '120px', maxWidth: '120px' }}>
                        <Input
                          aria-label="Turn"
                          readOnly
                          value={row?.turn ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-700",
                          }}
                        />
                      </td>

                      {/* RANGE - Fixed Column (Sticky Left & Top) */}
                      <td className="sticky left-[120px] z-[90] bg-white px-3 py-2.5 whitespace-nowrap border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '100px', width: '100px', maxWidth: '100px' }}>
                        <Input
                          aria-label="Range"
                          readOnly
                          value={row?.range ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-700",
                          }}
                        />
                      </td>

                      {/* VALUE - Fixed Column (Sticky Left & Top) */}
                      <td className="sticky left-[220px] z-[90] bg-white px-3 py-2.5 whitespace-nowrap border-slate-300 transition-colors shadow-[2px_0_4px_rgba(0,0,0,0.1)]" style={{ minWidth: '120px', width: '120px', maxWidth: '120px' }}>
                        <Input
                          aria-label="Value"
                          readOnly
                          value={row?.value ?? ""}
                          classNames={{
                            inputWrapper: "h-9 w-full border-1 border-slate-200 bg-white shadow-sm",
                            input: "text-sm text-center font-medium text-slate-700",
                          }}
                        />
                      </td>

                      {/* UPWARD DIRECTION - Stylus Up Actual Reading */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-emerald-50/40">
                        <Controller
                          name={`observations.readings.${index}.upward_direction.stylus_up_actual_reading` as any}
                          control={control}
                          defaultValue={row?.upward_direction?.stylus_up_actual_reading ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Upward Stylus Up Actual Reading"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all",
                                input: "text-sm text-center font-medium text-slate-700",
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (isValidDecimalInput(v)) {
                                  controllerField.onChange(v);
                                  // Update error automatically
                                  const newError = computeErrorInMicron(v, row?.value);
                                  setValue(`observations.readings.${index}.upward_direction.stylus_up_observed_error` as any, newError, { shouldValidate: false });
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* UPWARD DIRECTION - Stylus Up Observed Error */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-emerald-50/40">
                        <Controller
                          name={`observations.readings.${index}.upward_direction.stylus_up_observed_error` as any}
                          control={control}
                          defaultValue={row?.upward_direction?.stylus_up_observed_error ?? ""}
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              value={upwardStylusUpError || field.value || ""}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-emerald-200 bg-emerald-50/40 shadow-sm",
                                input: "text-sm text-center font-medium text-slate-600",
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* UPWARD DIRECTION - Stylus Down Actual Reading */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-emerald-50/40">
                        <Controller
                          name={`observations.readings.${index}.upward_direction.stylus_down_actual_reading` as any}
                          control={control}
                          defaultValue={row?.upward_direction?.stylus_down_actual_reading ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Upward Stylus Down Actual Reading"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-emerald-200 bg-emerald-50/40 hover:border-emerald-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all",
                                input: "text-sm text-center font-medium text-slate-700",
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (isValidDecimalInput(v)) {
                                  controllerField.onChange(v);
                                  // Update error
                                  const newError = computeErrorInMicron(v, row?.value);
                                  setValue(`observations.readings.${index}.upward_direction.stylus_down_observed_error` as any, newError, { shouldValidate: false });
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* UPWARD DIRECTION - Stylus Down Observed Error */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-emerald-50/40 border-r border-emerald-300/50">
                        <Controller
                          name={`observations.readings.${index}.upward_direction.stylus_down_observed_error` as any}
                          control={control}
                          defaultValue={row?.upward_direction?.stylus_down_observed_error ?? ""}
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              value={upwardStylusDownError || field.value || ""}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-emerald-200 bg-emerald-50/40 shadow-sm",
                                input: "text-sm text-center font-medium text-slate-600",
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* DOWNWARD DIRECTION - Stylus Up Actual Reading */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-pink-50/40">
                        <Controller
                          name={`observations.readings.${index}.downward_direction.stylus_up_actual_reading` as any}
                          control={control}
                          defaultValue={row?.downward_direction?.stylus_up_actual_reading ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Downward Stylus Up Actual Reading"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-pink-200 bg-pink-50/40 hover:border-pink-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all",
                                input: "text-sm text-center font-medium text-slate-700",
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (isValidDecimalInput(v)) {
                                  controllerField.onChange(v);
                                  // Update error
                                  const newError = computeErrorInMicron(v, row?.value);
                                  setValue(`observations.readings.${index}.downward_direction.stylus_up_observed_error` as any, newError, { shouldValidate: false });
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* DOWNWARD DIRECTION - Stylus Up Observed Error */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-pink-50/40">
                        <Controller
                          name={`observations.readings.${index}.downward_direction.stylus_up_observed_error` as any}
                          control={control}
                          defaultValue={row?.downward_direction?.stylus_up_observed_error ?? ""}
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              value={downwardStylusUpError || field.value || ""}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-pink-200 bg-pink-50/40 shadow-sm",
                                input: "text-sm text-center font-medium text-slate-600",
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* DOWNWARD DIRECTION - Stylus Down Actual Reading */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-pink-50/40">
                        <Controller
                          name={`observations.readings.${index}.downward_direction.stylus_down_actual_reading` as any}
                          control={control}
                          defaultValue={row?.downward_direction?.stylus_down_actual_reading ?? ""}
                          render={({ field: controllerField }) => (
                            <Input
                              {...controllerField}
                              type="text"
                              inputMode="decimal"
                              aria-label="Downward Stylus Down Actual Reading"
                              isDisabled={isReadOnly}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-pink-200 bg-pink-50/40 hover:border-pink-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all",
                                input: "text-sm text-center font-medium text-slate-700",
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (isValidDecimalInput(v)) {
                                  controllerField.onChange(v);
                                  // Update error
                                  const newError = computeErrorInMicron(v, row?.value);
                                  setValue(`observations.readings.${index}.downward_direction.stylus_down_observed_error` as any, newError, { shouldValidate: false });
                                }
                              }}
                            />
                          )}
                        />
                      </td>

                      {/* DOWNWARD DIRECTION - Stylus Down Observed Error */}
                      <td className="px-3 py-2.5 whitespace-nowrap bg-pink-50/40 border-r border-pink-300/50">
                        <Controller
                          name={`observations.readings.${index}.downward_direction.stylus_down_observed_error` as any}
                          control={control}
                          defaultValue={row?.downward_direction?.stylus_down_observed_error ?? ""}
                          render={({ field }) => (
                            <Input
                              {...field}
                              readOnly
                              value={downwardStylusDownError || field.value || ""}
                              classNames={{
                                inputWrapper: "h-9 w-full min-w-[100px] border-1 border-pink-200 bg-pink-50/40 shadow-sm",
                                input: "text-sm text-center font-medium text-slate-600",
                              }}
                            />
                          )}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Repeatability Section */}
      <div className="mt-6">
        <RepeatabilitySection
          disabled={isReadOnly}
          observations={{
            repeatability: initialObservations?.repeatability?.map(String) ?? [],
          }}
        />
      </div>

     

      {/* Type A Reading Section */}
      <div className="mt-6">
        <TypeAReadingSection
          disabled={isReadOnly}
          observations={{
            type_a_readings: initialObservations?.type_a_readings
              ? Array.isArray(initialObservations.type_a_readings)
                ? initialObservations.type_a_readings.map((v) =>
                    typeof v === "string" ? Number(v) : v
                  )
                : []
              : [],
          }}
        />
      </div>
       {/* Select Tables to Print Section */}
      <div className="mt-4 overflow-hidden">
          <h3 className="text-sm font-bold uppercase">SELECT TABLES TO PRINT ON REPORT</h3>
        <div className="p-2 grid grid-cols-2 gap-8">
          {/* SU (Stylus Up) Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-bold text-gray-800 uppercase mb-4 pb-2 border-b border-gray-300">
              SU (STYLUS UP)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["su_upward_direction", "SU Upward Direction"],
                ["su_upward_result", "SU Upward Result"],
                ["su_downward_direction", "SU Downward Direction"],
                ["su_downward_result", "SU Downward Result"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center">
                  <Checkbox
                    isSelected={tablesToPrint.includes(key)}
                    isDisabled={isReadOnly}
                    onValueChange={(v: boolean) => {
                      setValue(
                        "observations.tables_to_print",
                        v
                          ? [...tablesToPrint, key]
                          : tablesToPrint.filter((k) => k !== key),
                        { shouldDirty: true }
                      );
                    }}
                  >
                    <span className="text-sm text-gray-700">{label}</span>
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>

          {/* SD (Stylus Down) Section */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-bold text-gray-800 uppercase mb-4 pb-2 border-b border-gray-300">
              SD (STYLUS DOWN)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["sd_upward_direction", "SD Upward Direction"],
                ["sd_upward_result", "SD Upward Result"],
                ["sd_downward_direction", "SD Downward Direction"],
                ["sd_downward_result", "SD Downward Result"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center">
                  <Checkbox
                    isSelected={tablesToPrint.includes(key)}
                    isDisabled={isReadOnly}
                    onValueChange={(v: boolean) => {
                      setValue(
                        "observations.tables_to_print",
                        v
                          ? [...tablesToPrint, key]
                          : tablesToPrint.filter((k) => k !== key),
                        { shouldDirty: true }
                      );
                    }}
                  >
                    <span className="text-sm text-gray-700">{label}</span>
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

LeverDialCalibration.displayName = "LeverDialCalibration";
