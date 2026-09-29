import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Button, Card as V3Card, InputGroup } from '@heroui/react';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FormField } from '../../components/ui/form-field';
import { toast } from 'sonner';
import { authService, useAuth, usePermissionAccess } from '../../features/auth';
import { AuthRequestError } from '../../features/auth/utils/authError';
import { settingsAdminRoles } from '../../config/access-control';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const SettingsChangePassword = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasRole } = usePermissionAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const canManagePasswordResets = settingsAdminRoles.some((role) => hasRole(role));

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsSubmitting(true);
    clearErrors();

    try {
      await authService.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully!');
      reset();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to change password. Please try again.';

      if (
        error instanceof AuthRequestError &&
        error.field !== 'root' &&
        ['currentPassword', 'newPassword', 'confirmPassword'].includes(error.field)
      ) {
        setError(error.field as keyof ChangePasswordFormData, {
          type: 'manual',
          message,
        });
      }

      setError('root', {
        type: 'manual',
        message,
      });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <V3Card className="border border-amber-200 bg-amber-50/80">
        <V3Card.Content className="p-5">
          <div className="space-y-2 text-sm text-amber-900">
            <p className="font-semibold">Existing passwords cannot be shown or prefilled.</p>
            <p>
              Passwords are stored securely as hashes. If you know your current password, change it below.
              If you do not know it, use the reset flow instead of trying to reveal the old password.
            </p>
          </div>
        </V3Card.Content>
      </V3Card>

      <V3Card className="border border-gray-200">
        <V3Card.Header className="pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <LockClosedIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500 mt-1">
                Use this when you know your current password and want to set a new one.
              </p>
            </div>
          </div>
        </V3Card.Header>
        <V3Card.Content className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              label="Current Password"
              required
              error={errors.currentPassword?.message}
              description="We verify this before allowing the password update."
            >
              <InputGroup variant="secondary">
              <InputGroup.Input
                {...register('currentPassword')}
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Enter current password"
              />
              <InputGroup.Suffix>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="focus:outline-none"
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </InputGroup.Suffix>
              </InputGroup>
            </FormField>

            <FormField
              label="New Password"
              required
              error={errors.newPassword?.message}
              description="Use at least 8 characters with uppercase, lowercase, and a number."
            >
              <InputGroup variant="secondary">
              <InputGroup.Input
                {...register('newPassword')}
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Enter new password"
              />
              <InputGroup.Suffix>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="focus:outline-none"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </InputGroup.Suffix>
              </InputGroup>
            </FormField>

            <FormField
              label="Confirm New Password"
              required
              error={errors.confirmPassword?.message}
            >
              <InputGroup variant="secondary">
              <InputGroup.Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
              />
              <InputGroup.Suffix>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </InputGroup.Suffix>
              </InputGroup>
            </FormField>

            {errors.root && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onPress={() => {
                  clearErrors();
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting}
              >
                Update Password
              </Button>
            </div>
          </form>
        </V3Card.Content>
      </V3Card>

      <V3Card className="border border-slate-200">
        <V3Card.Header className="pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Need a Reset Instead?</h2>
            <p className="mt-1 text-sm text-slate-500">
              If you do not know your current password, it cannot be revealed. Use a reset flow instead of trying to recover the existing password.
            </p>
          </div>
        </V3Card.Header>
        <V3Card.Content className="space-y-4 p-6 text-sm text-slate-600">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Recommended current flow</p>
            <p className="mt-1">
              Use forgot password for your own account, or ask an administrator to reset the password from the Users screen.
            </p>
            {user?.email ? (
              <p className="mt-2 text-xs text-slate-500">
                Signed-in account email: {user.email}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onPress={() => navigate('/forgot-password')}
            >
              Go to Forgot Password
            </Button>
            {canManagePasswordResets ? (
              <Button
                variant="ghost"
                onPress={() => navigate('/settings/users')}
              >
                Reset Another User
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onPress={() => {
                toast.message('Existing passwords cannot be shown. Use a reset flow to set a new one.');
              }}
            >
              How This Works
            </Button>
          </div>

          {canManagePasswordResets ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <p className="font-medium">Admin note</p>
              <p className="mt-1">
                Admin-driven resets for other users now use the dedicated protected password reset endpoint from the Users screen. Do not use the generic user update route for password changes.
              </p>
            </div>
          ) : null}
        </V3Card.Content>
      </V3Card>
    </div>
  );
};
