"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import {
  Autocomplete,
  Button,
  ListBox,
  Input,
  Pagination,
  Popover,
  Select,
  Table,
} from "@heroui/react";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { InvoiceSpecificationDisplay } from "./InvoiceSpecificationDisplay";
import { useGaugeMastersWithQuery } from "../../hooks/useGaugeMastersWithQuery";
import { getTableColumnKey } from '../Tables/tableColumnKey';
import { dataTableClassName } from '../Tables/tableStyles';
import {
  INVOICE_HSN_OPTIONS,
  RETURN_AS_IS_CODE,
  RETURN_AS_IS_LABEL,
  isReturnAsIsEntry,
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
  onAddExistingItem?: () => void;
  onHsnSelectionChange: (gaugeIndex: number, hsnCodes: string[]) => void;
  onRemoveItem: (gaugeIndex: number) => void;
  onRateChange: (gaugeIndex: number, hsnId: string, rate: string) => void;
  onQuantityChange: (gaugeIndex: number, quantity: number) => void;
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
  | "calibration"
  | "repair"
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
  { name: "CALIBRATION", uid: "calibration" },
  { name: "REPAIR", uid: "repair" },
  { name: "QTY", uid: "qty" },
  { name: "DISCOUNT", uid: "discount" },
  { name: "AMOUNT", uid: "amount" },
  { name: "ACTION", uid: "actions" },
];

const COLUMN_LAYOUT: Record<TableColumnKey, string> = {
  sr_no: 'min-w-[58px] w-[58px]',
  gauge_name: 'min-w-[175px]',
  identification: 'min-w-[150px]',
  specifications: 'min-w-[210px]',
  hsn: 'min-w-[185px]',
  calibration: 'min-w-[125px]',
  repair: 'min-w-[125px]',
  qty: 'min-w-[75px]',
  discount: 'min-w-[180px]',
  amount: 'min-w-[135px]',
  actions: 'min-w-[105px] w-[105px]',
};

const CURRENT_GAUGE_FALLBACK_KEY_PREFIX = "__current_invoice_gauge__";

function HsnMultiSelect({
  entries,
  onChange,
  isDisabled = false,
}: {
  entries: InvoiceItemHSN[];
  onChange: (values: string[]) => void;
  isDisabled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const catalogCodes = new Set(INVOICE_HSN_OPTIONS.map((option) => option.code));
  const legacyOptions = entries
    .filter((entry) => entry.hsnCode && entry.hsnCode !== RETURN_AS_IS_CODE && !catalogCodes.has(entry.hsnCode as typeof INVOICE_HSN_OPTIONS[number]["code"]))
    .map((entry) => ({ code: entry.hsnCode, name: entry.hsnName || entry.hsnCode }));
  const options = [...INVOICE_HSN_OPTIONS, { code: RETURN_AS_IS_CODE, name: RETURN_AS_IS_LABEL }, ...legacyOptions.filter(
    (option, index, list) => list.findIndex((candidate) => candidate.code === option.code) === index,
  )];
  const selectedNames = entries.map((entry) => entry.hsnCode === RETURN_AS_IS_CODE
    ? "Return as is"
    : options.find((option) => option.code === entry.hsnCode)?.name || entry.hsnName || entry.hsnCode);

  return (
    <div className="w-full min-w-0">
      <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger>
          <button type="button" disabled={isDisabled} aria-label="Select invoice services" className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 text-left text-xs text-slate-700 disabled:opacity-60">
            <span className="min-w-0 truncate">{selectedNames.length ? selectedNames.join(", ") : "Select services"}</span>
            <ChevronDownIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </Popover.Trigger>
        <Popover.Content className="min-w-[260px] p-1">
          <Popover.Dialog>
            <ListBox aria-label="Invoice services" selectionMode="multiple" selectedKeys={new Set(entries.map((entry) => entry.hsnCode))} onSelectionChange={(keys) => {
              if (keys === "all") onChange(options.map((option) => option.code));
              else onChange(Array.from(keys, String));
            }}>
              {options.map((option) => <ListBox.Item key={option.code} id={option.code} textValue={`${option.code} ${option.name}`}>
                <div className="flex flex-col py-0.5 leading-tight">{option.code === RETURN_AS_IS_CODE ? <span className="text-xs font-medium text-slate-700">Return as is</span> : <><span className="text-xs font-medium text-slate-700">{option.code}</span><span className="text-[11px] text-slate-500">{option.name}</span></>}<ListBox.ItemIndicator /></div>
              </ListBox.Item>)}
            </ListBox>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
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
  onAddExistingItem,
  onHsnSelectionChange,
  onRemoveItem,
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
    () => rows.map((row, index) => ({ ...row, rowIndex: index, rowKey: `${row.gaugeIndex}-${row.itemData.gaugeItem.id}` })),
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
      const { gaugeIndex, itemData, amount, rowIndex, quantity, calibrationEntry, repairEntry, otherEntries } = row;
      const allEntries = [...otherEntries, calibrationEntry, repairEntry].filter((entry): entry is InvoiceItemHSN => Boolean(entry));

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
              <Autocomplete value={currentGaugeKey} aria-label="Manual gauge name" isDisabled={isReadOnly} onSelectionChange={(key) => {
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
              <InvoiceSpecificationDisplay
                className="whitespace-pre-wrap break-words"
                specification={
                itemData.gaugeItem.specifications ||
                itemData.gaugeItem.specification ||
                itemData.gaugeItem.gauge_specification
                }
                unit={String(itemData.gaugeItem.unit || "mm")}
                gaugeType={itemData.gaugeItem.master_gauge_name}
              />
            </div>
          );
        case "hsn":
          return (
            <div className="space-y-2">
              <HsnMultiSelect entries={allEntries} isDisabled={isReadOnly} onChange={(codes) => onHsnSelectionChange(gaugeIndex, codes)} />
              {otherEntries.map((entry) => isReturnAsIsEntry(entry)
                ? <div key={entry.id} className="text-xs font-medium text-slate-700">Return as is</div>
                : <div key={entry.id} className="flex items-center gap-1"><span className="min-w-[48px] text-[11px] text-slate-500">{entry.hsnCode}</span><Input aria-label={`${entry.hsnName || entry.hsnCode} rate`} type="number" value={entry.rate} onChange={(event) => onRateChange(gaugeIndex, entry.id, event.target.value)} disabled={isReadOnly} min="0" step="0.01" /></div>)}
            </div>
          );
        case "calibration":
        case "repair": {
          const entry = columnKey === "calibration" ? calibrationEntry : repairEntry;
          if (!entry || isReturnAsIsEntry(entry)) return <span className="text-slate-400">-</span>;
          return <div className="w-full min-w-0"><Input aria-label={`${columnKey} rate`} type="number" value={entry.rate} onChange={(event) => onRateChange(gaugeIndex, entry.id, event.target.value)} disabled={isReadOnly} min="0" step="0.01" className="w-full" /><div className="mt-1 whitespace-nowrap text-right text-[11px] text-slate-500">{formatCurrency(entry.rate || 0)}</div></div>;
        }
        case "qty":
          return (
            <Input
              aria-label="Quantity"
              type="number"
              value={String(quantity)}
              onChange={(event) => onQuantityChange(gaugeIndex, parseInt(event.target.value, 10) || 1)}
              disabled={isReadOnly}
              min="1"
              className="w-full "
            />
          );
        case "discount":
          return (
            <div className="space-y-1.5">
              {allEntries.map((entry) => <div key={entry.id} className="flex min-w-[155px] items-center gap-1">
              <span className="w-[42px] truncate text-[11px] text-slate-500" title={`${entry.hsnCode} ${entry.hsnName}`}>{entry.hsnCode === RETURN_AS_IS_CODE ? "Return" : entry.hsnCode}</span>
              <Select aria-label={`${entry.hsnCode} discount type`} value={entry.discountType || "none"} isDisabled={isReadOnly || !onDiscountChange} onSelectionChange={(key) => key && onDiscountChange?.(gaugeIndex, entry.id, String(key) as 'none' | 'percentage' | 'flat', entry.discountValue || '')}>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>
                  <ListBox.Item id="none" textValue="None">None<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="percentage" textValue="%">%<ListBox.ItemIndicator /></ListBox.Item><ListBox.Item id="flat" textValue="₹">₹<ListBox.ItemIndicator /></ListBox.Item>
                </ListBox></Select.Popover>
              </Select>
              <Input aria-label="Discount value" type="number" min="0" value={entry.discountValue || ""} disabled={isReadOnly || !onDiscountChange || isReturnAsIsEntry(entry)} onChange={(event) => onDiscountChange?.(gaugeIndex, entry.id, entry.discountType || 'none', event.target.value)} />
              </div>)}
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
                aria-label="Remove invoice item"
                onPress={() => onRemoveItem(gaugeIndex)}
                isDisabled={isReadOnly}
                className="h-8 w-8 min-w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        default:
          return null;
      }
    },
    [
      gaugeMasterError,
      gaugeMasterList,
      gaugeMasterLoading,
      isReadOnly,
      onGaugeFieldChange,
      onHsnSelectionChange,
      onManualGaugeSelect,
      onQuantityChange,
      onDiscountChange,
      onRateChange,
      onRemoveItem,
      page,
      rowsPerPage,
    ],
  );

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-end">
        {!isReadOnly && (
          <>
            <Button type="button" onPress={onAddItem} variant="primary" className="h-9 rounded-xl px-4 text-sm font-semibold text-white">Add Item</Button>
            {onAddExistingItem && <Button type="button" onPress={onAddExistingItem} variant="secondary" className="h-9 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">Add Existing Item</Button>}
          </>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table aria-label="Invoice billing items table" className={dataTableClassName("min-w-full !rounded-none !border-0 !shadow-none")}>
          <Table.ScrollContainer className="max-w-full overflow-x-auto p-0"><Table.Content className="min-w-[1480px] w-full table-auto">
          <Table.Header columns={tableColumns}>
            {(column) => (
              <Table.Column id={column.uid} isRowHeader={column.uid === tableColumns[0]?.uid} className={COLUMN_LAYOUT[column.uid]}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={tableRows}
            renderEmptyState={() => loading ? <div className="py-8 text-center text-sm text-slate-500">Loading invoice items...</div> : <div className="flex flex-col items-center gap-3 py-10"><span className="text-sm text-slate-500">No invoice items added yet</span><div className="flex gap-2"><Button type="button" onPress={onAddItem} variant="secondary" className="rounded-2xl bg-slate-100 text-slate-700" isDisabled={isReadOnly}>Add Manual Item</Button>{onAddExistingItem && <Button type="button" onPress={onAddExistingItem} variant="secondary" className="rounded-2xl border border-slate-200 text-slate-700" isDisabled={isReadOnly}>Add Existing Item</Button>}</div></div>}
          >
            {(row) => (
              <Table.Row id={row.rowKey} columns={tableColumns}>
                {(columnKey) => (
                  <Table.Cell className={`align-middle ${COLUMN_LAYOUT[getTableColumnKey(columnKey) as TableColumnKey]}`}>
                    {renderCell(row, getTableColumnKey(columnKey) as TableColumnKey)}
                  </Table.Cell>
                )}
              </Table.Row>
            )}
          </Table.Body></Table.Content></Table.ScrollContainer>
        </Table>
      </div>

      {totalRows > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <span className="text-slate-500">
            Showing {showingFrom} to {showingTo} of {totalRows} items
          </span>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <div className="flex items-center gap-2">
              <span className="text-[12px] uppercase tracking-[0.12em] text-slate-400">
                Rows
              </span>
              <Select aria-label="Rows per page" value={String(rowsPerPage)} onSelectionChange={onRowsChange} className="w-[88px]"><Select.Trigger className="min-h-8 h-8 rounded-lg border border-slate-200 bg-white shadow-none"><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{['25','50','100','200','500'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover></Select>
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
