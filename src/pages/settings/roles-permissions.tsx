import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  Button,
  Select,
  SelectItem,
} from '@heroui-v2/react';
import {
  ArrowPathIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import {
  useInitializeUserPermissionsMutation,
  useResetUserPermissionsMutation,
  useUserPermissionsQuery,
  useUpdateUserPermissionsMutation,
  useUsersQuery,
} from '../../hooks/queries/users';
import type { User } from '../../features/auth/types/auth.types';
import { normalizePermissionScope } from '../../features/auth/utils/permissionHelpers';
import { usePermissionAccess } from '../../features/auth';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { UnauthorizedPage } from '../../features/auth/components/UnauthorizedPage';
import { UserPermissionEditor } from '../../components/settings/user-management/UserPermissionEditor';
import { arePermissionScopesEqual } from '../../components/settings/user-management/permissionConfig';
import { settingsAdministrationRoles } from '../../config/access-control';

export const SettingsRolesPermissions = () => {
  const { hasRole } = usePermissionAccess();
  const { user: currentUser } = useAuth();
  const hasSettingsAdminAccess = settingsAdministrationRoles.some((role) => hasRole(role));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [draftPermissions, setDraftPermissions] = useState(normalizePermissionScope(null));

  const usersQuery = useUsersQuery({ page: 1, limit: 500 }) as {
    data?: { users: User[] };
    isLoading: boolean;
    error?: unknown;
  };

  const users = useMemo(
    () => (usersQuery.data?.users ?? []).filter((user) =>
      currentUser?.role === 'super_admin' || currentUser?.role === 'superadmin'
        ? true
        : ['lab_admin', 'lab_manager', 'lab_engineer', 'lab_viewer'].includes(user.role)
    ),
    [currentUser?.role, usersQuery.data?.users]
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const permissionsQuery = useUserPermissionsQuery(selectedUserId, {
    enabled: !!selectedUserId,
  });
  const initializePermissionsMutation = useInitializeUserPermissionsMutation();
  const resetPermissionsMutation = useResetUserPermissionsMutation();
  const updateUserPermissionsMutation = useUpdateUserPermissionsMutation();

  const currentPermissions = normalizePermissionScope(
    permissionsQuery.data ?? selectedUser?.permissions ?? null
  );
  const hasUnsavedChanges = !arePermissionScopesEqual(currentPermissions, draftPermissions);

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    setDraftPermissions(currentPermissions);
  }, [selectedUserId, permissionsQuery.data, selectedUser?.permissions]);

  if (!hasSettingsAdminAccess) {
    return <UnauthorizedPage />;
  }

  const handleInitialize = async () => {
    if (!selectedUserId) return;
    await initializePermissionsMutation.mutateAsync(selectedUserId);
    await permissionsQuery.refetch();
  };

  const handleReset = async () => {
    if (!selectedUserId) return;
    await resetPermissionsMutation.mutateAsync(selectedUserId);
    await permissionsQuery.refetch();
  };

  const handleSave = async () => {
    if (!selectedUserId || !hasUnsavedChanges) return;
    await updateUserPermissionsMutation.mutateAsync({
      userId: selectedUserId,
      data: draftPermissions,
    });
    await permissionsQuery.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Roles & Permissions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Advanced admin view for inspecting, comparing, initializing, resetting, and updating user access.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="flat"
            startContent={<ArrowPathIcon className="h-4 w-4" />}
            onPress={() => permissionsQuery.refetch()}
            isDisabled={!selectedUserId}
          >
            Refresh
          </Button>
          <Button
            color="success"
            variant="flat"
            onPress={handleInitialize}
            isLoading={initializePermissionsMutation.isPending}
            isDisabled={!selectedUserId}
          >
            Initialize
          </Button>
          <Button
            color="warning"
            variant="flat"
            onPress={handleReset}
            isLoading={resetPermissionsMutation.isPending}
            isDisabled={!selectedUserId}
          >
            Reset
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={updateUserPermissionsMutation.isPending}
            isDisabled={!selectedUserId || !hasUnsavedChanges}
          >
            Save Permissions
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardBody className="p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_1fr]">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">Select User</label>
              <Select
                aria-label="Select user for permissions"
                selectedKeys={selectedUserId ? [selectedUserId] : []}
                onSelectionChange={(keys) => setSelectedUserId((Array.from(keys)[0] as string) ?? '')}
                placeholder="Choose a user"
                startContent={<UsersIcon className="h-4 w-4 text-slate-500" />}
                isLoading={usersQuery.isLoading}
              >
                {users.map((user) => (
                  <SelectItem key={user.id} textValue={`${user.first_name} ${user.last_name} ${user.email}`}>
                    {`${user.first_name} ${user.last_name}`.trim()} ({user.email})
                  </SelectItem>
                ))}
              </Select>
              {usersQuery.error && (
                <p className="text-xs text-red-500">
                  Users could not be loaded. Refresh the page or check the users API response.
                </p>
              )}

              {selectedUser && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                  <p>{selectedUser.email}</p>
                  <p className="mt-2">Role: {selectedUser.role}</p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <UserPermissionEditor
        value={draftPermissions}
        onChange={setDraftPermissions}
        organizationId={selectedUser?.organization_id}
        labId={selectedUser?.lab_id}
        role={selectedUser?.role}
        isDisabled={
          !selectedUserId ||
          permissionsQuery.isLoading ||
          initializePermissionsMutation.isPending ||
          resetPermissionsMutation.isPending ||
          updateUserPermissionsMutation.isPending
        }
      />
    </div>
  );
};
