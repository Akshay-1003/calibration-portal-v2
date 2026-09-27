

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Input, Checkbox } from "@heroui/react";
import { useAuth } from "../hooks/useAuth";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useNavigation } from '../../../context/NavigationContext';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { AuthRequestError } from '../utils/authError';
// Form validation schema
const signInSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignInLocationState = { from?: { pathname?: string } };

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onForgotPassword?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSuccess,
  onSwitchToSignUp,
  onForgotPassword,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const toggleVisibility = () => setIsVisible(!isVisible);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, clearError } = useAuth();
  const { startLoading, stopLoading } = useNavigation();

  const from = (location.state as SignInLocationState | null)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: SignInFormData) => {
    clearError();
    clearErrors();
    startLoading(from);

    try {
      await login(data);
      toast.success('Welcome back!');
      onSuccess?.();
      navigate(from, { replace: true });
    } catch (error: unknown) {
      stopLoading();
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';

      if (error instanceof AuthRequestError && error.field !== 'root') {
        setError(error.field, {
          type: 'manual',
          message: error.message,
        });
      }

      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
       <div className="rounded-large bg-content1 shadow-small flex w-full max-w-md flex-col gap-4 px-8 pt-6 pb-10">
        <div className="mb-2">
          <BrandLogo
            className="h-16 w-auto mx-auto"
            width={256}
            height={64}
            priority
          />
          </div>
        <p className="pb-4 text-left text-3xl font-semibold">
          Log In
          
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
    
          <Input
            isRequired
            label="Email or Username"
            labelPlacement="outside"
            placeholder="Enter your email or username"
            type="text"
            variant="bordered"
            {...register('identifier')}
            isInvalid={!!errors.identifier}
            errorMessage={errors.identifier?.message}
            autoComplete="username"
          />
          <Input
            isRequired
            endContent={
              <button type="button" onClick={toggleVisibility} className="text-default-400">
                {isVisible ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            }
            label="Password"
            labelPlacement="outside"
            placeholder="Enter your password"
            type={isVisible ? "text" : "password"}
            variant="bordered"
            {...register('password')}
            isInvalid={!!errors.password}
            autoComplete="current-password"
            errorMessage={errors.password?.message}
          />
     {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox
                {...register('rememberMe')}
                size="sm"
              >
                Remember me
              </Checkbox>

              {onForgotPassword && (
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  onPress={onForgotPassword}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Forgot password?
                </Button>
              )}
            </div>
          {errors.root && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}
          <Button color="primary" type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting || isLoading ? 'Logging in…' : 'Log In'}
          </Button>
        </form>
        <p className="text-small text-center">
          {onSwitchToSignUp && (
            <Button
              type="button"
              variant="light"
              size="sm"
              onPress={onSwitchToSignUp}
              className="text-blue-500 hover:text-blue-600 p-0 h-auto"
            >
              Already have an account? Sign Up
            </Button>
          )}
        </p>
      </div>
    </div>
  );
};

export default SignInForm;
