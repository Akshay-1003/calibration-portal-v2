import { createContext, useCallback, useContext, useState, useRef, ReactNode } from "react";

// Minimum time loader must be visible to prevent flicker (ms)
const MIN_LOADING_DURATION = 250;
// Maximum time to wait before auto-stopping loader (ms)
const MAX_LOADING_DURATION = 3000;

type NavigationContextType = {
  isLoading: boolean;
  loadingPath: string | null;
  startLoading: (path?: string) => void;
  stopLoading: () => void;
  setLoading: (isLoading: boolean, path?: string) => void;
};

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const loadingStartTime = useRef<number | null>(null);
  const minDurationTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxDurationTimeout = useRef<NodeJS.Timeout | null>(null);

  const setLoading = useCallback((loading: boolean, path?: string) => {
    if (loading) {
      // Start loading
      loadingStartTime.current = Date.now();
      setIsLoading(true);
      setLoadingPath(path || null);
      
      // Auto-stop after max duration to prevent stuck loaders
      if (maxDurationTimeout.current) {
        clearTimeout(maxDurationTimeout.current);
      }
      maxDurationTimeout.current = setTimeout(() => {
        setIsLoading(false);
        setLoadingPath(null);
        loadingStartTime.current = null;
      }, MAX_LOADING_DURATION);
    } else {
      // Stop loading with minimum duration check
      const elapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
      
      // Clear max duration timeout
      if (maxDurationTimeout.current) {
        clearTimeout(maxDurationTimeout.current);
        maxDurationTimeout.current = null;
      }
      
      if (elapsed < MIN_LOADING_DURATION) {
        // Wait for minimum duration to prevent flicker
        const remainingTime = MIN_LOADING_DURATION - elapsed;
        if (minDurationTimeout.current) {
          clearTimeout(minDurationTimeout.current);
        }
        minDurationTimeout.current = setTimeout(() => {
          setIsLoading(false);
          setLoadingPath(null);
          loadingStartTime.current = null;
        }, remainingTime);
      } else {
        // Instant stop - loading took longer than minimum
        setIsLoading(false);
        setLoadingPath(null);
        loadingStartTime.current = null;
      }
    }
  }, []);

  const startLoading = useCallback((path?: string) => {
    setLoading(true, path);
  }, [setLoading]);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <NavigationContext.Provider
      value={{
        isLoading,
        loadingPath,
        startLoading,
        stopLoading,
        setLoading,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};
