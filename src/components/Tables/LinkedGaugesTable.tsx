"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import {
  PencilSquareIcon,
  TrashIcon,
  PrinterIcon
} from "@heroicons/react/24/outline";
import {
  Table,
  Input,
  Button,
  Label,
  ListBox,
  Popover,
  Pagination,
  Select,
  Chip,
} from "@heroui/react";
import { getTableColumnKey } from './tableColumnKey';
import type { Selection, SortDescriptor } from "@react-types/shared";

import { LinkedGauge } from "../../types";
import { SpecificationChips } from "../gaugeTypes/SpecificationChips";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";

type TableColumnKey =
  | "sr_no"
  | "actions"
  | "client_org_name"
  | "master_gauge_name"
  | "lab_id"
  | "make"
  | "identification_number"
  | "specifications"
  | "manf_serial_number"
  | "status"
  | "inward_date"
  | "inward_no"


const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "ACTIONS", uid: "actions" },
  { name: "STATUS", uid: "status" },
  { name: "INWARD NO", uid: "inward_no" },
  { name: "COMPANY NAME", uid: "client_org_name", sortable: true },
  { name: "GAUGE NAME", uid: "master_gauge_name", sortable: true },
  { name: "IDENTIFICATION", uid: "identification_number" },

  { name: "LAB ID", uid: "lab_id" },
  { name: "MAKE", uid: "make", sortable: true },
  { name: "INWARD DATE", uid: "inward_date", sortable: true },
  { name: "SPECIFICATION", uid: "specifications" },
  { name: "MANF SERIAL NO", uid: "manf_serial_number" }

];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  "inward_no",
  "client_org_name",
  "master_gauge_name",
  "lab_id",
  "make",
  "identification_number",
  "specifications",
  "manf_serial_number",
  "status",
  "inward_date",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

const getStatusBadge = (status: "inward_received" | "calibration_completed") => {
  const statusConfig = {
    inward_received: { color: "warning", label: "Planning" },
    calibration_completed: { color: "success", label: "Completed" },
  };

  const config = statusConfig[status] || statusConfig.inward_received;

  return (
    <Chip variant="soft" color="accent">
      {config.label}
    </Chip>
  );
};
export function LinkedGaugesTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  isPreview,
  customActions,
  onPreview,
  hideCompleted = false,
  onNablCalibration,
  onNonNablCalibration,
  onCertificate,
  onInwardNoClick,
  searchValue,
  searchPlaceholder = "Search by company, gauge name, Lab ID...",
  onSearchValueChange,
  filters,
  isViewCertificateTab = false,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
}: {
  data?: LinkedGauge[];
  loading?: boolean;
  onEdit?: (gaugeId: string) => void;
  onDelete?: (inwardId: string, gaugeId: string) => void;
  isPreview?: boolean;
  customActions?: (gauge: LinkedGauge) => React.ReactNode;
  onPreview?: (certificate_id: string) => void;
  hideCompleted?: boolean;
  onPrintSticker?: (gaugeIds: string[]) => void;
  onNablCalibration?: (gauge: LinkedGauge) => void;
  onNonNablCalibration?: (gauge: LinkedGauge) => void;
  onCertificate?: (inwardId: string, gaugeId: string) => void;
  onInwardNoClick?: (gauge: LinkedGauge) => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchValueChange?: (value: string) => void;
  filters?: React.ReactNode;
  isViewCertificateTab?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}) {
  const [localFilterValue, setLocalFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "client_org_name" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);

  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;
  const filterValue = searchValue ?? localFilterValue;
  const useExternalSearch = Boolean(onSearchValueChange);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    inwardId: string;
    gaugeId: string;
    label?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getRowKey = React.useCallback((item: LinkedGauge): string => {
    // Some API responses don't include `id` for linked gauges; fall back to a stable composite key.
    if (item.id) return item.id;
    const inwardId = item.inward_id || "unknown-inward";
    const gaugeId = item.gauge_id || item.inward_gauge_lab_id || "unknown-gauge";
    return `${inwardId}-${gaugeId}`;
  }, []);

  const requestDelete = React.useCallback(
    (gauge: LinkedGauge) => {
      if (!onDelete) return;
      setDeleteTarget({
        inwardId: gauge.inward_id,
        gaugeId: gauge.gauge_id,
        label: gauge.inward_gauge_lab_id || gauge.identification_number,
      });
      setDeleteOpen(true);
    },
    [onDelete],
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
      await onDelete(deleteTarget.inwardId, deleteTarget.gaugeId);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDelete]);

  const filteredData = React.useMemo(() => {
    let filtered = data;

    // Apply hide completed filter first
    if (hideCompleted) {
      filtered = filtered.filter(item => item?.status !== "calibration_completed");
    }

    // Apply search filter
    if (filterValue && !useExternalSearch) {
      const searchLower = filterValue.toLowerCase();
      filtered = filtered.filter((item) => {
        // Search across multiple fields for better UX
        const searchableText = [
          item?.client_org_name,
          item?.master_gauge_name,
          item?.identification_number,
          item?.inward_gauge_lab_id
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(searchLower);
      });
    }

    return filtered;
  }, [data, hideCompleted, filterValue, useExternalSearch]);

  const pages = isServerPagination
    ? Math.max(totalPages ?? 1, 1)
    : Math.max(Math.ceil(filteredData.length / rowsPerPage), 1);

  // If the dataset changes (e.g., after applying filters), ensure pagination stays in-range.
  React.useEffect(() => {
    if (isServerPagination && loading) {
      return;
    }

    if (controlledOnPageChange) {
      if (page > pages && pages > 0) {
        controlledOnPageChange(pages);
      }
      return;
    }

    setLocalPage((p) => Math.min(Math.max(p, 1), pages));
  }, [controlledOnPageChange, isServerPagination, loading, page, pages]);

  // When the local data set changes, reset only uncontrolled pagination.
  // Controlled/server pagination must not force page 1 here, otherwise a
  // successful page-2 fetch immediately bounces the parent back to page 1.
  React.useEffect(() => {
    if (!controlledOnPageChange) {
      setLocalPage(1);
    }
    setSelectedKeys(new Set());
  }, [data, controlledOnPageChange]);

  const items = React.useMemo(() => {
    if (isServerPagination) {
      return filteredData;
    }
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, isServerPagination, page, rowsPerPage]);

  const getComparableValue = React.useCallback((item: LinkedGauge, columnKey: TableColumnKey) => {
    const info = item || {};
    switch (columnKey) {
      case "client_org_name":
        return info.client_org_name ?? "";
      case "master_gauge_name":
        return info.master_gauge_name ?? "";
      case "lab_id":
        return info.inward_gauge_lab_id;
      case "make":
        return info.make ?? "";
      case "identification_number":
        return info.identification_number ?? "";
      case "specifications":
        return info.specifications ?? "";
      case "manf_serial_number":
        return info.manf_serial_number ?? "";
      case "status":
        return info.status ?? "";
      case "inward_date":
        return info.inward_date ?? "";
      default:
        return "";
    }
  }, []);

  const sortedItems = React.useMemo(() => {
    if (!sortDescriptor.column || sortDescriptor.column === "actions") {
      return items;
    }

    return [...items].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      const first = getComparableValue(a, column as TableColumnKey);
      const second = getComparableValue(b, column as TableColumnKey);

      // Handle different data types
      let comparison = 0;

      if (column === "inward_date") {
        // Date comparison
        const dateA = first ? new Date(first as string).getTime() : 0;
        const dateB = second ? new Date(second as string).getTime() : 0;
        comparison = dateA - dateB;
      } else {
        // String comparison
        const strA = first.toString().toLowerCase();
        const strB = second.toString().toLowerCase();
        comparison = strA.localeCompare(strB);
      }

      return direction === "descending" ? -comparison : comparison;
    });
  }, [items, sortDescriptor, getComparableValue]);

  // Keep fetched rows visible during background refetches.
  const tableItems = sortedItems;

  const renderCell = React.useCallback(
    (gauge: any, columnKey: React.Key, index: number) => {
      const info = gauge || {};
      switch (columnKey) {
        case "sr_no":
          const srNo = (page - 1) * rowsPerPage + index + 1;
          return (
            <div className="text-[13px] text-center font-medium text-gray-600">
              {srNo}
            </div>
          );
        case "client_org_name":
          return (
            <div className="text-[13px] font-medium truncate max-w-[220px]" title={info.client_org_name ?? "-"}>
              {info.client_org_name ?? "-"}
            </div>
          );
        case "master_gauge_name":
          return (
            <div className="text-[13px] truncate max-w-[180px]" title={info.master_gauge_name ?? "-"}>
              {info.master_gauge_name ?? "-"}
            </div>
          );
        case "lab_id":
          return (
            <div className="text-[13px]" title={info.inward_gauge_lab_id ?? gauge.id}>
              {info.inward_gauge_lab_id}
            </div>
          );
        case "make":
        case "identification_number":
        case "manf_serial_number":
          return (
            <div className="text-[13px] truncate max-w-[150px]" title={(info as Record<string, string | undefined>)[columnKey as string] ?? "-"}>
              {(info as Record<string, string | undefined>)[columnKey as string] ?? "-"}
            </div>
          );
        case "specifications":
          // Use SpecificationChips if specifications object is available, otherwise fall back to gauge_class string
          if (gauge.specifications) {
            // Get unit from gauge data if available, default to 'mm'
            const unit = (gauge as any).unit || 'mm';
            return (
              <SpecificationChips
                specifications={gauge.specifications}
                gaugeType={gauge.master_gauge_name}
                unit={unit}
                maxChips={3}
                size="sm"
                variant="flat"
                className="max-w-[200px]"
              />
            );
          }
          // Fallback to displaying gauge_class string
          return (
            <div className="text-[13px] truncate max-w-[150px]" title={info.gauge_class ?? "-"}>
              {info.gauge_class ?? "-"}
            </div>
          );
        case "status":
          return getStatusBadge(info.status ?? "inward_received");
        case "inward_no":
          return (
            <Button
              size="sm"
              variant="primary"
              className="h-7 px-3 text-xs font-medium"
              onPress={() => onInwardNoClick && onInwardNoClick(gauge)}
              isDisabled={!onInwardNoClick}
            >
              {info.inward_no || "-"}
            </Button>
          );
        case "inward_date":
          return (
            <div className="text-[13px]" title={info.inward_date ? new Date(info.inward_date).toLocaleDateString() : "N/A"}>
              {info.inward_date ? new Date(info.inward_date).toLocaleDateString() : "N/A"}
            </div>
          );
        case "actions":
          // View Certificate Tab - Only show Print button
          if (isViewCertificateTab) {
            return (
              <div className="flex items-center justify-center gap-1">
                <Button
                  isIconOnly
                  // size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
                  onPress={() => onCertificate && onCertificate(gauge.inward_id, gauge.gauge_id)}
                  aria-label="View certificate"
                  isDisabled={info.status !== "calibration_completed"}
                >
                  <PrinterIcon className="h-4 w-4 " />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 min-w-8 rounded-lg hover:bg-blue-50 flex items-center justify-center border border-blue-300"
                  onPress={() => onEdit && onEdit(gauge.gauge_id)}
                  aria-label="Edit gauge"
                  isDisabled={!onEdit}
                >
                  <PencilSquareIcon className="h-4 w-4 text-blue-600" />
                </Button>

                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 min-w-8 rounded-lg hover:bg-red-50 flex items-center justify-center border border-red-300"
                  onPress={() => requestDelete(gauge)}
                  aria-label="Delete gauge"
                  isDisabled={!onDelete}
                >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            );
          }

          // New Certificate Tab - Show all action buttons
          return (
            <div className="flex items-center justify-center gap-1">

              {onNablCalibration && (
                <Button
                  size="sm"
                  variant="primary"
                  className="h-8 px-2 min-w-[52px] font-semibold"
                  onPress={() => onNablCalibration(gauge)}
                  aria-label="NABL calibration"
                >
                  NABL
                </Button>
              )}

              {onNonNablCalibration && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  className="h-8 px-2 min-w-[70px] font-semibold"
                  onPress={() => onNonNablCalibration(gauge)}
                  aria-label="Non-NABL calibration"
                >
                  Non-NABL
                </Button>
              )}


            </div>

          );
        default:
          return "";
      }
    },
    [customActions, onDelete, onEdit, onPreview, onNablCalibration, onNonNablCalibration, onCertificate, onInwardNoClick, isPreview, isViewCertificateTab, getStatusBadge, page, rowsPerPage],
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
    const nextValue = value ?? "";
    if (onSearchValueChange) {
      onSearchValueChange(nextValue);
    } else {
      setLocalFilterValue(nextValue);
    }
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, onSearchValueChange]);

  const onClear = React.useCallback(() => {
    if (onSearchValueChange) {
      onSearchValueChange("");
    } else {
      setLocalFilterValue("");
    }
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, onSearchValueChange]);

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

  const emptyContent = hideCompleted ? "No pending gauges found" : "No gauges available";


  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 bg-white">
        {filters}
        <div className="flex items-end justify-between gap-3">
          <Input className="w-full sm:max-w-[44%]" placeholder={searchPlaceholder} value={filterValue} onChange={(event) => onSearchChange(event.target.value)} />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear linked gauge search" onPress={onClear}><MagnifyingGlassIcon className="w-4 h-4" /></Button> : null}
          <div className="flex items-center gap-2">

            <Popover>
              <Popover.Trigger>
                <Button variant="secondary" className="hidden sm:flex font-medium">
                  Columns
                  <ChevronDownIcon className="text-small" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-56 p-1"><Popover.Dialog><ListBox aria-label="Table Columns" selectedKeys={visibleColumns} selectionMode="multiple" onSelectionChange={setVisibleColumns}>{columns.map((column) => <ListBox.Item key={column.uid} id={column.uid} textValue={capitalize(column.name)}>{capitalize(column.name)}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Popover.Dialog></Popover.Content>
            </Popover>
          </div>
        </div>
      </div>
    );
  }, [filteredData.length, filterValue, onRowsPerPageChange, onSearchChange, onClear, rowsPerPage, visibleColumns, selectedKeys, columns, searchPlaceholder]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:flex-row items-center justify-between px-4 py-3 gap-3 border-t border-gray-200 bg-gray-50 text-sm">
        {/* Selected text */}
        <span className="text-gray-600 whitespace-nowrap font-medium">
          {selectedKeys === "all"
            ? `All ${isServerPagination ? (totalItems ?? filteredData.length) : filteredData.length} items selected`
            : `${selectedKeys.size} of ${isServerPagination ? (totalItems ?? filteredData.length) : filteredData.length} selected`}
        </span>

        {/* Pagination */}
        <Pagination className="scale-90"><Pagination.Content>
          <Pagination.Previous isDisabled={page <= 1} onPress={() => {
            if (controlledOnPageChange) {
              controlledOnPageChange(Math.max(1, page - 1));
            } else {
              setLocalPage(Math.max(1, page - 1));
            }
          }}><Pagination.PreviousIcon /></Pagination.Previous>
          {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => <Pagination.Item key={pageNumber}><Pagination.Link isActive={pageNumber === page} onPress={() => controlledOnPageChange ? controlledOnPageChange(pageNumber) : setLocalPage(pageNumber)}>{pageNumber}</Pagination.Link></Pagination.Item>)}
          <Pagination.Next isDisabled={page >= pages} onPress={() => { const nextPage = Math.min(pages, page + 1); if (controlledOnPageChange) controlledOnPageChange(nextPage); else setLocalPage(nextPage); }}><Pagination.NextIcon /></Pagination.Next>
        </Pagination.Content></Pagination>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Small Select */}
          <Select selectedKey={String(rowsPerPage)} onSelectionChange={(key) => onRowsPerPageChange(new Set(key == null ? [] : [key]))} className="min-w-[140px]">
            <Label>Rows</Label><Select.Trigger className="bg-white border-gray-300 h-8"><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover><ListBox>{['10','20','50','100'].map((size) => <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
          </Select>

          {/* Small Buttons */}
          <Button
            isDisabled={page === 1}
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs font-medium min-w-[60px]"
            onPress={onPreviousPage}
          >
            Prev
          </Button>

          <Button
            isDisabled={page === pages}
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs font-medium min-w-[60px]"
            onPress={onNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }, [filteredData.length, isServerPagination, totalItems, page, pages, selectedKeys, onNextPage, onPreviousPage, rowsPerPage, onRowsPerPageChange, controlledOnPageChange]);

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <div className="mb-4">{topContent}</div>
        <Table aria-label="Linked gauges table" className="min-w-full">
          <Table.ScrollContainer className="max-h-[calc(100vh-320px)]"><Table.Content selectedKeys={selectedKeys} selectionMode="multiple" sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}>
          <Table.Header columns={columns.filter((col) => visibleColumns === "all" || Array.from(visibleColumns).includes(col.uid))}>
            {(column) => (
              <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === columns[0]?.uid}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={tableItems}
            renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? "Loading..." : emptyContent}</div>}
          >
            {(item) => {
              const index = tableItems.indexOf(item);
              return (
                <Table.Row id={getRowKey(item)} columns={columns}>{(columnKey) => <Table.Cell>{renderCell(item, getTableColumnKey(columnKey), index)}</Table.Cell>}</Table.Row>
              );
            }}
          </Table.Body></Table.Content></Table.ScrollContainer>
        </Table>
        {bottomContent}
      </div>
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Delete gauge"
        message={
          <>
            Are you sure you want to delete this gauge
            {deleteTarget?.label ? (
              <>
                {' '}
                <span className="font-semibold text-gray-900">{deleteTarget.label}</span>
              </>
            ) : null}
            ? This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
