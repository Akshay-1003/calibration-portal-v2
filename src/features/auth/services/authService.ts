
import { axiosClient } from '../../../core/api/axiosClient';
import { API_ENDPOINTS } from '../../../config/api';
import type { AxiosRequestConfig } from 'axios';
import { getCurrentAccessToken } from '../utils/authTokenAccessor';
import {
  isUsableCalibrationAccessToken,
  parseCalibrationAccessTokenResponse,
} from '../utils/calibrationToken';
import { normalizePermissionScope } from '../utils/permissionHelpers';
import { AuthRequestError, parseAuthError } from '../utils/authError';
import type {
  LoginCredentials,
  SignUpData,
  AccessTokenResponse,
  AuthResponse,
  User,
} from '../types';

type AuthTokenResponse = AccessTokenResponse;

type RefreshSafeRequestConfig = AxiosRequestConfig & {
  _skipRefresh?: boolean;
};

class AuthService {
  private normalizeNullableId(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim();

    if (
      !normalizedValue ||
      normalizedValue === '-' ||
      normalizedValue.toLowerCase() === 'none' ||
      normalizedValue.toLowerCase() === 'null' ||
      normalizedValue.toLowerCase() === 'undefined'
    ) {
      return null;
    }

    return normalizedValue;
  }

  private normalizeUser(user: User): User {
    const organizationName =
      typeof user.organization_name === 'string' && user.organization_name.trim()
        ? user.organization_name.trim()
        : user.organization?.name ?? null;
    const organizationType =
      typeof user.organization_type === 'string' && user.organization_type.trim()
        ? user.organization_type.trim()
        : user.organization?.org_type ?? null;

    return {
      ...user,
      organization_id: this.normalizeNullableId(user.organization_id),
      organization_name: organizationName,
      organization_type: organizationType,
      organization: user.organization ?? null,
      lab_id: this.normalizeNullableId(user.lab_id),
      department: user.department ?? null,
      avatar: user.avatar ?? null,
      signature_url: user.signature_url ?? user.signature ?? null,
      permissions: normalizePermissionScope(user.permissions),
    };
  }

  /**
   * Login with email/username and password
   * Backend sets refresh token in HttpOnly cookie
   */
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    try {
      const response = await axiosClient.post<AuthTokenResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          identifier: credentials.identifier,
          password: credentials.password,
        },
        {
          withCredentials: true, // Important: enables HttpOnly cookie support
        }
      );
      
      return parseCalibrationAccessTokenResponse(response);
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Login failed'));
    }
  }

  /**
   * Sign up new user
   * Backend sets refresh token in HttpOnly cookie
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.SIGNUP,
        data,
        {
          withCredentials: true, // Important: enables HttpOnly cookie support
        }
      );
      
      // Ensure response matches expected format
      if ( !response.access_token) {
        throw new Error('Invalid response format from server');
      }
      
      // Backend sets refresh token in HttpOnly cookie automatically
      if (!response.user) {
        throw new Error('Invalid response format from server');
      }

      return {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        user: this.normalizeUser(response.user),
      };
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Sign up failed'));
    }
  }

  /**
   * Logout user
   * Revokes token and clears HttpOnly cookie on backend
   */
  async logout(): Promise<void> {
    try {
      const rawToken = getCurrentAccessToken();
      const token = isUsableCalibrationAccessToken(rawToken) ? rawToken : null;

      const config: RefreshSafeRequestConfig = {
        withCredentials: true, // Important: send cookies with request
        _skipRefresh: true,
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      };
      await axiosClient.post(API_ENDPOINTS.AUTH.LOGOUT, {}, config);
    } catch (error: unknown) {
      // Continue with logout even if API call fails
      // This ensures user is logged out locally even if backend call fails
      console.error('Logout API call failed:', error);
    }
  }

  /**
   * Refresh access token using HttpOnly cookie
   * Backend reads refresh token from HttpOnly cookie automatically
   * Browser sends cookie automatically with withCredentials: true
   */
  async refreshToken(): Promise<AuthTokenResponse> {
    try {
      const response = await axiosClient.post<AuthTokenResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        {},
        {
          withCredentials: true, // Important: enables HttpOnly cookie support
        }
      );

      return parseCalibrationAccessTokenResponse(response);
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Token refresh failed'));
    }
  }

  /**
   * Get current user profile
   * Uses access token to fetch user data from backend
   */
  async getMe(): Promise<{ user: User }> {
    try {
      const response = await axiosClient.get<User>(
        API_ENDPOINTS.AUTH.ME || '/auth/me',
        {
          withCredentials: true, // Important: enables HttpOnly cookie support
        }
      );
      
      // Ensure response matches expected format
      if (!response) {
        throw new Error('Invalid user response format from server');
      }
      
      return { user: this.normalizeUser(response) };
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Failed to fetch user profile'));
    }
  }

  /**
   * Enter one laboratory as a platform super-admin. The backend returns a
   * short-lived, audited laboratory-context access token.
   */
  async enterLaboratoryContext(organizationId: string): Promise<AuthTokenResponse> {
    try {
      const response = await axiosClient.post<AuthTokenResponse>(
        API_ENDPOINTS.AUTH.LABORATORY_CONTEXT,
        { organization_id: organizationId },
        { withCredentials: true },
      );

      return parseCalibrationAccessTokenResponse(response);
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Unable to enter laboratory context'));
    }
  }

  /**
   * Validate JWT token
   * @deprecated Use refreshToken() instead. This method is kept for backward compatibility only.
   * We use /auth/refresh as single source of truth on app initialization.
   */
  async validateToken(): Promise<User> {
    // Deprecated - we use refreshToken() instead
    // This method is kept for backward compatibility but should not be used
    throw new Error('validateToken is deprecated. Use refreshToken() instead.');
  }

  /**
   * Login with Google OAuth
   * Backend sets refresh token in HttpOnly cookie
   */
  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    try {
      const response = await axiosClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.GOOGLE,
        { credential },
        {
          withCredentials: true, // Important: enables HttpOnly cookie support
        }
      );
      
      // Ensure response matches expected format
      if (!response.access_token) {
        throw new Error('Invalid response format from server');
      }
      
      return {
        ...response,
        user: response.user ? this.normalizeUser(response.user) : response.user,
      };
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Google login failed'));
    }
  }

  /**
   * Request password reset
   * Sends a password reset link to the user's email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await axiosClient.post(
        API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email },
        {
          withCredentials: true,
        }
      );
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Failed to process password reset request'));
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await axiosClient.post(
        API_ENDPOINTS.AUTH.RESET_PASSWORD,
        { 
          token,
          new_password: newPassword 
        },
        {
          withCredentials: true,
        }
      );
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Failed to reset password'));
    }
  }

  /**
   * Verify email using verification code
   */
  async verifyEmail(code: string): Promise<void> {
    try {
      await axiosClient.post(
        API_ENDPOINTS.AUTH.VERIFY_EMAIL,
        { code },
        {
          withCredentials: true,
        }
      );
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Failed to verify email'));
    }
  }

  /**
   * Resend email verification code
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await axiosClient.post(
        API_ENDPOINTS.AUTH.RESEND_VERIFICATION,
        { email },
        {
          withCredentials: true,
        }
      );
    } catch (error: unknown) {
      throw new AuthRequestError(parseAuthError(error, 'Failed to resend verification email'));
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await axiosClient.post(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          withCredentials: true,
        }
      );
    } catch (error: unknown) {
      throw new AuthRequestError(
        parseAuthError(error, 'Failed to change password', {
          'current password': 'currentPassword',
          current_password: 'currentPassword',
          'new password': 'newPassword',
          new_password: 'newPassword',
          'confirm password': 'confirmPassword',
          confirm_password: 'confirmPassword',
          password: 'currentPassword',
        })
      );
    }
  }
}

export const authService = new AuthService();
