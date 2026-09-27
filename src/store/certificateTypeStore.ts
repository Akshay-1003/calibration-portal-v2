import { create } from 'zustand';
import { apiClient } from '../services/api';
import { toast } from 'sonner';

export interface CertificateType {
  id: string;
  name: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  calculation_methods: string[] | null;
  input_format: {
    gaugeName: string;
    format: {
      columns: Array<{
        key: string;
        label: string;
        type: string;
        editable: boolean;
      }>;
      rows: Array<{
        parameter: string;
        basic_size: string;
        specMax: string;
        specMin: string;
        wearLimit: string;
      }>;
    };
  };
  reading_format: {
    gaugeName: string;
    format: {
      columns: Array<{
        key: string;
        label: string;
        type: string;
        editable: boolean;
      }>;
      rows: Array<{
        parameter: string;
        basic_size: string;
        specMax: string;
        specMin: string;
        wearLimit: string;
      }>;
    };
  };
}

interface CertificateTypeState {
  // Data
  certificateTypes: CertificateType[];
  
  // Loading states
  loading: boolean;
  
  // Error states
  error: string | null;
  
  // Cache management
  lastFetch: number | null;
  cacheDuration: number;
  inFlightRequest: Promise<CertificateType[]> | null;
  
  // Actions
  fetchAllCertificateTypes: (forceRefresh?: boolean) => Promise<CertificateType[]>;
  getCertificateTypeById: (id: string) => CertificateType | undefined;
  getCertificateTypeNameById: (id: string) => string;
  refreshCertificateTypes: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
  isDataStale: () => boolean;
}

export const useCertificateTypeStore = create<CertificateTypeState>((set, get) => ({
  // Initial state
  certificateTypes: [],
  loading: false,
  error: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  inFlightRequest: null,

  // Fetch all certificate types
  fetchAllCertificateTypes: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // Check if we have recent data and not forcing refresh
    if (!forceRefresh && state.lastFetch && (now - state.lastFetch) < state.cacheDuration) {
      console.log('Using cached certificate types');
      return state.certificateTypes;
    }

    // Check if there's already an in-flight request
    if (state.inFlightRequest) {
      console.log('Reusing in-flight request for certificate types');
      try {
        return await state.inFlightRequest;
      } catch (error) {
        console.error('In-flight request failed, making new request:', error);
        // Continue to make a new request below
      }
    }

    // Create new request promise
    const requestPromise = (async (): Promise<CertificateType[]> => {
      set({ loading: true, error: null });
    
      try {
          const response = await apiClient.get("/certificate/types") as any;
          console.log('Certificate types API response:', response);
          
          if (Array.isArray(response)) {
            const certificateTypes = response.map((certType: any) => ({
              id: certType.id || "",
              name: certType.name || "",
              archived: certType.archived || false,
              created_at: certType.created_at || "",
              updated_at: certType.updated_at || "",
              deleted_at: certType.deleted_at || null,
              calculation_methods: certType.calculation_methods || null,
              input_format: certType.input_format || {
                gaugeName: "",
                format: {
                  columns: [],
                  rows: []
                }
              },
              reading_format: certType.reading_format || {
                gaugeName: "",
                format: {
                  columns: [],
                  rows: []
                }
              }
            }));

          set({ 
            certificateTypes,
            lastFetch: now,
            loading: false,
            inFlightRequest: null
          });
          
          console.log('Certificate types loaded successfully:', certificateTypes);
          return certificateTypes;
        } else {
          set({ 
            certificateTypes: [],
            loading: false,
            inFlightRequest: null
          });
          return [];
        }
      } catch (error) {
        console.error("Error fetching certificate types:", error);
        const errorMessage = "Failed to fetch certificate types";
        set({ 
          error: errorMessage,
          loading: false,
          inFlightRequest: null
        });
        toast.error(errorMessage);
        throw error; // Re-throw to handle in outer catch
      }
    })();

    // Store the promise and await it
    set({ inFlightRequest: requestPromise });
    try {
      return await requestPromise;
    } catch (error) {
      // Return empty array on error
      return [];
    }
  },

  // Get certificate type by ID
  getCertificateTypeById: (id: string) => {
    const state = get();
    return state.certificateTypes.find(certType => certType.id === id);
  },

  // Get certificate type name by ID (convenience method)
  getCertificateTypeNameById: (id: string) => {
    const state = get();
    const certType = state.certificateTypes.find(certType => certType.id === id);
    return certType?.name || "";
  },

  // Refresh certificate types (bypass cache)
  refreshCertificateTypes: async () => {
    await get().fetchAllCertificateTypes(true);
  },

  // Clear cache
  clearCache: () => {
    set({ 
      lastFetch: null,
      inFlightRequest: null
    });
    console.log('Cleared certificate types cache');
  },

  // Check if data is stale
  isDataStale: () => {
    const state = get();
    if (!state.lastFetch) return true;
    return (Date.now() - state.lastFetch) >= state.cacheDuration;
  },

  // Clear error
  clearError: () => set({ error: null }),
}));
