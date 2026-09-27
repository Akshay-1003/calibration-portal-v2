/**
 * Require Permission Component
 * Restricts access based on user permissions
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UnauthorizedPage } from './UnauthorizedPage';
import type { PermissionAction } from '../types/auth.types';
import type { PermissionCheckInput } from '../utils/permissionHelpers';

interface RequirePermissionProps {
  children: React.ReactNode;
  permission: PermissionCheckInput;
  action?: PermissionAction;
  fallback?: React.ReactNode;
}

interface RequireAnyPermissionProps {
  children: React.ReactNode;
  permissions: PermissionCheckInput[];
  fallback?: React.ReactNode;
}

interface RequireAllPermissionsProps {
  children: React.ReactNode;
  permissions: PermissionCheckInput[];
  fallback?: React.ReactNode;
}

/**
 * RequirePermission - Requires specific permission
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  children,
  permission,
  action,
  fallback,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission, action)) {
    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};

/**
 * RequireAnyPermission - Requires at least one of the specified permissions
 */
export const RequireAnyPermission: React.FC<RequireAnyPermissionProps> = ({
  children,
  permissions,
  fallback,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyPermission(permissions)) {
    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};

/**
 * RequireAllPermissions - Requires all specified permissions
 */
export const RequireAllPermissions: React.FC<RequireAllPermissionsProps> = ({
  children,
  permissions,
  fallback,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAllPermissions(permissions)) {
    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};
