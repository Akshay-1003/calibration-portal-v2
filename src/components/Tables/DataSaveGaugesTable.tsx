"use client";
import React from "react";
import type { Key } from "@react-types/shared";
import {
  Table,
  Input,
  Button,
  Label,
  ListBox,
  Popover,
  Select,
} from "@heroui/react";
import type { Selection, SortDescriptor } from "@react-types/shared";
import { GaugeData as ExistingGaugeType } from "../../types/types";
import { MagnifyingGlassIcon, ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { SpecificationChips } from "../gaugeTypes/SpecificationChips";
import "../../styles/industrial-table.css";
import { getTableColumnKey } from './tableColumnKey';
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

type TableColumnKey =
  | "master_gauge"
  | "make"
  | "identification_number"
  | "specifications"
  | "manf_serial_number"
  | "calibration_frequency"
  | "created_at"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "NAME", uid: "master_gauge", sortable: true },
  { name: "MAKE", uid: "make", sortable: true },
  { name: "IDENTIFICATION NO", uid: "identification_number" },
  { name: "SPECIFICATION", uid: "specifications" },
  { name: "SR NO", uid: "manf_serial_number" },
  { name: "FREQUENCY", uid: "calibration_frequency" },
  { name: "SAVED DATE", uid: "created_at", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["master_gauge", "make", "identification_number", "specifications", "manf_serial_number", "created_at", "actions"];

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

export function DataSaveGaugesTable({
  data = [],
  onAddGauge,
  onDeleteGauge,
  loading = false
}: {
  onAddGauge: (gauge: ExistingGaugeType) => void;
  onDeleteGauge?: (gauge: ExistingGaugeType) => void;
  data: ExistingGaugeType[];
  loading?: boolean;
}) {
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "master_gauge" as Key,
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);
  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;

    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filteredData = [...data];

    if (hasSearchFilter) {
      filteredData = filteredData.filter((item) =>
        item.master_gauge?.toLowerCase().includes(filterValue.toLowerCase()) ||
        item.identification_number?.toLowerCase().includes(filterValue.toLowerCase()) ||
        item.make?.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    return filteredData;
  }, [data, filterValue, hasSearchFilter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a: ExistingGaugeType, b: ExistingGaugeType) => {
      const first = a[sortDescriptor.column as keyof ExistingGaugeType] as string | number;
      const second = b[sortDescriptor.column as keyof ExistingGaugeType] as string | number;
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  const renderCell = React.useCallback((gauge: ExistingGaugeType, columnKey: React.Key) => {
    const cellValue = gauge[columnKey as keyof ExistingGaugeType];
    const formatText = (value: unknown) => (value === null || value === undefined ? "-" : String(value));

    switch (columnKey) {
      case "master_gauge":
        return (
          <div className="font-medium text-[13px] truncate max-w-[200px]" title={cellValue as string}>
            {formatText(cellValue)}
          </div>
        );
      case "make":
        return (
          <div className="text-[13px] truncate max-w-[100px]" title={cellValue as string}>
            {formatText(cellValue)}
          </div>
        );
      case "identification_number":
        return (
          <div className="text-[13px] truncate max-w-[120px]" title={cellValue as string}>
            {formatText(cellValue)}
          </div>
        );
      case "specifications":
        if (gauge.specifications) {
          return (
            <SpecificationChips
              specifications={gauge.specifications}
              gaugeType={gauge.master_gauge}
              unit={gauge.unit || "mm"}
              maxChips={3}
              size="sm"
              variant="flat"
              className="max-w-[220px]"
            />
          );
        }
        return (
          <div className="text-[13px] truncate max-w-[120px]" title={gauge.gauge_class || "-"}>
            {gauge.gauge_class || "-"}
          </div>
        );
      case "manf_serial_number":
        return (
          <div className="text-[13px] truncate max-w-[100px]" title={cellValue as string}>
            {formatText(cellValue)}
          </div>
        );
      case "calibration_frequency":
        return (
          <div className="text-[13px] truncate max-w-[100px]" title={`${formatText(cellValue)} ${gauge.calibration_frequency_unit ?? ""}`.trim()}>
            {formatText(cellValue)} {gauge.calibration_frequency_unit}
          </div>
        );
      case "created_at":
        return (
          <div className="text-[13px] truncate max-w-[120px]" title={cellValue ? new Date(cellValue as string).toLocaleDateString() : "N/A"}>
            {cellValue ? new Date(cellValue as string).toLocaleDateString() : "N/A"}
          </div>
        );
      case "actions":
        return (
          <div className="flex gap-2">
            <Button
              onPress={() => onAddGauge(gauge)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
              aria-label="Load this gauge into the form to create an inward"
            >
              Add
            </Button>
            {onDeleteGauge ? (
              <Button
                isIconOnly
                onPress={() => onDeleteGauge(gauge)}
                size="sm"
                variant="danger-soft"
                className="h-7 w-7 min-w-7"
                aria-label="Delete this saved data"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        );
      default:
        return cellValue === null || cellValue === undefined ? "-" : String(cellValue);
    }
  }, [onAddGauge, onDeleteGauge]);

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    setRowsPerPage(Number(value));
    setPage(1);
  }, []);

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue("");
    }
  }, []);

  const onClear = React.useCallback(() => {
    setFilterValue("")
    setPage(1)
  }, [])

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex justify-between gap-3 items-end">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name, identification, or make..."
            value={filterValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear gauge search" onPress={onClear}><MagnifyingGlassIcon className="w-4 h-4" /></Button> : null}
          <div className="flex gap-3">
            <Popover>
              <Popover.Trigger>
                <Button variant="secondary" className="hidden sm:flex">
                  Columns
                  <ChevronDownIcon className="text-small" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-64 p-1">
                <Popover.Dialog>
                  <ListBox aria-label="Table Columns" selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>
                    {columns.map((column) => (
                      <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>
                        {capitalize(column.name)}<ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </div>
        </div>
      </div>
    );
  }, [
    filterValue,
    visibleColumns,
    onSearchChange,
    onClear,
  ]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:flex-row items-center justify-between px-2 py-1 gap-2 border-t bg-white text-sm">
        {/* Selected text */}
        <span className="text-default-400 whitespace-nowrap">
          {selectedKeys === "all"
            ? "All items selected"
            : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>

        {/* Pagination */}
        <TablePagination page={page} totalPages={pages} onPageChange={setPage} />

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Small Select */}
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={(key) => onRowsPerPageChange(new Set(key == null ? [] : [key]))}
            className="min-w-[140px]"
          >
            <Label>Rows Per Page</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {['10', '20', '50', '100'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}
              </ListBox>
            </Select.Popover>
          </Select>

        </div>
      </div>
    );
  }, [selectedKeys, page, pages, filteredItems.length, rowsPerPage, onRowsPerPageChange]);

  return (
    <div className="industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Data Save gauges table" className={dataTableClassName("min-w-full")}>
        <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
          <Table.Content
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
      <Table.Header columns={headerColumns}>
        {(column) => (
          <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === headerColumns[0]?.uid}>
            {column.name}
          </Table.Column>
        )}
      </Table.Header>
      <Table.Body
        items={sortedItems}
        renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? "Loading..." : "No data save gauges found"}</div>}
      >
        {(item) => (
          <Table.Row id={item.id} columns={headerColumns}>
            {(columnKey) => <Table.Cell>{renderCell(item, getTableColumnKey(columnKey))}</Table.Cell>}
          </Table.Row>
        )}
      </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {bottomContent}
    </div>
  );
}
