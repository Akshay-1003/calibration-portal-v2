import { create } from 'zustand';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import { useCertificateTypeStore } from './certificateTypeStore';
import { DEFAULT_BULK_FETCH_LIMIT, extractPaginatedList } from '../utils/paginatedResponse';

export interface CompanyGaugeData {
  id: string;
  name: string;
  is_standard_no: string;
  non_nabl_cert_frmt_no: string;
  nabl_cert_frmt_no: string;
  raw_datasheet_frmt_no: string;
  certificate_code: string;
  calibration_method: string;
  environmental_conditions: string;
  certificate_type_id: string;
  certificate_type_name?: string;
  specifications?: Record<string, unknown> | string | null;
  unit?: string;
  hsn_sac?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

interface GaugeState {
  // Data
  gaugeMasterList: CompanyGaugeData[];
  
  // Loading states
  loading: boolean;
  
  // Error states
  error: string | null;
  
  // Cache management
  lastFetch: number | null;
  cacheDuration: number;
  inFlightRequest: Promise<void> | null;
  
  // Actions
  fetchGauges: (forceRefresh?: boolean) => Promise<void>;
  updateGauge: (gaugeId: string, updatedGauge: Partial<CompanyGaugeData>) => Promise<void>;
  deleteGauge: (gaugeId: string) => Promise<void>;
  refreshGauges: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
  isDataStale: () => boolean;
  getGaugeById: (id: string) => CompanyGaugeData | undefined;
}

export const useGaugeStore = create<GaugeState>((set, get) => ({
  // Initial state
  gaugeMasterList: [],
  loading: false,
  error: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  inFlightRequest: null,

  // Fetch all gauges with certificate type data
  fetchGauges: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    
    // Check if we have recent data and not forcing refresh
    if (!forceRefresh && state.lastFetch && (now - state.lastFetch) < state.cacheDuration) {
      console.log('Using cached gauge data');
      return;
    }

    // Check if there's already an in-flight request
    if (state.inFlightRequest) {
      console.log('Reusing in-flight request for gauges');
      try {
        await state.inFlightRequest;
        return;
      } catch (error) {
        console.error('In-flight request failed, making new request:', error);
        // Continue to make a new request below
      }
    }

    // Create new request promise
    const requestPromise = (async () => {
      set({ loading: true, error: null });
    
      try {
        // First API call - get gauge master data
        const response = await apiClient.get("/gauge/master", {
          page: 0,
          limit: DEFAULT_BULK_FETCH_LIMIT,
        }) as any;
        console.log('Gauge master response:', response);
        
        // Handle different possible response structures
        const gaugeData = extractPaginatedList(response, {
          arrayKeys: ['data', 'gauges', 'items'],
          fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
        }).items.map((gauge: any) => ({
            id: gauge.id || "",
            name: gauge.name || "",
            is_standard_no: gauge.is_standard_no || "",
            non_nabl_cert_frmt_no: gauge.non_nabl_cert_frmt_no || "",
            nabl_cert_frmt_no: gauge.nabl_cert_frmt_no || "",
            raw_datasheet_frmt_no: gauge.raw_datasheet_frmt_no || "",
            certificate_code: gauge.certificate_code || "",
            calibration_method: gauge.calibration_method || "",
            environmental_conditions: gauge.environmental_conditions || "",
            certificate_type_id: gauge.certificate_type_id || "",
            certificate_type_name: "", // Will be populated below
            archived: gauge.archived || false,
            created_at: gauge.created_at || "",
            updated_at: gauge.updated_at || "",
            deleted_at: gauge.deleted_at || "",
          }));

        // Get certificate type store instance
        const certificateTypeStore = useCertificateTypeStore.getState();
        
        // Fetch certificate types if not already loaded
        await certificateTypeStore.fetchAllCertificateTypes();
        
        // Merge certificate type data for each gauge
        console.log('Merging certificate type data with gauges...');
        const gaugesWithCertificateTypes = gaugeData.map((gauge) => {
          if (gauge.certificate_type_id) {
            const certificateTypeName = certificateTypeStore.getCertificateTypeNameById(gauge.certificate_type_id);
            return {
              ...gauge,
              certificate_type_name: certificateTypeName
            };
          }
          return gauge;
        });

        console.log('Final gauge data with certificate types:', gaugesWithCertificateTypes);
        set({ 
          gaugeMasterList: gaugesWithCertificateTypes,
          lastFetch: now,
          loading: false,
          inFlightRequest: null
        });
      } catch (error) {
        console.error("Error fetching gauges:", error);
        const errorMessage = "Failed to fetch gauge master data";
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
      await requestPromise;
    } catch (error) {
      // Error already handled in the promise
    }
  },


  // Update gauge
  updateGauge: async (gaugeId: string, updatedGauge: Partial<CompanyGaugeData>) => {
    try {
      await apiClient.patch(`/gauge/master/${gaugeId}`, updatedGauge);
      set(state => ({
        gaugeMasterList: state.gaugeMasterList.map(gauge =>
          gauge.id === gaugeId
            ? { ...gauge, ...updatedGauge }
            : gauge
        ),
        // Clear cache to ensure fresh data on next fetch
        lastFetch: null
      }));
      toast.success("Gauge updated successfully!");
    } catch (error) {
      console.error("Error updating gauge:", error);
      toast.error("Failed to update gauge");
      throw error;
    }
  },

  // Delete gauge
  deleteGauge: async (gaugeId: string) => {
    try {
      await apiClient.delete(`/gauge/master/${gaugeId}`);
      set(state => ({
        gaugeMasterList: state.gaugeMasterList.filter(gauge => gauge.id !== gaugeId),
        // Clear cache to ensure fresh data on next fetch
        lastFetch: null
      }));
      toast.success("Gauge deleted successfully!");
    } catch (error) {
      console.error("Error deleting gauge:", error);
      toast.error("Failed to delete gauge");
    }
  },

  // Get gauge by ID
  getGaugeById: (id: string) => {
    const state = get();
    return state.gaugeMasterList.find(gauge => gauge.id === id);
  },

  // Refresh gauges (bypass cache)
  refreshGauges: async () => {
    await get().fetchGauges(true);
  },

  // Clear cache
  clearCache: () => {
    set({ 
      lastFetch: null,
      inFlightRequest: null
    });
    console.log('Cleared gauge cache');
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
