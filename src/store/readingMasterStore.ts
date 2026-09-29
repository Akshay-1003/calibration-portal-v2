/**
 * Reading Master Store
 * Manages reading master data and operations
 */

import { createBaseStore, BaseStoreState } from './baseStore';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';
import { toast } from 'sonner';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../utils/paginatedResponse';

export interface ReadingMaster {
  id: string;
  master_gauge_id: string;
  master_gauge_name?: string;
  readings: number[];
  range?: string;
  is_static?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReadingMasterListItem {
  id: string;
  master_gauge_id: string;
  master_gauge_name: string;
  range: string;
  created_at: string;
  reading_range: string[];
}

export interface CreateReadingMasterData {
  master_gauge_id: string;
  readings: number[];
  is_static?: boolean;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface UpdateReadingMasterData {
  master_gauge_id: string;
  readings: number[];
  is_static?: boolean;
}

interface ReadingMasterStoreState extends BaseStoreState {
  // List data
  items: ReadingMasterListItem[];
  loading: boolean;
  error: string | null;

  // Current reading master (for edit)
  currentReadingMaster: ReadingMaster | null;
  currentLoading: boolean;
  currentError: string | null;

  // Actions
  actions: {
    fetchAll: (forceRefresh?: boolean) => Promise<ReadingMasterListItem[] | undefined>;
    fetchByGaugeId: (gaugeId: string) => Promise<ReadingMaster | null>;
    create: (data: CreateReadingMasterData) => Promise<ReadingMaster | null>;
    update: (id: string, data: UpdateReadingMasterData) => Promise<ReadingMaster | null>;
    addReading: (id: string, reading: number) => Promise<void>;
    removeReading: (id: string, reading: number) => Promise<void>;
    deleteReadingMaster: (id: string) => Promise<void>;
    clearError: () => void;
    clearCurrent: () => void;
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const useReadingMasterStore = createBaseStore<ReadingMasterStoreState>(
  {
    name: 'ReadingMasterStore',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  },
  (set, get, cache, inFlight) => {
    const cacheKey = 'readingMasters';

    const buildReadingRange = (readings: number[]): string[] => {
      if (!readings || readings.length === 0) return [];
      const sorted = [...readings].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      return [String(min), String(max)];
    };

    const normalizeReadingMaster = (payload: unknown): ReadingMaster | null => {
      if (!payload) return null;
      const root = isRecord(payload) ? payload : null;
      const dataValue = root && 'data' in root ? root.data : payload;
      if (!isRecord(dataValue)) return null;
      const data = dataValue;
      if (!data) return null;
      const readings = Array.isArray(data.readings)
        ? data.readings
        : Array.isArray(data.reading_range)
        ? data.reading_range
        : [];

      return {
        id: String(data.id ?? ''),
        master_gauge_id: String(
          data.master_gauge_id ??
            data.masterGaugeId ??
            data.gauge_id ??
            (isRecord(data.master_gauge) ? data.master_gauge.id : undefined) ??
            ''
        ),
        master_gauge_name: typeof data.master_gauge_name === 'string' ? data.master_gauge_name : undefined,
        readings: readings
          .map((value: unknown) => Number(value))
          .filter((n: number) => !Number.isNaN(n)),
        range: typeof data.range === 'string' ? data.range : undefined,
        is_static: typeof data.is_static === 'boolean' ? data.is_static : undefined,
        created_at: String(data.created_at ?? ''),
        updated_at: String(data.updated_at ?? ''),
      };
    };

    return {
      // Initial state
      items: [],
      loading: false,
      error: null,
      currentReadingMaster: null,
      currentLoading: false,
      currentError: null,

      // Actions
      actions: {
        /**
         * Fetch all reading masters
         */
        fetchAll: async (forceRefresh = false) => {
          // Check cache first
          if (!forceRefresh) {
            const cached = cache.get(cacheKey) as ReadingMasterListItem[] | null;
            if (cached) {
              set((state: ReadingMasterStoreState) => ({ ...state, items: cached }));
              return;
            }
          }

          // Use in-flight manager to prevent duplicate requests
          return inFlight.getOrCreate(cacheKey, async () => {
            set((state: ReadingMasterStoreState) => ({ ...state, loading: true, error: null }));

            try {
              const queryParams = new URLSearchParams({
                page: '0',
                limit: String(DEFAULT_BULK_FETCH_LIMIT),
              });
              const response = await apiClient.get<unknown>(
                `${API_ENDPOINTS.READING_MASTER.LIST}?${queryParams.toString()}`
              );

              const items = extractPaginatedList<ReadingMasterListItem>(response, {
                arrayKeys: ['data', 'items', 'reading_masters'],
                mapItem: (item) => {
                  const readingMaster = isRecord(item) ? item : null;
                  const readings = Array.isArray(readingMaster?.readings)
                    ? readingMaster.readings
                    : Array.isArray(readingMaster?.reading_range)
                    ? readingMaster.reading_range
                    : [];

                  const normalizedReadings = readings
                    .map((value: unknown) => String(value))
                    .filter((value: string) => value !== '');

                  return {
                    id: String(readingMaster?.id ?? ''),
                    master_gauge_id: String(
                      readingMaster?.master_gauge_id ??
                      readingMaster?.masterGaugeId ??
                      readingMaster?.gauge_id ??
                      (isRecord(readingMaster?.master_gauge) ? readingMaster.master_gauge.id : undefined) ??
                      '',
                    ),
                    master_gauge_name: String(
                      readingMaster?.master_gauge_name ??
                      (isRecord(readingMaster?.master_gauge) ? readingMaster.master_gauge.name : undefined) ??
                      '',
                    ),
                    range: String(readingMaster?.range ?? ''),
                    created_at: String(readingMaster?.created_at ?? ''),
                    reading_range:
                      Array.isArray(readingMaster?.reading_range) && readingMaster.reading_range.length > 0
                        ? readingMaster.reading_range.map((value: unknown) => String(value))
                        : normalizedReadings.length > 0
                        ? [normalizedReadings[0], normalizedReadings[normalizedReadings.length - 1]]
                        : [],
                  };
                },
                fallbackPage: 0,
                fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
              }).items;

              // Update cache and state
              cache.set(cacheKey, items);
              set((state: ReadingMasterStoreState) => ({
                ...state,
                items,
                loading: false,
              }));

              return items;
            } catch (error) {
              const errorMessage = 'Failed to fetch reading masters';
              console.error('Error fetching reading masters:', error);

              set((state: ReadingMasterStoreState) => ({
                ...state,
                loading: false,
                error: errorMessage,
              }));

              toast.error(errorMessage);
              throw error;
            }
          });
        },

        /**
         * Update reading master (replace full readings + is_static)
         */
        update: async (id: string, data: UpdateReadingMasterData) => {
          try {
            const response = await apiClient.patch<unknown>(
              API_ENDPOINTS.READING_MASTER.UPDATE(id),
              {
                readings: data.readings,
                is_static: data.is_static,
              }
            );

            const updated = normalizeReadingMaster(response);

            if (updated) {
              const state = get();
              const updatedListItem: ReadingMasterListItem = {
                id: updated.id,
                master_gauge_id: updated.master_gauge_id,
                master_gauge_name: updated.master_gauge_name ?? '',
                range: updated.range ?? '',
                created_at: updated.created_at,
                reading_range: buildReadingRange(updated.readings),
              };
              const hasExistingItem = state.items.some(
                (item: ReadingMasterListItem) => item.master_gauge_id === data.master_gauge_id || item.id === updated.id
              );
              const nextItems = hasExistingItem
                ? state.items.map((item: ReadingMasterListItem) => {
                    if (item.master_gauge_id === data.master_gauge_id || item.id === updated.id) {
                      return {
                        ...item,
                        ...updatedListItem,
                        master_gauge_name: updated.master_gauge_name ?? item.master_gauge_name,
                      };
                    }
                    return item;
                  })
                : [...state.items, updatedListItem];

              set((state: ReadingMasterStoreState) => ({
                ...state,
                items: nextItems,
                currentReadingMaster: updated,
              }));

              cache.invalidate(cacheKey);
              cache.set(cacheKey, nextItems);
              cache.set(`readingMaster_${data.master_gauge_id}`, updated);
              await get().actions.fetchAll(true);
              toast.success('Reading master updated successfully!');
            }

            return updated;
          } catch (error) {
            const errorMessage = 'Failed to update reading master';
            console.error('Error updating reading master:', error);
            toast.error(errorMessage);
            return null;
          }
        },

        /**
         * Fetch reading master by gauge ID
         */
        fetchByGaugeId: async (gaugeId: string) => {
          const cacheKeyForGauge = `readingMaster_${gaugeId}`;

          // Check cache first
          const cached = cache.get(cacheKeyForGauge) as ReadingMaster | null;
          if (cached) {
            set((state: ReadingMasterStoreState) => ({
              ...state,
              currentReadingMaster: cached,
            }));
            return cached;
          }

          return inFlight.getOrCreate(cacheKeyForGauge, async () => {
            set((state: ReadingMasterStoreState) => ({
              ...state,
              currentLoading: true,
              currentError: null,
            }));

            try {
              const response = await apiClient.get<unknown>(
                API_ENDPOINTS.READING_MASTER.GET_BY_GAUGE(gaugeId)
              );

              const readingMaster = normalizeReadingMaster(response);

              if (readingMaster) {
                // Update cache and state
                cache.set(cacheKeyForGauge, readingMaster);
                set((state: ReadingMasterStoreState) => ({
                  ...state,
                  currentReadingMaster: readingMaster,
                  currentLoading: false,
                }));
              } else {
                set((state: ReadingMasterStoreState) => ({
                  ...state,
                  currentReadingMaster: null,
                  currentLoading: false,
                }));
              }

              return readingMaster;
            } catch (error) {
              const errorMessage = 'Failed to fetch reading master';
              console.error('Error fetching reading master:', error);

              set((state: ReadingMasterStoreState) => ({
                ...state,
                currentLoading: false,
                currentError: errorMessage,
                currentReadingMaster: null,
              }));

              // Don't show toast for 404 (not found)
              if (error instanceof Error && !error.message.includes('404')) {
                toast.error(errorMessage);
              }

              return null;
            }
          });
        },

        /**
         * Create new reading master
         */
        create: async (data: CreateReadingMasterData) => {
          try {
            const nowIso = new Date().toISOString();
            const payload: CreateReadingMasterData = {
              ...data,
              archived: data.archived ?? false,
              created_at: data.created_at ?? nowIso,
              updated_at: data.updated_at ?? nowIso,
              deleted_at: data.deleted_at ?? null,
            };
            const response = await apiClient.post<unknown>(
              API_ENDPOINTS.READING_MASTER.CREATE,
              payload
            );

            const newReadingMaster = normalizeReadingMaster(response);

            if (newReadingMaster) {
              // Invalidate cache
              cache.invalidate(cacheKey);
              cache.invalidate(`readingMaster_${data.master_gauge_id}`);

              // Refresh list
              await get().actions.fetchAll(true);

              toast.success('Reading master created successfully!');
            }

            return newReadingMaster;
          } catch (error) {
            const errorMessage = 'Failed to create reading master';
            console.error('Error creating reading master:', error);
            toast.error(errorMessage);
            return null;
          }
        },

        /**
         * Add reading to existing reading master
         */
        addReading: async (id: string, reading: number) => {
          try {
            await apiClient.get(
              `${API_ENDPOINTS.READING_MASTER.ADD_READING(id)}?reading=${reading}`
            );

            // Invalidate cache
            cache.invalidate(cacheKey);
            cache.invalidate(`readingMaster_${id}`);

            // Refresh current if it matches
            const current = get().currentReadingMaster;
            if (current && current.id === id) {
              await get().actions.fetchByGaugeId(current.master_gauge_id);
            }

            toast.success('Reading added successfully!');
          } catch (error) {
            const errorMessage = 'Failed to add reading';
            console.error('Error adding reading:', error);
            toast.error(errorMessage);
            throw error;
          }
        },

        /**
         * Remove reading from reading master
         */
        removeReading: async (id: string, reading: number) => {
          try {
            await apiClient.get(
              `${API_ENDPOINTS.READING_MASTER.REMOVE_READING(id)}?reading=${reading}`
            );

            // Invalidate cache
            cache.invalidate(cacheKey);
            cache.invalidate(`readingMaster_${id}`);

            // Refresh current if it matches
            const current = get().currentReadingMaster;
            if (current && current.id === id) {
              await get().actions.fetchByGaugeId(current.master_gauge_id);
            }

            toast.success('Reading removed successfully!');
          } catch (error) {
            const errorMessage = 'Failed to remove reading';
            console.error('Error removing reading:', error);
            toast.error(errorMessage);
            throw error;
          }
        },

        /**
         * Clear error state
         */
        clearError: () => {
          set((state: ReadingMasterStoreState) => ({
            ...state,
            error: null,
            currentError: null,
          }));
        },
        deleteReadingMaster: async (id: string) => {
          try {
            await apiClient.delete(API_ENDPOINTS.READING_MASTER.DELETE(id));
            set((state: ReadingMasterStoreState) => ({
              ...state,
              items: state.items.filter((item: ReadingMasterListItem) => item.id !== id),
            }));
            cache.invalidate(cacheKey);
            cache.invalidate(`readingMaster_${id}`);
            toast.success('Reading master deleted successfully!');
          } catch (error) {
            console.error('Error deleting reading master:', error);
            toast.error('Failed to delete reading master');
            throw error;
          }
        },
        /**
         * Clear current reading master
         */
        clearCurrent: () => {
          set((state: ReadingMasterStoreState) => ({
            ...state,
            currentReadingMaster: null,
            currentError: null,
          }));
        },
      },
    };
  }
);
