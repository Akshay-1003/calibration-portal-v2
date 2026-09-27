"use client";

import React, { useMemo, useCallback, memo, useEffect } from "react";
import type { Key } from "@react-types/shared";
import { PencilIcon, TrashIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import {
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Selection,
  SortDescriptor,
  Pagination,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
} from "@heroui-v2/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Organization } from "../../hooks/useOrganizations";
import { useOrganizationsWithQuery } from "../../hooks/useOrganizationsWithQuery";
import type { OrganizationDirectory } from "../../hooks/queries/organizations";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTableUrlState } from "../../hooks/useTableUrlState";
import { DEFAULT_BULK_FETCH_LIMIT } from "../../utils/paginatedResponse";
import "../../styles/industrial-table.css";
import { DeleteConfirmModal } from "../common/DeleteConfirmModal";

export type OrganizationTableData = {
  id: string;
  name: string;
  labType: string;
  labCertificateNumber: string;
  status: "Active" | "Deactive";
  contactEmail: string;
  contactPhone: string;
  gstNo: string;
  fullAddress: string;
  createdAt: string;
  updatedAt: string;
};

const formatAddress = (org: Organization) => {
  const parts = [
    org.address?.address_line_1,
    org.address?.city,
    org.address?.state,
    org.address?.zip_code,
  ].filter((value) => value && String(value).trim() && String(value).trim().toLowerCase() !== 'na');

  return parts.length > 0 ? parts.join(', ') : 'N/A';
};

const transformOrganizationToTableData = (org: Organization): OrganizationTableData => {
  const organizationWithGst = org as Organization & { gst?: string };

  return {
    id: org.id,
    name: org.name,
    labType: org.lab_type || "N/A",
    labCertificateNumber: org.lab_certificate_number || "N/A",
    status: org.is_active === false ? "Deactive" : "Active",
    contactEmail: org.contacts?.[0]?.email || "N/A",
    contactPhone: org.contacts?.[0]?.phone || "N/A",
    gstNo: organizationWithGst.gst || "N/A",
    fullAddress: formatAddress(org),
    createdAt: org.created_at,
    updatedAt: org.updated_at,
  };
};

type TableColumnKey =
  | "sr_no"
  | "name"
  | "labType"
  | "labCertificateNumber"
  | "status"
  | "fullAddress"
  | "contactPhone"
  | "gstNo"
  | "contactEmail"
  | "actions";

const getColumns = (
  entityLabel: string,
  directory: Extract<OrganizationDirectory, 'customers' | 'laboratories'>,
): { name: string; uid: TableColumnKey; sortable?: boolean }[] => {
  if (directory === 'laboratories') {
    return [
      { name: "SR NO", uid: "sr_no" },
      { name: "LABORATORY NAME", uid: "name", sortable: true },
      { name: "TYPE OF LAB", uid: "labType", sortable: true },
      { name: "CC / CERTIFICATE NO.", uid: "labCertificateNumber", sortable: true },
      { name: "STATUS", uid: "status", sortable: true },
      { name: "ACTIONS", uid: "actions" },
    ];
  }

  return [
    { name: "SR NO", uid: "sr_no" },
    { name: `${entityLabel.toUpperCase()} NAME`, uid: "name", sortable: true },
    { name: "ADDRESS", uid: "fullAddress", sortable: true },
    { name: "CONTACT NUMBER", uid: "contactPhone", sortable: true },
    { name: "GST NO", uid: "gstNo", sortable: true },
    { name: "EMAIL", uid: "contactEmail", sortable: true },
    { name: "ACTIONS", uid: "actions" },
  ];
};

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  "name",
  "labType",
  "labCertificateNumber",
  "status",
  "fullAddress",
  "contactPhone",
  "gstNo",
  "contactEmail",
  "actions",
];

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "");

const ActionsCell = memo(({ item, onEdit, onSettings, onDelete }: {
  item: OrganizationTableData;
  onEdit: (id: string) => void;
  onSettings?: (id: string) => void;
  onDelete: (item: OrganizationTableData) => void;
}) => (
  <div
    className="relative flex items-center gap-2"
    onClick={(event) => event.stopPropagation()}
    onPointerDown={(event) => event.stopPropagation()}
  >
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly size="sm" variant="light" aria-label={`Actions for ${item.name}`}>
          <Cog6ToothIcon className="h-4 w-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu>
        <DropdownItem key="edit" startContent={<PencilIcon className="h-4 w-4" />} onPress={() => onEdit(item.id)}>
          Edit
        </DropdownItem>
        {onSettings && (
          <DropdownItem key="settings" startContent={<Cog6ToothIcon className="h-4 w-4" />} onPress={() => onSettings(item.id)}>
            Rate Card
          </DropdownItem>
        )}
        <DropdownItem
          key="delete"
          startContent={<TrashIcon className="h-4 w-4" />}
          className="text-danger"
          onPress={() => onDelete(item)}
        >
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  </div>
));

ActionsCell.displayName = 'ActionsCell';

interface CustomerTableProps {
  directory?: Extract<OrganizationDirectory, 'customers' | 'laboratories'>;
  entityLabel?: string;
  tableStatePrefix?: string;
  onEdit?: (id: string) => void;
  showRateCard?: boolean;
  canManage?: boolean;
}

export const CustomerTable = memo(({
  directory = 'customers',
  entityLabel = directory === 'laboratories' ? 'Laboratory' : 'Client',
  tableStatePrefix = directory,
  onEdit,
  showRateCard = directory === 'customers',
  canManage = true,
}: CustomerTableProps) => {
  const navigate = useNavigate();
  const columns = useMemo(() => getColumns(entityLabel, directory), [directory, entityLabel]);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<OrganizationTableData | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const {
    state: tableUrlState,
    setPage,
    setRowsPerPage,
    setQuery,
  } = useTableUrlState({ prefix: tableStatePrefix, defaultRowsPerPage: 25 });

  const filterValue = tableUrlState.query;
  const rowsPerPage = tableUrlState.rowsPerPage;
  const page = tableUrlState.page;

  const {
    organizations,
    loading,
    error,
    deleteOrganization,
    refreshOrganizations,
  } = useOrganizationsWithQuery({
    page: 0,
    limit: DEFAULT_BULK_FETCH_LIMIT,
    syncToStore: false,
    directory,
  });

  const tableData = useMemo(() => organizations.map(transformOrganizationToTableData), [organizations]);

  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(new Set(INITIAL_VISIBLE_COLUMNS));
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "name" as Key,
    direction: "ascending",
  });

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter(
      (column) =>
        column.uid === "sr_no" ||
        column.uid === "actions" ||
        Array.from(visibleColumns).includes(column.uid)
    );
  }, [columns, visibleColumns]);

  const filteredItems = useMemo(() => {
    if (!hasSearchFilter) return [...tableData];
    const lower = filterValue.toLowerCase();
    return tableData.filter((item) =>
      item.name.toLowerCase().includes(lower) ||
      item.labType.toLowerCase().includes(lower) ||
      item.labCertificateNumber.toLowerCase().includes(lower) ||
      item.status.toLowerCase().includes(lower) ||
      item.fullAddress.toLowerCase().includes(lower) ||
      item.contactPhone.toLowerCase().includes(lower) ||
      item.contactEmail.toLowerCase().includes(lower) ||
      item.gstNo.toLowerCase().includes(lower)
    );
  }, [tableData, filterValue, hasSearchFilter]);

  const totalItems = filteredItems.length;
  const pages = Math.max(Math.ceil(totalItems / rowsPerPage), 1);

  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages);
    }
  }, [page, pages, setPage]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, page, rowsPerPage]);

  const sortedItems = useMemo(() => {
    return [...paginatedItems].sort((a, b) => {
      const { column, direction } = sortDescriptor;
      if (!column || column === "actions" || column === "sr_no") return 0;
      const first = a[column as keyof OrganizationTableData];
      const second = b[column as keyof OrganizationTableData];
      const normalizedFirst = typeof first === "string" ? first.toLowerCase() : first ?? "";
      const normalizedSecond = typeof second === "string" ? second.toLowerCase() : second ?? "";

      if (normalizedFirst < normalizedSecond) return direction === "descending" ? 1 : -1;
      if (normalizedFirst > normalizedSecond) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [paginatedItems, sortDescriptor]);

  const handleEdit = useCallback(
    (id: string) => {
      if (onEdit) {
        onEdit(id);
        return;
      }
      navigate(`/masters/party-master/edit/${id}`);
    },
    [navigate, onEdit],
  );

  const handleSettings = useCallback(
    (id: string) => {
      navigate(`/masters/party-master/${id}/rate-card`);
    },
    [navigate],
  );

  const requestDelete = useCallback((organization: OrganizationTableData) => {
    setDeleteTarget(organization);
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    if (isDeleting) return;
    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const success = await deleteOrganization(deleteTarget.id);
      if (success) {
        toast.success("Organization deleted successfully!");
      } else {
        toast.error("Failed to delete organization");
        throw new Error("Delete failed");
      }
    } catch (error) {
      toast.error("Error deleting organization");
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [deleteOrganization, deleteTarget]);

  const renderCell = useCallback((item: OrganizationTableData, columnKey: TableColumnKey, index: number) => {
    if (columnKey === 'sr_no') {
      const srNo = (page - 1) * rowsPerPage + index + 1;
      return (
        <div className="text-[13px] text-center font-medium text-gray-600">
          {srNo}
        </div>
      );
    }

    if (columnKey === 'actions') {
      if (!canManage) {
        return <span className="text-default-400">-</span>;
      }
      return (
        <ActionsCell
          item={item}
          onEdit={handleEdit}
          onSettings={showRateCard ? handleSettings : undefined}
          onDelete={requestDelete}
        />
      );
    }

    if (columnKey === 'fullAddress') {
      return (
        <div className="text-[13px] whitespace-normal break-words max-w-[260px]" title={item.fullAddress}>
          {item.fullAddress}
        </div>
      );
    }

    if (columnKey === 'status') {
      const isActive = item.status === 'Active';
      return (
        <span
          className={[
            'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
            isActive
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
        >
          {item.status}
        </span>
      );
    }

    const value = item[columnKey as keyof OrganizationTableData];
    return (
      <div className="text-[13px] truncate max-w-[220px]" title={String(value || '')}>
        {String(value || 'N/A')}
      </div>
    );
  }, [canManage, handleEdit, handleSettings, requestDelete, page, rowsPerPage, showRateCard]);

  const onRowsPerPageChange = useCallback((keys: Selection) => {
    const value = Array.from(keys)[0] as string;
    setRowsPerPage(Number(value));
    setPage(1);
  }, [setPage, setRowsPerPage]);

  const onSearchChange = useCallback((value?: string) => {
    const nextValue = value ?? "";
    setQuery(nextValue);
    setPage(1);
  }, [setPage, setQuery]);

  const onClear = useCallback(() => {
    setQuery("");
    setPage(1);
  }, [setPage, setQuery]);

  const emptyContent = useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">Unable to load {entityLabel.toLowerCase()}s</p>
          <p className="text-xs text-default-500">{error}</p>
          <Button size="sm" variant="bordered" onPress={() => refreshOrganizations()}>
            Try Again
          </Button>
        </div>
      );
    }
    return `No ${entityLabel.toLowerCase()}s found`;
  }, [entityLabel, error, refreshOrganizations]);

  const topContent = useMemo(() => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Input
          isClearable
          className="w-full sm:max-w-[44%]"
          placeholder={
            directory === 'laboratories'
              ? 'Search by laboratory, lab type, certificate number...'
              : `Search by ${entityLabel.toLowerCase()}, address, phone, GST, email...`
          }
          startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
          value={filterValue}
          onClear={onClear}
          onValueChange={onSearchChange}
        />
        <div className="flex gap-3">
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
              {columns
                .filter((column) => column.uid !== 'sr_no' && column.uid !== 'actions')
                .map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  ), [columns, directory, entityLabel, filterValue, onClear, onSearchChange, visibleColumns]);

  const bottomContent = useMemo(() => (
    <div className="flex items-center justify-between py-3 px-2 gap-4">
      <div className="flex-1">
        <span className="text-small text-default-400">
          {selectedKeys === "all"
            ? "All items selected"
            : `${selectedKeys.size} of ${totalItems} selected`}
        </span>
      </div>
      <div className="flex-1 flex justify-center">
        <Pagination
          color="primary"
          isCompact
          showControls
          showShadow
          page={page}
          total={pages}
          onChange={setPage}
        />
      </div>
      <div className="flex-1 flex justify-end">
        <Select
          label="Rows per page"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={new Set([String(rowsPerPage)])}
          onSelectionChange={onRowsPerPageChange}
          labelPlacement="outside-left"
          size="sm"
          className="w-[170px]"
        >
          <SelectItem key="10">10</SelectItem>
          <SelectItem key="25">25</SelectItem>
          <SelectItem key="50">50</SelectItem>
          <SelectItem key="100">100</SelectItem>
        </Select>
      </div>
    </div>
  ), [selectedKeys, totalItems, page, pages, rowsPerPage, onRowsPerPageChange, setPage]);

  return (
    <div className="flex flex-col gap-4">
      <div className="p-2">
        <div className="industrial-table-wrapper">
          <Table
            aria-label={`${entityLabel} table`}
            isHeaderSticky
            topContent={topContent}
            topContentPlacement="outside"
            bottomContent={bottomContent}
            bottomContentPlacement="outside"
            classNames={{
              wrapper: "max-h-[600px] p-0",
              base: "min-w-full",
            }}
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  align={column.uid === "actions" || column.uid === "sr_no" ? "center" : "start"}
                  allowsSorting={column.sortable}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent={emptyContent}
              items={sortedItems}
              isLoading={loading}
              loadingContent={<div className="py-8 flex justify-center items-center text-sm text-default-500">Loading...</div>}
            >
              {(item) => {
                const index = sortedItems.findIndex((row) => row.id === item.id);
                return (
                  <TableRow key={item.id}>
                    {(columnKey) => (
                      <TableCell>
                        {renderCell(item, columnKey as TableColumnKey, index)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              }}
            </TableBody>
          </Table>
        </div>
      </div>
      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title={`Delete ${entityLabel.toLowerCase()}`}
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{deleteTarget?.name ?? `this ${entityLabel.toLowerCase()}`}</span>?
            This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
});

CustomerTable.displayName = 'CustomerTable';
