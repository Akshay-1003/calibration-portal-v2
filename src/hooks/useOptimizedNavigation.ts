import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../context/NavigationContext';

interface NavigationState {
  isReturningFromDetail: boolean;
  lastNavigationPath: string | null;
}

type NavigationPayload = Record<string, unknown>;

/**
 * Hook to optimize navigation between list and detail pages
 * Prevents unnecessary API calls when returning from detail pages
 */
export function useOptimizedNavigation() {
  const navigate = useNavigate();
  const { startLoading } = useNavigation();
  const navigationState = useRef<NavigationState>({
    isReturningFromDetail: false,
    lastNavigationPath: null,
  });

  const navigateToDetail = useCallback((detailPath: string, listPath: string, state?: NavigationPayload) => {
    // Mark that we're navigating to detail page
    navigationState.current = {
      isReturningFromDetail: true,
      lastNavigationPath: listPath,
    };

    // Show immediate visual feedback before route transition starts
    startLoading(detailPath);

    // Navigate with return path in state
    navigate(detailPath, {
      state: {
        ...state,
        returnPath: listPath,
      },
      replace: false,
    });
  }, [navigate, startLoading]);

  const navigateBack = useCallback((fallbackPath: string) => {
    // Use the stored return path or fallback
    const targetPath = navigationState.current.lastNavigationPath || fallbackPath;
    
    // Reset navigation state
    navigationState.current = {
      isReturningFromDetail: false,
      lastNavigationPath: null,
    };

    // Show immediate visual feedback before route transition starts
    startLoading(targetPath);

    // Navigate back - use replace:false to ensure proper route re-render
    // Add timestamp to force component remount if navigating to same route
    navigate(targetPath, { 
      replace: false,
      state: { _navigatedAt: Date.now() }
    });
  }, [navigate, startLoading]);

  const isReturning = useCallback(() => {
    return navigationState.current.isReturningFromDetail;
  }, []);

  const clearNavigationState = useCallback(() => {
    navigationState.current = {
      isReturningFromDetail: false,
      lastNavigationPath: null,
    };
  }, []);

  return {
    navigateToDetail,
    navigateBack,
    isReturning,
    clearNavigationState,
  };
}
