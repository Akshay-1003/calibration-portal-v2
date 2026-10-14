"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { useNavigate } from "react-router-dom";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";

import { Badge } from "../../components/ui/badge";
import { getTableColumnKey } from './tableColumnKey';
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
import { ReadingMasterListItem } from "../../store/readingMasterStore";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

interface ReadingMasterListTableProps {
  data: ReadingMasterListItem[];
  onDelete?: (id: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

type TableColumnKey =
  | "master_gauge_name"
  | "reading_range"
  | "created_at"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "MASTER GAUGE NAME", uid: "master_gauge_name", sortable: true },
  { name: "READING RANGE", uid: "reading_range", sortable: true },
  { name: "CREATED DATE", uid: "created_at", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "master_gauge_name",
  "reading_range",
  "created_at",
  "actions",
];

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const formatText = (value: unknown) =>
  value === undefined || value === null || value === "" ? "N/A" : String(value);

const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const toSortableValue = (value: unknown, column: Key): string | number => {
  if (column === "created_at") {
    return typeof value === "string" && value
      ? new Date(value).getTime()
      : 0;
  }

  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number") return value;
  return "";
};

/**
 * Format reading number with 3 decimal places
 * Rules:
 * - 1-2 digits: add .000 (e.g., 0 -> 0.000, 75 -> 75.000)
 * - 3-4 digits: add .00 (e.g., 1000 -> 1000.00)
 * - Already has decimals: format to 3 decimal places
 */
const formatReadingNumber = (value: string | number): string => {
  if (!value && value !== 0) return "0.000";

  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0.000";

  const absNum = Math.abs(num);
  const wholePart = Math.floor(absNum);
  const wholePartStr = wholePart.toString();

  // Determine decimal places based on whole number length
  if (wholePartStr.length <= 2) {
    // 1-2 digits: use 3 decimal places
    return num.toFixed(3);
  } else if (wholePartStr.length <= 4) {
    // 3-4 digits: use 2 decimal places
    return num.toFixed(2);
  } else {
    // 5+ digits: use 3 decimal places
    return num.toFixed(3);
  }
};

export default function ReadingMasterListTable({
  data,
  onDelete,
  loading = false,
  error = null,
  onRefresh,
}: ReadingMasterListTableProps) {
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  );
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "created_at" as Key,
    direction: "descending",
  });
  const [page, setPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ReadingMasterListItem | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid)
    );
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!hasSearchFilter) return [...data];
    const lower = filterValue.toLowerCase();
    return data.filter(
      (item) =>
        item.master_gauge_name?.toLowerCase().includes(lower)
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

      const first = toSortableValue(a[column as keyof ReadingMasterListItem], column);
      const second = toSortableValue(b[column as keyof ReadingMasterListItem], column);

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const requestDelete = React.useCallback(
    (item: ReadingMasterListItem) => {
      if (!onDelete) return;
      setDeleteTarget(item);
      setDeleteOpen(true);
    },
    [onDelete]
  );

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDelete]);
  const renderRanges = React.useCallback((ranges?: ReadingMasterListItem["reading_range"]) => {
    if (!Array.isArray(ranges) || ranges.length < 2) {
      return <span className="text-default-400 text-[12px] italic">No range</span>;
    }

    const minValue = formatReadingNumber(ranges[0]);
    const maxValue = formatReadingNumber(ranges[1]);

    return (
      <div className="flex items-center">
        <Badge
          variant="outline"
          className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm"
        >
          <span className="font-semibold">{minValue}</span>
          <span className="mx-2 text-blue-500">-</span>
          <span className="font-semibold">{maxValue}</span>
        </Badge>
      </div>
    );
  }, []);
  const renderCell = React.useCallback(
    (item: ReadingMasterListItem, columnKey: React.Key) => {
      switch (columnKey) {
        case "master_gauge_name":
          return (
            <div
              className="text-[13px] truncate max-w-[200px]"
              title={formatText(item.master_gauge_name)}
            >
              {formatText(item.master_gauge_name)}
            </div>
          );
        case "reading_range":
          return (
            renderRanges(item.reading_range as ReadingMasterListItem["reading_range"])
          );
        case "created_at":
          return (
            <div
              className="text-[13px]"
              title={
                item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : "N/A"
              }
            >
              {formatDate(item.created_at)}
            </div>
          );
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
                onPress={() => navigate(`/masters/reading-master/edit/${item.master_gauge_id}`)}
              >
                <PencilSquareIcon className="h-4 w-4 mr-1" />

              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => requestDelete(item)}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />

                </Button>
              )}
            </div>
          );
        default:
          return formatText(item[columnKey as keyof ReadingMasterListItem]);
      }
    },
    [navigate, onDelete, renderRanges, requestDelete]
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

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">
            Unable to load reading masters
          </p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="secondary" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No reading masters found";
  }, [error, onRefresh]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search by gauge name or reading_range..."
            value={filterValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear reading master search" onPress={onClear}><MagnifyingGlassIcon className="w-4 h-4" /></Button> : null}
          <div className="flex gap-3">
            <Popover>
              <Popover.Trigger>
                <Button className="hidden sm:flex" variant="secondary">
                  Columns
                  <ChevronDownIcon className="text-small w-4 h-4" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-64 p-1">
                <Popover.Dialog><ListBox aria-label="Table Columns" selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>
                  {columns.map((column) => <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>{capitalize(column.name)}<ListBox.ItemIndicator /></ListBox.Item>)}
                </ListBox></Popover.Dialog>
              </Popover.Content>
            </Popover>
          </div>
        </div>
      </div>
    );
  }, [filterValue, onSearchChange, onClear, visibleColumns]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="flex items-center justify-between py-3 px-2 gap-4">

        {/* LEFT - Selected count */}
        <div className="flex-1">
          <span className="text-small text-default-400">
            {selectedKeys === "all"
              ? "All items selected"
              : `${selectedKeys.size} of ${filteredItems.length} selected`}
          </span>
        </div>

        {/* CENTER - Pagination */}
        <div className="flex-1 flex justify-center">
          <TablePagination page={page} totalPages={pages} onPageChange={setPage} />
        </div>

        {/* RIGHT - Rows per page */}
        <div className="flex-1 flex justify-end w-10">
          <Select selectedKey={String(rowsPerPage)} onSelectionChange={(key) => onRowsPerPageChange(new Set(key == null ? [] : [key]))} className="w-[160px]">
            <Label>Rows per page</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox>{['10', '20', '50', '100'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
          </Select>
        </div>

      </div>

    );
  }, [filteredItems.length, page, pages, selectedKeys, rowsPerPage, onRowsPerPageChange]);

  return (
    <div className="p-2 industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Reading master list table" className={dataTableClassName("min-w-full")}>
        <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
          <Table.Content selectedKeys={selectedKeys} selectionMode="multiple" sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}>
        <Table.Header columns={headerColumns}>
          {(column) => (
            <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === columns[0]?.uid}>
              {column.name}
            </Table.Column>
          )}
        </Table.Header>
        <Table.Body
          items={sortedItems}
          renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? "Loading..." : emptyContent}</div>}
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
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Delete reading master"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.master_gauge_name ?? 'this reading master'}
            </span>
            ? This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
