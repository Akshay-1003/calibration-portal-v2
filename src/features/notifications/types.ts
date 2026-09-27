export type NotificationChannel = "Portal" | "Email" | "WhatsApp";
export type ReminderType = "30_days" | "15_days" | "7_days" | "due_date" | "overdue";
export type DeliveryStatus = "upcoming" | "sent" | "failed" | "responded";
export type CustomerResponseStatus =
  | "pending"
  | "yes_plan_calibration"
  | "not_now"
  | "none";

export interface ReminderTimingSettings {
  thirty_days_before: boolean;
  fifteen_days_before: boolean;
  seven_days_before: boolean;
  on_due_date: boolean;
  overdue: boolean;
}

export interface OrganizationNotificationSettings {
  id?: string | null;
  organization_id: string;
  in_app_enabled: boolean;
  email_reminders_enabled: boolean;
  whatsapp_reminders_enabled: boolean;
  reminder_timing: ReminderTimingSettings;
  recipient_emails: string[];
  whatsapp_numbers: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NotificationEvent {
  id: string;
  organization_id: string;
  organization_name: string;
  title: string;
  message: string;
  gauge_count: number;
  reminder_type: ReminderType | null;
  channel: NotificationChannel;
  delivery_status: DeliveryStatus;
  response_status: CustomerResponseStatus;
  response_label?: string | null;
  response_at?: string | null;
  response_note?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  read_by_customer: boolean;
  read_by_internal: boolean;
  action_url?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  requires_customer_response: boolean;
  pending_calibration_request: boolean;
  priority: "low" | "normal" | "high";
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NotificationListResponse {
  notifications: NotificationEvent[];
  total_count: number;
}

export const defaultNotificationSettings = (
  organizationId: string
): OrganizationNotificationSettings => ({
  organization_id: organizationId,
  in_app_enabled: true,
  email_reminders_enabled: true,
  whatsapp_reminders_enabled: false,
  reminder_timing: {
    thirty_days_before: true,
    fifteen_days_before: true,
    seven_days_before: true,
    on_due_date: true,
    overdue: true,
  },
  recipient_emails: [],
  whatsapp_numbers: [],
});

