/**
 * useLayoutReady Hook
 * Combines auth, router, and layout readiness checks
 * Ensures all critical systems are initialized before enabling navigation
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/store/authStore';
import { useRouterReady } from './useRouterReady';

interface LayoutReadyState {
  isReady: boolean;
  isAuthReady: boolean;
  isRouterReady: boolean;
  isLayoutMounted: boolean;
}

/**
 * Master readiness hook for the application layout
 * Returns true only when auth, router, and layout are all ready
 */
export function useLayoutReady(): LayoutReadyState {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const { isReady: isRouterReady } = useRouterReady();
  const [isLayoutMounted, setIsLayoutMounted] = useState(false);

  // Track layout mount state
  useEffect(() => {
    // Allow one render cycle for layout components to mount
    const timer = requestAnimationFrame(() => {
      setIsLayoutMounted(true);
    });

    return () => cancelAnimationFrame(timer);
  }, []);

  // All systems must be ready
  const isReady = isInitialized && isRouterReady && isLayoutMounted;

  return {
    isReady,
    isAuthReady: isInitialized,
    isRouterReady,
    isLayoutMounted,
  };
}




