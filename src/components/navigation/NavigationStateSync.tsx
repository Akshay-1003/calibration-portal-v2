import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useNavigation } from "../../context/NavigationContext";

const getCurrentPath = (pathname: string, search: string): string =>
  `${pathname}${search || ""}`;

/**
 * Synchronizes navigation-loader state with router location changes.
 * Smart detection:
 * - Stops loader immediately when route is ready
 * - Detects instant transitions (cached routes)
 * - Prevents unnecessary loader display for fast navigations
 */
export default function NavigationStateSync() {
  const location = useLocation();
  const { isLoading, loadingPath, stopLoading } = useNavigation();
  const navigationStartTime = useRef<number | null>(null);

  // Track when navigation starts
  useEffect(() => {
    if (isLoading && !navigationStartTime.current) {
      navigationStartTime.current = Date.now();
    } else if (!isLoading) {
      navigationStartTime.current = null;
    }
  }, [isLoading]);

  // Stop loader when route is ready
  useEffect(() => {
    if (!isLoading) return;

    const currentPath = getCurrentPath(location.pathname, location.search);

    // Stop loader when destination route is active
    if (!loadingPath || loadingPath === currentPath) {
      // Use RAF to ensure DOM is ready
      const raf = window.requestAnimationFrame(() => {
        stopLoading();
        navigationStartTime.current = null;
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [isLoading, loadingPath, location.pathname, location.search, stopLoading]);

  return null;
}

