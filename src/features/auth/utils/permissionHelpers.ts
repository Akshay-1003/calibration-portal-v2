import type {
  PermissionAction,
  PermissionCheck,
  PermissionModule,
  UserPermissionScope,
} from "../types/auth.types";

export const PERMISSION_ACTIONS = ["view", "edit"] as const;

export const PERMISSION_MODULES = [
  "inward",
  "outward",
  "invoice",
  "user",
  "gauge_master",
  "equipment",
  "scope",
  "format_number",
  "other_masters",
  "customer_dashboard",
  "customer_calibration",
  "customer_gauge_life_prediction",
  "customer_transactions",
  "customer_gauge_management",
  "customer_reports",
  "customer_notifications",
  "customer_settings",
] as const satisfies readonly PermissionModule[];

export type PermissionCheckInput = PermissionCheck | `${string}:${string}` | PermissionModule;

const PERMISSION_ACTION_SET = new Set<PermissionAction>(PERMISSION_ACTIONS);
const PERMISSION_MODULE_SET = new Set<PermissionModule>(PERMISSION_MODULES);

const isPermissionModule = (value: string): value is PermissionModule =>
  PERMISSION_MODULE_SET.has(value as PermissionModule);

const isPermissionAction = (value: string): value is PermissionAction =>
  PERMISSION_ACTION_SET.has(value as PermissionAction);

export const createEmptyPermissionScope = (): UserPermissionScope => ({
  permissions: {},
  scope: "all",
  organization_id: null,
  lab_id: null,
});

const unwrapPermissionScopeValue = (value: unknown): unknown => {
  let currentValue = value;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!currentValue || typeof currentValue !== "object" || Array.isArray(currentValue)) {
      return currentValue;
    }

    const record = currentValue as Record<string, unknown>;
    const permissionsCandidate = record.permissions;

    if (!permissionsCandidate || typeof permissionsCandidate !== "object" || Array.isArray(permissionsCandidate)) {
      return currentValue;
    }

    const permissionRecord = permissionsCandidate as Record<string, unknown>;
    const hasNestedPermissionsObject =
      "permissions" in permissionRecord &&
      typeof permissionRecord.permissions === "object" &&
      permissionRecord.permissions !== null &&
      !Array.isArray(permissionRecord.permissions);

    const hasModuleArrayValues = Object.entries(permissionRecord).some(
      ([key, candidateValue]) => isPermissionModule(key) && Array.isArray(candidateValue)
    );

    const looksLikeEnvelope =
      "user_id" in record ||
      "status" in record ||
      "message" in record ||
      "entity" in record ||
      "actions" in record;

    if (looksLikeEnvelope || hasNestedPermissionsObject) {
      currentValue = permissionsCandidate;
      continue;
    }

    if (hasModuleArrayValues) {
      return currentValue;
    }

    return currentValue;
  }

  return currentValue;
};

export const normalizePermissionScope = (value: unknown): UserPermissionScope => {
  const normalizedValue = unwrapPermissionScopeValue(value);

  if (!normalizedValue || typeof normalizedValue !== "object") {
    return createEmptyPermissionScope();
  }

  const rawScope = normalizedValue as Partial<UserPermissionScope> & {
    permissions?: Record<string, unknown> | null;
  };

  const permissions = Object.entries(rawScope.permissions ?? {}).reduce<
    Partial<Record<PermissionModule, PermissionAction[]>>
  >((accumulator, [moduleKey, actions]) => {
    if (!isPermissionModule(moduleKey) || !Array.isArray(actions)) {
      return accumulator;
    }

    const normalizedActions = actions.filter(
      (action): action is PermissionAction =>
        typeof action === "string" && isPermissionAction(action)
    );

    accumulator[moduleKey] = Array.from(new Set(normalizedActions));
    return accumulator;
  }, {});

  return {
    permissions,
    scope: typeof rawScope.scope === "string" ? rawScope.scope : "all",
    organization_id:
      typeof rawScope.organization_id === "string" ? rawScope.organization_id : null,
    lab_id: typeof rawScope.lab_id === "string" ? rawScope.lab_id : null,
  };
};

export const resolvePermissionCheck = (
  moduleOrCheck: PermissionCheckInput,
  action?: PermissionAction
): PermissionCheck | null => {
  if (typeof moduleOrCheck === "object" && moduleOrCheck !== null) {
    return moduleOrCheck.module && moduleOrCheck.action
      ? moduleOrCheck
      : null;
  }

  if (typeof moduleOrCheck !== "string") {
    return null;
  }

  if (action && isPermissionModule(moduleOrCheck)) {
    return { module: moduleOrCheck, action };
  }

  const [moduleKey, actionKey] = moduleOrCheck.split(":");

  if (!isPermissionModule(moduleKey) || !actionKey || !isPermissionAction(actionKey)) {
    return null;
  }

  return {
    module: moduleKey,
    action: actionKey,
  };
};

export const hasModulePermission = (
  permissionScope: UserPermissionScope | null | undefined,
  moduleOrCheck: PermissionCheckInput,
  action?: PermissionAction
): boolean => {
  const resolvedCheck = resolvePermissionCheck(moduleOrCheck, action);

  if (!resolvedCheck) {
    return false;
  }

  const normalizedScope = normalizePermissionScope(permissionScope);
  const allowedActions = normalizedScope.permissions?.[resolvedCheck.module] ?? [];

  return allowedActions.includes(resolvedCheck.action);
};

export const hasAnyModulePermission = (
  permissionScope: UserPermissionScope | null | undefined,
  checks: PermissionCheckInput[]
): boolean => checks.some((check) => hasModulePermission(permissionScope, check));

export const hasAllModulePermissions = (
  permissionScope: UserPermissionScope | null | undefined,
  checks: PermissionCheckInput[]
): boolean => checks.every((check) => hasModulePermission(permissionScope, check));

export const canViewModule = (
  permissionScope: UserPermissionScope | null | undefined,
  module: PermissionModule
): boolean => hasModulePermission(permissionScope, module, "view");

export const canEditModule = (
  permissionScope: UserPermissionScope | null | undefined,
  module: PermissionModule
): boolean => hasModulePermission(permissionScope, module, "edit");
