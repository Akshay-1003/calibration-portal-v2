import { create } from 'zustand';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import {
    DEFAULT_BULK_FETCH_LIMIT,
    extractPaginatedList,
} from '../utils/paginatedResponse';

// API Response Schema (actual API structure)
export interface TaperThreadReadingsApiResponse {
    id: string;
    gauge_type: string;
    gauge_sub_type?: string;
    standard_specification: string;
    pitch_dial: {
        max_diameter: number;
        min_diameter: number;
    };
    max_step: string | number;
    basic_step: string | number;
    min_step: string | number;
    total_length: string | number;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    archived: boolean;
}

// Store Data Interface (flattened for easier table display)
export interface TaperThreadReadingsData {
    id: string;
    gauge_type: string;
    gauge_sub_type?: string;
    standard_specification: string;
    // Pitch Dial
    pitch_dial_max: number | string;
    pitch_dial_min: number | string;
    // Max Step
    max_step: number | string;
    // Basic Step
    basic_step: number | string;
    // Min Step
    min_step: number | string;
    // Total Length
    total_length: number | string;
    created_at: string;
    updated_at?: string;
    deleted_at?: string | null;
    archived: boolean;
}

// Form Data Interface (flat structure for easier form handling)
export interface TaperThreadReadingsFormData {
    gauge_type: string;
    gauge_sub_type?: string;
    standard_specification: string;
    pitch_dial_max: string;
    pitch_dial_min: string;
    max_step: string;
    basic_step: string;
    min_step: string;
    total_length: string;
}

// Helper to parse value (handle "nan" string)
const parseApiValue = (value: string | number | null | undefined): string | number => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && value.toLowerCase() === 'nan') return '';
    return value;
};

// Transform API response to store format
export const transformApiResponseToStoreData = (apiData: TaperThreadReadingsApiResponse): TaperThreadReadingsData => {
    return {
        id: apiData.id,
        gauge_type: apiData.gauge_type || '',
        gauge_sub_type: apiData.gauge_sub_type || '',
        standard_specification: apiData.standard_specification || '',
        pitch_dial_max: apiData.pitch_dial?.max_diameter ?? '',
        pitch_dial_min: apiData.pitch_dial?.min_diameter ?? '',
        max_step: parseApiValue(apiData.max_step),
        basic_step: parseApiValue(apiData.basic_step),
        min_step: parseApiValue(apiData.min_step),
        total_length: parseApiValue(apiData.total_length),
        created_at: apiData.created_at,
        updated_at: apiData.updated_at,
        deleted_at: apiData.deleted_at,
        archived: apiData.archived,
    };
};

// Helper to format value for API (empty string -> "nan", number stays number)
const formatApiValue = (value: string | number): string | number => {
    if (value === '' || value === null || value === undefined) return 'nan';
    if (typeof value === 'string' && value.trim() === '') return 'nan';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? 'nan' : num;
};

// Transform form data to API format
export const transformFormDataToApiFormat = (formData: TaperThreadReadingsFormData): Omit<TaperThreadReadingsApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'> => {
    const parseNumber = (value: string | number): number => {
        if (typeof value === 'number') return value;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    };

    return {
        gauge_type: formData.gauge_type || '',
        gauge_sub_type: formData.gauge_sub_type || undefined,
        standard_specification: formData.standard_specification || '',
        pitch_dial: {
            max_diameter: parseNumber(formData.pitch_dial_max),
            min_diameter: parseNumber(formData.pitch_dial_min),
        },
        max_step: formatApiValue(formData.max_step),
        basic_step: formatApiValue(formData.basic_step),
        min_step: formatApiValue(formData.min_step),
        total_length: formatApiValue(formData.total_length),
    };
};

// Transform API response to form data
export const transformApiResponseToFormData = (apiData: TaperThreadReadingsApiResponse): TaperThreadReadingsFormData => {
    const parseValue = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.toLowerCase() === 'nan') return '';
        return String(value);
    };

    return {
        gauge_type: apiData.gauge_type || '',
        gauge_sub_type: apiData.gauge_sub_type || '',
        standard_specification: apiData.standard_specification || '',
        pitch_dial_max: String(apiData.pitch_dial?.max_diameter ?? ''),
        pitch_dial_min: String(apiData.pitch_dial?.min_diameter ?? ''),
        max_step: parseValue(apiData.max_step),
        basic_step: parseValue(apiData.basic_step),
        min_step: parseValue(apiData.min_step),
        total_length: parseValue(apiData.total_length),
    };
};

interface TaperThreadReadingsState {
    taperThreadReadings: TaperThreadReadingsData[];
    loading: boolean;
    error: string | null;
    lastFetchTime: number | null;
    CACHE_DURATION: number;
    fetchTaperThreadReadings: () => Promise<void>;
    deleteTaperThreadReading: (standardSpecification: string) => Promise<void>;
    refreshTaperThreadReadings: () => Promise<void>;
    updateTaperThreadReading: (data: TaperThreadReadingsApiResponse) => void;
    addTaperThreadReading: (data: TaperThreadReadingsApiResponse) => void;
    isDataStale: () => boolean;
}

export const useTaperThreadReadingsStore = create<TaperThreadReadingsState>((set, get) => ({
    taperThreadReadings: [],
    loading: false,
    error: null,
    lastFetchTime: null,
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

    isDataStale: () => {
        const { lastFetchTime, CACHE_DURATION } = get();
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > CACHE_DURATION;
    },

    fetchTaperThreadReadings: async () => {
        const { isDataStale, lastFetchTime } = get();

        // Only skip fetch if data is fresh AND we have data (not empty)
        if (!isDataStale() && lastFetchTime && get().taperThreadReadings.length > 0) {
            console.log('Using cached taper thread readings data');
            return;
        }

        set({ loading: true, error: null });
        try {
            const queryParams = new URLSearchParams({
                page: "0",
                limit: String(DEFAULT_BULK_FETCH_LIMIT),
            });
            const response = await apiClient.get(`/taper-thread/specifications?${queryParams.toString()}`) as any;
            console.log('Taper thread readings response:', response);

            const result = extractPaginatedList<TaperThreadReadingsData>(response, {
                arrayKeys: ['data', 'items', 'taper_thread_readings', 'specifications'],
                mapItem: (item) => transformApiResponseToStoreData(item as TaperThreadReadingsApiResponse),
                fallbackPage: 0,
                fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
            });

            // Transform API response to store format
            const taperThreadReadingsData = result.items;

            set({
                taperThreadReadings: taperThreadReadingsData,
                loading: false,
                lastFetchTime: Date.now()
            });
        } catch (error) {
            console.error("Error fetching taper thread readings:", error);
            const errorMessage = "Failed to fetch taper thread readings data";
            set({
                error: errorMessage,
                loading: false,
                taperThreadReadings: []
            });
        }
    },

    refreshTaperThreadReadings: async () => {
        set({ lastFetchTime: null });
        await get().fetchTaperThreadReadings();
    },

    deleteTaperThreadReading: async (standardSpecification: string) => {
        try {
            await apiClient.delete(`/taper-thread/specifications/${standardSpecification}`);
            
            // Optimistic update - remove immediately
            set((state) => ({
                taperThreadReadings: state.taperThreadReadings.filter((item) => item.standard_specification !== standardSpecification),
            }));
            
            toast.success("Taper Thread Reading deleted successfully!");
        } catch (error) {
            console.error("Error deleting taper thread reading:", error);
            toast.error("Failed to delete Taper Thread Reading");
            throw error;
        }
    },

    // Optimistically update a taper thread reading in the store (for edit)
    updateTaperThreadReading: (apiData: TaperThreadReadingsApiResponse) => {
        const transformedData = transformApiResponseToStoreData(apiData);
        set((state) => ({
            taperThreadReadings: state.taperThreadReadings.map((item) =>
                item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
                    ? transformedData
                    : item
            ),
            lastFetchTime: Date.now(),
        }));
    },

    // Optimistically add a new taper thread reading to the store (for create)
    addTaperThreadReading: (apiData: TaperThreadReadingsApiResponse) => {
        const transformedData = transformApiResponseToStoreData(apiData);
        set((state) => {
            const exists = state.taperThreadReadings.some(
                (item) => item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
            );
            return {
                taperThreadReadings: exists
                    ? state.taperThreadReadings.map((item) =>
                          item.id === transformedData.id || item.standard_specification === transformedData.standard_specification
                              ? transformedData
                              : item
                      )
                    : [transformedData, ...state.taperThreadReadings],
                lastFetchTime: Date.now(),
            };
        });
    },
}));
