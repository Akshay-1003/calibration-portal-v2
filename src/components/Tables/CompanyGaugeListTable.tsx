"use client";

import React from "react";
import type { Key, Selection, SortDescriptor } from "@react-types/shared";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Input,
  Button,
  Label,
  ListBox,
  Pagination,
  Popover,
  Select,
} from "@heroui/react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { getTableColumnKey } from './tableColumnKey';
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";

export interface CompanyGaugeData {
  id: string;
  name: string;
  is_standard_no: string;
  non_nabl_cert_frmt_no: string;
  nabl_cert_frmt_no: string;
  raw_datasheet_frmt_no: string;
  certificate_code: string;
  calibration_method: string;
  environmental_conditions: string;
  certificate_type_id: string;
  certificate_type?:string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

interface CompanyGaugeListTableProps {
  data?: CompanyGaugeData[] | null;
  onDeleteGauge?: (gaugeId: string) => Promise<void> | void;
  gaugeMasterLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSearchChange?: (value: string) => void;
  canManageGauges?: boolean;
}

type TableColumnKey =
  | "sr_no"
  | "name"
  | "is_standard_no"
  | "certificate_code"
  | "calibration_method"
  | "environmental_conditions"
  | "certificate_type"
  | "created_at"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "NAME", uid: "name", sortable: true },
  { name: "IS STANDARD NO", uid: "is_standard_no", sortable: true },
  { name: "CERTIFICATE CODE", uid: "certificate_code" },
  { name: "CALIBRATION METHOD", uid: "calibration_method" },
  { name: "ENVIRONMENTAL CONDITIONS", uid: "environmental_conditions" },
  { name: "GAUGE TYPE", uid: "certificate_type", sortable: true },
  { name: "CREATED AT", uid: "created_at", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  "name",
  "is_standard_no",
  "certificate_code",
  "calibration_method",
  "environmental_conditions",
  "certificate_type",
  "created_at",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

export default function CompanyGaugeListTable({
  data = [],
  onDeleteGauge,
  gaugeMasterLoading,
  error = null,
  onRefresh,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
  onSearchChange: controlledOnSearchChange,
  canManageGauges = true,
}: CompanyGaugeListTableProps) {
  const navigate = useNavigate();
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "name" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<CompanyGaugeData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;

  const hasSearchFilter = Boolean(filterValue);
  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    const dataArray = Array.isArray(data) ? data : [];
    if (!hasSearchFilter) return [...dataArray];
    const lower = filterValue.toLowerCase();
    return dataArray.filter((item) => item.name?.toLowerCase().includes(lower));
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
      const first = a[column as keyof CompanyGaugeData];
      const second = b[column as keyof CompanyGaugeData];
      const normalizedFirst = typeof first === "string" ? first.toLowerCase() : first ?? "";
      const normalizedSecond = typeof second === "string" ? second.toLowerCase() : second ?? "";

      if (normalizedFirst < normalizedSecond) return direction === "descending" ? 1 : -1;
      if (normalizedFirst > normalizedSecond) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const requestDelete = React.useCallback(
    (item: CompanyGaugeData) => {
      if (!onDeleteGauge) return;
      setDeleteTarget(item);
      setDeleteOpen(true);
    },
    [onDeleteGauge],
  );

  const closeDelete = React.useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = React.useCallback(async () => {
    if (!deleteTarget || !onDeleteGauge) return;
    setIsDeleting(true);
    try {
      await onDeleteGauge(deleteTarget.id);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDeleteGauge]);

  const renderCell = React.useCallback(
    (gauge: CompanyGaugeData, columnKey: React.Key, index: number) => {
      if (columnKey === "sr_no") {
        const srNo = (page - 1) * rowsPerPage + index + 1;
        return (
          <div className="text-[13px] text-center font-medium text-gray-600">
            {srNo}
          </div>
        );
      }
      const value = gauge[columnKey as keyof CompanyGaugeData];
      switch (columnKey) {
        case "name":
        case "environmental_conditions":
        case "calibration_method":
          return (
            <div className="text-[13px] font-medium truncate max-w-[220px]" title={(value as string) ?? ""}>
              {value || "N/A"}
            </div>
          );
        case "is_standard_no":
        case "certificate_code":
        case "certificate_type":
          return (
            <div className="text-[13px] truncate max-w-[160px]" title={(value as string) ?? ""}>
              {value || "N/A"}
            </div>
          );
        case "created_at":
          return (
            <div className="text-[13px] truncate max-w-[140px]" title={value ? new Date(value as string).toLocaleDateString() : "N/A"}>
              {value ? new Date(value as string).toLocaleDateString() : "N/A"}
            </div>
          );
        case "actions":
          return (
            <div className="flex gap-2 justify-center">
              {canManageGauges && (
                <Button
                  size="sm"
                  className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 "
                  onPress={() => navigate(`/masters/gauges-master/edit/${gauge.id}`)}
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </Button>
              )}
              {onDeleteGauge && canManageGauges && (
                <Button
                  size="sm"
                  className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => requestDelete(gauge)}
                  isIconOnly
                  aria-label="Delete inward entry"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        default:
          return value as string;
      }
    },
    [navigate, onDeleteGauge, page, requestDelete, rowsPerPage],
  );

  const onRowsPerPageChange = React.useCallback((key: Key | null) => {
    const value = String(key ?? '10');
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
    controlledOnSearchChange?.(value ?? "");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnSearchChange]);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    controlledOnSearchChange?.("");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, controlledOnSearchChange]);

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
          <p className="text-sm font-semibold text-red-500">Unable to load gauges</p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="outline" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No gauges found";
  }, [error, onRefresh]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search gauges..."
            aria-label="Search gauges"
            value={filterValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          {filterValue ? (
            <Button type="button" variant="ghost" aria-label="Clear gauge search" onPress={onClear}>
              <MagnifyingGlassIcon className="w-4 h-4" />
            </Button>
          ) : null}
          <div className="flex gap-3">
            <Popover isOpen={columnsOpen} onOpenChange={setColumnsOpen}>
              <Popover.Trigger>
                <Button variant="secondary" className="hidden sm:flex" onPress={() => setColumnsOpen(true)}>
                  Columns <ChevronDownIcon className="text-small" />
                </Button>
              </Popover.Trigger>
              <Popover.Content>
                <Popover.Dialog>
                  <ListBox
                    aria-label="Table Columns"
                    selectionMode="multiple"
                    selectedKeys={visibleColumns}
                    onSelectionChange={setVisibleColumns}
                  >
                    {columns.map((column) => (
                      <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>
                        {capitalize(column.name)}
                        <ListBox.ItemIndicator />
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
  }, [data?.length, filterValue, gaugeMasterLoading, onRefresh, onRowsPerPageChange, onSearchChange, onClear, rowsPerPage, visibleColumns]);


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
          <Pagination size="sm">
            <Pagination.Content>
              <Pagination.Previous
                isDisabled={page <= 1}
                onPress={() => (controlledOnPageChange ? controlledOnPageChange(page - 1) : setLocalPage(page - 1))}
              >
                <Pagination.PreviousIcon />
              </Pagination.Previous>
              {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
                <Pagination.Item key={pageNumber}>
                  <Pagination.Link
                    isActive={pageNumber === page}
                    onPress={() => (controlledOnPageChange ? controlledOnPageChange(pageNumber) : setLocalPage(pageNumber))}
                  >
                    {pageNumber}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Next
                isDisabled={page >= pages}
                onPress={() => (controlledOnPageChange ? controlledOnPageChange(page + 1) : setLocalPage(page + 1))}
              >
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Content>
          </Pagination>
        </div>

        {/* RIGHT - Rows per page */}
        <div className="flex-1 flex justify-end w-10">
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={onRowsPerPageChange}
            className="w-[160px]"
          >
            <Label>Rows per page</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {['10', '20', '50', '100'].map((size) => (
                  <ListBox.Item key={size} id={size} textValue={size}>
                    {size}<ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
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
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <div className="mb-4">{topContent}</div>
        <Table aria-label="Company gauge list table" className="min-w-full">
          <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
            <Table.Content
              className="min-w-full"
              selectedKeys={selectedKeys}
              selectionMode="multiple"
              sortDescriptor={sortDescriptor}
              onSelectionChange={setSelectedKeys}
              onSortChange={setSortDescriptor}
            >
          <Table.Header columns={headerColumns}>
            {(column) => (
              <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === columns[0]?.uid}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            renderEmptyState={() => gaugeMasterLoading ? <div className="py-8 text-center text-sm text-default-500">Loading...</div> : emptyContent}
            items={sortedItems}
          >
            {(item) => {
              const index = sortedItems.findIndex(i => i.id === item.id);
              return (
                <Table.Row id={item.id} columns={headerColumns}>
                  {(columnKey) => <Table.Cell>{renderCell(item, getTableColumnKey(columnKey), index)}</Table.Cell>}
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
        title="Delete gauge master"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{deleteTarget?.name ?? 'this item'}</span>?
            This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
