import { apiClient } from "../../core/api/client";
import type {
  NotificationListResponse,
  OrganizationNotificationSettings,
} from "./types";

export const notificationApi = {
  getPlanningRequests(params?: { page?: number; search?: string; status?: string; due_date?: string; planned_date?: string }) {
    return apiClient.get<{ requests: import("./planningTypes").PlanningRequest[]; total_count: number }>("/notifications/requests", params);
  },
  getPlanningRequest(id: string) {
    return apiClient.get<import("./planningTypes").PlanningRequest>(`/notifications/requests/${id}`);
  },
  updatePlanningRequest(id: string, data: import("./planningTypes").PlanningRequestUpdate) {
    return apiClient.patch<import("./planningTypes").PlanningRequest>(`/notifications/requests/${id}`, data);
  },
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
