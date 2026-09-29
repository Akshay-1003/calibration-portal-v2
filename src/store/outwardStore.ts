import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { apiClient, ApiResponse } from "../services/api";
import { toast } from "sonner";

// Type definitions
export interface OutwardGaugeItem {
  inward_id: string;
  gauge_inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  master_gauge_name: string;
  identification_number: string;
  manf_serial_number: string;
  inward_date: string;
  process: string;
  status: string;
  outward_no?: string;
  id?: string;
  [key: string]: any;
}

export interface InwardedGaugeItem {
  inward_id: string;
  gauge_inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  master_gauge_name: string;
  identification_number: string;
  manf_serial_number: string;
  inward_date: string;
  process: string;
  status: string;
  id?: string;
  [key: string]: any;
}

export interface OutwardEntry {
  id: string;
  client_org: string;
  client_org_id: string;
  outward_no: string;
  outward_date: string;
  transport_by: string;
  address?: any;
  [key: string]: any;
}

interface OutwardStore {
  // Current outward entry
  currentOutwardId: string | null;
  outwardEntry: OutwardEntry | null;
  outwardEntries: OutwardEntry[];
  // Items
  outwardItems: OutwardGaugeItem[];
  inwardedItems: InwardedGaugeItem[];
  
  // Loading states
  loading: {
    entry: boolean;
    outwardEntries: boolean;
    outwardItems: boolean;
    inwardedItems: boolean;
    addingGauge: boolean;
    bulkAdding: boolean;
    removingGauge: boolean;
  };
  
  // Track which specific item is being added
  addingGaugeId: string | null;
  removingGaugeIds: string[];
  addStatusConfirmOpen: boolean;
  pendingAddItems: InwardedGaugeItem[];
  
  // Error states
  errors: {
    entry: string | null;
    outwardItems: string | null;
    inwardedItems: string | null;
  };
  
  // Search filters
  outwardItemsSearch: string;
  inwardedItemsSearch: string;
  
  // Selection for bulk operations
  selectedInwardedKeys: Set<string> | "all";
  
  // Actions
  setCurrentOutwardId: (id: string | null) => void;
  setOutwardItemsSearch: (search: string) => void;
  setInwardedItemsSearch: (search: string) => void;
  setSelectedInwardedKeys: (keys: Set<string> | "all") => void;
  openAddStatusConfirm: (items: InwardedGaugeItem[]) => void;
  closeAddStatusConfirm: () => void;
  
  // API Actions
  fetchOutwardEntry: (outwardId: string) => Promise<void>;
  fetchOutwardEntries: () => Promise<void>;
  fetchOutwardItems: (outwardId: string) => Promise<void>;
  fetchInwardedItems: (outwardId: string) => Promise<void>;
  
  // Add gauge actions (with optimistic updates)
  addGaugeToOutward: (outwardId: string, item: InwardedGaugeItem) => Promise<void>;
  bulkAddGaugesToOutward: (outwardId: string, items: InwardedGaugeItem[]) => Promise<void>;
  deleteOutward: (outwardId: string) => Promise<void>;
  // Remove gauge from outward
  removeGaugeFromOutward: (outwardId: string, gaugeInwardId: string) => Promise<void>;
  
  // Helper: Get item key
  getItemKey: (item: OutwardGaugeItem | InwardedGaugeItem, index: number) => string;
  
  // Reset store
  resetStore: () => void;
}

// Helper function to extract data from API response
const extractApiData = <T,>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
};

export const useOutwardStore = create<OutwardStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentOutwardId: null,
      outwardEntry: null,
      outwardItems: [],
      inwardedItems: [],
      outwardEntries: [],
      loading: {
        entry: false,
        outwardEntries: false,
        outwardItems: false,
        inwardedItems: false,
        addingGauge: false,
        bulkAdding: false,
        removingGauge: false,
      },
      
      addingGaugeId: null,
      removingGaugeIds: [],
      addStatusConfirmOpen: false,
      pendingAddItems: [],
      
      errors: {
        entry: null,
        outwardItems: null,
        inwardedItems: null,
      },
      
      outwardItemsSearch: "",
      inwardedItemsSearch: "",
      selectedInwardedKeys: new Set(),
      
      // Setters
      setCurrentOutwardId: (id) => {
        set((state) => {
          state.currentOutwardId = id;
        });
      },
      
      setOutwardItemsSearch: (search) => {
        set((state) => {
          state.outwardItemsSearch = search;
        });
      },
      
      setInwardedItemsSearch: (search) => {
        set((state) => {
          state.inwardedItemsSearch = search;
        });
      },
      
      setSelectedInwardedKeys: (keys) => {
        set((state) => {
          state.selectedInwardedKeys = keys;
        });
      },
      
      openAddStatusConfirm: (items) => {
        set((state) => {
          state.addStatusConfirmOpen = true;
          state.pendingAddItems = items;
        });
      },

      closeAddStatusConfirm: () => {
        set((state) => {
          state.addStatusConfirmOpen = false;
          state.pendingAddItems = [];
        });
      },
      
      // Helper to get item key
      getItemKey: (item, index) => {
        return item.id || item.gauge_inward_id || item.gauge_id || item.inward_gauge_lab_id || `item-${index}`;
      },
      
      // Fetch outward entry
      fetchOutwardEntry: async (outwardId: string) => {
        set((state) => {
          state.loading.entry = true;
          state.errors.entry = null;
        });
        
        try {
          const response = await apiClient.getApiResponse<any>(`/outward/${outwardId}`);
          const data = extractApiData(response);
          const outwardDetails = data?.outward_details || data;
          
          if (outwardDetails) {
            set((state) => {
              state.outwardEntry = outwardDetails;
              state.currentOutwardId = outwardId;
            });
          } else {
            throw new Error("Outward entry not found");
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load outward entry";
          set((state) => {
            state.errors.entry = errorMessage;
          });
          throw err;
        } finally {
          set((state) => {
            state.loading.entry = false;
          });
        }
      },
      
      // Fetch outward items
      fetchOutwardItems: async (outwardId: string) => {
        set((state) => {
          state.loading.outwardItems = true;
          state.errors.outwardItems = null;
        });
        
        try {
          const response = await apiClient.getApiResponse<any>(`/outward/${outwardId}/gauges`);
          const responseData = extractApiData(response);
          const data = responseData?.outward_gauges || (Array.isArray(responseData) ? responseData : []);
          
          if (data && Array.isArray(data)) {
            const itemsWithId = data.map((item, index) => ({
              ...item,
              id: item.id || item.gauge_id || item.inward_gauge_lab_id || `outward-item-${index}`,
            }));
            
            set((state) => {
              state.outwardItems = itemsWithId;
            });
          } else {
            set((state) => {
              state.outwardItems = [];
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load outward items";
          set((state) => {
            state.errors.outwardItems = errorMessage;
            state.outwardItems = [];
          });
          
          // Only show error toast for unexpected errors (not 404)
          if (err instanceof Error && !err.message.includes('404')) {
            toast.error(errorMessage);
          }
        } finally {
          set((state) => {
            state.loading.outwardItems = false;
          });
        }
      },
      
      // Fetch inwarded items
      fetchInwardedItems: async (outwardId: string) => {
        set((state) => {
          state.loading.inwardedItems = true;
          state.errors.inwardedItems = null;
        });
        
        try {
          const response = await apiClient.getApiResponse<InwardedGaugeItem[]>(`/outwards/gauges-to-outward/${outwardId}`);
          const data = extractApiData(response);
          
          if (data && Array.isArray(data)) {
            const itemsWithId = data.map((item, index) => ({
              ...item,
              id: item.id || item.gauge_id || item.inward_gauge_lab_id || `inwarded-item-${index}`,
            }));
            
            set((state) => {
              state.inwardedItems = itemsWithId;
            });
          } else {
            set((state) => {
              state.inwardedItems = [];
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load inwarded items";
          set((state) => {
            state.errors.inwardedItems = errorMessage;
            state.inwardedItems = [];
          });
          
          // Only show error toast for unexpected errors (not 404)
          if (err instanceof Error && !err.message.includes('404')) {
            toast.error(errorMessage);
          }
        } finally {
          set((state) => {
            state.loading.inwardedItems = false;
          });
        }
      },
      
      // Add single gauge to outward (with optimistic update)
      addGaugeToOutward: async (outwardId: string, item: InwardedGaugeItem) => {
        const itemKey = get().getItemKey(item, get().inwardedItems.indexOf(item));
        
        set((state) => {
          state.loading.addingGauge = true;
          state.addingGaugeId = itemKey;
          // Clear selection when adding single item
          state.selectedInwardedKeys = new Set();
        });
        
        try {
          const payload = {
            outward_id: outwardId,
            gauge_inward_id: item.gauge_inward_id,
          };
          const optimisticOutwardItem: OutwardGaugeItem = {
            ...item,
            outward_no: get().outwardEntry?.outward_no,
            id: item.id || item.gauge_id || item.inward_gauge_lab_id,
          };
          
          // Optimistic update: Remove from inwarded items immediately
          set((state) => {
            state.inwardedItems = state.inwardedItems.filter(
              (i) => get().getItemKey(i, state.inwardedItems.indexOf(i)) !== itemKey
            );
            if (!state.outwardItems.some((outwardItem) => outwardItem.gauge_inward_id === item.gauge_inward_id)) {
              state.outwardItems.unshift(optimisticOutwardItem);
            }
          });
          
          // Make API call
          await apiClient.postApiResponse('/outward/gauge', payload);

          // The add is done at this point; clear the row-level loading state
          // before background sync so the remaining action buttons don't stay disabled.
          set((state) => {
            state.loading.addingGauge = false;
            state.addingGaugeId = null;
          });
          
          // Refresh both lists to ensure server-truth sync after optimistic update
          await Promise.all([
            get().fetchOutwardItems(outwardId),
            get().fetchInwardedItems(outwardId),
          ]);
          
          toast.success("Gauge added to outward successfully!");
        } catch (err) {
          // Revert optimistic update on error
          set((state) => {
            // Re-add the item to inwarded items
            const itemIndex = state.inwardedItems.findIndex(
              (i) => get().getItemKey(i, state.inwardedItems.indexOf(i)) === itemKey
            );
            if (itemIndex === -1) {
              state.inwardedItems.push(item);
            }
            state.outwardItems = state.outwardItems.filter(
              (outwardItem) => outwardItem.gauge_inward_id !== item.gauge_inward_id
            );
          });
          
          const errorMessage = err instanceof Error ? err.message : "Failed to add gauge to outward";
          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.loading.addingGauge = false;
            state.addingGaugeId = null;
          });
        }
      },
      
      // Bulk add gauges to outward (with optimistic updates)
      bulkAddGaugesToOutward: async (outwardId: string, items: InwardedGaugeItem[]) => {
        if (items.length === 0) {
          toast.error("No items to add");
          return;
        }
        
        set((state) => {
          state.loading.bulkAdding = true;
        });
        
        try {
          const optimisticOutwardItems: OutwardGaugeItem[] = items.map((item, index) => ({
            ...item,
            outward_no: get().outwardEntry?.outward_no,
            id: item.id || item.gauge_id || item.inward_gauge_lab_id || `bulk-outward-item-${index}`,
          }));
          // Optimistic update: Remove all items from inwarded items immediately
          const itemKeys = items.map((item) => 
            get().getItemKey(item, get().inwardedItems.indexOf(item))
          );
          
          set((state) => {
            state.inwardedItems = state.inwardedItems.filter(
              (i) => !itemKeys.includes(get().getItemKey(i, state.inwardedItems.indexOf(i)))
            );
            const existingGaugeIds = new Set(state.outwardItems.map((outwardItem) => outwardItem.gauge_inward_id));
            const nextOutwardItems = optimisticOutwardItems.filter(
              (optimisticItem) => !existingGaugeIds.has(optimisticItem.gauge_inward_id)
            );
            state.outwardItems = [...nextOutwardItems, ...state.outwardItems];
            state.selectedInwardedKeys = new Set();
          });
          
          // Make API calls
          const promises = items.map((item) =>
            apiClient.postApiResponse('/outward/gauge', {
              outward_id: outwardId,
              gauge_inward_id: item.gauge_inward_id,
            })
          );
          
          await Promise.all(promises);
          
          // Refresh both lists to ensure server-truth sync after optimistic update
          await Promise.all([
            get().fetchOutwardItems(outwardId),
            get().fetchInwardedItems(outwardId),
          ]);
          
          toast.success(`${items.length} gauge(s) added to outward successfully!`);
        } catch (err) {
          // Revert optimistic update on error
          set((state) => {
            // Re-add all items to inwarded items
            items.forEach((item) => {
              const exists = state.inwardedItems.some(
                (i) => get().getItemKey(i, state.inwardedItems.indexOf(i)) === get().getItemKey(item, -1)
              );
              if (!exists) {
                state.inwardedItems.push(item);
              }
            });
            const removedGaugeInwardIds = new Set(items.map((item) => item.gauge_inward_id));
            state.outwardItems = state.outwardItems.filter(
              (outwardItem) => !removedGaugeInwardIds.has(outwardItem.gauge_inward_id)
            );
          });
          
          const errorMessage = err instanceof Error ? err.message : "Failed to add gauges to outward";
          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.loading.bulkAdding = false;
          });
        }
      },
      
      // Remove gauge from outward (with optimistic update)
      removeGaugeFromOutward: async (outwardId: string, gaugeInwardId: string) => {
        set((state) => {
          state.loading.removingGauge = true;
          if (!state.removingGaugeIds.includes(gaugeInwardId)) {
            state.removingGaugeIds.push(gaugeInwardId);
          }
        });
        
        // Store the item being removed for potential revert
        const itemToRemove = get().outwardItems.find(item => item.gauge_inward_id === gaugeInwardId);
        const inwardedItemToRestore = itemToRemove
          ? {
              ...itemToRemove,
              id: itemToRemove.id || itemToRemove.gauge_id || itemToRemove.inward_gauge_lab_id,
            }
          : null;
        
        try {
          // Optimistic update: Remove from outward items immediately
          set((state) => {
            state.outwardItems = state.outwardItems.filter(
              (item) => item.gauge_inward_id !== gaugeInwardId
            );
            if (
              inwardedItemToRestore &&
              !state.inwardedItems.some((item) => item.gauge_inward_id === gaugeInwardId)
            ) {
              state.inwardedItems.unshift(inwardedItemToRestore);
            }
          });
          
          // Make API DELETE call
          await apiClient.delete(`/outward/gauge/${gaugeInwardId}`);
          
          // Refresh both lists to ensure server-truth sync after optimistic update
          await Promise.all([
            get().fetchOutwardItems(outwardId),
            get().fetchInwardedItems(outwardId),
          ]);
          
          toast.success("Gauge removed from outward successfully!");
        } catch (err) {
          // Revert optimistic update on error
          if (itemToRemove) {
            set((state) => {
              const exists = state.outwardItems.some(
                (item) => item.gauge_inward_id === gaugeInwardId
              );
              if (!exists) {
                state.outwardItems.push(itemToRemove);
              }
              state.inwardedItems = state.inwardedItems.filter(
                (item) => item.gauge_inward_id !== gaugeInwardId
              );
            });
          }
          
          const errorMessage = err instanceof Error ? err.message : "Failed to remove gauge from outward";
          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.removingGaugeIds = state.removingGaugeIds.filter((id) => id !== gaugeInwardId);
            state.loading.removingGauge = state.removingGaugeIds.length > 0;
          });
        }
      },
      
      // Delete outward
      deleteOutward: async (outwardId: string) => {
        set((state) => {
          state.loading.removingGauge = true;
        });
        
        try {
          // Make API DELETE call
          await apiClient.delete(`/outward/${outwardId}`);
          
          toast.success("Outward deleted successfully!");
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to delete outward";
          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.loading.removingGauge = false;
          });
        }
      },
      fetchOutwardEntries: async () => {
        set((state) => {
          state.loading.outwardEntries = true;
        });
        
        try {
          const response = await apiClient.getApiResponse<OutwardEntry[]>('/outwards');
          const data = extractApiData(response);
          set((state) => {
            state.outwardEntries = data;
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Failed to fetch outward entries";
          toast.error(errorMessage);
          throw err;
        } finally {
          set((state) => {
            state.loading.outwardEntries = false;
          });
        }
      },
      // Reset store
      resetStore: () => {
        set((state) => {
          state.currentOutwardId = null;
          state.outwardEntry = null;
          state.outwardItems = [];
          state.inwardedItems = [];
          state.outwardItemsSearch = "";
          state.inwardedItemsSearch = "";
          state.selectedInwardedKeys = new Set();
          state.addingGaugeId = null;
          state.removingGaugeIds = [];
          state.addStatusConfirmOpen = false;
          state.pendingAddItems = [];
          state.loading = {
            entry: false,
            outwardEntries: false,
            outwardItems: false,
            inwardedItems: false,
            addingGauge: false,
            bulkAdding: false,
            removingGauge: false,
          };
          state.errors = {
            entry: null,
            outwardItems: null,
            inwardedItems: null,
          };
        });
      },
    })),
    { name: "OutwardStore" }
  )
);
