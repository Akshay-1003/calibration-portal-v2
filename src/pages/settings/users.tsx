import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Avatar,
  Pagination,
  Tabs,
  Tab,
} from '@heroui-v2/react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArchiveBoxIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userQueryKeys, useDeleteUserMutation, useToggleUserArchiveMutation, useUsersQuery } from '../../hooks/queries/users';
import type { User, UserPermissionScope } from '../../features/auth/types/auth.types';
import { usePermissionAccess } from '../../features/auth';
import { UnauthorizedPage } from '../../features/auth/components/UnauthorizedPage';
import {
  userService,
  type CreateUserData,
  type ResetUserPasswordData,
  type UpdateUserData,
} from '../../services/userService';
import { createEmptyPermissionScope } from '../../features/auth/utils/permissionHelpers';
import { UserCreateModal } from '../../components/settings/user-management/UserCreateModal';
import { UserEditModal } from '../../components/settings/user-management/UserEditModal';
import {
  arePermissionScopesEqual,
  getRoleDefaultPermissions,
  userRoleOptions,
  customerRoleOptions,
  withPermissionScopeMetadata,
} from '../../components/settings/user-management/permissionConfig';
import type { ManagedUserFormValues } from '../../components/settings/user-management/userManagementSchema';
import { settingsUserManagementRoles } from '../../config/access-control';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useAuthStore } from '../../features/auth/store/authStore';
import { decodeCalibrationAccessToken } from '../../features/auth/utils/calibrationToken';
import { useOrganizationsQuery } from '../../hooks/queries/organizations';

type UserDirectory = 'laboratory' | 'customer';

type UsersResponse = {
  users: User[];
  total: number;
  page: number;
  limit: number;
};

const columns = [
  { key: 'avatar', label: '' },
  { key: 'name', label: 'Name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions' },
];

const getOptionalString = (value: string) => {
  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    trimmedValue === '-' ||
    trimmedValue.toLowerCase() === 'none' ||
    trimmedValue.toLowerCase() === 'null' ||
    trimmedValue.toLowerCase() === 'undefined'
  ) {
    return null;
  }

  return trimmedValue;
};

const buildPermissionsPayload = (values: ManagedUserFormValues) =>
  withPermissionScopeMetadata(values.permissions, values.organization_id, values.lab_id);

const buildCreatePayload = (values: ManagedUserFormValues): CreateUserData => ({
  username: values.username.trim(),
  email: values.email.trim(),
  first_name: values.first_name.trim(),
  last_name: values.last_name.trim(),
  password: values.password,
  organization_id: values.organization_id.trim(),
  lab_id: getOptionalString(values.lab_id),
  department: getOptionalString(values.department),
  role: values.role,
  archived: values.status === 'archived',
  sign_base64: getOptionalString(values.sign_base64),
});

const buildUpdatePayload = (
  values: ManagedUserFormValues,
  user: User
): UpdateUserData => {
  const payload: UpdateUserData = {};

  if (values.username.trim() !== user.username) payload.username = values.username.trim();
  if (values.email.trim() !== user.email) payload.email = values.email.trim();
  if (values.first_name.trim() !== user.first_name) payload.first_name = values.first_name.trim();
  if (values.last_name.trim() !== user.last_name) payload.last_name = values.last_name.trim();

  const nextOrganizationId = values.organization_id.trim();
  const nextLabId = getOptionalString(values.lab_id);
  const nextDepartment = getOptionalString(values.department);
  const nextSignBase64 = getOptionalString(values.sign_base64);
  const nextArchived = values.status === 'archived';

  if (nextOrganizationId !== (user.organization_id ?? '')) payload.organization_id = nextOrganizationId;
  if (nextLabId !== (user.lab_id ?? null)) payload.lab_id = nextLabId;
  if (nextDepartment !== (user.department ?? null)) payload.department = nextDepartment;
  if (values.role !== user.role) payload.role = values.role;
  if (nextArchived !== user.archived) payload.archived = nextArchived;
  if (nextSignBase64 !== (user.signature ?? null)) payload.sign_base64 = nextSignBase64;

  return payload;
};

const buildRollbackPayload = (user: User): UpdateUserData => ({
  username: user.username,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  organization_id: user.organization_id,
  lab_id: user.lab_id,
  department: user.department,
  role: user.role,
  archived: user.archived,
  sign_base64: user.signature ?? null,
});

export const SettingsUsers = () => {
  const queryClient = useQueryClient();
  const { hasRole } = usePermissionAccess();
  const { user, switchLaboratoryContext } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const tokenClaims = decodeCalibrationAccessToken(accessToken ?? '');
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const isLaboratoryContext = tokenClaims?.scope === 'laboratory';
  const [isRestoringPlatformAccess, setIsRestoringPlatformAccess] = useState(false);
  const [platformAccessError, setPlatformAccessError] = useState<string | null>(null);
  const hasSettingsAdminAccess = settingsUserManagementRoles.some((role) => hasRole(role));
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    role: '',
    user_type: 'laboratory' as UserDirectory,
  });
  const [directory, setDirectory] = useState<UserDirectory>('laboratory');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isResettingUserPassword, setIsResettingUserPassword] = useState(false);

  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
    onOpenChange: onCreateOpenChange,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
    onOpenChange: onEditOpenChange,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();

  const isPlatformReady = !isSuperAdmin || (!isLaboratoryContext && !isRestoringPlatformAccess);
  const organizationsQuery = useOrganizationsQuery({
    directory: 'all',
    limit: 500,
    enabled: isPlatformReady && isSuperAdmin,
  });
  const organizationOptions = (organizationsQuery.data?.organizations ?? [])
    .filter((organization) => organization.org_type === (directory === 'laboratory' ? 'laboratory' : 'customer'))
    .map((organization) => ({ id: organization.id, name: organization.name }));

  const restorePlatformAccess = useCallback(async () => {
    setIsRestoringPlatformAccess(true);
    setPlatformAccessError(null);
    try {
      await switchLaboratoryContext(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to restore platform access.';
      setPlatformAccessError(message);
      toast.error(message);
    } finally {
      setIsRestoringPlatformAccess(false);
    }
  }, [switchLaboratoryContext]);

  useEffect(() => {
    if (!isSuperAdmin || !isLaboratoryContext || isRestoringPlatformAccess || platformAccessError) {
      return;
    }

    void restorePlatformAccess();
  }, [isSuperAdmin, isLaboratoryContext, isRestoringPlatformAccess, platformAccessError, restorePlatformAccess]);

  const { data: usersData, isLoading, isError, error } = useUsersQuery(filters, {
    enabled: isPlatformReady,
  }) as {
    data?: UsersResponse;
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
  };
  const deleteUserMutation = useDeleteUserMutation();
  const toggleArchiveMutation = useToggleUserArchiveMutation();

  if (!hasSettingsAdminAccess) {
    return <UnauthorizedPage />;
  }

  if (platformAccessError) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <p className="text-danger">{platformAccessError}</p>
          <Button className="mt-4" color="primary" onPress={() => void restorePlatformAccess()}>
            Try again
          </Button>
        </CardBody>
      </Card>
    );
  }

  const invalidateUserQueries = async (userId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() }),
      ...(userId
        ? [queryClient.invalidateQueries({ queryKey: userQueryKeys.permissions(userId) })]
        : []),
    ]);
  };

  const handleSearch = (value: string) => {
    setFilters((previousFilters) => ({ ...previousFilters, search: value, page: 1 }));
  };

  const handleDirectoryChange = (key: React.Key) => {
    const nextDirectory = key as UserDirectory;
    setDirectory(nextDirectory);
    setFilters((previousFilters) => ({
      ...previousFilters,
      user_type: nextDirectory,
      role: '',
      page: 1,
    }));
  };

  const handleRoleFilter = (role: string) => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      role: role === 'all' ? '' : role,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((previousFilters) => ({ ...previousFilters, page }));
  };

  const handleOpenCreateUser = () => {
    setSelectedUser(null);
    onCreateOpen();
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    onEditOpen();
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    onDeleteOpen();
  };

  const handleCreateUser = async (values: ManagedUserFormValues) => {
    setIsSavingUser(true);

    try {
      const createdUser = await userService.create(buildCreatePayload(values));
      const permissionsPayload = buildPermissionsPayload(values);

      // The backend assigns role defaults while creating the user. Avoid a
      // redundant second write unless the form contains a real customization.
      const defaultPermissions = getRoleDefaultPermissions(
        values.role,
        values.organization_id,
        values.lab_id,
      );
      const hasCustomizedPermissions = !arePermissionScopesEqual(
        permissionsPayload,
        defaultPermissions,
      );

      if (hasCustomizedPermissions) {
        try {
          await userService.updateUserPermissions(createdUser.id, permissionsPayload);
        } catch {
          // Keep the successfully-created account usable with the backend's
          // validated role defaults, then let the user retry customization.
          try {
            await userService.initializeUserPermissions(createdUser.id);
          } catch {
            // The create endpoint has already persisted safe role defaults;
            // a failed recovery must not hide the created account.
          }
          await invalidateUserQueries(createdUser.id);
          toast.warning('User created with role-default permissions. Custom permissions could not be saved.');
          onCreateClose();
          return;
        }
      }

      await invalidateUserQueries(createdUser.id);
      toast.success('User and permissions created successfully!');
      onCreateClose();
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to create user'));
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleUpdateUser = async (values: ManagedUserFormValues) => {
    if (!selectedUser) return;

    const previousPermissions =
      queryClient.getQueryData<UserPermissionScope>(userQueryKeys.permissions(selectedUser.id)) ??
      selectedUser.permissions ??
      createEmptyPermissionScope();
    const nextPermissions = buildPermissionsPayload(values);
    const userPayload = buildUpdatePayload(values, selectedUser);
    const shouldUpdateUser = Object.keys(userPayload).length > 0;
    const shouldUpdatePermissions = !arePermissionScopesEqual(previousPermissions, nextPermissions);

    if (!shouldUpdateUser && !shouldUpdatePermissions) {
      toast.success('No user changes to save.');
      onEditClose();
      setSelectedUser(null);
      return;
    }

    setIsSavingUser(true);

    try {
      let userWasUpdated = false;

      if (shouldUpdateUser) {
        await userService.update(selectedUser.id, userPayload);
        userWasUpdated = true;
      }

      if (shouldUpdatePermissions) {
        try {
          await userService.updateUserPermissions(selectedUser.id, nextPermissions);
        } catch {
          if (userWasUpdated) {
            let rollbackFailed = false;

            try {
              await userService.update(selectedUser.id, buildRollbackPayload(selectedUser));
            } catch {
              rollbackFailed = true;
            }

            throw new Error(
              rollbackFailed
                ? 'Permissions could not be updated after the user details were saved. Please review that user and retry.'
                : 'Permissions could not be updated, so the user detail changes were rolled back.'
            );
          }

          throw new Error('Permissions could not be updated.');
        }
      }

      await invalidateUserQueries(selectedUser.id);
      toast.success('User details and permissions updated successfully!');
      onEditClose();
      setSelectedUser(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Failed to update user'));
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleArchive = (user: User) => {
    toggleArchiveMutation.mutate({
      id: user.id,
      archived: !user.archived,
    });
  };

  const handleResetUserPassword = async (values: ResetUserPasswordData) => {
    if (!selectedUser) {
      throw new Error('Select a user before resetting the password.');
    }

    setIsResettingUserPassword(true);

    try {
      await userService.resetUserPassword(selectedUser.id, values);
      await invalidateUserQueries(selectedUser.id);
    } finally {
      setIsResettingUserPassword(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedUser) return;

    deleteUserMutation.mutate(selectedUser.id, {
      onSuccess: () => {
        deleteCloseCleanup();
      },
    });
  };

  const deleteCloseCleanup = () => {
    setSelectedUser(null);
    deleteUserMutation.reset();
    onDeleteClose();
  };

  const getRoleLabel = (role: string) =>
    [...userRoleOptions, ...customerRoleOptions].find((option) => option.key === role)?.label ?? role;

  const getStatusColor = (user: User) => (user.archived ? 'warning' : 'success');
  const getStatusText = (user: User) => (user.archived ? 'Archived' : 'Active');

  const renderCell = (user: User, columnKey: string) => {
    switch (columnKey) {
      case 'avatar':
        return (
          <Avatar
            src={user.avatar ?? undefined}
            icon={<UserCircleIcon className="h-6 w-6 text-slate-400" />}
            className="h-10 w-10"
            classNames={{ base: 'bg-slate-100' }}
          />
        );
      case 'name':
        return (
          <div>
            <p className="font-medium text-slate-900">
              {user.first_name} {user.last_name}
            </p>
          </div>
        );
      case 'username':
        return <p className="text-sm text-slate-600">{user.username}</p>;
      case 'email':
        return <p className="text-sm text-slate-600">{user.email}</p>;
      case 'role':
        return (
          <Chip size="sm" variant="flat">
            {getRoleLabel(user.role)}
          </Chip>
        );
      case 'department':
        return <p className="text-sm text-slate-700">{user.department || '-'}</p>;
      case 'status':
        return (
          <Chip size="sm" color={getStatusColor(user)} variant="flat">
            {getStatusText(user)}
          </Chip>
        );
      case 'actions':
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="light" isIconOnly onPress={() => handleEditUser(user)}>
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="light" isIconOnly onPress={() => handleToggleArchive(user)}>
              <ArchiveBoxIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="light"
              color="danger"
              isIconOnly
              onPress={() => handleDeleteUser(user)}
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-600">
            Manage laboratory staff and customer organization users from one place.
          </p>
        </div>

        <Button color="primary" startContent={<PlusIcon className="h-4 w-4" />} onPress={handleOpenCreateUser}>
          Add User
        </Button>
      </div>

      {isSuperAdmin ? (
        <Tabs
          aria-label="User directories"
          selectedKey={directory}
          onSelectionChange={handleDirectoryChange}
          color="primary"
          variant="underlined"
        >
          <Tab key="laboratory" title="Laboratory users" />
          <Tab key="customer" title="Organization users" />
        </Tabs>
      ) : null}

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Input
              placeholder="Search users..."
              startContent={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
              value={filters.search}
              onValueChange={handleSearch}
              className="max-w-md"
            />
            <Select
              placeholder="Filter by role"
              selectedKeys={filters.role ? [filters.role] : []}
              onSelectionChange={(keys) => handleRoleFilter((Array.from(keys)[0] as string) ?? '')}
              className="max-w-sm"
            >
              {(directory === 'customer' ? customerRoleOptions : userRoleOptions).map((role) => (
                <SelectItem key={role.key} textValue={role.label}>
                  {role.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table aria-label="Users table">
            <TableHeader columns={columns}>
              {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
            </TableHeader>
            <TableBody
              items={usersData?.users ?? []}
              isLoading={isLoading || !isPlatformReady}
              emptyContent={
                isError
                  ? extractErrorMessage(error, 'Unable to load users')
                  : 'No users found'
              }
            >
              {(item: User) => (
                <TableRow key={item.id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>

          {usersData && usersData.total > filters.limit && (
            <div className="flex justify-center p-4">
              <Pagination
                total={Math.ceil(usersData.total / filters.limit)}
                page={filters.page}
                onChange={handlePageChange}
              />
            </div>
          )}
        </CardBody>
      </Card>

      <UserCreateModal
        isOpen={isCreateOpen}
        onOpenChange={onCreateOpenChange}
        onClose={onCreateClose}
        onSubmit={handleCreateUser}
        isLoading={isSavingUser}
        userType={directory}
        organizationOptions={isSuperAdmin ? organizationOptions : []}
      />

      <UserEditModal
        user={selectedUser}
        isOpen={isEditOpen}
        onOpenChange={onEditOpenChange}
        onClose={() => {
          onEditClose();
          setSelectedUser(null);
        }}
        onSubmit={handleUpdateUser}
        onResetPassword={handleResetUserPassword}
        isLoading={isSavingUser}
        isResetPasswordLoading={isResettingUserPassword}
        userType={directory}
      />

      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange} size="sm">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete User</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete user "{selectedUser?.first_name} {selectedUser?.last_name}"?
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    onClose();
                    deleteCloseCleanup();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  isLoading={deleteUserMutation.isPending}
                  onPress={handleConfirmDelete}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};
