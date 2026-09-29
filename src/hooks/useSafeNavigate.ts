/**
 * SafeNavigate Hook
 * Wraps React Router's navigate with readiness checks and error handling
 * Solves global navigation issues across the entire application
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useRouterReady } from './useRouterReady';

interface SafeNavigateOptions {
  replace?: boolean;
  state?: unknown;
  /**
   * Prevent rapid successive navigation attempts
   * @default true
   */
  debounce?: boolean;
  /**
   * Debounce delay in ms
   * @default 300
   */
  debounceDelay?: number;
}

/**
 * Hook that provides a safe navigate function with:
 * - Router readiness checks
 * - Debouncing to prevent double-clicks
 * - Error handling
 * - Loading state tracking
 */
export function useSafeNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isReady: isRouterReady } = useRouterReady();
  const [isNavigating, setIsNavigating] = useState(false);
  const lastNavigationRef = useRef<{ path: string; timestamp: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const safeNavigate = useCallback(
    (to: string | number, options?: SafeNavigateOptions) => {
      // Handle back/forward navigation
      if (typeof to === 'number') {
        if (!isRouterReady) {
          console.warn('[SafeNavigate] Router not ready, delaying navigation...');
          setTimeout(() => navigate(to), 100);
          return;
        }
        navigate(to);
        return;
      }

      const {
        replace = false,
        state,
        debounce = true,
        debounceDelay = 300,
      } = options || {};

      // Check if router is ready
      if (!isRouterReady) {
        console.warn('[SafeNavigate] Router not ready, navigation to', to, 'will be delayed');
        // Queue navigation after router is ready
        setTimeout(() => {
          navigate(to, { replace, state });
        }, 150);
        return;
      }

      // Prevent navigation if already navigating
      if (isNavigating) {
        console.warn('[SafeNavigate] Navigation in progress, ignoring duplicate request');
        return;
      }

      // Debounce check - prevent rapid successive navigations to same path
      if (debounce && lastNavigationRef.current) {
        const { path: lastPath, timestamp: lastTimestamp } = lastNavigationRef.current;
        const now = Date.now();
        
        if (lastPath === to && now - lastTimestamp < debounceDelay) {
          console.warn('[SafeNavigate] Duplicate navigation prevented (debounced)');
          return;
        }
      }

      // Don't navigate if already on the target path (unless replace is true)
      if (location.pathname === to && !replace) {
        console.log('[SafeNavigate] Already on target path:', to);
        return;
      }

      try {
        // Set navigating state
        setIsNavigating(true);

        // Record this navigation
        lastNavigationRef.current = {
          path: to,
          timestamp: Date.now(),
        };

        // Perform navigation
        navigate(to, { replace, state });

        // Reset navigating state after a short delay
        timeoutRef.current = setTimeout(() => {
          setIsNavigating(false);
        }, 500);
      } catch (error) {
        console.error('[SafeNavigate] Navigation error:', error);
        setIsNavigating(false);
      }
    },
    [navigate, location.pathname, isRouterReady, isNavigating]
  );

  /**
   * Navigate with return path tracking
   * Useful for forms that need to return to the previous page
   */
  const navigateWithReturn = useCallback(
    (to: string, options?: SafeNavigateOptions) => {
      const returnTo = `${location.pathname}${location.search}`;
      const separator = to.includes('?') ? '&' : '?';
      const pathWithReturn = `${to}${separator}returnTo=${encodeURIComponent(returnTo)}`;
      safeNavigate(pathWithReturn, options);
    },
    [location.pathname, location.search, safeNavigate]
  );

  /**
   * Navigate back using return path from URL or history.back()
   */
  const navigateBack = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const returnTo = params.get('returnTo');
    
    if (returnTo) {
      safeNavigate(returnTo);
    } else {
      safeNavigate(-1);
    }
  }, [location.search, safeNavigate]);

  return {
    navigate: safeNavigate,
    navigateWithReturn,
    navigateBack,
    isNavigating,
    isRouterReady,
  };
}




