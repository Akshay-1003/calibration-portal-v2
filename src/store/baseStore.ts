/**
 * Base Store Implementation
 * Provides common functionality for all Zustand stores
 */

import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { StoreCache, InFlightManager } from '../utils/storeCache';
import { createCrudActions, CrudActions, CrudState } from '../utils/storeCrud';

export interface BaseStoreConfig {
  name: string;
  cacheTTL?: number;
  enableDevtools?: boolean;
}

export interface BaseStoreState {
  // Cache management
  _cache: StoreCache;
  _inFlight: InFlightManager;
  
  // Utility methods
  clearAllCaches: () => void;
  getCacheStats: () => any;
  cleanup: () => void;
}

/**
 * Creates a base store with common functionality
 */
export function createBaseStore<T extends BaseStoreState>(
  config: BaseStoreConfig,
  storeImplementation: (
    set: any,
    get: any,
    cache: StoreCache,
    inFlight: InFlightManager
  ) => Omit<T, keyof BaseStoreState>
) {
  const cache = new StoreCache({ ttl: config.cacheTTL });
  const inFlight = new InFlightManager();

  const storeCreator = config.enableDevtools !== false
      ? devtools(
          immer((set, get) => ({
            // Base functionality
            _cache: cache,
            _inFlight: inFlight,

            clearAllCaches: () => {
              cache.clear();
              inFlight.cancelAll();
            },

            getCacheStats: () => cache.getStats(),

            cleanup: () => {
              cache.cleanup();
            },

            // Store-specific implementation
            ...storeImplementation(set, get, cache, inFlight)
          } as T)),
          { name: config.name }
        )
      : immer((set, get) => ({
          _cache: cache,
          _inFlight: inFlight,

          clearAllCaches: () => {
            cache.clear();
            inFlight.cancelAll();
          },

          getCacheStats: () => cache.getStats(),

          cleanup: () => {
            cache.cleanup();
          },

          ...storeImplementation(set, get, cache, inFlight)
        } as T));

  const store = create<T>()(
    storeCreator as unknown as StateCreator<
      T,
      [],
      [["zustand/devtools", never], ["zustand/immer", never]]
    >
  );

  return store;
}

/**
 * Creates a CRUD store with standardized operations
 */
export function createCrudStore<
  T extends { id: string },
  CreateData = Partial<T>,
  UpdateData = Partial<T>
>(
  config: BaseStoreConfig & {
    endpoint: string;
    entityName: string;
    cacheKey?: string;
  }
) {
  const cacheKey = config.cacheKey || config.entityName.toLowerCase();

  interface CrudStoreState extends BaseStoreState, CrudState<T> {
    actions: CrudActions<T, CreateData, UpdateData>;
  }

  return createBaseStore<CrudStoreState>(config, (set, get, cache, inFlight) => {
    const actions = createCrudActions<T, CreateData, UpdateData>(
      {
        endpoint: config.endpoint,
        cache,
        inFlight,
        cacheKey,
        entityName: config.entityName
      },
      set,
      get
    );

    return {
      // State
      items: [] as T[],
      loading: false,
      error: null,

      // Actions
      actions
    };
  });
}

/**
 * Selector utilities for optimized re-renders
 */
export const createSelectors = <T extends Record<string, any>>(store: any) => {
  const selectors = {} as {
    [K in keyof T]: () => T[K];
  };

  Object.keys(store.getState()).forEach((key) => {
    (selectors as any)[key] = () => store((state: T) => state[key]);
  });

  return selectors;
};

/**
 * Hook for subscribing to specific store slices
 */
export function useStoreSlice<T, K>(
  store: any,
  selector: (state: T) => K,
  equalityFn?: (a: K, b: K) => boolean
): K {
  return store(selector, equalityFn);
}

/**
 * Batch update utility
 */
export function batchUpdates<T>(
  setState: (updater: (state: T) => void) => void,
  updates: Array<(state: T) => void>
) {
  setState((state) => {
    updates.forEach(update => update(state));
  });
}

/**
 * Optimized array operations for large datasets
 */
export const arrayUtils = {
  /**
   * Efficient item update in large arrays
   */
  updateItem: <T extends { id: string }>(
    items: T[],
    id: string,
    updates: Partial<T>
  ): T[] => {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return items;

    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    return newItems;
  },

  /**
   * Efficient item removal from large arrays
   */
  removeItem: <T extends { id: string }>(items: T[], id: string): T[] => {
    return items.filter(item => item.id !== id);
  },

  /**
   * Efficient item addition to large arrays
   */
  addItem: <T extends { id: string }>(
    items: T[],
    newItem: T,
    position: 'start' | 'end' = 'start'
  ): T[] => {
    return position === 'start' ? [newItem, ...items] : [...items, newItem];
  },

  /**
   * Efficient search in large arrays
   */
  searchItems: <T>(
    items: T[],
    searchTerm: string,
    searchFields: Array<keyof T>
  ): T[] => {
    if (!searchTerm) return items;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter(item =>
      searchFields.some(field => {
        const value = item[field];
        return typeof value === 'string' && 
               value.toLowerCase().includes(lowerSearchTerm);
      })
    );
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Measure store operation performance
   */
  measureOperation: async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      // Import logger here to avoid circular dependency
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`Store operation "${operationName}" took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      // eslint-disable-next-line no-console
      console.error(`Store operation "${operationName}" failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  },

  /**
   * Debounce store operations
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }
};
