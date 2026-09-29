import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Input,
  Modal,
  Pagination,
  Table,
} from '@heroui/react';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
import { getTableColumnKey } from '../../components/Tables/tableColumnKey';
import { AccountDetailsForm } from '../../components/settings/AccountDetailsForm';
import {
  useAccountDetailsQuery,
  useCreateAccountDetailMutation,
  useDeleteAccountDetailMutation,
  useUpdateAccountDetailMutation,
} from '../../hooks/queries/accountDetails';
import type { AccountDetail } from '../../types/accountDetails';
import type { AccountDetailFormData } from '../../lib/validations/accountDetailsSchemas';
import { usePermissionAccess } from '../../features/auth';
import { UnauthorizedPage } from '../../features/auth/components/UnauthorizedPage';
import { settingsAdministrationRoles } from '../../config/access-control';
import '../../styles/industrial-table.css';

const columns = [
  { key: 'firm_name', label: 'Firm Name' },
  { key: 'type', label: 'Type' },
  { key: 'contact', label: 'Contact' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
] as const;

const ROWS_PER_PAGE = 8;

const typeColorMap: Record<string, 'accent' | 'default' | 'success' | 'warning'> = {
  'Calibration Lab': 'accent',
  Trading: 'default',
  Sales: 'success',
  Service: 'warning',
};

export const SettingsAccounts = () => {
  const { hasRole } = usePermissionAccess();
  const canManageAccounts = settingsAdministrationRoles.some((role) => hasRole(role));
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountDetail | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const accountDetailsQuery = useAccountDetailsQuery();
  const createMutation = useCreateAccountDetailMutation();
  const updateMutation = useUpdateAccountDetailMutation();
  const deleteMutation = useDeleteAccountDetailMutation();

  const accountDetails = accountDetailsQuery.data?.accountDetails ?? [];

  const filteredAccounts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return accountDetails;

    return accountDetails.filter((account) =>
      [
        account.firm_name,
        account.type,
        account.contact_no,
        account.email,
        account.bank_details.bank_name,
        account.bank_details.account_no,
        account.bank_details.ifsc,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [accountDetails, searchValue]);

  const totalPages = Math.max(Math.ceil(filteredAccounts.length / ROWS_PER_PAGE), 1);
  const paginatedAccounts = filteredAccounts.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  if (!canManageAccounts) {
    return <UnauthorizedPage />;
  }

  const handleCreate = async (data: AccountDetailFormData) => {
    await createMutation.mutateAsync(data);
    setCreateModalOpen(false);
  };

  const handleEdit = async (data: AccountDetailFormData) => {
    if (!selectedAccount) return;
    await updateMutation.mutateAsync({ id: selectedAccount.id, data });
    setEditModalOpen(false);
    setSelectedAccount(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const openEditModal = (account: AccountDetail) => {
    setSelectedAccount(account);
    setEditModalOpen(true);
  };

  const renderCell = (account: AccountDetail, columnKey: string) => {
    switch (columnKey) {
      case 'firm_name':
        return (
          <div>
            <p className="font-semibold text-slate-900">{account.firm_name}</p>
            <p className="text-xs text-slate-500">{account.email || account.website || '-'}</p>
          </div>
        );
      case 'type':
        return (
          <Chip
            size="sm"
            variant="soft"
            color={typeColorMap[account.type] || 'secondary'}
          >
            {account.type || '-'}
          </Chip>
        );
      case 'contact':
        return (
          <div className="text-sm text-slate-700">
            <div>{account.contact_no || '-'}</div>
            <div className="text-xs text-slate-500">{account.address || '-'}</div>
          </div>
        );
      case 'bank':
        return (
          <div className="text-sm text-slate-700">
            <div className="font-medium">{account.bank_details.bank_name || '-'}</div>
            <div className="text-xs text-slate-500">
              A/C: {account.bank_details.account_no || '-'} | IFSC: {account.bank_details.ifsc || '-'}
            </div>
          </div>
        );
      case 'status':
        return (
          <Chip size="sm" variant="soft" color={account.is_active ? 'success' : 'default'}>
            {account.is_active ? 'Active' : 'Inactive'}
          </Chip>
        );
      case 'actions':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              onPress={() => openEditModal(account)}
              isDisabled={!canManageAccounts}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="danger-soft"
              isIconOnly
              onPress={() => setDeleteTarget(account)}
              isDisabled={!canManageAccounts}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-slate-600">
            Manage sender firms and bank details used in invoice and quotation flows.
          </p>
        </div>
        <Button
          variant="primary"
          onPress={() => setCreateModalOpen(true)}
          isDisabled={!canManageAccounts}
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Account Details</span>
        </Button>
      </div>

      <Card>
        <Card.Content>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="relative max-w-xl w-full">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
              placeholder="Search firm, bank, IFSC, email..."
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setPage(1);
              }}
              className="pl-9"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{filteredAccounts.length}</span> firms available
            </div>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content className="p-0">
          <div className="industrial-table-wrapper">
          <Table aria-label="Account details table">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header columns={columns}>
                  {(column) => <Table.Column id={column.key} isRowHeader={column.key === columns[0]?.key}>{column.label}</Table.Column>}
                </Table.Header>
                <Table.Body
                  items={paginatedAccounts}
                  renderEmptyState={() => (
                    <div className="py-10 text-center text-sm text-slate-500">
                      {accountDetailsQuery.isLoading || accountDetailsQuery.isFetching
                        ? 'Loading account details...'
                        : 'No account details found'}
                    </div>
                  )}
                >
                  {(item) => (
                    <Table.Row id={item.id} columns={columns}>
                      {(columnKey) => (
                        <Table.Cell>{renderCell(item, getTableColumnKey(columnKey))}</Table.Cell>
                      )}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center p-4">
              <Pagination aria-label="Account details pagination">
                <Pagination.Content>
                  <Pagination.Previous isDisabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))}>
                    <Pagination.PreviousIcon />
                  </Pagination.Previous>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <Pagination.Item key={pageNumber}>
                      <Pagination.Link isActive={pageNumber === page} onPress={() => setPage(pageNumber)}>
                        {pageNumber}
                      </Pagination.Link>
                    </Pagination.Item>
                  ))}
                  <Pagination.Next isDisabled={page >= totalPages} onPress={() => setPage((current) => Math.min(totalPages, current + 1))}>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </Card.Content>
      </Card>

      <Modal.Root isOpen={createModalOpen} onOpenChange={(open) => { if (!open) setCreateModalOpen(false); }}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading><BanknotesIcon className="mr-2 inline h-5 w-5 text-primary" />Create Account Details</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="pb-6">
                <AccountDetailsForm onSubmit={handleCreate} onClose={() => setCreateModalOpen(false)} isLoading={createMutation.isPending} />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <Modal.Root isOpen={editModalOpen} onOpenChange={(open) => { if (!open) setEditModalOpen(false); }}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading><BanknotesIcon className="mr-2 inline h-5 w-5 text-primary" />Edit Account Details</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="pb-6">
                {selectedAccount && (
                  <AccountDetailsForm
                    initialData={selectedAccount}
                    onSubmit={handleEdit}
                    onClose={() => { setEditModalOpen(false); setSelectedAccount(null); }}
                    isLoading={updateMutation.isPending}
                  />
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete account details"
        message={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">
              {deleteTarget?.firm_name || 'this firm'}
            </span>
            ? This will remove it from invoice and quotation firm selection.
          </>
        }
        confirmText="Delete"
        isConfirmLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};
