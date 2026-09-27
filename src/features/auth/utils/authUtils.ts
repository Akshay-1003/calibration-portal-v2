/**
 * Authentication Utilities
 * Common utility functions for authentication
 */

import { z } from 'zod';

// Form validation schemas
export const authSchemas = {
  signIn: z.object({
    identifier: z.string().trim().min(1, 'Email or username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional().default(false),
  }),
  
  signUp: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),

  forgotPassword: z.object({
    email: z.email('Please enter a valid email address'),
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
  profile: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.email('Please enter a valid email address'),
    department: z.string().optional(),
  }),
};

// Type exports
export type SignInFormData = z.infer<typeof authSchemas.signIn>;
export type SignUpFormData = z.infer<typeof authSchemas.signUp>;
export type ForgotPasswordFormData = z.infer<typeof authSchemas.forgotPassword>;
export type ResetPasswordFormData = z.infer<typeof authSchemas.resetPassword>;
export type ProfileFormData = z.infer<typeof authSchemas.profile>;

// Common validation messages
export const authMessages = {
  INVALID_CREDENTIALS: 'Invalid email/username or password',
  ACCOUNT_EXISTS: 'An account with this email already exists',
  TOKEN_EXPIRED: 'Reset token has expired',
  TOKEN_INVALID: 'Invalid reset token',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  SUCCESS_SIGNIN: 'Welcome back!',
  SUCCESS_SIGNUP: 'Account created successfully!',
  SUCCESS_SIGNOUT: 'Signed out successfully',
  SUCCESS_PASSWORD_RESET: 'Password reset successfully',
  SUCCESS_PASSWORD_CHANGE: 'Password changed successfully',
};

// Password strength checker
export const checkPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} => {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }

  return {
    score,
    feedback,
    isStrong: score >= 4,
  };
};

// Email validation helper
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Token helpers
export const parseAuthToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error parsing auth token:', error);
    return null;
  }
};

// Local storage helpers
export const storageKeys = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  REMEMBER_ME: 'remember_me',
  LAST_ACTIVITY: 'last_activity',
} as const;

export const storage = {
  set: (key: string, value: any): void => {
    try {
      // Use sessionStorage for sensitive data (last_activity)
      if (key === storageKeys.LAST_ACTIVITY) {
        sessionStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },

  get: <T = any>(key: string): T | null => {
    try {
      // Try sessionStorage first for sensitive data
      let item;
      if (key === storageKeys.LAST_ACTIVITY) {
        item = sessionStorage.getItem(key);
      } else {
        item = localStorage.getItem(key);
        // Fallback to sessionStorage for backwards compatibility
        if (!item) {
          item = sessionStorage.getItem(key);
        }
      }
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },

  clear: (): void => {
    try {
      Object.values(storageKeys).forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

// Session management
export const session = {
  isValid: (): boolean => {
    const token = storage.get(storageKeys.AUTH_TOKEN);
    const lastActivity = storage.get(storageKeys.LAST_ACTIVITY);
    
    if (!token || !lastActivity) {
      return false;
    }

    // Check if session is older than 24 hours
    const sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in ms
    const now = Date.now();
    
    return (now - lastActivity) < sessionTimeout;
  },

  updateActivity: (): void => {
    storage.set(storageKeys.LAST_ACTIVITY, Date.now());
  },

  clear: (): void => {
    storage.clear();
  },
};

// Route protection helpers
export const authUtils = {
  isAuthenticated: (): boolean => {
    return session.isValid();
  },

  hasRole: (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = {
      'admin': 3,
      'manager': 2,
      'user': 1,
      'guest': 0,
    };
    
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  },

  hasPermission: (userPermissions: string[], requiredPermission: string): boolean => {
    return userPermissions.includes(requiredPermission);
  },

  redirectToLogin: (returnUrl?: string): void => {
    const currentPath = window.location.pathname;
    const redirectUrl = returnUrl || currentPath;
    window.location.href = `/signin?returnUrl=${encodeURIComponent(redirectUrl)}`;
  },

  redirectToDashboard: (): void => {
    window.location.href = '/dashboard';
  },
};
