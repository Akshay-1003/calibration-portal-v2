/**
 * Idle Timeout Handler
 * Automatically logs out user after period of inactivity
 * 
 * ⚠️ DISABLED: Set ENABLE_IDLE_TIMEOUT to false to keep users signed in indefinitely
 */

import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';

// Configuration: Enable idle timeout for production security
// Set to false to disable automatic logout (NOT recommended for production)
const ENABLE_IDLE_TIMEOUT = true;

class IdleTimeout {
  private timer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes (configurable: 15-30 min range)
  private readonly WARNING_TIME = 2 * 60 * 1000; // 2 minutes before timeout
  private lastActivity: number = Date.now();
  private isWarningShown = false;
  private isInitialized = false;
  private readonly activityEvents: Array<keyof WindowEventMap> = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'click',
  ];

  constructor() {
    // Don't initialize immediately to avoid circular dependency
    // Will be initialized when first method is called
  }

  /**
   * Initialize the idle timeout handler
   * Called lazily to avoid circular dependency
   */
  private initialize() {
    if (this.isInitialized) return;
    this.setupActivityListeners();
    this.isInitialized = true;
  }

  /**
   * Register user activity listeners once.
   */
  private setupActivityListeners() {
    if (!ENABLE_IDLE_TIMEOUT || typeof window === 'undefined') return;
    this.activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, this.handleActivity, { passive: true });
    });
  }

  /**
   * Handle any activity and refresh idle timers.
   */
  private handleActivity = () => {
    if (!ENABLE_IDLE_TIMEOUT) return;
    const store = useAuthStore.getState();
    if (!store.isAuthenticated) return;
    this.resetTimer();
  };

  /**
   * Reset warning + timeout timers.
   */
  resetTimer() {
    if (!ENABLE_IDLE_TIMEOUT) return;
    this.initialize();

    this.lastActivity = Date.now();
    this.isWarningShown = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    this.warningTimer = setTimeout(() => {
      void this.showWarning();
    }, this.IDLE_TIMEOUT - this.WARNING_TIME);

    this.timer = setTimeout(() => {
      void this.handleTimeout();
    }, this.IDLE_TIMEOUT);
  }

  /**
   * Start idle timeout monitoring.
   */
  start() {
    if (!ENABLE_IDLE_TIMEOUT) return;
    this.resetTimer();
  }

  /**
   * Stop idle timeout monitoring and clear timers.
   */
  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    this.isWarningShown = false;
  }




  /**
   * Show warning before timeout
   */
  private async showWarning() {
    if (this.isWarningShown) return;

    const store = useAuthStore.getState();
    if (!store.isAuthenticated) return;

    this.isWarningShown = true;
    toast.warning('Your session will expire in 2 minutes due to inactivity', {
      duration: 60000, // Show for 1 minute
      action: {
        label: 'Stay Active',
        onClick: () => {
          void this.extendSession();
        },
      },
    });
  }

  private async extendSession() {
    const store = useAuthStore.getState();
    if (!store.isAuthenticated) return;

    this.resetTimer();

    try {
      await store.refreshAccessToken();
      toast.success('Session extended');
    } catch {
      if (useAuthStore.getState().isAuthenticated) {
        toast.error('Unable to extend session. Please check your connection.');
      }
    }
  }

  /**
   * Handle timeout - logout user
   */
  private async handleTimeout() {
    const store = useAuthStore.getState();
    if (store.isAuthenticated) {
      store.logout();
      toast.info('Logged out due to inactivity');
    }
  }

  /**
   * Get remaining idle time in milliseconds
   */
  getRemainingTime(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.IDLE_TIMEOUT - elapsed);
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (typeof window !== 'undefined') {
      this.activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, this.handleActivity);
      });
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const idleTimeout = new IdleTimeout();
