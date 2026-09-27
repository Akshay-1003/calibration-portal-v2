import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { devtools } from "zustand/middleware";
import { apiClient } from "../services/api";
import { toast } from "sonner";
import { extractPaginatedList, type PaginatedListResult, toApiPage, toUiPage } from "../utils/paginatedResponse";

// ---------- Types ----------
export interface ExistingGaugeData {
  id: string;
  master_gauge: string;
  identification_number: string;
  gauge_type: string;
  process?: string;
  specifications?: any;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface ExistingGaugeState {
  // Data
  existingGauges: ExistingGaugeData[];
  loading: boolean;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Multi-client cache
  cache: Record<string, CacheEntry<PaginatedListResult<ExistingGaugeData>> | undefined>;

  // Config
  cacheDuration: number; // default 5 minutes
  inFlight: Record<string, Promise<ExistingGaugeData[]> | undefined>;

  // Actions
  fetchExistingGauges: (
    clientId: string,
    options?: {
      page?: number;
      limit?: number;
      forceRefresh?: boolean;
    }
  ) => Promise<ExistingGaugeData[]>;
  clearClientCache: (clientId: string) => void;
  clearAllCache: () => void;
}

// ---------- Helper: parse API safely ----------
function normalizeExistingGaugeResponse(response: any, page: number, limit: number) {
  return extractPaginatedList<ExistingGaugeData>(response, {
    arrayKeys: ["data", "gauges"],
    fallbackPage: page,
    fallbackLimit: limit,
  });
}

// ---------- Zustand Store ----------
export const useExistingGaugeStore = create<ExistingGaugeState>()(
  devtools(
    immer((set, get) => ({
      existingGauges: [],
      loading: false,
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      },

      cache: {},
      inFlight: {},

      cacheDuration: 5 * 60 * 1000, // 5 minutes
      fetchExistingGauges: async (clientId: string, options) => {
        if (!clientId) return [];

        const forceRefresh = options?.forceRefresh ?? false;
        const requestedPage = Math.max(options?.page ?? 1, 1);
        const requestedLimit = Math.max(options?.limit ?? 10, 1);
        const apiPage = toApiPage(requestedPage);
        const requestKey = `${clientId}_${apiPage}_${requestedLimit}`;

        const { cache, cacheDuration, inFlight } = get();
        const now = Date.now();

        const cachedEntry = cache[requestKey];

        // 🔹 1. Return from cache if not expired
        if (!forceRefresh && cachedEntry) {
          const isValid = now - cachedEntry.timestamp < cacheDuration;
          if (isValid) {
            set((s) => {
              s.existingGauges = cachedEntry.data.items;
              s.pagination = {
                total: cachedEntry.data.total,
                page: toUiPage(cachedEntry.data.page),
                limit: cachedEntry.data.limit,
                totalPages: cachedEntry.data.totalPages,
              };
            });

            return cachedEntry.data.items;
          }
        }

        // 🔹 2. Deduplicate network request
        if (inFlight[requestKey]) {
          return inFlight[requestKey]!;
        }

        // 🔹 3. Real API request
        const requestPromise = (async () => {
          set((s) => {
            s.loading = true;
          });

          try {
            const queryParams = new URLSearchParams({
              page: String(apiPage),
              limit: String(requestedLimit),
            });
            const response = await apiClient.get(`/gauge/organization/${clientId}/gauges?${queryParams.toString()}`);
            const gauges = normalizeExistingGaugeResponse(response, apiPage, requestedLimit);

            set((s) => {
              s.existingGauges = gauges.items;
              s.pagination = {
                total: gauges.total,
                page: toUiPage(gauges.page),
                limit: gauges.limit,
                totalPages: gauges.totalPages,
              };
              s.cache[requestKey] = {
                data: gauges,
                timestamp: Date.now(),
              };
            });

            return gauges.items;
          } catch (error) {
            console.error("Error fetching existing gauges:", error);
            toast.error("Failed to load existing gauges.");
            return [];
          } finally {
            set((s) => {
              s.loading = false;
              delete s.inFlight[requestKey];
            });
          }
        })();

        // Store in-flight promise
        set((s) => {
          s.inFlight[requestKey] = requestPromise;
        });

        return requestPromise;
      },

      // ---------------------------------------------------
      // CLEAR CACHE FOR SPECIFIC CLIENT
      // ---------------------------------------------------
      clearClientCache: (clientId: string) => {
        set((s) => {
          delete s.cache[clientId];
        });
      },

      // ---------------------------------------------------
      // CLEAR ENTIRE CACHE
      // ---------------------------------------------------
      clearAllCache: () => {
        set((s) => {
          s.cache = {};
          s.inFlight = {};
        });
      },
    }))
  )
);
