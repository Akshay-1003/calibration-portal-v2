import { create } from 'zustand';
import { apiClient } from '../services/api';
import { toast } from 'sonner';
import { generateUUID } from '../utils/uuid';
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from '../utils/paginatedResponse';

export interface EquipmentHistoryRange {
  range: string;
  max_permissible_error: string;
  uncertainty: string;
}

export interface EquipmentHistoryData {
  id: string;
  master_equipment_id: string;
  equipment_name: string;
  cal_by: string;
  cal_date: string;
  remark: string;
  calibration_due_date: string;
  format_no: string;
  cal_certificate_no: string;
  traceability: string;
  ranges: EquipmentHistoryRange[];
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
}

interface EquipmentHistoryState {
  // Data
  equipmentHistories: EquipmentHistoryData[];

  // Loading states
  loading: boolean;

  // Error states
  error: string | null;

  // Cache management
  lastFetch: number | null;
  cacheDuration: number;
  inFlightRequest: Promise<void> | null;

  // Actions
  fetchEquipmentHistories: (forceRefresh?: boolean) => Promise<void>;
  createEquipmentHistory: (history: Partial<EquipmentHistoryData>) => Promise<void>;
  updateEquipmentHistory: (historyId: string, history: Partial<EquipmentHistoryData>) => Promise<void>;
  deleteEquipmentHistory: (historyId: string) => Promise<void>;
  refreshEquipmentHistories: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
  isDataStale: () => boolean;

  // Computed getters
  getEquipmentHistoryById: (id: string) => EquipmentHistoryData | undefined;
  getUniqueValues: (field: keyof EquipmentHistoryData) => string[];
}

export const useEquipmentHistoryStore = create<EquipmentHistoryState>((set, get) => ({
  // Initial state
  equipmentHistories: [],
  loading: false,
  error: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  inFlightRequest: null,

  // Fetch all equipment histories
  fetchEquipmentHistories: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();

    // Check if we have recent data and not forcing refresh
    if (!forceRefresh && state.lastFetch && (now - state.lastFetch) < state.cacheDuration) {
      console.log('Using cached equipment history data');
      return;
    }

    // Check if there's already an in-flight request
    if (state.inFlightRequest) {
      console.log('Reusing in-flight request for equipment histories');
      try {
        await state.inFlightRequest;
        return;
      } catch (error) {
        console.error('In-flight request failed, making new request:', error);
      }
    }

    // Create new request promise
    const requestPromise = (async () => {
      set({ loading: true, error: null });

      try {
        const queryParams = new URLSearchParams({
          page: "0",
          limit: String(DEFAULT_BULK_FETCH_LIMIT),
        });
        const response = await apiClient.get(`/equipment/history/list?${queryParams.toString()}`) as any;
        console.log('Equipment history response:', response);

        const result = extractPaginatedList<EquipmentHistoryData>(response, {
          arrayKeys: ["data", "items", "equipment_histories", "histories"],
          mapItem: (history: unknown) => {
            const item = history as any;
            return {
              id: item.id || "",
              master_equipment_id: item.master_equipment_id || "",
              equipment_name: item.equipment_name || "",
              cal_by: item.cal_by || "",
              cal_date: item.cal_date || "",
              remark: item.remark || "",
              calibration_due_date: item.calibration_due_date || "",
              format_no: item.format_no || "",
              cal_certificate_no: item.cal_certificate_no || "",
              traceability: item.traceability || "",
              ranges: item.ranges || [],
              archived: item.archived || false,
              created_at: item.created_at || "",
              updated_at: item.updated_at || "",
              deleted_at: item.deleted_at || "",
            };
          },
          fallbackPage: 0,
          fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
        });
        const historyData = result.items;

        if (response) {
          console.log('Final equipment history data:', historyData);
          set({
            equipmentHistories: historyData,
            lastFetch: now,
            loading: false,
            inFlightRequest: null
          });
        } else {
          set({
            equipmentHistories: [],
            loading: false,
            inFlightRequest: null
          });
        }
      } catch (error) {
        console.error("Error fetching equipment histories:", error);
        const errorMessage = "Failed to fetch equipment history data";
        set({
          error: errorMessage,
          loading: false,
          inFlightRequest: null
        });
        toast.error(errorMessage);
        throw error;
      }
    })();

    set({ inFlightRequest: requestPromise });
    try {
      await requestPromise;
    } catch (error) {
      // Error already handled
    }
  },

  // Update equipment history
  updateEquipmentHistory: async (historyId: string, updatedHistory: Partial<EquipmentHistoryData>) => {
    try {
      await apiClient.patch(`/equipment-history/${historyId}`, updatedHistory);
      set(state => ({
        equipmentHistories: state.equipmentHistories.map(history =>
          history.id === historyId
            ? { ...history, ...updatedHistory }
            : history
        ),
        lastFetch: null
      }));
      toast.success("Equipment history updated successfully!");
    } catch (error) {
      console.error("Error updating equipment history:", error);
      toast.error("Failed to update equipment history");
    }
  },

  // Create equipment history
  createEquipmentHistory: async (newHistory: Partial<EquipmentHistoryData>) => {
    try {
      const response = await apiClient.postApiResponse("/equipment-history", newHistory as any) as any;
      const created: EquipmentHistoryData = {
        id: response?.id || generateUUID(),
        master_equipment_id: (response?.master_equipment_id ?? newHistory.master_equipment_id) || "",
        equipment_name: (response?.equipment_name ?? (newHistory as any).equipment_name) || "",
        cal_by: (response?.cal_by ?? newHistory.cal_by) || "",
        cal_date: (response?.cal_date ?? (newHistory as any).cal_date) || "",
        remark: (response?.remark ?? newHistory.remark) || "",
        calibration_due_date: (response?.calibration_due_date ?? newHistory.calibration_due_date) || "",
        format_no: (response?.format_no ?? newHistory.format_no) || "",
        cal_certificate_no: (response?.cal_certificate_no ?? newHistory.cal_certificate_no) || "",
        traceability: (response?.traceability ?? newHistory.traceability) || "",
        ranges: (response?.ranges ?? newHistory.ranges) || [],
        archived: response?.archived ?? false,
        created_at: response?.created_at || new Date().toISOString(),
        updated_at: response?.updated_at || new Date().toISOString(),
        deleted_at: response?.deleted_at || "",
      };
      set(state => ({
        equipmentHistories: [created, ...state.equipmentHistories],
        lastFetch: null
      }));
      toast.success("Equipment history created successfully!");
    } catch (error) {
      console.error("Error creating equipment history:", error);
      toast.error("Failed to create equipment history");
    }
  },

  // Delete equipment history
  deleteEquipmentHistory: async (historyId: string) => {
    try {
      await apiClient.delete(`/equipment-history/${historyId}`);
      set(state => ({
        equipmentHistories: state.equipmentHistories.filter(history => history.id !== historyId),
        lastFetch: null
      }));
      toast.success("Equipment history deleted successfully!");
    } catch (error) {
      console.error("Error deleting equipment history:", error);
      toast.error("Failed to delete equipment history");
    }
  },

  // Refresh equipment histories
  refreshEquipmentHistories: async () => {
    await get().fetchEquipmentHistories(true);
  },

  // Clear cache
  clearCache: () => {
    set({
      lastFetch: null,
      inFlightRequest: null
    });
    console.log('Cleared equipment history cache');
  },

  // Check if data is stale
  isDataStale: () => {
    const state = get();
    if (!state.lastFetch) return true;
    return (Date.now() - state.lastFetch) >= state.cacheDuration;
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Computed getters
  getEquipmentHistoryById: (id: string) => {
    const state = get();
    return state.equipmentHistories.find(history => history.id === id);
  },

  getUniqueValues: (field: keyof EquipmentHistoryData) => {
    const state = get();
    const values = state.equipmentHistories
      .map(history => history[field])
      .filter((value): value is string => Boolean(value) && typeof value === 'string')
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort();
    return values;
  },
}));
