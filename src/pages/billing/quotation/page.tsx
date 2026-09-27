import React, { useCallback, useMemo, useState } from 'react';
import {
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DeleteConfirmModal } from '../../../components/common/DeleteConfirmModal';
import { TablePageWrapper } from '../../../components/layout/TablePageWrapper';
import { Button } from '../../../components/ui/button';
import { usePermissionAccess } from '../../../features/auth';
import {
  useDeleteQuotationMutation,
  useCreateQuotationRevisionMutation,
  useQuotationsQuery,
  type QuotationListQueryData,
} from '../../../hooks/queries/quotations';
import { toApiPage } from '../../../utils/paginatedResponse';

const formatDate = (value?: string) => {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-GB');
};

const formatMoney = (value?: number) => `${(value || 0).toFixed(2)}`;

const QuotationPage = React.memo(() => {
  const navigate = useNavigate();
  const { canEdit } = usePermissionAccess();
  const canManageQuotations = canEdit('invoice');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] =
    useState<QuotationListQueryData['quotations'][number] | null>(null);
  const quotationQuery = useQuotationsQuery({
    page: toApiPage(page),
    limit: rowsPerPage,
  });
  const deleteQuotationMutation = useDeleteQuotationMutation();
  const createRevisionMutation = useCreateQuotationRevisionMutation();

  const quotations = quotationQuery.data?.quotations ?? [];
  const totalItems = quotationQuery.data?.total ?? 0;
  const totalPages = useMemo(
    () =>
      quotationQuery.data?.totalPages ??
      Math.max(Math.ceil(totalItems / Math.max(rowsPerPage, 1)), 1),
    [quotationQuery.data?.totalPages, rowsPerPage, totalItems],
  );

  const handleRefresh = useCallback(() => {
    void quotationQuery.refetch();
    toast.success('Quotation list refreshed');
  }, [quotationQuery]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) {
      return;
    }

    await deleteQuotationMutation.mutateAsync(deleteTarget.id);

    if (quotations.length === 1 && page > 1) {
      setPage((currentPage) => Math.max(currentPage - 1, 1));
    }

    setDeleteTarget(null);
  };

  const handleCreateRevision = async (quotation: QuotationListQueryData['quotations'][number]) => {
    const reason = window.prompt('Revision reason (optional):') ?? '';
    const revision = await createRevisionMutation.mutateAsync({ quotationId: quotation.id, reason });
    navigate(`/billing/quotation/${revision.id}/edit`);
  };

  if (quotationQuery.error) {
    return (
      <TablePageWrapper
        title="Quotation Management"
        description="Browse saved quotations from the backend and open the create screen when needed."
        compact
        actions={
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <div className="p-8 text-center">
          <p className="mb-4 text-red-600">
            {(quotationQuery.error as Error).message}
          </p>
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
        title="Quotation Management"
        description="View saved quotations, open a draft for editing, or create a new quotation."
        compact
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/billing/quotation/create')}
              className="flex items-center gap-2 bg-blue-600 text-white"
              disabled={!canManageQuotations}
            >
              <PlusIcon className="h-4 w-4" />
              Create Quotation
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              disabled={quotationQuery.isLoading || quotationQuery.isFetching}
            >
              <ArrowPathIcon
                className={`h-4 w-4 ${
                  quotationQuery.isLoading || quotationQuery.isFetching
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Quotation No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">From Firm</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {quotationQuery.isLoading || quotationQuery.isFetching ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No quotations found. Create your first quotation to get started.
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr
                      key={quotation.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {quotation.quotation_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(quotation.quotation_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {quotation.client_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {quotation.billing_firm_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatMoney(quotation.grand_total)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium capitalize text-amber-700">
                          {quotation.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/billing/quotation/${quotation.id}/edit`)
                            }
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                            title="Open quotation"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/billing/quotation/${quotation.id}/edit`)
                            }
                            disabled={!canManageQuotations}
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Edit quotation"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          {quotation.status !== 'draft' && quotation.status !== 'superseded' && (
                            <button
                              type="button"
                              onClick={() => void handleCreateRevision(quotation)}
                              disabled={!canManageQuotations || createRevisionMutation.isPending}
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Create revision"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(quotation)}
                            disabled={!canManageQuotations}
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Delete quotation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              Showing {quotations.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to{' '}
              {Math.min(page * rowsPerPage, totalItems)} of {totalItems} quotations
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span>Rows</span>
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                >
                  {[10, 25, 50].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                  disabled={page <= 1 || quotationQuery.isFetching}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {Math.max(totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((currentPage) =>
                      Math.min(currentPage + 1, Math.max(totalPages, 1)),
                    )
                  }
                  disabled={page >= totalPages || quotationQuery.isFetching}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </TablePageWrapper>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (deleteQuotationMutation.isPending) {
            return;
          }

          setDeleteTarget(null);
        }}
        title="Delete quotation"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">
              {deleteTarget?.quotation_number || 'this quotation'}
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        isConfirmLoading={deleteQuotationMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
});

QuotationPage.displayName = 'QuotationPage';

export default QuotationPage;
