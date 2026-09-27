"use client";

import React from "react";
import type { Key } from "@react-types/shared";
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
import {
  BanknotesIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Chip } from "@heroui/chip";
import type { CompanyWithOutward } from "../../store/invoiceStore";
import {
  getInvoiceDisplayStatus,
  invoiceDisplayStatusLabel,
  invoiceStatusFilterOptions,
  normalizeInvoiceStatus,
  type InvoiceDisplayStatus,
  type InvoiceStatusFilter,
} from "../../utils/invoiceLifecycle";
import { formatDateStringForDisplay } from "../../utils/dateAdapter";
import "../../styles/industrial-table.css";

type TableColumnKey =
  | "sr_no"
  | "company_name"
  | "invoice_number"
  | "billing_date"
  | "grand_total"
  | "payment_due_date"
  | "days_pending"
  | "status"
  | "through"
  | "actions";

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: "SR NO", uid: "sr_no" },
  { name: "COMPANY NAME", uid: "company_name", sortable: true },
  { name: "INVOICE NUMBER", uid: "invoice_number", sortable: true },
  { name: "BILLING DATE", uid: "billing_date", sortable: true },
  { name: "INVOICE AMOUNT", uid: "grand_total", sortable: true },
  { name: "PAYMENT DUE DATE", uid: "payment_due_date", sortable: true },
  { name: "DAYS PENDING", uid: "days_pending", sortable: true },
  { name: "STATUS", uid: "status", sortable: true },
  { name: "THROUGH", uid: "through", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  "sr_no",
  "company_name",
  "invoice_number",
  "billing_date",
  "grand_total",
  "payment_due_date",
  "status",
  "through",
  "actions",
];

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const amountFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const statusColorMap: Record<
  InvoiceDisplayStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "danger"
> = {
  draft: "warning",
  pending: "primary",
  due_today: "secondary",
  overdue: "danger",
  paid: "success",
  cancelled: "danger",
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : undefined;

  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const getInvoiceAmount = (invoice: CompanyWithOutward): number =>
  toFiniteNumber(invoice.grand_total) ??
  toFiniteNumber(invoice.total_amount) ??
  toFiniteNumber(invoice.invoice_details?.grand_total) ??
  toFiniteNumber(invoice.invoice_details?.sub_total) ??
  0;

const formatInvoiceAmount = (invoice: CompanyWithOutward) =>
  `Rs. ${amountFormatter.format(getInvoiceAmount(invoice))}`;

const formatDateForTable = (value?: string | null) => formatDateStringForDisplay(value, "N/A");

const getDateSortValue = (value?: string | null) => {
  if (!value) return 0;

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
};

const getBillingDateValue = (invoice: CompanyWithOutward) =>
  invoice.billing_date || invoice.date_of_issue || null;

const getDisplayStatus = (invoice: CompanyWithOutward): InvoiceDisplayStatus =>
  getInvoiceDisplayStatus({
    status: invoice.status,
    display_status: invoice.display_status,
    payment_due_date: invoice.payment_due_date,
  });

const getDaysPending = (invoice: CompanyWithOutward): number | null => {
  const displayStatus = getDisplayStatus(invoice);
  if (!["pending", "due_today", "overdue"].includes(displayStatus)) {
    return null;
  }

  const dueDate = invoice.payment_due_date ? new Date(invoice.payment_due_date) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const days = Math.floor((todayStart - dueStart) / 86_400_000);
  return Math.max(days, 0);
};

const isDraftInvoice = (invoice: CompanyWithOutward) =>
  normalizeInvoiceStatus(invoice.status) === "draft";

const isGeneratedInvoice = (invoice: CompanyWithOutward) =>
  normalizeInvoiceStatus(invoice.status) === "generated";

const isPaidInvoice = (invoice: CompanyWithOutward) =>
  normalizeInvoiceStatus(invoice.status) === "paid";

const isCancelledInvoice = (invoice: CompanyWithOutward) =>
  normalizeInvoiceStatus(invoice.status) === "cancelled";

type InvoiceActionKey =
  | "view"
  | "edit"
  | "generate"
  | "delete"
  | "mark_paid"
  | "cancel"
  | "payment_details"
  | "download_print";

interface InvoiceActionMenuProps {
  invoice: CompanyWithOutward;
  canManageInvoices: boolean;
  onViewInvoice?: (company: CompanyWithOutward) => void;
  onEditInvoice?: (company: CompanyWithOutward) => void;
  onDeleteInvoice?: (company: CompanyWithOutward) => void;
  onGenerateInvoice?: (company: CompanyWithOutward) => void;
  onMarkAsPaid?: (company: CompanyWithOutward) => void;
  onCancelInvoice?: (company: CompanyWithOutward) => void;
  onPaymentDetails?: (company: CompanyWithOutward) => void;
}

function InvoiceActionMenu({
  invoice,
  canManageInvoices,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onGenerateInvoice,
  onMarkAsPaid,
  onCancelInvoice,
  onPaymentDetails,
}: InvoiceActionMenuProps) {
  const draft = isDraftInvoice(invoice);
  const generated = isGeneratedInvoice(invoice);
  const paid = isPaidInvoice(invoice);
  const cancelled = isCancelledInvoice(invoice);

  const actions: Array<{
    key: InvoiceActionKey;
    label: string;
    icon: React.ReactNode;
    color?: "default" | "primary" | "success" | "warning" | "danger";
    className?: string;
  }> = [
    {
      key: "view",
      label: paid ? "View / Print" : "View",
      icon: <EyeIcon className="w-4 h-4" />,
    },
  ];

  if (canManageInvoices && draft) {
    actions.push(
      {
        key: "edit",
        label: "Edit",
        icon: <PencilSquareIcon className="w-4 h-4" />,
      },
      {
        key: "generate",
        label: "Generate Invoice",
        icon: <DocumentCheckIcon className="w-4 h-4" />,
        color: "success",
      },
      {
        key: "delete",
        label: "Delete Draft",
        icon: <TrashIcon className="w-4 h-4" />,
        color: "danger",
        className: "text-danger",
      },
    );
  }

  if (canManageInvoices && generated) {
    actions.push(
      {
        key: "mark_paid",
        label: "Mark as Paid",
        icon: <BanknotesIcon className="w-4 h-4" />,
        color: "success",
      },
      {
        key: "cancel",
        label: "Cancel Invoice",
        icon: <XCircleIcon className="w-4 h-4" />,
        color: "danger",
        className: "text-danger",
      },
      {
        key: "edit",
        label: "Controlled Edit",
        icon: <PencilSquareIcon className="w-4 h-4" />,
        color: "warning",
      },
    );
  }

  if (paid) {
    actions.push(
      {
        key: "payment_details",
        label: "Payment Details",
        icon: <CheckCircleIcon className="w-4 h-4" />,
        color: "success",
      },
      {
        key: "download_print",
        label: "Download / Print",
        icon: <DocumentCheckIcon className="w-4 h-4" />,
      },
    );
  }

  const handleAction = (key: Key) => {
    const actionKey = String(key) as InvoiceActionKey;

    switch (actionKey) {
      case "view":
      case "download_print":
        onViewInvoice?.(invoice);
        break;
      case "edit":
        onEditInvoice?.(invoice);
        break;
      case "generate":
        onGenerateInvoice?.(invoice);
        break;
      case "delete":
        onDeleteInvoice?.(invoice);
        break;
      case "mark_paid":
        onMarkAsPaid?.(invoice);
        break;
      case "cancel":
        onCancelInvoice?.(invoice);
        break;
      case "payment_details":
        onPaymentDetails?.(invoice);
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex justify-center">
      <Dropdown>
        <DropdownTrigger>
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            aria-label={`Actions for ${invoice.invoice_number || "invoice"}`}
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          aria-label={`Invoice actions${cancelled ? " for cancelled invoice" : ""}`}
          onAction={handleAction}
        >
          {actions.map((action) => (
            <DropdownItem
              key={action.key}
              color={action.color}
              className={action.className}
              startContent={action.icon}
            >
              {action.label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

interface InvoiceListTableProps {
  data?: CompanyWithOutward[] | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onViewInvoice?: (company: CompanyWithOutward) => void;
  onEditInvoice?: (company: CompanyWithOutward) => void;
  onDeleteInvoice?: (company: CompanyWithOutward) => void;
  onGenerateInvoice?: (company: CompanyWithOutward) => void;
  onMarkAsPaid?: (company: CompanyWithOutward) => void;
  onCancelInvoice?: (company: CompanyWithOutward) => void;
  onPaymentDetails?: (company: CompanyWithOutward) => void;
  page?: number;
  rowsPerPage?: number;
  totalItems?: number;
  totalPages?: number;
  isServerPagination?: boolean;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  canManageInvoices?: boolean;
  statusFilter?: InvoiceStatusFilter;
  onStatusFilterChange?: (status: InvoiceStatusFilter) => void;
  onSearchValueChange?: (value: string) => void;
}

export default function InvoiceListTable({
  data = [],
  loading = false,
  error = null,
  onRefresh,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onGenerateInvoice,
  onMarkAsPaid,
  onCancelInvoice,
  onPaymentDetails,
  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  totalItems,
  totalPages,
  isServerPagination = false,
  onPageChange: controlledOnPageChange,
  onRowsPerPageChange: controlledOnRowsPerPageChange,
  canManageInvoices = true,
  statusFilter = "all",
  onStatusFilterChange,
  onSearchValueChange,
}: InvoiceListTableProps) {
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState<Selection>(new Set());
  const [visibleColumns, setVisibleColumns] = React.useState<Selection>(
    new Set(INITIAL_VISIBLE_COLUMNS),
  );
  const [localRowsPerPage, setLocalRowsPerPage] = React.useState(10);
  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: "company_name" as Key,
    direction: "ascending",
  });
  const [localPage, setLocalPage] = React.useState(1);

  const rowsPerPage = controlledRowsPerPage ?? localRowsPerPage;
  const page = controlledPage ?? localPage;

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    if (!hasSearchFilter || isServerPagination) return [...items];

    const lower = filterValue.toLowerCase();
    return items.filter((item) => {
      const companyName = (item.client_org || item.company_name || "").toLowerCase();
      const companyId = (item.company_id || "").toLowerCase();
      const invoiceNumber = (item.invoice_number || "").toLowerCase();
      const billingDate = getBillingDateValue(item);
      const rawBillingDate = (billingDate || "").toLowerCase();
      const formattedBillingDate = formatDateForTable(billingDate).toLowerCase();
      const formattedPaymentDueDate = formatDateForTable(item.payment_due_date).toLowerCase();
      const invoiceAmount = formatInvoiceAmount(item).toLowerCase();
      const status = invoiceDisplayStatusLabel[getDisplayStatus(item)].toLowerCase();
      return (
        companyName.includes(lower) ||
        companyId.includes(lower) ||
        invoiceNumber.includes(lower) ||
        rawBillingDate.includes(lower) ||
        formattedBillingDate.includes(lower) ||
        formattedPaymentDueDate.includes(lower) ||
        invoiceAmount.includes(lower) ||
        status.includes(lower)
      );
    });
  }, [data, filterValue, hasSearchFilter, isServerPagination]);

  const pages = isServerPagination
    ? Math.max(totalPages ?? 1, 1)
    : Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);
  const paginationKey = React.useMemo(
    () => `invoice-pagination-${pages}-${rowsPerPage}-${isServerPagination ? "server" : "client"}`,
    [isServerPagination, pages, rowsPerPage],
  );

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
      if (!column || column === "actions" || column === "sr_no") return 0;

      const getSortableValue = (item: CompanyWithOutward) => {
        switch (column) {
          case "company_name":
            return item.client_org || item.company_name || "";
          case "invoice_number":
            return item.invoice_number || "";
          case "billing_date":
            return getDateSortValue(getBillingDateValue(item));
          case "grand_total":
            return getInvoiceAmount(item);
          case "payment_due_date":
            return getDateSortValue(item.payment_due_date);
          case "days_pending":
            return getDaysPending(item) ?? -1;
          case "status":
            return invoiceDisplayStatusLabel[getDisplayStatus(item)];
          case "through":
            return item.outward_id === null ? "invoice" : "outward";
          default:
            return "";
        }
      };

      const firstValue = getSortableValue(a);
      const secondValue = getSortableValue(b);

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return direction === "descending" ? secondValue - firstValue : firstValue - secondValue;
      }

      const first = String(firstValue).toLowerCase();
      const second = String(secondValue).toLowerCase();

      if (first < second) return direction === "descending" ? 1 : -1;
      if (first > second) return direction === "descending" ? -1 : 1;
      return 0;
    });
  }, [items, sortDescriptor]);

  const renderCell = React.useCallback(
    (company: CompanyWithOutward, columnKey: React.Key, index: number) => {
      switch (columnKey) {
        case "sr_no": {
          const srNo = (page - 1) * rowsPerPage + index + 1;
          return <div className="text-[13px] text-center font-medium text-gray-600">{srNo}</div>;
        }
        case "company_name":
          return (
            <div
              className="text-[13px] font-medium truncate max-w-[260px]"
              title={company.client_org || company.company_name || ""}
            >
              {company.client_org || company.company_name || "N/A"}
            </div>
          );
        case "invoice_number":
          return (
            <Chip color="primary" variant="flat">
              {company.invoice_number || "N/A"}
            </Chip>
          );
        case "billing_date":
          return (
            <div className="text-[13px] truncate max-w-[140px]">
              {formatDateForTable(getBillingDateValue(company))}
            </div>
          );
        case "grand_total":
          return (
            <div className="text-[13px] text-right font-semibold text-slate-800 tabular-nums">
              {formatInvoiceAmount(company)}
            </div>
          );
        case "payment_due_date":
          return (
            <div className="text-[13px] truncate max-w-[140px]">
              {formatDateForTable(company.payment_due_date)}
            </div>
          );
        case "days_pending": {
          const daysPending = getDaysPending(company);
          return (
            <div className="text-[13px] text-center tabular-nums text-slate-700">
              {daysPending === null ? "-" : daysPending}
            </div>
          );
        }
        case "status": {
          const displayStatus = getDisplayStatus(company);

          return (
            <Chip
              color={statusColorMap[displayStatus] || "default"}
              variant="flat"
              size="sm"
            >
              {invoiceDisplayStatusLabel[displayStatus]}
            </Chip>
          );
        }
        case "through":
          return (
            <Chip color="primary" variant="flat">
              {company.outward_id === null ? "Invoice" : "Outward"}
            </Chip>
          );
        case "actions":
          return (
            <InvoiceActionMenu
              invoice={company}
              canManageInvoices={canManageInvoices}
              onViewInvoice={onViewInvoice}
              onEditInvoice={onEditInvoice}
              onDeleteInvoice={onDeleteInvoice}
              onGenerateInvoice={onGenerateInvoice}
              onMarkAsPaid={onMarkAsPaid}
              onCancelInvoice={onCancelInvoice}
              onPaymentDetails={onPaymentDetails}
            />
          );
        default:
          return null;
      }
    },
    [
      canManageInvoices,
      onCancelInvoice,
      onDeleteInvoice,
      onEditInvoice,
      onGenerateInvoice,
      onMarkAsPaid,
      onPaymentDetails,
      onViewInvoice,
      page,
      rowsPerPage,
    ],
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
    setFilterValue(nextValue);
    onSearchValueChange?.(nextValue);
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, onSearchValueChange]);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    onSearchValueChange?.("");
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, onSearchValueChange]);

  const onFilterChange = React.useCallback((nextStatus: InvoiceStatusFilter) => {
    onStatusFilterChange?.(nextStatus);
    if (controlledOnPageChange) {
      controlledOnPageChange(1);
    } else {
      setLocalPage(1);
    }
  }, [controlledOnPageChange, onStatusFilterChange]);

  const emptyContent = React.useMemo(() => {
    if (error) {
      return (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-semibold text-red-500">Unable to load invoices</p>
          <p className="text-xs text-default-500">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="bordered" onPress={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      );
    }
    return "No invoices found";
  }, [error, onRefresh]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {invoiceStatusFilterOptions.map((option) => {
            const isActive = statusFilter === option.key;

            return (
              <Button
                key={option.key}
                size="sm"
                variant={isActive ? "solid" : "flat"}
                color={isActive ? "primary" : "default"}
                onPress={() => onFilterChange(option.key)}
                className="h-8 px-3 text-xs font-medium"
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search invoice number or company..."
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
  }, [filterValue, onClear, onFilterChange, onSearchChange, statusFilter, visibleColumns]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="flex items-center justify-between py-3 px-2 gap-4">
        <div className="flex-1">
          <span className="text-small text-default-400">
            {selectedKeys === "all"
              ? "All items selected"
              : `${selectedKeys.size} of ${isServerPagination ? (totalItems ?? filteredItems.length) : filteredItems.length} selected`}
          </span>
        </div>

        <div className="flex flex-1 justify-center">
          <Pagination
            key={paginationKey}
            color="primary"
            isCompact
            showControls
            showShadow
            siblings={1}
            boundaries={1}
            page={page}
            total={pages}
            onChange={(nextPage) => {
              if (controlledOnPageChange) {
                controlledOnPageChange(nextPage);
              } else {
                setLocalPage(nextPage);
              }
            }}
          />
        </div>

        <div className="flex flex-1 justify-end">
          <Select
            label="Rows per page"
            selectedKeys={new Set([String(rowsPerPage)])}
            onSelectionChange={onRowsPerPageChange}
            labelPlacement="outside-left"
            size="sm"
            className="w-[160px]"
          >
            <SelectItem key="10">10</SelectItem>
            <SelectItem key="20">20</SelectItem>
            <SelectItem key="50">50</SelectItem>
            <SelectItem key="100">100</SelectItem>
          </Select>
        </div>
      </div>
    );
  }, [
    controlledOnPageChange,
    filteredItems.length,
    isServerPagination,
    onRowsPerPageChange,
    page,
    pages,
    paginationKey,
    rowsPerPage,
    selectedKeys,
    totalItems,
  ]);

  React.useEffect(() => {
    if (loading) {
      return;
    }

    if (page > pages) {
      if (controlledOnPageChange) {
        controlledOnPageChange(pages);
      } else {
        setLocalPage(pages);
      }
    }
  }, [controlledOnPageChange, loading, page, pages]);

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <Table
          aria-label="Invoice list table"
          isHeaderSticky
          bottomContent={bottomContent}
          bottomContentPlacement="outside"
          classNames={{
            wrapper: "max-h-[calc(100vh-320px)] p-0 overflow-x-auto",
            base: "min-w-full",
            table: "min-w-[1280px]",
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
              <TableColumn
                key={column.uid}
                align={
                  column.uid === "actions" || column.uid === "sr_no" || column.uid === "status"
                    || column.uid === "days_pending"
                    ? "center"
                    : column.uid === "grand_total"
                      ? "end"
                      : "start"
                }
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
            loadingContent={
              <div className="py-8 flex justify-center items-center text-sm text-default-500">
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </div>
            }
          >
            {(item) => {
              const index = sortedItems.findIndex(
                (invoice) =>
                  (invoice.invoice_id || invoice.id || `${invoice.company_id}-${invoice.outward_id ?? "no-outward"}`) ===
                  (item.invoice_id || item.id || `${item.company_id}-${item.outward_id ?? "no-outward"}`),
              );

              return (
                <TableRow
                  key={
                    item.invoice_id ||
                    item.id ||
                    `${item.company_id}-${item.outward_id ?? "no-outward"}`
                  }
                >
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
