import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Label, ListBox, Select } from '@heroui/react';
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
                className="w-full"
                placeholder="Select organization"
                selectedKey={field.value || null}
                onSelectionChange={(key) => field.onChange(key ?? '')}
                isInvalid={Boolean(errors.organization_id)}
              >
                <Label>Organization</Label>
                <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {organizationOptions.map((organization) => (
                      <ListBox.Item key={organization.id} id={organization.id} textValue={organization.name}>
                        {organization.name}<ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
                {errors.organization_id?.message && <p className="text-xs text-danger">{errors.organization_id.message}</p>}
              </Select>
            )}
          />
        ) : null}
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select
              className="w-full"
              placeholder="Select role"
              selectedKey={field.value || null}
              onSelectionChange={(key) => field.onChange(key ?? '')}
              isInvalid={Boolean(errors.role)}
            >
              <Label>Role</Label>
              <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {roleOptions.map((role) => (
                    <ListBox.Item key={role.key} id={role.key} textValue={role.label}>
                      {role.label}<ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              {roleOptions.find((option) => option.key === field.value)?.description && (
                <p className="text-xs text-default-500">{roleOptions.find((option) => option.key === field.value)?.description}</p>
              )}
              {errors.role?.message && <p className="text-xs text-danger">{errors.role.message}</p>}
            </Select>
          )}
        />

        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select
              className="w-full"
              placeholder="Select status"
              selectedKey={field.value || null}
              onSelectionChange={(key) => field.onChange(key ?? 'active')}
              isInvalid={Boolean(errors.status)}
            >
              <Label>User Status</Label>
              <Select.Trigger className="w-full"><Select.Value /><Select.Indicator /></Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {userStatusOptions.map((status) => (
                    <ListBox.Item key={status.key} id={status.key} textValue={status.label}>
                      {status.label}<ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              {errors.status?.message && <p className="text-xs text-danger">{errors.status.message}</p>}
            </Select>
          )}
        />
      </div>
    </div>
  );
};
