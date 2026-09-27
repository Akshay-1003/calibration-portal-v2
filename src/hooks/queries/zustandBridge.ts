/**
 * Zustand-TanStack Query Bridge
 * Syncs TanStack Query data to Zustand stores for backward compatibility
 * This allows gradual migration without breaking existing code
 */

import { useEffect, useRef } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Hook to sync TanStack Query data to a Zustand store
 * 
 * @param queryResult - The result from a TanStack Query hook
 * @param syncToStore - Function that updates the Zustand store with the query data
 * @param enabled - Whether to enable syncing (default: true)
 * 
 * @example
 * ```tsx
 * const query = useOrganizationsQuery();
 * useSyncQueryToStore(
 *   query,
 *   (data) => useOrganizationStore.getState().setOrganizations(data)
 * );
 * ```
 */
export function useSyncQueryToStore<TData>(
  queryResult: UseQueryResult<TData>,
  syncToStore: (data: TData) => void,
  enabled: boolean = true
) {
  const syncRef = useRef(syncToStore);

  useEffect(() => {
    syncRef.current = syncToStore;
  }, [syncToStore]);

  useEffect(() => {
    if (!enabled || !queryResult.data) return;

    syncRef.current(queryResult.data);
  }, [queryResult.data, enabled]);
}

/**
 * Hook to sync TanStack Query loading state to a Zustand store
 */
export function useSyncQueryLoadingToStore(
  queryResult: UseQueryResult<unknown>,
  setLoading: (loading: boolean) => void,
  enabled: boolean = true
) {
  const setLoadingRef = useRef(setLoading);

  useEffect(() => {
    setLoadingRef.current = setLoading;
  }, [setLoading]);

  useEffect(() => {
    if (!enabled) return;

    setLoadingRef.current(queryResult.isLoading || queryResult.isFetching);
  }, [queryResult.isLoading, queryResult.isFetching, enabled]);
}

/**
 * Hook to sync TanStack Query error state to a Zustand store
 */
export function useSyncQueryErrorToStore(
  queryResult: UseQueryResult<unknown>,
  setError: (error: string | null) => void,
  enabled: boolean = true
) {
  const setErrorRef = useRef(setError);

  useEffect(() => {
    setErrorRef.current = setError;
  }, [setError]);

  useEffect(() => {
    if (!enabled) return;

    const errorMessage = queryResult.error
      ? (queryResult.error as Error).message || 'An error occurred'
      : null;

    setErrorRef.current(errorMessage);
  }, [queryResult.error, enabled]);
}

/**
 * Combined hook that syncs all query states to a Zustand store
 * This is the recommended way to bridge queries to stores
 */
export function useBridgeQueryToStore<TData>(
  queryResult: UseQueryResult<TData>,
  storeSync: {
    setData: (data: TData) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
  },
  enabled: boolean = true
) {
  useSyncQueryToStore(queryResult, storeSync.setData, enabled);
  useSyncQueryLoadingToStore(queryResult, storeSync.setLoading, enabled);
  useSyncQueryErrorToStore(queryResult, storeSync.setError, enabled);
}





