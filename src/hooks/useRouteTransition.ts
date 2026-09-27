import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';

/**
 * useRouteTransition - Smart hook for navigating with loading state
 * 
 * Features:
 * - Only shows loader when there's real loading (not cached routes)
 * - Minimum 250ms display to prevent flicker
 * - Auto-stops after 3s to prevent stuck states
 * - Works seamlessly with React Suspense
 * 
 * Usage:
 * ```tsx
 * const navigateWithLoader = useRouteTransition();
 * 
 * // In your component
 * <Button onClick={() => navigateWithLoader('/dashboard')}>
 *   Go to Dashboard
 * </Button>
 * ```
 */
export function useRouteTransition() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startLoading } = useNavigation();

  const navigateWithLoader = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      // Don't navigate if already on the same route
      if (location.pathname === to) return;
      
      // Start loading - NavigationContext handles smart timing
      startLoading(to);
      
      // Navigate
      navigate(to, options);
    },
    [navigate, location.pathname, startLoading]
  );

  return navigateWithLoader;
}

export default useRouteTransition;
