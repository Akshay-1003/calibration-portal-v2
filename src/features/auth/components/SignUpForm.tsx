import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button, Input, InputGroup, Checkbox, Link } from "@heroui/react";
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
    watch,
    setValue,
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
      
      <div className="rounded-md bg-content1 shadow-sm flex min-w-0 w-full max-w-full flex-col gap-4 px-8 pt-6 pb-10">
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
            required
            aria-label="Username"
            className="w-full min-w-0"
            placeholder="Enter your username"
            type="text"
            {...register('username')}
            aria-invalid={!!errors.username}
          />
          <Input
            required
            aria-label="First Name"
            placeholder="Enter your first name"
            type="text"
            variant="secondary"
            className="w-full min-w-0"
            {...register('first_name')}
            aria-invalid={!!errors.first_name}
          />
          <Input
            required
            aria-label="Last Name"
            placeholder="Enter your last name"
            type="text"
            variant="secondary"
            className="w-full min-w-0"
            {...register('last_name')}
            aria-invalid={!!errors.last_name}
          />
          <Input
            required
            aria-label="Email"
            placeholder="Enter your email"
            type="email"
            variant="secondary"
            className="w-full min-w-0"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          <InputGroup className="w-full" variant="secondary">
          <InputGroup.Input
            required
            aria-label="Password"
            placeholder="Enter your password"
            type={isVisible ? "text" : "password"}
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          <InputGroup.Suffix>
            <button type="button" onClick={toggleVisibility} className="text-default-400">
              {isVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </InputGroup.Suffix>
          </InputGroup>
          <InputGroup className="w-full" variant="secondary">
          <InputGroup.Input
            required
            aria-label="Confirm Password"
            placeholder="Confirm your password"
            type={isConfirmVisible ? "text" : "password"}
            {...register('confirmPassword')}
            aria-invalid={!!errors.confirmPassword}
          />
          <InputGroup.Suffix>
            <button type="button" onClick={toggleConfirmVisibility} className="text-default-400">
              {isConfirmVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </InputGroup.Suffix>
          </InputGroup>
          <Checkbox
            isRequired
            className="w-full py-4"
            isSelected={watch('agreeToTerms')}
            onChange={(isSelected) => setValue('agreeToTerms', isSelected, { shouldValidate: true })}
            render={(props) => <div {...props} />}
          >
            <Checkbox.Content className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span>I agree with</span>
              <Link className="relative z-1 text-sm" href="#">Terms</Link>
              <span>and</span>
              <Link className="relative z-1 text-sm" href="#">Privacy Policy</Link>
            </Checkbox.Content>
          </Checkbox>
          {errors.root && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errors.root.message}
            </div>
          )}
          <Button variant="primary" type="submit" isDisabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <p className="text-small text-center">
          {onSwitchToSignIn && (
            <Button
              type="button"
              variant="ghost"
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
