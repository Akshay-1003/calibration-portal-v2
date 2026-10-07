import type { PermissionAction, PermissionModule } from "../features/auth/types/auth.types";
import { canEditModule, canViewModule } from "../features/auth/utils/permissionHelpers";
import type { UserPermissionScope } from "../features/auth/types/auth.types";

export type PermissionRequirement = {
  module: PermissionModule;
  action: PermissionAction;
};

export type RouteAccessRule = {
  matcher: RegExp;
  requirement: PermissionRequirement;
};

export const routeAccessRules: RouteAccessRule[] = [
  { matcher: /^\/transactions\/inward$/, requirement: { module: "inward", action: "view" } },
  { matcher: /^\/transactions\/inward\/create$/, requirement: { module: "inward", action: "edit" } },
  { matcher: /^\/transactions\/inward\/edit\/[^/]+$/, requirement: { module: "inward", action: "edit" } },
  {
    matcher: /^\/transactions\/inward\/[^/]+\/register-gauge\/.+$/,
    requirement: { module: "inward", action: "edit" },
  },
  { matcher: /^\/transactions\/calibration\/inwards$/, requirement: { module: "inward", action: "view" } },
  { matcher: /^\/transactions\/calibration\/[^/]+$/, requirement: { module: "inward", action: "edit" } },
  {
    matcher: /^\/transactions\/calibration-certificate$/,
    requirement: { module: "inward", action: "view" },
  },
  {
    matcher: /^\/transactions\/calibration-certificate\/nabl-process\/[^/]+\/[^/]+$/,
    requirement: { module: "inward", action: "edit" },
  },
  { matcher: /^\/transactions\/outward$/, requirement: { module: "outward", action: "view" } },
  { matcher: /^\/transactions\/outward\/create$/, requirement: { module: "outward", action: "edit" } },
  { matcher: /^\/transactions\/outward\/[^/]+$/, requirement: { module: "outward", action: "view" } },
  {
    matcher: /^\/transactions\/outward\/create-outward-invoice\/.+$/,
    requirement: { module: "outward", action: "edit" },
  },
  {
    matcher: /^\/transactions\/outward\/edit-outward-invoice\/[^/]+$/,
    requirement: { module: "outward", action: "edit" },
  },
  { matcher: /^\/billing\/invoice$/, requirement: { module: "invoice", action: "view" } },
  { matcher: /^\/billing\/invoice\/create$/, requirement: { module: "invoice", action: "edit" } },
  { matcher: /^\/billing\/invoice\/[^/]+\/edit$/, requirement: { module: "invoice", action: "edit" } },
  { matcher: /^\/billing\/quotation$/, requirement: { module: "invoice", action: "view" } },
  { matcher: /^\/billing\/quotation\/create$/, requirement: { module: "invoice", action: "edit" } },
  { matcher: /^\/billing\/quotation\/[^/]+\/edit$/, requirement: { module: "invoice", action: "edit" } },
  { matcher: /^\/masters\/gauges-master$/, requirement: { module: "gauge_master", action: "view" } },
  {
    matcher: /^\/masters\/gauges-master\/(create|edit\/[^/]+)$/,
    requirement: { module: "gauge_master", action: "edit" },
  },
  { matcher: /^\/masters\/equipment-master$/, requirement: { module: "equipment", action: "view" } },
  {
    matcher: /^\/masters\/equipment-master\/(create|edit\/[^/]+)$/,
    requirement: { module: "equipment", action: "edit" },
  },
  { matcher: /^\/masters\/equipment-history$/, requirement: { module: "equipment", action: "view" } },
  {
    matcher: /^\/masters\/equipment-history\/(create|edit\/[^/]+)$/,
    requirement: { module: "equipment", action: "edit" },
  },
  { matcher: /^\/masters\/scope-master$/, requirement: { module: "scope", action: "view" } },
  {
    matcher: /^\/masters\/scope-master\/(create|edit\/[^/]+)$/,
    requirement: { module: "scope", action: "edit" },
  },
  { matcher: /^\/masters\/format-numbers$/, requirement: { module: "format_number", action: "view" } },
  { matcher: /^\/settings\/(users|roles-permissions|accounts)$/, requirement: { module: "user", action: "view" } },
];

export const getRoutePermissionRequirement = (
  pathname: string
): PermissionRequirement | null => {
  const matchedRule = routeAccessRules.find((rule) => rule.matcher.test(pathname));
  return matchedRule?.requirement ?? null;
};

export const hasPermissionRequirement = (
  permissionScope: UserPermissionScope | null | undefined,
  requirement: PermissionRequirement | null | undefined
): boolean => {
  if (!requirement) {
    return true;
  }

  return requirement.action === "edit"
    ? canEditModule(permissionScope, requirement.module)
    : canViewModule(permissionScope, requirement.module);
};

export const settingsTabPermissions: Partial<Record<string, PermissionRequirement>> = {
  users: { module: "user", action: "view" },
  "roles-permissions": { module: "user", action: "view" },
  accounts: { module: "user", action: "view" },
  laboratories: { module: "user", action: "view" },
};

export const settingsUserManagementRoles = [
  'super_admin',
  'superadmin',
  'lab_admin',
] as const;

export const settingsAdministrationRoles = [
  'super_admin',
  'superadmin',
  'lab_admin',
] as const;

export const settingsAdminRoles = [
  'super_admin',
  'superadmin',
] as const;

export const billingAccessRoles = [
  'super_admin',
  'superadmin',
  'lab_admin',
] as const;

export const adminOnlySettingsTabs = new Set([
  'laboratories',
  'upload-records',
]);

export const settingsAdministrationTabs = new Set([
  'users',
  'accounts',
  'roles-permissions',
]);
