import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api";
import {
  DEFAULT_BULK_FETCH_LIMIT,
  extractPaginatedList,
} from "../../utils/paginatedResponse";
import type { DialTableMasterData } from "../../components/Tables/DialTableMasterListTable";

export const dialTableKeys = {
  all: ["dial-reading-tables"] as const,
  list: (filters?: Record<string, unknown>) => ["dial-reading-tables", { filters }] as const,
};

export interface DialTablesQueryData {
  items: DialTableMasterData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const normalizeDialTable = (item: unknown): DialTableMasterData => {
  const record = (item ?? {}) as Record<string, unknown>;

  return {
    id: String(record.id ?? ""),
    table_name: String(record.table_name ?? ""),
    dial_type: record.dial_type === "lever" ? "lever" : "plunger",
    range: String(record.range ?? ""),
    travel: String(record.travel ?? ""),
  };
};

const fetchDialTablesPage = async (params?: {
  page?: number;
  limit?: number;
}): Promise<DialTablesQueryData> => {
  const page = Math.max(params?.page ?? 0, 0);
  const limit = Math.max(params?.limit ?? 10, 1);
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const response = await apiClient.get<unknown>(`/dial-reading-tables?${queryParams.toString()}`);
  const result = extractPaginatedList<DialTableMasterData>(response, {
    arrayKeys: ["data", "items", "dial_tables"],
    mapItem: normalizeDialTable,
    fallbackPage: page,
    fallbackLimit: limit,
  });

  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
};

export function useDialTablesQuery() {
  return useQuery({
    queryKey: dialTableKeys.all,
    queryFn: async (): Promise<DialTableMasterData[]> => {
      const result = await fetchDialTablesPage({
        page: 0,
        limit: DEFAULT_BULK_FETCH_LIMIT,
      });
      return result.items;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useDialTablesListQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: dialTableKeys.list(params),
    queryFn: () => fetchDialTablesPage(params),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
}
