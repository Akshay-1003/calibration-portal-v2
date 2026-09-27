import { apiClient } from "./api";
import type {
  ThreadRingPlugApiResponse,
  ThreadRingPlugData,
} from "../store/threadRingPlugStore";
import { transformApiResponseToStoreData } from "../store/threadRingPlugStore";
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
  type PaginatedListResult,
} from "../utils/paginatedResponse";

export interface ThreadRingPlugPageParams {
  page?: number;
  limit?: number;
}

export type ThreadRingPlugPageResult = PaginatedListResult<ThreadRingPlugData>;

const buildThreadRingPlugQueryParams = (params?: ThreadRingPlugPageParams) => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? DEFAULT_BULK_FETCH_LIMIT, 1);

  return {
    page,
    limit,
    queryString: new URLSearchParams({
      page: String(page),
      limit: String(limit),
    }).toString(),
  };
};

export const fetchThreadRingPlugsPage = async (
  params?: ThreadRingPlugPageParams,
): Promise<ThreadRingPlugPageResult> => {
  const { page, limit, queryString } = buildThreadRingPlugQueryParams(params);
  const response = await apiClient.get(
    `/plain-thread/specifications?${queryString}`,
  ) as unknown;

  return extractPaginatedList<ThreadRingPlugData>(response, {
    arrayKeys: ["data", "items", "thread_ring_plugs", "specifications"],
    mapItem: (item) =>
      transformApiResponseToStoreData(item as ThreadRingPlugApiResponse),
    fallbackPage: page,
    fallbackLimit: limit,
  });
};

export const fetchAllThreadRingPlugs = async (
  params?: Pick<ThreadRingPlugPageParams, "limit">,
): Promise<ThreadRingPlugData[]> => {
  const pageSize = Math.max(params?.limit ?? DEFAULT_BULK_FETCH_LIMIT, 1);
  const allItems: ThreadRingPlugData[] = [];
  const seenIds = new Set<string>();
  let page = 0;
  let hasNext = true;

  while (hasNext) {
    const result = await fetchThreadRingPlugsPage({
      page,
      limit: pageSize,
    });

    for (const item of result.items) {
      if (seenIds.has(item.id)) {
        continue;
      }

      seenIds.add(item.id);
      allItems.push(item);
    }

    hasNext = result.hasNext;
    page += 1;
  }

  return allItems;
};

export const fetchThreadRingPlugById = async (
  standardSpecificationId: string,
): Promise<ThreadRingPlugData | null> => {
  const trimmedId = standardSpecificationId.trim();
  if (!trimmedId) return null;

  const response = await apiClient.get(
    `/plain-thread/specification?standard_specification_id=${encodeURIComponent(trimmedId)}`,
  ) as any;
  const payload = response?.data ?? response;

  if (!payload || typeof payload !== "object") {
    return null;
  }

  return transformApiResponseToStoreData(payload as ThreadRingPlugApiResponse);
};

export const fetchThreadRingPlugBySpecification = async (
  standardSpecification: string,
): Promise<ThreadRingPlugData | null> => {
  const trimmedValue = standardSpecification.trim();
  if (!trimmedValue) return null;

  try {
    const response = await apiClient.get(
      `/plain-thread/specification?standard_specification=${encodeURIComponent(trimmedValue)}`,
    ) as any;
    const payload = response?.data ?? response;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    return transformApiResponseToStoreData(payload as ThreadRingPlugApiResponse);
  } catch {
    return null;
  }
};
