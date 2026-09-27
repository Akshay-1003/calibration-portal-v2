/**
 * Require Role Component
 * Restricts access based on user role
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UnauthorizedPage } from './UnauthorizedPage';

interface RequireRoleProps {
  children: React.ReactNode;
  roles: string | string[];
  fallback?: React.ReactNode;
}

/**
 * RequireRole - Requires specific role(s)
 */
export const RequireRole: React.FC<RequireRoleProps> = ({
  children,
  roles,
  fallback,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasRole = useAuthStore((state) => state.hasRole);

  // Must be authenticated first
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const rolesArray = Array.isArray(roles) ? roles : [roles];
  const hasRequiredRole = rolesArray.some((role) => hasRole(role));

  if (!hasRequiredRole) {
    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};
