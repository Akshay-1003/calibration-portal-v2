import React from 'react';
import { useAuthStore } from '../store/authStore';

interface AuthGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGate - Enterprise-grade authentication gate
 * 
 * Strategy:
 * 1. ALWAYS wait for initialization to complete before rendering protected content
 * 2. Kick off auth initialization as early as possible
 * 3. Let ProtectedLayout decide how to render a safe shell while auth resolves
 * 
 * This prevents flash of protected content for unauthenticated users.
 * Like big stable apps (Google, GitHub, etc.) - no content flash on hard reload.
 */
export function AuthGate({ children, fallback }: AuthGateProps) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);

  React.useEffect(() => {
    // Only initialize if not already initialized or loading
    if (!isInitialized && !isLoading) {
      void initialize();
    }
  }, [initialize, isInitialized, isLoading]);

  if (!isInitialized && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AuthGate;
