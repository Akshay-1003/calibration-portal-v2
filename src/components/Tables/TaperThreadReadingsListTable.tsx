"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Selection,
  SortDescriptor,
  Pagination,
  Select,
  SelectItem,
} from "@heroui-v2/react";

import { TaperThreadReadingsData } from "../../store/taperThreadReadingsStore";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";

interface TaperThreadReadingsListTableProps {
  data: TaperThreadReadingsData[];
  onDeleteTaperThreadReading?: (standardSpecification: string) => Promise<void> | void;
  onEdit?: (standardSpecification: string) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

type TableColumnKey =
  | "id"
  | "standard_specification"
  | "pitch_dial_max"
  | "pitch_dial_min"
  | "max_step"
  | "basic_step"
  | "min_step"
  | "total_length"
  | "gauge_type"
  | "gauge_sub_type"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "ID", uid: "id", sortable: true },
  { name: "STD.SPECI", uid: "standard_specification" },
  { name: "PITCH DIA MAX", uid: "pitch_dial_max" },
  { name: "PITCH DIA MIN", uid: "pitch_dial_min" },
  { name: "MAX STEP", uid: "max_step" },
  { name: "BASIC STEP", uid: "basic_step" },
  { name: "MIN STEP", uid: "min_step" },
  { name: "TOTAL LENGTH", uid: "total_length" },
  { name: "TYPE", uid: "gauge_type" },
  { name: "SUB TYPE", uid: "gauge_sub_type" },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "id",
  "standard_specification",
  "pitch_dial_max",
  "pitch_dial_min",
  "max_step",
  "basic_step",
  "min_step",
  "total_length",
  "gauge_type",
  "gauge_sub_type",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

const TaperThreadReadingsListTable = React.memo(function TaperThreadReadingsListTable({
  data,
  onDeleteTaperThreadReading,
  onEdit,
  loading = false,
  error = null,
  onRefresh,
}: TaperThreadReadingsListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "id" as Key,
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<TaperThreadReadingsData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const requestDelete = React.useCallback(
    (item: TaperThreadReadingsData) => {
      if (!onDeleteTaperThreadReading) return;
      setDeleteTarget(item);
      setDeleteOpen(true);
    },
    [onDeleteTaperThreadReading]
  );

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || !onDeleteTaperThreadReading) return;
    setIsDeleting(true);
    try {
      await onDeleteTaperThreadReading(deleteTarget.standard_specification);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDeleteTaperThreadReading]);

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!hasSearchFilter) return [...data];
    const lower = filterValue.toLowerCase();
    return data.filter((item) => 
      item.standard_specification?.toLowerCase().includes(lower) ||
      item.gauge_type?.toLowerCase().includes(lower) ||
      item.gauge_sub_type?.toLowerCase().includes(lower)
    );
  }, [data, filterValue, hasSearchFilter]);

  const pages = Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, page, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      if (!column || column === "actions") return 0;
      const first = (a[column as keyof TaperThreadReadingsData] ?? "").toString().toLowerCase();
      const second = (b[column as keyof TaperThreadReadingsData] ?? "").toString().toLowerCase();

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const renderCell = React.useCallback(
    (item: TaperThreadReadingsData, columnKey: React.Key) => {
      const value = item[columnKey as keyof TaperThreadReadingsData];
      switch (columnKey) {
        case "id":
          return (
            <div className="text-[13px] font-medium truncate max-w-[100px]" title={String(value ?? "")}>
              {value || "N/A"}
            </div>
          );
        case "standard_specification":
          return (
            <div className="text-[13px] truncate max-w-[200px]" title={(value as string) ?? ""}>
              {value || "N/A"}
            </div>
          );
        case "pitch_dial_max":
        case "pitch_dial_min":
        case "max_step":
        case "basic_step":
        case "min_step":
        case "total_length":
          return (
            <div className="text-[13px]" title={String(value ?? "")}>
              {value !== null && value !== undefined && value !== '' ? String(value) : "N/A"}
            </div>
          );
        case "gauge_type":
        case "gauge_sub_type":
          return (
            <div className="text-[13px] truncate max-w-[150px]" title={(value as string) ?? ""}>
              {value || "N/A"}
            </div>
          );
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
           
                <Button
                  size="sm"
                  variant="bordered"
                  className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                  onPress={() => (window.location.href = `/masters/taper-thread-readings/edit/${item.standard_specification}`)}
                >
                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                  
                </Button>
              {onDeleteTaperThreadReading && (
                <Button
                  size="sm"
                  variant="bordered"
                  className="bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => requestDelete(item)}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                </Button>
              )}
            </div>
          );
        default:
          return value as string;
      }
    },
    [onDeleteTaperThreadReading, onEdit, requestDelete],
  );

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    setRowsPerPage(Number(value));
    setPage(1);
  }, []);

  const onSearchChange = React.useCallback((value?: string) => {
    setFilterValue(value ?? "");
    setPage(1);
  }, []);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    setPage(1);
  }, []);

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

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">Unable to load taper thread readings</p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="bordered" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No data found";
  }, [error, onRefresh]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by standard specification, type..."
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={filterValue}
            onClear={onClear}
            onValueChange={onSearchChange}
          />
          <div className="flex gap-3">
            {onRefresh && (
              <Button onPress={onRefresh} size="sm" variant="flat" isDisabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            )}
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon className="text-small w-4 h-4" />} variant="flat">
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="Table Columns"
                closeOnSelect={false}
                disallowEmptySelection
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
  }, [filteredItems.length, filterValue, loading, onRefresh, onRowsPerPageChange, onSearchChange, onClear, rowsPerPage, visibleColumns]);

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
        <div className="flex flex-col sm:flex-row items-center sm:justify-end sm:w-1/6 gap-3">
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

        </div>
      </div>
    );
  }, [filteredItems.length, page, pages, selectedKeys, onNextPage, onPreviousPage, rowsPerPage, onRowsPerPageChange]);

  return (
    <div className="p-2 industrial-table-wrapper">
    <Table
      aria-label="Taper thread readings list table"
      isHeaderSticky
      bottomContent={bottomContent}
      bottomContentPlacement="outside"
      classNames={{ wrapper: "max-h-[calc(100vh-320px)] p-0" }}
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
          <TableColumn key={column.uid} align={column.uid === "actions" ? "center" : "start"} allowsSorting={column.sortable}>
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody 
        emptyContent={emptyContent} 
        items={sortedItems} 
        isLoading={loading}
        loadingContent={
          <div className="py-8 flex justify-center items-center text-sm text-default-500">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        }
      >
        {(item) => (
          <TableRow key={item.id}>
            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
          </TableRow>
        )}
      </TableBody>
    </Table>
    <DeleteConfirmModal
      isOpen={deleteOpen}
      onClose={closeDelete}
      title="Delete taper thread reading"
      message={
        <>
          Are you sure you want to delete{' '}
          <span className="font-semibold text-gray-900">
            {deleteTarget?.standard_specification ?? 'this item'}
          </span>
          ? This action cannot be undone.
        </>
      }
      isConfirmLoading={isDeleting}
      onConfirm={confirmDelete}
    />
    </div>
  );
});

TaperThreadReadingsListTable.displayName = 'TaperThreadReadingsListTable';

export default TaperThreadReadingsListTable;

