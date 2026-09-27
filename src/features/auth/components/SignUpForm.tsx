import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button, Input, Checkbox, Link } from "@heroui/react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { BrandLogo } from '../../../components/common/BrandLogo';

// Form validation schema
const signUpSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and privacy policy'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSuccess,
  onSwitchToSignIn,
}) => {
  void onSuccess;
  const [isVisible, setIsVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toggleVisibility = () => setIsVisible(!isVisible);
  const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema) as any,
    mode: 'onChange',
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsSubmitting(true);
    try {
      console.log('🔐 Sign up attempt:', data.email);
      // TODO: Implement sign up API call
      toast.success('Account created successfully!');
      // TODO: Redirect to sign in or dashboard
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      toast.error(error?.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex h-full w-full items-center justify-center"
    >
      
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
          Sign Up
         
        </p>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            isRequired
            label="Username"
            labelPlacement="outside"
            placeholder="Enter your username"
            type="text"
            variant="bordered"
            {...register('username')}
            isInvalid={!!errors.username}
            errorMessage={errors.username?.message}
          />
          <Input
            isRequired
            label="First Name"
            labelPlacement="outside"
            placeholder="Enter your first name"
            type="text"
            variant="bordered"
            {...register('first_name')}
            isInvalid={!!errors.first_name}
            errorMessage={errors.first_name?.message}
          />
          <Input
            isRequired
            label="Last Name"
            labelPlacement="outside"
            placeholder="Enter your last name"
            type="text"
            variant="bordered"
            {...register('last_name')}
            isInvalid={!!errors.last_name}
            errorMessage={errors.last_name?.message}
          />
          <Input
            isRequired
            label="Email"
            labelPlacement="outside"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
            {...register('email')}
            isInvalid={!!errors.email}
            errorMessage={errors.email?.message}
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
            errorMessage={errors.password?.message}
          />
          <Input
            isRequired
            endContent={
              <button type="button" onClick={toggleConfirmVisibility} className="text-default-400">
                {isConfirmVisible ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            }
            label="Confirm Password"
            labelPlacement="outside"
            placeholder="Confirm your password"
            type={isConfirmVisible ? "text" : "password"}
            variant="bordered"
            {...register('confirmPassword')}
            isInvalid={!!errors.confirmPassword}
            errorMessage={errors.confirmPassword?.message}
          />
          <Checkbox isRequired className="py-4" size="sm" {...register('agreeToTerms')}>
            I agree with&nbsp;
            <Link className="relative z-1" href="#" size="sm">
              Terms
            </Link>
            &nbsp; and&nbsp;
            <Link className="relative z-1" href="#" size="sm">
              Privacy Policy
            </Link>
          </Checkbox>
          {errors.root && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}
          <Button color="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <p className="text-small text-center">
          {onSwitchToSignIn && (
            <Button
              type="button"
              variant="light"
              size="sm"
              onPress={onSwitchToSignIn}
              className="text-blue-500 hover:text-blue-600 p-0 h-auto"
            >
              Already have an account? Sign In
            </Button>
          )}
        </p>
      </div>
    </motion.div>
  );
}
