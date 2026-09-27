import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface DateFilterState {
  inward_date_from?: string;
  inward_date_to?: string;
}

interface UseDateFilterUrlStateOptions {
  /**
   * Prefix to avoid collisions when multiple date filters exist on the same route.
   * Example: "inward", "calibration"
   */
  prefix: string;
}

/**
 * Hook to manage date filter state in URL query parameters.
 * This ensures filters persist across navigation until hard refresh or unmount.
 * 
 * @example
 * const { filters, setFilters, clearFilters } = useDateFilterUrlState({ prefix: 'inward' });
 */
export const useDateFilterUrlState = ({ prefix }: UseDateFilterUrlStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const keys = useMemo(
    () => ({
      dateFrom: `${prefix}_date_from`,
      dateTo: `${prefix}_date_to`,
    }),
    [prefix],
  );

  const filters: DateFilterState = useMemo(() => {
    const inward_date_from = searchParams.get(keys.dateFrom) || undefined;
    const inward_date_to = searchParams.get(keys.dateTo) || undefined;

    return {
      ...(inward_date_from && { inward_date_from }),
      ...(inward_date_to && { inward_date_to }),
    };
  }, [searchParams, keys.dateFrom, keys.dateTo]);

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

  const setFilters = useCallback(
    (newFilters: DateFilterState | undefined) => {
      updateParams((sp) => {
        if (!newFilters || (!newFilters.inward_date_from && !newFilters.inward_date_to)) {
          // Clear filters if undefined or both empty
          sp.delete(keys.dateFrom);
          sp.delete(keys.dateTo);
        } else {
          // Set or clear individual filter values
          if (newFilters.inward_date_from) {
            sp.set(keys.dateFrom, newFilters.inward_date_from);
          } else {
            sp.delete(keys.dateFrom);
          }

          if (newFilters.inward_date_to) {
            sp.set(keys.dateTo, newFilters.inward_date_to);
          } else {
            sp.delete(keys.dateTo);
          }
        }
      });
    },
    [keys.dateFrom, keys.dateTo, updateParams],
  );

  const clearFilters = useCallback(() => {
    setFilters(undefined);
  }, [setFilters]);

  const hasFilters = useMemo(() => {
    return !!(filters.inward_date_from || filters.inward_date_to);
  }, [filters]);

  return {
    filters: hasFilters ? filters : undefined,
    setFilters,
    clearFilters,
    hasFilters,
  };
};




