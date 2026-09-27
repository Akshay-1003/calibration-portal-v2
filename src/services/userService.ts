/**
 * User Service
 * Handles all user-related API calls
 */

import { axiosClient } from '../core/api/axiosClient';
import { API_ENDPOINTS } from '../config/api';
import type {
  PermissionAction,
  PermissionModule,
  User,
  UserPermissionScope,
} from '../features/auth/types/auth.types';
import { normalizePermissionScope } from '../features/auth/utils/permissionHelpers';

export interface CreateUserData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  organization_id: string | null;
  lab_id: string | null;
  role: string;
  department: string | null;
  archived?: boolean;
  sign_base64?: string | null;
  permissions?: UserPermissionScope | null;
}

export interface UpdateUserData {
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  organization_id?: string | null;
  lab_id?: string | null;
  role?: string;
  department?: string | null;
  archived?: boolean;
  sign_base64?: string | null;
  permissions?: UserPermissionScope | null;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  avatar?: string;
}

export type UpdateUserPermissionsData = UserPermissionScope;

export interface UpdateEntityPermissionData {
  actions: PermissionAction[];
  entity: PermissionModule;
}

export interface ResetUserPasswordData {
  newPassword: string;
  confirmPassword: string;
}

export interface UserResponse extends User {
  firstName: string;
  lastName: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface SignatureUploadResponse {
  signature_url?: string;
  signature?: string;
  message?: string;
  user?: User;
}

type ApiEnvelope<T> = {
  data?: T;
  users?: T;
  items?: T;
  total?: number;
  total_count?: number;
  page?: number;
  limit?: number;
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  message?: string;
  status?: string;
  success?: boolean;
};

class UserService {
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

  private unwrapPayload<T>(response: unknown): T {
    const responseRecord =
      response && typeof response === 'object' ? (response as Record<string, unknown>) : null;
    const payload = responseRecord && 'data' in responseRecord ? responseRecord.data : response;

    if (
      payload &&
      typeof payload === 'object' &&
      'data' in (payload as Record<string, unknown>) &&
      (payload as ApiEnvelope<T>).data !== undefined
    ) {
      return (payload as ApiEnvelope<T>).data as T;
    }

    return payload as T;
  }

  private extractPermissionScope(response: unknown): UserPermissionScope {
    const payload = this.unwrapPayload<unknown>(response);

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const nestedPermissions = record.permissions;
      const looksLikeEnvelope =
        'user_id' in record ||
        'status' in record ||
        'message' in record ||
        'entity' in record ||
        'actions' in record;

      if (looksLikeEnvelope && nestedPermissions && typeof nestedPermissions === 'object') {
        return normalizePermissionScope(nestedPermissions);
      }
    }

    return normalizePermissionScope(payload);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await axiosClient.get<User>(`${API_ENDPOINTS.USERS.AUTH}/me`);
    return this.normalizeUser(this.unwrapPayload<User>(response));
  }

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await axiosClient.put<User>(`${API_ENDPOINTS.USERS.BASE}/profile`, data);
    return this.normalizeUser(this.unwrapPayload<User>(response));
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await axiosClient.post(`${API_ENDPOINTS.USERS.BASE}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return this.unwrapPayload<{ avatarUrl: string }>(response);
  }

  async uploadSignature(userId: string, file: File): Promise<SignatureUploadResponse> {
    const formData = new FormData();
    formData.append('signature', file);

    const response = await axiosClient.post<SignatureUploadResponse>(
      `/${userId}/signature`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const payload = this.unwrapPayload<SignatureUploadResponse>(response);
    if (payload?.user) {
      payload.user = this.normalizeUser(payload.user);
    }

    return payload;
  }

  async resetUserPassword(id: string, data: ResetUserPasswordData): Promise<void> {
    await axiosClient.put(API_ENDPOINTS.USERS.RESET_PASSWORD(id), {
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    });
  }

  /**
   * Get all users
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    organization_id?: string;
    lab_id?: string;
    user_type?: 'laboratory' | 'customer';
  }): Promise<{ users: UserResponse[]; total: number; page: number; limit: number }> {
    const requestParams = params
      ? {
          ...params,
          page:
            typeof params.page === 'number'
              ? Math.max(params.page - 1, 0)
              : params.page,
        }
      : undefined;

    const response = await axiosClient.get(API_ENDPOINTS.USERS.LIST, { params: requestParams });
    const payload = this.unwrapPayload<
      | User[]
      | {
          users?: User[];
          items?: User[];
          total?: number;
          total_count?: number;
          page?: number;
          limit?: number;
          pagination?: {
            total?: number;
            page?: number;
            limit?: number;
          };
        }
    >(response);

    if (Array.isArray(payload)) {
      return {
        users: payload.map((user) => this.normalizeUser(user) as UserResponse),
        total: payload.length,
        page: 1,
        limit: payload.length,
      };
    }

    const users =
      (Array.isArray(payload?.users) ? payload.users : undefined) ??
      (Array.isArray(payload?.items) ? payload.items : undefined) ??
      [];

    return {
      users: users.map((user: User) => this.normalizeUser(user) as UserResponse),
      total: payload?.total ?? payload?.total_count ?? payload?.pagination?.total ?? users.length,
      page:
        typeof (payload?.page ?? payload?.pagination?.page) === 'number'
          ? (payload?.page ?? payload?.pagination?.page ?? 0) + 1
          : 1,
      limit: payload?.limit ?? payload?.pagination?.limit ?? users.length,
    };
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<UserResponse> {
    const response = await axiosClient.get<UserResponse>(API_ENDPOINTS.USERS.GET(id));
    return this.normalizeUser(this.unwrapPayload<User>(response)) as UserResponse;
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<UserResponse> {
    const response = await axiosClient.post<UserResponse>(
      API_ENDPOINTS.USERS.CREATE,
      data
    );
    return this.normalizeUser(this.unwrapPayload<User>(response)) as UserResponse;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData): Promise<UserResponse> {
    const response = await axiosClient.put<UserResponse>(
      API_ENDPOINTS.USERS.UPDATE(id),
      data
    );
    return this.normalizeUser(this.unwrapPayload<User>(response)) as UserResponse;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await axiosClient.delete(API_ENDPOINTS.USERS.DELETE(id));
  }

  /**
   * Archive/Unarchive user
   */
  async toggleArchive(id: string, archived: boolean): Promise<UserResponse> {
    const response = await axiosClient.patch<UserResponse>(
      `${API_ENDPOINTS.USERS.UPDATE(id)}/archive`,
      { archived }
    );
    return this.normalizeUser(this.unwrapPayload<User>(response)) as UserResponse;
  }

  /**
   * Get users by organization
   */
  async getByOrganization(organizationId: string): Promise<UserResponse[]> {
    const response = await axiosClient.get<UserResponse[]>(`${API_ENDPOINTS.USERS.BASE}/organization/${organizationId}`);
    const payload = this.unwrapPayload<User[]>(response);
    return Array.isArray(payload) ? payload.map((user) => this.normalizeUser(user) as UserResponse) : [];
  }

  /**
   * Get users by lab
   */
  async getByLab(labId: string): Promise<UserResponse[]> {
    const response = await axiosClient.get<UserResponse[]>(`${API_ENDPOINTS.USERS.BASE}/lab/${labId}`);
    const payload = this.unwrapPayload<User[]>(response);
    return Array.isArray(payload) ? payload.map((user) => this.normalizeUser(user) as UserResponse) : [];
  }

  async getUserPermissions(userId: string): Promise<UserPermissionScope> {
    const response = await axiosClient.get<UserPermissionScope>(`/users/${userId}/permissions`);
    return this.extractPermissionScope(response);
  }

  async initializeUserPermissions(userId: string): Promise<UserPermissionScope> {
    const response = await axiosClient.post<UserPermissionScope>(`/users/${userId}/permissions/initialize`);
    return this.extractPermissionScope(response);
  }

  async updateUserPermissions(
    userId: string,
    data: UpdateUserPermissionsData
  ): Promise<UserPermissionScope> {
    const response = await axiosClient.put<UserPermissionScope>(
      `/users/${userId}/permissions/update`,
      data
    );
    return this.extractPermissionScope(response);
  }

  async resetUserPermissions(userId: string): Promise<UserPermissionScope> {
    const response = await axiosClient.post<UserPermissionScope>(`/users/${userId}/permissions/reset`);
    return this.extractPermissionScope(response);
  }

  async updateEntityPermission(
    userId: string,
    entity: PermissionModule,
    actions: PermissionAction[]
  ): Promise<UserPermissionScope> {
    const response = await axiosClient.patch<UserPermissionScope>(
      `/users/${userId}/permissions/entity/${entity}`,
      { actions }
    );
    return normalizePermissionScope(this.unwrapPayload<UserPermissionScope>(response));
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
}

export const userService = new UserService();
