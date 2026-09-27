import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  [key: string]: string | undefined;
}

interface UseFilterUrlStateOptions {
  /**
   * Prefix to avoid collisions when multiple filter sets exist on the same route.
   * Example: "calibration", "inward"
   */
  prefix: string;
  /**
   * Filter keys to manage in URL
   */
  filterKeys: string[];
}

/**
 * Hook to manage filter state in URL query parameters.
 * This ensures filters persist across navigation until hard refresh or unmount.
 * 
 * @example
 * const { filters, setFilter, clearFilters } = useFilterUrlState({ 
 *   prefix: 'calibration',
 *   filterKeys: ['status', 'company', 'labId', 'dateFrom', 'dateTo']
 * });
 */
export const useFilterUrlState = ({ prefix, filterKeys }: UseFilterUrlStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const keys = useMemo(
    () => {
      const keyMap: Record<string, string> = {};
      filterKeys.forEach(key => {
        keyMap[key] = `${prefix}_${key}`;
      });
      return keyMap;
    },
    [prefix, filterKeys],
  );

  const filters: FilterState = useMemo(() => {
    const filterState: FilterState = {};
    filterKeys.forEach(key => {
      const urlKey = keys[key];
      const value = searchParams.get(urlKey);
      if (value) {
        filterState[key] = value;
      }
    });
    return filterState;
  }, [searchParams, keys, filterKeys]);

  const updateParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          updater(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      if (!filterKeys.includes(key)) {
        console.warn(`Filter key "${key}" is not in filterKeys list`);
        return;
      }
      
      const urlKey = keys[key];
      updateParams((sp) => {
        if (value === undefined || value === '' || value === 'all') {
          sp.delete(urlKey);
        } else {
          sp.set(urlKey, value);
        }
      });
    },
    [keys, filterKeys, updateParams],
  );

  const setFilters = useCallback(
    (newFilters: FilterState | undefined) => {
      updateParams((sp) => {
        filterKeys.forEach(key => {
          const urlKey = keys[key];
          const value = newFilters?.[key];
          if (value === undefined || value === '' || value === 'all') {
            sp.delete(urlKey);
          } else {
            sp.set(urlKey, value);
          }
        });
      });
    },
    [keys, filterKeys, updateParams],
  );

  const clearFilters = useCallback(() => {
    setFilters(undefined);
  }, [setFilters]);

  const hasFilters = useMemo(() => {
    return filterKeys.some(key => filters[key] !== undefined);
  }, [filters, filterKeys]);

  return {
    filters: hasFilters ? filters : undefined,
    setFilter,
    setFilters,
    clearFilters,
    hasFilters,
  };
};

