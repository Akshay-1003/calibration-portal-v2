/**
 * Forgot Password Form Component
 * Allows users to request a password reset link
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router';
import { Input, Button } from '@heroui/react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../../lib/validations/schemas';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { authService } from '../services/authService';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });
  void setError;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await authService.forgotPassword(data.email);
      setIsSubmitted(true);
      toast.success('Password reset instructions sent to your email');
      onSuccess?.();
    } catch (error: any) {
      // Don't reveal if email exists or not for security
      setIsSubmitted(true);
      toast.success('If an account exists with this email, password reset instructions have been sent');
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            We've sent password reset instructions to your email address.
            Please check your inbox and follow the link to reset your password.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium underline"
            >
              try again
            </button>
          </p>
          <Link
            to="/signin"
            className="inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            ← Back to Sign In
          </Link>
        </div>
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
          Forgot Password?
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          No worries, we'll send you reset instructions
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <Input
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          {...register('email')}
          isInvalid={!!errors.email}
          errorMessage={errors.email?.message}
          autoComplete="email"
          autoFocus
          variant="bordered"
          classNames={{
            input: 'text-gray-900 dark:text-gray-100',
            label: 'text-gray-700 dark:text-gray-300',
          }}
        />

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
          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          size="lg"
        >
          {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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

