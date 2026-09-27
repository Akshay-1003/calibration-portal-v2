/**
 * Forgot Password Page
 * Wrapper for ForgotPasswordForm
 */

import AuthLayout from './AuthPageLayout';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}





