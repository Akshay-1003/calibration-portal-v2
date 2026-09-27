/**
 * Standardized CRUD Operations for Zustand Stores
 * Provides consistent patterns for Create, Read, Update, Delete operations
 */

import { toast } from 'sonner';
import { apiClient } from '../services/api';
import { StoreCache, InFlightManager } from './storeCache';

export interface CrudConfig<T> {
  endpoint: string;
  cache: StoreCache<T[]>;
  inFlight: InFlightManager;
  cacheKey: string;
  entityName: string; // For toast messages
}

export interface CrudState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export interface CrudActions<T extends { id: string }, CreateData = Partial<T>, UpdateData = Partial<T>> {
  fetch: (forceRefresh?: boolean) => Promise<T[]>;
  create: (data: CreateData) => Promise<T | null>;
  update: (id: string, data: UpdateData) => Promise<T | null>;
  delete: (id: string) => Promise<boolean>;
  getById: (id: string) => T | undefined;
  refresh: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
}

/**
 * Creates standardized CRUD actions for a Zustand store
 */
export function createCrudActions<T extends { id: string }, CreateData = Partial<T>, UpdateData = Partial<T>>(
  config: CrudConfig<T>,
  setState: (updater: (state: any) => any) => void,
  getState: () => any
): CrudActions<T, CreateData, UpdateData> {
  
  const { endpoint, cache, inFlight, cacheKey, entityName } = config;

  return {
    /**
     * Fetch all items with caching and deduplication
     */
    fetch: async (forceRefresh = false) => {
      // Check cache first
      if (!forceRefresh) {
        const cached = cache.get(cacheKey);
        if (cached) {
          setState(state => ({ ...state, items: cached }));
          return cached;
        }
      }

      // Use in-flight manager to prevent duplicate requests
      return inFlight.getOrCreate(cacheKey, async () => {
        setState(state => ({ ...state, loading: true, error: null }));

        try {
          const response = await apiClient.get(endpoint);
          const items = Array.isArray(response) ? response : (response?.data || []);

          // Update cache and state
          cache.set(cacheKey, items);
          setState(state => ({ 
            ...state, 
            items, 
            loading: false 
          }));

          return items;
        } catch (error) {
          const errorMessage = `Failed to fetch ${entityName}`;
          console.error(`Error fetching ${entityName}:`, error);
          
          setState(state => ({ 
            ...state, 
            loading: false, 
            error: errorMessage 
          }));
          
          toast.error(errorMessage);
          throw error;
        }
      });
    },

    /**
     * Create new item with optimistic updates
     */
    create: async (data: CreateData) => {
      try {
        const response = await apiClient.post(endpoint, data);
        const newItem = response?.data || response;

        if (!newItem?.id) {
          throw new Error('Invalid response: missing ID');
        }

        // Optimistic update: add to beginning of list
        setState(state => ({
          ...state,
          items: [newItem, ...state.items]
        }));

        // Update cache
        const currentItems = cache.get(cacheKey) || [];
        cache.set(cacheKey, [newItem, ...currentItems]);

        toast.success(`${entityName} created successfully!`);
        return newItem;
      } catch (error) {
        const errorMessage = `Failed to create ${entityName}`;
        console.error(`Error creating ${entityName}:`, error);
        toast.error(errorMessage);
        return null;
      }
    },

    /**
     * Update existing item with optimistic updates
     */
    update: async (id: string, data: UpdateData) => {
      try {
        const response = await apiClient.patch(`${endpoint}/${id}`, data);
        const updatedItem = response?.data || response;

        // Optimistic update: update specific item
        setState(state => ({
          ...state,
          items: state.items.map((item: T) =>
            item.id === id ? { ...item, ...updatedItem } : item
          )
        }));

        // Update cache
        const currentItems = cache.get(cacheKey) || [];
        const updatedItems = currentItems.map(item =>
          item.id === id ? { ...item, ...updatedItem } : item
        );
        cache.set(cacheKey, updatedItems);

        toast.success(`${entityName} updated successfully!`);
        return updatedItem;
      } catch (error) {
        const errorMessage = `Failed to update ${entityName}`;
        console.error(`Error updating ${entityName}:`, error);
        toast.error(errorMessage);
        return null;
      }
    },

    /**
     * Delete item with optimistic updates
     */
    delete: async (id: string) => {
      try {
        await apiClient.delete(`${endpoint}/${id}`);

        // Optimistic update: remove from list
        setState(state => ({
          ...state,
          items: state.items.filter((item: T) => item.id !== id)
        }));

        // Update cache
        const currentItems = cache.get(cacheKey) || [];
        const filteredItems = currentItems.filter(item => item.id !== id);
        cache.set(cacheKey, filteredItems);

        // Invalidate related caches that might reference this item
        cache.invalidatePattern(`.*${id}.*`);

        toast.success(`${entityName} deleted successfully!`);
        return true;
      } catch (error) {
        const errorMessage = `Failed to delete ${entityName}`;
        console.error(`Error deleting ${entityName}:`, error);
        toast.error(errorMessage);
        return false;
      }
    },

    /**
     * Get item by ID from current state
     */
    getById: (id: string) => {
      const state = getState();
      return state.items.find((item: T) => item.id === id);
    },

    /**
     * Force refresh data
     */
    refresh: async () => {
      cache.invalidate(cacheKey);
      await getState().fetch(true);
    },

    /**
     * Clear error state
     */
    clearError: () => {
      setState(state => ({ ...state, error: null }));
    },

    /**
     * Clear cache
     */
    clearCache: () => {
      cache.clear();
    }
  };
}

/**
 * Creates standardized loading state management
 */
export function createLoadingState() {
  return {
    loading: false,
    error: null as string | null
  };
}

/**
 * Utility for handling API response normalization
 */
export function normalizeApiResponse<T>(response: any, fallback: T[] = []): T[] {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response)) return response;
  if (response?.items && Array.isArray(response.items)) return response.items;
  return fallback;
}

/**
 * Utility for creating cache invalidation patterns
 */
export function createInvalidationPattern(entityType: string, id?: string): string {
  if (id) {
    return `${entityType}.*${id}.*|.*${id}.*${entityType}`;
  }
  return `${entityType}.*`;
}

/**
 * Batch operations helper
 */
export class BatchOperations<T extends { id: string }> {
  private operations: Array<() => Promise<any>> = [];

  add(operation: () => Promise<any>) {
    void (undefined as unknown as T);
    this.operations.push(operation);
    return this;
  }

  async execute(): Promise<any[]> {
    try {
      return await Promise.all(this.operations.map(op => op()));
    } finally {
      this.operations = [];
    }
  }

  async executeSequential(): Promise<any[]> {
    const results = [];
    try {
      for (const operation of this.operations) {
        results.push(await operation());
      }
      return results;
    } finally {
      this.operations = [];
    }
  }
}
