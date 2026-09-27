import { z } from 'zod';
import type { User, UserPermissionScope } from '../../../features/auth/types/auth.types';
import { createEmptyPermissionScope, normalizePermissionScope } from '../../../features/auth/utils/permissionHelpers';

export type ManagedUserRole = User['role'];
export type ManagedUserStatus = 'active' | 'archived';

export interface ManagedUserFormValues {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirmPassword: string;
  organization_id: string;
  lab_id: string;
  department: string;
  role: ManagedUserRole;
  sign_base64: string;
  status: ManagedUserStatus;
  permissions: UserPermissionScope;
}

const permissionScopeSchema = z
  .object({
    permissions: z
      .record(z.string(), z.array(z.enum(['view', 'edit'])))
      .default({}),
    scope: z.string().nullable().optional(),
    organization_id: z.string().nullable().optional(),
    lab_id: z.string().nullable().optional(),
  })
  .transform((value) => normalizePermissionScope(value));

const baseUserFormSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.email('Please enter a valid email address'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  organization_id: z.string().trim().min(1, 'Organization is required'),
  lab_id: z.string().trim(),
  department: z.string().trim(),
  role: z.string().min(1, 'Role is required'),
  sign_base64: z.string().trim(),
  status: z.enum(['active', 'archived']),
  permissions: permissionScopeSchema,
});

const passwordFieldsSchema = {
  password: z.string(),
  confirmPassword: z.string(),
};

export const createManagedUserSchema = baseUserFormSchema.extend(passwordFieldsSchema).superRefine((data, ctx) => {
  if (data.password.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must be at least 6 characters',
      path: ['password'],
    });
  }

  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
  }
});

export const editManagedUserSchema = baseUserFormSchema.extend({
  password: z.string().default(''),
  confirmPassword: z.string().default(''),
});

export const getManagedUserDefaultValues = (
  user?: Partial<User> | null,
  permissions?: UserPermissionScope | null
): ManagedUserFormValues => ({
  username: user?.username ?? '',
  email: user?.email ?? '',
  first_name: user?.first_name ?? '',
  last_name: user?.last_name ?? '',
  password: '',
  confirmPassword: '',
  organization_id: user?.organization_id ?? '',
  lab_id: user?.lab_id ?? '',
  department: user?.department ?? '',
  role: (user?.role ?? 'lab_viewer') as ManagedUserRole,
  sign_base64: user?.signature ?? '',
  status: user?.archived ? 'archived' : 'active',
  permissions: normalizePermissionScope(permissions ?? user?.permissions ?? createEmptyPermissionScope()),
});
