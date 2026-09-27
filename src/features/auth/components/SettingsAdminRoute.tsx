import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UnauthorizedPage } from './UnauthorizedPage';
import { settingsAdminRoles } from '../../../config/access-control';

interface SettingsAdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  allowedRoles?: readonly string[];
}

export const SettingsAdminRoute: React.FC<SettingsAdminRouteProps> = ({
  children,
  fallback,
  allowedRoles = settingsAdminRoles,
}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = user.role === 'superadmin' ? 'super_admin' : user.role;
  const hasSettingsAccess = allowedRoles.some((role) =>
    (role === 'superadmin' ? 'super_admin' : role) === normalizedRole
  );

  if (!hasSettingsAccess) {
    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};
