/**
 * Unified App Store
 * Single source of truth for all application data
 * Clean, efficient, production-ready
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { apiService, ApiError } from '../services/apiService';
import { StoreCache, InFlightManager } from '../utils/storeCache';
import { arrayUtils, performanceUtils } from './baseStore';
import { DEFAULT_BULK_FETCH_LIMIT } from '../utils/paginatedResponse';

// ============================================================================
// TYPES
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
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
    specific_requirements: string;
  } | null;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  deleted_at?: string | null;
}

export interface InwardEntry {
  id: string;
  client_org_id: string;
  billing_org_id: string;
  delivery_org_id: string;
  other_access_org_id: string;
  client_org_name: string;
  billing_org_name: string;
  delivery_org_name: string;
  client_dc_no: string;
  client_dc_date: string;
  through: string;
  inward_date: string;
  received_date: string;
  commit_date: string;
  calibration_method: string;
  reporting_method: string;
  collection_mode: string;
  dispatch_mode: string;
  additional_requirements: string;
  lab_authorized_person_id: string;
  lab_authorized_person_designation: string;
  client_authorized_person_id: string;
  created_at: string;
  updated_at: string;
}

export interface LinkedGauge {
  id: string;
  master_gauge_id: string;
  client_org_name: string;
  gauge_class: string;
  make: string;
  identification_number: string;
  manf_serial_number: string;
  calibration_frequency: number;
  calibration_frequency_unit: "months" | "years";
  process: string;
  unit: string;
  calibration_location_type: "permanent_facility" | "mobile_facility" | "customer_site";
  calibration_done_under: string;
  gauge_condition: string;
  created_at: string;
  updated_at: string;
  inward_id: string;
  client_org_id: string;
  certificate_type_id: string;
  inward_info: {
    client_org_name: string;
    client_dc_no: string;
    inward_date: string;
  };
  process_status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  specifications?: any;
}

export interface GaugeMaster {
  id: string;
  name: string;
  certificate_type_id?: string;
  certificate_type_name?: string;
  calibration_method?: string;
  archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CertificateType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CalibrationCertificate {
  id: string;
  certificate_no: string;
  gauge_id: string;
  gauge_name: string;
  client_org_id: string;
  calibration_date: string;
  due_date: string;
  calibration_method: string;
  accuracy: string;
  temperature: string;
  humidity: string;
  technician_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isOrganizationEntity = (value: unknown): value is Organization =>
  isRecord(value) && typeof value.id === 'string';

const extractOrganizationFromResponse = (response: unknown): Organization | null => {
  const unwrapData = (input: unknown): unknown => {
    if (isRecord(input) && 'data' in input) {
      return input.data;
    }
    return input;
  };

  const payload = unwrapData(response);

  if (Array.isArray(payload)) {
    return payload.find(isOrganizationEntity) || null;
  }

  if (isRecord(payload) && 'organization' in payload) {
    const organizationValue = payload.organization;
    if (Array.isArray(organizationValue)) {
      return organizationValue.find(isOrganizationEntity) || null;
    }
    return isOrganizationEntity(organizationValue) ? organizationValue : null;
  }

  return isOrganizationEntity(payload) ? payload : null;
};

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface AppState {
  // Data
  organizations: Organization[];
  inwardEntries: InwardEntry[];
  linkedGauges: LinkedGauge[];
  gaugeMasters: GaugeMaster[];
  certificateTypes: CertificateType[];

  // Loading states
  loading: {
    organizations: boolean;
    inwardEntries: boolean;
    linkedGauges: boolean;
    gaugeMasters: boolean;
    certificateTypes: boolean;
  };

  // Error states
  errors: {
    organizations: string | null;
    inwardEntries: string | null;
    linkedGauges: string | null;
    gaugeMasters: string | null;
    certificateTypes: string | null;
  };

  // Unified cache system
  _cache: StoreCache;
  _inFlight: InFlightManager;

  // Actions
  actions: {
    // Organizations
    fetchOrganizations: (force?: boolean) => Promise<Organization[] | undefined>;
    createOrganization: (data: Partial<Organization>) => Promise<Organization | null>;
    updateOrganization: (id: string, data: Partial<Organization>) => Promise<Organization | null>;
    deleteOrganization: (id: string) => Promise<boolean>;

    // Inward Entries
    fetchInwardEntries: (force?: boolean, filters?: {
      inward_date_from?: string;
      inward_date_to?: string;
    }) => Promise<InwardEntry[] | undefined>;
    createInwardEntry: (data: Partial<InwardEntry>) => Promise<InwardEntry | null>;
    updateInwardEntry: (id: string, data: Partial<InwardEntry>) => Promise<InwardEntry | null>;
    deleteInwardEntry: (id: string) => Promise<boolean>;

    // Linked Gauges
    fetchLinkedGauges: (force?: boolean) => Promise<LinkedGauge[] | undefined>;
    fetchGaugesByInward: (inwardId: string, force?: boolean) => Promise<void>;
    linkGaugeToInward: (data: any) => Promise<boolean>;

    // Gauge Masters
    fetchGaugeMasters: (force?: boolean) => Promise<GaugeMaster[] | undefined>;

    // Certificate Types
    fetchCertificateTypes: (force?: boolean) => Promise<CertificateType[] | undefined>;

    // Calibration Certificates removed - using gauge status instead

    // Utility
    clearError: (entity: keyof AppState['errors']) => void;
    clearAllErrors: () => void;
    refreshAll: () => Promise<void>;
    clearAllCaches: () => void;
  };
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

// Create cache instances
const appCache = new StoreCache({ ttl: 5 * 60 * 1000 }); // 5 minutes
const appInFlight = new InFlightManager();

export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
      // Initial data
      organizations: [],
      inwardEntries: [],
      linkedGauges: [],
      gaugeMasters: [],
      certificateTypes: [],

      // Initial loading states
      loading: {
        organizations: false,
        inwardEntries: false,
        linkedGauges: false,
        gaugeMasters: false,
        certificateTypes: false,
      },

      // Initial error states
      errors: {
        organizations: null,
        inwardEntries: null,
        linkedGauges: null,
        gaugeMasters: null,
        certificateTypes: null,
      },

      // Cache instances
      _cache: appCache,
      _inFlight: appInFlight,

      // Actions
      actions: {
        // ========================================================================
        // ORGANIZATIONS
        // ========================================================================

        fetchOrganizations: async (force = false) => {
          const cacheKey = 'organizations';

          // Check cache first
          if (!force) {
            const cached = appCache.get(cacheKey);
            if (cached) {
              set((draft) => {
                draft.organizations = cached;
              });
              return;
            }
          }

          // Use in-flight manager to prevent duplicate requests
          return appInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchOrganizations', async () => {
              set((draft) => {
                draft.loading.organizations = true;
                draft.errors.organizations = null;
              });

              try {
                const response = await apiService.getOrganizations({
                  page: 0,
                  limit: DEFAULT_BULK_FETCH_LIMIT,
                });
                console.log('API Response:', response);

                // Handle different response structures
                let organizations: Organization[] = [];

                if (Array.isArray(response)) {
                  organizations = response;
                } else if (response && Array.isArray(response.organizations)) {
                  organizations = response.organizations;
                } else {
                  console.warn('Unexpected API response structure:', response);
                  organizations = [];
                }

                // Update cache and state
                appCache.set(cacheKey, organizations);

                set((draft) => {
                  draft.organizations = organizations;
                  draft.loading.organizations = false;
                  draft.errors.organizations = null;
                });

                console.log(`✅ Fetched ${organizations.length} organizations`);
                return organizations;
              } catch (error) {
                console.error('❌ Error fetching organizations:', error);
                const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch organizations';

                set((draft) => {
                  draft.loading.organizations = false;
                  draft.errors.organizations = errorMessage;
                });
                throw error;
              }
            });
          });
        },

        createOrganization: async (data) => {
          try {
            const response = await apiService.createOrganization(data);
            console.log('Create organization response:', response);

            // Handle different response structures
            let organization = null;
            if (response && response.id) {
              organization = response;
            } else if (Array.isArray(response) && response.length > 0) {
              organization = response[0];
            }

            if (organization) {
              // Optimistic update - add immediately
              set((draft) => {
                draft.organizations = arrayUtils.addItem(draft.organizations, organization, 'start');
              });

              // Update cache and invalidate related caches
              const cached = appCache.get('organizations') || [];
              appCache.set('organizations', arrayUtils.addItem(cached, organization, 'start'));
              // Invalidate related caches that might reference this organization
              appCache.invalidatePattern(`.*${organization.id}.*`);
              appCache.invalidatePattern(`.*inward.*`);
            }

            return organization;
          } catch (error) {
            console.error('❌ Error creating organization:', error);
            return null;
          }
        },

        updateOrganization: async (id, data) => {
          try {
            const response = await apiService.updateOrganization(id, data);
            console.log('Update organization response:', response);

            const existing = get().organizations.find((org) => org.id === id) || null;
            const fromApi = extractOrganizationFromResponse(response);
            const normalizedOrganization =
              fromApi
                ? fromApi
                : (existing
                  ? ({
                    ...existing,
                    ...data,
                    id,
                    updated_at: new Date().toISOString(),
                  } as Organization)
                  : null);

            if (normalizedOrganization) {
              set((draft) => {
                draft.organizations = arrayUtils.updateItem(
                  draft.organizations,
                  id,
                  normalizedOrganization
                );
                draft.errors.organizations = null;
              });

              const cached = (appCache.get('organizations') || []) as Organization[];
              appCache.set(
                'organizations',
                arrayUtils.updateItem(cached, id, normalizedOrganization)
              );
              appCache.invalidatePattern(`.*${id}.*`);
              appCache.invalidatePattern(`.*inward.*`);
            }

            return normalizedOrganization;
          } catch (error) {
            console.error('❌ Error updating organization:', error);
            return null;
          }
        },

        deleteOrganization: async (id) => {
          try {
            const response = await apiService.deleteOrganization(id);
            console.log('Delete organization response:', response);

            // Optimistic update
            set((draft) => {
              draft.organizations = arrayUtils.removeItem(draft.organizations, id);
            });

            // Update cache and invalidate related caches
            const cached = appCache.get('organizations') || [];
            appCache.set('organizations', arrayUtils.removeItem(cached, id));

            // Invalidate related caches that might reference this organization
            appCache.invalidatePattern(`.*${id}.*`);

            return true;
          } catch (error) {
            console.error('❌ Error deleting organization:', error);
            return false;
          }
        },

        // ========================================================================
        // INWARD ENTRIES
        // ========================================================================

        fetchInwardEntries: async (force = false, filters?: {
          client_org_id?: string;
          inward_date_from?: string;
          inward_date_to?: string;
        }) => {
          // Include filters in cache key to cache filtered results separately
          const filterKey = filters
            ? JSON.stringify(filters)
            : 'default';
          const cacheKey = `inwardEntries_${filterKey}`;

          if (!force) {
            const cached = appCache.get(cacheKey);
            if (cached) {
              set((draft) => {
                draft.inwardEntries = cached;
              });
              return;
            }
          }

          return appInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchInwardEntries', async () => {
              set((draft) => {
                draft.loading.inwardEntries = true;
                draft.errors.inwardEntries = null;
              });

              try {
                const response = await apiService.getInwards(filters);

                let inwardEntries: InwardEntry[] = [];
                if (Array.isArray(response)) {
                  inwardEntries = response;
                } else if (response && Array.isArray(response.data)) {
                  inwardEntries = response.data;
                }

                appCache.set(cacheKey, inwardEntries);

                set((draft) => {
                  draft.inwardEntries = inwardEntries;
                  draft.loading.inwardEntries = false;
                  draft.errors.inwardEntries = null;
                });

                console.log(`✅ Fetched ${inwardEntries.length} inward entries`);
                return inwardEntries;
              } catch (error) {
                console.error('❌ Error fetching inward entries:', error);
                const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch inward entries';

                set((draft) => {
                  draft.loading.inwardEntries = false;
                  draft.errors.inwardEntries = errorMessage;
                });
                throw error;
              }
            });
          });
        },

        createInwardEntry: async (data) => {
          try {
            const response = await apiService.createInward(data);
            const inwardEntry = Array.isArray(response) ? response[0] : response;

            if (inwardEntry) {
              // Optimistic update - add immediately
              set((draft) => {
                draft.inwardEntries = arrayUtils.addItem(draft.inwardEntries, inwardEntry, 'start');
              });

              // Update cache and invalidate related caches
              const cached = appCache.get('inwardEntries') || [];
              appCache.set('inwardEntries', arrayUtils.addItem(cached, inwardEntry, 'start'));
              // Invalidate related caches
              appCache.invalidatePattern(`.*${inwardEntry.id}.*`);
              appCache.invalidatePattern(`.*linkedGauges.*`);
            }

            return inwardEntry;
          } catch (error) {
            console.error('❌ Error creating inward entry:', error);
            return null;
          }
        },

        updateInwardEntry: async (id, data) => {
          try {
            const response = await apiService.updateInward(id, data);
            const inwardEntry = Array.isArray(response) ? response[0] : response;

            if (inwardEntry) {
              // Optimistic update - update immediately
              set((draft) => {
                draft.inwardEntries = arrayUtils.updateItem(draft.inwardEntries, id, inwardEntry);
              });

              // Update cache and invalidate related caches
              const cached = appCache.get('inwardEntries') || [];
              appCache.set('inwardEntries', arrayUtils.updateItem(cached, id, inwardEntry));
              // Invalidate related caches
              appCache.invalidatePattern(`.*${id}.*`);
              appCache.invalidatePattern(`.*linkedGauges.*`);
              appCache.invalidatePattern(`.*inward.*${id}.*`);
            }

            return inwardEntry;
          } catch (error) {
            console.error('❌ Error updating inward entry:', error);
            return null;
          }
        },

        deleteInwardEntry: async (id) => {
          try {
            await apiService.deleteInward(id);

            set((draft) => {
              draft.inwardEntries = arrayUtils.removeItem(draft.inwardEntries, id);
            });

            // Invalidate all inward entry caches to ensure consistency
            appCache.invalidatePattern('inwardEntries.*');

            // Invalidate related caches
            appCache.invalidatePattern(`.*inward.*${id}.*|.*${id}.*inward.*`);

            return true;
          } catch (error) {
            console.error('❌ Error deleting inward entry:', error);
            return false;
          }
        },

        // ========================================================================
        // LINKED GAUGES
        // ========================================================================

        fetchLinkedGauges: async (force = false) => {
          const cacheKey = 'linkedGauges';

          if (!force) {
            const cached = appCache.get(cacheKey);
            if (cached) {
              set((draft) => {
                draft.linkedGauges = cached;
              });
              return cached;
            }
          }

          return appInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchLinkedGauges', async () => {
              set((draft) => {
                draft.loading.linkedGauges = true;
                draft.errors.linkedGauges = null;
              });

              try {
                // Use correct endpoint for inward gauges list
                const response = await apiService.getInwardGauges();

                let linkedGauges: LinkedGauge[] = [];
                if (Array.isArray(response)) {
                  linkedGauges = response;
                } else if (response && Array.isArray(response.data)) {
                  linkedGauges = response.data;
                }

                appCache.set(cacheKey, linkedGauges);

                set((draft) => {
                  draft.linkedGauges = linkedGauges;
                  draft.loading.linkedGauges = false;
                  draft.errors.linkedGauges = null;
                });

                console.log(`✅ Fetched ${linkedGauges.length} linked gauges`);
                return linkedGauges;
              } catch (error) {
                console.error('❌ Error fetching linked gauges:', error);
                const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch linked gauges';

                // Check for CORS or network errors
                const isCorsError = error instanceof ApiError &&
                  (error.code === 'CORS_ERROR' || errorMessage.includes('CORS'));
                const isNetworkError = error instanceof ApiError && error.status === 0;

                set((draft) => {
                  draft.loading.linkedGauges = false;
                  draft.errors.linkedGauges = errorMessage;
                  // Set empty array on error to allow dashboard to work with partial data
                  if (isCorsError || isNetworkError) {
                    draft.linkedGauges = [];
                  }
                });

                // Return empty array instead of throwing - allow dashboard to work with partial data
                return [];
              }
            });
          });
        },

        fetchGaugesByInward: async (inwardId) => {
          set((draft) => {
            draft.loading.linkedGauges = true;
            draft.errors.linkedGauges = null;
          });

          try {
            const response = await apiService.getGaugesByInward(inwardId);

            let gauges: LinkedGauge[] = [];
            if (Array.isArray(response)) {
              gauges = response;
            } else if (response && Array.isArray(response.data)) {
              gauges = response.data;
            }

            // Update the linked gauges with the new data for this inward
            set((draft) => {
              // Remove existing gauges for this inward
              draft.linkedGauges = draft.linkedGauges.filter(gauge => gauge.inward_id !== inwardId);
              // Add new gauges
              draft.linkedGauges.push(...gauges);
              draft.loading.linkedGauges = false;
              draft.errors.linkedGauges = null;
            });

            console.log(`✅ Fetched ${gauges.length} gauges for inward ${inwardId}`);
          } catch (error) {
            console.error('❌ Error fetching gauges by inward:', error);
            const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch gauges';

            set((draft) => {
              draft.loading.linkedGauges = false;
              draft.errors.linkedGauges = errorMessage;
            });
          }
        },

        linkGaugeToInward: async (data) => {
          try {
            const response = await apiService.linkGaugeToInward(data);

            // Get the linked gauge from response if available
            let linkedGauge = null;
            if (response && response.id) {
              linkedGauge = response;
            } else if (response) {
              linkedGauge = response;
            }

            // Optimistic update - add to linked gauges immediately if we have the data
            if (linkedGauge) {
              set((draft) => {
                // Check if gauge already exists to avoid duplicates
                const exists = draft.linkedGauges.some(g => g.id === linkedGauge.id);
                if (!exists) {
                  draft.linkedGauges = arrayUtils.addItem(draft.linkedGauges, linkedGauge, 'start');
                }
              });

              // Invalidate related caches
              appCache.invalidatePattern(`.*${data.inward_id}.*`);
              appCache.invalidate(`linkedGauges`);
            }

            // Refresh gauges for this inward to ensure consistency
            await get().actions.fetchGaugesByInward(data.inward_id, true);

            return true;
          } catch (error) {
            console.error('❌ Error linking gauge to inward:', error);
            return false;
          }
        },

        // ========================================================================
        // GAUGE MASTERS
        // ========================================================================

        fetchGaugeMasters: async (force = false) => {
          const cacheKey = 'gaugeMasters';

          if (!force) {
            const cached = appCache.get(cacheKey);
            if (cached) {
              set((draft) => {
                draft.gaugeMasters = cached;
              });
              return cached;
            }
          }

          return appInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchGaugeMasters', async () => {
              set((draft) => {
                draft.loading.gaugeMasters = true;
                draft.errors.gaugeMasters = null;
              });

              try {
                const response = await apiService.getGaugeMasters({
                  page: 0,
                  limit: DEFAULT_BULK_FETCH_LIMIT,
                });
                let gaugeMasters: GaugeMaster[] = [];

                if (Array.isArray(response)) {
                  gaugeMasters = response;
                } else if (response && Array.isArray(response.data)) {
                  gaugeMasters = response.data;
                }

                appCache.set(cacheKey, gaugeMasters);

                set((draft) => {
                  draft.gaugeMasters = gaugeMasters;
                  draft.loading.gaugeMasters = false;
                  draft.errors.gaugeMasters = null;
                });

                return gaugeMasters;
              } catch (error) {
                const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch gauge masters';

                set((draft) => {
                  draft.loading.gaugeMasters = false;
                  draft.errors.gaugeMasters = errorMessage;
                });
                throw error;
              }
            });
          });
        },

        // ========================================================================
        // CERTIFICATE TYPES
        // ========================================================================

        fetchCertificateTypes: async (force = false) => {
          const cacheKey = 'certificateTypes';

          if (!force) {
            const cached = appCache.get(cacheKey);
            if (cached) {
              set((draft) => {
                draft.certificateTypes = cached;
              });
              return cached;
            }
          }

          return appInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchCertificateTypes', async () => {
              set((draft) => {
                draft.loading.certificateTypes = true;
                draft.errors.certificateTypes = null;
              });

              try {
                const response = await apiService.getCertificateTypes();

                let certificateTypes: CertificateType[] = [];
                if (Array.isArray(response)) {
                  certificateTypes = response;
                } else if (response && Array.isArray(response.data)) {
                  certificateTypes = response.data;
                }

                appCache.set(cacheKey, certificateTypes);

                set((draft) => {
                  draft.certificateTypes = certificateTypes;
                  draft.loading.certificateTypes = false;
                  draft.errors.certificateTypes = null;
                });

                console.log(`✅ Fetched ${certificateTypes.length} certificate types`);
                return certificateTypes;
              } catch (error) {
                console.error('❌ Error fetching certificate types:', error);
                const errorMessage = error instanceof ApiError ? error.message : 'Failed to fetch certificate types';

                set((draft) => {
                  draft.loading.certificateTypes = false;
                  draft.errors.certificateTypes = errorMessage;
                });
                throw error;
              }
            });
          });
        },

        // ========================================================================
        // CALIBRATION CERTIFICATES - REMOVED
        // Using gauge status (inward_received, calibration_completed) instead
        // ========================================================================

        // ========================================================================
        // UTILITY METHODS
        // ========================================================================

        clearError: (entity) => {
          set((draft) => {
            draft.errors[entity] = null;
          });
        },

        clearAllErrors: () => {
          set((draft) => {
            draft.errors = {
              organizations: null,
              inwardEntries: null,
              linkedGauges: null,
              gaugeMasters: null,
              certificateTypes: null,
            };
          });
        },

        refreshAll: async () => {
          const actions = get().actions;
          await Promise.all([
            actions.fetchOrganizations(true),
            actions.fetchInwardEntries(true),
            actions.fetchLinkedGauges(true),
            actions.fetchGaugeMasters(true),
            actions.fetchCertificateTypes(true),
          ]);
        },

        // Cache management utilities
        clearAllCaches: () => {
          appCache.clear();
          appInFlight.cancelAll();
        },

        getCacheStats: () => appCache.getStats(),

        cleanup: () => {
          appCache.cleanup();
        },
      },
    })),
    {
      name: 'app-store',
    }
  )
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

// Organizations
export const useOrganizations = () => {
  const organizations = useAppStore((state) => state.organizations);
  const loading = useAppStore((state) => state.loading.organizations);
  const error = useAppStore((state) => state.errors.organizations);
  const fetchOrganizations = useAppStore((state) => state.actions.fetchOrganizations);
  const createOrganization = useAppStore((state) => state.actions.createOrganization);
  const updateOrganization = useAppStore((state) => state.actions.updateOrganization);
  const deleteOrganization = useAppStore((state) => state.actions.deleteOrganization);
  const clearError = useAppStore((state) => state.actions.clearError);

  return {
    organizations,
    loading,
    error,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    clearError,
  };
};

// Inward Entries
export const useInwardEntries = () => {
  const inwardEntries = useAppStore((state) => state.inwardEntries);
  const loading = useAppStore((state) => state.loading.inwardEntries);
  const error = useAppStore((state) => state.errors.inwardEntries);
  const fetchInwardEntries = useAppStore((state) => state.actions.fetchInwardEntries);
  const createInwardEntry = useAppStore((state) => state.actions.createInwardEntry);
  const updateInwardEntry = useAppStore((state) => state.actions.updateInwardEntry);
  const deleteInwardEntry = useAppStore((state) => state.actions.deleteInwardEntry);
  const clearError = useAppStore((state) => state.actions.clearError);

  return {
    inwardEntries,
    loading,
    error,
    fetchInwardEntries,
    createInwardEntry,
    updateInwardEntry,
    deleteInwardEntry,
    clearError,
  };
};

// Linked Gauges
export const useLinkedGauges = () => {
  const linkedGauges = useAppStore((state) => state.linkedGauges);
  const loading = useAppStore((state) => state.loading.linkedGauges);
  const error = useAppStore((state) => state.errors.linkedGauges);
  const fetchLinkedGauges = useAppStore((state) => state.actions.fetchLinkedGauges);
  const fetchGaugesByInward = useAppStore((state) => state.actions.fetchGaugesByInward);
  const linkGaugeToInward = useAppStore((state) => state.actions.linkGaugeToInward);
  const clearError = useAppStore((state) => state.actions.clearError);

  return {
    linkedGauges,
    loading,
    error,
    fetchLinkedGauges,
    fetchGaugesByInward,
    linkGaugeToInward,
    clearError,
  };
};

// Gauge Masters
export const useGaugeMasters = () => {
  const gaugeMasters = useAppStore((state) => state.gaugeMasters);
  const loading = useAppStore((state) => state.loading.gaugeMasters);
  const error = useAppStore((state) => state.errors.gaugeMasters);
  const fetchGaugeMasters = useAppStore((state) => state.actions.fetchGaugeMasters);
  const clearError = useAppStore((state) => state.actions.clearError);

  return {
    gaugeMasters,
    loading,
    error,
    fetchGaugeMasters,
    clearError,
  };
};

// Certificate Types
export const useCertificateTypes = () => {
  const certificateTypes = useAppStore((state) => state.certificateTypes);
  const loading = useAppStore((state) => state.loading.certificateTypes);
  const error = useAppStore((state) => state.errors.certificateTypes);
  const fetchCertificateTypes = useAppStore((state) => state.actions.fetchCertificateTypes);
  const clearError = useAppStore((state) => state.actions.clearError);

  return {
    certificateTypes,
    loading,
    error,
    fetchCertificateTypes,
    clearError,
  };
};

// Calibration Certificates hook removed - using gauge status instead
