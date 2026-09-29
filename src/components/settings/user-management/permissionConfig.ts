import type {
  PermissionAction,
  PermissionModule,
  User,
  UserPermissionScope,
} from '../../../features/auth/types/auth.types';
import {
  PERMISSION_MODULES,
  createEmptyPermissionScope,
  normalizePermissionScope,
} from '../../../features/auth/utils/permissionHelpers';

export const userRoleOptions: Array<{ key: User['role']; label: string; description: string }> = [
  { key: 'lab_admin', label: 'Lab Admin', description: 'Full administration within this laboratory.' },
  { key: 'lab_manager', label: 'Lab Manager', description: 'Operational management and limited staff management within this laboratory.' },
  { key: 'lab_engineer', label: 'Lab Engineer', description: 'Technical calibration work without billing or administration access.' },
  { key: 'lab_viewer', label: 'Lab Viewer', description: 'Read-only access to permitted laboratory workflows.' },
];

export const customerRoleOptions: Array<{ key: User['role']; label: string; description: string }> = [
  { key: 'org_admin', label: 'Organization Admin', description: 'Full customer portal administration for this organization.' },
  { key: 'org_manager', label: 'Organization Manager', description: 'Operational customer portal access with limited administration.' },
  { key: 'org_user', label: 'Organization User', description: 'Standard customer portal access.' },
  { key: 'org_viewer', label: 'Organization Viewer', description: 'Read-only customer portal access.' },
];

export const userStatusOptions = [
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
] as const;

export const permissionModuleConfigs: Array<{
  key: PermissionModule;
  label: string;
  description: string;
}> = [
  { key: 'inward', label: 'Transactions / Inward', description: 'Inward registration, calibration, and certificate preparation.' },
  { key: 'outward', label: 'Transactions / Outward', description: 'Outward entries, dispatch, and outward invoice flows.' },
  { key: 'invoice', label: 'Billing / Invoice', description: 'Invoices, quotations, and related billing actions.' },
  { key: 'user', label: 'User Management', description: 'Settings access for users, accounts, roles, and permissions.' },
  { key: 'gauge_master', label: 'Masters / Gauge Master', description: 'Gauge master catalog and maintenance flows.' },
  { key: 'equipment', label: 'Masters / Equipment', description: 'Equipment master data and equipment history flows.' },
  { key: 'scope', label: 'Masters / Scope', description: 'Scope master configuration and edit flows.' },
  { key: 'format_number', label: 'Masters / Format Number', description: 'Format numbering setup and maintenance.' },
  { key: 'other_masters', label: 'Other Masters', description: 'Client master and supporting master-data screens.' },
  { key: 'customer_dashboard', label: 'Customer Portal / Dashboard', description: 'Customer dashboard visibility and analytics access.' },
  { key: 'customer_calibration', label: 'Customer Portal / Calibration Overview', description: 'Customer calibration overview, due planning, and certificate views.' },
  { key: 'customer_gauge_life_prediction', label: 'Customer Portal / Gauge Life Prediction', description: 'Gauge health prediction tools and related analysis.' },
  { key: 'customer_transactions', label: 'Customer Portal / Transactions', description: 'Customer inward/outward transaction tabs and print actions.' },
  { key: 'customer_gauge_management', label: 'Customer Portal / Gauge Management', description: 'Customer gauge list, gauge details, and format number features.' },
  { key: 'customer_reports', label: 'Customer Portal / Reports', description: 'Customer history card and calibration due reports.' },
  { key: 'customer_notifications', label: 'Customer Portal / Notifications', description: 'Customer notification bell, notification page, and response actions.' },
  { key: 'customer_settings', label: 'Customer Portal / Settings', description: 'Customer profile and portal settings visibility.' },
];

export const customerPermissionModuleConfigs = permissionModuleConfigs.filter(({ key }) =>
  key.startsWith('customer_')
);
const customerPermissionModules = customerPermissionModuleConfigs.map(({ key }) => key);

const labAdminRoles = new Set<User['role']>(['lab_admin']);
const labManagerRoles = new Set<User['role']>(['lab_manager']);
const labEngineerRoles = new Set<User['role']>(['lab_engineer']);
const labViewerRoles = new Set<User['role']>(['lab_viewer']);

const getScopeMetadata = (organizationId?: string | null, labId?: string | null) => ({
  scope: labId ? 'lab' : organizationId ? 'organization' : 'all',
  organization_id: organizationId?.trim() ? organizationId.trim() : null,
  lab_id: labId?.trim() ? labId.trim() : null,
});

export const withPermissionScopeMetadata = (
  permissionScope: UserPermissionScope | null | undefined,
  organizationId?: string | null,
  labId?: string | null,
): UserPermissionScope => {
  const normalizedScope = normalizePermissionScope(permissionScope ?? createEmptyPermissionScope());

  return {
    ...normalizedScope,
    ...getScopeMetadata(organizationId, labId),
  };
};

export const setPermissionAction = (
  permissionScope: UserPermissionScope | null | undefined,
  module: PermissionModule,
  action: PermissionAction,
  checked: boolean,
  organizationId?: string | null,
  labId?: string | null
): UserPermissionScope => {
  const normalizedScope = withPermissionScopeMetadata(permissionScope, organizationId, labId);
  const currentActions = normalizedScope.permissions[module] ?? [];

  const nextActions = (() => {
    if (action === 'view') {
      return checked ? Array.from(new Set([...currentActions, 'view'])) : [];
    }

    if (!checked) {
      return currentActions.filter((item) => item !== 'edit');
    }

    return Array.from(new Set([...currentActions, 'view', 'edit']));
  })();

  return {
    ...normalizedScope,
    permissions: {
      ...normalizedScope.permissions,
      [module]: nextActions,
    },
  };
};

export const setAllPermissions = (
  permissionScope: UserPermissionScope | null | undefined,
  mode: 'view' | 'edit' | 'clear',
  organizationId?: string | null,
  labId?: string | null,
  modules: PermissionModule[] = [...PERMISSION_MODULES],
): UserPermissionScope => {
  const normalizedScope = withPermissionScopeMetadata(permissionScope, organizationId, labId);
  const nextPermissions = modules.reduce<UserPermissionScope['permissions']>((accumulator, module) => {
    accumulator[module] =
      mode === 'edit'
        ? ['view', 'edit']
        : mode === 'view'
          ? ['view']
          : [];
    return accumulator;
  }, {});

  return {
    ...normalizedScope,
    permissions: nextPermissions,
  };
};

export const getRoleDefaultPermissions = (
  role: User['role'],
  organizationId?: string | null,
  labId?: string | null
): UserPermissionScope => {
  if (labAdminRoles.has(role)) {
    const adminPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    adminPermissions.permissions = {
      inward: ['view', 'edit'],
      outward: ['view', 'edit'],
      invoice: ['view', 'edit'],
      user: ['view', 'edit'],
      gauge_master: ['view', 'edit'],
      equipment: ['view', 'edit'],
      scope: ['view', 'edit'],
      format_number: ['view', 'edit'],
      other_masters: ['view', 'edit'],
    };
    return adminPermissions;
  }

  if (labManagerRoles.has(role)) {
    const managerPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    managerPermissions.permissions = {
      inward: ['view', 'edit'],
      outward: ['view', 'edit'],
      invoice: ['view', 'edit'],
      user: ['view', 'edit'],
      gauge_master: ['view'],
      equipment: ['view'],
      scope: ['view'],
      format_number: ['view'],
      other_masters: ['view'],
    };
    return managerPermissions;
  }

  if (labEngineerRoles.has(role)) {
    const engineerPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    engineerPermissions.permissions = {
      inward: ['view', 'edit'],
      outward: ['view', 'edit'],
      gauge_master: ['view'],
      equipment: ['view'],
      scope: ['view'],
    };
    return engineerPermissions;
  }

  if (labViewerRoles.has(role)) {
    const viewerPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    viewerPermissions.permissions = {
      inward: ['view'],
      outward: ['view'],
      invoice: ['view'],
      user: ['view'],
      gauge_master: ['view'],
      equipment: ['view'],
      scope: ['view'],
      format_number: ['view'],
      other_masters: ['view'],
    };
    return viewerPermissions;
  }

  if (role === 'super_admin' || role === 'superadmin' || role === 'org_admin') {
    if (role === 'org_admin') {
      return setAllPermissions(createEmptyPermissionScope(), 'edit', organizationId, labId, customerPermissionModules);
    }
    return setAllPermissions(createEmptyPermissionScope(), 'edit', organizationId, labId);
  }

  if (role === 'org_manager') {
    const managerPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    managerPermissions.permissions = {
      customer_dashboard: ['view', 'edit'],
      customer_calibration: ['view', 'edit'],
      customer_gauge_life_prediction: ['view', 'edit'],
      customer_transactions: ['view', 'edit'],
      customer_gauge_management: ['view', 'edit'],
      customer_reports: ['view', 'edit'],
      customer_notifications: ['view', 'edit'],
      customer_settings: ['view'],
    };
    return managerPermissions;
  }

  if (role === 'org_user') {
    const customerPermissions = withPermissionScopeMetadata(createEmptyPermissionScope(), organizationId, labId);
    customerPermissions.permissions = {
      customer_dashboard: ['view'],
      customer_calibration: ['view'],
      customer_gauge_life_prediction: ['view'],
      customer_transactions: ['view', 'edit'],
      customer_gauge_management: ['view', 'edit'],
      customer_reports: ['view'],
      customer_notifications: ['view', 'edit'],
      customer_settings: ['view'],
    };
    return customerPermissions;
  }

  if (role === 'org_viewer') {
    return setAllPermissions(createEmptyPermissionScope(), 'view', organizationId, labId, customerPermissionModules);
  }

  return setAllPermissions(createEmptyPermissionScope(), 'clear', organizationId, labId);
};

export const arePermissionScopesEqual = (
  left: UserPermissionScope | null | undefined,
  right: UserPermissionScope | null | undefined
): boolean => {
  const normalizedLeft = normalizePermissionScope(left);
  const normalizedRight = normalizePermissionScope(right);

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
};
