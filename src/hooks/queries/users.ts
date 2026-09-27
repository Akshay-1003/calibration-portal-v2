import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  userService,
  type UpdateProfileData,
  type UpdateUserPermissionsData,
} from '../../services/userService';
import { toast } from 'sonner';
import type { PermissionModule, User, UserPermissionScope } from '../../features/auth/types/auth.types';
import { useAuthStore } from '../../features/auth/store/authStore';
import { extractErrorMessage } from '../../utils/extractErrorMessage';

// Query keys
export const userQueryKeys = {
  all: ['users'] as const,
  current: ['users', 'current'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: any) => [...userQueryKeys.lists(), filters] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...userQueryKeys.details(), id] as const,
  organization: (orgId: string) => [...userQueryKeys.all, 'organization', orgId] as const,
  lab: (labId: string) => [...userQueryKeys.all, 'lab', labId] as const,
  permissions: (userId: string) => [...userQueryKeys.all, 'permissions', userId] as const,
};

// Get current user query - uses cached data from auth store
export function useCurrentUserQuery(options?: any) {
  return useQuery({
    queryKey: userQueryKeys.current,
    queryFn: () => {
      // Use cached user data from auth store instead of making API calls
      const { useAuthStore } = require('../../features/auth/store/authStore');
      const { user } = useAuthStore.getState();
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

// Get all users query (admin)
export function useUsersQuery(filters?: any, options?: any) {
  return useQuery({
    queryKey: userQueryKeys.list(filters),
    queryFn: () => userService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    ...options,
  });
}

// Get user by ID query
export function useUserQuery(id: string, options?: any) {
  return useQuery({
    queryKey: userQueryKeys.detail(id),
    queryFn: () => userService.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    ...options,
  });
}

// Get users by organization query
export function useOrganizationUsersQuery(organizationId: string, options?: any) {
  return useQuery({
    queryKey: userQueryKeys.organization(organizationId),
    queryFn: () => userService.getByOrganization(organizationId),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    ...options,
  });
}

// Get users by lab query
export function useLabUsersQuery(labId: string, options?: any) {
  return useQuery({
    queryKey: userQueryKeys.lab(labId),
    queryFn: () => userService.getByLab(labId),
    enabled: !!labId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    ...options,
  });
}

// Update profile mutation
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => userService.updateProfile(data),
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userQueryKeys.current });

      // Snapshot the previous value
      const previousUser = queryClient.getQueryData(userQueryKeys.current);

      // Optimistically update to the new value
      queryClient.setQueryData(userQueryKeys.current, (old: User | undefined) => 
        old ? { ...old, ...newProfile } : undefined
      );

      // Return a context object with the snapshotted value
      return { previousUser };
    },
    onError: (err, newProfile, context) => {
      void newProfile;
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousUser) {
        queryClient.setQueryData(userQueryKeys.current, context.previousUser);
      }
      toast.error(extractErrorMessage(err, 'Failed to update profile'));
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: userQueryKeys.current });
    },
  });
}

export function useUploadSignatureMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, file }: { userId: string; file: File }) =>
      userService.uploadSignature(userId, file),
    onSuccess: (response) => {
      const currentUser = useAuthStore.getState().user;
      const nextUser = response.user
        ? response.user
        : currentUser
          ? {
              ...currentUser,
              signature_url: response.signature_url ?? response.signature ?? currentUser.signature_url ?? null,
            }
          : null;

      if (nextUser) {
        useAuthStore.getState().setUser(nextUser);
        queryClient.setQueryData(userQueryKeys.current, nextUser);
      }

      toast.success('Signature uploaded successfully!');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to upload signature'));
    },
  });
}


// Create user mutation (admin)
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => userService.create(data),
    onSuccess: () => {
      toast.success('User created successfully!');
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to create user'));
    },
  });
}

// Update user mutation (admin)
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => userService.update(id, data),
    onSuccess: (_, { id }) => {
      toast.success('User updated successfully!');
      // Invalidate specific user and users list
      queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update user'));
    },
  });
}

// Delete user mutation (admin)
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      toast.success('User deleted successfully!');
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to delete user'));
    },
  });
}

export function useUserPermissionsQuery(userId: string, options?: any) {
  return useQuery({
    queryKey: userQueryKeys.permissions(userId),
    queryFn: () => userService.getUserPermissions(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useInitializeUserPermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.initializeUserPermissions(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.permissions(userId) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
      toast.success('Permissions initialized successfully!');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to initialize permissions'));
    },
  });
}

export function useUpdateUserPermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserPermissionsData }) =>
      userService.updateUserPermissions(userId, data),
    onSuccess: (permissions, { userId }) => {
      queryClient.setQueryData<UserPermissionScope>(userQueryKeys.permissions(userId), permissions);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id === userId) {
        useAuthStore.getState().setUser({
          ...currentUser,
          permissions,
        });
      }

      toast.success('Permissions updated successfully!');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update permissions'));
    },
  });
}

export function useResetUserPermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.resetUserPermissions(userId),
    onSuccess: (permissions, userId) => {
      queryClient.setQueryData<UserPermissionScope>(userQueryKeys.permissions(userId), permissions);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id === userId) {
        useAuthStore.getState().setUser({
          ...currentUser,
          permissions,
        });
      }

      toast.success('Permissions reset successfully!');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to reset permissions'));
    },
  });
}

export function useUpdateEntityPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      entity,
      actions,
    }: {
      userId: string;
      entity: PermissionModule;
      actions: Array<'view' | 'edit'>;
    }) => userService.updateEntityPermission(userId, entity, actions),
    onSuccess: (permissions, { userId }) => {
      queryClient.setQueryData<UserPermissionScope>(userQueryKeys.permissions(userId), permissions);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id === userId) {
        useAuthStore.getState().setUser({
          ...currentUser,
          permissions,
        });
      }
    },
  });
}

// Toggle user archive mutation (admin)
export function useToggleUserArchiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => 
      userService.toggleArchive(id, archived),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.lists() });
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Failed to update user status'));
    },
  });
}
