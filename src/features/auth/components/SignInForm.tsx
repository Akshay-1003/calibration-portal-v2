import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button, Checkbox, Input, Label } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../../../context/NavigationContext';
import { BrandLogo } from '../../../components/common/BrandLogo';
import { AuthRequestError } from '../utils/authError';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, clearError } = useAuth();
  const { startLoading, stopLoading } = useNavigation();
  const from = (location.state as SignInLocationState | null)?.from?.pathname || '/dashboard';

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<z.input<typeof signInSchema>, unknown, z.output<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
    defaultValues: {
      identifier: '',
      password: '',
      rememberMe: false,
    },
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
        setError(error.field as 'identifier' | 'password', {
          type: 'manual',
          message: error.message,
        });
      }

      setError('root', { type: 'manual', message: errorMessage });
      toast.error(errorMessage);
    }
  };

  const formIsBusy = isSubmitting || isLoading;

  return (
    <div className="mx-auto min-w-0 w-full max-w-full bg-whi">
      <div className="flex min-w-0 w-full max-w-full flex-col gap-6 rounded-md bg-content1 pb-10 pt-6 shadow-sm bg-white dark:bg-content1 sm:px-10 md:px-12 lg:px-6 xl:px-8">
        <div className="mb-2">
          <BrandLogo className="mx-auto h-16 w-auto" width={256} height={64} priority />
        </div>

        <h1 className="pb-2 text-left text-3xl font-semibold">Log In</h1>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-in-identifier" isRequired>
              Email or Username
            </Label>
            <Input
              id="sign-in-identifier"
              type="text"
              variant="secondary"
              className="w-full min-w-0 max-w-full"
              placeholder="Enter your email or username"
              autoComplete="username"
              aria-invalid={Boolean(errors.identifier)}
              {...register('identifier')}
            />
            {errors.identifier?.message && (
              <p className="text-sm text-danger">{errors.identifier.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-in-password" isRequired>
              Password
            </Label>
            <div className="relative">
              <Input
                id="sign-in-password"
                type={isVisible ? 'text' : 'password'}
                variant="secondary"
                className="w-full min-w-0 max-w-full pr-12"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                isIconOnly
                size="sm"
                aria-label={isVisible ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onPress={() => setIsVisible((visible) => !visible)}
              >
                {isVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </Button>
            </div>
            {errors.password?.message && (
              <p className="text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <Checkbox
                  name={field.name}
                  isSelected={Boolean(field.value)}
                  onChange={field.onChange}
                  render={(props) => <div {...props} />}
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    Remember me
                  </Checkbox.Content>
                </Checkbox>
              )}
            />

            {onForgotPassword && (
              <Button type="button" variant="ghost" size="sm" onPress={onForgotPassword}>
                Forgot password?
              </Button>
            )}
          </div>

          {errors.root?.message && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {errors.root.message}
            </div>
          )}

          <Button variant="primary" type="submit" isDisabled={formIsBusy} fullWidth>
            {formIsBusy ? 'Logging in...' : 'Log In'}
          </Button>
        </form>

        {onSwitchToSignUp && (
          <div className="text-center">
            <Button type="button" variant="ghost" size="sm" onPress={onSwitchToSignUp}>
              Already have an account? Sign Up
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignInForm;
