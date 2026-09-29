import { useMemo, useState } from "react";
import {
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAdminNotifications, useMarkAdminNotificationRead } from "../../features/notifications/hooks";
import type { NotificationEvent } from "../../features/notifications/types";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const adminNotificationsQuery = useAdminNotifications({ limit: 25 });
  const markRead = useMarkAdminNotificationRead();

  const notifications = adminNotificationsQuery.data?.notifications ?? [];
  const importantNotifications = useMemo(
    () =>
      notifications.filter(
        (item) =>
          !item.read_by_internal &&
          (item.pending_calibration_request ||
            item.delivery_status === "failed" ||
            item.response_status === "not_now" ||
            item.priority === "high")
      ),
    [notifications]
  );
  const unreadCount = notifications.filter((item) => !item.read_by_internal).length;

  const toggleDropdown = () => setIsOpen((current) => !current);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative">
      <div className="relative" aria-label={`${unreadCount} unread notifications`}>
        <button
          className="dropdown-toggle relative flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={toggleDropdown}
          aria-label="Notifications"
        >
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 z-10 h-2 w-2 rounded-full bg-red-500">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
            </span>
          )}
          <BellAlertIcon className="h-5 w-5" />
        </button>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 z-20 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white">
            {unreadCount}
          </span>
        )}
      </div>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-2 flex h-[460px] w-[350px] flex-col rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:w-[390px]"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div>
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Internal Notifications
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customer responses and reminder status
            </p>
          </div>
          <span
            className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-xs font-semibold leading-5 text-white"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {adminNotificationsQuery.isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : importantNotifications.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500">
              No important unread updates.
            </div>
          ) : (
            <ul className="space-y-2">
              {importantNotifications.slice(0, 8).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() =>
                    markRead.mutate({
                      notificationId: notification.id,
                      read: true,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </div>
      </Dropdown>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationEvent;
  onMarkRead: () => void;
}) {
  const isFailure = notification.delivery_status === "failed";
  const Icon = isFailure ? ExclamationTriangleIcon : CheckCircleIcon;

  return (
    <li className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5">
      <div className="flex gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isFailure ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-gray-900 dark:text-white">
            {notification.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{notification.channel}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span>{formatDateTime(notification.response_at || notification.sent_at || notification.created_at)}</span>
          </div>
          <button
            type="button"
            onClick={onMarkRead}
            className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Mark as read
          </button>
        </div>
      </div>
    </li>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Now";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
