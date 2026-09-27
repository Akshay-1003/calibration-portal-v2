import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api";

export type DialReadingTableRow = {
  turn: number;
  range: number;
  value: number;
  upward_actual?: number | string;
  upward_error?: number | string;
  downward_actual?: number | string;
  downward_error?: number | string;
};

export type DialReadingTableResponse = {
  id?: string;
  table_name?: string;
  dial_type?: string;
  travel?: number | string;
  range?: number | string;
  reading_table: DialReadingTableRow[];
};

export const dialReadingTableKeys = {
  all: ["dial-reading-table"] as const,
  byId: (id: string) => [...dialReadingTableKeys.all, id] as const,
};

export function useDialReadingTableQuery(id?: string | null) {
  return useQuery({
    queryKey: id ? dialReadingTableKeys.byId(id) : dialReadingTableKeys.all,
    queryFn: async (): Promise<DialReadingTableResponse> => {
      if (!id) return { reading_table: [] };
      const res = await apiClient.get<DialReadingTableResponse>(`/dial-reading-table/${id}`);
      return res ?? { reading_table: [] };
    },
    enabled: Boolean(id),
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
