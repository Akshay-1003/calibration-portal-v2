import {
  Squares2X2Icon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  InboxStackIcon,
  CircleStackIcon,
  WrenchScrewdriverIcon,
  ArrowsPointingOutIcon,
  UserPlusIcon,
  InboxArrowDownIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { BoxCubeIcon } from "../icons";
import { billingAccessRoles, type PermissionRequirement } from "./access-control";

export type NavItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: string | number;
  items?: NavSubItem[];
  permission?: PermissionRequirement;
  roles?: readonly string[];
};

export type NavSubItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: string | number;
  matchPattern?: string;
  permission?: PermissionRequirement;
  roles?: readonly string[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const sidebarConfig: NavGroup[] = [
  {
    title: "Main Menu",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: <Squares2X2Icon className="w-5 h-5" />,
      },
      {
        title: "Transactions",
        url: "/transactions",
        icon: <ArrowsRightLeftIcon className="w-5 h-5" />,
        items: [
          {
            title: "Inward",
            url: "/transactions/inward",
            icon: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
            matchPattern: "^/transactions/inward(?!/linked-gauges)",
            permission: { module: "inward", action: "view" },
          },
          {
            title: "Calibration Certificate",
            url: "/transactions/calibration-certificate",
            icon: <InboxStackIcon className="w-4 h-4" />,
            matchPattern: "^/transactions/calibration-certificate(/|$)",
            permission: { module: "inward", action: "view" },
          },
         
          {
            title: "Outward",
            url: "/transactions/outward",
            icon: <ArrowsPointingOutIcon className="w-4 h-4" />,
            permission: { module: "outward", action: "view" },
          },
        ],
      },
      {
        title: "Masters",
        url: "/masters",
        icon: <BoxCubeIcon className="w-5 h-5" />,
        items: [
          {
            title: "Client Master",
            url: "/masters/party-master",
            icon: <UserPlusIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
          {
            title: "Gauges Master",
            url: "/masters/gauges-master",
            icon: <InboxStackIcon className="w-4 h-4" />,
            permission: { module: "gauge_master", action: "view" },
          },
          {
            title: "New Master Equi. Add",
            url: "/masters/equipment-master",
            icon: <InboxArrowDownIcon className="w-4 h-4" />,
            permission: { module: "equipment", action: "view" },
          },
          {
            title: "Equipment History",
            url: "/masters/equipment-history",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "equipment", action: "view" },
          },
          {
            title: "Scope Master",
            url: "/masters/scope-master",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "scope", action: "view" },
          },
          {
            title: "Format Numbers",
            url: "/masters/format-numbers",
            icon: <DocumentTextIcon className="w-4 h-4" />,
            permission: { module: "format_number", action: "view" },
          },
        ],
      },
      {
        title: "Other Master",
        url: "/other-masters",
        icon: <CircleStackIcon className="w-5 h-5" />,
        items: [
          {
            title: "Thread Ring/Plug Masters",
            url: "/masters/thread-ring-plug",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
          {
            title: "Taper Thread Readings",
            url: "/masters/taper-thread-readings",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
          {
            title: "Surface Plate Master",
            url: "/masters/surface-plate-master",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
          {
            title: "Reading Master",
            url: "/masters/reading-master",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
          {
            title: "Dial Table Master",
            url: "/masters/dial-table-master",
            icon: <CircleStackIcon className="w-4 h-4" />,
            permission: { module: "other_masters", action: "view" },
          },
        ],
      },
       {
        title: "Maintenance",
        url: "/maintenance",
        icon: <WrenchScrewdriverIcon className="w-5 h-5" />,
        items: [
          {
            title: "Instrument Repair",
            url: "/maintenance",
            icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
            matchPattern: "^/maintenance(/|$)",

          },
          {
            title: "Instrument Master",
            url: "/maintenance/repair-master",
            icon: <WrenchScrewdriverIcon className="w-4 h-4" />,
            matchPattern: "^/maintenance/repair-master(/|$)",
          },
        ],
      },
      {
        title: "Billing",
        url: "/billing",
        icon: <DocumentTextIcon className="w-5 h-5" />,
        roles: billingAccessRoles,
        items: [
          {
            title: "Invoice",
            url: "/billing/invoice",
            icon: <DocumentTextIcon className="w-4 h-4" />,
            permission: { module: "invoice", action: "view" },
          },
          {
            title: "Quotation",
            url: "/billing/quotation",
            icon: <DocumentDuplicateIcon className="w-4 h-4" />,
            permission: { module: "invoice", action: "view" },
          },
        ],
      },
    ],
  },
];
