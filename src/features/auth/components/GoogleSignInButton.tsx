/**
 * Google Sign-In Button Component
 * Handles Google OAuth authentication
 */

import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../hooks';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError
}) => {
  const { loginWithGoogle, isLoading: _isLoading } = useAuth();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      onError?.('No credential received from Google');
      return;
    }

    try {
      await loginWithGoogle(credentialResponse.credential);
      onSuccess?.();
    } catch (error: any) {
      onError?.(error.message || 'Google sign-in failed');
    }
  };

  const handleError = () => {
    onError?.('Google sign-in failed');
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        width="100%"
        text="signin_with"
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  );
};
