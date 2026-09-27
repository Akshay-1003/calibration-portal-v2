import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Switch,
  Divider,
  Button,
  Spinner,
} from "@heroui-v2/react";
import {
  BellAlertIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { useOrganizationsQuery } from "../../hooks/queries/organizations";
import {
  useOrganizationNotificationSettings,
  useUpdateOrganizationNotificationSettings,
} from "../../features/notifications/hooks";
import {
  defaultNotificationSettings,
  type OrganizationNotificationSettings,
  type ReminderTimingSettings,
} from "../../features/notifications/types";

const reminderOptions: Array<{
  key: keyof ReminderTimingSettings;
  label: string;
}> = [
  { key: "thirty_days_before", label: "30 days before" },
  { key: "fifteen_days_before", label: "15 days before" },
  { key: "seven_days_before", label: "7 days before" },
  { key: "on_due_date", label: "On due date" },
  { key: "overdue", label: "Overdue reminders" },
];

const splitRecipients = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const SettingsNotifications = () => {
  const organizationsQuery = useOrganizationsQuery();
  const organizations = organizationsQuery.data?.organizations ?? [];
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [draft, setDraft] = useState<OrganizationNotificationSettings | null>(null);
  const settingsQuery = useOrganizationNotificationSettings(selectedOrganizationId || null);
  const updateSettings = useUpdateOrganizationNotificationSettings();

  useEffect(() => {
    if (!selectedOrganizationId && organizations.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    } else if (selectedOrganizationId) {
      setDraft(defaultNotificationSettings(selectedOrganizationId));
    }
  }, [selectedOrganizationId, settingsQuery.data]);

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrganizationId),
    [organizations, selectedOrganizationId]
  );

  const updateDraft = <Key extends keyof OrganizationNotificationSettings>(
    key: Key,
    value: OrganizationNotificationSettings[Key]
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateReminderTiming = (key: keyof ReminderTimingSettings, value: boolean) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            reminder_timing: {
              ...current.reminder_timing,
              [key]: value,
            },
          }
        : current
    );
  };

  const handleSave = async () => {
    if (!draft || !selectedOrganizationId) return;
    await updateSettings.mutateAsync({
      organizationId: selectedOrganizationId,
      settings: draft,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary-50 p-2 dark:bg-primary-900/20">
                <BellAlertIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Organization Notifications
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Reminder settings managed by the Calibration Portal.
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="notification-organization"
                className="text-xs font-semibold uppercase text-gray-500"
              >
                Organization / Customer
              </label>
              <select
                id="notification-organization"
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 lg:w-80"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardBody className="p-6">
          {organizationsQuery.isLoading || settingsQuery.isLoading || !draft ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner label="Loading notification settings" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <BuildingOffice2Icon className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedOrganization?.name ?? "Selected organization"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedOrganization?.contacts?.[0]?.email || "No primary email recorded"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <ChannelSwitch
                  icon={<BellAlertIcon className="h-5 w-5" />}
                  title="In-app notifications"
                  description="Customer portal and internal bell"
                  enabled={draft.in_app_enabled}
                  onChange={(value) => updateDraft("in_app_enabled", value)}
                />
                <ChannelSwitch
                  icon={<EnvelopeIcon className="h-5 w-5" />}
                  title="Email reminders"
                  description="Reminder emails"
                  enabled={draft.email_reminders_enabled}
                  onChange={(value) => updateDraft("email_reminders_enabled", value)}
                />
                <ChannelSwitch
                  icon={<DevicePhoneMobileIcon className="h-5 w-5" />}
                  title="WhatsApp reminders"
                  description="Mobile reminders"
                  enabled={draft.whatsapp_reminders_enabled}
                  onChange={(value) => updateDraft("whatsapp_reminders_enabled", value)}
                />
              </div>

              <Divider />

              <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Reminder Timing
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {reminderOptions.map((option) => (
                      <label
                        key={option.key}
                        className="flex min-h-12 items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {option.label}
                        </span>
                        <Switch
                          size="sm"
                          isSelected={draft.reminder_timing[option.key]}
                          onValueChange={(value) => updateReminderTiming(option.key, value)}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <RecipientList
                    label="Recipient email addresses"
                    value={draft.recipient_emails.join("\n")}
                    placeholder="quality@example.com"
                    onChange={(value) => updateDraft("recipient_emails", splitRecipients(value))}
                  />
                  <RecipientList
                    label="WhatsApp / mobile numbers"
                    value={draft.whatsapp_numbers.join("\n")}
                    placeholder="+91 98765 43210"
                    onChange={(value) => updateDraft("whatsapp_numbers", splitRecipients(value))}
                  />
                </section>
              </div>

              <div className="flex justify-end border-t border-gray-200 pt-5">
                <Button
                  color="primary"
                  isLoading={updateSettings.isPending}
                  onPress={handleSave}
                >
                  Save Settings
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

function ChannelSwitch({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-gray-100 p-2 text-gray-600">{icon}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <Switch size="sm" isSelected={enabled} onValueChange={onChange} />
      </div>
      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function RecipientList({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-900">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-44 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
    </label>
  );
}
