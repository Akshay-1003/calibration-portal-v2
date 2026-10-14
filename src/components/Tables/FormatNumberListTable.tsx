"use client";

import React from "react";
import type { Key, Selection, SortDescriptor } from "@react-types/shared";
import {
  Input,
  Button,
  ListBox,
  Popover,
  Table,
} from "@heroui/react";
import { Badge } from "../ui/badge";
import { ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { FormatNumber } from "../../types/formatNumber";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
import { getTableColumnKey } from './tableColumnKey';
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

interface FormatNumberListTableProps {
  data: FormatNumber[];
  organizationMap: Record<string, string>;
  onDelete?: (id: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

type TableColumnKey =
  | "formatNumber"
  | "formatType"
  | "isActive"
  | "clientOrgId"
  | "created_at"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "FORMAT NUMBER", uid: "formatNumber", sortable: true },
  { name: "TYPE", uid: "formatType", sortable: true },
  { name: "ACTIVE", uid: "isActive" },
  { name: "CLIENT ORGANIZATION", uid: "clientOrgId" },
  { name: "CREATED AT", uid: "created_at", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "formatNumber",
  "formatType",
  "isActive",
  "clientOrgId",
  "created_at",
  "actions",
];

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

const formatTypeLabel = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "N/A";

export default function FormatNumberListTable({
  data,
  organizationMap,
  onDelete,
  loading = false,
  error = null,
  onRefresh,
}: FormatNumberListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS)
  );
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  void setRowsPerPage;
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "created_at" as Key,
    direction: "descending",
  });
  const [page, setPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FormatNumber | null>(null);
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
        item.formatNumber?.toLowerCase().includes(lower) ||
        item.formatType?.toLowerCase().includes(lower)
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

      let first: any = a[column as keyof FormatNumber];
      let second: any = b[column as keyof FormatNumber];

      if (column === "created_at") {
        first = first ? new Date(first).getTime() : 0;
        second = second ? new Date(second).getTime() : 0;
      } else if (typeof first === "string") {
        first = first.toLowerCase();
        second = typeof second === "string" ? second.toLowerCase() : second ?? "";
      }

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const requestDelete = React.useCallback(
    (item: FormatNumber) => {
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
      setDeleteOpen(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, onDelete]);

  const renderCell = React.useCallback(
    (item: FormatNumber, columnKey: React.Key) => {
      switch (columnKey) {
        case "formatNumber":
          return (
            <div className="text-[13px] truncate max-w-[180px]" title={formatText(item.formatNumber)}>
              {formatText(item.formatNumber)}
            </div>
          );
        case "formatType":
          return (
            <Badge variant="outline" className="text-xs capitalize">
              {formatTypeLabel(item.formatType)}
            </Badge>
          );
        case "isActive":
          return (
            <Badge
              variant={item.isActive ? "default" : "secondary"}
              className="text-xs"
            >
              {item.isActive ? "Active" : "Inactive"}
            </Badge>
          );
        case "clientOrgId":
          return (
            <div className="text-[13px] truncate max-w-[200px]" title={organizationMap[item.clientOrgId ?? ""] || "N/A"}>
              {organizationMap[item.clientOrgId ?? ""] || "N/A"}
            </div>
          );
        case "created_at":
          return (
            <div className="text-[13px]" title={formatDate(item.created_at)}>
              {formatDate(item.created_at)}
            </div>
          );
        case "actions":
          return (
            <Button
              size="sm"
              variant="danger-soft"
              onPress={() => requestDelete(item)}
              isIconOnly
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          );
        default:
          return formatText(item[columnKey as keyof FormatNumber]);
      }
    },
    [organizationMap, requestDelete]
  );

  return (
    <div className="industrial-table-wrapper space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          className="max-w-xs"
          placeholder="Search format numbers..."
          aria-label="Search format numbers"
          value={filterValue}
          onChange={(event) => {
            setFilterValue(event.target.value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button size="sm" variant="secondary" onPress={onRefresh}>
              Refresh
            </Button>
          )}
          <Popover isOpen={columnsOpen} onOpenChange={setColumnsOpen}>
            <Popover.Trigger>
              <Button size="sm" variant="secondary" onPress={() => setColumnsOpen(true)}>
                Columns <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </Popover.Trigger>
            <Popover.Content>
              <Popover.Dialog>
                <ListBox aria-label="Select columns" selectionMode="multiple" selectedKeys={visibleColumns} onSelectionChange={setVisibleColumns}>
                  {columns.map((column) => (
                    <ListBox.Item key={column.uid} id={column.uid} textValue={column.name}>
                      {column.name}<ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        </div>
      </div>

      <Table aria-label="Format Number Table" className={dataTableClassName("min-h-[200px]")}>
        <Table.ScrollContainer>
          <Table.Content sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor}>
        <Table.Header columns={headerColumns}>
          {(column) => (
            <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === headerColumns[0]?.uid}>
              {column.name}
            </Table.Column>
          )}
        </Table.Header>
        <Table.Body
          items={sortedItems}
          renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? 'Loading...' : error ? error : 'No format numbers found'}</div>}
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

      <div className="flex items-center justify-between">
        <span className="text-sm text-default-500">
          {filteredItems.length} total entries
        </span>
        <TablePagination page={page} totalPages={pages} onPageChange={setPage} />
      </div>

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        isConfirmLoading={isDeleting}
        title="Delete Format Number"
        message="Are you sure you want to delete this format number? This action cannot be undone."
      />
    </div>
  );
}
