/**
 * Authentication Provider
 * Provides auth context from Zustand store.
 * Initialization is handled by AuthGate on protected routes only.
 * Public routes (login/signup) render immediately without initialization.
 */

import React from 'react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';
import type { AuthContextType } from '../types';
import { AuthContext } from './AuthContext';
import { tabSync } from '../utils/tabSync';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider - Provides auth context without blocking render
 * Initialization only happens on protected routes via AuthGate
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const signUp = useAuthStore((state) => state.signUp);
  const logout = useAuthStore((state) => state.logout);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const clearError = useAuthStore((state) => state.clearError);

  // For Google OAuth (if needed)
  const loginWithGoogle = async (credential: string) => {
    const response = await authService.loginWithGoogle(credential);
    const setUser = useAuthStore.getState().setUser;
    const setAccessToken = useAuthStore.getState().setAccessToken;
    setAccessToken(response.access_token);
    setUser(response.user, { broadcast: false });
    tabSync.broadcastLogin(response.access_token);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    signUp,
    logout,
    refreshAccessToken,
    clearError,
    loginWithGoogle,
  };

  // Render immediately without any initialization checks on public routes
  // This ensures login/signup pages load instantly on hard reload
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

};
