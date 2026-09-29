/**
 * Reset Password Form Component
 * Allows users to reset their password using a token
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button, InputGroup, Label } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../../lib/validations/schemas';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';

export const ResetPasswordForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[@$!%*?&_#-]/.test(pwd)) strength++;

    const levels = [
      { strength: 1, label: 'Very Weak', color: 'bg-red-500' },
      { strength: 2, label: 'Weak', color: 'bg-orange-500' },
      { strength: 3, label: 'Fair', color: 'bg-yellow-500' },
      { strength: 4, label: 'Good', color: 'bg-blue-500' },
      { strength: 5, label: 'Strong', color: 'bg-green-500' },
    ];

    return levels[Math.min(strength - 1, 4)] || levels[0];
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('root', {
        type: 'manual',
        message: 'Invalid or missing reset token',
      });
      return;
    }

    try {
      await authService.resetPassword(token, data.password);
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/signin', { replace: true });
      }, 2000);
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Failed to reset password. The link may have expired.',
      });
      toast.error(error.message || 'Failed to reset password');
    }
  };

  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
        >
          Request a new reset link
        </Link>
      </motion.div>
    );
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full text-center"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Password Reset Successfully!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to sign in...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your new password below
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Password Field with Strength Indicator */}
        <div className="space-y-2">
          <Label htmlFor="reset-password">New Password</Label>
          <InputGroup variant="secondary">
          <InputGroup.Input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            {...register('password')}
            autoComplete="new-password"
            autoFocus
          />
          <InputGroup.Suffix>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
          </InputGroup.Suffix>
          </InputGroup>
          {errors.password?.message && <p className="text-xs text-danger">{errors.password.message}</p>}

          {/* Password Strength Indicator */}
          {password && password.length > 0 && passwordStrength && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${passwordStrength.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className={`text-xs font-medium ${passwordStrength.color.replace('bg-', 'text-')}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use 8+ characters with uppercase, lowercase, numbers & special characters
              </p>
            </motion.div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1">
        <Label htmlFor="reset-confirm-password">Confirm Password</Label>
        <InputGroup variant="secondary">
        <InputGroup.Input
          id="reset-confirm-password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Re-enter your password"
          {...register('confirmPassword')}
          autoComplete="new-password"
        />
        <InputGroup.Suffix>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="focus:outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
        </InputGroup.Suffix>
        </InputGroup>
        {errors.confirmPassword?.message && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
        </div>

        {/* Error Message */}
        {errors.root && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
          >
            {errors.root.message}
          </motion.div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
            className="w-full h-10 rounded-md text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          isDisabled={isSubmitting}
          size="lg"
        >
          {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
        </Button>
      </form>

      {/* Back to Sign In */}
      <div className="mt-6 text-center">
        <Link
          to="/signin"
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          ← Back to Sign In
        </Link>
      </div>
    </motion.div>
  );
};
