import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/api";

interface SaveForm {
  range: number;
  travel: number;
  dial_type: "plunger" | "lever";
  table_name: string;
  reading_table: unknown[];
}

export function useDialTable(id?: string) {
  return useQuery({
    queryKey: ["dial-reading-table", id],
    queryFn: async (): Promise<SaveForm | null> => {
      if (!id) return null;
      return apiClient.get(`/dial-reading-table/${id}`);
    },
    enabled: Boolean(id),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
