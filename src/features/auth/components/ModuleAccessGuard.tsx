import { Navigate, useLocation } from "react-router-dom";
import type { PermissionAction, PermissionModule } from "../types/auth.types";
import { useAuthStore } from "../store/authStore";
import { UnauthorizedPage } from "./UnauthorizedPage";

interface ModuleAccessGuardProps {
  children: React.ReactNode;
  module: PermissionModule;
  action?: PermissionAction;
  fallbackPath?: string;
  fallback?: React.ReactNode;
  allowedRoles?: readonly string[];
}

export const ModuleAccessGuard: React.FC<ModuleAccessGuardProps> = ({
  children,
  module,
  action = "view",
  fallbackPath,
  fallback,
  allowedRoles,
}) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedRole = user.role === 'superadmin' ? 'super_admin' : user.role;
  const hasRoleAccess = !allowedRoles || allowedRoles.some((role) =>
    (role === 'superadmin' ? 'super_admin' : role) === normalizedRole
  );

  if (!hasRoleAccess || !hasPermission(module, action)) {
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }

    return fallback ? <>{fallback}</> : <UnauthorizedPage />;
  }

  return <>{children}</>;
};
