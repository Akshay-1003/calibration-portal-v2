import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Modal } from '@heroui/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import type { User } from '../../../features/auth/types/auth.types';
import { extractErrorMessage } from '../../../utils/extractErrorMessage';
import { extractApiFieldErrors, resolveApiFieldName } from '../../../utils/apiFieldErrors';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetUserPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface UserResetPasswordModalProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  onSubmit: (values: ResetUserPasswordFormValues) => Promise<void>;
  isLoading?: boolean;
}

const fieldAliases = {
  password: 'newPassword',
  'new password': 'newPassword',
  new_password: 'newPassword',
  'confirm password': 'confirmPassword',
  confirm_password: 'confirmPassword',
} as const;

export const UserResetPasswordModal = ({
  user,
  isOpen,
  onOpenChange,
  onClose,
  onSubmit,
  isLoading = false,
}: UserResetPasswordModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ResetUserPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
      clearErrors();
    }
  }, [clearErrors, isOpen, reset]);

  const handleClose = () => {
    reset();
    clearErrors();
    onClose();
  };

  const handleResetPassword = async (values: ResetUserPasswordFormValues) => {
    clearErrors();

    try {
      await onSubmit(values);
      toast.success('User password reset successfully!');
      handleClose();
    } catch (error) {
      const message = extractErrorMessage(error, 'Failed to reset user password');
      const entries = extractApiFieldErrors(error);

      for (const entry of entries) {
        const fieldName = resolveApiFieldName(entry, fieldAliases);
        if (!fieldName) {
          continue;
        }

        setError(fieldName, {
          type: 'manual',
          message: entry.message,
        });
      }

      setError('root', {
        type: 'manual',
        message,
      });
      toast.error(message);
    }
  };

  return (
    <Modal.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onOpenChange(); }}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Reset Password</Modal.Heading>
            </Modal.Header>
        <Modal.Body className="space-y-4 pb-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Existing passwords cannot be viewed. Resetting here will overwrite the current password for{' '}
            <span className="font-medium">{user?.username || user?.email || 'this user'}</span>.
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            New Password
            <Input {...register('newPassword')} className="w-full" placeholder="Enter new password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.newPassword)} />
            {errors.newPassword?.message ? <span className="font-normal text-red-600">{errors.newPassword.message}</span> : null}
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Confirm Password
            <Input {...register('confirmPassword')} className="w-full" placeholder="Confirm new password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirmPassword)} />
            {errors.confirmPassword?.message ? <span className="font-normal text-red-600">{errors.confirmPassword.message}</span> : null}
          </label>

          {errors.root ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.root.message}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onPress={handleClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onPress={() => void handleSubmit(handleResetPassword)()} isDisabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
};
