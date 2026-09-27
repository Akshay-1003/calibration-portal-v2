import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Select, SelectItem } from '@heroui-v2/react';
import { userRoleOptions, userStatusOptions, customerRoleOptions } from './permissionConfig';
import type { ManagedUserFormValues } from './userManagementSchema';

interface UserRoleSelectorProps {
  control: Control<ManagedUserFormValues>;
  errors: FieldErrors<ManagedUserFormValues>;
  userType?: 'laboratory' | 'customer';
  organizationOptions?: Array<{ id: string; name: string }>;
}

export const UserRoleSelector = ({
  control,
  errors,
  userType = 'laboratory',
  organizationOptions = [],
}: UserRoleSelectorProps) => {
  const roleOptions = userType === 'customer' ? customerRoleOptions : userRoleOptions;
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          {userType === 'customer' ? 'Organization Role' : 'Laboratory Role'}
        </h3>
        <p className="text-sm text-slate-500">
          {userType === 'customer'
            ? 'Assign customer portal access within the selected organization.'
            : 'New staff are assigned to your active laboratory. Choose their role and current status.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {organizationOptions.length > 0 ? (
          <Controller
            control={control}
            name="organization_id"
            render={({ field }) => (
              <Select
                label="Organization"
                labelPlacement="outside"
                placeholder="Select organization"
                selectedKeys={field.value ? [field.value] : []}
                onSelectionChange={(keys) => field.onChange((Array.from(keys)[0] as string) ?? '')}
                isInvalid={Boolean(errors.organization_id)}
                errorMessage={errors.organization_id?.message}
              >
                {organizationOptions.map((organization) => (
                  <SelectItem key={organization.id} textValue={organization.name}>
                    {organization.name}
                  </SelectItem>
                ))}
              </Select>
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              label="Role"
              labelPlacement="outside"
              placeholder="Select role"
              selectedKeys={field.value ? [field.value] : []}
              onSelectionChange={(keys) => field.onChange((Array.from(keys)[0] as string) ?? '')}
              isInvalid={Boolean(errors.role)}
              errorMessage={errors.role?.message}
                description={roleOptions.find((option) => option.key === field.value)?.description}
              >
              {roleOptions.map((role) => (
                <SelectItem key={role.key} textValue={role.label}>
                  {role.label}
                </SelectItem>
              ))}
            </Select>
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              label="User Status"
              labelPlacement="outside"
              placeholder="Select status"
              selectedKeys={field.value ? [field.value] : []}
              onSelectionChange={(keys) => field.onChange((Array.from(keys)[0] as string) ?? 'active')}
              isInvalid={Boolean(errors.status)}
              errorMessage={errors.status?.message}
            >
              {userStatusOptions.map((status) => (
                <SelectItem key={status.key} textValue={status.label}>
                  {status.label}
                </SelectItem>
              ))}
            </Select>
          )}
        />
      </div>
    </div>
  );
};
