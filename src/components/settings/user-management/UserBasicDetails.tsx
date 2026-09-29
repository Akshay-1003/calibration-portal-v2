import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Input, TextArea } from '@heroui/react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { ManagedUserFormValues } from './userManagementSchema';

interface UserBasicDetailsProps {
  register: UseFormRegister<ManagedUserFormValues>;
  errors: FieldErrors<ManagedUserFormValues>;
  mode: 'create' | 'edit';
  userType?: 'laboratory' | 'customer';
}

const FieldInput = ({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <Input {...props} className={`w-full ${props.className ?? ''}`} aria-invalid={Boolean(error)} />
    {error ? <span className="text-sm text-red-600">{error}</span> : null}
  </label>
);

const FieldTextArea = ({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <TextArea {...props} className={`w-full ${props.className ?? ''}`} rows={3} aria-invalid={Boolean(error)} />
    {error ? <span className="text-sm text-red-600">{error}</span> : null}
  </label>
);

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
      <FieldInput
        {...register('username')}
        label="Username"
        placeholder="Enter username"
        autoComplete="off"
        error={errors.username?.message}
      />
      <FieldInput
        {...register('email')}
        label="Email"
        placeholder="Enter email address"
        autoComplete="off"
        data-lpignore="true"
        error={errors.email?.message}
      />
      <FieldInput
        {...register('first_name')}
        label="First Name"
        placeholder="Enter first name"
        autoComplete="off"
        error={errors.first_name?.message}
      />
      <FieldInput
        {...register('last_name')}
        label="Last Name"
        placeholder="Enter last name"
        autoComplete="off"
        error={errors.last_name?.message}
      />
      {userType === 'laboratory' ? (
        <FieldInput
          {...register('department')}
          label="Department"
          placeholder="Enter department"
          autoComplete="off"
          error={errors.department?.message}
        />
      ) : null}
      {userType === 'laboratory' ? (
        <FieldTextArea
          {...register('sign_base64')}
          label="Signature"
          placeholder="Paste signature base64 string if applicable"
          error={errors.sign_base64?.message}
        />
      ) : null}
    </div>

    {mode === 'create' ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FieldInput
          {...register('password')}
          type="password"
          label="Password"
          placeholder="Enter password"
          autoComplete="new-password"
          data-lpignore="true"
          error={errors.password?.message}
        />
        <FieldInput
          {...register('confirmPassword')}
          type="password"
          label="Confirm Password"
          placeholder="Confirm password"
          autoComplete="new-password"
          data-lpignore="true"
          error={errors.confirmPassword?.message}
        />
      </div>
    ) : null}
  </div>
);
