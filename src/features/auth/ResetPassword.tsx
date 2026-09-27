/**
 * Reset Password Page
 * Wrapper for ResetPasswordForm
 */

import AuthLayout from './AuthPageLayout';
import { ResetPasswordForm } from './components/ResetPasswordForm';

export default function ResetPassword() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}





