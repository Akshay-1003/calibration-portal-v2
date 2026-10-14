"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { useNavigate } from "react-router-dom";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
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

import { EquipmentHistoryData } from "../../store/equipmentHistoryStore";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

interface EquipmentHistoryListTableProps {
  data: EquipmentHistoryData[];
  onDeleteHistory?: (historyId: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onUpdateHistory?: (historyId: string, updatedData: EquipmentHistoryData) => void;
}

type TableColumnKey =
  | "equipment_name"
  | "cal_by"
  | "cal_date"
  | "calibration_due_date"
  | "format_no"
  | "cal_certificate_no"
  | "traceability"
  | "ranges"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "EQUIPMENT NAME", uid: "equipment_name", sortable: true },
  { name: "CAL. BY", uid: "cal_by", sortable: true },
  { name: "CALIBRATION DATE", uid: "cal_date", sortable: true },
  { name: "DUE DATE", uid: "calibration_due_date" },
  { name: "FORMAT NO", uid: "format_no" },
  { name: "CAL. CERTI. NO", uid: "cal_certificate_no" },
  { name: "traceability", uid: "traceability" },
  { name: "RANGES", uid: "ranges" },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "equipment_name",
  "cal_by",
  "cal_date",
  "calibration_due_date",
  "format_no",
  "cal_certificate_no",
  "traceability",
  "ranges",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

export default function EquipmentHistoryListTable({
  data,
  onUpdateHistory,
  onDeleteHistory,
  loading = false,
  error = null,
  onRefresh,
}: EquipmentHistoryListTableProps) {
  void onUpdateHistory;
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "equipment_name" as Key,
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!hasSearchFilter) return [...data];
    const lower = filterValue.toLowerCase();
    return data.filter((item) => item.equipment_name?.toLowerCase().includes(lower));
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
      const first = a[column as keyof EquipmentHistoryData];
      const second = b[column as keyof EquipmentHistoryData];
      const normalizedFirst = typeof first === "string" ? first.toLowerCase() : first ?? "";
      const normalizedSecond = typeof second === "string" ? second.toLowerCase() : second ?? "";

      if (normalizedFirst < normalizedSecond) return direction === "descending" ? 1 : -1;
      if (normalizedFirst > normalizedSecond) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const handleDeleteRequest = React.useCallback((historyId: string) => {
    setPendingDeleteId(historyId);
    setDeleteOpen(true);
  }, []);

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setPendingDeleteId(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!pendingDeleteId || !onDeleteHistory) return;
    setIsDeleting(true);
    try {
      await onDeleteHistory(pendingDeleteId);
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDeleteId, onDeleteHistory]);

  const renderRanges = (ranges?: { range: string; max_permissible_error?: string; max_error?: string }[]) => {
    if (!ranges || ranges.length === 0) {
      return <span className="text-default-400 text-[12px] italic">No ranges</span>;
    }
    return (
      <div className="flex flex-col gap-1">
        {ranges.slice(0, 2).map((range, index) => (
          <div key={`${range.range}-${index}`} className="text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded-md truncate">
            <span className="font-medium text-blue-700">{range.range}</span>
            {range.max_permissible_error || range.max_error ? (
              <span className="text-blue-600 ml-1">(±{range.max_permissible_error || range.max_error})</span>
            ) : null}
          </div>
        ))}
        {ranges.length > 2 && <div className="text-[11px] text-default-500 font-medium">+{ranges.length - 2} more</div>}
      </div>
    );
  };

  const renderCell = React.useCallback(
    (history: EquipmentHistoryData, columnKey: React.Key) => {
      const value = history[columnKey as keyof EquipmentHistoryData];
      switch (columnKey) {
        case "equipment_name":
          return (
            <div className="text-[13px] font-medium truncate max-w-[220px]" title={(value as string) ?? ""}>
              {(value as string) || "N/A"}
            </div>
          );
        case "cal_by":
        case "cal_date":
          return (<div className="text-[13px]" title='cal_date'>
            {value ? new Date(value as string).toLocaleDateString() : "N/A"}
          </div>)
        case "calibration_due_date":
          return (<div className="text-[13px]" title="calibration_due_date">
            {value ? new Date(value as string).toLocaleDateString() : "N/A"}
          </div>)
        case "format_no":
        case "cal_certificate_no":
        case "traceability":
          return (
            <div className="text-[13px] truncate max-w-[160px]" title={(value as string) ?? ""}>
              {(value as string) || "N/A"}
            </div>
          );
        case "ranges":
          return renderRanges(value as EquipmentHistoryData["ranges"]);
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                className="  bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 "
                onPress={() => navigate(`/masters/equipment-history/edit/${history.id}`)}
              >
                <PencilSquareIcon className="w-4 h-4" />

              </Button>
              {onDeleteHistory && (
                <Button
                  size="sm"
                  className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => handleDeleteRequest(history.id)}
                  isIconOnly
                  aria-label="Delete inward entry"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        default:
          return (value as React.ReactNode) ?? "-";
      }
    },
    [handleDeleteRequest, onDeleteHistory, navigate],
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
          <p className="text-sm font-semibold text-red-500">Unable to load equipment history</p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="secondary" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No equipment history found";
  }, [error, onRefresh]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search equipment..."
            value={filterValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear equipment search" onPress={onClear}><MagnifyingGlassIcon className="w-4 h-4" /></Button> : null}
          <div className="flex gap-3">
            {onRefresh && (
              <Button onPress={onRefresh} size="sm" variant="secondary" isDisabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            )}
            <Popover>
              <Popover.Trigger>
                <Button className="hidden sm:flex" variant="secondary">
                  Columns
                  <ChevronDownIcon className="text-small" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-64 p-1">
                <Popover.Dialog>
                  <ListBox aria-label="Table Columns" selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>
                    {columns.map((column) => <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>{capitalize(column.name)}<ListBox.ItemIndicator /></ListBox.Item>)}
                  </ListBox>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
          </div>
        </div>
      </div>
    );
  }, [data.length, filterValue, loading, onRefresh, onRowsPerPageChange, onSearchChange, onClear, rowsPerPage, visibleColumns]);

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
  }, [
    filteredItems.length,
    page,
    pages,
    selectedKeys,
    rowsPerPage,
    onRowsPerPageChange,
  ]);
  return (
    <div className="p-2 industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Equipment history table" className={dataTableClassName("min-w-full")}>
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
        title="Delete equipment history"
        message={<>Are you sure you want to delete this equipment history? This action cannot be undone.</>}
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
