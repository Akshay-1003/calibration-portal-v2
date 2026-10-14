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
  Select,
  Chip,
} from "@heroui/react";
import type { Selection, SortDescriptor } from "@react-types/shared";
import { getTableColumnKey } from './tableColumnKey';
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import "../../styles/industrial-table.css";
import {
  DEFAULT_VISIBLE_SURFACE_PLATE_REFERENCE_STANDARD_COLUMNS,
  surfacePlateReferenceStandardColumns,
  type SurfacePlateReferenceStandardColumnKey,
} from "./surfacePlateReferenceStandardsColumns";
import type { SurfacePlateReferenceStandardRecord } from "../../types/surfacePlateReferenceStandards";
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

interface SurfacePlateReferenceStandardsListTableProps {
  data: SurfacePlateReferenceStandardRecord[];
  total: number;
  page: number;
  rowsPerPage: number;
  loading?: boolean;
  error?: string | null;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onRefresh?: () => void;
  onEdit: (recordId: string) => void;
  onDelete: (recordId: string) => void;
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const formatToleranceValue = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const toSortableValue = (
  item: SurfacePlateReferenceStandardRecord,
  column: SurfacePlateReferenceStandardColumnKey
): string | number => {
  switch (column) {
    case "grade_0":
    case "grade_1":
    case "grade_2":
    case "grade_3":
      return item.tolerances[column];
    case "length":
    case "width":
      return item[column];
    default: {
      const value = item[column as keyof SurfacePlateReferenceStandardRecord];
      return typeof value === "string" ? value.toLowerCase() : String(value ?? "");
    }
  }
};

export default function SurfacePlateReferenceStandardsListTable({
  data,
  total,
  page,
  rowsPerPage,
  loading = false,
  error = null,
  onPageChange,
  onRowsPerPageChange,
  onRefresh,
  onEdit,
  onDelete,
}: SurfacePlateReferenceStandardsListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(DEFAULT_VISIBLE_SURFACE_PLATE_REFERENCE_STANDARD_COLUMNS)
  );
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "master_gauge_name" as Key,
    direction: "descending",
  });

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return surfacePlateReferenceStandardColumns;
    return surfacePlateReferenceStandardColumns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid)
    );
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!filterValue.trim()) return [...data];
    const query = filterValue.toLowerCase();
    return data.filter((item) =>
      [
        item.master_gauge_name ?? "",
        item.shape,
        String(item.length),
        String(item.width),
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [data, filterValue]);

  const sortedItems = React.useMemo(() => {
    const column = sortDescriptor.column as SurfacePlateReferenceStandardColumnKey | undefined;
    if (!column || column === "actions") return filteredItems;

    return [...filteredItems].sort((a, b) => {
      const first = toSortableValue(a, column);
      const second = toSortableValue(b, column);

      if (first < second) return sortDescriptor.direction === "descending" ? 1 : -1;
      if (first > second) return sortDescriptor.direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [filteredItems, sortDescriptor]);

  const renderCell = React.useCallback(
    (item: SurfacePlateReferenceStandardRecord, columnKey: React.Key) => {
      const key = columnKey as SurfacePlateReferenceStandardColumnKey;

      switch (key) {
        case "master_gauge_name":
          return (
            <div className="max-w-[220px] truncate text-[13px]" title={item.master_gauge_name ?? "N/A"}>
              {item.master_gauge_name ?? "N/A"}
            </div>
          );
        case "shape":
          return (
            <Chip size="sm" variant="soft" color="accent" className="capitalize">
              {item.shape}
            </Chip>
          );
        case "length":
        case "width":
          return (
            <span className="text-[13px]">
              {formatToleranceValue(Number(item[key as keyof SurfacePlateReferenceStandardRecord] ?? 0))}
            </span>
          );
        case "grade_0":
        case "grade_1":
        case "grade_2":
        case "grade_3":
          return <span className="text-[13px] font-medium">{formatToleranceValue(item.tolerances[key])}</span>;
        case "actions":
          return (
            <div className="flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7 min-w-0 px-2"
                onPress={() => onEdit(item.id)}
              >
                <PencilSquareIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7 min-w-0 px-2"
                onPress={() => onDelete(item.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <span className="text-[13px]">
              {String(item[key as keyof SurfacePlateReferenceStandardRecord] ?? "N/A")}
            </span>
          );
      }
    },
    [onDelete, onEdit]
  );

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">
            Unable to load surface plate reference standards
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

    return "No surface plate reference standards found";
  }, [error, onRefresh]);

  const totalPages = Math.max(Math.ceil(total / rowsPerPage), 1);

  const topContent = React.useMemo(
    () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search by gauge, shape, length, or width..."
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          {filterValue ? (
            <Button type="button" variant="ghost" aria-label="Clear surface plate search" onPress={() => setFilterValue("")}>
              <MagnifyingGlassIcon className="w-4 h-4" />
            </Button>
          ) : null}
          <div className="flex gap-3">
            <Popover>
              <Popover.Trigger>
                <Button variant="secondary" className="hidden sm:flex">
                  Columns
                  <ChevronDownIcon className="text-small w-4 h-4" />
                </Button>
              </Popover.Trigger>
              <Popover.Content className="w-64 p-1">
                <Popover.Dialog>
                  <ListBox
                    aria-label="Table Columns"
                    selectedKeys={visibleColumns}
                    selectionMode="multiple"
                    onSelectionChange={setVisibleColumns}
                  >
                    {surfacePlateReferenceStandardColumns.map((column) => (
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
    ),
    [filterValue, visibleColumns]
  );

  const bottomContent = React.useMemo(
    () => (
      <div className="flex items-center justify-between py-3 px-2 gap-4">
        <div className="flex-1">
          <span className="text-small text-default-400">
            {selectedKeys === "all"
              ? "All items selected"
              : `${selectedKeys.size} of ${sortedItems.length} selected`}
          </span>
        </div>

        <div className="flex-1 flex justify-center">
          <TablePagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
        </div>

        <div className="flex-1 flex justify-end">
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={(key) => onRowsPerPageChange(Number(key))}
            className="w-[160px]"
          >
            <Label>Rows per page</Label>
            <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {['10', '20', '50', '100'].map((size) => (
                  <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    ),
    [onPageChange, onRowsPerPageChange, page, rowsPerPage, selectedKeys, sortedItems.length, totalPages]
  );

  return (
    <div className="p-2 industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Surface plate reference standards table" className={dataTableClassName("min-w-full")}>
        <Table.ScrollContainer className="max-h-[calc(100vh-340px)]">
          <Table.Content
            sortDescriptor={sortDescriptor}
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <Table.Header columns={headerColumns}>
              {(column) => (
                <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === headerColumns[0]?.uid}>
                  {column.name}
                </Table.Column>
              )}
            </Table.Header>
            <Table.Body
              items={sortedItems}
              renderEmptyState={() => (
                <div className="py-8 text-center text-sm text-default-500">
                  {loading ? "Loading surface plate reference standards..." : emptyContent}
                </div>
              )}
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
    </div>
  );
}
