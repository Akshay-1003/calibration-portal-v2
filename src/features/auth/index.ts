/**
 * Authentication Feature Exports
 * Centralized exports for the authentication feature
 */

// Components
export { AuthProvider } from './components/AuthProvider';
export { useAuthContext } from './components/AuthContext';
export { ProtectedRoute } from './components/ProtectedRoute';
export { AuthGate } from './components/AuthGate';
export { ModuleAccessGuard } from './components/ModuleAccessGuard';
export { RequireRole } from './components/RequireRole';
export { SettingsAdminRoute } from './components/SettingsAdminRoute';
export {
  RequirePermission,
  RequireAnyPermission,
  RequireAllPermissions,
} from './components/RequirePermission';
export { UnauthorizedPage } from './components/UnauthorizedPage';
export { AuthLoadingScreen } from './components/AuthLoadingScreen';

// Hooks
export { useAuth } from './hooks/useAuth';

// Store
export { useAuthStore, authSelectors } from './store/authStore';

// Services
export { authService } from './services/authService';

// Utils
export {
  authSchemas,
  authMessages,
  checkPasswordStrength,
  isValidEmail,
  parseAuthToken,
  storage,
  session,
  authUtils,
  type SignInFormData,
  type SignUpFormData,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
} from './utils/authUtils';
export {
  hasPermission,
  canView,
  canEdit,
  canAny,
  canAll,
  hasRole,
  usePermissionAccess,
  useCanView,
  useCanEdit,
  useHasPermission,
  permissionUtils,
} from './utils/permissions';

// Types
export type {
  User,
  AuthState,
  LoginCredentials,
  SignUpData,
  AuthResponse,
  AuthContextType,
  TokenPayload,
  PermissionAction,
  PermissionModule,
  PermissionCheck,
  UserPermissionScope,
} from './types/auth.types';
