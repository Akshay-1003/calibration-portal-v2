import { create } from "zustand";
import { apiClient } from "../services/api";
import { apiService } from "../services/apiService";
import { queryClient } from "../core/query/queryClient";
import { queryKeys } from "../hooks/queries/queryKeys";
import { fetchAllGaugeMasters } from "../hooks/queries/gaugeMasters";
import { toast } from "sonner";
import { GaugeData as ExistingGaugeType } from "../types/types";
import { StoreCache, InFlightManager } from '../utils/storeCache';
import { arrayUtils, performanceUtils } from './baseStore';
import {
    extractPaginatedList,
    type PaginatedListResult,
    toApiPage,
    toUiPage,
} from '../utils/paginatedResponse';

/***************************************************************************************************
 * TYPES
 ***************************************************************************************************/
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

export interface GaugeMaster {
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
    hasSubtype?: boolean;
    has_sub_part?: boolean; // API returns this field
    archived: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string;
}

export interface InwardGauge {
    id: string;
    inward_id: string;
    specifications?: any;
}
export interface ScopeMasterData {
    id: string;
    archived: boolean;
    updated_at: string;
    created_at: string;
    deleted_at: string | null;
    master_gauge_id: string;
    unit: 'mm' | 'µm' | 'inch' | 'Kg/cm2' | 'bar' | 'Pa' | 'Degree';
    range: { min: string; max: string };
    least_count: string;
    valid_until: string;
    uncertainty: string;
    confidence_level_and_coverage: string;
    calibration_location: 'permanent_facility' | 'on_site' | 'mobile';
    remarks: string;
    calibration_equipments: string[];
    master_equipments: string[];
}
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
    archived: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string;
}

export interface ExistingGaugesPaginationState {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

type ExistingGaugesPageCache = Record<string, PaginatedListResult<ExistingGaugeType> | undefined>;

// Create unified cache instances
const storeCache = new StoreCache({ ttl: 5 * 60 * 1000 }); // 5 minutes
const storeInFlight = new InFlightManager();

const normalizeGaugeResponse = (
    response: any,
    fallback: Partial<CompanyGaugeData> = {}
): Partial<CompanyGaugeData> => {
    if (!response) return { ...fallback };
    const payload = response?.data ?? response;
    if (typeof payload !== "object" || payload === null) {
        return { ...fallback };
    }
    return { ...fallback, ...payload };
};

const normalizeScopeMasterResponse = (
    response: any,
    fallback: Partial<ScopeMasterData> = {}
): ScopeMasterData => {
    const payload = response?.data ?? response;
    const source = typeof payload === "object" && payload !== null ? payload : {};

    return {
        id: String((source as any)?.id ?? fallback.id ?? ""),
        archived: Boolean((source as any)?.archived ?? fallback.archived ?? false),
        updated_at: String((source as any)?.updated_at ?? fallback.updated_at ?? ""),
        created_at: String((source as any)?.created_at ?? fallback.created_at ?? ""),
        deleted_at: ((source as any)?.deleted_at ?? fallback.deleted_at ?? null) as string | null,
        master_gauge_id: String((source as any)?.master_gauge_id ?? fallback.master_gauge_id ?? ""),
        unit: ((source as any)?.unit ?? fallback.unit ?? "mm") as ScopeMasterData["unit"],
        range: {
            min: String((source as any)?.range?.min ?? fallback.range?.min ?? "0"),
            max: String((source as any)?.range?.max ?? fallback.range?.max ?? "0"),
        },
        least_count: String((source as any)?.least_count ?? fallback.least_count ?? "0"),
        valid_until: String((source as any)?.valid_until ?? fallback.valid_until ?? ""),
        uncertainty: String((source as any)?.uncertainty ?? fallback.uncertainty ?? ""),
        confidence_level_and_coverage: String(
            (source as any)?.confidence_level_and_coverage ??
            fallback.confidence_level_and_coverage ??
            ""
        ),
        calibration_location: ((source as any)?.calibration_location ??
            fallback.calibration_location ??
            "permanent_facility") as ScopeMasterData["calibration_location"],
        remarks: String((source as any)?.remarks ?? fallback.remarks ?? ""),
        calibration_equipments: Array.isArray((source as any)?.calibration_equipments)
            ? (source as any).calibration_equipments
            : (fallback.calibration_equipments ?? []),
        master_equipments: Array.isArray((source as any)?.master_equipments)
            ? (source as any).master_equipments
            : (fallback.master_equipments ?? []),
    };
};

/***************************************************************************************************
 * STORE SHAPE
 ***************************************************************************************************/
interface AppStore {
    /********************* Gauge Master *********************/
    gaugeMasterList: GaugeMaster[];
    gaugeMasterLoading: boolean;
    gaugeLoading: boolean;
    gauge: CompanyGaugeData[];
    scopeMastersList: ScopeMasterData[];
    scopeMasterLoading: boolean;
    /********************* Certificate Types *********************/
    certificateTypes: CertificateType[];
    certificateTypeLoading: boolean;

    /********************* Existing Gauges *********************/
    existingGauges: ExistingGaugeType[];
    existingGaugeLoading: boolean;
    existingGaugesPagination: ExistingGaugesPaginationState;
    existingGaugesPageCache: ExistingGaugesPageCache;

    /********************* Unified Cache System *********************/
    _cache: StoreCache;
    _inFlight: InFlightManager;

    /********************* ACTIONS *********************/
    fetchGaugeMasters: (forceRefresh?: boolean) => Promise<GaugeMaster[] | undefined>;
    fetchCertificateTypes: (forceRefresh?: boolean) => Promise<CertificateType[]>;

    fetchExistingGauges: (
        clientId: string | null,
        options?: {
            page?: number;
            limit?: number;
            forceRefresh?: boolean;
        }
    ) => Promise<void>;
    updateGauge: (gaugeId: string, updatedGauge: Partial<CompanyGaugeData>) => Promise<void>;
    deleteGauge: (gaugeId: string) => Promise<void>;

    getGaugeById: (id: string) => CompanyGaugeData | undefined;

    /********************* Scope Master Actions *********************/
    fetchScopeMasters: (forceRefresh?: boolean) => Promise<void>;
    fetchScopeMasterById: (id: string, forceRefresh?: boolean) => Promise<ScopeMasterData | undefined>;
    createScopeMaster: (payload: Partial<ScopeMasterData>) => Promise<void>;
    updateScopeMaster: (id: string, payload: Partial<ScopeMasterData>) => Promise<void>;
    deleteScopeMaster: (id: string) => Promise<void>;
    getScopeMasterById: (id: string) => ScopeMasterData | undefined;
    resetMasterData: () => void;
    
}

/***************************************************************************************************
 * STORE IMPLEMENTATION
 ***************************************************************************************************/
export const useMasterDataStore = create<AppStore>((set, get) => ({
    /************************ DATA ************************/
    gaugeMasterList: [],
    gauge: [],
    gaugeMasterLoading: false,
    gaugeLoading: false,
    certificateTypes: [],
    certificateTypeLoading: false,

    existingGauges: [],
    existingGaugeLoading: false,
    existingGaugesPagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    },
    existingGaugesPageCache: {},

    scopeMastersList: [],
    scopeMasterLoading: false,

    _cache: storeCache,
    _inFlight: storeInFlight,


    fetchGaugeMasters: async (forceRefresh = false) => {
        const cacheKey = "gaugeMasters";
        const cachedQuery = queryClient.getQueryData<GaugeMaster[]>(
            queryKeys.gaugeMasters.list()
        );

        // Check cache first
        if (!forceRefresh) {
            const cached = storeCache.get(cacheKey);
            if (cached && Array.isArray(cached)) {
                set({ gaugeMasterList: cached });
                return;
            }
            if (cachedQuery && Array.isArray(cachedQuery)) {
                storeCache.set(cacheKey, cachedQuery);
                set({ gaugeMasterList: cachedQuery });
                return cachedQuery;
            }
        }

        return storeInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchGaugeMasters', async () => {
                set({ gaugeMasterLoading: true });

                try {
                    const safeList = await queryClient.fetchQuery({
                        queryKey: queryKeys.gaugeMasters.list(),
                        queryFn: fetchAllGaugeMasters,
                        staleTime: 60 * 60 * 1000,
                    });

                    storeCache.set(cacheKey, safeList);
                    set({
                        gaugeMasterList: safeList,
                        gaugeMasterLoading: false,
                    });

                    return safeList;
                } catch (err) {
                    console.error("Error fetching gauge masters:", err);
                    set({
                        gaugeMasterList: [],
                        gaugeMasterLoading: false
                    });
                    toast.error("Failed to load Gauge Masters");
                    throw err;
                }
            });
        });
    },

    fetchCertificateTypes: async (forceRefresh = false) => {
        const cacheKey = "certificateTypes";
        const cachedQuery = queryClient.getQueryData<CertificateType[]>(
            queryKeys.certificateTypes.list()
        );

        // Check cache first
        if (!forceRefresh) {
            const cached = storeCache.get(cacheKey);
            if (cached) {
                set({ certificateTypes: cached });
                return cached;
            }
            if (cachedQuery && Array.isArray(cachedQuery)) {
                storeCache.set(cacheKey, cachedQuery);
                set({ certificateTypes: cachedQuery });
                return cachedQuery;
            }
        }

        return storeInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchCertificateTypes', async () => {
                set({ certificateTypeLoading: true });

                try {
                    const certificateTypes = await queryClient.fetchQuery({
                        queryKey: queryKeys.certificateTypes.list(),
                        queryFn: async () => {
                            const response = await apiService.getCertificateTypes();
                            if (Array.isArray(response)) return response as CertificateType[];
                            if (Array.isArray((response as any)?.data)) return (response as any).data as CertificateType[];
                            if (Array.isArray((response as any)?.certificate_types)) {
                                return (response as any).certificate_types as CertificateType[];
                            }
                            return [];
                        },
                        staleTime: 60 * 60 * 1000,
                    });

                    storeCache.set(cacheKey, certificateTypes);
                    set({
                        certificateTypes: certificateTypes,
                        certificateTypeLoading: false,
                    });

                    return certificateTypes;
                } catch (err) {
                    console.error("Error fetching certificate types:", err);
                    set({ certificateTypeLoading: false });
                    toast.error("Failed to load Certificate Types");
                    throw err;
                }
            });
        });
    },

    fetchExistingGauges: async (clientId: string | null, options) => {
        if (!clientId) return;

        const requestedPage = Math.max(options?.page ?? 1, 1);
        const requestedLimit = Math.max(options?.limit ?? 10, 1);
        const apiPage = toApiPage(requestedPage);
        const forceRefresh = options?.forceRefresh ?? false;
        const cacheKey = `existing_${clientId}_${apiPage}_${requestedLimit}`;

        // Check cache first
        const stateCached = forceRefresh ? undefined : get().existingGaugesPageCache[cacheKey];
        if (stateCached) {
            set({
                existingGauges: stateCached.items,
                existingGaugesPagination: {
                    total: stateCached.total,
                    page: toUiPage(stateCached.page),
                    limit: stateCached.limit,
                    totalPages: stateCached.totalPages,
                },
            });
            return;
        }

        const cached = forceRefresh ? undefined : storeCache.get(cacheKey);
        if (cached) {
            const normalized = cached as PaginatedListResult<ExistingGaugeType>;
            set({
                existingGauges: normalized.items,
                existingGaugesPagination: {
                    total: normalized.total,
                    page: toUiPage(normalized.page),
                    limit: normalized.limit,
                    totalPages: normalized.totalPages,
                },
                existingGaugesPageCache: {
                    ...get().existingGaugesPageCache,
                    [cacheKey]: normalized,
                },
            });
            return;
        }

        return storeInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchExistingGauges', async () => {
                set({ existingGaugeLoading: true });

                try {
                    const queryParams = new URLSearchParams({
                        page: String(apiPage),
                        limit: String(requestedLimit),
                    });
                    const res = await apiClient.get(`/gauge/organization/${clientId}/gauges?${queryParams.toString()}`);
                    const normalized = extractPaginatedList<ExistingGaugeType>(res, {
                        arrayKeys: ["data", "gauges"],
                        fallbackPage: apiPage,
                        fallbackLimit: requestedLimit,
                    });

                    // Update cache and state
                    storeCache.set(cacheKey, normalized);
                    set({
                        existingGauges: normalized.items,
                        existingGaugeLoading: false,
                        existingGaugesPagination: {
                            total: normalized.total,
                            page: toUiPage(normalized.page),
                            limit: normalized.limit,
                            totalPages: normalized.totalPages,
                        },
                        existingGaugesPageCache: {
                            ...get().existingGaugesPageCache,
                            [cacheKey]: normalized,
                        },
                    });

                    console.log(`✅ Fetched ${normalized.items.length} existing gauges for client ${clientId}`);
                    return;
                } catch (err) {
                    console.error("Error fetching existing gauges:", err);
                    set({ existingGaugeLoading: false });
                    toast.error("Failed to load Existing Gauges");
                    throw err;
                }
            });
        });
    },

    updateGauge: async (gaugeId: string, updatedGauge: Partial<CompanyGaugeData>) => {
        try {
            const response = await apiClient.patch(`/gauge/master/${gaugeId}`, updatedGauge);
            const normalizedGauge = normalizeGaugeResponse(response, { id: gaugeId, ...updatedGauge });

            // Optimistic update - update all related state immediately
            set(state => ({
                gaugeMasterList: arrayUtils.updateItem(state.gaugeMasterList, gaugeId, normalizedGauge),
                gauge: arrayUtils.updateItem(state.gauge, gaugeId, normalizedGauge),
                // Invalidate related caches to ensure fresh data
                lastFetch: null,
            }));

            // Update cache and invalidate related caches
            const cached = storeCache.get("gaugeMasters") || [];
            storeCache.set("gaugeMasters", arrayUtils.updateItem(cached, gaugeId, normalizedGauge));
            // Invalidate related caches that might reference this gauge
            storeCache.invalidatePattern(`.*gauge.*${gaugeId}.*|.*${gaugeId}.*gauge.*`);
            storeCache.invalidate(`existing_*`); // Invalidate all existing gauge caches
            await queryClient.invalidateQueries({ queryKey: queryKeys.gaugeMasters.lists() });

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
            
            // Optimistic update - remove from all related state immediately
            set(state => ({
                gaugeMasterList: arrayUtils.removeItem(state.gaugeMasterList, gaugeId),
                gauge: arrayUtils.removeItem(state.gauge, gaugeId),
                // Invalidate cache timestamp to force refresh
                lastFetch: null,
            }));

            // Update cache and invalidate all related caches
            const cached = storeCache.get("gaugeMasters") || [];
            storeCache.set("gaugeMasters", arrayUtils.removeItem(cached, gaugeId));
            // Invalidate all patterns that might reference this gauge
            storeCache.invalidatePattern(`.*${gaugeId}.*`);
            storeCache.invalidatePattern(`.*gauge.*${gaugeId}.*`);
            storeCache.invalidate(`existing_*`); // Invalidate all existing gauge caches
            await queryClient.invalidateQueries({ queryKey: queryKeys.gaugeMasters.lists() });

            toast.success("Gauge deleted successfully!");
        } catch (error) {
            console.error("Error deleting gauge:", error);
            toast.error("Failed to delete gauge");
            throw error;
        }
    },
    getGaugeById: (id: string) => {
        const state = get();
        return state.gaugeMasterList.find(gauge => gauge.id === id);
    },

    fetchScopeMasters: async (forceRefresh = false) => {
        const cacheKey = "scopeMastersList";

        // Check cache first
        if (!forceRefresh) {
            const cached = storeCache.get(cacheKey);
            if (cached) {
                set({ scopeMastersList: cached });
                return;
            }
        }

        return storeInFlight.getOrCreate(cacheKey, async () => {
            return performanceUtils.measureOperation('fetchScopeMasters', async () => {
                set({ scopeMasterLoading: true });

                try {
                    const firstResponse = await apiClient.get(`/scope-masters?page=0`) as any;
                    const firstPage = extractPaginatedList<ScopeMasterData>(firstResponse, {
                        arrayKeys: ["data", "items", "scope_masters", "scopes"],
                        fallbackPage: 0,
                    });
                    const list = [...firstPage.items];

                    for (let page = 1; page < firstPage.totalPages; page += 1) {
                        const queryParams = new URLSearchParams({
                            page: String(page),
                            ...(firstPage.limit ? { limit: String(firstPage.limit) } : {}),
                        });
                        const response = await apiClient.get(`/scope-masters?${queryParams.toString()}`) as any;
                        const nextPage = extractPaginatedList<ScopeMasterData>(response, {
                            arrayKeys: ["data", "items", "scope_masters", "scopes"],
                            fallbackPage: page,
                            fallbackLimit: firstPage.limit,
                        });
                        list.push(...nextPage.items);
                    }

                    // Update cache and state
                    storeCache.set(cacheKey, list);
                    set({
                        scopeMastersList: list,
                        scopeMasterLoading: false,
                    });

                    console.log(`✅ Fetched ${list.length} scope masters`);
                    return list;
                } catch (err) {
                    console.error("Error fetching scope masters:", err);
                    set({ scopeMasterLoading: false });
                    toast.error("Failed to load Scope Masters");
                    throw err;
                }
            });
        });
    },

    fetchScopeMasterById: async (id: string, forceRefresh = false) => {
        const cacheKey = `scopeMaster:${id}`;

        if (!forceRefresh) {
            const existingScopeMaster = get().scopeMastersList.find((scope) => scope.id === id);
            if (existingScopeMaster) {
                return existingScopeMaster;
            }

            const cached = storeCache.get(cacheKey);
            if (cached) {
                const normalizedCached = normalizeScopeMasterResponse(cached, { id });
                set((state) => ({
                    scopeMastersList: state.scopeMastersList.some((scope) => scope.id === id)
                        ? arrayUtils.updateItem(state.scopeMastersList, id, normalizedCached)
                        : arrayUtils.addItem(state.scopeMastersList, normalizedCached, "start"),
                }));
                return normalizedCached;
            }
        }

        set({ scopeMasterLoading: true });

        try {
            const response = await apiClient.get(`/scope-master/${id}`) as any;
            const normalizedScopeMaster = normalizeScopeMasterResponse(response, { id });

            storeCache.set(cacheKey, normalizedScopeMaster);
            const cachedList = storeCache.get("scopeMastersList") || [];
            storeCache.set(
                "scopeMastersList",
                Array.isArray(cachedList) && cachedList.some((scope: ScopeMasterData) => scope.id === id)
                    ? arrayUtils.updateItem(cachedList, id, normalizedScopeMaster)
                    : arrayUtils.addItem(cachedList, normalizedScopeMaster, "start")
            );

            set((state) => ({
                scopeMastersList: state.scopeMastersList.some((scope) => scope.id === id)
                    ? arrayUtils.updateItem(state.scopeMastersList, id, normalizedScopeMaster)
                    : arrayUtils.addItem(state.scopeMastersList, normalizedScopeMaster, "start"),
                scopeMasterLoading: false,
            }));

            return normalizedScopeMaster;
        } catch (error) {
            console.error("Error fetching scope master:", error);
            set({ scopeMasterLoading: false });
            throw error;
        }
    },

    createScopeMaster: async (payload: Partial<ScopeMasterData>) => {
        try {
            const res = await apiClient.post("/scope-master", payload);
            const created = normalizeScopeMasterResponse(res);
            
            if (created) {
                // Optimistic update - add immediately
                set((state) => ({
                    scopeMastersList: arrayUtils.addItem(state.scopeMastersList, created, 'start'),
                    // Clear cache timestamp
                    lastFetch: null,
                }));

                // Update cache and invalidate related caches
                const cached = storeCache.get("scopeMastersList") || [];
                storeCache.set("scopeMastersList", arrayUtils.addItem(cached, created, 'start'));
                // Invalidate related patterns
                storeCache.invalidatePattern(`.*scope.*`);
                storeCache.set(`scopeMaster:${created.id}`, created);
            }

            await queryClient.invalidateQueries({ queryKey: queryKeys.scopeMasters.all });

            toast.success("Scope master created successfully!");
        } catch (error) {
            console.error("Error creating scope master:", error);
            toast.error("Failed to create scope master");
            throw error;
        }
    },

    updateScopeMaster: async (id: string, payload: Partial<ScopeMasterData>) => {
        try {
            const updated = await apiClient.patch(`/scope-master/${id}`, payload);
            const updatedData = normalizeScopeMasterResponse(updated, { id });
            
            // Optimistic update - update immediately
            set((state) => ({
                scopeMastersList: arrayUtils.updateItem(state.scopeMastersList, id, updatedData),
                // Clear cache timestamp
                lastFetch: null,
            }));

            // Update cache and invalidate related caches
            const cached = storeCache.get("scopeMastersList") || [];
            storeCache.set("scopeMastersList", arrayUtils.updateItem(cached, id, updatedData));
            // Invalidate related patterns
            storeCache.invalidatePattern(`.*scope.*`);
            storeCache.invalidatePattern(`.*${id}.*`);
            storeCache.set(`scopeMaster:${id}`, updatedData);

            await queryClient.invalidateQueries({ queryKey: queryKeys.scopeMasters.all });
            await queryClient.invalidateQueries({ queryKey: queryKeys.scopeMasters.detail(id) });

            toast.success("Scope master updated successfully!");
        } catch (error) {
            console.error("Error updating scope master:", error);
            toast.error("Failed to update scope master");
            throw error;
        }
    },

    deleteScopeMaster: async (id: string) => {
        try {
            await apiClient.delete(`/scope-master/${id}`);
            
            // Optimistic update - remove immediately
            set((state) => ({
                scopeMastersList: arrayUtils.removeItem(state.scopeMastersList, id),
                // Clear cache timestamp
                lastFetch: null,
            }));

            // Update cache and invalidate all related caches
            const cached = storeCache.get("scopeMastersList") || [];
            storeCache.set("scopeMastersList", arrayUtils.removeItem(cached, id));
            // Invalidate all related patterns
            storeCache.invalidatePattern(`.*${id}.*`);
            storeCache.invalidatePattern(`.*scope.*`);
            storeCache.invalidate(`scopeMaster:${id}`);

            await queryClient.invalidateQueries({ queryKey: queryKeys.scopeMasters.all });
            await queryClient.invalidateQueries({ queryKey: queryKeys.scopeMasters.detail(id) });

            toast.success("Scope master deleted successfully!");
        } catch (error) {
            console.error("Error deleting scope master:", error);
            toast.error("Failed to delete scope master");
            throw error;
        }
    },

    getScopeMasterById: (id: string) => {
        const state = get();
        return state.scopeMastersList.find((s) => s.id === id);
    },

    resetMasterData: () => {
        storeCache.clear();
        storeInFlight.cancelAll();
        set({
            gaugeMasterList: [],
            certificateTypes: [],
            existingGauges: [],
            existingGaugesPagination: {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 1,
            },
            existingGaugesPageCache: {},
            scopeMastersList: [],
            gaugeMasterLoading: false,
            certificateTypeLoading: false,
            existingGaugeLoading: false,
            scopeMasterLoading: false,
        });
    },
}));
   
