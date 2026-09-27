import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type SortDirection = 'ascending' | 'descending';

export interface TableUrlState {
  page: number;
  rowsPerPage: number;
  query: string;
  sort?: {
    column: string;
    direction: SortDirection;
  };
}

interface UseTableUrlStateOptions {
  /**
   * Prefix to avoid collisions when multiple tables exist on the same route.
   * Example: "inward", "customers"
   */
  prefix: string;
  defaultPage?: number;
  defaultRowsPerPage?: number;
  defaultQuery?: string;
}

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.floor(parsed);
  if (rounded < 1) return fallback;
  return rounded;
};

const clampRowsPerPage = (value: number, fallback: number) => {
  const allowed = new Set([10, 20, 25, 50, 100]);
  if (allowed.has(value)) return value;
  return fallback;
};

export const useTableUrlState = ({
  prefix,
  defaultPage = 1,
  defaultRowsPerPage = 10,
  defaultQuery = '',
}: UseTableUrlStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  // React Router does not queue same-tick search-parameter updates. Keep the
  // latest pending value so related table updates (for example query + page)
  // are merged before navigation is committed.
  searchParamsRef.current = searchParams;

  const keys = useMemo(
    () => ({
      page: `${prefix}_page`,
      rpp: `${prefix}_rpp`,
      q: `${prefix}_q`,
      sortCol: `${prefix}_sortCol`,
      sortDir: `${prefix}_sortDir`,
    }),
    [prefix],
  );

  const state: TableUrlState = useMemo(() => {
    const page = parsePositiveInt(searchParams.get(keys.page), defaultPage);
    const rowsPerPageRaw = parsePositiveInt(searchParams.get(keys.rpp), defaultRowsPerPage);
    const rowsPerPage = clampRowsPerPage(rowsPerPageRaw, defaultRowsPerPage);
    const query = (searchParams.get(keys.q) ?? defaultQuery).trim();

    const sortCol = (searchParams.get(keys.sortCol) ?? '').trim();
    const sortDir = (searchParams.get(keys.sortDir) ?? '').trim() as SortDirection | '';
    const sort =
      sortCol && (sortDir === 'ascending' || sortDir === 'descending')
        ? { column: sortCol, direction: sortDir }
        : undefined;

    return {
      page,
      rowsPerPage,
      query,
      sort,
    };
  }, [
    searchParams,
    keys.page,
    keys.rpp,
    keys.q,
    keys.sortCol,
    keys.sortDir,
    defaultPage,
    defaultRowsPerPage,
    defaultQuery,
  ]);

  const updateParams = useCallback(
    (updater: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParamsRef.current);
      updater(next);
      searchParamsRef.current = next;
      setSearchParams(next, { replace: true });
    },
    [setSearchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      const nextPage = page < 1 ? defaultPage : Math.floor(page);
      updateParams((sp) => {
        if (nextPage === defaultPage) sp.delete(keys.page);
        else sp.set(keys.page, String(nextPage));
      });
    },
    [defaultPage, keys.page, updateParams],
  );

  const setRowsPerPage = useCallback(
    (rowsPerPage: number) => {
      const nextRowsPerPage = clampRowsPerPage(Math.floor(rowsPerPage), defaultRowsPerPage);
      updateParams((sp) => {
        if (nextRowsPerPage === defaultRowsPerPage) sp.delete(keys.rpp);
        else sp.set(keys.rpp, String(nextRowsPerPage));
      });
    },
    [defaultRowsPerPage, keys.rpp, updateParams],
  );

  const setQuery = useCallback(
    (query: string) => {
      const nextQuery = query.trim();
      updateParams((sp) => {
        if (!nextQuery) sp.delete(keys.q);
        else sp.set(keys.q, nextQuery);
      });
    },
    [keys.q, updateParams],
  );

  const setSort = useCallback(
    (sort: TableUrlState['sort']) => {
      updateParams((sp) => {
        if (!sort) {
          sp.delete(keys.sortCol);
          sp.delete(keys.sortDir);
          return;
        }
        sp.set(keys.sortCol, sort.column);
        sp.set(keys.sortDir, sort.direction);
      });
    },
    [keys.sortCol, keys.sortDir, updateParams],
  );

  return {
    state,
    setPage,
    setRowsPerPage,
    setQuery,
    setSort,
  };
};





