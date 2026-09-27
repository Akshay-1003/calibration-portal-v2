import { Input, Textarea } from '@heroui-v2/react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ManagedUserFormValues } from './userManagementSchema';

interface UserBasicDetailsProps {
  register: UseFormRegister<ManagedUserFormValues>;
  errors: FieldErrors<ManagedUserFormValues>;
  mode: 'create' | 'edit';
  userType?: 'laboratory' | 'customer';
}

export const UserBasicDetails = ({
  register,
  errors,
  mode,
  userType = 'laboratory',
}: UserBasicDetailsProps) => (
  <div className="space-y-5">
    <div>
      <h3 className="text-lg font-semibold text-slate-900">Basic Details</h3>
      <p className="text-sm text-slate-500">
        {mode === 'create'
          ? 'Enter the new user details. Fields stay blank until the form is submitted.'
          : 'Update the user details here. Password resets happen through the dedicated reset password action.'}
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        {...register('username')}
        label="Username"
        labelPlacement="outside"
        placeholder="Enter username"
        autoComplete="off"
        isInvalid={Boolean(errors.username)}
        errorMessage={errors.username?.message}
      />
      <Input
        {...register('email')}
        label="Email"
        labelPlacement="outside"
        placeholder="Enter email address"
        autoComplete="off"
        data-lpignore="true"
        isInvalid={Boolean(errors.email)}
        errorMessage={errors.email?.message}
      />
      <Input
        {...register('first_name')}
        label="First Name"
        labelPlacement="outside"
        placeholder="Enter first name"
        autoComplete="off"
        isInvalid={Boolean(errors.first_name)}
        errorMessage={errors.first_name?.message}
      />
      <Input
        {...register('last_name')}
        label="Last Name"
        labelPlacement="outside"
        placeholder="Enter last name"
        autoComplete="off"
        isInvalid={Boolean(errors.last_name)}
        errorMessage={errors.last_name?.message}
      />
      {userType === 'laboratory' ? (
        <Input
          {...register('department')}
          label="Department"
          labelPlacement="outside"
          placeholder="Enter department"
          autoComplete="off"
          isInvalid={Boolean(errors.department)}
          errorMessage={errors.department?.message}
        />
      ) : null}
      {userType === 'laboratory' ? (
        <Textarea
          {...register('sign_base64')}
          label="Signature"
          labelPlacement="outside"
          placeholder="Paste signature base64 string if applicable"
          minRows={3}
          isInvalid={Boolean(errors.sign_base64)}
          errorMessage={errors.sign_base64?.message}
        />
      ) : null}
    </div>

    {mode === 'create' ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          {...register('password')}
          type="password"
          label="Password"
          labelPlacement="outside"
          placeholder="Enter password"
          autoComplete="new-password"
          data-lpignore="true"
          isInvalid={Boolean(errors.password)}
          errorMessage={errors.password?.message}
        />
        <Input
          {...register('confirmPassword')}
          type="password"
          label="Confirm Password"
          labelPlacement="outside"
          placeholder="Confirm password"
          autoComplete="new-password"
          data-lpignore="true"
          isInvalid={Boolean(errors.confirmPassword)}
          errorMessage={errors.confirmPassword?.message}
        />
      </div>
    ) : null}
  </div>
);
