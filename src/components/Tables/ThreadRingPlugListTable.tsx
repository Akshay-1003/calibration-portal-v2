"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
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

import { ThreadRingPlugData } from "../../store/threadRingPlugStore";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
interface ThreadRingPlugListTableProps {
  data: ThreadRingPlugData[];
  total?: number;
  page?: number;
  rowsPerPage?: number;
  onDeleteThreadRingPlug?: (id: string) => Promise<void> | void;
  onEdit?: (standardSpecification: string) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

type TableColumnKey =
  | "gauge_type"
  | "standard_specification"
  | "go_max_wear_limit"
  | "go_min_wear_limit"
  | "go_wear_limit"
  | "no_go_max_wear_limit"
  | "no_go_min_wear_limit"
  | "no_go_wear_limit"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "GAUGE TYPE", uid: "gauge_type", sortable: true },
  { name: "STANDARD SPECIFICATION", uid: "standard_specification" },
  { name: "GO MAX WEAR (MM)", uid: "go_max_wear_limit" },
  { name: "GO MIN WEAR (MM)", uid: "go_min_wear_limit" },
  { name: "GO WEAR (MM)", uid: "go_wear_limit" },
  { name: "NO GO MAX WEAR (MM)", uid: "no_go_max_wear_limit" },
  { name: "NO GO MIN WEAR (MM)", uid: "no_go_min_wear_limit" },
  { name: "NO GO WEAR (MM)", uid: "no_go_wear_limit" },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "gauge_type",
  "standard_specification",
  "go_max_wear_limit",
  "go_min_wear_limit",
  "go_wear_limit",
  "no_go_max_wear_limit",
  "no_go_min_wear_limit",
  "no_go_wear_limit",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

const ThreadRingPlugListTable = React.memo(function ThreadRingPlugListTable({
  data,
  total,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  onDeleteThreadRingPlug,
  onEdit,
  loading = false,
  error = null,
  onRefresh,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
}: ThreadRingPlugListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "gauge_type" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);
  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;
  const isServerPagination = typeof total === "number" && typeof controlledOnPageChange === "function";
  const currentSearchValue = controlledSearchValue ?? filterValue;

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ThreadRingPlugData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const requestDelete = React.useCallback(
    (item: ThreadRingPlugData) => {
      if (!onDeleteThreadRingPlug) return;
      setDeleteTarget(item);
      setDeleteOpen(true);
    },
    [onDeleteThreadRingPlug]
  );

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || !onDeleteThreadRingPlug) return;
    setIsDeleting(true);
    try {
      await onDeleteThreadRingPlug(deleteTarget.id);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDeleteThreadRingPlug]);

  const hasSearchFilter = Boolean(currentSearchValue.trim());

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!hasSearchFilter) return [...data];

    const searchWords = currentSearchValue
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return data.filter((item) => {
      const searchableText = [
        item.gauge_type,
        item.standard_specification,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

      return searchWords.every((word) => searchableText.includes(word));
    });
  }, [currentSearchValue, data, hasSearchFilter]);

  const totalRecords = isServerPagination ? (total ?? data.length) : filteredItems.length;
  const pages = (isServerPagination && !hasSearchFilter)
    ? Math.max(Math.ceil(totalRecords / Math.max(rowsPerPage, 1)), 1)
    : Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  const items = React.useMemo(() => {
    if (isServerPagination && !hasSearchFilter) {
      return filteredItems;
    }
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, hasSearchFilter, isServerPagination, page, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      if (!column || column === "actions") return 0;
      const first = (a[column as keyof ThreadRingPlugData] ?? "").toString().toLowerCase();
      const second = (b[column as keyof ThreadRingPlugData] ?? "").toString().toLowerCase();

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const renderCell = React.useCallback(
    (item: ThreadRingPlugData, columnKey: React.Key) => {
      const value = item[columnKey as keyof ThreadRingPlugData];
      switch (columnKey) {
        case "gauge_type":
          return (
            <div className="text-[13px] font-medium truncate max-w-[200px]" title={(value as string) ?? ""}>
              {value === 'thread_plug_gauge' ? 'Thread Plug Gauge' : value === 'thread_ring_gauge' ? 'Thread Ring Gauge' : "N/A"}
            </div>
          );
        case "standard_specification":
          return (
            <div className="text-[13px] truncate max-w-[200px]" title={(value as string) ?? ""}>
              {value || "N/A"}
            </div>
          );
        case "go_max_wear_limit":
        case "go_min_wear_limit":
        case "go_wear_limit":
        case "no_go_max_wear_limit":
        case "no_go_min_wear_limit":
        case "no_go_wear_limit":
          return (
            <div className="text-[13px]" title={String(value ?? "")}>
              {value !== null && value !== undefined && value !== '' ? String(value) : "N/A"}
            </div>
          );
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="bordered"
                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                onPress={() => onEdit?.(item.standard_specification)}
              >
                <PencilSquareIcon className="h-4 w-4 mr-1" />

              </Button>
              {onDeleteThreadRingPlug && (
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
    [onDeleteThreadRingPlug, onEdit, requestDelete],
  );

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    const nextRowsPerPage = Number(value);
    if (controlledOnRowsPerPageChange) {
      controlledOnRowsPerPageChange(nextRowsPerPage);
    } else {
      setLocalRowsPerPage(nextRowsPerPage);
    }

    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnRowsPerPageChange]);

  const onSearchChange = React.useCallback((value?: string) => {
    const nextValue = value ?? "";
    if (controlledOnSearchChange) {
      controlledOnSearchChange(nextValue);
    } else {
      setFilterValue(nextValue);
    }
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnSearchChange]);

  const onClear = React.useCallback(() => {
    if (controlledOnSearchChange) {
      controlledOnSearchChange("");
    } else {
      setFilterValue("");
    }
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnSearchChange]);

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">Unable to load thread & ring plugs</p>
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
            placeholder="Search by gauge type or standard specification..."
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={currentSearchValue}
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
  }, [currentSearchValue, loading, onRefresh, onSearchChange, onClear, visibleColumns]);

  const bottomContent = React.useMemo(() => {
    const effectiveTotalRecords = hasSearchFilter ? filteredItems.length : totalRecords;
    const showingFrom = effectiveTotalRecords === 0 ? 0 : (page - 1) * rowsPerPage + 1;
    const showingTo = effectiveTotalRecords === 0
      ? 0
      : Math.min((page - 1) * rowsPerPage + sortedItems.length, effectiveTotalRecords);

    return (
      <div className="w-full flex flex-col sm:flex-row items-center justify-between px-2 py-1 gap-2 border-t bg-white text-sm">
        <span className="text-default-400 whitespace-nowrap">
          {(isServerPagination && !hasSearchFilter) || hasSearchFilter
            ? `Showing ${showingFrom} to ${showingTo} of ${effectiveTotalRecords} records`
            : selectedKeys === "all"
              ? "All items selected"
              : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>

        <Pagination
          color="primary"
          isCompact
          showControls
          page={page}
          total={pages}
          onChange={(nextPage) => {
            if (controlledOnPageChange) {
              controlledOnPageChange(nextPage);
            } else {
              setLocalPage(nextPage);
            }
          }}
          className="scale-90"
        />

        <div className="flex flex-col sm:flex-row items-center sm:justify-end sm:w-1/6 gap-3">
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
  }, [
    controlledOnPageChange,
    filteredItems.length,
    hasSearchFilter,
    isServerPagination,
    page,
    pages,
    rowsPerPage,
    selectedKeys,
    sortedItems.length,
    totalRecords,
    onRowsPerPageChange,
  ]);

  return (
    <div className=" p-2 industrial-table-wrapper">
      <Table
        aria-label="Thread ring plug list table"
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
        title="Delete thread ring/plug"
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

ThreadRingPlugListTable.displayName = 'ThreadRingPlugListTable';

export default ThreadRingPlugListTable;
