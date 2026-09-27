import { useAppStore } from '../store/appStore';
import { queryClient } from '../core/query/queryClient';
import { queryKeys } from '../hooks/queries/queryKeys';
import { DEFAULT_BULK_FETCH_LIMIT } from '../utils/paginatedResponse';

let preloadPromise: Promise<void> | null = null;
let preloadedForUserId: string | null = null;

/**
 * Warm up only the shared organization dataset once per authenticated session.
 * Heavier route chunks and page-specific master data are fetched on demand so
 * the first protected paint is not starved on slower HTTP environments.
 */
export const preloadPostLoginMasterData = async (userId?: string | null): Promise<void> => {
  const sessionUserId = userId ?? '__unknown_user__';

  if (preloadedForUserId === sessionUserId) {
    return;
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    const appStore = useAppStore.getState();
    const organizations = await appStore.actions.fetchOrganizations();
    const safeOrganizations = organizations ?? useAppStore.getState().organizations ?? [];

    if (safeOrganizations.length > 0) {
      queryClient.setQueryData(
        queryKeys.organizations.list({ page: 0, limit: DEFAULT_BULK_FETCH_LIMIT }),
        {
          organizations: safeOrganizations,
          total: safeOrganizations.length,
          page: 0,
          limit: DEFAULT_BULK_FETCH_LIMIT,
          totalPages: Math.max(Math.ceil(safeOrganizations.length / DEFAULT_BULK_FETCH_LIMIT), 1),
        },
      );
    }

    preloadedForUserId = sessionUserId;
  })().finally(() => {
    preloadPromise = null;
  });

  return preloadPromise;
};

export const resetPostLoginMasterDataPreload = (): void => {
  preloadedForUserId = null;
  preloadPromise = null;
};
