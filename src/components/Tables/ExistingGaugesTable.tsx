"use client";
import React from "react";
import type { Key } from "@react-types/shared";
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
import { GaugeData as ExistingGaugeType } from "../../types/types";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { SpecificationChips } from "../gaugeTypes/SpecificationChips";
import { getTableColumnKey } from './tableColumnKey';
import "../../styles/industrial-table.css";

type TableColumnKey =
  | "master_gauge"
  | "make"
  | "identification_number"
  | "specifications"
  | "manf_serial_number"
  | "calibration_frequency"
  | "due_date"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "NAME", uid: "master_gauge", sortable: true },
  { name: "MAKE", uid: "make", sortable: true },
  { name: "IDENTIFICATION NO", uid: "identification_number" },
  { name: "SPECIFICATION", uid: "specifications" },
  { name: "SR NO", uid: "manf_serial_number" },
  { name: "FREQUENCY", uid: "calibration_frequency" },
  { name: "DUE DATE", uid: "due_date", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["master_gauge", "make", "identification_number", "specifications", "manf_serial_number", "calibration_frequency", "due_date", "actions"];

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

const getDueDate = (gauge: ExistingGaugeType): string | null => {
  const gaugeWithDueDate = gauge as ExistingGaugeType & {
    due_date?: string;
    calibration_due_date?: string;
  };

  const explicitDueDate =
    gaugeWithDueDate.due_date || gaugeWithDueDate.calibration_due_date;
  if (explicitDueDate) {
    return explicitDueDate;
  }

  const baseDateValue = gauge.updated_at || gauge.created_at;
  const frequency = Number(gauge.calibration_frequency);
  const unit = gauge.calibration_frequency_unit;

  if (!baseDateValue || !Number.isFinite(frequency) || frequency <= 0 || !unit) {
    return null;
  }

  const nextDate = new Date(baseDateValue);
  if (Number.isNaN(nextDate.getTime())) {
    return null;
  }

  if (unit === "years") {
    nextDate.setFullYear(nextDate.getFullYear() + frequency);
  } else {
    nextDate.setMonth(nextDate.getMonth() + frequency);
  }

  return nextDate.toISOString();
};

export function ExistingGaugesTable({
  data = [],
  onAddGauge,
  onBulkAddGauges,
  loading = false,
  bulkAddLoading = false,
  externalIdentificationNumber = "",
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
}: {
  onAddGauge: (gauge: ExistingGaugeType) => void;
  onBulkAddGauges?: (gauges: ExistingGaugeType[]) => void;
  data: ExistingGaugeType[];
  loading?: boolean;
  bulkAddLoading?: boolean;
  externalIdentificationNumber?: string;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}) {
  const [searchValue, setSearchValue] = React.useState<string>("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "master_gauge" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);
  const hasSearchFilter = searchValue.trim().length > 0;
  const prevBulkAddLoading = React.useRef(bulkAddLoading);
  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;
console.log('data', data)
  React.useEffect(() => {
    if (externalIdentificationNumber) {
      setSearchValue(externalIdentificationNumber);
      if (controlledOnPageChange) {
        controlledOnPageChange(1);
      } else {
        setLocalPage(1);
      }
    }
  }, [controlledOnPageChange, externalIdentificationNumber]);

  // Clear selection after bulk add completes successfully
  React.useEffect(() => {
    if (prevBulkAddLoading.current && !bulkAddLoading && selectedKeys !== "all" && selectedKeys.size > 0) {
      // Bulk add just completed, clear selection
      setSelectedKeys(new Set());
    }
    prevBulkAddLoading.current = bulkAddLoading;
  }, [bulkAddLoading, selectedKeys]);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;

    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filteredData = [...data];

    if (hasSearchFilter) {
      const searchLower = searchValue.toLowerCase();
      filteredData = filteredData.filter((item) => {
        // Search across identification number, name (master_gauge), and serial number
        return (
          item.master_gauge?.toLowerCase().includes(searchLower) ||
          item.identification_number?.toLowerCase().includes(searchLower) ||
          item.manf_serial_number?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filteredData;
  }, [data, searchValue, hasSearchFilter]);

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
    return [...items].sort((a: ExistingGaugeType, b: ExistingGaugeType) => {
      const first =
        sortDescriptor.column === "due_date"
          ? getDueDate(a) || ""
          : (a[sortDescriptor.column as keyof ExistingGaugeType] as string | number);
      const second =
        sortDescriptor.column === "due_date"
          ? getDueDate(b) || ""
          : (b[sortDescriptor.column as keyof ExistingGaugeType] as string | number);
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
      case "due_date": {
        const dueDate = getDueDate(gauge);
        return (
          <div className="text-[13px] truncate max-w-[120px]" title={dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"}>
            {dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"}
          </div>
        );
      }
      case "actions":
        return (
          <div className="flex gap-2">
            <Button
              onPress={() => onAddGauge(gauge)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
              aria-label="Add this gauge into the form"
            >
              Add
            </Button>
          </div>
        );
      default:
        return cellValue === null || cellValue === undefined ? "-" : String(cellValue);
    }
  }, [onAddGauge]);

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

  const onSearchChange = React.useCallback((value: string) => {
    setSearchValue(value);
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange]);

  const onClearSearch = React.useCallback(() => {
    setSearchValue("");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange]);

  const selectedGauges = React.useMemo(() => {
    if (selectedKeys === "all") return filteredItems;
    if (selectedKeys.size === 0) return [];
    return filteredItems.filter((item) => selectedKeys.has(item.id));
  }, [selectedKeys, filteredItems]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 pt-2">
        {/* Single search box for identification, name, and serial number */}
        <div className="flex gap-3">
          <Input
            placeholder="Search by identification number, name, or serial number..."
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="flex-1 max-w-md"
          />
          {searchValue ? <Button type="button" variant="ghost" aria-label="Clear gauge search" onPress={onClearSearch}><MagnifyingGlassIcon className="w-4 h-4 text-default-400" /></Button> : null}
        
        {/* Action buttons and controls */}
        <div className="flex justify-end gap-3 items-center">
            {onBulkAddGauges && selectedGauges.length > 0 && (
              <Button
                variant="primary"
                onPress={() => {
                  onBulkAddGauges(selectedGauges);
                }}
                isDisabled={bulkAddLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {bulkAddLoading ? "Adding..." : `Bulk Add (${selectedGauges.length})`}
              </Button>
            )}
            <Popover>
              <Popover.Trigger>
                <Button variant="secondary" size="sm" className="hidden sm:flex">
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
  }, [
    searchValue,
    visibleColumns,
    selectedGauges,
    onBulkAddGauges,
    bulkAddLoading,
    onSearchChange,
    onClearSearch,
  ]);

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
          <Pagination>
            <Pagination.Content>
            <Pagination.Previous isDisabled={page <= 1} onPress={() => {
              if (controlledOnPageChange) {
                controlledOnPageChange(Math.max(1, page - 1));
              } else {
                setLocalPage(Math.max(1, page - 1));
              }
            }}><Pagination.PreviousIcon /></Pagination.Previous>
            {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => <Pagination.Item key={pageNumber}><Pagination.Link isActive={pageNumber === page} onPress={() => controlledOnPageChange ? controlledOnPageChange(pageNumber) : setLocalPage(pageNumber)}>{pageNumber}</Pagination.Link></Pagination.Item>)}
            <Pagination.Next isDisabled={page >= pages} onPress={() => { const nextPage = Math.min(pages, page + 1); if (controlledOnPageChange) controlledOnPageChange(nextPage); else setLocalPage(nextPage); }}><Pagination.NextIcon /></Pagination.Next>
            </Pagination.Content>
          </Pagination>
        </div>

        {/* RIGHT - Rows per page */}
        <div className="flex-1 flex justify-end w-10">
          <Select selectedKey={String(rowsPerPage)} onSelectionChange={(key) => onRowsPerPageChange(new Set(key == null ? [] : [key]))} className="w-[160px]">
            <Label>Rows per page</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
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
    rowsPerPage,
    onRowsPerPageChange,
    controlledOnPageChange,
  ]);

  return (
    <div className="industrial-table-wrapper">
    <div className="mb-4">{topContent}</div>
    <Table aria-label="Existing gauges table" className="min-w-full">
      <Table.ScrollContainer className="max-h-[calc(100vh-320px)]"><Table.Content selectedKeys={selectedKeys} selectionMode="multiple" sortDescriptor={sortDescriptor} onSelectionChange={setSelectedKeys} onSortChange={setSortDescriptor}>
      <Table.Header columns={headerColumns}>
            {(column) => (
            <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === headerColumns[0]?.uid}>
                {column.name}
              </Table.Column>
            )}
          </Table.Header>
      <Table.Body
        items={sortedItems}
        renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? "Loading..." : "No gauges found"}</div>}
      >
        {(item) => (
          <Table.Row id={item.id} columns={headerColumns}>{(columnKey) => <Table.Cell>{renderCell(item, getTableColumnKey(columnKey))}</Table.Cell>}</Table.Row>
        )}
      </Table.Body></Table.Content></Table.ScrollContainer>
    </Table>
    {bottomContent}
    </div>
  );
}
