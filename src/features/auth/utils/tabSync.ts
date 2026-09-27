/**
 * Multi-Tab Synchronization
 * Synchronizes auth state across browser tabs using BroadcastChannel API
 */

import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

class TabSync {
  private channel: BroadcastChannel | null = null;
  private isInitialized = false;
  private readonly tabId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
  private readonly refreshLockKey = 'metrologydesk-auth-refresh-lock';
  private readonly sessionEventKey = 'metrologydesk-auth-session-event';
  private readonly refreshLockLeaseMs = 20_000;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent);
    }
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('auth-sync');
      this.setupListeners();
      this.isInitialized = true;
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== this.sessionEventKey || !event.newValue) return;

    try {
      const message = JSON.parse(event.newValue) as { type?: string };
      if (message.type === 'LOGOUT') {
        void this.handleLogout();
      } else if (message.type === 'LOGIN') {
        const store = useAuthStore.getState();
        if (!store.isAuthenticated) void store.initialize();
      }
    } catch {
      // Ignore malformed cross-tab events.
    }
  };

  private publishSessionEvent(type: 'LOGIN' | 'LOGOUT') {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        this.sessionEventKey,
        JSON.stringify({ type, sender: this.tabId, at: Date.now() })
      );
      window.localStorage.removeItem(this.sessionEventKey);
    } catch {
      // BroadcastChannel remains the primary transport.
    }
  }

  async acquireRefreshLock(): Promise<() => void> {
    if (typeof window === 'undefined') return () => undefined;

    const deadline = Date.now() + this.refreshLockLeaseMs + 5_000;
    while (Date.now() < deadline) {
      const now = Date.now();
      let current: { owner?: string; expiresAt?: number } | null = null;
      try {
        const raw = window.localStorage.getItem(this.refreshLockKey);
        current = raw ? JSON.parse(raw) : null;
      } catch {
        current = null;
      }

      if (!current?.owner || !current.expiresAt || current.expiresAt <= now) {
        const claim = { owner: this.tabId, expiresAt: now + this.refreshLockLeaseMs };
        try {
          window.localStorage.setItem(this.refreshLockKey, JSON.stringify(claim));
          const verified = JSON.parse(window.localStorage.getItem(this.refreshLockKey) || '{}');
          if (verified.owner === this.tabId) {
            return () => {
              try {
                const latest = JSON.parse(window.localStorage.getItem(this.refreshLockKey) || '{}');
                if (latest.owner === this.tabId) window.localStorage.removeItem(this.refreshLockKey);
              } catch {
                // The lease will expire if storage is unavailable during release.
              }
            };
          }
        } catch {
          // Continue with the in-memory per-tab refresh lock.
          return () => undefined;
        }
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    throw new Error('Another browser tab is refreshing the session');
  }

  private setupListeners() {
    if (!this.channel) return;

    this.channel.onmessage = async (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'LOGIN':
          await this.handleLogin(payload);
          break;
        case 'LOGOUT':
          await this.handleLogout();
          break;
        case 'TOKEN_REFRESH':
          await this.handleTokenRefresh(payload);
          break;
        case 'USER_UPDATE':
          await this.handleUserUpdate(payload);
          break;
        default:
          // Unknown event type - ignore silently
          break;
      }
    };
  }

  private async syncCurrentUser() {
    const store = useAuthStore.getState();

    try {
      const response = await authService.getMe();
      store.setUser(response.user, { broadcast: false });
    } catch {
      store.setAccessToken(null);
      store.setUser(null, { broadcast: false });
      store.stopTokenRefreshTimer();
    }
  }

  private async handleLogin(payload: { token: string }) {
    const store = useAuthStore.getState();
    store.setAccessToken(payload.token);
    store.setUser(null, { broadcast: false });
    await this.syncCurrentUser();
  }

  private async handleLogout() {
    const store = useAuthStore.getState();
    
    // Clear auth state without calling logout API (to avoid infinite loops)
    // The tab that initiated logout already called the API
    store.setAccessToken(null);
    store.setUser(null, { broadcast: false });
    store.stopTokenRefreshTimer();
    
    // No localStorage cleanup needed - HTTP Only Cookie architecture
    // User data stays in memory only
  }

  private async handleTokenRefresh(payload: { token: string }) {
    const store = useAuthStore.getState();
    store.setAccessToken(payload.token);
  }

  private async handleUserUpdate() {
    await this.syncCurrentUser();
  }

  /**
   * Broadcast login event to other tabs
   */
  broadcastLogin(token: string) {
    this.publishSessionEvent('LOGIN');
    if (!this.channel || !this.isInitialized) return;
    this.channel.postMessage({
      type: 'LOGIN',
      payload: { token },
    });
  }

  /**
   * Broadcast logout event to other tabs
   */
  broadcastLogout() {
    this.publishSessionEvent('LOGOUT');
    if (!this.channel || !this.isInitialized) return;
    this.channel.postMessage({
      type: 'LOGOUT',
      payload: {},
    });
  }

  /**
   * Broadcast token refresh event to other tabs
   */
  broadcastTokenRefresh(token: string) {
    if (!this.channel || !this.isInitialized) return;
    this.channel.postMessage({
      type: 'TOKEN_REFRESH',
      payload: { token },
    });
  }

  /**
   * Broadcast user update event to other tabs
   */
  broadcastUserUpdate() {
    if (!this.channel || !this.isInitialized) return;
    this.channel.postMessage({
      type: 'USER_UPDATE',
      payload: {},
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const tabSync = new TabSync();
