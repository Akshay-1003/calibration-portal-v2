"use client";
import React from "react";
import type { Key } from "@react-types/shared";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  Selection,
  SortDescriptor,
  DropdownItem,
  Pagination,
  Select,
  SelectItem,
} from "@heroui-v2/react";
import { GaugeData as ExistingGaugeType } from "../../types/types";
import { MagnifyingGlassIcon, ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { SpecificationChips } from "../gaugeTypes/SpecificationChips";

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
              title="Load this gauge into the form to create an inward"
            >
              Add
            </Button>
            {onDeleteGauge ? (
              <Button
                isIconOnly
                onPress={() => onDeleteGauge(gauge)}
                size="sm"
                color="danger"
                variant="light"
                className="h-7 w-7 min-w-7"
                title="Delete this saved data"
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

  const onNextPage = React.useCallback(() => {
    if (page < pages) {
      setPage(page + 1);
    }
  }, [page, pages]);

  const onPreviousPage = React.useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

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
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name, identification, or make..."
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={filterValue}
            onClear={() => onClear()}
            onValueChange={onSearchChange}
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
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
        <Pagination
          color="primary"
          isCompact
          showControls
          page={page}
          total={pages}
          onChange={setPage}
          className="scale-90"
        />

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Small Select */}
          <Select
            label="Rows Per Page"
            selectedKeys={new Set([String(rowsPerPage)])}
            onSelectionChange={onRowsPerPageChange}
            labelPlacement="outside-left"
            size="sm"
            className="min-w-[140px]"
          >
            <SelectItem key="10">10</SelectItem>
            <SelectItem key="20">20</SelectItem>
            <SelectItem key="50">50</SelectItem>
            <SelectItem key="100">100</SelectItem>
          </Select>

          {/* Small Buttons */}
          <Button
            isDisabled={page === 1}
            size="sm"
            variant="light"
            className="h-7 px-2 text-xs"
            onPress={onPreviousPage}
          >
            Prev
          </Button>

          <Button
            isDisabled={page === pages}
            size="sm"
            variant="light"
            className="h-7 px-2 text-xs"
            onPress={onNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }, [selectedKeys, page, pages, onPreviousPage, onNextPage, filteredItems.length, rowsPerPage, onRowsPerPageChange]);

  return (
    <Table
      aria-label="Data Save gauges table"
      isHeaderSticky
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      classNames={{
        wrapper: "max-h-[calc(100vh-320px)] p-0",
      }}
      selectedKeys={selectedKeys}
      selectionMode="multiple"
      sortDescriptor={sortDescriptor}
      topContent={topContent}
      topContentPlacement="outside"
      onSelectionChange={setSelectedKeys}
      onSortChange={setSortDescriptor}
    >
      <TableHeader columns={headerColumns}>
        {(column) => (
          <TableColumn
            key={column.uid}
            align={column.uid === "actions" ? "center" : "start"}
            allowsSorting={column.sortable}
          >
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={"No data save gauges found"}
        items={sortedItems}
        isLoading={loading}
        loadingContent={<div className="py-8 flex justify-center items-center text-sm text-default-500"><svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Loading...</div>}
      >
        {(item) => (
          <TableRow key={item.id}>
            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
