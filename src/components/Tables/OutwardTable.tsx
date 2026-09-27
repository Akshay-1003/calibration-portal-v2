"use client";

import React, { useEffect } from "react";
import type { Key } from "@react-types/shared";
import { useTableUrlState } from "../../hooks/useTableUrlState";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Selection,
  SortDescriptor,
  Pagination,
  Select,
  SelectItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Listbox,
  ListboxItem,
} from "@heroui-v2/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { OutwardEntry } from "../../types";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { 
  ArrowTopRightOnSquareIcon,
  PrinterIcon
} from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";

type TableColumnKey =
  | "sr_no"
  | "actions"
  | "outward_id"
  | "client_org"
  | "outward_date"
  | "transport_by";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "ACTIONS", uid: "actions" },
  { name: "OUTWARD ID", uid: "outward_id", sortable: true },
  { name: "CLIENT NAME", uid: "client_org", sortable: true },
  { name: "OUTWARD DATE", uid: "outward_date", sortable: true },
  { name: "TRANSPORT BY", uid: "transport_by", sortable: true },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  "outward_id",
  "client_org",
  "outward_date",
  "transport_by",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

export function OutwardTable({
  loading = false,
  error = null,
  data = [],
  onRefresh: _onRefresh, // Kept for future use or error recovery UI
  onOpen,
  onPrint,
  onDelete,
}: {
  loading?: boolean;
  error?: string | null;
  data?: OutwardEntry[];
  onRefresh?: () => void;
  onOpen?: (id: string) => void;
  onPrint?: (id: string) => void;
  onDelete?: (id: string) => void;
} = {}) {
  const {
    state: tableUrlState,
    setPage,
    setRowsPerPage,
    setQuery,
  } = useTableUrlState({ prefix: "outward", defaultRowsPerPage: 10 });

  const filterValue = tableUrlState.query;
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const rowsPerPage = tableUrlState.rowsPerPage;
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "outward_date" as Key,
    direction: "descending",
  });
  const page = tableUrlState.page;

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filtered = [...data];
    
    if (hasSearchFilter) {
      const lower = filterValue.toLowerCase();
      filtered = filtered.filter((item) => {
        const searchableText = [
          item.id,
          item.clientOrgId,
          (item as any).transport_by,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        return searchableText.includes(lower);
      });
    }
    
    return filtered;
  }, [data, filterValue, hasSearchFilter]);

  const pages = Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  // Clamp page when filtered results change (e.g., delete) so we don't show an empty page.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages, setPage]);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const getComparableValue = React.useCallback((item: OutwardEntry, columnKey: TableColumnKey) => {
    switch (columnKey) {
      case "outward_id":
        return item.id ?? "";
      case "client_org":
        return item.client_org ?? "";
      case "outward_date":
        return (item as any).outward_date ?? "";
      case "transport_by":
        return (item as any).transport_by ?? "";
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

      let comparison = 0;
      
      if (column === "outward_date") {
        const dateA = first ? new Date(first).getTime() : 0;
        const dateB = second ? new Date(second).getTime() : 0;
        comparison = dateA - dateB;
      } else {
        const strA = first.toString().toLowerCase();
        const strB = second.toString().toLowerCase();
        comparison = strA.localeCompare(strB);
      }

      return direction === "descending" ? -comparison : comparison;
    });
  }, [items, sortDescriptor, getComparableValue]);

  const renderCell = React.useCallback(
    (outward: OutwardEntry, columnKey: React.Key, index: number) => {
      switch (columnKey) {
        case "sr_no":
          const srNo = (page - 1) * rowsPerPage + index + 1;
          return (
            <div className="text-[13px] text-center font-medium text-gray-600">
              {srNo}
            </div>
          );
        case "outward_id":
          return (
            <div className="text-[13px] font-medium truncate max-w-[150px]" title={outward.outward_no ?? "-"}>
              {outward.outward_no ?? "-"}
            </div>
          );
        case "client_org":
          return (
            <div className="text-[13px] font-medium truncate max-w-[220px]" title={(outward as any).client_org ?? "-"}>
              {(outward as any).client_org ?? "-"}
            </div>
          );
        case "outward_date":
          const outward_date = (outward as any).outward_date ?? outward.dispatchDate;
          return (
            <div className="text-[13px]" title={outward_date ? new Date(outward_date).toLocaleDateString() : "N/A"}>
              {outward_date ? new Date(outward_date).toLocaleDateString() : "N/A"}
            </div>
          );
        case "transport_by":
          return (
            <div className="text-[13px] truncate max-w-[150px]" title={(outward as any).transport_by ?? "-"}>
              {(outward as any).transport_by ?? "-"}
            </div>
          );
        case "actions":
          return (
            <div className="flex items-center justify-center gap-2">
              {onDelete && (
                <div className="flex items-center justify-center h-7 hover:bg-red-100 transition-colors duration-200 px-3 text-xs font-medium border cursor-pointer border-red-300 rounded-md"   onClick={() => onDelete(outward.id)} >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </div>
              )}
              {onOpen && (
                <Button
                  size="sm"
                  variant="flat"
                  color="primary"
                  onPress={() => onOpen(outward.id)}
                  className="h-7 px-3 text-xs font-medium"
                  startContent={<ArrowTopRightOnSquareIcon className="h-3 w-3" />}
                >
                  Open
                </Button>
              )}
              {onPrint && (
                <Button
                  size="sm"
                  variant="flat"
                  color="default"
                  onPress={() => onPrint(outward.id)}
                  className="h-7 px-3 text-xs font-medium"
                  startContent={<PrinterIcon className="h-3 w-3" />}
                >
                  Print
                </Button>
              )}
            </div>
          );
        default:
          return "";
      }
    },
    [onOpen, onPrint, onDelete, page, rowsPerPage],
  );

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    setRowsPerPage(Number(value));
    setPage(1);
  }, [setPage, setRowsPerPage]);

  const onSearchChange = React.useCallback((value?: string) => {
    if (value) {
      setQuery(value);
      setPage(1);
    } else {
      setQuery("");
    }
  }, [setPage, setQuery]);

  const onClear = React.useCallback(() => {
    setQuery("");
    setPage(1);
  }, [setPage, setQuery]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4 p-4 bg-white border-b border-gray-200">
        <div className="flex items-end justify-between gap-3">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by outward ID, client name, transport by..."
            startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
            value={filterValue}
            onClear={onClear}
            onValueChange={onSearchChange}
            classNames={{
              inputWrapper: "border-gray-300 hover:border-gray-400 focus-within:border-blue-500",
            }}
          />
          <div className="flex items-center gap-2">
            <Popover placement="bottom-end" showArrow>
              <PopoverTrigger>
                <Button 
                  endContent={<ChevronDownIcon className="text-small w-4 h-4" />} 
                  variant="flat"
                  className="hidden sm:flex font-medium"
                >
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1">
                <Listbox
                  aria-label="Table Columns"
                  disallowEmptySelection
                  selectedKeys={visibleColumns}
                  selectionMode="multiple"
                  onSelectionChange={setVisibleColumns}
                  variant="flat"
                >
                  {columns.map((column) => (
                    <ListboxItem
                      key={column.uid}
                      className="capitalize rounded-md"
                      classNames={{
                        base: "data-[hover=true]:bg-gray-100",
                      }}
                    >
                      {capitalize(column.name)}
                    </ListboxItem>
                  ))}
                </Listbox>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  }, [filterValue, onSearchChange, onClear, visibleColumns]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 sm:items-center px-4 py-3 gap-3 border-t border-gray-200 bg-gray-50 text-sm">
        <span className="text-gray-600 whitespace-nowrap font-medium sm:justify-self-start">
          {selectedKeys === "all"
            ? `All ${filteredItems.length} items selected`
            : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>

        <div className="sm:justify-self-center">
          <Pagination
            color="primary"
            isCompact
            showControls
            page={page}
            total={pages}
            onChange={setPage}
            className="scale-90"
            classNames={{
              item: "bg-white border-gray-300",
              cursor: "bg-blue-600 text-white",
            }}
          />
        </div>

        <div className="sm:justify-self-end flex items-center gap-2">
          <Select
            label="Rows per page"
            selectedKeys={new Set([String(rowsPerPage)])}
            onSelectionChange={onRowsPerPageChange}
            labelPlacement="outside-left"
            size="sm"
            className="min-w-[170px]"
            classNames={{
              trigger: "bg-white border-gray-300 h-8",
            }}
          >
            <SelectItem key="10">10</SelectItem>
            <SelectItem key="20">20</SelectItem>
            <SelectItem key="50">50</SelectItem>
            <SelectItem key="100">100</SelectItem>
          </Select>
        </div>
      </div>
    );
  }, [filteredItems.length, page, pages, selectedKeys, rowsPerPage, onRowsPerPageChange, setPage]);

  const emptyContent = error 
    ? `Error: ${error}` 
    : "No outward entries found";

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <Table
          aria-label="Outward entries table"
          isHeaderSticky
          bottomContent={bottomContent}
          bottomContentPlacement="outside"
          classNames={{ 
            wrapper: "max-h-[calc(100vh-320px)] p-0",
            base: "min-w-full",
          }}
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
              <TableColumn key={column.uid} align={column.uid === "actions" || column.uid === "sr_no" ? "center" : "start"} allowsSorting={column.sortable}>
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            emptyContent={emptyContent}
            items={sortedItems}
            isLoading={loading}
            loadingContent={<div className="py-8 flex justify-center items-center text-sm text-default-500"><svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Loading...</div>}
          >
            {(item) => {
              const index = sortedItems.findIndex(i => i.id === item.id);
              return (
                <TableRow key={item.id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey, index)}</TableCell>}
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

