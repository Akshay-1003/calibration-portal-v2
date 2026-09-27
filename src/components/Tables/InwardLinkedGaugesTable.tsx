"use client";

import React from "react";
import type { Key } from "@react-types/shared";
import { PencilSquareIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";
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

import { LinkedGauge } from "../../types";
import { SpecificationChips } from "../gaugeTypes/SpecificationChips";
import { Chip } from "@heroui-v2/react";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import "../../styles/industrial-table.css";

type TableColumnKey =
  | "sr_no"
  | "actions"
  | "client_org_name"
  | "master_gauge_name"
  | "lab_id"
  | "make"
  | "identification_number"
  | "gauge_class"
  | "manf_serial_number"
  | "status"
  | "inward_date"


const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "ACTIONS", uid: "actions" },
  { name: "STATUS", uid: "status" },
  // { name: "COMPANY NAME", uid: "client_org_name" },
  { name: "GAUGE NAME", uid: "master_gauge_name" },
  { name: "IDENTIFICATION", uid: "identification_number" },
  { name: "MAKE", uid: "make" },
  { name: "LAB ID", uid: "lab_id" },
  { name: "SPECIFICATION", uid: "gauge_class" },
  { name: "MANF SERIAL NO", uid: "manf_serial_number" },
  { name: "INWARD DATE", uid: "inward_date" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  // "client_org_name",
  "master_gauge_name",
  "lab_id",
  "make",
  "identification_number",
  "gauge_class",
  "manf_serial_number",
  "status",
  "inward_date",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");


const getStatusBadge = (status: "inward_received" | "calibration_completed") => {
  const statusConfig = {
    inward_received: { color: "warning", label: "Planning"},
    calibration_completed: { color: "success", label: "Completed"},
  };

  const config = statusConfig[status] || statusConfig.inward_received;

  return (
    <Chip variant="flat" color={config.color as any}>
      {config.label}
    </Chip>
  );
};
export function InwardLinkedGaugesTable({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  isPreview,
  customActions,
  onPreview,
  hideCompleted = false,
  onPrintSticker,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
  searchPlaceholder = "Search by gauge name, organization name, Lab ID, identification number...",
}: {
  data?: LinkedGauge[];
  loading?: boolean;
  onEdit: (gaugeInwardId: string) => void;
  onDelete: (gaugeId: string) => void;
  isPreview?: boolean;
  customActions?: (gauge: LinkedGauge) => React.ReactNode;
  onPreview?: (gauge: LinkedGauge) => void;
  hideCompleted?: boolean;
  onPrintSticker?: (gaugeIds: string[]) => void;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  const filterValue = controlledSearchValue ?? localFilterValue;

  const getRowKey = React.useCallback((item: LinkedGauge): string => {
    if (item.id) return item.id;
    const inwardId = item.inward_id || "unknown-inward";
    const gaugeId = item.gauge_id || item.inward_gauge_lab_id || "unknown-gauge";
    if (gaugeId !== "unknown-gauge") {
      return `${inwardId}-${gaugeId}`;
    }

    return `row-${inwardId}-${item.identification_number || "unknown-identification"}-${item.master_gauge_name || "unknown-master"}-${item.manf_serial_number || "unknown-serial"}-${item.inward_date || "unknown-date"}`;
  }, []);

  const getStickerSelectionId = React.useCallback((item: LinkedGauge): string => {
    return item.id || item.gauge_id || "";
  }, []);

  const hasSearchFilter = Boolean(filterValue);

  const filteredData = React.useMemo(() => {
    const base = hideCompleted ? data.filter((g) => g?.status !== "calibration_completed") : [...data];
    if (!hasSearchFilter || isServerPagination) return base;
    const lower = filterValue.toLowerCase();
    return base.filter((item) => {
      const searchableText = [
        item?.master_gauge_name,
        item?.client_org_name,
        item?.inward_gauge_lab_id,
        item?.identification_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(lower);
    });
  }, [data, hideCompleted, filterValue, hasSearchFilter, isServerPagination]);

  const pages = isServerPagination
    ? Math.max(totalPages ?? 1, 1)
    : Math.max(Math.ceil(filteredData.length / rowsPerPage), 1);

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
      // case "client_org_name":
      //   return info.client_org_name ?? "";
      case "master_gauge_name":
        return info.master_gauge_name ?? "";
      case "lab_id":
        return info.inward_gauge_lab_id;
      case "make":
        return info.make ?? "";
      case "identification_number":
        return info.identification_number ?? "";
      case "gauge_class":
        return info.gauge_class ?? "";
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
    return [...items].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      if (!column || column === "actions") return 0;
      const first = getComparableValue(a, column as TableColumnKey).toString().toLowerCase();
      const second = getComparableValue(b, column as TableColumnKey).toString().toLowerCase();

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor, getComparableValue]);

  const displayedItems = React.useMemo(() => {
    if (isServerPagination && loading) {
      return [];
    }
    return sortedItems;
  }, [isServerPagination, loading, sortedItems]);

  const rowKeyToStickerId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of filteredData) {
      const rowKey = getRowKey(item);
      const stickerId = getStickerSelectionId(item);
      if (rowKey && stickerId) {
        map.set(rowKey, stickerId);
      }
    }
    return map;
  }, [filteredData, getRowKey, getStickerSelectionId]);

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
        // case "client_org_name":
        //   return (
        //     <div className="text-[14px] font-medium truncate max-w-[220px]" title={info.client_org_name ?? "-"}>
        //       {info.client_org_name ?? "-"}
        //     </div>
        //   );
        case "master_gauge_name":
          return (
            <div className="text-[14px] truncate max-w-[180px]" title={info.master_gauge_name ?? "-"}>
              {info.master_gauge_name ?? "-"}
            </div>
          );
        case "lab_id":
          return (
            <div className="text-[14px]" title={info.inward_gauge_lab_id ?? gauge.id}>
              {info.inward_gauge_lab_id}
            </div>
          );
        case "make":
        case "identification_number":
        case "manf_serial_number":
          return (
            <div className="text-[14px] truncate max-w-[150px]" title={(info as Record<string, string | undefined>)[columnKey as string] ?? "-"}>
              {(info as Record<string, string | undefined>)[columnKey as string] ?? "-"}
            </div>
          );
        case "gauge_class":
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
            <div className="text-[14px] truncate max-w-[150px]" title={info.gauge_class ?? "-"}>
              {info.gauge_class ?? "-"}
            </div>
          );
        case "status":
          return getStatusBadge(info.status ?? "inward_received");
        case "inward_date":
          return (
            <div className="text-[14px]" title={info.inward_date ? new Date(info.inward_date).toLocaleDateString() : "N/A"}>
              {info.inward_date ? new Date(info.inward_date).toLocaleDateString() : "N/A"}
            </div>
          );
        case "actions":
          return (
            <div className="flex flex-col gap-2">
              {customActions && <div className="flex gap-1">{customActions(gauge)}</div>}

              <div className="flex gap-2">

                {/* Edit */}
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="h-7 w-7 min-w-7 p-0 rounded-md text-blue-600 hover:bg-blue-50 border border-blue-600"
                  onPress={() => onEdit(gauge.id || gauge.gauge_id)}
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>

                {/* Preview */}
                {isPreview && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    isDisabled={info.status !== "calibration_completed"}
                    className={`h-7 w-7 min-w-7 p-0 rounded-md 
                   ${info.status === "calibration_completed"
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-300"
                      }`}
                    onPress={() => onPreview?.(gauge)}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                )}


                <Button
                  size="sm"
                  className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
                  onPress={() => onDelete(gauge.gauge_id)}
                  isIconOnly
                  aria-label="Delete inward entry"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>

              </div>
            </div>

          );
        default:
          return "";
      }
    },
    [customActions, onDelete, onEdit, onPreview, getStatusBadge, page, rowsPerPage],
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
    if (controlledOnSearchChange) {
      controlledOnSearchChange(nextValue);
    } else {
      setLocalFilterValue(nextValue);
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
      setLocalFilterValue("");
    }
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

  const emptyContent = hideCompleted ? "No pending gauges found" : "No gauges available";

  const handlePrintSticker = React.useCallback(() => {
    if (!onPrintSticker) return;

    let selectedIds: string[] = [];

    if (selectedKeys === "all") {
      // When "all" is selected, get all IDs from filtered data
      selectedIds = filteredData
        .map((item) => getStickerSelectionId(item))
        .filter((id): id is string => Boolean(id));
    } else {
      selectedIds = Array.from(selectedKeys)
        .map((key) => rowKeyToStickerId.get(key.toString()) || "")
        .filter((id): id is string => Boolean(id));
    }

    if (selectedIds.length === 0) {
      toast.error("Please select at least one gauge to print sticker");
      return;
    }

    console.log("Selected IDs for sticker:", selectedIds);

    onPrintSticker(selectedIds);
  }, [selectedKeys, filteredData, onPrintSticker, getStickerSelectionId, rowKeyToStickerId]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder={searchPlaceholder}
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={filterValue}
            onClear={onClear}
            onValueChange={onSearchChange}
          />
          <div className="flex items-center gap-2">
            {onPrintSticker && (
              <Button
                color="primary"
                variant="flat"
                onPress={handlePrintSticker}
                startContent={<PrinterIcon className="h-4 w-4" />}
                isDisabled={selectedKeys === "all" ? false : selectedKeys.size === 0}
              >
                Print Sticker{selectedKeys === "all" || selectedKeys.size > 1 ? "s" : ""}
              </Button>
            )}
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
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
  }, [filterValue, onSearchChange, onClear, visibleColumns, onPrintSticker, handlePrintSticker, selectedKeys, searchPlaceholder]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:flex-row items-center justify-between px-2 py-1 gap-2 border-t bg-white text-sm">
        {/* Selected text */}
        <span className="text-default-400 whitespace-nowrap">
          {selectedKeys === "all"
            ? "All items selected"
            : `${selectedKeys.size} of ${isServerPagination ? (totalItems ?? filteredData.length) : filteredData.length} selected`}
        </span>

        {/* Pagination */}
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

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-default-500 whitespace-nowrap">Rows per page</span>
          <Select
            selectedKeys={new Set([String(rowsPerPage)])}
            onSelectionChange={onRowsPerPageChange}
            selectionMode="single"
            disallowEmptySelection
            size="sm"
            className="w-[88px]"
            classNames={{
              trigger: "min-h-8 h-8 bg-white",
              value: "text-sm",
              popoverContent: "min-w-[88px]",
            }}
          >
            <SelectItem key="10" textValue="10">10</SelectItem>
            <SelectItem key="20" textValue="20">20</SelectItem>
            <SelectItem key="50" textValue="50">50</SelectItem>
            <SelectItem key="100" textValue="100">100</SelectItem>
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
  }, [filteredData.length, isServerPagination, totalItems, page, pages, selectedKeys, onNextPage, onPreviousPage, rowsPerPage, onRowsPerPageChange, controlledOnPageChange]);

  return (
    <div className="p-2 industrial-table-wrapper">
    <Table
      aria-label="Linked gauges table"
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
      <TableHeader columns={columns.filter((col) => visibleColumns === "all" || Array.from(visibleColumns).includes(col.uid))}>
        {(column) => (
          <TableColumn key={column.uid} align={column.uid === "actions" ? "center" : "start"} allowsSorting={column.sortable}>
            {column.name}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        emptyContent={emptyContent}
        items={displayedItems}
        isLoading={loading}
        loadingContent={<div className="py-8 flex justify-center items-center text-sm text-default-500"><svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Loading...</div>}
      >
        {(item) => {
          const index = displayedItems.indexOf(item);
          return (
            <TableRow key={getRowKey(item)}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey, index)}</TableCell>}
            </TableRow>
          )
        }}
      </TableBody>
    </Table>
    </div>
  );
}
