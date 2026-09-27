import { create } from 'zustand';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import {
    DEFAULT_BULK_FETCH_LIMIT,
} from '../utils/paginatedResponse';
import { fetchAllThreadRingPlugs } from '../services/threadRingPlugSpecifications';

// API Response Schema (nested structure)
export interface ThreadRingPlugApiResponse {
    id: string;
    gauge_type: string;
    standard_specification: string;
    specification_table: {
        go: {
            max_wear_limit: number;
            min_wear_limit: number;
            wear_limit: number;
        };
        no_go: {
            max_wear_limit: number;
            min_wear_limit: number;
            wear_limit: number;
        };
    };
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    archived: boolean;
}

// Store Data Interface (flattened for easier table display)
export interface ThreadRingPlugData {
    id: string;
    gauge_type: string;
    standard_specification: string;
    // Go specifications
    go_max_wear_limit: number | string;
    go_min_wear_limit: number | string;
    go_wear_limit: number | string;
    // No Go specifications
    no_go_max_wear_limit: number | string;
    no_go_min_wear_limit: number | string;
    no_go_wear_limit: number | string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    archived: boolean;
}

// Form Data Interface (flat structure for easier form handling)
export interface ThreadRingPlugFormData {
    gauge_type: string;
    standard_specification: string;
    go_max_wear_limit: string;
    go_min_wear_limit: string;
    go_wear_limit: string;
    no_go_max_wear_limit: string;
    no_go_min_wear_limit: string;
    no_go_wear_limit: string;
}

// Transform API response to store format
export const transformApiResponseToStoreData = (apiData: ThreadRingPlugApiResponse): ThreadRingPlugData => {
    return {
        id: apiData.id,
        gauge_type: apiData.gauge_type,
        standard_specification: apiData.standard_specification || '',
        go_max_wear_limit: apiData.specification_table?.go?.max_wear_limit ?? '',
        go_min_wear_limit: apiData.specification_table?.go?.min_wear_limit ?? '',
        go_wear_limit: apiData.specification_table?.go?.wear_limit ?? '',
        no_go_max_wear_limit: apiData.specification_table?.no_go?.max_wear_limit ?? '',
        no_go_min_wear_limit: apiData.specification_table?.no_go?.min_wear_limit ?? '',
        no_go_wear_limit: apiData.specification_table?.no_go?.wear_limit ?? '',
        created_at: apiData.created_at,
        updated_at: apiData.updated_at,
        deleted_at: apiData.deleted_at,
        archived: apiData.archived,
    };
};

// Transform form data to API format (flat -> nested)
export const transformFormDataToApiFormat = (formData: ThreadRingPlugFormData): Omit<ThreadRingPlugApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'> => {
    const parseNumber = (value: string | number): number => {
        if (typeof value === 'number') return value;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    };

    return {
        gauge_type: formData.gauge_type,
        standard_specification: formData.standard_specification || '',
        specification_table: {
            go: {
                max_wear_limit: parseNumber(formData.go_max_wear_limit),
                min_wear_limit: parseNumber(formData.go_min_wear_limit),
                wear_limit: parseNumber(formData.go_wear_limit),
            },
            no_go: {
                max_wear_limit: parseNumber(formData.no_go_max_wear_limit),
                min_wear_limit: parseNumber(formData.no_go_min_wear_limit),
                wear_limit: parseNumber(formData.no_go_wear_limit),
            },
        },
    };
};

// Transform API response to form data (nested -> flat)
export const transformApiResponseToFormData = (apiData: ThreadRingPlugApiResponse): ThreadRingPlugFormData => {
    return {
        gauge_type: apiData.gauge_type || '',
        standard_specification: apiData.standard_specification || '',
        go_max_wear_limit: String(apiData.specification_table?.go?.max_wear_limit ?? ''),
        go_min_wear_limit: String(apiData.specification_table?.go?.min_wear_limit ?? ''),
        go_wear_limit: String(apiData.specification_table?.go?.wear_limit ?? ''),
        no_go_max_wear_limit: String(apiData.specification_table?.no_go?.max_wear_limit ?? ''),
        no_go_min_wear_limit: String(apiData.specification_table?.no_go?.min_wear_limit ?? ''),
        no_go_wear_limit: String(apiData.specification_table?.no_go?.wear_limit ?? ''),
    };
};

interface ThreadRingPlugState {
    threadRingPlugs: ThreadRingPlugData[];
    loading: boolean;
    error: string | null;
    lastFetchTime: number | null;
    CACHE_DURATION: number;
    fetchThreadRingPlugs: () => Promise<void>;
    deleteThreadRingPlug: (id: string) => Promise<void>;
    refreshThreadRingPlugs: () => Promise<void>;
    updateThreadRingPlug: (data: ThreadRingPlugApiResponse) => void;
    addThreadRingPlug: (data: ThreadRingPlugApiResponse) => void;
    isDataStale: () => boolean;
}

export const useThreadRingPlugStore = create<ThreadRingPlugState>((set, get) => ({
    threadRingPlugs: [],
    loading: false,
    error: null,
    lastFetchTime: null,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    isDataStale: () => {
        const { lastFetchTime, CACHE_DURATION } = get();
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > CACHE_DURATION;
    },

    fetchThreadRingPlugs: async () => {
        const { isDataStale, lastFetchTime } = get();

        // Only skip fetch if data is fresh AND we have data (not empty)
        if (!isDataStale() && lastFetchTime && get().threadRingPlugs.length > 0) {
            console.log('Using cached thread ring/plug data');
            return;
        }

        set({ loading: true, error: null });
        try {
            const threadRingPlugData = await fetchAllThreadRingPlugs({
                limit: DEFAULT_BULK_FETCH_LIMIT,
            });

            set({
                threadRingPlugs: threadRingPlugData,
                loading: false,
                lastFetchTime: Date.now()
            });
        } catch (error) {
            console.error("Error fetching thread ring/plugs:", error);
            const errorMessage = "Failed to fetch thread ring/plug data";
            set({
                error: errorMessage,
                loading: false,
                threadRingPlugs: []
            });
        }
    },

    refreshThreadRingPlugs: async () => {
        set({ lastFetchTime: null });
        await get().fetchThreadRingPlugs();
    },

    deleteThreadRingPlug: async (id: string) => {
        try {
            await apiClient.delete(`/plain-thread/specifications/${id}`);
            
            // Optimistic update - remove immediately
            set((state) => ({
                threadRingPlugs: state.threadRingPlugs.filter((item) => item.id !== id),
            }));
            
            toast.success("Thread Ring/Plug deleted successfully!");
        } catch (error) {
            console.error("Error deleting thread ring/plug:", error);
            toast.error("Failed to delete Thread Ring/Plug");
            throw error;
        }
    },

    // Optimistically update a thread ring/plug in the store (for edit)
    // This updates the cache timestamp to prevent unnecessary refetches
    updateThreadRingPlug: (apiData: ThreadRingPlugApiResponse) => {
        const transformedData = transformApiResponseToStoreData(apiData);
        set((state) => ({
            threadRingPlugs: state.threadRingPlugs.map((item) =>
                item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
                    ? transformedData
                    : item
            ),
            // Update cache timestamp since we just updated the data
            lastFetchTime: Date.now(),
        }));
    },

    // Optimistically add a new thread ring/plug to the store (for create)
    // This updates the cache timestamp to prevent unnecessary refetches
    addThreadRingPlug: (apiData: ThreadRingPlugApiResponse) => {
        const transformedData = transformApiResponseToStoreData(apiData);
        set((state) => {
            // Check if item already exists (prevent duplicates)
            const exists = state.threadRingPlugs.some(
                (item) => item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
            );
            return {
                threadRingPlugs: exists
                    ? state.threadRingPlugs.map((item) =>
                          item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
                              ? transformedData
                              : item
                      )
                    : [transformedData, ...state.threadRingPlugs],
                // Update cache timestamp since we just added new data
                lastFetchTime: Date.now(),
            };
        });
    },
}));
