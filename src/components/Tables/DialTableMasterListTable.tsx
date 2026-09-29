"use client";

import React, { useEffect } from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  Input,
  Button,
  Select,
  ListBox,
  Label,
  Pagination,
  Table,
} from "@heroui/react";
import type { Key } from "@react-types/shared";
import { getTableColumnKey } from './tableColumnKey';
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";
export type DialTableMasterData = {
  id: string;
  table_name: string;
  dial_type: "plunger" | "lever";
  range: string;
  travel: string;
};

interface Props {
  data: DialTableMasterData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDelete?: (id: string) => Promise<void> | void;
  onEdit?: (id: string) => void;
}

const columns: { name: string; uid: keyof DialTableMasterData | "actions" | "sr_no" }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "TABLE NAME", uid: "table_name" },
  { name: "DIAL TYPE", uid: "dial_type" },
  { name: "RANGE", uid: "range" },
  { name: "TRAVEL", uid: "travel" },
  { name: "ACTION", uid: "actions" },
];

export default function DialTableMasterListTable({ data, loading = false, error = null, onRefresh, onDelete, onEdit }: Props) {
  const [filterValue, setFilterValue] = React.useState("");

  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DialTableMasterData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const hasSearchFilter = Boolean(filterValue);


  const filteredItems = React.useMemo(() => {
    if (!hasSearchFilter) return [...data];
    const lower = filterValue.toLowerCase();
    return data.filter((item) =>
      [item.id, item.table_name, item.dial_type, String(item.range), String(item.travel)]
        .join(" ")
        .toLowerCase()
        .includes(lower)
    );
  }, [data, filterValue, hasSearchFilter]);

  const pages = Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  // Clamp page when filtered results change (e.g., delete) so we don't show an empty page.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const onRowsPerPageChange = React.useCallback((key: Key | null) => {
    const value = Number(key ?? rowsPerPage);
    setRowsPerPage(value);
    setPage(1);
  }, []);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Search dial tables..."
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear search" onPress={() => setFilterValue("")}>Clear</Button> : null}
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
  }, [filterValue, onRefresh, loading]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 sm:items-center px-4 py-3 gap-3 border-t bg-gray-50 text-sm">
        <span className="text-gray-600 whitespace-nowrap font-medium sm:justify-self-start">
          Showing {items.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to{' '}
          {Math.min(page * rowsPerPage, filteredItems.length)} of {filteredItems.length} entries
        </span>

        <div className="sm:justify-self-center">
          <Pagination size="sm" className="scale-90">
            <Pagination.Content>
              <Pagination.Previous isDisabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))}>
                <Pagination.PreviousIcon />
              </Pagination.Previous>
              {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
                <Pagination.Item key={pageNumber}>
                  <Pagination.Link isActive={pageNumber === page} onPress={() => setPage(pageNumber)}>{pageNumber}</Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Next isDisabled={page >= pages} onPress={() => setPage((current) => Math.min(pages, current + 1))}>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Content>
          </Pagination>
        </div>

        <div className="sm:justify-self-end flex items-center gap-2">
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={onRowsPerPageChange}
            className="min-w-[170px]"
          >
            <Label>Rows per page</Label>
            <Select.Trigger className="h-8 border border-gray-300 bg-white"><Select.Value /><Select.Indicator /></Select.Trigger>
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
    );
  }, [items.length, filteredItems.length, page, pages, rowsPerPage, onRowsPerPageChange]);

  const requestDelete = React.useCallback(
    (item: DialTableMasterData) => {
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

  const renderCell = React.useCallback((item: DialTableMasterData, columnKey: keyof DialTableMasterData | "actions" | "sr_no") => {
    switch (columnKey) {
      case "sr_no": {
        const idx = items.findIndex((x) => x.id === item.id);
        return (page - 1) * rowsPerPage + idx + 1;
      }
      case "table_name":
        return item.table_name;
      case "dial_type":
        return item.dial_type;
      case "range":
        return String(item.range);
      case "travel":
        return String(item.travel);
      case "actions":
        return (
          <div className="flex gap-2 justify-end">
            <Button isIconOnly size="sm" variant="ghost" onPress={() => onEdit?.(item.id)} className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              className="  bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
              onPress={() => requestDelete(item)} isIconOnly
              aria-label="Delete inward entry"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          </div>
        );
      default:
        return "";
    }
  }, [onEdit, items, page, rowsPerPage, requestDelete]);

  return (
    <div className="p-2 industrial-table-wrapper">
      <div className="mb-4">{topContent}</div>
      <Table aria-label="Dial table master list" className="min-w-full">
        <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
          <Table.Content>
        <Table.Header columns={columns}>
          {(column) => (
            <Table.Column id={column.uid} isRowHeader={column.uid === columns[0]?.uid}>{column.name}</Table.Column>
          )}
        </Table.Header>
        <Table.Body items={items} renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? 'Loading...' : error || 'No dial tables found'}</div>}>
          {(item) => (
            <Table.Row id={item.id} columns={columns}>
              {(columnKey) => (
                <Table.Cell>{renderCell(item, getTableColumnKey(columnKey) as keyof DialTableMasterData | "actions" | "sr_no")}</Table.Cell>
              )}
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
        title="Delete dial table"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{deleteTarget?.table_name ?? 'this dial table'}</span>?
            This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
