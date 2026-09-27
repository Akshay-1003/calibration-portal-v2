import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { apiClient, ApiError } from '../services/api';
import { API_ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/api';
import { toast } from 'sonner';

// Types
export interface Organization {
  id: string;
  name: string;
  description: string;
  parent_id?: string | null;
  archived?: boolean;
  is_active?: boolean;
  gst?: string;
  gst_type?: string;
  org_type?: 'customer' | 'laboratory' | string | null;
  lab_ids?: string[];
  lab_type?: 'NABL Lab' | 'Non-NABL Lab' | string | null;
  lab_certificate_number?: string | null;
  contacts: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  address?: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  } | null;
  contract?: {
    calibration_method: string;
    reporting_method: string;
    collection_mode: string;
    dispatch_mode: string;
    conformity_statement: boolean;
    conformity_accepted: boolean;
    specific_requirements?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationFormData {
  name: string;
  description: string;
  parent_id: string;
  gst?: string;
  gst_type?: string;
  org_type?: 'customer' | 'laboratory' | string | null;
  is_active?: boolean;
  lab_type?: 'NABL Lab' | 'Non-NABL Lab' | string | null;
  lab_certificate_number?: string | null;
  contacts: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  contract: {
    calibration_method: string;
    reporting_method: string;
    collection_mode: string;
    dispatch_mode: string;
    conformity_statement: boolean;
    conformity_accepted: boolean;
    specific_requirements?: string;
  };
}

interface OrganizationState {
  // Data
  organizations: Organization[];
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Cache Management
  lastFetch: number | null;
  cacheExpiry: number;
  
  // Actions
  fetchOrganizations: (forceRefresh?: boolean) => Promise<void>;
  createOrganization: (data: OrganizationFormData) => Promise<Organization>;
  updateOrganization: (id: string, data: Partial<OrganizationFormData>) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  
  // State Management
  setOrganizations: (organizations: Organization[]) => void;
  addOrganization: (organization: Organization) => void;
  updateOrganizationInStore: (id: string, updates: Partial<Organization>) => void;
  removeOrganization: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Selectors
  getOrganizationById: (id: string) => Organization | undefined;
  getOrganizationsByType: (type: string) => Organization[];
  getOrganizationsCount: () => number;
  isDataStale: () => boolean;
}

type OrganizationListResponse = Organization[] | {
  organizations?: Organization[];
  data?: Organization[];
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      organizations: [],
      loading: false,
      error: null,
      lastFetch: null,
      cacheExpiry: CACHE_DURATION,

      // Actions
      fetchOrganizations: async (forceRefresh = false) => {
        const state = get();
        const now = Date.now();
        console.log('state',state)
        // Check if we should use cached data
        if (!forceRefresh && 
            state.organizations.length > 0 && 
            state.lastFetch && 
            (now - state.lastFetch) < state.cacheExpiry) {
          console.log('Using cached organizations data');
          return;
        }

        set((draft) => {
          draft.loading = true;
          draft.error = null;
        });

        try {
          console.log('Fetching organizations from API...');
          const response = await apiClient.get<OrganizationListResponse>(
            API_ENDPOINTS.ORGANIZATIONS.LIST
          );

          // Handle both direct array response and wrapped response
          const organizations = Array.isArray(response) 
            ? response 
            : Array.isArray(response.organizations)
              ? response.organizations
              : Array.isArray(response.data)
                ? response.data
                : [];

          set((draft) => {
            draft.organizations = organizations;
            draft.loading = false;
            draft.lastFetch = now;
            draft.error = null;
          });

          console.log(`Successfully fetched ${organizations.length} organizations`);
        } catch (error) {
          console.error('Error fetching organizations:', error);
          
          let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;
          if (error instanceof ApiError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          set((draft) => {
            draft.loading = false;
            draft.error = errorMessage;
          });

          toast.error(errorMessage);
        }
      },

      createOrganization: async (data: OrganizationFormData) => {
        set((draft) => {
          draft.loading = true;
          draft.error = null;
        });

        try {
          console.log('Creating organization:', data);
          const response = await apiClient.post<Organization>(
            API_ENDPOINTS.ORGANIZATIONS.CREATE,
            data
          );

          set((draft) => {
            draft.organizations.unshift(response);
            draft.loading = false;
          });

          toast.success(SUCCESS_MESSAGES.CREATED);
          return response;
        } catch (error) {
          console.error('Error creating organization:', error);
          
          let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;
          if (error instanceof ApiError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          set((draft) => {
            draft.loading = false;
            draft.error = errorMessage;
          });

          toast.error(errorMessage);
          throw error;
        }
      },

      updateOrganization: async (id: string, data: Partial<OrganizationFormData>) => {
        set((draft) => {
          draft.loading = true;
          draft.error = null;
        });

        try {
          console.log('Updating organization:', id, data);
          const response = await apiClient.put<Organization>(
            API_ENDPOINTS.ORGANIZATIONS.UPDATE(id),
            data
          );

          set((draft) => {
            const index = draft.organizations.findIndex(org => org.id === id);
            if (index !== -1) {
              draft.organizations[index] = response;
            }
            draft.loading = false;
          });

          toast.success(SUCCESS_MESSAGES.UPDATED);
          return response;
        } catch (error) {
          console.error('Error updating organization:', error);
          
          let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;
          if (error instanceof ApiError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          set((draft) => {
            draft.loading = false;
            draft.error = errorMessage;
          });

          toast.error(errorMessage);
          throw error;
        }
      },

      deleteOrganization: async (id: string) => {
        set((draft) => {
          draft.loading = true;
          draft.error = null;
        });

        try {
          console.log('Deleting organization:', id);
          await apiClient.delete(API_ENDPOINTS.ORGANIZATIONS.DELETE(id));

          set((draft) => {
            draft.organizations = draft.organizations.filter(org => org.id !== id);
            draft.loading = false;
          });

          toast.success(SUCCESS_MESSAGES.DELETED);
        } catch (error) {
          console.error('Error deleting organization:', error);
          
          let errorMessage: string = ERROR_MESSAGES.UNKNOWN_ERROR;
          if (error instanceof ApiError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          set((draft) => {
            draft.loading = false;
            draft.error = errorMessage;
          });

          toast.error(errorMessage);
          throw error;
        }
      },

      // State Management
      setOrganizations: (organizations) => set((draft) => {
        draft.organizations = organizations;
      }),

      addOrganization: (organization) => set((draft) => {
        draft.organizations.unshift(organization);
      }),

      updateOrganizationInStore: (id, updates) => set((draft) => {
        const index = draft.organizations.findIndex(org => org.id === id);
        if (index !== -1) {
          Object.assign(draft.organizations[index], updates);
        }
      }),

      removeOrganization: (id) => set((draft) => {
        draft.organizations = draft.organizations.filter(org => org.id !== id);
      }),

      setLoading: (loading) => set((draft) => {
        draft.loading = loading;
      }),

      setError: (error) => set((draft) => {
        draft.error = error;
      }),

      clearError: () => set((draft) => {
        draft.error = null;
      }),

      // Selectors
      getOrganizationById: (id) => {
        const state = get();
        return state.organizations.find(org => org.id === id);
      },

      getOrganizationsByType: (type) => {
        const state = get();
        return state.organizations.filter(org => 
          org.contract.calibration_method === type
        );
      },

      getOrganizationsCount: () => {
        const state = get();
        return state.organizations.length;
      },

      isDataStale: () => {
        const state = get();
        if (!state.lastFetch) return true;
        const now = Date.now();
        return (now - state.lastFetch) >= state.cacheExpiry;
      },
    })),
    {
      name: 'organization-store',
    }
  )
);

// Selector hooks for better performance
export const useOrganizations = () => useOrganizationStore((state) => state.organizations);
export const useOrganizationsLoading = () => useOrganizationStore((state) => state.loading);
export const useOrganizationsError = () => useOrganizationStore((state) => state.error);

// Memoized actions to prevent infinite re-renders
export const useOrganizationsActions = () => {
  const fetchOrganizations = useOrganizationStore((state) => state.fetchOrganizations);
  const createOrganization = useOrganizationStore((state) => state.createOrganization);
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const deleteOrganization = useOrganizationStore((state) => state.deleteOrganization);
  const clearError = useOrganizationStore((state) => state.clearError);
  
  return {
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    clearError,
  };
};

export const useOrganizationById = (id: string) => useOrganizationStore((state) => state.getOrganizationById(id));
export const useOrganizationsCount = () => useOrganizationStore((state) => state.getOrganizationsCount());
export const useOrganizationsByType = (type: string) => useOrganizationStore((state) => state.getOrganizationsByType(type));
