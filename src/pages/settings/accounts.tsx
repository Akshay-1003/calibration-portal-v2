import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@heroui-v2/react';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { DeleteConfirmModal } from '../../components/common/DeleteConfirmModal';
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

const columns = [
  { key: 'firm_name', label: 'Firm Name' },
  { key: 'type', label: 'Type' },
  { key: 'contact', label: 'Contact' },
  { key: 'bank', label: 'Bank Details' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
] as const;

const ROWS_PER_PAGE = 8;

const typeColorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  'Calibration Lab': 'primary',
  Trading: 'secondary',
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

  const createModal = useDisclosure();
  const editModal = useDisclosure();

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
    createModal.onClose();
  };

  const handleEdit = async (data: AccountDetailFormData) => {
    if (!selectedAccount) return;
    await updateMutation.mutateAsync({ id: selectedAccount.id, data });
    editModal.onClose();
    setSelectedAccount(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const openEditModal = (account: AccountDetail) => {
    setSelectedAccount(account);
    editModal.onOpen();
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
            variant="flat"
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
          <Chip size="sm" variant="flat" color={account.is_active ? 'success' : 'default'}>
            {account.is_active ? 'Active' : 'Inactive'}
          </Chip>
        );
      case 'actions':
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="light"
              isIconOnly
              onPress={() => openEditModal(account)}
              isDisabled={!canManageAccounts}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
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
          color="primary"
          startContent={<PlusIcon className="h-4 w-4" />}
          onPress={createModal.onOpen}
          isDisabled={!canManageAccounts}
        >
          Add Account Details
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <Input
              placeholder="Search firm, bank, IFSC, email..."
              startContent={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
              value={searchValue}
              onValueChange={(value) => {
                setSearchValue(value);
                setPage(1);
              }}
              className="max-w-xl"
            />

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{filteredAccounts.length}</span> firms available
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table aria-label="Account details table">
            <TableHeader columns={columns}>
              {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={paginatedAccounts}
              isLoading={accountDetailsQuery.isLoading || accountDetailsQuery.isFetching}
              emptyContent="No account details found"
            >
              {(item: AccountDetail) => (
                <TableRow key={item.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey as string)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-center p-4">
              <Pagination page={page} total={totalPages} onChange={setPage} />
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={createModal.isOpen} onOpenChange={createModal.onOpenChange} size="4xl">
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-primary" />
                Create Account Details
              </ModalHeader>
              <ModalBody className="pb-6">
                <AccountDetailsForm
                  onSubmit={handleCreate}
                  onClose={createModal.onClose}
                  isLoading={createMutation.isPending}
                />
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange} size="4xl">
        <ModalContent>
          {() => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-primary" />
                Edit Account Details
              </ModalHeader>
              <ModalBody className="pb-6">
                {selectedAccount && (
                  <AccountDetailsForm
                    initialData={selectedAccount}
                    onSubmit={handleEdit}
                    onClose={() => {
                      editModal.onClose();
                      setSelectedAccount(null);
                    }}
                    isLoading={updateMutation.isPending}
                  />
                )}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

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
