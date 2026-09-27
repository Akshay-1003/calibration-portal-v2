import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../../hooks/queries/queryKeys";
import { notificationApi } from "./api";
import type { OrganizationNotificationSettings } from "./types";

export function useOrganizationNotificationSettings(organizationId: string | null) {
  return useQuery({
    queryKey: queryKeys.notifications.settings(organizationId ?? ""),
    queryFn: () => notificationApi.getOrganizationSettings(organizationId!),
    enabled: Boolean(organizationId),
  });
}

export function useUpdateOrganizationNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      settings,
    }: {
      organizationId: string;
      settings: OrganizationNotificationSettings;
    }) => notificationApi.updateOrganizationSettings(organizationId, settings),
    onSuccess: (settings, variables) => {
      queryClient.setQueryData(
        queryKeys.notifications.settings(variables.organizationId),
        settings
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.settingsList(),
      });
      toast.success("Notification settings saved");
    },
    onError: () => {
      toast.error("Failed to save notification settings");
    },
  });
}

export function useAdminNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.notifications.admin(options),
    queryFn: () =>
      notificationApi.getAdminNotifications({
        unread_only: options?.unreadOnly,
        limit: options?.limit ?? 25,
      }),
    refetchInterval: 60_000,
  });
}

export function useMarkAdminNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, read }: { notificationId: string; read?: boolean }) =>
      notificationApi.markAdminNotificationRead(notificationId, read ?? true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
