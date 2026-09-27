/**
 * User Store
 * Manages user data and CRUD operations
 */

import { createBaseStore } from './baseStore';
import { userService, type CreateUserData, type UpdateUserData, type UserResponse } from '../services/userService';
import { toast } from 'sonner';

interface UserStoreState {
  items: UserResponse[];
  loading: boolean;
  error: string | null;
  actions: {
    fetchAll: (forceRefresh?: boolean) => Promise<void>;
    create: (data: CreateUserData) => Promise<UserResponse | null>;
    update: (id: string, data: UpdateUserData) => Promise<UserResponse | null>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<UserResponse | null>;
    clearError: () => void;
  };
}

export const useUserStore = createBaseStore<UserStoreState>(
  {
    name: 'UserStore',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  },
  (set, get, cache, inFlight) => {
    const cacheKey = 'users';

    return {
      // Initial state
      items: [],
      loading: false,
      error: null,

      // Actions
      actions: {
        /**
         * Fetch all users
         */
        fetchAll: async (forceRefresh = false) => {
          // Check cache first
          if (!forceRefresh) {
            const cached = cache.get<UserResponse[]>(cacheKey);
            if (cached) {
              set((state: UserStoreState) => ({ ...state, items: cached }));
              return;
            }
          }

          // Use in-flight manager to prevent duplicate requests
          return inFlight.getOrCreate(cacheKey, async () => {
            set((state: UserStoreState) => ({ ...state, loading: true, error: null }));

            try {
              const response = await userService.getAll();
              const items = Array.isArray(response)
                ? response
                : Array.isArray(response?.users)
                  ? response.users
                  : [];

              // Update cache and state
              cache.set(cacheKey, items);
              set((state: UserStoreState) => ({
                ...state,
                items,
                loading: false,
              }));

              return items;
            } catch (error: any) {
              const errorMessage = error.response?.data?.detail || 
                                 error.response?.data?.message || 
                                 error.message || 
                                 'Failed to fetch users';

              set((state: UserStoreState) => ({
                ...state,
                loading: false,
                error: errorMessage,
              }));

              toast.error(errorMessage);
              throw error;
            }
          });
        },

        /**
         * Create new user
         */
        create: async (data: CreateUserData) => {
          set((state: UserStoreState) => ({ ...state, loading: true, error: null }));

          try {
            const response = await userService.create(data);

            // Invalidate cache
            cache.invalidate(cacheKey);

            // Refresh list
            await get().actions.fetchAll(true);

            toast.success('User created successfully!');
            return response;
          } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               error.message || 
                               'Failed to create user';

            set((state: UserStoreState) => ({
              ...state,
              loading: false,
              error: errorMessage,
            }));

            toast.error(errorMessage);
            throw error;
          }
        },

        /**
         * Update user
         */
        update: async (id: string, data: UpdateUserData) => {
          set((state: UserStoreState) => ({ ...state, loading: true, error: null }));

          try {
            const response = await userService.update(id, data);

            // Invalidate cache
            cache.invalidate(cacheKey);

            // Refresh list
            await get().actions.fetchAll(true);

            toast.success('User updated successfully!');
            return response;
          } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               error.message || 
                               'Failed to update user';

            set((state: UserStoreState) => ({
              ...state,
              loading: false,
              error: errorMessage,
            }));

            toast.error(errorMessage);
            throw error;
          }
        },

        /**
         * Delete user
         */
        delete: async (id: string) => {
          set((state: UserStoreState) => ({ ...state, loading: true, error: null }));

          try {
            await userService.delete(id);

            // Invalidate cache
            cache.invalidate(cacheKey);

            // Refresh list
            await get().actions.fetchAll(true);

            toast.success('User deleted successfully!');
          } catch (error: any) {
            const errorMessage = error.response?.data?.detail || 
                               error.response?.data?.message || 
                               error.message || 
                               'Failed to delete user';

            set((state: UserStoreState) => ({
              ...state,
              loading: false,
              error: errorMessage,
            }));

            toast.error(errorMessage);
            throw error;
          }
        },

        /**
         * Get user by ID
         */
        getById: async (id: string) => {
          const cacheKeyForUser = `user_${id}`;

          // Check cache first
          const cached = cache.get<UserResponse>(cacheKeyForUser);
          if (cached) {
            return cached;
          }

          return inFlight.getOrCreate(cacheKeyForUser, async () => {
            try {
              const response = await userService.getById(id);

              if (response) {
                // Update cache
                cache.set(cacheKeyForUser, response);
              }

              return response || null;
            } catch (error: any) {
              // Don't show toast for 404 (not found)
              if (error.response?.status !== 404) {
                const errorMessage = error.response?.data?.detail || 
                                   error.response?.data?.message || 
                                   error.message || 
                                   'Failed to fetch user';
                toast.error(errorMessage);
              }
              return null;
            }
          });
        },

        /**
         * Clear error state
         */
        clearError: () => {
          set((state: UserStoreState) => ({ ...state, error: null }));
        },
      },
    };
  }
);
