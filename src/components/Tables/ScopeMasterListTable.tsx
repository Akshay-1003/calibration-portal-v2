"use client";

import React from "react";
import {
  Input,
  Button,
  Select,
  ListBox,
  Label,
  Chip,
  Table,
} from "@heroui/react";
import { useMasterDataStore } from "../../store/useStore";
import type { ScopeMasterData as StoreScopeMasterData } from "../../store/useStore";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Key } from "@react-types/shared";
import "../../styles/industrial-table.css";
import { getTableColumnKey } from './tableColumnKey';
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

type ScopeMasterData = Pick<
  StoreScopeMasterData,
  | "id"
  | "master_gauge_id"
  | "unit"
  | "range"
  | "least_count"
  | "uncertainty"
  | "valid_until"
  | "calibration_location"
>;

interface ScopeMasterListTableProps {
  data: ScopeMasterData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  onEdit?: (id: string) => void;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

type TableColumnKey = "sr_no" | "actions" | "master_gauge_id" | "least_count" | "uncertainty" |"range" | "valid_until" | "calibration_location";
type ScopeMasterTableRow = { item: ScopeMasterData; index: number };

const columns: { name: string; uid: TableColumnKey }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "MASTER GAUGE", uid: "master_gauge_id" },
  { name: "RANGE", uid: "range" },
  { name: "LEAST COUNT", uid: "least_count" },
  { name: "UNCERTAINTY", uid: "uncertainty" },
  { name: "VALID UNTIL", uid: "valid_until" },
  { name: "CALIBRATION LOCATION", uid: "calibration_location" },
  { name: "ACTIONS", uid: "actions" },
];



export default function ScopeMasterListTable({
  data,
  loading = false,
  error = null,
  onRefresh,
  onDelete,
  onEdit,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
}: ScopeMasterListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [localPage, setLocalPage] = React.useState(1);
  const { gaugeMasterList } = useMasterDataStore();
  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;
  const currentSearchValue = controlledSearchValue ?? filterValue;

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ScopeMasterData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const masterNameById = React.useMemo(() => {
    const map: Record<string, string> = {};
    const safeGaugeList = Array.isArray(gaugeMasterList) ? gaugeMasterList : [];
    for (const g of safeGaugeList) {
      map[g.id] = g.name ?? "";
    }
    return map;
  }, [gaugeMasterList]);

  const requestDelete = React.useCallback(
    (item: ScopeMasterData) => {
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

  const hasSearchFilter = Boolean(currentSearchValue);

  const filteredItems = React.useMemo(() => {
    if (isServerPagination) {
      return [...data];
    }
    if (!hasSearchFilter) return [...data];

    const lower = currentSearchValue.toLowerCase();

    return data.filter((item) =>
      (masterNameById[item.master_gauge_id] ?? "")
        ?.toLowerCase()
        .includes(lower)
    );
  }, [currentSearchValue, data, hasSearchFilter, isServerPagination, masterNameById]);

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

  const tableItems = items;

  const tableRows = React.useMemo<ScopeMasterTableRow[]>(
    () => tableItems.map((item, index) => ({ item, index })),
    [tableItems]
  );

  const totalRecords = isServerPagination ? (totalItems ?? data.length) : filteredItems.length;
  const showingFrom = totalRecords === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const showingTo = totalRecords === 0
    ? 0
    : Math.min((page - 1) * rowsPerPage + tableItems.length, totalRecords);

  const onRowsPerPageChange = React.useCallback((key: Key | null) => {
    const value = Number(key ?? rowsPerPage);
    if (controlledOnRowsPerPageChange) {
      controlledOnRowsPerPageChange(value);
    } else {
      setLocalRowsPerPage(value);
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

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            aria-label="Search scopes"
            placeholder="Search by gauge name..."
            value={currentSearchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {currentSearchValue ? <Button type="button" variant="ghost" aria-label="Clear scope search" onPress={onClear}>Clear</Button> : null}
          <div className="flex gap-3">
            {onRefresh && (
              <Button onPress={onRefresh} size="sm" variant="secondary" isDisabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            )}

          </div>
        </div>
      </div>
    );
  }, [currentSearchValue, loading, onClear, onRefresh, onSearchChange]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="flex items-center justify-between py-3 px-2 gap-4">
        <div className="flex-1">
          <span className="text-small text-default-400">
            Showing {showingFrom} to {showingTo} of {totalRecords} records
          </span>
        </div>

        <div className="flex-1 flex justify-center">
          <TablePagination
            page={page}
            totalPages={pages}
            onPageChange={(nextPage) => {
              if (controlledOnPageChange) {
                controlledOnPageChange(nextPage);
              } else {
                setLocalPage(nextPage);
              }
            }}
          />
        </div>

        <div className="flex-1 flex justify-end">
          <div className="flex items-center gap-3">
            <span className="text-small text-default-500 whitespace-nowrap">Rows per page</span>
            <Select
              selectedKey={String(rowsPerPage)}
              onSelectionChange={onRowsPerPageChange}
              className="w-[110px]"
            >
              <Label>Rows per page</Label>
              <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {['10', '20', '50', '100'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>
    );
  }, [controlledOnPageChange, onRowsPerPageChange, page, pages, rowsPerPage, showingFrom, showingTo, totalRecords]);
  const renderCell = React.useCallback((item: ScopeMasterData, columnKey: TableColumnKey, index: number) => {
    switch (columnKey) {
      case "sr_no": {
        const srNo = (page - 1) * rowsPerPage + index + 1;
        return (
          <div className="text-[13px] text-center font-medium text-gray-600">
            {srNo}
          </div>
        );
      }
      case "master_gauge_id":
        return masterNameById[item.master_gauge_id] || item.master_gauge_id;
      case "least_count":
        return String(item.least_count ?? "-");
      case "uncertainty":
        return String(item.uncertainty ?? "-");
      case "range":
        // Display range as a chip similar to EquipmentHistoryListTable
        if (item.range && (item.range.min !== undefined && item.range.max !== undefined)) {
          const unit = item.unit || 'mm';
          return (
            <Chip
              variant="soft"
              color="accent"
              size="sm"
              className="text-xs bg-blue-50 border border-blue-200 px-2 py-1"
            >
              <span className="font-medium text-blue-700">
                {item.range.min} - {item.range.max} ({unit})
              </span>
            </Chip>
          );
        }
        return <span className="text-default-400 text-[12px] italic">No range</span>;
      case "valid_until":
        return item.valid_until || "-";
      case "calibration_location":
        return item.calibration_location === "permanent_facility"
          ? "Permanent Facility"
          : item.calibration_location === "on_site"
            ? "On Site"
            : item.calibration_location === "mobile"
              ? "Mobile Facility"
              : item.calibration_location || "-";

      case "actions":
        return (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              className="  bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
              onPress={() => onEdit?.(item.id)}
              isIconOnly
              aria-label="Edit scope master"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
              onPress={() => requestDelete(item)}
              isIconOnly
              aria-label="Delete scope master"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>

          </div>
        );
      default:
        return "";
    }
  }, [masterNameById, onEdit, page, requestDelete, rowsPerPage]);

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <div className="mb-4">{topContent}</div>
        <Table aria-label="Scope master list table" className={dataTableClassName("min-w-full")}>
          <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
            <Table.Content>
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column id={column.uid} isRowHeader={column.uid === columns[0]?.uid}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body items={tableRows} renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? 'Loading...' : error || 'No scopes found'}</div>}>
            {(row) => {
              const { item, index } = row;
              return (
                <Table.Row id={item.id} columns={columns}>
                  {(columnKey) => <Table.Cell>{renderCell(item, getTableColumnKey(columnKey) as TableColumnKey, index)}</Table.Cell>}
                </Table.Row>
              );
            }}
          </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {bottomContent}
      </div>
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Delete scope master"
        message={
          <>
            Are you sure you want to delete this scope for{' '}
            <span className="font-semibold text-gray-900">
              {deleteTarget ? (masterNameById[deleteTarget.master_gauge_id] || deleteTarget.master_gauge_id) : 'this master gauge'}
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
