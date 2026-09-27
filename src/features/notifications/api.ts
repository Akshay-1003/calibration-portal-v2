import { apiClient } from "../../core/api/client";
import type {
  NotificationListResponse,
  OrganizationNotificationSettings,
} from "./types";

export const notificationApi = {
  getOrganizationSettings(organizationId: string) {
    return apiClient.get<OrganizationNotificationSettings>(
      `/notifications/settings/${organizationId}`
    );
  },

  updateOrganizationSettings(
    organizationId: string,
    settings: OrganizationNotificationSettings
  ) {
    return apiClient.put<OrganizationNotificationSettings>(
      `/notifications/settings/${organizationId}`,
      {
        ...settings,
        organization_id: organizationId,
      }
    );
  },

  getAdminNotifications(params?: { unread_only?: boolean; limit?: number }) {
    return apiClient.get<NotificationListResponse>("/notifications/admin", params);
  },

  markAdminNotificationRead(notificationId: string, read = true) {
    return apiClient.patch(
      `/notifications/admin/${notificationId}/read`,
      { read }
    );
  },
};
