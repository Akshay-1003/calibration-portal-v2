"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { useNavigate } from "react-router-dom";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Table,
  Input,
  Button,
  Label,
  ListBox,
  Popover,
  Pagination,
  Select,
} from "@heroui/react";
import type { Selection, SortDescriptor } from "@react-types/shared";
import { getTableColumnKey } from './tableColumnKey';
import type { EquipmentData } from "../../types/equipment";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";

interface EquipmentMasterListTableProps {
  data: EquipmentData[];
  onDeleteEquipment?: (equipmentId: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

type TableColumnKey =
  | "equipment_name"
  | "code_no"
  | "serial_no"
  | "make"
  | "size_range"
  | "equipment_location"
  | "ranges"
  | "cal_agency"
  | "created_at"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "EQUIPMENT NAME", uid: "equipment_name", sortable: true },
  { name: "CODE NO", uid: "code_no", sortable: true },
  { name: "SERIAL NO", uid: "serial_no" },
  { name: "MAKE", uid: "make" },
  { name: "SIZE / RANGE", uid: "size_range" },
  { name: "LOCATION", uid: "equipment_location" },
  { name: "RANGES", uid: "ranges" },
  { name: "CAL AGENCY", uid: "cal_agency" },
  { name: "CREATED AT", uid: "created_at", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "equipment_name",
  "code_no",
  "serial_no",
  "make",
  "size_range",
  "equipment_location",
  "ranges",
  "cal_agency",
  "created_at",
  "actions",
];

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const formatText = (value: unknown) =>
  value === undefined || value === null || value === "" ? "N/A" : String(value);

export default function EquipmentMasterListTable({
  data,
  onDeleteEquipment,
  loading = false,
  error = null,
  onRefresh,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
}: EquipmentMasterListTableProps) {
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "equipment_name" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<EquipmentData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;

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

  const pages = isServerPagination
    ? Math.max(totalPages ?? 1, 1)
    : Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  const items = React.useMemo(() => {
    if (isServerPagination) {
      return filteredItems;
    }
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, isServerPagination, page, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      if (!column || column === "actions") return 0;
      const first = a[column as keyof EquipmentData];
      const second = b[column as keyof EquipmentData];
      const normalizedFirst = typeof first === "string" ? first.toLowerCase() : first ?? "";
      const normalizedSecond = typeof second === "string" ? second.toLowerCase() : second ?? "";

      if (normalizedFirst < normalizedSecond) return direction === "descending" ? 1 : -1;
      if (normalizedFirst > normalizedSecond) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const tableItems = sortedItems;

  const renderRanges = React.useCallback((ranges?: EquipmentData["ranges"]) => {
    if (!Array.isArray(ranges) || ranges.length === 0) {
      return <span className="text-default-400 text-[12px] italic">No ranges</span>;
    }

    return (
      <div className="flex flex-col gap-1">
        {ranges.slice(0, 2).map((range: any, index: number) => (
          <div
            key={`${range.range}-${index}`}
            className="text-xs bg-blue-50 border border-blue-200 px-2 py-1 rounded-md truncate"
          >
            <span className="font-medium text-blue-700">{range.range}</span>
            {(range.max_error || range.max_permissible_error) && (
              <span className="text-blue-600 ml-1">
                (±{range.max_error || range.max_permissible_error})
              </span>
            )}
          </div>
        ))}
        {ranges.length > 2 && (
          <div className="text-[11px] text-default-500 font-medium">+{ranges.length - 2} more</div>
        )}
      </div>
    );
  }, []);

  const requestDelete = React.useCallback(
    (item: EquipmentData) => {
      if (!onDeleteEquipment) return;
      setDeleteTarget(item);
      setDeleteOpen(true);
    },
    [onDeleteEquipment]
  );

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || !onDeleteEquipment) return;
    setIsDeleting(true);
    try {
      await onDeleteEquipment(deleteTarget.id);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDeleteEquipment]);

  const renderCell = React.useCallback(
    (equipment: EquipmentData, columnKey: React.Key) => {
      switch (columnKey) {
        case "equipment_name":
        case "code_no":
        case "serial_no":
        case "make":
        case "size_range":
        case "equipment_location":
        case "cal_agency":
          return (
            <div className="text-[13px] truncate max-w-[180px]" title={formatText(equipment[columnKey as keyof EquipmentData])}>
              {formatText(equipment[columnKey as keyof EquipmentData])}
            </div>
          );
        case "created_at":
          return (
            <div className="text-[13px]" title={equipment.created_at ? new Date(equipment.created_at).toLocaleDateString() : "N/A"}>
              {equipment.created_at ? new Date(equipment.created_at).toLocaleDateString() : "N/A"}
            </div>
          );
        case "ranges":
          return renderRanges(equipment.ranges as EquipmentData["ranges"]);
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 "
                onPress={() => navigate(`/masters/equipment-master/edit/${equipment.id}`)}
              >
                <PencilSquareIcon className="w-4 h-4" />
              </Button>
              {onDeleteEquipment && (
                <Button
                  size="sm"
                  className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => requestDelete(equipment)}
                  isIconOnly
                  aria-label="Delete inward entry"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        default:
          return formatText(equipment[columnKey as keyof EquipmentData]);
      }
    },
    [navigate, onDeleteEquipment, renderRanges, requestDelete]
  );

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    const next = Number(value);
    if (controlledOnRowsPerPageChange) {
      controlledOnRowsPerPageChange(next);
    } else {
      setLocalRowsPerPage(next);
    }
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnRowsPerPageChange]);

  const onSearchChange = React.useCallback((value?: string) => {
    setFilterValue(value ?? "");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange]);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange]);

  const onNextPage = React.useCallback(() => {
    if (page < pages) {
      if (controlledOnPageChange) {
        controlledOnPageChange(page + 1);
      } else {
        setLocalPage(page + 1);
      }
    }
  }, [controlledOnPageChange, page, pages]);

  const onPreviousPage = React.useCallback(() => {
    if (page > 1) {
      if (controlledOnPageChange) {
        controlledOnPageChange(page - 1);
      } else {
        setLocalPage(page - 1);
      }
    }
  }, [controlledOnPageChange, page]);

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">Unable to load equipment list</p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="secondary" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No equipment found";
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
            <Popover>
              <Popover.Trigger>
                <Button className="hidden sm:flex" variant="secondary">
                  Columns
                  <ChevronDownIcon className="text-small" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-64 p-1"><Popover.Dialog><ListBox aria-label="Table Columns" selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>{columns.map((column) => <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>{capitalize(column.name)}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Popover.Dialog></Popover.Content>
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
              : `${selectedKeys.size} of ${isServerPagination ? (totalItems ?? filteredItems.length) : filteredItems.length} selected`}
          </span>
        </div>

        {/* CENTER - Pagination */}
        <div className="flex-1 flex justify-center">
          <Pagination key={`equipment-pagination-${page}-${pages}`}>
            <Pagination.Content>
            <Pagination.Previous isDisabled={page <= 1} onPress={() => {
              if (controlledOnPageChange) {
                controlledOnPageChange(Math.max(1, page - 1));
              } else {
                setLocalPage(Math.max(1, page - 1));
              }
            }}><Pagination.PreviousIcon /></Pagination.Previous>
            {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => <Pagination.Item key={pageNumber}><Pagination.Link isActive={pageNumber === page} onPress={() => controlledOnPageChange ? controlledOnPageChange(pageNumber) : setLocalPage(pageNumber)}>{pageNumber}</Pagination.Link></Pagination.Item>)}
            <Pagination.Next isDisabled={page >= pages} onPress={() => {
              const nextPage = Math.min(pages, page + 1);
              if (controlledOnPageChange) controlledOnPageChange(nextPage); else setLocalPage(nextPage);
            }}><Pagination.NextIcon /></Pagination.Next>
            </Pagination.Content>
          </Pagination>
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
    isServerPagination,
    totalItems,
    page,
    pages,
    selectedKeys,
    onNextPage,
    onPreviousPage,
    rowsPerPage,
    onRowsPerPageChange,
    controlledOnPageChange,
  ]);
  return (
    <div className="industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Equipment master list table" className="min-w-full">
        <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
          <Table.Content selectedKeys={selectedKeys} selectionMode="multiple" sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}>
        <Table.Header columns={headerColumns}>
          {(column) => (
            <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === headerColumns[0]?.uid}>
              {column.name}
            </Table.Column>
          )}
        </Table.Header>
        <Table.Body
          items={tableItems}
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
        title="Delete equipment"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.equipment_name ?? deleteTarget?.code_no ?? 'this equipment'}
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
