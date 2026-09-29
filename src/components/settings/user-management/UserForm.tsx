import { useCallback, useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@heroui/react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import type { User, UserPermissionScope } from '../../../features/auth/types/auth.types';
import { useAuth } from '../../../features/auth';
import { normalizePermissionScope } from '../../../features/auth/utils/permissionHelpers';
import {
  arePermissionScopesEqual,
  getRoleDefaultPermissions,
  withPermissionScopeMetadata,
} from './permissionConfig';
import {
  createManagedUserSchema,
  editManagedUserSchema,
  getManagedUserDefaultValues,
  type ManagedUserFormValues,
} from './userManagementSchema';
import { UserBasicDetails } from './UserBasicDetails';
import { UserPermissionEditor } from './UserPermissionEditor';
import { UserRoleSelector } from './UserRoleSelector';

interface UserFormProps {
  mode: 'create' | 'edit';
  initialUser?: User | null;
  initialPermissions?: UserPermissionScope | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (values: ManagedUserFormValues) => void | Promise<void>;
  userType?: 'laboratory' | 'customer';
  organizationOptions?: Array<{ id: string; name: string }>;
}

export const UserForm = ({
  mode,
  initialUser,
  initialPermissions,
  isLoading = false,
  onClose,
  onSubmit,
  userType = 'laboratory',
  organizationOptions = [],
}: UserFormProps) => {
  const { user: currentUser } = useAuth();
  const getFormDefaults = useCallback(() => {
    const values = getManagedUserDefaultValues(initialUser, initialPermissions);

    if (mode === 'create') {
      values.organization_id = userType === 'laboratory' ? currentUser?.organization_id ?? '' : '';
      values.lab_id = '';
      values.role = userType === 'customer' ? 'org_user' : 'lab_viewer';
      values.department = '';
      values.sign_base64 = '';
      values.permissions = getRoleDefaultPermissions(
        values.role,
        values.organization_id,
        null,
      );
    }

    return values;
  }, [currentUser?.organization_id, initialPermissions, initialUser, mode, userType]);
  const defaultValues = getFormDefaults();
  const schema = mode === 'create' ? createManagedUserSchema : editManagedUserSchema;
  const hasAppliedRoleDefaultsRef = useRef(mode === 'edit');
  const lastRoleRef = useRef(defaultValues.role);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ManagedUserFormValues>({
    resolver: zodResolver(schema) as Resolver<ManagedUserFormValues, undefined, ManagedUserFormValues>,
    mode: 'onChange',
    defaultValues,
  });

  const organizationId = watch('organization_id');
  const labId = watch('lab_id');
  const role = watch('role');
  const permissions = watch('permissions');

  useEffect(() => {
    const nextDefaults = getFormDefaults();
    reset(nextDefaults);
    hasAppliedRoleDefaultsRef.current = mode === 'edit';
    lastRoleRef.current = nextDefaults.role;
  }, [getFormDefaults, mode, reset]);

  useEffect(() => {
    const nextPermissions = withPermissionScopeMetadata(permissions, organizationId, labId);

    if (arePermissionScopesEqual(permissions, nextPermissions)) {
      return;
    }

    setValue('permissions', nextPermissions, { shouldDirty: isDirty });
  }, [organizationId, labId, permissions, setValue, isDirty]);

  useEffect(() => {
    const roleChanged = role !== lastRoleRef.current;
    const previousRole = lastRoleRef.current;
    lastRoleRef.current = role;

    if (!roleChanged) {
      return;
    }

    const previousRoleDefaults = getRoleDefaultPermissions(previousRole, organizationId, labId);
    const nextRoleDefaults = getRoleDefaultPermissions(role, organizationId, labId);
    const hasCustomizedPermissions = !arePermissionScopesEqual(permissions, previousRoleDefaults);

    if (mode === 'create' && (!hasAppliedRoleDefaultsRef.current || !hasCustomizedPermissions)) {
      setValue('permissions', nextRoleDefaults, {
        shouldDirty: true,
      });
      hasAppliedRoleDefaultsRef.current = true;
    }
  }, [labId, mode, organizationId, permissions, role, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      autoComplete="off"
    >
      <input type="text" name="fake-username" autoComplete="username" className="hidden" tabIndex={-1} />
      <input type="password" name="fake-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

      <UserBasicDetails register={register} errors={errors} mode={mode} userType={userType} />

      <div className="h-px bg-slate-200" />

      <UserRoleSelector
        control={control}
        errors={errors}
        userType={userType}
        organizationOptions={organizationOptions}
      />

      <div className="h-px bg-slate-200" />

      <Controller
        control={control}
        name="permissions"
        render={({ field }) => (
          <UserPermissionEditor
            value={normalizePermissionScope(field.value)}
            onChange={field.onChange}
            organizationId={organizationId}
            labId={labId}
            role={role}
            isDisabled={isLoading}
            onApplyRoleDefaults={() =>
              setValue('permissions', getRoleDefaultPermissions(role, organizationId, labId), {
                shouldDirty: true,
              })
            }
            userType={userType}
          />
        )}
      />

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button variant="ghost" onPress={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isDisabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
