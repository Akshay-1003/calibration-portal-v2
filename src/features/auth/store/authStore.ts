
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { authService } from '../services/authService';
import { tabSync } from '../utils/tabSync';
import { registerAccessTokenGetter } from '../utils/authTokenAccessor';
import { idleTimeout } from '../utils/idleTimeout';
import {
  decodeCalibrationAccessToken,
  getCalibrationAccessTokenExpiry,
  isUsableCalibrationAccessToken,
} from '../utils/calibrationToken';
import {
  canEditModule,
  canViewModule,
  hasAllModulePermissions,
  hasAnyModulePermission,
  hasModulePermission,
  type PermissionCheckInput,
} from '../utils/permissionHelpers';
type PostLoginPreloadModule = typeof import('../../../services/postLoginPreload');
import type {
  User,
  LoginCredentials,
  SignUpData,
  PermissionAction,
  PermissionModule,
} from '../types';

export interface AuthState {
  // Auth state
  user: User | null;
  accessToken: string | null; // Stored in memory only (XSS protection)
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  // Token refresh state
  isRefreshing: boolean;
  refreshPromise: Promise<void> | null;
  initializePromise: Promise<void> | null;
  tokenExpiryTime: number | null; // When token expires (timestamp)
  refreshEndpointAvailable: boolean; // Track if refresh endpoint exists
  rememberMe: boolean; // Remember me session flag

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  switchLaboratoryContext: (organizationId: string | null) => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null, options?: { broadcast?: boolean }) => void;
  startTokenRefreshTimer: () => void;
  stopTokenRefreshTimer: () => void;

  // Permission helpers
  hasRole: (role: string) => boolean;
  hasPermission: (module: PermissionCheckInput, action?: PermissionAction) => boolean;
  hasAnyPermission: (permissions: PermissionCheckInput[]) => boolean;
  hasAllPermissions: (permissions: PermissionCheckInput[]) => boolean;
  canView: (module: PermissionModule) => boolean;
  canEdit: (module: PermissionModule) => boolean;
}

type AuthErrorLike = {
  message?: string;
  status?: number;
  response?: {
    status?: number;
  };
};

/**
 * Get token expiry time
 */
function getTokenExpiry(token: string): number | null {
  return getCalibrationAccessTokenExpiry(token);
}

function isUsableAccessToken(token: string | null | undefined): token is string {
  return isUsableCalibrationAccessToken(token);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function isRefreshEndpointUnavailable(error: unknown): boolean {
  const authError = error as AuthErrorLike;
  return (
    getAuthErrorStatus(error) === 405 ||
    (typeof authError?.message === 'string' &&
      authError.message.includes('not available'))
  );
}

function getAuthErrorStatus(error: unknown): number | undefined {
  const authError = error as AuthErrorLike;
  return authError?.status ?? authError?.response?.status;
}

function isTerminalRefreshFailure(error: unknown): boolean {
  const status = getAuthErrorStatus(error);
  const message = (error as AuthErrorLike)?.message;
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 405 ||
    message === 'Invalid refreshed access token' ||
    message === 'Invalid response format from server'
  );
}

const ACCESS_TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000;
let wakeRefreshListenersStarted = false;

function ensureWakeRefreshListeners(): void {
  if (wakeRefreshListenersStarted || typeof window === 'undefined') {
    return;
  }

  const refreshIfTokenIsNearExpiry = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    const state = useAuthStore.getState();
    if (!state.isAuthenticated || state.isRefreshing || !state.refreshEndpointAvailable) {
      return;
    }

    const tokenClaims = state.accessToken
      ? decodeCalibrationAccessToken(state.accessToken)
      : null;
    if (tokenClaims?.scope === 'laboratory') {
      return;
    }

    const expiryTime = state.accessToken ? getTokenExpiry(state.accessToken) : null;
    if (!expiryTime || expiryTime - Date.now() <= ACCESS_TOKEN_REFRESH_BUFFER_MS) {
      void state.refreshAccessToken().catch(() => {
        // Auth state handles terminal refresh failures. Transient failures can retry on the next request.
      });
    }
  };

  document.addEventListener('visibilitychange', refreshIfTokenIsNearExpiry);
  window.addEventListener('focus', refreshIfTokenIsNearExpiry);
  window.addEventListener('online', refreshIfTokenIsNearExpiry);
  wakeRefreshListenersStarted = true;
}

function runIdleTask(task: () => void, timeout = 2000): void {
  if (typeof window === 'undefined') {
    task();
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(task, { timeout });
    return;
  }

  window.setTimeout(task, 200);
}

async function runPostLoginPreload(userId?: string | null): Promise<void> {
  try {
    const module: PostLoginPreloadModule = await import('../../../services/postLoginPreload');
    await module.preloadPostLoginMasterData(userId);
  } catch {
    // Silently fail - preloading is optional
  }
}

async function resetPostLoginPreload(): Promise<void> {
  const module: PostLoginPreloadModule = await import('../../../services/postLoginPreload');
  module.resetPostLoginMasterDataPreload();
}

async function clearProtectedStores(): Promise<void> {
  const [{ useAppStore }, { useMasterDataStore }, { queryClient }] = await Promise.all([
    import('../../../store/appStore'),
    import('../../../store/useStore'),
    import('../../../core/query/queryClient'),
  ]);

  useAppStore.getState().actions.clearAllCaches();
  useMasterDataStore.getState().resetMasterData();
  queryClient.cancelQueries();
  queryClient.clear();
}

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
      isRefreshing: false,
      refreshPromise: null,
      initializePromise: null,
      tokenExpiryTime: null,
      refreshEndpointAvailable: true, // Assume available until proven otherwise
      rememberMe: false,
   
      setAccessToken: (token: string | null) => {
        set((state) => {
          state.accessToken = token;
          state.isAuthenticated = !!token;
        });

        // Start proactive refresh timer
        if (token) {
          get().startTokenRefreshTimer();
          idleTimeout.start();
        } else {
          get().stopTokenRefreshTimer();
          idleTimeout.stop();
        }
      },
      setUser: (user: User | null, options) => {
        set((state) => {
          state.user = user;
        });

        if (user && options?.broadcast !== false) {
          tabSync.broadcastUserUpdate();
        }
      },
      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;
        if (state.initializePromise) {
          return state.initializePromise;
        }

        const initializePromise = (async () => {
          set((draft) => {
            draft.isLoading = true;
            draft.error = null;
          });

          try {
            // Bootstrap through the coordinated refresh path so opening several
            // tabs cannot rotate the shared HttpOnly cookie concurrently.
            await get().refreshAccessToken();
            const refreshedToken = get().accessToken;

            if (!isUsableAccessToken(refreshedToken)) {
              set((draft) => {
                draft.user = null;
                draft.accessToken = null;
                draft.isAuthenticated = false;
                draft.error = null;
              });
              idleTimeout.stop();
              return;
            }

            // Make refreshed access token available before /me call.
            set((draft) => {
              draft.accessToken = refreshedToken;
              draft.isAuthenticated = true;
              draft.error = null;
            });

            try {
              const meResponse = await authService.getMe();

              set((draft) => {
                draft.user = meResponse.user;
              });

              get().setUser(meResponse.user, { broadcast: false });
              get().startTokenRefreshTimer();
              idleTimeout.start();
              // Fire-and-forget: preload in background without blocking
              runIdleTask(() => {
                void runPostLoginPreload(meResponse.user?.id);
              });
            } catch {
              // If /me fails after refresh, treat session as invalid.
              set((draft) => {
                draft.user = null;
                draft.accessToken = null;
                draft.isAuthenticated = false;
                draft.error = null;
              });
              get().stopTokenRefreshTimer();
              idleTimeout.stop();
            }
          } catch {
            set((draft) => {
              draft.user = null;
              draft.accessToken = null;
              draft.isAuthenticated = false;
              draft.error = null;
            });
            idleTimeout.stop();
          } finally {
            set((draft) => {
              draft.isLoading = false;
              draft.isInitialized = true;
              draft.initializePromise = null;
            });
          }
        })();

        set((draft) => {
          draft.initializePromise = initializePromise;
        });

        return initializePromise;
      },

      /**
       * Login user
       * Backend sets refresh token in HttpOnly cookie
       */
      login: async (credentials: LoginCredentials) => {
        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });
        
        try {
          const response = await authService.login(credentials);
          // Backend sets refresh token in HttpOnly cookie automatically
          // We only store the access token in memory initially
          set((draft) => {
            draft.accessToken = response.access_token; // Access token
            draft.isAuthenticated = true;
            draft.isInitialized = true;
            draft.isLoading = false;
            draft.rememberMe = credentials.rememberMe || false;
          });

          // Step 1: Immediately fetch user data from /me endpoint
          try {
            const meResponse = await authService.getMe();
            
            // Step 2: Store user data only after successful /me call
            get().setUser(meResponse.user, { broadcast: false });
            
            // Step 3: Broadcast login to other tabs
            tabSync.broadcastLogin(response.access_token);

            // Step 4: Reset idle timeout and start refresh timer
            get().startTokenRefreshTimer();
            idleTimeout.start();

            // Step 5: Warm up high-traffic master data in background (non-blocking)
            runIdleTask(() => {
              void runPostLoginPreload(meResponse.user?.id);
            });
          } catch {
            // Step 5: If /me fails, clear token and logout to avoid broken session
            set((draft) => {
              draft.accessToken = null;
              draft.user = null;
              draft.isAuthenticated = false;
              draft.isInitialized = true;
            });
            
            get().stopTokenRefreshTimer();
            idleTimeout.stop();
            throw new Error('Login successful but failed to fetch user profile');
          }
        } catch (error: unknown) {
          const message = getErrorMessage(error, 'Login failed');
          set((draft) => {
            draft.isLoading = false;
            draft.error = message;
          });
          throw (error instanceof Error ? error : new Error(message));
        }
      },

      /**
       * Sign up user
       */
      signUp: async (data: SignUpData) => {
        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          const response = await authService.signUp(data);

          // Backend sets refresh token in HttpOnly cookie automatically
          // Store access token in memory only
          set((draft) => {
            draft.accessToken = response.access_token;
            draft.user = response.user;
            draft.isAuthenticated = true;
            draft.isInitialized = true;
            draft.isLoading = false;
            draft.rememberMe = false; // Sign up doesn't have remember me
          });

          get().setUser(response.user, { broadcast: false });

          // Broadcast login to other tabs
          tabSync.broadcastLogin(response.access_token);

          // Start token refresh timer
          get().startTokenRefreshTimer();
          idleTimeout.start();

          // Warm up high-traffic master data in background (non-blocking)
          runIdleTask(() => {
            void runPostLoginPreload(response.user?.id);
          });
        } catch (error: unknown) {
          const message = getErrorMessage(error, 'Sign up failed');
          set((draft) => {
            draft.isLoading = false;
            draft.error = message;
            draft.isAuthenticated = false;
          });
          throw (error instanceof Error ? error : new Error(message));
        }
      },

      refreshAccessToken: async () => {
        const state = get();

        // If already refreshing, return the existing promise
        if (state.isRefreshing && state.refreshPromise) {
          return state.refreshPromise;
        }

        // Create refresh promise
          const refreshPromise = (async () => {
          set((draft) => {
            draft.isRefreshing = true;
            draft.error = null;
          });

          try {

            const tokenBeforeRefresh = get().accessToken;
            const releaseRefreshLock = await tabSync.acquireRefreshLock();
            try {
              // Another tab may have completed the rotation while this tab was
              // waiting for the lease. Reuse its broadcasted in-memory token.
              const tokenAfterWaiting = get().accessToken;
              if (
                tokenAfterWaiting &&
                tokenAfterWaiting !== tokenBeforeRefresh &&
                isUsableAccessToken(tokenAfterWaiting)
              ) {
                set((draft) => {
                  draft.isRefreshing = false;
                  draft.refreshPromise = null;
                });
                return;
              }

              const response = await authService.refreshToken();
            const refreshedToken = response?.access_token;
            if (!isUsableAccessToken(refreshedToken)) {
              throw new Error('Invalid refreshed access token');
            }

            // Update access token, keep existing user profile.
            set((draft) => {
              draft.accessToken = refreshedToken;
              draft.isAuthenticated = true;
              draft.isRefreshing = false;
              draft.refreshPromise = null;
            });

            if (!get().user) {
              const meResponse = await authService.getMe();
              get().setUser(meResponse.user, { broadcast: false });
            }

            // Broadcast token refresh to other tabs
            tabSync.broadcastTokenRefresh(refreshedToken);

            // Restart proactive refresh timer
            get().startTokenRefreshTimer();
            } finally {
              releaseRefreshLock();
            }
          } catch (error: unknown) {
            // Check if refresh endpoint doesn't exist (405 Method Not Allowed)
            const isEndpointNotFound = isRefreshEndpointUnavailable(error);
            const shouldEndSession = isTerminalRefreshFailure(error);

            // If endpoint doesn't exist, mark it and stop the refresh timer permanently
            if (isEndpointNotFound) {
              set((draft) => {
                draft.refreshEndpointAvailable = false;
              });
              get().stopTokenRefreshTimer();
              idleTimeout.stop();
            }

            if (shouldEndSession) {
              // Refresh token rejected or refresh endpoint unavailable: end the session.
              set((draft) => {
                draft.accessToken = null;
                draft.user = null;
                draft.isAuthenticated = false;
                draft.isRefreshing = false;
                draft.refreshPromise = null;
                draft.error = getErrorMessage(error, 'Session expired');
              });
              idleTimeout.stop();
              tabSync.broadcastLogout();
            } else {
              // Transient failures should not locally log out an otherwise valid session.
              set((draft) => {
                draft.isRefreshing = false;
                draft.refreshPromise = null;
                draft.error = getErrorMessage(error, 'Unable to refresh session');
              });
            }
            throw (error instanceof Error ? error : new Error('Session expired'));
          }
        })();

        set((draft) => {
          draft.refreshPromise = refreshPromise;
        });

        return refreshPromise;
      },

      switchLaboratoryContext: async (organizationId: string | null) => {
        const state = get();
        if (!state.user || (state.user.role !== 'super_admin' && state.user.role !== 'superadmin')) {
          throw new Error('A platform super-admin session is required');
        }

        set((draft) => {
          draft.isLoading = true;
          draft.error = null;
        });

        try {
          // Context tokens are intentionally non-refreshable. Return to the
          // platform session before issuing another laboratory context token.
          const currentClaims = state.accessToken
            ? decodeCalibrationAccessToken(state.accessToken)
            : null;
          if (currentClaims?.scope === 'laboratory' || organizationId === null) {
            await get().refreshAccessToken();
          }

          if (organizationId) {
            const contextResponse = await authService.enterLaboratoryContext(organizationId);
            set((draft) => {
              draft.accessToken = contextResponse.access_token;
              draft.isAuthenticated = true;
            });
          }

          await clearProtectedStores();
          const meResponse = await authService.getMe();
          get().setUser(meResponse.user, { broadcast: false });
          const activeToken = get().accessToken;
          if (activeToken) {
            tabSync.broadcastLogin(activeToken);
          }
          get().startTokenRefreshTimer();
        } catch (error: unknown) {
          const message = getErrorMessage(error, 'Unable to change laboratory context');
          set((draft) => {
            draft.error = message;
          });
          throw (error instanceof Error ? error : new Error(message));
        } finally {
          set((draft) => {
            draft.isLoading = false;
          });
        }
      },

      logout: async () => {
        set((draft) => {
          draft.isLoading = true;
        });

        // Stop token refresh timer
        get().stopTokenRefreshTimer();
        idleTimeout.stop();

        try {
         
          await authService.logout();
        } catch (error) {
          console.error('Logout API failed:', error);
        } finally {
         
          set((draft) => {
            draft.accessToken = null;
            draft.user = null;
            draft.isAuthenticated = false;
            draft.isInitialized = true;
            draft.isLoading = false;
            draft.error = null;
            draft.isRefreshing = false;
            draft.refreshPromise = null;
          });

          // Allow preloading again on next authenticated session
          await resetPostLoginPreload();
          await clearProtectedStores();

         
          tabSync.broadcastLogout();
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set((draft) => {
          draft.error = null;
        });
      },

   
      startTokenRefreshTimer: () => {
        const state = get();

        const tokenClaims = state.accessToken
          ? decodeCalibrationAccessToken(state.accessToken)
          : null;
        if (tokenClaims?.scope === 'laboratory') {
          get().stopTokenRefreshTimer();
          return;
        }

        // Don't start timer if refresh endpoint is not available
        if (!state.refreshEndpointAvailable) {
          return;
        }

        ensureWakeRefreshListeners();

        // Clear existing timer
        if (state.tokenExpiryTime) {
          clearTimeout(state.tokenExpiryTime);
        }

        const checkAndRefresh = async () => {
          const currentState = get();

          // Don't refresh if endpoint is not available
          if (!currentState.refreshEndpointAvailable) {
            get().stopTokenRefreshTimer();
            return;
          }

          const token = currentState.accessToken;
          if (!token || !currentState.isAuthenticated) {
            get().stopTokenRefreshTimer();
            return;
          }

          const tokenExpiry = getTokenExpiry(token);
          if (!tokenExpiry) {
            get().stopTokenRefreshTimer();
            return;
          }

          const timeUntilExpiry = (tokenExpiry - Date.now()) / 1000;
          const refreshBuffer = ACCESS_TOKEN_REFRESH_BUFFER_MS / 1000;

          // If token expires within 2 minutes, refresh it proactively
          if (timeUntilExpiry < refreshBuffer && timeUntilExpiry > 0) {
            try {
              await get().refreshAccessToken();
            } catch (error: unknown) {
              // If endpoint doesn't exist (405), stop trying
              // Log error silently
              if (isRefreshEndpointUnavailable(error)) {
                set((draft) => {
                  draft.refreshEndpointAvailable = false;
                });
                get().stopTokenRefreshTimer();
              }
            }
          }

          // If token is already expired, try to refresh
          if (timeUntilExpiry <= 0) {
            try {
              await get().refreshAccessToken();
            } catch (error: unknown) {
              // If endpoint doesn't exist (405), stop trying
              // Log error silently
              if (isRefreshEndpointUnavailable(error)) {
                set((draft) => {
                  draft.refreshEndpointAvailable = false;
                });
                get().stopTokenRefreshTimer();
              }
              // If refresh fails, logout will be handled by the refresh method
            }
          }
        };

        // Check immediately
        checkAndRefresh();
        let timeoutId: number | null = null;
        // Calculate when to refresh next based on token expiry
        const token = state.accessToken;
        const expiryTime = token ? getTokenExpiry(token) : null;
        if (expiryTime) {
          const refreshBuffer = ACCESS_TOKEN_REFRESH_BUFFER_MS / 1000;
          const timeUntilExpiry = (expiryTime - Date.now()) / 1000;
          if (timeUntilExpiry > refreshBuffer) {
            // Set timeout to refresh just before expiry
            const refreshDelay = (timeUntilExpiry - refreshBuffer) * 1000;
            timeoutId = window.setTimeout(checkAndRefresh, refreshDelay);
          }
        }

        set((draft) => {
          draft.tokenExpiryTime = timeoutId;
        });
      },

      /**
       * Stop token refresh timer
       */
      stopTokenRefreshTimer: () => {
        const state = get();
        
        // Clear existing timer
        if (state.tokenExpiryTime) {
          clearTimeout(state.tokenExpiryTime);
        }
        set((draft) => {
          draft.tokenExpiryTime = null;
        });
      },

  
      hasRole: (role: string) => {
        const state = get();
        return state.user?.role === role;
      },

      /**
       * Check if user has specific permission
       */
      hasPermission: (moduleOrPermission: PermissionCheckInput, action?: PermissionAction) => {
        const state = get();
        return hasModulePermission(state.user?.permissions, moduleOrPermission, action);
      },

      /**
       * Check if user has any of the specified permissions
       */
      hasAnyPermission: (permissions: PermissionCheckInput[]) => {
        const state = get();
        return hasAnyModulePermission(state.user?.permissions, permissions);
      },

      /**
       * Check if user has all specified permissions
       */
      hasAllPermissions: (permissions: PermissionCheckInput[]) => {
        const state = get();
        return hasAllModulePermissions(state.user?.permissions, permissions);
      },

      canView: (module: PermissionModule) => {
        const state = get();
        return canViewModule(state.user?.permissions, module);
      },

      canEdit: (module: PermissionModule) => {
        const state = get();
        return canEditModule(state.user?.permissions, module);
      },
    })),
    { name: 'AuthStore' }
  )
);

export const authSelectors = {
  user: (state: AuthState) => state.user,
  isAuthenticated: (state: AuthState) => state.isAuthenticated,
  isLoading: (state: AuthState) => state.isLoading,
  isInitialized: (state: AuthState) => state.isInitialized,
  accessToken: (state: AuthState) => state.accessToken,
  error: (state: AuthState) => state.error,
};

registerAccessTokenGetter(() => useAuthStore.getState().accessToken);
