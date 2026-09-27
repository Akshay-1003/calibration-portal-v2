import { apiClient } from "./api-client";
import { apiClient as apiClientFromApi } from "./api";
import { logger } from "../utils/logger";
import { DialTableMasterData } from "../components/Tables/DialTableMasterListTable";
import { ThreadRingPlugApiResponse, ThreadRingPlugData } from "../store/threadRingPlugStore";
import { 
    TaperThreadReadingsApiResponse, 
    TaperThreadReadingsData, 
    transformApiResponseToStoreData as transformTaperThreadReadingsToStoreData
} from "../store/taperThreadReadingsStore";
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from "../utils/paginatedResponse";
import {
  fetchAllThreadRingPlugs,
} from "./threadRingPlugSpecifications";
import type { RateCardEntry } from "../types/types";
import { getCurrentAccessToken } from "../features/auth/utils/authTokenAccessor";

export const fetchDialTables = async (): Promise<DialTableMasterData[]> => {
  const queryParams = new URLSearchParams({
    page: "0",
    limit: String(DEFAULT_BULK_FETCH_LIMIT),
  });
  const res = await apiClient.get(`/dial-reading-tables?${queryParams.toString()}`);
  return extractPaginatedList<DialTableMasterData>(res, {
    arrayKeys: ["data", "items", "dial_tables"],
    fallbackPage: 0,
    fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
  }).items;
};

export const deleteDialTable = async (id: string) => {
  return apiClient.delete(`/dial-reading-table/${id}`);
};

// Thread Ring Plug API functions
export const fetchThreadRingPlugs = async (): Promise<ThreadRingPlugData[]> => {
  try {
    logger.debug('fetchThreadRingPlugs: Starting API call...');
    logger.debug('fetchThreadRingPlugs: API endpoint = /plain-thread/specifications (all pages)');

    const transformed = await fetchAllThreadRingPlugs({
      limit: DEFAULT_BULK_FETCH_LIMIT,
    });

    if (!transformed || transformed.length === 0) {
      logger.debug('fetchThreadRingPlugs: No data found in response');
      return [];
    }

    logger.debug(`fetchThreadRingPlugs: Loaded ${transformed.length} items across paginated responses`);
    return transformed;
  } catch (error) {
    logger.error('fetchThreadRingPlugs: Error caught', error);
    // Re-throw to let React Query handle it
    throw error;
  }
};

export const fetchThreadRingPlug = async (standardSpecificationId: string): Promise<ThreadRingPlugApiResponse> => {
  const res = await apiClient.get<ThreadRingPlugApiResponse>(
    `/plain-thread/specification?standard_specification_id=${encodeURIComponent(standardSpecificationId)}`
  );
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as ThreadRingPlugApiResponse;
  }
  return res as unknown as ThreadRingPlugApiResponse;
};

export const createThreadRingPlug = async (data: Omit<ThreadRingPlugApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'>): Promise<ThreadRingPlugApiResponse> => {
  const res = await apiClient.post<ThreadRingPlugApiResponse>(
    "/plain-thread/specifications",
    data
  );
  // Extract data from ApiResponse wrapper
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as ThreadRingPlugApiResponse;
  }
  return res as unknown as ThreadRingPlugApiResponse;
};

export const updateThreadRingPlug = async (standardSpecification: string, data: Omit<ThreadRingPlugApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'>): Promise<ThreadRingPlugApiResponse> => {
  const res = await apiClient.patch<ThreadRingPlugApiResponse>(
    `/plain-thread/specifications/${standardSpecification}`,
    data
  );
  // Extract data from ApiResponse wrapper
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as ThreadRingPlugApiResponse;
  }
  return res as unknown as ThreadRingPlugApiResponse;
};

export const deleteThreadRingPlug = async (id: string) => {
  return apiClient.delete(`/plain-thread/specifications/${id}`);
};

// Taper Thread Readings API functions
// Fetch raw API data (for components that need actual structure)
export const fetchTaperThreadReadingsRaw = async (): Promise<TaperThreadReadingsApiResponse[]> => {
  try {
    const queryParams = new URLSearchParams({
      page: "0",
      limit: String(DEFAULT_BULK_FETCH_LIMIT),
    });
    const res = await apiClient.get(
      `/taper-thread/specifications?${queryParams.toString()}`
    );

    return extractPaginatedList<TaperThreadReadingsApiResponse>(res, {
      arrayKeys: ['data', 'items', 'taper_thread_readings', 'specifications'],
      fallbackPage: 0,
      fallbackLimit: DEFAULT_BULK_FETCH_LIMIT,
    }).items;
  } catch (error) {
    logger.error('Error fetching taper thread readings:', error);
    return [];
  }
};

// Fetch and transform to store format (for store/table use)
export const fetchTaperThreadReadings = async (): Promise<TaperThreadReadingsData[]> => {
  try {
    logger.debug('fetchTaperThreadReadings: Starting API call...');
    const apiDataArray = await fetchTaperThreadReadingsRaw();
    
    logger.debug(`fetchTaperThreadReadings: Received ${apiDataArray?.length || 0} items`);
    
    if (!apiDataArray || apiDataArray.length === 0) {
      logger.debug('fetchTaperThreadReadings: No data found');
      return [];
    }
    
    // Transform API response to store format
    const transformed = apiDataArray.map(transformTaperThreadReadingsToStoreData);
    logger.debug('fetchTaperThreadReadings: Transformation complete');
    return transformed;
  } catch (error) {
    logger.error('fetchTaperThreadReadings: Error caught', error);
    // Re-throw to let React Query handle it
    throw error;
  }
};

export const fetchTaperThreadReading = async (standardSpecification: string): Promise<TaperThreadReadingsApiResponse> => {
  const res = await apiClient.get<TaperThreadReadingsApiResponse>(
    `/taper-thread/specifications/${standardSpecification}`
  );
  // Extract data from ApiResponse wrapper
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as TaperThreadReadingsApiResponse;
  }
  return res as unknown as TaperThreadReadingsApiResponse;
};

export const createTaperThreadReading = async (data: Omit<TaperThreadReadingsApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'>): Promise<TaperThreadReadingsApiResponse> => {
  const res = await apiClient.post<TaperThreadReadingsApiResponse>(
    "/taper-thread/specifications",
    data
  );
  // Extract data from ApiResponse wrapper
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as TaperThreadReadingsApiResponse;
  }
  return res as unknown as TaperThreadReadingsApiResponse;
};

export const updateTaperThreadReading = async (standardSpecification: string, data: Omit<TaperThreadReadingsApiResponse, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'>): Promise<TaperThreadReadingsApiResponse> => {
  const res = await apiClient.put<TaperThreadReadingsApiResponse>(
    `/taper-thread/specifications/${standardSpecification}`,
    data
  );
  // Extract data from ApiResponse wrapper
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as TaperThreadReadingsApiResponse;
  }
  return res as unknown as TaperThreadReadingsApiResponse;
};

export const deleteTaperThreadReading = async (standardSpecification: string) => {
  return apiClient.delete(`/taper-thread/specifications/${standardSpecification}`);
};

// Rate Card API functions
export type RateCardEntriesByGauge = Record<string, RateCardEntry[]>;

export interface RateCardApiResponse extends Record<string, unknown> {
  rate_card?: RateCardEntriesByGauge | null;
  price_list?: string | null;
}

export interface RateCardImportSummary {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  warning_rows: number;
  affected_gauges: number;
  imported_gauges: number;
  imported_entries: number;
}

export interface RateCardImportRow {
  row_number: number;
  status: 'valid' | 'error';
  gauge_id: string;
  gauge_name: string;
  errors: string[];
  warnings: string[];
  entry: RateCardEntry | null;
}

export interface RateCardImportResult {
  dry_run: boolean;
  mode: 'replace_gauges';
  summary: RateCardImportSummary;
  rows: RateCardImportRow[];
  rate_card?: RateCardEntriesByGauge;
}

interface RateCardUpdateOptions {
  priceList?: string | null;
  preserveDocument?: RateCardApiResponse | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractResponseData = (value: unknown): unknown => {
  if (isRecord(value) && "data" in value && isRecord(value.data)) {
    return value.data;
  }

  return value;
};

export const getRateCardEntriesMap = (
  value: RateCardApiResponse | RateCardEntriesByGauge | null | undefined
): RateCardEntriesByGauge => {
  const source = extractResponseData(value);
  if (!isRecord(source)) {
    return {};
  }

  const maybeNestedRateCard = source.rate_card;
  const sourceEntries = isRecord(maybeNestedRateCard) ? maybeNestedRateCard : source;
  const entries: RateCardEntriesByGauge = {};

  Object.entries(sourceEntries).forEach(([key, entryList]) => {
    if (Array.isArray(entryList)) {
      entries[key] = entryList as RateCardEntry[];
    }
  });

  return entries;
};

export const getRateCardPriceList = (
  value: RateCardApiResponse | null | undefined
): string | null | undefined => {
  const source = extractResponseData(value);
  if (!isRecord(source) || !("price_list" in source)) {
    return undefined;
  }

  const priceList = source.price_list;
  if (priceList === null) {
    return null;
  }

  return typeof priceList === "string" ? priceList : undefined;
};

const normalizeRateCardDocument = (value: unknown): RateCardApiResponse => {
  const source = extractResponseData(value);
  const entries = getRateCardEntriesMap(source as RateCardApiResponse);
  const normalized: RateCardApiResponse = { ...entries };

  const priceList = getRateCardPriceList(source as RateCardApiResponse);
  if (priceList !== undefined) {
    normalized.price_list = priceList;
  }

  return normalized;
};

const buildRateCardPatchPayload = (
  rateCard: RateCardEntriesByGauge,
  options?: RateCardUpdateOptions
): RateCardEntriesByGauge | RateCardApiResponse => {
  const preservedPriceList =
    options && "priceList" in options
      ? options.priceList
      : getRateCardPriceList(options?.preserveDocument ?? null);

  if (preservedPriceList === undefined) {
    return rateCard;
  }

  return {
    rate_card: rateCard,
    price_list: preservedPriceList,
  };
};

/**
 * Fetch rate card for an organization
 */
export const fetchRateCard = async (orgId: string): Promise<RateCardApiResponse> => {
  const res = await apiClientFromApi.getApiResponse<RateCardApiResponse>(`/organization/${orgId}/rate-card`);

  return normalizeRateCardDocument(res);
};

/**
 * Update rate card for an organization (PATCH)
 */
export const updateRateCard = async (
  orgId: string,
  rateCard: RateCardEntriesByGauge,
  options?: RateCardUpdateOptions
): Promise<RateCardApiResponse> => {
  const payload = buildRateCardPatchPayload(rateCard, options);
  const endpoint = `/organization/${orgId}/rate-card`;
  let response: unknown;

  try {
    response = await apiClientFromApi.patchApiResponse<RateCardApiResponse>(
      endpoint,
      payload
    );
  } catch (error) {
    const isExplicitPriceListUpdate = Boolean(options && "priceList" in options);
    const usedMetadataPayload = payload !== rateCard;

    if (!usedMetadataPayload || isExplicitPriceListUpdate) {
      throw error;
    }

    response = await apiClientFromApi.patchApiResponse<RateCardApiResponse>(
      endpoint,
      rateCard
    );
  }

  const normalizedResponse = normalizeRateCardDocument(response);
  const responseHasEntries = Object.keys(getRateCardEntriesMap(normalizedResponse)).length > 0;
  const payloadHasEntries = Object.keys(rateCard).length > 0;
  const responseHasPriceList = getRateCardPriceList(normalizedResponse) !== undefined;
  const payloadHasPriceList = getRateCardPriceList(payload as RateCardApiResponse) !== undefined;

  if ((!responseHasEntries && payloadHasEntries) || (!responseHasPriceList && payloadHasPriceList)) {
    return normalizeRateCardDocument(payload);
  }

  return normalizedResponse;
};

const getAuthOnlyHeaders = (): HeadersInit => {
  const token = getCurrentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const extractFetchErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `HTTP error! status: ${response.status}`;
  const text = await response.text();
  if (!text) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.detail === 'string') {
      return parsed.detail;
    }
    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
    if (typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch {
    return text;
  }

  return fallback;
};

const getFilenameFromContentDisposition = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    return decodeURIComponent(filenameStarMatch[1].replace(/"/g, ''));
  }

  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || null;
};

export const downloadRateCardTemplate = async (
  orgId?: string
): Promise<{ blob: Blob; filename: string }> => {
  const endpoint = orgId
    ? `/organization/${encodeURIComponent(orgId)}/rate-card/template`
    : '/rate-card/template';

  const response = await fetch(`${apiClientFromApi.getBaseURL()}${endpoint}`, {
    method: 'GET',
    headers: getAuthOnlyHeaders(),
    mode: 'cors',
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response));
  }

  const blob = await response.blob();
  return {
    blob,
    filename: getFilenameFromContentDisposition(response.headers.get('content-disposition')) || 'rate_card_template.xlsx',
  };
};

export const importRateCardExcel = async (
  orgId: string,
  file: File,
  dryRun: boolean
): Promise<RateCardImportResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${apiClientFromApi.getBaseURL()}/organization/${orgId}/rate-card/import?dry_run=${dryRun}`,
    {
      method: 'POST',
      headers: getAuthOnlyHeaders(),
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    }
  );

  if (!response.ok) {
    throw new Error(await extractFetchErrorMessage(response));
  }

  return response.json();
};
