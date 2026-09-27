/**
 * Authentication Hook
 * Main hook for accessing auth state and actions
 * 
 * This hook provides a convenient interface to the auth store
 * while maintaining backward compatibility with existing code
 */

import { useAuthStore } from '../store/authStore';

/**
 * useAuth - Main authentication hook
 * 
 * @returns Auth state and actions
 */
export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const signUp = useAuthStore((state) => state.signUp);
  const logout = useAuthStore((state) => state.logout);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const switchLaboratoryContext = useAuthStore((state) => state.switchLaboratoryContext);
  const clearError = useAuthStore((state) => state.clearError);
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);
  const canView = useAuthStore((state) => state.canView);
  const canEdit = useAuthStore((state) => state.canEdit);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,

    // Actions
    login,
    signUp,
    logout,
    refreshToken: refreshAccessToken,
    switchLaboratoryContext,
    clearError,

    // Permission helpers
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canView,
    canEdit,
  };
};
