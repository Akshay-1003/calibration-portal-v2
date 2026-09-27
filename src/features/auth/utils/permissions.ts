import { useAuthStore } from '../store/authStore';
import type {
  PermissionAction,
  PermissionModule,
  UserPermissionScope,
} from '../types/auth.types';
import {
  canEditModule,
  canViewModule,
  hasAllModulePermissions,
  hasAnyModulePermission,
  hasModulePermission,
  normalizePermissionScope,
  type PermissionCheckInput,
} from './permissionHelpers';

export const hasPermission = (
  module: PermissionCheckInput,
  action?: PermissionAction
): boolean => useAuthStore.getState().hasPermission(module, action);

export const canView = (module: PermissionModule): boolean =>
  useAuthStore.getState().canView(module);

export const canEdit = (module: PermissionModule): boolean =>
  useAuthStore.getState().canEdit(module);

export const canAny = (permissions: PermissionCheckInput[]): boolean =>
  useAuthStore.getState().hasAnyPermission(permissions);

export const canAll = (permissions: PermissionCheckInput[]): boolean =>
  useAuthStore.getState().hasAllPermissions(permissions);

export const hasRole = (role: string): boolean => {
  return useAuthStore.getState().hasRole(role);
};

export const usePermissionAccess = () => {
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const canView = useAuthStore((state) => state.canView);
  const canEdit = useAuthStore((state) => state.canEdit);

  return {
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canEdit,
  };
};

export const useCanView = (module: PermissionModule) =>
  useAuthStore((state) => state.canView(module));

export const useCanEdit = (module: PermissionModule) =>
  useAuthStore((state) => state.canEdit(module));

export const useHasPermission = (
  module: PermissionCheckInput,
  action?: PermissionAction
) => useAuthStore((state) => state.hasPermission(module, action));

export const permissionUtils = {
  normalizePermissionScope,
  hasPermission: hasModulePermission,
  hasAnyPermission: hasAnyModulePermission,
  hasAllPermissions: hasAllModulePermissions,
  canView: canViewModule,
  canEdit: canEditModule,
};

export type { UserPermissionScope };
