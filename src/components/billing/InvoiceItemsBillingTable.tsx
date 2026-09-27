"use client";

import React from "react";
import type { Selection } from "@react-types/shared";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui-v2/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { formatSpecificationForPrint } from "../../utils/specificationPrintFormatter";
import { useGaugeMastersWithQuery } from "../../hooks/useGaugeMastersWithQuery";
import {
  INVOICE_HSN_OPTIONS,
  getInvoiceHsnName,
  getInvoiceHsnOption,
  type EditableGaugeField,
  type InvoiceBillingTableRow,
  type InvoiceItemHSN,
} from "./invoiceItemTableShared";

const INDIAN_CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number | string) => {
  const numericValue =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return `₹${INDIAN_CURRENCY_FORMATTER.format(Object.is(safeValue, -0) ? 0 : safeValue)}`;
};

interface InvoiceItemsBillingTableProps {
  rows: InvoiceBillingTableRow[];
  totalRows: number;
  loading?: boolean;
  page: number;
  rowsPerPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onAddItem: () => void;
  onAddHsn: (gaugeIndex: number) => void;
  onRemoveHsn: (gaugeIndex: number, hsnId: string) => void;
  onHsnChange: (gaugeIndex: number, hsnId: string, hsnCode: string, hsnName?: string) => void;
  onRateChange: (gaugeIndex: number, hsnId: string, rate: string) => void;
  onQuantityChange: (gaugeIndex: number, hsnId: string, quantity: number) => void;
  onDiscountChange?: (gaugeIndex: number, hsnId: string, type: 'none' | 'percentage' | 'flat', value: string) => void;
  onGaugeFieldChange: (
    gaugeIndex: number,
    field: EditableGaugeField,
    value: string,
  ) => void;
  onManualGaugeSelect: (
    gaugeIndex: number,
    gaugeId: string,
    gaugeName: string,
  ) => void;
  isReadOnly?: boolean;
}

type TableColumnKey =
  | "sr_no"
  | "gauge_name"
  | "identification"
  | "specifications"
  | "hsn"
  | "rate"
  | "qty"
  | "discount"
  | "amount"
  | "actions";

const columns: { name: string; uid: TableColumnKey }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "GAUGE NAME", uid: "gauge_name" },
  { name: "IDENTIFICATION", uid: "identification" },
  { name: "SPECIFICATIONS", uid: "specifications" },
  { name: "HSN", uid: "hsn" },
  { name: "RATE", uid: "rate" },
  { name: "QTY", uid: "qty" },
  { name: "DISCOUNT", uid: "discount" },
  { name: "AMOUNT", uid: "amount" },
  { name: "ACTION", uid: "actions" },
];

const CELL_INPUT_CLASSNAMES = {
  input: "text-sm text-slate-700",
  inputWrapper:
    "min-h-9 h-9 rounded-md border border-slate-200 bg-white shadow-none group-data-[focus=true]:border-slate-400",
};

const COLUMN_LAYOUT: Record<TableColumnKey, string> = {
  sr_no: "min-w-[50px]",
  gauge_name: "min-w-[200px]",
  identification: "min-w-[150px]",
  specifications: "min-w-[225px]",
  hsn: "min-w-[115px]",
  rate: "min-w-[140px]",
  qty: "min-w-[20px]",
  discount: "min-w-[190px]",
  amount: "min-w-[150px]",
  actions: "min-w-[96px]",
};

const CURRENT_GAUGE_FALLBACK_KEY_PREFIX = "__current_invoice_gauge__";

function HsnCodeCombobox({
  entry,
  onChange,
  isDisabled = false,
}: {
  entry: InvoiceItemHSN;
  onChange: (value: string, label?: string) => void;
  isDisabled?: boolean;
}) {
  const selectedKey = getInvoiceHsnOption(entry.hsnCode)?.code ?? null;
  const currentLabel = entry.hsnName || getInvoiceHsnName(entry.hsnCode);

  return (
    <div className="w-full min-w-0">
      <Select
        aria-label="HSN code"
        disallowEmptySelection
        selectedKeys={selectedKey ? new Set([selectedKey]) : new Set()}
        placeholder="Select HSN"
        size="sm"
        isDisabled={isDisabled}
        onSelectionChange={(key) => {
          const nextCode = Array.from(key)[0] as string | undefined;
          if (!nextCode) {
            return;
          }
          onChange(nextCode, getInvoiceHsnName(nextCode));
        }}
        classNames={{
          base: "w-full",
          listboxWrapper: "max-h-56",
          trigger:
            "min-h-9 h-9 rounded-lg border border-slate-200 bg-white px-2 shadow-none data-[hover=true]:border-slate-300",
          value: "text-xs font-medium text-slate-700 [font-variant-numeric:tabular-nums]",
          selectorIcon: "hidden",
        }}
        renderValue={(items) => (
          <span className="truncate text-xs font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
            {items[0]?.key ? String(items[0].key) : entry.hsnCode}
          </span>
        )}
      >
        {INVOICE_HSN_OPTIONS.map((option) => (
          <SelectItem
            key={option.code}
            textValue={`${option.code} ${option.name}`}
          >
            <div className="flex flex-col py-0.5 leading-tight">
              <span className="text-xs font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
                {option.code}
              </span>
              <span className="text-[11px] text-slate-500">{option.name}</span>
            </div>
          </SelectItem>
        ))}
      </Select>
      <div className="mt-1 whitespace-normal break-words text-[11px] leading-4 text-slate-500">
        {currentLabel}
      </div>
    </div>
  );
}

export default function InvoiceItemsBillingTable({
  rows,
  totalRows,
  loading = false,
  page,
  rowsPerPage,
  totalPages,
  onPageChange,
  onRowsPerPageChange,
  onAddItem,
  onAddHsn,
  onRemoveHsn,
  onHsnChange,
  onRateChange,
  onQuantityChange,
  onDiscountChange,
  onGaugeFieldChange,
  onManualGaugeSelect,
  isReadOnly = false,
}: InvoiceItemsBillingTableProps) {
  const { gaugeMasterList, loading: gaugeMasterLoading, error: gaugeMasterError } = useGaugeMastersWithQuery();

  const onRowsChange = React.useCallback(
    (keys: Selection) => {
      const value = Number(Array.from(keys)[0] as string);
      onRowsPerPageChange(value);
    },
    [onRowsPerPageChange],
  );

  const tableRows = React.useMemo(
    () => rows.map((row, index) => ({ ...row, rowIndex: index })),
    [rows],
  );
  const tableColumns = React.useMemo(
    () => columns.filter((column) => column.uid !== "discount" || Boolean(onDiscountChange)),
    [onDiscountChange],
  );

  const showingFrom = totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const showingTo = totalRows === 0 ? 0 : Math.min(page * rowsPerPage, totalRows);

  const renderCell = React.useCallback(
    (
      row: InvoiceBillingTableRow & { rowIndex: number },
      columnKey: TableColumnKey,
    ) => {
      const { gaugeIndex, hsnEntry, itemData, amount, rowIndex } = row;

      switch (columnKey) {
        case "sr_no":
          return (
            <div className="text-center text-sm font-medium text-slate-500">
              {(page - 1) * rowsPerPage + rowIndex + 1}
            </div>
          );
        case "gauge_name":
          if (itemData.isManual) {
            const currentGaugeName = itemData.gaugeItem.master_gauge_name?.trim() || "";
            const currentGaugeKey =
              itemData.gaugeItem.master_gauge_id ||
              itemData.gaugeItem.gauge_id ||
              (currentGaugeName
                ? `${CURRENT_GAUGE_FALLBACK_KEY_PREFIX}${itemData.gaugeItem.id || gaugeIndex}`
                : null);
            const currentGaugeExists = currentGaugeKey
              ? gaugeMasterList.some((gauge) => gauge.id === currentGaugeKey)
              : false;
            const gaugeOptions = currentGaugeName && currentGaugeKey && !currentGaugeExists
              ? [
                  {
                    id: currentGaugeKey,
                    name: currentGaugeName,
                  },
                  ...gaugeMasterList,
                ]
              : gaugeMasterList;

            return (
              <Autocomplete
                selectedKey={currentGaugeKey}
                aria-label="Manual gauge name"
                placeholder={gaugeMasterLoading && !currentGaugeName ? "Loading gauges..." : "Search or select gauge name"}
                isDisabled={isReadOnly}
                isLoading={gaugeMasterLoading}
                allowsCustomValue={false}
                size="sm"
                disableAnimation
                onSelectionChange={(key) => {
                  const selectedGaugeId = key as string | null;
                  if (!selectedGaugeId || selectedGaugeId.startsWith(CURRENT_GAUGE_FALLBACK_KEY_PREFIX)) {
                    return;
                  }

                  const selectedGauge = gaugeMasterList.find((gauge) => gauge.id === selectedGaugeId);
                  if (!selectedGauge) {
                    return;
                  }

                  onManualGaugeSelect(gaugeIndex, selectedGauge.id, selectedGauge.name);
                }}
                inputProps={{
                  classNames: CELL_INPUT_CLASSNAMES,
                }}
                listboxProps={{
                  emptyContent: gaugeMasterLoading
                    ? "Loading gauges..."
                    : gaugeMasterError
                      ? "Unable to load gauges"
                      : "No gauges found",
                }}
                popoverProps={{
                  shouldBlockScroll: false,
                  placement: "bottom-start",
                  offset: 4,
                }}
              >
                {gaugeOptions.map((gauge) => (
                  <AutocompleteItem key={gauge.id} textValue={gauge.name}>
                    {gauge.name}
                  </AutocompleteItem>
                ))}
              </Autocomplete>
            );
          }

          return (
            <div className="max-w-full">
              <div className="whitespace-normal break-words text-sm font-semibold text-slate-800">
                {itemData.gaugeItem.master_gauge_name || "Unknown"}
              </div>
            </div>
          );
        case "identification":
          return itemData.isManual ? (
            <div className="w-full space-y-1.5">
              <Input
                aria-label="Identification number"
                value={itemData.gaugeItem.identification_number || ""}
                onChange={(event) =>
                  onGaugeFieldChange(gaugeIndex, "identification_number", event.target.value)
                }
                placeholder="Identification"
                isReadOnly={isReadOnly}
                size="sm"
                classNames={CELL_INPUT_CLASSNAMES}
              />
              <Input
                aria-label="Lab ID"
                value={itemData.gaugeItem.inward_gauge_lab_id || ""}
                onChange={(event) =>
                  onGaugeFieldChange(gaugeIndex, "inward_gauge_lab_id", event.target.value)
                }
                placeholder="Lab ID"
                isReadOnly={isReadOnly}
                size="sm"
                classNames={CELL_INPUT_CLASSNAMES}
              />
            </div>
          ) : (
            <div className="max-w-full">
              <div className="whitespace-normal break-words text-sm font-semibold text-slate-700">
                {itemData.gaugeItem.identification_number || itemData.gaugeItem.inward_gauge_lab_id || "-"}
              </div>
            </div>
          );
        case "specifications":
          return itemData.isManual ? (
            <Input
              aria-label="Specification"
              value={String(itemData.gaugeItem.specification || "")}
              onChange={(event) =>
                onGaugeFieldChange(gaugeIndex, "specification", event.target.value)
              }
              placeholder="Specification"
              isReadOnly={isReadOnly}
              size="sm"
              classNames={CELL_INPUT_CLASSNAMES}
            />
          ) : (
            <div className="max-w-full whitespace-pre-wrap break-words text-sm leading-[1.35] text-slate-600">
              {formatSpecificationForPrint(
                itemData.gaugeItem.specifications ||
                itemData.gaugeItem.specification ||
                itemData.gaugeItem.gauge_specification,
                String(itemData.gaugeItem.unit || "mm"),
              )}
            </div>
          );
        case "hsn":
          return (
            <HsnCodeCombobox
              entry={hsnEntry}
              isDisabled={isReadOnly}
              onChange={(value, label) => {
                if (!isReadOnly) onHsnChange(gaugeIndex, hsnEntry.id, value, label);
              }}
            />
          );
        case "rate":
          return (
            <div className="w-full min-w-0">
              <Input
                aria-label="Rate"
                type="number"
                value={hsnEntry.rate}
                onChange={(event) => onRateChange(gaugeIndex, hsnEntry.id, event.target.value)}
                isReadOnly={isReadOnly}
                min="0"
                step="0.01"
                size="sm"
                startContent={<span className="text-[11px] text-slate-400">₹</span>}
                className="w-full"
                classNames={{
                  ...CELL_INPUT_CLASSNAMES,
                  input:
                    "text-right text-sm text-slate-700 whitespace-nowrap [font-variant-numeric:tabular-nums]",
                }}
              />
              <div className="mt-1 whitespace-nowrap text-right text-[11px] text-slate-500 [font-variant-numeric:tabular-nums]">
                {formatCurrency(hsnEntry.rate || 0)}
              </div>
            </div>
          );
        case "qty":
          return (
            <Input
              aria-label="Quantity"
              type="number"
              value={String(hsnEntry.quantity)}
              onChange={(event) =>
                onQuantityChange(
                  gaugeIndex,
                  hsnEntry.id,
                  parseInt(event.target.value, 10) || 1,
                )
              }
              isReadOnly={isReadOnly}
              min="1"
              size="sm"
              className="w-full "
              classNames={{
                ...CELL_INPUT_CLASSNAMES,
                input:
                  "text-center text-sm text-slate-700 whitespace-nowrap [font-variant-numeric:tabular-nums]",
              }}
            />
          );
        case "discount":
          return (
            <div className="flex min-w-[150px] gap-1">
              <Select aria-label="Discount type" size="sm" selectedKeys={[hsnEntry.discountType || "none"]} isDisabled={isReadOnly || !onDiscountChange} onSelectionChange={(keys) => onDiscountChange?.(gaugeIndex, hsnEntry.id, String(Array.from(keys)[0]) as 'none' | 'percentage' | 'flat', hsnEntry.discountValue || '')}>
                <SelectItem key="none">None</SelectItem>
                <SelectItem key="percentage">%</SelectItem>
                <SelectItem key="flat">₹</SelectItem>
              </Select>
              <Input aria-label="Discount value" type="number" size="sm" min="0" value={hsnEntry.discountValue || ""} isReadOnly={isReadOnly || !onDiscountChange} onChange={(event) => onDiscountChange?.(gaugeIndex, hsnEntry.id, hsnEntry.discountType || 'none', event.target.value)} />
            </div>
          );
        case "amount":
          return (
            <div className="w-full whitespace-nowrap text-right text-sm font-semibold text-slate-800 [font-variant-numeric:tabular-nums]">
              {formatCurrency(amount)}
            </div>
          );
        case "actions":
          return (
            <div className="flex min-h-9 items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="light"
                isIconOnly
                aria-label="Remove HSN"
                onPress={() => onRemoveHsn(gaugeIndex, hsnEntry.id)}
                isDisabled={isReadOnly}
                className="h-8 w-8 min-w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="light"
                isIconOnly
                aria-label="Add HSN"
                onPress={() => onAddHsn(gaugeIndex)}
                isDisabled={isReadOnly}
                className="h-8 w-8 min-w-8 rounded-lg border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        default:
          return null;
      }
    },
    [
      onAddHsn,
      gaugeMasterError,
      gaugeMasterList,
      gaugeMasterLoading,
      onGaugeFieldChange,
      onHsnChange,
      onManualGaugeSelect,
      onQuantityChange,
      onDiscountChange,
      onRateChange,
      onRemoveHsn,
      page,
      rowsPerPage,
    ],
  );

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:flex-row md:items-center md:justify-end">
        {!isReadOnly && (
          <Button
            type="button"
            onPress={onAddItem}
            color="primary"
            className="h-9 rounded-xl px-4 text-sm font-semibold text-white"
          >
            Add Item
          </Button>
        )}
      </div>

      <div className="industrial-table-wrapper overflow-x-auto px-0 pb-0 pt-0">
        <Table
          aria-label="Invoice billing items table"
          isHeaderSticky
          removeWrapper
          classNames={{
            base: "min-w-full",
            table: "min-w-[980px] w-full table-auto",
          }}
        >
          <TableHeader columns={tableColumns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === "actions" || column.uid === "sr_no" || column.uid === "amount" ? "center" : "start"}
                className={`${COLUMN_LAYOUT[column.uid]} bg-slate-100 px-3 py-3 text-[11px] font-semibold tracking-[0.08em] text-slate-600`}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={tableRows}
            isLoading={loading}
            emptyContent={
              <div className="flex flex-col items-center gap-3 py-10">
                <span className="text-sm text-slate-500">No invoice items added yet</span>
                <Button
                  type="button"
                  onPress={onAddItem}
                  variant="flat"
                  className="rounded-2xl bg-slate-100 text-slate-700"
                  isDisabled={isReadOnly}
                >
                  Add Manual Item
                </Button>
              </div>
            }
            loadingContent={
              <div className="py-8 text-center text-sm text-slate-500">Loading invoice items...</div>
            }
          >
            {(row) => (
              <TableRow key={`${row.gaugeIndex}-${row.hsnEntry.id}`}>
                {(columnKey) => (
                  <TableCell className={`px-1 py-2.5 align-top ${COLUMN_LAYOUT[columnKey as TableColumnKey]}`}>
                    {renderCell(row, columnKey as TableColumnKey)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalRows > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <span className="text-slate-500">
            Showing {showingFrom} to {showingTo} of {totalRows} line items
          </span>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-[0.12em] text-slate-400">
                Rows
              </span>
              <Select
                aria-label="Rows per page"
                selectedKeys={new Set([String(rowsPerPage)])}
                onSelectionChange={onRowsChange}
                size="sm"
                className="w-[88px]"
                classNames={{
                  trigger:
                    "min-h-8 h-8 rounded-lg border border-slate-200 bg-white shadow-none",
                }}
              >
                <SelectItem key="25">25</SelectItem>
                <SelectItem key="50">50</SelectItem>
                <SelectItem key="100">100</SelectItem>
                <SelectItem key="200">200</SelectItem>
                <SelectItem key="500">500</SelectItem>
              </Select>
            </div>

            <Pagination
              aria-label="Invoice item pagination"
              total={Math.max(totalPages, 1)}
              page={page}
              onChange={onPageChange}
              size="sm"
              showControls
              classNames={{
                wrapper: "gap-0",
                item: "h-8 w-8 border border-slate-200 bg-white text-[12px] text-slate-600",
                cursor: "bg-slate-900 text-white shadow-sm",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
