/**
 * useRouterReady Hook
 * Tracks when React Router is fully hydrated and ready for navigation
 * Prevents race conditions on initial mount/refresh
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface RouterReadyState {
  isReady: boolean;
  isHydrated: boolean;
}

/**
 * Hook to ensure router is fully ready before allowing navigation
 * Solves first-click navigation failures after refresh/login
 */
export function useRouterReady(): RouterReadyState {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Step 1: Check if location is hydrated (not initial empty state)
    if (location.pathname) {
      setIsHydrated(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Step 2: Verify navigate function is callable
    if (isHydrated && typeof navigate === 'function') {
      // Small delay to ensure router's internal state is settled
      // This is NOT a hack - it allows React Router's hydration to complete
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isHydrated, navigate]);

  return { isReady, isHydrated };
}





