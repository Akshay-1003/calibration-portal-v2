// src/store/inwardGaugeStore.ts
import { create } from "zustand";
import { apiClient, ApiError } from "../services/api";
import { API_ENDPOINTS, API_CONFIG } from "../config/api";
import { toast } from "sonner";
import type { RegisterGaugeResponse } from "../types";
import type {
  InwardEntry,
  LinkedGauge,
  Gauge,
  CombinedGaugeData,
  CertificateGaugeData,
  Observations,
  Specifications,
} from "../types";

import type { GaugeData } from "../types/types";
import type { CertificateData } from "../types/types";
import { CacheManager, createCacheKey, isCacheEntryValid } from "../utils/cacheManager";
import { enableCacheDebugging } from "../utils/cacheDebugger";
import { logger } from "../utils/logger";
import { buildQueryString, hasActiveFilters } from "../utils/filterBuilder";
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
  toApiPage,
  toUiPage,
} from "../utils/paginatedResponse";

/* -----------------------------
   Types
   ----------------------------- */

//

type LoadingState = {
  loadingAllInwards: boolean;
  loadingCalibrationList: boolean;
  loadingDataSaveList: boolean;
  loadingGauge: boolean; // single gauge by gaugeId
  loadingCompositeGauge: boolean; // single gauge by inward+gauge
  loadingCurrentGauge: boolean; // fetchAllCertificateGaugeData
  loadingPendingGauges: boolean; // fetchAllCurrentPendingInwardedGauges
  loadingCalibrationHistory: boolean; // calibration history by identification number
};

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const filterRecordByPrefix = <T>(
  record: Record<string, T | undefined>,
  prefix: string
): Record<string, T | undefined> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith(prefix))) as Record<string, T | undefined>;

// Calibration History Type
export interface CalibrationHistoryEntry {
  id: string;
  inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  calibration_date?: string;
  status: string;
  observations: Observations;
  specifications: Specifications;
  certificate_type: string;
  master_gauge_name: string;
  client_org_name?: string;
  calibration_done_under?: string;
  created_at: string;
  updated_at: string;
}

export interface InwardGaugeState {
  // Data
  allInwardEntries: InwardEntry[];
  currentInwardGauges: CertificateGaugeData | null; // single current gauge result
  pendingInwardedGauges: LinkedGauge[];
  currentInwardById: Record<string, Record<string, CertificateGaugeData | undefined>>;
  currentInwardPendingById: Record<string, LinkedGauge[] | undefined>;
  currentInwardPendingMetaById: Record<string, PaginationState | undefined>;
  currentInwardPendingPageCacheByKey: Record<string, LinkedGauge[] | undefined>;
  currentInwardPendingMetaCacheByKey: Record<string, PaginationState | undefined>;

  calibrationListByInwardId: Record<string, LinkedGauge[] | undefined>;
  calibrationListMetaByInwardId: Record<string, PaginationState | undefined>;
  calibrationListPageCacheByKey: Record<string, LinkedGauge[] | undefined>;
  calibrationListMetaCacheByKey: Record<string, PaginationState | undefined>;
  dataSaveListByInwardId: Record<string, CombinedGaugeData[] | undefined>;
  dataSaveListMetaByInwardId: Record<string, PaginationState | undefined>;
  dataSaveListCacheByInwardId: Record<string, CombinedGaugeData[] | undefined>;
  dataSaveListMetaCacheByInwardId: Record<string, PaginationState | undefined>;

  allInwardedgauges: LinkedGauge[]; // list from GET_INWARD_LIST

  // Calibration History
  calibrationHistory: Record<string, CalibrationHistoryEntry[]>; // keyed by identification_number

  // legacy/compat
  // removed legacy fields

  // loading + error (split)
  loading: LoadingState;
  error: string | null;

  // timestamps (cache)
  lastFetchAllInwards: number | null;
  lastFetchCalibrationList: number | null;
  lastFetchPendingById: Record<string, number | null>;
  lastFetchCurrentByGaugeId: Record<string, number | null>;

  lastFetchCalibrationListByInwardId: Record<string, number | null>;
  lastFetchDataSaveListByInwardId: Record<string, number | null>;
  lastFetchCalibrationHistory: Record<string, number | null>; // keyed by identification_number

  cacheDuration: number;

  // Actions (typed)
  fetchAllInwardEntries: (force?: boolean, filters?: { inward_date_from?: string; inward_date_to?: string }) => Promise<InwardEntry[]>;
  FetchInwardedGaugeByGaugeId: (gaugeId: string, force?: boolean) => Promise<GaugeData | null>;
  FetchInwardedGaugeByGaugeIdAndInwardId: (inwardId: string, gaugeId: string, force?: boolean) => Promise<CertificateGaugeData | null>;
  fetchInwardGaugeRecord: (inwardId: string, gaugeInwardId: string) => Promise<CertificateGaugeData | null>;
  fetchAllCurrentPendingInwardedGauges: (
    inwardId: string,
    force?: boolean,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string },
    pagination?: { page?: number; limit?: number }
  ) => Promise<LinkedGauge[]>;
  fetchAllCurrentInwardedGauges: (
    inwardId: string,
    force?: boolean,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string },
    pagination?: { page?: number; limit?: number }
  ) => Promise<LinkedGauge[]>;
  fetchAllCurrentInwardedGaugesForPrint: (
    inwardId: string,
    force?: boolean,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string }
  ) => Promise<LinkedGauge[]>;
  fetchAllCurrentInwardDataSaves: (inwardId: string, force?: boolean) => Promise<CombinedGaugeData[]>;
  fetchGaugesWithFilters: (filters?: { client_org_id?: string; inward_date_from?: string; inward_date_to?: string; lab_id?: string; status?: string }) => Promise<LinkedGauge[]>;

  addInwardGaugeToState: (inwardId: string, payload: Record<string, unknown>, process: string) => Promise<CombinedGaugeData | null>;
  mapGaugeToInwardState: (inwardId: string, gaugeId: string, process: string) => Promise<CombinedGaugeData | null>;
  updateInwardGaugeInState: (
    inwardId: string,
    gaugeId: string,
    payload: Partial<CombinedGaugeData>,
    flowType?: "calibration" | "data_save"
  ) => Promise<CombinedGaugeData[] | null>;
  deleteInwardGaugeFromState: (inwardId: string, gaugeId: string) => Promise<CombinedGaugeData[] | null>;
  deleteInwardDataSaveFromState: (inwardId: string, gaugeId: string) => Promise<CombinedGaugeData[] | null>;

  // caches & helpers
  // removed unused cache helpers

  isCurrentInwardCacheValid: (inwardId: string) => boolean;
  isPendingInwardCacheValid: (inwardId: string) => boolean;

  getCachedCurrentInwardGauges: (inwardId: string) => Record<string, CertificateGaugeData | undefined> | undefined;
  isCompositeCacheValid: (inwardId: string, gaugeId: string) => boolean;
  getCachedCompositeGauge: (inwardId: string, gaugeId: string) => CertificateGaugeData | null;

  submitUpdatedCertificateData: (
    inwardId: string,
    gaugeId: string,
    payload: Partial<CertificateGaugeData>,
    options?: {
      generateCertificate?: boolean;
      awaitCertificateGeneration?: boolean;
    }
  ) => Promise<CertificateGaugeData | null>;
  invalidateCompositeGaugeCache: (inwardId: string, gaugeId: string) => void;

  // Calibration History
  fetchCalibrationHistory: (identificationNumber: string, force?: boolean) => Promise<CalibrationHistoryEntry[]>;
  getCachedCalibrationHistory: (identificationNumber: string) => CalibrationHistoryEntry[] | undefined;

  clearError: () => void;
}

/* -----------------------------
   Cache managers (typed)
   ----------------------------- */
const gaugeCache = new CacheManager<Gauge>({ ttl: API_CONFIG.CACHE_DURATION });
const compositeGaugeCache = new CacheManager<CertificateGaugeData>({ ttl: API_CONFIG.CACHE_DURATION });

if (process.env.NODE_ENV === "development") {
  // enable debug logging of caches
  enableCacheDebugging({ gaugeCache, compositeGaugeCache } as Record<string, unknown>);
}

/* -----------------------------
   Helper: extract message
   ----------------------------- */
function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  const errorWithResponse = err as {
    response?: {
      data?: {
        message?: string;
      };
      message?: string;
    };
  };
  if (errorWithResponse.response?.data?.message) return errorWithResponse.response.data.message;
  if (errorWithResponse.response?.message) return errorWithResponse.response.message;
  return "An unexpected error occurred";
}

const isDataSaveFlow = (process?: string) => process === "data_save";

const getGaugeIdentifier = (item: Partial<CombinedGaugeData> & { gauge_id?: string; gaugeInfo?: { gauge_id?: string } }) =>
  item.gauge_id || item.gaugeInfo?.gauge_id || item.id || "";

/* -----------------------------
   Typed unified async runner
   - toggles loading[key] = true/false
   - handles error reporting centrally
   ----------------------------- */
async function runAsync<T>(
  set: (fn: Partial<InwardGaugeState> | ((s: InwardGaugeState) => Partial<InwardGaugeState>)) => void,
  getLoadingKey: (s: InwardGaugeState) => Partial<LoadingState>,
  keyName: keyof LoadingState,
  fn: () => Promise<T>
): Promise<T | null> {
  // set loading true
  set((s: InwardGaugeState) => ({ loading: { ...s.loading, ...getLoadingKey(s), [keyName]: true }, error: null }));
  try {
    const res = await fn();
    return res;
  } catch (err) {
    const msg = extractErrorMessage(err);
    toast.error(msg);
    set({ error: msg });
    return null;
  } finally {
    // set loading false
    set((s: InwardGaugeState) => ({ loading: { ...s.loading, ...getLoadingKey(s), [keyName]: false } }));
  }
}

/* -----------------------------
   Store creation (typed)
   ----------------------------- */
export const useInwardGaugeStore = create<InwardGaugeState>((set, get) => ({
  // --------------------------
  // State initial values
  // --------------------------
  allInwardEntries: [],

  currentInwardGauges: null,
  pendingInwardedGauges: [],

  currentInwardById: {},
  currentInwardPendingById: {},
  currentInwardPendingMetaById: {},
  currentInwardPendingPageCacheByKey: {},
  currentInwardPendingMetaCacheByKey: {},

  calibrationListByInwardId: {},
  calibrationListMetaByInwardId: {},
  calibrationListPageCacheByKey: {},
  calibrationListMetaCacheByKey: {},
  dataSaveListByInwardId: {},
  dataSaveListMetaByInwardId: {},
  dataSaveListCacheByInwardId: {},
  dataSaveListMetaCacheByInwardId: {},

  allInwardedgauges: [],

  loading: {
    loadingAllInwards: false,
    loadingCalibrationList: false,
    loadingDataSaveList: false,
    loadingGauge: false,
    loadingCompositeGauge: false,
    loadingCurrentGauge: false,
    loadingPendingGauges: false,
    loadingCalibrationHistory: false,
  },

  error: null,

  lastFetchAllInwards: null,
  lastFetchCalibrationList: null,
  lastFetchCurrentByGaugeId: {},
  lastFetchPendingById: {},

  lastFetchCalibrationListByInwardId: {},
  lastFetchDataSaveListByInwardId: {},
  lastFetchCalibrationHistory: {},

  calibrationHistory: {},

  cacheDuration: API_CONFIG.CACHE_DURATION,

  // --------------------------
  // Actions implementation
  // --------------------------

  fetchAllInwardEntries: async (force = false, filters?: { inward_date_from?: string; inward_date_to?: string }) =>
    runAsync(
      set,
      () => ({}),
      "loadingAllInwards",
      async () => {
        const now = Date.now();
        const ts = get().lastFetchAllInwards;
        
        if (!force && isCacheEntryValid(ts, get().cacheDuration) && !filters) {
          return get().allInwardEntries;
        }

        // Build query string with date filters
        const queryParams = new URLSearchParams();
        if (filters?.inward_date_from) {
          queryParams.append('inward_date_from', filters.inward_date_from);
        }
        if (filters?.inward_date_to) {
          queryParams.append('inward_date_to', filters.inward_date_to);
        }
        
        const endpoint = queryParams.toString() 
          ? `${API_ENDPOINTS.INWARDS.LIST}?${queryParams.toString()}`
          : API_ENDPOINTS.INWARDS.LIST;

        const resp = await apiClient.get<InwardEntry[]>(endpoint);
        const arr = Array.isArray(resp) ? resp : [];
        set({ allInwardEntries: arr, lastFetchAllInwards: now });
        return arr;
      }
    ) as Promise<InwardEntry[]>,

  FetchInwardedGaugeByGaugeId: async (gaugeId, force = false) =>
    runAsync(
      set,
      () => ({}),
      "loadingGauge",
      async () => {
        if (!gaugeId) throw new Error("Invalid gaugeId");

        // if cached & not force -> return
        if (!force && gaugeCache.isValid(gaugeId)) {
          const cached = gaugeCache.get(gaugeId);
          return cached ?? null;
        }

        const resp = await apiClient.get<GaugeData>(API_ENDPOINTS.GAUGES.GET_INWARD_GAUGE(gaugeId));
        if (!resp) throw new Error("No data received");
        gaugeCache.set(gaugeId, resp as unknown as Gauge);
        return resp as GaugeData;
      }
    ) as Promise<GaugeData | null>,
  FetchInwardedGaugeByGaugeIdAndInwardId: async (inwardId, gaugeId, force = false) =>
    runAsync(
      set,
      () => ({}),
      "loadingCompositeGauge",
      async () => {
        if (!inwardId || !gaugeId) throw new Error("Invalid inwardId or gaugeId");

        const cacheKey = createCacheKey(inwardId, gaugeId);

        if (!force && compositeGaugeCache.isValid(cacheKey)) {
          const cached = compositeGaugeCache.get(cacheKey) ?? null;

          set((s) => ({
            currentInwardGauges: cached ?? undefined,
            currentInwardById: {
              ...s.currentInwardById,
              [inwardId]: {
                ...(s.currentInwardById[inwardId] ?? {}),
                [gaugeId]: cached ?? undefined,
              },
            },
          }));


          return cached;
        }

        // -------------------------------------------------------------
        // 2. NO CACHE → clear ONLY UI state (NOT CACHE)
        //    Prevents stale data showing until API completes
        // -------------------------------------------------------------
        set({ currentInwardGauges: null });

        // -------------------------------------------------------------
        // 3. FETCH FROM API
        // -------------------------------------------------------------
        const resp = await apiClient.get<CertificateGaugeData>(
          API_ENDPOINTS.GAUGES.BY_INWARD_GAUGE_ID(inwardId, gaugeId)
        );

        // save fresh to cache
        compositeGaugeCache.set(cacheKey, resp);

        // update UI & indexed by ID
        set((s) => ({
          currentInwardGauges: resp,
          currentInwardById: {
            ...s.currentInwardById,
            [inwardId]: {
              ...(s.currentInwardById[inwardId] || {}),
              [gaugeId]: resp,
            },
          },
        }));

        return resp;
      }
    ) as Promise<CertificateGaugeData | null>,

  fetchInwardGaugeRecord: async (inwardId, gaugeInwardId) =>
    runAsync(
      set,
      () => ({}),
      "loadingCompositeGauge",
      async () => {
        if (!inwardId || !gaugeInwardId) throw new Error("Invalid inward or inward gauge ID");
        const response = await apiClient.get<CertificateGaugeData>(
          API_ENDPOINTS.GAUGES.INWARD_RECORD(gaugeInwardId, inwardId)
        );
        return response;
      }
    ) as Promise<CertificateGaugeData | null>,


  fetchAllCurrentPendingInwardedGauges: async (
    inwardId,
    force = false,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string },
    pagination?: { page?: number; limit?: number }
  ) =>
    runAsync(
      set,
      () => ({}),
      "loadingPendingGauges",
      async () => {
        if (!inwardId) throw new Error("inwardId required");

        const requestedPage = Math.max(pagination?.page ?? 1, 1);
        const requestedLimit = Math.max(pagination?.limit ?? 10, 1);
        const apiPage = toApiPage(requestedPage);
        const requestKey = `${inwardId}_${apiPage}_${requestedLimit}_${JSON.stringify(filters ?? {})}`;
        const ts = get().lastFetchPendingById[requestKey];
        const cached = get().currentInwardPendingPageCacheByKey[requestKey];
        const cachedMeta = get().currentInwardPendingMetaCacheByKey[requestKey];
        if (
          !force &&
          isCacheEntryValid(ts, get().cacheDuration) &&
          cached &&
          cachedMeta &&
          !filters
        ) {
          set({
            pendingInwardedGauges: cached,
            currentInwardPendingById: { ...get().currentInwardPendingById, [inwardId]: cached },
            currentInwardPendingMetaById: { ...get().currentInwardPendingMetaById, [inwardId]: cachedMeta },
          });
          return cached;
        }

        // Ensure calibration list available (single source of truth)
        await get().fetchAllCurrentInwardedGauges(inwardId, force, filters, pagination);

        const list = get().calibrationListByInwardId[inwardId] ?? [];
        if (!Array.isArray(list)) return [];

        // const pending = list.filter((g) => g?.status !== "calibration_completed");
        const pending = list;

        set({
          pendingInwardedGauges: list,
          currentInwardPendingById: { ...get().currentInwardPendingById, [inwardId]: pending },
          currentInwardPendingMetaById: {
            ...get().currentInwardPendingMetaById,
            [inwardId]: get().calibrationListMetaByInwardId[inwardId],
          },
          currentInwardPendingPageCacheByKey: {
            ...get().currentInwardPendingPageCacheByKey,
            [requestKey]: pending,
          },
          currentInwardPendingMetaCacheByKey: {
            ...get().currentInwardPendingMetaCacheByKey,
            [requestKey]: get().calibrationListMetaByInwardId[inwardId],
          },
          lastFetchPendingById: { ...get().lastFetchPendingById, [requestKey]: Date.now() },
        });

        return pending;
      }
    ) as Promise<LinkedGauge[]>,

  fetchAllCurrentInwardedGauges: async (
    inwardId,
    force = false,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string },
    pagination?: { page?: number; limit?: number }
  ) =>
    runAsync(
      set,
      () => ({}),
      "loadingCalibrationList",
      async () => {
        if (!inwardId) throw new Error("Invalid inwardId");

        const requestedPage = Math.max(pagination?.page ?? 1, 1);
        const requestedLimit = Math.max(pagination?.limit ?? 10, 1);
        const apiPage = toApiPage(requestedPage);
        const requestKey = `${inwardId}_${apiPage}_${requestedLimit}_${JSON.stringify(filters ?? {})}`;
        const ts = get().lastFetchCalibrationListByInwardId[requestKey];

        const cached = get().calibrationListPageCacheByKey[requestKey];
        const cachedMeta = get().calibrationListMetaCacheByKey[requestKey];
        if (
          !force &&
          isCacheEntryValid(ts ?? null, get().cacheDuration) &&
          cached &&
          cachedMeta &&
          !filters
        ) {
          set({
            allInwardedgauges: cached,
            calibrationListByInwardId: {
              ...get().calibrationListByInwardId,
              [inwardId]: cached,
            },
            calibrationListMetaByInwardId: {
              ...get().calibrationListMetaByInwardId,
              [inwardId]: cachedMeta,
            },
          });
          return cached;
        }

        // Build query string with inward_id and optional date filters
        const queryParams = new URLSearchParams();
        queryParams.append('inward_id', inwardId);
        queryParams.append('page', String(apiPage));
        queryParams.append('limit', String(requestedLimit));
        if (filters?.inward_date_from) {
          queryParams.append('inward_date_from', filters.inward_date_from);
        }
        if (filters?.inward_date_to) {
          queryParams.append('inward_date_to', filters.inward_date_to);
        }
        if (filters?.search?.trim()) {
          queryParams.append('search', filters.search.trim());
        }

        const resp = await apiClient.get<LinkedGauge[]>(
          `${API_ENDPOINTS.GAUGES.GET_INWARD_LIST}?${queryParams.toString()}`
        );
        logger.debug('Fetched inward gauges for inward:', inwardId, 'with filters:', filters);
        const normalized = extractPaginatedList<LinkedGauge>(resp, {
          arrayKeys: ["data", "items"],
          fallbackPage: apiPage,
          fallbackLimit: requestedLimit,
        });
        const arr = normalized.items;
        set({
          allInwardedgauges: arr,
          calibrationListByInwardId: { ...get().calibrationListByInwardId, [inwardId]: arr },
          calibrationListMetaByInwardId: {
            ...get().calibrationListMetaByInwardId,
            [inwardId]: {
              total: normalized.total,
              page: toUiPage(normalized.page),
              limit: normalized.limit,
              totalPages: normalized.totalPages,
            },
          },
          calibrationListPageCacheByKey: {
            ...get().calibrationListPageCacheByKey,
            [requestKey]: arr,
          },
          calibrationListMetaCacheByKey: {
            ...get().calibrationListMetaCacheByKey,
            [requestKey]: {
              total: normalized.total,
              page: toUiPage(normalized.page),
              limit: normalized.limit,
              totalPages: normalized.totalPages,
            },
          },
          lastFetchCalibrationListByInwardId: { ...get().lastFetchCalibrationListByInwardId, [requestKey]: Date.now() },
        });

        return arr;
      }
    ) as Promise<LinkedGauge[]>,

  fetchAllCurrentInwardedGaugesForPrint: async (
    inwardId,
    force = false,
    filters?: { inward_date_from?: string; inward_date_to?: string; search?: string }
  ) =>
    runAsync(
      set,
      () => ({}),
      "loadingCalibrationList",
      async () => {
        if (!inwardId) throw new Error("Invalid inwardId");

        const fullPageLimit = DEFAULT_BULK_FETCH_LIMIT;
        const fetchPage = async (apiPage: number) => {
          const queryParams = new URLSearchParams();
          queryParams.append("inward_id", inwardId);
          queryParams.append("page", String(apiPage));
          queryParams.append("limit", String(fullPageLimit));

          if (filters?.inward_date_from) {
            queryParams.append("inward_date_from", filters.inward_date_from);
          }
          if (filters?.inward_date_to) {
            queryParams.append("inward_date_to", filters.inward_date_to);
          }
          if (filters?.search?.trim()) {
            queryParams.append("search", filters.search.trim());
          }

          const response = await apiClient.get<LinkedGauge[]>(
            `${API_ENDPOINTS.GAUGES.GET_INWARD_LIST}?${queryParams.toString()}`
          );

          return extractPaginatedList<LinkedGauge>(response, {
            arrayKeys: ["data", "items"],
            fallbackPage: apiPage,
            fallbackLimit: fullPageLimit,
          });
        };

        const firstPage = await fetchPage(0);
        const allItems = [...firstPage.items];

        for (let apiPage = firstPage.page + 1; apiPage < firstPage.totalPages; apiPage += 1) {
          const nextPage = await fetchPage(apiPage);
          allItems.push(...nextPage.items);
        }

        const dedupedItems = Array.from(
          new Map(
            allItems.map((item, index) => [
              item.gauge_id || item.id || `${item.inward_id}_${index}`,
              item,
            ])
          ).values()
        );

        logger.debug("Fetched complete inward gauge list for print", {
          inwardId,
          total: dedupedItems.length,
          force,
        });

        return dedupedItems;
      }
    ) as Promise<LinkedGauge[]>,

  fetchAllCurrentInwardDataSaves: async (inwardId, force = false) =>
    runAsync(
      set,
      () => ({}),
      "loadingDataSaveList",
      async () => {
        if (!inwardId) throw new Error("Invalid inwardId");

        const ts = get().lastFetchDataSaveListByInwardId[inwardId];
        const cached = get().dataSaveListCacheByInwardId[inwardId];
        const cachedMeta = get().dataSaveListMetaCacheByInwardId[inwardId];

        if (!force && isCacheEntryValid(ts ?? null, get().cacheDuration) && cached && cachedMeta) {
          set({
            dataSaveListByInwardId: {
              ...get().dataSaveListByInwardId,
              [inwardId]: cached,
            },
            dataSaveListMetaByInwardId: {
              ...get().dataSaveListMetaByInwardId,
              [inwardId]: cachedMeta,
            },
          });

          return cached;
        }

        const queryParams = new URLSearchParams();
        queryParams.append("inward_id", inwardId);

        const resp = await apiClient.get<CombinedGaugeData[]>(
          `${API_ENDPOINTS.GAUGES.GET_INWARD_DATA_SAVE_LIST}?${queryParams.toString()}`
        );

        const normalized = extractPaginatedList<CombinedGaugeData>(resp, {
          arrayKeys: ["data", "items"],
          fallbackPage: 1,
          fallbackLimit: Array.isArray(resp) ? resp.length || 10 : 10,
        });

        const arr = normalized.items;
        const meta = {
          total: normalized.total,
          page: toUiPage(normalized.page),
          limit: normalized.limit,
          totalPages: normalized.totalPages,
        };

        set({
          dataSaveListByInwardId: {
            ...get().dataSaveListByInwardId,
            [inwardId]: arr,
          },
          dataSaveListMetaByInwardId: {
            ...get().dataSaveListMetaByInwardId,
            [inwardId]: meta,
          },
          dataSaveListCacheByInwardId: {
            ...get().dataSaveListCacheByInwardId,
            [inwardId]: arr,
          },
          dataSaveListMetaCacheByInwardId: {
            ...get().dataSaveListMetaCacheByInwardId,
            [inwardId]: meta,
          },
          lastFetchDataSaveListByInwardId: {
            ...get().lastFetchDataSaveListByInwardId,
            [inwardId]: Date.now(),
          },
        });

        return arr;
      }
    ) as Promise<CombinedGaugeData[]>,

  addInwardGaugeToState: async (inwardId, newGauge, process) =>
    runAsync(
      set,
      () => ({}),
      "loadingCurrentGauge",
      async () => {
        if (!inwardId) throw new Error("inwardId required");
        const gaugeData = await apiClient.post<CombinedGaugeData>("/gauge", newGauge);
        const createdGaugeId = gaugeData?.id;
        if (!createdGaugeId) return null;
        let gaugeInfo: RegisterGaugeResponse = {} as RegisterGaugeResponse;
        const shouldMapToInward = !isDataSaveFlow(process);
        if (shouldMapToInward) {
          gaugeInfo = await apiClient.post<RegisterGaugeResponse>("/gauge/inward/map", {
            inward_id: inwardId,
            gauge_id: createdGaugeId,
            process,
          });
        } else {
          await apiClient.post(API_ENDPOINTS.GAUGES.DATA_SAVE_MAP, {
            inward_id: inwardId,
            gauge_id: createdGaugeId,
            process,
          });
        }

        gaugeCache.set(gaugeData.id, gaugeData as unknown as Gauge);

        if (!shouldMapToInward) {
          const prevDataSaves = get().dataSaveListByInwardId[inwardId] ?? [];
          const updatedDataSaves = [gaugeData as CombinedGaugeData, ...prevDataSaves];
          const prevMeta = get().dataSaveListMetaByInwardId[inwardId];

          set({
            dataSaveListByInwardId: {
              ...get().dataSaveListByInwardId,
              [inwardId]: updatedDataSaves,
            },
            dataSaveListMetaByInwardId: {
              ...get().dataSaveListMetaByInwardId,
              [inwardId]: prevMeta
                ? {
                    ...prevMeta,
                    total: prevMeta.total + 1,
                    totalPages: Math.max(Math.ceil((prevMeta.total + 1) / Math.max(prevMeta.limit, 1)), 1),
                  }
                : {
                    total: updatedDataSaves.length,
                    page: 1,
                    limit: updatedDataSaves.length,
                    totalPages: 1,
                  },
            },
            dataSaveListCacheByInwardId: {
              ...get().dataSaveListCacheByInwardId,
              [inwardId]: updatedDataSaves,
            },
            dataSaveListMetaCacheByInwardId: {
              ...get().dataSaveListMetaCacheByInwardId,
              [inwardId]: prevMeta
                ? {
                    ...prevMeta,
                    total: prevMeta.total + 1,
                    totalPages: Math.max(Math.ceil((prevMeta.total + 1) / Math.max(prevMeta.limit, 1)), 1),
                  }
                : {
                    total: updatedDataSaves.length,
                    page: 1,
                    limit: updatedDataSaves.length,
                    totalPages: 1,
                  },
            },
            lastFetchDataSaveListByInwardId: {
              ...get().lastFetchDataSaveListByInwardId,
              [inwardId]: Date.now(),
            },
          });

          return gaugeData as CombinedGaugeData;
        }

        const linked: LinkedGauge = {
          id: gaugeInfo.id,
          gauge_class: gaugeData.gauge_class,
          identification_number: gaugeData.identification_number,
          make: gaugeData.make,
          manf_serial_number: gaugeData.manf_serial_number,
          inward_id: gaugeInfo.inward_id,
          client_org_name: gaugeInfo.client_org_name,
          master_gauge_name: gaugeInfo.master_gauge_name,
          status: gaugeData.status,
          inward_date: gaugeData.created_at,
          gauge_id: gaugeInfo.gauge_id,
          inward_gauge_lab_id: gaugeInfo.inward_gauge_lab_id,
          specifications: gaugeData.specifications,
        };

        const prev = get().pendingInwardedGauges ?? [];
        const pendingMeta = get().currentInwardPendingMetaById[inwardId];
        const calibrationMeta = get().calibrationListMetaByInwardId[inwardId];
        const cachePrefix = `${inwardId}_`;
        const updated =
          pendingMeta?.page === 1
            ? [linked, ...prev].slice(0, pendingMeta.limit)
            : prev;
        const updatedCalibration =
          calibrationMeta?.page === 1
            ? [linked, ...(get().calibrationListByInwardId[inwardId] || [])].slice(0, calibrationMeta.limit)
            : (get().calibrationListByInwardId[inwardId] || []);

        // Update all related state immediately
        set({
          pendingInwardedGauges: updated,
          currentInwardPendingById: { ...get().currentInwardPendingById, [inwardId]: updated },
          currentInwardPendingMetaById: {
            ...get().currentInwardPendingMetaById,
            [inwardId]: pendingMeta
              ? {
                  ...pendingMeta,
                  total: pendingMeta.total + 1,
                  totalPages: Math.max(Math.ceil((pendingMeta.total + 1) / pendingMeta.limit), 1),
                }
              : undefined,
          },
          // Also update calibration list to keep in sync
          calibrationListByInwardId: {
            ...get().calibrationListByInwardId,
            [inwardId]: updatedCalibration,
          },
          calibrationListMetaByInwardId: {
            ...get().calibrationListMetaByInwardId,
            [inwardId]: calibrationMeta
              ? {
                  ...calibrationMeta,
                  total: calibrationMeta.total + 1,
                  totalPages: Math.max(Math.ceil((calibrationMeta.total + 1) / calibrationMeta.limit), 1),
                }
              : undefined,
          },
          allInwardedgauges: [...(get().allInwardedgauges || []), linked],
          currentInwardPendingPageCacheByKey: filterRecordByPrefix(get().currentInwardPendingPageCacheByKey, cachePrefix),
          currentInwardPendingMetaCacheByKey: filterRecordByPrefix(get().currentInwardPendingMetaCacheByKey, cachePrefix),
          calibrationListPageCacheByKey: filterRecordByPrefix(get().calibrationListPageCacheByKey, cachePrefix),
          calibrationListMetaCacheByKey: filterRecordByPrefix(get().calibrationListMetaCacheByKey, cachePrefix),
          lastFetchPendingById: filterRecordByPrefix(get().lastFetchPendingById, cachePrefix),
          lastFetchCalibrationListByInwardId: filterRecordByPrefix(get().lastFetchCalibrationListByInwardId, cachePrefix),
        });

        return linked as unknown as CombinedGaugeData;
      }
    ) as Promise<CombinedGaugeData | null>,

  mapGaugeToInwardState: async (inwardId, gaugeId, process) =>
    runAsync(
      set,
      () => ({}),
      "loadingCurrentGauge",
      async () => {
        if (!inwardId) throw new Error("inwardId required");
        if (!gaugeId) throw new Error("gaugeId required");

        const gaugeData =
          gaugeCache.get(gaugeId) ??
          await apiClient.get<CombinedGaugeData>(API_ENDPOINTS.GAUGES.GET_INWARD_GAUGE(gaugeId));

        if (!gaugeData?.id) {
          throw new Error("Gauge not found");
        }

        gaugeCache.set(gaugeId, gaugeData as unknown as Gauge);

        const shouldMapToInward = !isDataSaveFlow(process);

        if (!shouldMapToInward) {
          await apiClient.post(API_ENDPOINTS.GAUGES.DATA_SAVE_MAP, {
            inward_id: inwardId,
            gauge_id: gaugeId,
            process,
          });

          const prevDataSaves = get().dataSaveListByInwardId[inwardId] ?? [];
          const alreadyMapped = prevDataSaves.some(
            (item) => getGaugeIdentifier(item as CombinedGaugeData & { gauge_id?: string }) === gaugeId
          );
          const updatedDataSaves = alreadyMapped
            ? prevDataSaves
            : [gaugeData as CombinedGaugeData, ...prevDataSaves];
          const prevMeta = get().dataSaveListMetaByInwardId[inwardId];

          set({
            dataSaveListByInwardId: {
              ...get().dataSaveListByInwardId,
              [inwardId]: updatedDataSaves,
            },
            dataSaveListMetaByInwardId: {
              ...get().dataSaveListMetaByInwardId,
              [inwardId]: prevMeta
                ? {
                    ...prevMeta,
                    total: alreadyMapped ? prevMeta.total : prevMeta.total + 1,
                    totalPages: Math.max(
                      Math.ceil(
                        (alreadyMapped ? prevMeta.total : prevMeta.total + 1) / Math.max(prevMeta.limit, 1)
                      ),
                      1
                    ),
                  }
                : {
                    total: updatedDataSaves.length,
                    page: 1,
                    limit: updatedDataSaves.length,
                    totalPages: 1,
                  },
            },
            dataSaveListCacheByInwardId: {
              ...get().dataSaveListCacheByInwardId,
              [inwardId]: updatedDataSaves,
            },
            dataSaveListMetaCacheByInwardId: {
              ...get().dataSaveListMetaCacheByInwardId,
              [inwardId]: prevMeta
                ? {
                    ...prevMeta,
                    total: alreadyMapped ? prevMeta.total : prevMeta.total + 1,
                    totalPages: Math.max(
                      Math.ceil(
                        (alreadyMapped ? prevMeta.total : prevMeta.total + 1) / Math.max(prevMeta.limit, 1)
                      ),
                      1
                    ),
                  }
                : {
                    total: updatedDataSaves.length,
                    page: 1,
                    limit: updatedDataSaves.length,
                    totalPages: 1,
                  },
            },
            lastFetchDataSaveListByInwardId: {
              ...get().lastFetchDataSaveListByInwardId,
              [inwardId]: Date.now(),
            },
          });

          return gaugeData as CombinedGaugeData;
        }

        const gaugeInfo = await apiClient.post<RegisterGaugeResponse>("/gauge/inward/map", {
          inward_id: inwardId,
          gauge_id: gaugeId,
          process,
        });

        const linked: LinkedGauge = {
          id: gaugeInfo.id,
          gauge_class: gaugeData.gauge_class,
          identification_number: gaugeData.identification_number,
          make: gaugeData.make,
          manf_serial_number: gaugeData.manf_serial_number,
          inward_id: gaugeInfo.inward_id,
          client_org_name: gaugeInfo.client_org_name,
          master_gauge_name: gaugeInfo.master_gauge_name,
          status: gaugeInfo.status,
          inward_date: gaugeData.created_at,
          gauge_id: gaugeInfo.gauge_id,
          inward_gauge_lab_id: gaugeInfo.inward_gauge_lab_id,
          specifications: gaugeData.specifications,
          inward_no: 0,
        };

        const prev = get().pendingInwardedGauges ?? [];
        const pendingMeta = get().currentInwardPendingMetaById[inwardId];
        const calibrationMeta = get().calibrationListMetaByInwardId[inwardId];
        const cachePrefix = `${inwardId}_`;
        const alreadyMapped = prev.some((item) => item.gauge_id === gaugeId);
        const basePending = prev.filter((item) => item.gauge_id !== gaugeId);
        const baseCalibration = (get().calibrationListByInwardId[inwardId] || []).filter(
          (item) => item.gauge_id !== gaugeId
        );
        const updated =
          pendingMeta?.page === 1
            ? [linked, ...basePending].slice(0, pendingMeta.limit)
            : prev;
        const updatedCalibration =
          calibrationMeta?.page === 1
            ? [linked, ...baseCalibration].slice(0, calibrationMeta.limit)
            : (get().calibrationListByInwardId[inwardId] || []);

        set({
          pendingInwardedGauges: updated,
          currentInwardPendingById: { ...get().currentInwardPendingById, [inwardId]: updated },
          currentInwardPendingMetaById: {
            ...get().currentInwardPendingMetaById,
            [inwardId]: pendingMeta
              ? {
                  ...pendingMeta,
                  total: alreadyMapped ? pendingMeta.total : pendingMeta.total + 1,
                  totalPages: Math.max(
                    Math.ceil((alreadyMapped ? pendingMeta.total : pendingMeta.total + 1) / pendingMeta.limit),
                    1
                  ),
                }
              : undefined,
          },
          calibrationListByInwardId: {
            ...get().calibrationListByInwardId,
            [inwardId]: updatedCalibration,
          },
          calibrationListMetaByInwardId: {
            ...get().calibrationListMetaByInwardId,
            [inwardId]: calibrationMeta
              ? {
                  ...calibrationMeta,
                  total: alreadyMapped ? calibrationMeta.total : calibrationMeta.total + 1,
                  totalPages: Math.max(
                    Math.ceil((alreadyMapped ? calibrationMeta.total : calibrationMeta.total + 1) / calibrationMeta.limit),
                    1
                  ),
                }
              : undefined,
          },
          allInwardedgauges: alreadyMapped
            ? get().allInwardedgauges.map((item) => (item.gauge_id === gaugeId ? linked : item))
            : [...(get().allInwardedgauges || []), linked],
          currentInwardPendingPageCacheByKey: filterRecordByPrefix(get().currentInwardPendingPageCacheByKey, cachePrefix),
          currentInwardPendingMetaCacheByKey: filterRecordByPrefix(get().currentInwardPendingMetaCacheByKey, cachePrefix),
          calibrationListPageCacheByKey: filterRecordByPrefix(get().calibrationListPageCacheByKey, cachePrefix),
          calibrationListMetaCacheByKey: filterRecordByPrefix(get().calibrationListMetaCacheByKey, cachePrefix),
          lastFetchPendingById: filterRecordByPrefix(get().lastFetchPendingById, cachePrefix),
          lastFetchCalibrationListByInwardId: filterRecordByPrefix(get().lastFetchCalibrationListByInwardId, cachePrefix),
        });

        return linked as unknown as CombinedGaugeData;
      }
    ) as Promise<CombinedGaugeData | null>,

  updateInwardGaugeInState: async (inwardId, gaugeInwardId, updatedData, flowType = "calibration") =>
    runAsync(
      set,
      () => ({}),
      "loadingCurrentGauge",
      async () => {
        if (!gaugeInwardId) throw new Error("gaugeInwardId required");
        const resp = await apiClient.patch<CertificateGaugeData>(
          API_ENDPOINTS.GAUGES.INWARD_RECORD(gaugeInwardId, inwardId),
          updatedData
        );
        const updatedRecord = resp as Partial<CombinedGaugeData>;
        const updatedGaugeId = updatedRecord.gauge_id;
        if (updatedGaugeId) {
          compositeGaugeCache.set(
            createCacheKey(inwardId, updatedGaugeId),
            resp as CertificateGaugeData
          );
        }

        if (flowType === "data_save") {
          const currentDataSaves = get().dataSaveListByInwardId[inwardId] ?? [];
          const updatedDataSaves = currentDataSaves.map((item) => {
            if (item.id !== gaugeInwardId) {
              return item;
            }

            return {
              ...item,
              ...updatedRecord,
              id: gaugeInwardId,
            } as CombinedGaugeData;
          });

          set({
            dataSaveListByInwardId: {
              ...get().dataSaveListByInwardId,
              [inwardId]: updatedDataSaves,
            },
            dataSaveListCacheByInwardId: {
              ...get().dataSaveListCacheByInwardId,
              [inwardId]: updatedDataSaves,
            },
            lastFetchDataSaveListByInwardId: {
              ...get().lastFetchDataSaveListByInwardId,
              [inwardId]: Date.now(),
            },
          });

          return updatedDataSaves;
        }

        const prev = get().pendingInwardedGauges ?? [];
        const updatedList = prev.map((item) => {
          if (item.id !== gaugeInwardId) return item;
          const next = updatedRecord ?? updatedData;

          return {
            ...item,
            ...next,
            identification_number: next?.identification_number,
            make: next?.make,
            manf_serial_number: next?.manf_serial_number,
            status: next?.status,
            specifications: next?.specifications,
          } as LinkedGauge;
        });

        // Update all related state immediately
        const calibrationList = get().calibrationListByInwardId[inwardId] || [];
        const updatedCalibrationList = calibrationList.map((item) => {
          if (item.id !== gaugeInwardId) return item;
          const next = updatedRecord ?? updatedData;
          return {
            ...item,
            ...next,
            identification_number: next?.identification_number,
            make: next?.make,
            manf_serial_number: next?.manf_serial_number,
            status: next?.status
          } as LinkedGauge;
        });
        const cachePrefix = `${inwardId}_`;

        set({
          pendingInwardedGauges: updatedList,
          currentInwardGauges:
            get().currentInwardGauges?.id === gaugeInwardId
              ? { ...get().currentInwardGauges, ...updatedRecord }
              : get().currentInwardGauges,
          currentInwardById: updatedGaugeId
            ? {
                ...get().currentInwardById,
                [inwardId]: {
                  ...(get().currentInwardById[inwardId] || {}),
                  [updatedGaugeId]: {
                    ...(get().currentInwardById[inwardId]?.[updatedGaugeId] || {}),
                    ...(resp as CertificateGaugeData),
                  },
                },
              }
            : get().currentInwardById,
          currentInwardPendingById: { ...get().currentInwardPendingById, [inwardId]: updatedList },
          // Also update calibration list to keep in sync
          calibrationListByInwardId: {
            ...get().calibrationListByInwardId,
            [inwardId]: updatedCalibrationList,
          },
          currentInwardPendingPageCacheByKey: filterRecordByPrefix(get().currentInwardPendingPageCacheByKey, cachePrefix),
          currentInwardPendingMetaCacheByKey: filterRecordByPrefix(get().currentInwardPendingMetaCacheByKey, cachePrefix),
          calibrationListPageCacheByKey: filterRecordByPrefix(get().calibrationListPageCacheByKey, cachePrefix),
          calibrationListMetaCacheByKey: filterRecordByPrefix(get().calibrationListMetaCacheByKey, cachePrefix),
          allInwardedgauges: get().allInwardedgauges.map(item =>
            item.id === gaugeInwardId ? updatedList.find(u => u.id === gaugeInwardId) || item : item
          ),
          lastFetchPendingById: filterRecordByPrefix(get().lastFetchPendingById, cachePrefix),
          lastFetchCalibrationListByInwardId: filterRecordByPrefix(get().lastFetchCalibrationListByInwardId, cachePrefix),
        });

        return updatedList;
      }
    ) as Promise<CombinedGaugeData[] | null>,
  deleteInwardGaugeFromState: async (inwardId, gaugeId) =>
    runAsync(
      set,
      () => ({}),
      "loadingCurrentGauge",
      async () => {
        if (!inwardId) throw new Error("inwardId required")
        if (!gaugeId) throw new Error("gaugeId required")

        logger.debug("DELETE START", { inwardId, gaugeId });

        // 1️⃣ API DELETE (204 is SUCCESS)
        await apiClient.delete(
          `/gauge/inward/${inwardId}/gauge/${gaugeId}`
        )

        // 2️⃣ Update pending list
        const prevPending = get().pendingInwardedGauges ?? []
        const updatedPending = prevPending.filter(
          (item) => item.gauge_id !== gaugeId
        )

        // 3️⃣ Update calibration list
        const prevCalibration =
          get().calibrationListByInwardId[inwardId] ?? []
        const updatedCalibration = prevCalibration.filter(
          (item) => item.gauge_id !== gaugeId
        )

        // 4️⃣ Clear caches (VERY IMPORTANT)
        gaugeCache.clear(gaugeId)
        compositeGaugeCache.clear(createCacheKey(inwardId, gaugeId))

        // 5️⃣ Update Zustand state
        set((s) => ({
          currentInwardPendingPageCacheByKey: filterRecordByPrefix(s.currentInwardPendingPageCacheByKey, `${inwardId}_`),
          currentInwardPendingMetaCacheByKey: filterRecordByPrefix(s.currentInwardPendingMetaCacheByKey, `${inwardId}_`),
          pendingInwardedGauges: updatedPending,
          currentInwardPendingById: {
            ...s.currentInwardPendingById,
            [inwardId]: updatedPending,
          },
          currentInwardPendingMetaById: {
            ...s.currentInwardPendingMetaById,
            [inwardId]: s.currentInwardPendingMetaById[inwardId]
              ? {
                  ...s.currentInwardPendingMetaById[inwardId]!,
                  total: Math.max(s.currentInwardPendingMetaById[inwardId]!.total - 1, 0),
                  totalPages: Math.max(
                    Math.ceil(
                      Math.max(s.currentInwardPendingMetaById[inwardId]!.total - 1, 0) /
                        Math.max(s.currentInwardPendingMetaById[inwardId]!.limit, 1)
                    ),
                    1
                  ),
                }
              : undefined,
          },
          calibrationListByInwardId: {
            ...s.calibrationListByInwardId,
            [inwardId]: updatedCalibration,
          },
          calibrationListPageCacheByKey: filterRecordByPrefix(s.calibrationListPageCacheByKey, `${inwardId}_`),
          calibrationListMetaCacheByKey: filterRecordByPrefix(s.calibrationListMetaCacheByKey, `${inwardId}_`),
          calibrationListMetaByInwardId: {
            ...s.calibrationListMetaByInwardId,
            [inwardId]: s.calibrationListMetaByInwardId[inwardId]
              ? {
                  ...s.calibrationListMetaByInwardId[inwardId]!,
                  total: Math.max(s.calibrationListMetaByInwardId[inwardId]!.total - 1, 0),
                  totalPages: Math.max(
                    Math.ceil(
                      Math.max(s.calibrationListMetaByInwardId[inwardId]!.total - 1, 0) /
                        Math.max(s.calibrationListMetaByInwardId[inwardId]!.limit, 1)
                    ),
                    1
                  ),
                }
              : undefined,
          },
          lastFetchPendingById: filterRecordByPrefix(s.lastFetchPendingById, `${inwardId}_`),
          lastFetchCalibrationListByInwardId: filterRecordByPrefix(s.lastFetchCalibrationListByInwardId, `${inwardId}_`),
          allInwardedgauges: updatedCalibration,
          currentInwardGauges: null,
        }))

        logger.debug("DELETE DONE", { gaugeId });

        return updatedPending
      }
    ) as Promise<CombinedGaugeData[] | null>,

  deleteInwardDataSaveFromState: async (inwardId, gaugeId) =>
    runAsync(
      set,
      () => ({}),
      "loadingCurrentGauge",
      async () => {
        if (!inwardId) throw new Error("inwardId required");
        if (!gaugeId) throw new Error("gaugeId required");

        await apiClient.delete(
          API_ENDPOINTS.GAUGES.DELETE_INWARD_DATA_SAVE(inwardId, gaugeId)
        );

        gaugeCache.clear(gaugeId);
        compositeGaugeCache.clear(createCacheKey(inwardId, gaugeId));

        const previousDataSaves = get().dataSaveListByInwardId[inwardId] ?? [];
        const updatedDataSaves = previousDataSaves.filter(
          (item) => getGaugeIdentifier(item as CombinedGaugeData & { gauge_id?: string }) !== gaugeId
        );

        set((s) => ({
          dataSaveListByInwardId: {
            ...s.dataSaveListByInwardId,
            [inwardId]: updatedDataSaves,
          },
          dataSaveListMetaByInwardId: {
            ...s.dataSaveListMetaByInwardId,
            [inwardId]: s.dataSaveListMetaByInwardId[inwardId]
              ? {
                  ...s.dataSaveListMetaByInwardId[inwardId]!,
                  total: Math.max(s.dataSaveListMetaByInwardId[inwardId]!.total - 1, 0),
                  totalPages: Math.max(
                    Math.ceil(
                      Math.max(s.dataSaveListMetaByInwardId[inwardId]!.total - 1, 0) /
                        Math.max(s.dataSaveListMetaByInwardId[inwardId]!.limit, 1)
                    ),
                    1
                  ),
                }
              : undefined,
          },
          dataSaveListCacheByInwardId: {
            ...s.dataSaveListCacheByInwardId,
            [inwardId]: updatedDataSaves,
          },
          dataSaveListMetaCacheByInwardId: {
            ...s.dataSaveListMetaCacheByInwardId,
            [inwardId]: s.dataSaveListMetaByInwardId[inwardId]
              ? {
                  ...s.dataSaveListMetaByInwardId[inwardId]!,
                  total: Math.max(s.dataSaveListMetaByInwardId[inwardId]!.total - 1, 0),
                  totalPages: Math.max(
                    Math.ceil(
                      Math.max(s.dataSaveListMetaByInwardId[inwardId]!.total - 1, 0) /
                        Math.max(s.dataSaveListMetaByInwardId[inwardId]!.limit, 1)
                    ),
                    1
                  ),
                }
              : undefined,
          },
          lastFetchDataSaveListByInwardId: {
            ...s.lastFetchDataSaveListByInwardId,
            [inwardId]: Date.now(),
          },
        }));

        return updatedDataSaves;
      }
    ) as Promise<CombinedGaugeData[] | null>,

  // validation & getters

  // validation & getters
  isCurrentInwardCacheValid: (gaugeId: string) => isCacheEntryValid(get().lastFetchCurrentByGaugeId[gaugeId], get().cacheDuration),
  isPendingInwardCacheValid: (inwardId: string) => isCacheEntryValid(get().lastFetchPendingById[inwardId], get().cacheDuration),

  getCachedCurrentInwardGauges: (inwardId: string) => get().currentInwardById[inwardId],
  isCompositeCacheValid: (inwardId: string, gaugeId: string) => compositeGaugeCache.isValid(createCacheKey(inwardId, gaugeId)),
  getCachedCompositeGauge: (inwardId: string, gaugeId: string) => compositeGaugeCache.get(createCacheKey(inwardId, gaugeId)),

  submitUpdatedCertificateData: async (inwardId, gaugeId, payload, options) =>
    runAsync(
      set,
      () => ({}),
      "loadingCompositeGauge",
      async () => {
        if (!inwardId || !gaugeId) throw new Error("Invalid inwardId or gaugeId");
        const endpoint = API_ENDPOINTS.GAUGES.BY_INWARD_GAUGE_ID(inwardId, gaugeId)

        // 1. Update calibration data
        const updatedCertificateData = await apiClient.patch<CertificateGaugeData>(endpoint, payload);

        const shouldGenerateCertificate =
          options?.generateCertificate ?? payload.status === "calibration_completed";
        const shouldAwaitCertificateGeneration = options?.awaitCertificateGeneration ?? false;

        const mergeGeneratedCertificateIntoGaugeData = (
          gaugeData: CertificateGaugeData,
          generatedCertificate: CertificateData
        ): CertificateGaugeData => ({
          ...gaugeData,
          certificate_id: gaugeData.certificate_id || generatedCertificate.id,
          certificate_url: generatedCertificate.certificate_url ?? gaugeData.certificate_url,
        });

        const triggerCertificateGeneration = async (
          gaugeData: CertificateGaugeData
        ): Promise<CertificateGaugeData | null> => {
          try {
            const generatedCertificate = await apiClient.post<CertificateData>(`/certificate/generate`, {
              inward_id: inwardId,
              gauge_id: gaugeId,
            });

            return mergeGeneratedCertificateIntoGaugeData(gaugeData, generatedCertificate);
          } catch (certError) {
            logger.warn("Certificate generation failed (data still saved):", certError);
            return null;
          }
        };

        // 3. Update cache with initial data
        const cacheKey = createCacheKey(inwardId, gaugeId);
        compositeGaugeCache.set(cacheKey, updatedCertificateData);

        // 4. Update store state with fresh data
        let updated: CertificateGaugeData = updatedCertificateData as CertificateGaugeData;

        // 5. Update only the specific gauge in all related lists - don't clear cache timestamps
        const updateStoreWithGaugeData = (gaugeData: CertificateGaugeData) => {
          set((s) => {
            const calibrationList = s.calibrationListByInwardId[inwardId] || [];
            const gaugeInwardRecordId = gaugeData.id;
            const nextStatus: LinkedGauge["status"] | undefined =
              payload.status === "inward_received" || payload.status === "calibration_completed"
                ? payload.status
                : undefined;

            const linkedGaugePatch: Partial<LinkedGauge> = {
              gauge_class: gaugeData.gauge_class,
              identification_number: gaugeData.identification_number,
              make: gaugeData.make,
              manf_serial_number: gaugeData.manf_serial_number,
              inward_id: gaugeData.inward_id,
              client_org_name: gaugeData.client_org_name,
              master_gauge_name: gaugeData.master_gauge_name,
              inward_date: gaugeData.inward_date,
              gauge_id: gaugeData.gauge_id,
              inward_gauge_lab_id: gaugeData.inward_gauge_lab_id,
              specifications: gaugeData.specifications,
              certificate_id: gaugeData.certificate_id,
              ...(nextStatus ? { status: nextStatus } : {}),
            };

            const updatedCalibrationList = calibrationList.map((item) =>
              item.id === gaugeInwardRecordId ? { ...item, ...linkedGaugePatch } : item
            );

            const updatedAllInwardedGauges = s.allInwardedgauges.map((item) =>
              item.id === gaugeInwardRecordId ? { ...item, ...linkedGaugePatch } : item
            );

            return {
              currentInwardGauges: gaugeData,
              currentInwardById: {
                ...s.currentInwardById,
                [inwardId]: {
                  ...(s.currentInwardById[inwardId] || {}),
                  [gaugeId]: gaugeData,
                },
              },
              calibrationListByInwardId: {
                ...s.calibrationListByInwardId,
                [inwardId]: updatedCalibrationList,
              },
              allInwardedgauges: updatedAllInwardedGauges,
              // Don't clear cache timestamps - preserve them for navigation optimization
            };
          });
        };

        // Initial update with current data
        updateStoreWithGaugeData(updated);

        // 6. Trigger certificate generation and sync updated data
        if (shouldGenerateCertificate) {
          if (shouldAwaitCertificateGeneration) {
            const refreshedData = await triggerCertificateGeneration(updated);
            if (refreshedData) {
              updated = refreshedData;
              // Update cache with refreshed data including certificate details
              compositeGaugeCache.set(cacheKey, refreshedData);
              // Update store with refreshed data
              updateStoreWithGaugeData(refreshedData);
            }
          } else {
            // Fire and forget, but update store when complete
            void triggerCertificateGeneration(updated).then((refreshedData) => {
              if (refreshedData) {
                // Update cache with refreshed data including certificate details
                compositeGaugeCache.set(cacheKey, refreshedData);
                // Update store with refreshed data
                updateStoreWithGaugeData(refreshedData);
              }
            });
          }
        }

        return updated;
      }
    ) as Promise<CertificateGaugeData | null>,

  invalidateCompositeGaugeCache: (inwardId, gaugeId) => {
    const cacheKey = createCacheKey(inwardId, gaugeId);
    compositeGaugeCache.clear(cacheKey);
  },

  // Fetch calibration history by identification number
  fetchCalibrationHistory: async (identificationNumber, force = false) =>
    runAsync(
      set,
      () => ({}),
      "loadingCalibrationHistory",
      async () => {
        if (!identificationNumber) {
          throw new Error("Identification number is required");
        }

        const state = get();
        const lastFetch = state.lastFetchCalibrationHistory[identificationNumber];
        const cached = state.calibrationHistory[identificationNumber];

        // Return cached data if valid and not forcing refresh
        if (!force && isCacheEntryValid(lastFetch ?? null, state.cacheDuration) && cached) {
          return cached;
        }

        // Fetch from API
        const response = await apiClient.get<CalibrationHistoryEntry[]>(
          API_ENDPOINTS.GAUGES.CALIBRATION_HISTORY(identificationNumber)
        );

        const historyData = Array.isArray(response) ? response : [];

        // Update state
        set((s) => ({
          calibrationHistory: {
            ...s.calibrationHistory,
            [identificationNumber]: historyData,
          },
          lastFetchCalibrationHistory: {
            ...s.lastFetchCalibrationHistory,
            [identificationNumber]: Date.now(),
          },
        }));

        return historyData;
      }
    ) as Promise<CalibrationHistoryEntry[]>,

  // Get cached calibration history
  getCachedCalibrationHistory: (identificationNumber) => {
    const state = get();
    return state.calibrationHistory[identificationNumber];
  },

  // Fetch gauges with multiple filters (client_org_id, date range, lab_id)
  fetchGaugesWithFilters: async (filters?: { client_org_id?: string; inward_date_from?: string; inward_date_to?: string; lab_id?: string; status?: string }) =>
    runAsync(
      set,
      () => ({}),
      "loadingPendingGauges",
      async () => {


        if (!hasActiveFilters(filters)) {
          const response = await apiClient.get<LinkedGauge[]>(API_ENDPOINTS.GAUGES.GET_INWARD_LIST);
          return extractPaginatedList<LinkedGauge>(response, {
            arrayKeys: ["data", "items"],
          }).items;
        }
    
        // Build query string from filters
        const queryString = buildQueryString(filters as Record<string, string>);
        const endpoint = `${API_ENDPOINTS.GAUGES.GET_INWARD_LIST}${queryString}`;
        
        const response = await apiClient.get<LinkedGauge[]>(endpoint);
        return extractPaginatedList<LinkedGauge>(response, {
          arrayKeys: ["data", "items"],
        }).items;

      }
    ) as Promise<LinkedGauge[]>,

  clearError: () => set({ error: null }),
}));
