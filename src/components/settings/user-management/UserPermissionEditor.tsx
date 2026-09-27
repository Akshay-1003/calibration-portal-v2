import { Button } from '@heroui/react';
import type { PermissionAction, PermissionModule, UserPermissionScope, User } from '../../../features/auth/types/auth.types';
import { normalizePermissionScope } from '../../../features/auth/utils/permissionHelpers';
import {
  getRoleDefaultPermissions,
  permissionModuleConfigs,
  setAllPermissions,
  setPermissionAction,
  withPermissionScopeMetadata,
} from './permissionConfig';
import { PermissionModuleCard } from './PermissionModuleCard';

interface UserPermissionEditorProps {
  value: UserPermissionScope | null | undefined;
  onChange: (value: UserPermissionScope) => void;
  organizationId?: string | null;
  labId?: string | null;
  role?: User['role'];
  isDisabled?: boolean;
  onApplyRoleDefaults?: () => void;
  userType?: 'laboratory' | 'customer';
}

export const UserPermissionEditor = ({
  value,
  onChange,
  organizationId,
  labId,
  role,
  isDisabled = false,
  onApplyRoleDefaults,
  userType = 'laboratory',
}: UserPermissionEditorProps) => {
  const permissionScope = withPermissionScopeMetadata(value, organizationId, labId);
  const visibleModules = permissionModuleConfigs.filter(({ key }) =>
    userType === 'customer' ? key.startsWith('customer_') : !key.startsWith('customer_')
  );

  const handleToggle = (
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean
  ) => {
    onChange(setPermissionAction(permissionScope, module, action, checked, organizationId, labId));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Permissions</h3>
          <p className="text-sm text-slate-500">
            Configure module visibility and management access in the same flow as user create or edit.
          </p>
          {role && (
            <p className="mt-1 text-xs text-slate-500">
              Role defaults can be used as a starting point, then customized for this user.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {role && (
            <Button
              variant="flat"
              onPress={() => {
                if (onApplyRoleDefaults) {
                  onApplyRoleDefaults();
                  return;
                }

                onChange(getRoleDefaultPermissions(role, organizationId, labId));
              }}
              isDisabled={isDisabled}
            >
              Apply Role Defaults
            </Button>
          )}
          <Button
            variant="flat"
            onPress={() => onChange(setAllPermissions(permissionScope, 'view', organizationId, labId, visibleModules.map(({ key }) => key)))}
            isDisabled={isDisabled}
          >
            Select View
          </Button>
          <Button
            variant="flat"
            onPress={() => onChange(setAllPermissions(permissionScope, 'edit', organizationId, labId, visibleModules.map(({ key }) => key)))}
            isDisabled={isDisabled}
          >
            Select All
          </Button>
          <Button
            variant="light"
            color="danger"
            onPress={() => onChange(setAllPermissions(permissionScope, 'clear', organizationId, labId, visibleModules.map(({ key }) => key)))}
            isDisabled={isDisabled}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {visibleModules.map((module) => (
          <PermissionModuleCard
            key={module.key}
            module={module}
            grantedActions={normalizePermissionScope(permissionScope).permissions[module.key] ?? []}
            isDisabled={isDisabled}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
};
