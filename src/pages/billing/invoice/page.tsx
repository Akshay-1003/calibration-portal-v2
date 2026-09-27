import React, { useCallback, useMemo, useState } from 'react';
import {
  Button as HeroButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
} from '@heroui-v2/react';
import { TablePageWrapper } from '../../../components/layout/TablePageWrapper';
import { Button } from '../../../components/ui/button';
import type { CompanyWithOutward } from '../../../store/invoiceStore';
import { ArrowPathIcon, PlusIcon } from '@heroicons/react/24/outline';
import { InvoicePreviewModal } from '../../../components/billing/InvoicePreviewModal';
import { DeleteConfirmModal } from '../../../components/common/DeleteConfirmModal';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  type InvoiceSummary,
  type MarkInvoicePaidPayload,
  useCancelInvoiceMutation,
  useDeleteInvoiceMutation,
  useGenerateInvoiceMutation,
  useInvoiceCompaniesQuery,
  useMarkInvoicePaidMutation,
} from '../../../hooks/queries/invoices';
import InvoiceListTable from '../../../components/Tables/InvoiceListTable';
import { usePermissionAccess } from '../../../features/auth';
import {
  getInvoiceDisplayStatus,
  invoiceDisplayStatusLabel,
  normalizeInvoiceStatus,
  type InvoiceStatusFilter,
} from '../../../utils/invoiceLifecycle';
import { formatDateStringForDisplay, getCurrentIsoDate } from '../../../utils/dateAdapter';

const amountFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const paymentModes: MarkInvoicePaidPayload['payment_mode'][] = [
  'NEFT',
  'RTGS',
  'UPI',
  'Cheque',
  'Cash',
];

const getInvoiceId = (invoice?: CompanyWithOutward | null) => invoice?.invoice_id || invoice?.id || '';

const toFiniteNumber = (value: unknown): number | undefined => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : undefined;

  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const getInvoiceAmount = (invoice?: CompanyWithOutward | null): number =>
  invoice
    ? toFiniteNumber(invoice.grand_total) ??
      toFiniteNumber(invoice.total_amount) ??
      toFiniteNumber(invoice.invoice_details?.grand_total) ??
      toFiniteNumber(invoice.invoice_details?.sub_total) ??
      0
    : 0;

const formatAmount = (amount: number) => amountFormatter.format(amount);

const formatDate = (value?: string | null) => formatDateStringForDisplay(value, 'N/A');

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const calculateVisibleSummary = (invoices: CompanyWithOutward[]): InvoiceSummary => {
  return invoices.reduce<InvoiceSummary>(
    (summary, invoice) => {
      const amount = getInvoiceAmount(invoice);
      const displayStatus = getInvoiceDisplayStatus(invoice);

      summary.total_invoice_value += amount;
      if (displayStatus === 'paid') {
        summary.collected_amount += amount;
      } else if (displayStatus === 'overdue') {
        summary.overdue_amount += amount;
      } else if (displayStatus === 'pending' || displayStatus === 'due_today') {
        summary.pending_amount += amount;
      }

      return summary;
    },
    {
      total_invoice_value: 0,
      collected_amount: 0,
      pending_amount: 0,
      overdue_amount: 0,
    },
  );
};

const hasSummaryValue = (summary?: InvoiceSummary) =>
  Boolean(
    summary &&
      (
        summary.total_invoice_value ||
        summary.collected_amount ||
        summary.pending_amount ||
        summary.overdue_amount
      ),
  );

function InvoiceSummaryCards({ summary }: { summary: InvoiceSummary }) {
  const cards = [
    {
      label: 'Total Invoice Value',
      value: summary.total_invoice_value,
      className: 'border-slate-200 bg-white',
    },
    {
      label: 'Collected Amount',
      value: summary.collected_amount,
      className: 'border-emerald-200 bg-emerald-50',
    },
    {
      label: 'Pending Amount',
      value: summary.pending_amount,
      className: 'border-amber-200 bg-amber-50',
    },
    {
      label: 'Overdue Amount',
      value: summary.overdue_amount,
      className: 'border-red-200 bg-red-50',
    },
  ];

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-lg border p-4 ${card.className}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {formatAmount(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

const monthOptions = [
  { key: 'all', label: 'All Months' },
  { key: '1', label: 'January' },
  { key: '2', label: 'February' },
  { key: '3', label: 'March' },
  { key: '4', label: 'April' },
  { key: '5', label: 'May' },
  { key: '6', label: 'June' },
  { key: '7', label: 'July' },
  { key: '8', label: 'August' },
  { key: '9', label: 'September' },
  { key: '10', label: 'October' },
  { key: '11', label: 'November' },
  { key: '12', label: 'December' },
];

const buildYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return [
    { key: 'all', label: 'All Years' },
    ...Array.from({ length: 8 }, (_, index) => {
      const year = String(currentYear + 1 - index);
      return { key: year, label: year };
    }),
  ];
};

interface InvoiceManagementFiltersProps {
  companyName: string;
  billingMonth: string;
  billingYear: string;
  onCompanyNameChange: (value: string) => void;
  onBillingMonthChange: (value: string) => void;
  onBillingYearChange: (value: string) => void;
  onClear: () => void;
}

function InvoiceManagementFilters({
  companyName,
  billingMonth,
  billingYear,
  onCompanyNameChange,
  onBillingMonthChange,
  onBillingYearChange,
  onClear,
}: InvoiceManagementFiltersProps) {
  const yearOptions = useMemo(buildYearOptions, []);
  const hasActiveFilter = Boolean(companyName.trim()) || billingMonth !== 'all' || billingYear !== 'all';

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_180px_160px_auto] md:items-end">
        <Input
          size="sm"
          label="Company Name"
          labelPlacement="outside"
          placeholder="Filter company..."
          value={companyName}
          onValueChange={onCompanyNameChange}
        />
        <Select
          size="sm"
          label="Month"
          labelPlacement="outside"
          selectedKeys={new Set([billingMonth])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            onBillingMonthChange(selected ? String(selected) : 'all');
          }}
        >
          {monthOptions.map((option) => (
            <SelectItem key={option.key} textValue={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
        <Select
          size="sm"
          label="Year"
          labelPlacement="outside"
          selectedKeys={new Set([billingYear])}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            onBillingYearChange(selected ? String(selected) : 'all');
          }}
        >
          {yearOptions.map((option) => (
            <SelectItem key={option.key} textValue={option.label}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
        <HeroButton
          size="sm"
          variant="flat"
          onPress={onClear}
          isDisabled={!hasActiveFilter}
          className="h-9 px-4 font-medium"
        >
          Clear
        </HeroButton>
      </div>
    </div>
  );
}

interface PaymentRecordModalProps {
  invoice: CompanyWithOutward | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: MarkInvoicePaidPayload) => Promise<void>;
}

function PaymentRecordModal({
  invoice,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: PaymentRecordModalProps) {
  const [paymentDate, setPaymentDate] = useState(getCurrentIsoDate);
  const [paymentMode, setPaymentMode] = useState<MarkInvoicePaidPayload['payment_mode']>('NEFT');
  const [paymentReferenceNo, setPaymentReferenceNo] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;

    setPaymentDate(getCurrentIsoDate());
    setPaymentMode('NEFT');
    setPaymentReferenceNo('');
    setPaymentRemarks('');
  }, [invoice, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await onSubmit({
      payment_date: paymentDate,
      payment_mode: paymentMode,
      payment_reference_no: paymentReferenceNo.trim() || null,
      payment_remarks: paymentRemarks.trim() || null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1">Mark Invoice as Paid</ModalHeader>
            <ModalBody className="grid gap-4 pb-2 sm:grid-cols-2">
              <Input
                label="Invoice Number"
                value={invoice?.invoice_number || 'N/A'}
                isReadOnly
              />
              <Input
                label="Customer"
                value={invoice?.client_org || invoice?.company_name || 'N/A'}
                isReadOnly
              />
              <Input
                label="Amount"
                value={formatAmount(getInvoiceAmount(invoice))}
                isReadOnly
              />
              <Input
                label="Payment Date"
                type="date"
                value={paymentDate}
                isRequired
                isDisabled={isSubmitting}
                onChange={(event) => setPaymentDate(event.target.value)}
              />
              <Select
                label="Payment Mode"
                selectedKeys={new Set([paymentMode])}
                isRequired
                isDisabled={isSubmitting}
                onSelectionChange={(keys) => {
                  const selectedMode = Array.from(keys)[0] as MarkInvoicePaidPayload['payment_mode'] | undefined;
                  if (selectedMode) {
                    setPaymentMode(selectedMode);
                  }
                }}
              >
                {paymentModes.map((mode) => (
                  <SelectItem key={mode} textValue={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </Select>
              <Input
                label="Reference / UTR"
                value={paymentReferenceNo}
                isDisabled={isSubmitting}
                onValueChange={setPaymentReferenceNo}
              />
              <Textarea
                label="Remarks"
                value={paymentRemarks}
                isDisabled={isSubmitting}
                onValueChange={setPaymentRemarks}
                className="sm:col-span-2"
              />
            </ModalBody>
            <ModalFooter>
              <HeroButton variant="flat" onPress={onClose} isDisabled={isSubmitting}>
                Cancel
              </HeroButton>
              <HeroButton color="success" type="submit" isLoading={isSubmitting}>
                Mark as Paid
              </HeroButton>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}

function PaymentDetailsModal({
  invoice,
  isOpen,
  onClose,
}: {
  invoice: CompanyWithOutward | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const displayStatus = invoice ? getInvoiceDisplayStatus(invoice) : 'paid';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">Payment Details</ModalHeader>
            <ModalBody className="grid gap-3 pb-2 sm:grid-cols-2">
              <DetailField label="Invoice Number" value={invoice?.invoice_number || 'N/A'} />
              <DetailField label="Customer" value={invoice?.client_org || invoice?.company_name || 'N/A'} />
              <DetailField label="Amount" value={formatAmount(getInvoiceAmount(invoice))} />
              <DetailField label="Status" value={invoiceDisplayStatusLabel[displayStatus]} />
              <DetailField label="Payment Date" value={formatDate(invoice?.payment_date)} />
              <DetailField label="Payment Mode" value={invoice?.payment_mode || 'N/A'} />
              <DetailField label="Reference / UTR" value={invoice?.payment_reference_no || 'N/A'} />
              <DetailField label="Remarks" value={invoice?.payment_remarks || 'N/A'} className="sm:col-span-2" />
            </ModalBody>
            <ModalFooter>
              <HeroButton color="primary" onPress={onClose}>
                Close
              </HeroButton>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function DetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2 ${className}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 min-h-5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const InvoicePage = React.memo(() => {
  const { canEdit } = usePermissionAccess();
  const canManageInvoices = canEdit('invoice');
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatusFilter>('all');
  const [searchValue, setSearchValue] = useState('');
  const [companyNameFilter, setCompanyNameFilter] = useState('');
  const [billingMonthFilter, setBillingMonthFilter] = useState('all');
  const [billingYearFilter, setBillingYearFilter] = useState('all');
  const {
    data: invoiceResponse,
    isLoading: loadingCompanies,
    isFetching,
    error,
    refetch,
  } = useInvoiceCompaniesQuery({
    page: Math.max(page - 1, 0),
    limit: rowsPerPage,
    statusFilter,
    search: searchValue,
    companyName: companyNameFilter,
    billingMonth: billingMonthFilter,
    billingYear: billingYearFilter,
  });
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyWithOutward | null>(null);
  const [generateTarget, setGenerateTarget] = useState<CompanyWithOutward | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<CompanyWithOutward | null>(null);
  const [paymentDetailsTarget, setPaymentDetailsTarget] = useState<CompanyWithOutward | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CompanyWithOutward | null>(null);
  const deleteInvoiceMutation = useDeleteInvoiceMutation();
  const generateInvoiceMutation = useGenerateInvoiceMutation();
  const markInvoicePaidMutation = useMarkInvoicePaidMutation();
  const cancelInvoiceMutation = useCancelInvoiceMutation();

  const companies = invoiceResponse?.data ?? [];
  const totalItems = invoiceResponse?.total ?? 0;
  const totalPages = invoiceResponse?.totalPages ?? Math.max(Math.ceil(totalItems / Math.max(rowsPerPage, 1)), 1);
  const summary = useMemo(() => {
    const visibleSummary = calculateVisibleSummary(companies);
    const backendSummary = invoiceResponse?.summary;

    if (backendSummary && (hasSummaryValue(backendSummary) || !hasSummaryValue(visibleSummary))) {
      return backendSummary;
    }

    return visibleSummary;
  }, [companies, invoiceResponse?.summary]);
  const handleViewInvoice = (company: CompanyWithOutward) => {
    const invoiceId = company.invoice_id || company.id;
    if (!invoiceId) {
      toast.error('Invoice ID not found');
      return;
    }
    setSelectedInvoiceId(invoiceId);
    setIsPreviewModalOpen(true);
  };

  const handlePreviewModalClose = () => {
    setIsPreviewModalOpen(false);
    setSelectedInvoiceId(null);
  };

  const handleEditInvoice = (company: CompanyWithOutward) => {
    const invoiceId = company.invoice_id || company.id;
    if (!invoiceId) {
      toast.error('Invoice ID not found');
      return;
    }
    navigate(`/billing/invoice/${invoiceId}/edit`);
  };

  const handleDeleteInvoice = (company: CompanyWithOutward) => {
    const invoiceId = company.invoice_id || company.id;
    if (!invoiceId) {
      toast.error('Invoice ID not found');
      return;
    }

    if (normalizeInvoiceStatus(company.status) !== 'draft') {
      toast.error('Only draft invoices can be deleted. Use Cancel Invoice for generated invoices.');
      return;
    }

    setDeleteTarget(company);
  };

  const handleDeleteModalClose = () => {
    if (deleteInvoiceMutation.isPending) {
      return;
    }

    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    const invoiceId = deleteTarget?.invoice_id || deleteTarget?.id;
    if (!invoiceId) {
      throw new Error('Invoice ID not found');
    }

    try {
      await deleteInvoiceMutation.mutateAsync(invoiceId);

      if (companies.length === 1 && page > 1) {
        setPage((currentPage) => Math.max(currentPage - 1, 1));
      }

      toast.success('Draft invoice deleted successfully');
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete invoice'));
      throw deleteError;
    }
  };

  const handleGenerateInvoice = (company: CompanyWithOutward) => {
    if (!getInvoiceId(company)) {
      toast.error('Invoice ID not found');
      return;
    }

    if (normalizeInvoiceStatus(company.status) !== 'draft') {
      toast.error('Only draft invoices can be generated');
      return;
    }

    setGenerateTarget(company);
  };

  const handleGenerateModalClose = () => {
    if (generateInvoiceMutation.isPending) return;
    setGenerateTarget(null);
  };

  const handleGenerateConfirm = async () => {
    const invoiceId = getInvoiceId(generateTarget);
    if (!invoiceId) {
      throw new Error('Invoice ID not found');
    }

    try {
      await generateInvoiceMutation.mutateAsync(invoiceId);
      toast.success('Invoice generated successfully');
    } catch (generateError) {
      toast.error(getErrorMessage(generateError, 'Failed to generate invoice'));
      throw generateError;
    }
  };

  const handleMarkAsPaid = (company: CompanyWithOutward) => {
    if (!getInvoiceId(company)) {
      toast.error('Invoice ID not found');
      return;
    }

    if (normalizeInvoiceStatus(company.status) !== 'generated') {
      toast.error('Only generated invoices can be marked as paid');
      return;
    }

    setPaymentTarget(company);
  };

  const handlePaymentModalClose = () => {
    if (markInvoicePaidMutation.isPending) return;
    setPaymentTarget(null);
  };

  const handlePaymentSubmit = async (payload: MarkInvoicePaidPayload) => {
    const invoiceId = getInvoiceId(paymentTarget);
    if (!invoiceId) {
      throw new Error('Invoice ID not found');
    }

    try {
      await markInvoicePaidMutation.mutateAsync({
        invoiceId,
        data: payload,
      });
      setPaymentTarget(null);
      toast.success('Invoice marked as paid');
    } catch (paymentError) {
      toast.error(getErrorMessage(paymentError, 'Failed to mark invoice as paid'));
      throw paymentError;
    }
  };

  const handleCancelInvoice = (company: CompanyWithOutward) => {
    if (!getInvoiceId(company)) {
      toast.error('Invoice ID not found');
      return;
    }

    if (normalizeInvoiceStatus(company.status) !== 'generated') {
      toast.error('Only generated invoices can be cancelled');
      return;
    }

    setCancelTarget(company);
  };

  const handleCancelModalClose = () => {
    if (cancelInvoiceMutation.isPending) return;
    setCancelTarget(null);
  };

  const handleCancelConfirm = async () => {
    const invoiceId = getInvoiceId(cancelTarget);
    if (!invoiceId) {
      throw new Error('Invoice ID not found');
    }

    try {
      await cancelInvoiceMutation.mutateAsync({
        invoiceId,
        remarks: 'Cancelled from invoice lifecycle management',
      });
      toast.success('Invoice cancelled successfully');
    } catch (cancelError) {
      toast.error(getErrorMessage(cancelError, 'Failed to cancel invoice'));
      throw cancelError;
    }
  };

  const handleRefresh = useCallback(() => {
    void refetch();
    toast.success('Companies list refreshed');
  }, [refetch]);

  const handleStatusFilterChange = useCallback((nextStatus: InvoiceStatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
  }, []);

  const handleSearchValueChange = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const handleCompanyNameFilterChange = useCallback((value: string) => {
    setCompanyNameFilter(value);
    setPage(1);
  }, []);

  const handleBillingMonthFilterChange = useCallback((value: string) => {
    setBillingMonthFilter(value);
    setPage(1);
  }, []);

  const handleBillingYearFilterChange = useCallback((value: string) => {
    setBillingYearFilter(value);
    setPage(1);
  }, []);

  const handleClearInvoiceFilters = useCallback(() => {
    setCompanyNameFilter('');
    setBillingMonthFilter('all');
    setBillingYearFilter('all');
    setPage(1);
  }, []);

  if (error) {
    return (
      <TablePageWrapper
        title="Invoice Management"
        description="Create and manage invoices based on outward entries"
        actions={
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </Button>
        }
      >
        <div className="p-8 text-center">
          <p className="text-red-600 mb-4">{(error as Error).message}</p>
          <Button onClick={handleRefresh} variant="outline">
            Retry
          </Button>
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <div className="space-y-6">
      <TablePageWrapper
        title="Invoice Management"
        description="Create and manage invoices based on outward entries"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/billing/invoice/create')}
              className="bg-blue-600 text-white flex items-center gap-2"
              disabled={!canManageInvoices}
            >
              <PlusIcon className="w-4 h-4" />
              Create Invoice
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loadingCompanies || isFetching}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loadingCompanies || isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="w-full p-2">
          <InvoiceManagementFilters
            companyName={companyNameFilter}
            billingMonth={billingMonthFilter}
            billingYear={billingYearFilter}
            onCompanyNameChange={handleCompanyNameFilterChange}
            onBillingMonthChange={handleBillingMonthFilterChange}
            onBillingYearChange={handleBillingYearFilterChange}
            onClear={handleClearInvoiceFilters}
          />
          <InvoiceSummaryCards summary={summary} />
          <InvoiceListTable
            data={companies}
            loading={loadingCompanies || isFetching}
            error={error ? (error as Error).message : null}
            onRefresh={handleRefresh}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onGenerateInvoice={handleGenerateInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onCancelInvoice={handleCancelInvoice}
            onPaymentDetails={setPaymentDetailsTarget}
            page={page}
            rowsPerPage={rowsPerPage}
            totalItems={totalItems}
            totalPages={totalPages}
            isServerPagination
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            canManageInvoices={canManageInvoices}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onSearchValueChange={handleSearchValueChange}
          />
        </div>
      </TablePageWrapper>

      {selectedInvoiceId && (
        <InvoicePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={handlePreviewModalClose}
          invoiceId={selectedInvoiceId}
        />
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={handleDeleteModalClose}
        title="Delete invoice"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {deleteTarget?.invoice_number || 'this invoice'}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        isConfirmLoading={deleteInvoiceMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />

      <DeleteConfirmModal
        isOpen={Boolean(generateTarget)}
        onClose={handleGenerateModalClose}
        title="Generate invoice"
        message={
          <>
            Generate{' '}
            <span className="font-semibold text-gray-900">
              {generateTarget?.invoice_number || 'this draft invoice'}
            </span>
            ? After generation, core billing fields and totals will be locked.
          </>
        }
        confirmText="Generate"
        confirmColor="success"
        isConfirmLoading={generateInvoiceMutation.isPending}
        onConfirm={handleGenerateConfirm}
      />

      <PaymentRecordModal
        invoice={paymentTarget}
        isOpen={Boolean(paymentTarget)}
        isSubmitting={markInvoicePaidMutation.isPending}
        onClose={handlePaymentModalClose}
        onSubmit={handlePaymentSubmit}
      />

      <PaymentDetailsModal
        invoice={paymentDetailsTarget}
        isOpen={Boolean(paymentDetailsTarget)}
        onClose={() => setPaymentDetailsTarget(null)}
      />

      <DeleteConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={handleCancelModalClose}
        title="Cancel invoice"
        message={
          <>
            Cancel{' '}
            <span className="font-semibold text-gray-900">
              {cancelTarget?.invoice_number || 'this generated invoice'}
            </span>
            ? The invoice number and history will be preserved.
          </>
        }
        confirmText="Cancel Invoice"
        isConfirmLoading={cancelInvoiceMutation.isPending}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
});

InvoicePage.displayName = 'InvoicePage';

export default InvoicePage;
