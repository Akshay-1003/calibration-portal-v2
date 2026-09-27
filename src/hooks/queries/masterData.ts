import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../../services/apiService";
import { queryKeys } from "./queryKeys";
import { DEFAULT_BULK_FETCH_LIMIT } from "../../utils/paginatedResponse";

export function useOrganizationsMasterQuery() {
  return useQuery({
    queryKey: queryKeys.organizations.list(),
    queryFn: async () => {
      const response = await apiService.getOrganizations({ page: 0, limit: DEFAULT_BULK_FETCH_LIMIT });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.organizations)) return response.organizations;
      return [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useGaugeMastersQuery() {
  return useQuery({
    queryKey: queryKeys.gaugeMasters.list(),
    queryFn: async () => {
      const response = await apiService.getGaugeMasters({ page: 0, limit: DEFAULT_BULK_FETCH_LIMIT });
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray((response as any)?.gauges)) return (response as any).gauges;
      return [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useCertificateTypesQuery() {
  return useQuery({
    queryKey: queryKeys.certificateTypes.list(),
    queryFn: async () => {
      const response = await apiService.getCertificateTypes();
      if (Array.isArray(response)) return response;
      if (Array.isArray(response?.data)) return response.data;
      if (Array.isArray((response as any)?.certificate_types)) return (response as any).certificate_types;
      return [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useMasterDataPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.organizations.list(),
      queryFn: async () => {
        const response = await apiService.getOrganizations({ page: 0, limit: DEFAULT_BULK_FETCH_LIMIT });
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.organizations)) return response.organizations;
        return [];
      },
      staleTime: 60 * 60 * 1000,
      gcTime: 6 * 60 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: queryKeys.gaugeMasters.list(),
      queryFn: async () => {
        const response = await apiService.getGaugeMasters({ page: 0, limit: DEFAULT_BULK_FETCH_LIMIT });
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray((response as any)?.gauges)) return (response as any).gauges;
        return [];
      },
      staleTime: 60 * 60 * 1000,
      gcTime: 6 * 60 * 60 * 1000,
    });

    void queryClient.prefetchQuery({
      queryKey: queryKeys.certificateTypes.list(),
      queryFn: async () => {
        const response = await apiService.getCertificateTypes();
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray((response as any)?.certificate_types)) return (response as any).certificate_types;
        return [];
      },
      staleTime: 60 * 60 * 1000,
      gcTime: 6 * 60 * 60 * 1000,
    });
  }, [queryClient]);
}
