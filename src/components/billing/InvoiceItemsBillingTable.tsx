"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import {
  Autocomplete,
  Button,
  Label,
  ListBox,
  Input,
  Pagination,
  Select,
  Table,
} from "@heroui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { formatSpecificationForPrint } from "../../utils/specificationPrintFormatter";
import { useGaugeMastersWithQuery } from "../../hooks/useGaugeMastersWithQuery";
import { getTableColumnKey } from '../Tables/tableColumnKey';
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
      <Select selectedKey={selectedKey} onSelectionChange={(key) => key && onChange(String(key), getInvoiceHsnName(String(key)))} isDisabled={isDisabled} className="w-full">
        <Label>HSN code</Label>
        <Select.Trigger className="min-h-9 h-9 rounded-lg border border-slate-200 bg-white px-2 shadow-none"><Select.Value /><Select.Indicator /></Select.Trigger>
        <Select.Popover><ListBox>{INVOICE_HSN_OPTIONS.map((option) => <ListBox.Item key={option.code} id={option.code} textValue={`${option.code} ${option.name}`}><div className="flex flex-col py-0.5 leading-tight"><span className="text-xs font-medium text-slate-700">{option.code}</span><span className="text-[11px] text-slate-500">{option.name}</span></div><ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
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
    (key: Key | null) => {
      const value = Number(key);
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
              <Autocomplete selectedKey={currentGaugeKey} aria-label="Manual gauge name" isDisabled={isReadOnly} onSelectionChange={(key) => {
                  const selectedGaugeId = key as string | null;
                  if (!selectedGaugeId || selectedGaugeId.startsWith(CURRENT_GAUGE_FALLBACK_KEY_PREFIX)) {
                    return;
                  }

                  const selectedGauge = gaugeMasterList.find((gauge) => gauge.id === selectedGaugeId);
                  if (!selectedGauge) {
                    return;
                  }

                  onManualGaugeSelect(gaugeIndex, selectedGauge.id, selectedGauge.name);
                }}>
                <Autocomplete.Trigger className="text-sm text-slate-700">
                  <Autocomplete.Filter><Input aria-label="Search or select gauge name" placeholder={gaugeMasterLoading && !currentGaugeName ? "Loading gauges..." : "Search or select gauge name"} /></Autocomplete.Filter>
                  <Autocomplete.Indicator />
                </Autocomplete.Trigger>
                <Autocomplete.Popover><ListBox>{gaugeMasterLoading ? <ListBox.Item id="loading-gauges" isDisabled>Loading gauges...</ListBox.Item> : gaugeMasterError ? <ListBox.Item id="gauge-error" isDisabled>Unable to load gauges</ListBox.Item> : gaugeOptions.map((gauge) => <ListBox.Item key={gauge.id} id={gauge.id} textValue={gauge.name}>{gauge.name}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Autocomplete.Popover>
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
                disabled={isReadOnly}
              />
              <Input
                aria-label="Lab ID"
                value={itemData.gaugeItem.inward_gauge_lab_id || ""}
                onChange={(event) =>
                  onGaugeFieldChange(gaugeIndex, "inward_gauge_lab_id", event.target.value)
                }
                placeholder="Lab ID"
                disabled={isReadOnly}
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
              disabled={isReadOnly}
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
                disabled={isReadOnly}
                min="0"
                step="0.01"
                className="w-full"
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
              disabled={isReadOnly}
              min="1"
              className="w-full "
            />
          );
        case "discount":
          return (
            <div className="flex min-w-[150px] gap-1">
              <Select aria-label="Discount type" selectedKey={hsnEntry.discountType || "none"} isDisabled={isReadOnly || !onDiscountChange} onSelectionChange={(key) => key && onDiscountChange?.(gaugeIndex, hsnEntry.id, String(key) as 'none' | 'percentage' | 'flat', hsnEntry.discountValue || '')}>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>
                  <ListBox.Item id="none" textValue="None">None<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="percentage" textValue="%">%<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="flat" textValue="₹">₹<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox></Select.Popover>
              </Select>
              <Input aria-label="Discount value" type="number" min="0" value={hsnEntry.discountValue || ""} disabled={isReadOnly || !onDiscountChange} onChange={(event) => onDiscountChange?.(gaugeIndex, hsnEntry.id, hsnEntry.discountType || 'none', event.target.value)} />
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
                variant="ghost"
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
                variant="ghost"
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
            variant="primary"
            className="h-9 rounded-xl px-4 text-sm font-semibold text-white"
          >
            Add Item
          </Button>
        )}
      </div>

      <div className="industrial-table-wrapper overflow-x-auto px-0 pb-0 pt-0">
        <Table aria-label="Invoice billing items table" className="min-w-full">
          <Table.ScrollContainer className="min-w-[980px] w-full overflow-x-auto"><Table.Content>
          <Table.Header columns={tableColumns}>
            {(column) => (
              <Table.Column id={column.uid} isRowHeader={column.uid === tableColumns[0]?.uid}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={tableRows}
            renderEmptyState={() => loading ? <div className="py-8 text-center text-sm text-slate-500">Loading invoice items...</div> : <div className="flex flex-col items-center gap-3 py-10"><span className="text-sm text-slate-500">No invoice items added yet</span><Button type="button" onPress={onAddItem} variant="secondary" className="rounded-2xl bg-slate-100 text-slate-700" isDisabled={isReadOnly}>Add Manual Item</Button></div>}
          >
            {(row) => (
              <Table.Row id={`${row.gaugeIndex}-${row.hsnEntry.id}`} columns={tableColumns}>
                {(columnKey) => (
                  <Table.Cell>{renderCell(row, getTableColumnKey(columnKey) as TableColumnKey)}</Table.Cell>
                )}
              </Table.Row>
            )}
          </Table.Body></Table.Content></Table.ScrollContainer>
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
              <Select aria-label="Rows per page" selectedKey={String(rowsPerPage)} onSelectionChange={onRowsChange} className="w-[88px]"><Select.Trigger className="min-h-8 h-8 rounded-lg border border-slate-200 bg-white shadow-none"><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{['25','50','100','200','500'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select>
            </div>

            <Pagination aria-label="Invoice item pagination"><Pagination.Content>
              <Pagination.Previous isDisabled={page <= 1} onPress={() => onPageChange(Math.max(1, page - 1))}><Pagination.PreviousIcon /></Pagination.Previous>
              {Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1).map((pageNumber) => <Pagination.Item key={pageNumber}><Pagination.Link isActive={pageNumber === page} onPress={() => onPageChange(pageNumber)}>{pageNumber}</Pagination.Link></Pagination.Item>)}
              <Pagination.Next isDisabled={page >= Math.max(totalPages, 1)} onPress={() => onPageChange(Math.min(Math.max(totalPages, 1), page + 1))}><Pagination.NextIcon /></Pagination.Next>
            </Pagination.Content></Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
