/**
 * Authentication Types
 * Centralized type definitions for authentication feature
 */

export type PermissionAction = 'view' | 'edit';

export type PermissionModule =
  | 'inward'
  | 'outward'
  | 'invoice'
  | 'user'
  | 'gauge_master'
  | 'equipment'
  | 'scope'
  | 'format_number'
  | 'other_masters'
  | 'customer_dashboard'
  | 'customer_calibration'
  | 'customer_gauge_life_prediction'
  | 'customer_transactions'
  | 'customer_gauge_management'
  | 'customer_reports'
  | 'customer_notifications'
  | 'customer_settings';

export interface PermissionCheck {
  module: PermissionModule;
  action: PermissionAction;
}

export type PermissionModuleMap = Partial<Record<PermissionModule, PermissionAction[]>>;

export interface UserPermissionScope {
  permissions: PermissionModuleMap;
  scope?: string | null;
  organization_id?: string | null;
  lab_id?: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_id: string | null;
  organization_name?: string | null;
  organization_type?: 'customer' | 'laboratory' | string | null;
  organization?: {
    id: string;
    name: string;
    org_type?: 'customer' | 'laboratory' | string | null;
    lab_type?: string | null;
    lab_certificate_number?: string | null;
    is_active?: boolean | null;
  } | null;
  lab_id: string | null;
  role:
    | 'super_admin'
    | 'superadmin'
    | 'org_admin'
    | 'org_manager'
    | 'org_user'
    | 'org_viewer'
    | 'lab_admin'
    | 'lab_manager'
    | 'lab_viewer'
    | 'lab_engineer';
  department: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  avatar?: string | null;
  signature_url?: string | null;
  signature?: string | null;
  permissions?: UserPermissionScope | null;
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignUpData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  confirmPassword: string;
  organization_id?: string;
  lab_id?: string;
  role?: string;
  department?: string;
  acceptTerms: boolean;
}

export interface AccessTokenResponse {
  access_token: string; // Access token (short-lived, stored in memory)
  refresh_token?: string; // Cookie-only in production; accepted only for legacy compatibility
  token_type?: 'bearer';
  portal?: 'calibration';
  expires_in?: number;
}

export interface AuthResponse extends AccessTokenResponse {
  user: User;
  expiresIn?: number;
}

export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
  
  // Google Auth
  loginWithGoogle: (credential: string) => Promise<void>;
}

export interface AuthService {
  login: (credentials: LoginCredentials) => Promise<AccessTokenResponse>;
  signUp: (data: SignUpData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<AccessTokenResponse>; // No params - reads from HttpOnly cookie
  validateToken: (token: string) => Promise<User>; // @deprecated
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
} 

export interface TokenPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  permissions: string[] | UserPermissionScope;
  iat: number;
  exp: number;
}
