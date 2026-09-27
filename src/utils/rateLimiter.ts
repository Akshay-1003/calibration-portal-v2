/**
 * Rate Limiter Utility
 * Client-side rate limiting to prevent excessive API calls
 * This complements server-side rate limiting
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitState {
  attempts: number[];
  blockedUntil: number | null;
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register a rate limit configuration for a specific action
   */
  register(action: string, config: RateLimitConfig): void {
    this.configs.set(action, config);
    if (!this.limits.has(action)) {
      this.limits.set(action, {
        attempts: [],
        blockedUntil: null,
      });
    }
  }

  /**
   * Check if action is allowed
   * Returns true if allowed, false if rate limited
   */
  checkLimit(action: string): { allowed: boolean; retryAfter?: number } {
    const config = this.configs.get(action);
    if (!config) {
      // If no config, allow by default
      return { allowed: true };
    }

    const state = this.limits.get(action)!;
    const now = Date.now();

    // Check if currently blocked
    if (state.blockedUntil && state.blockedUntil > now) {
      const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Clear old attempts outside the window
    state.attempts = state.attempts.filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    // Check if limit exceeded
    if (state.attempts.length >= config.maxAttempts) {
      // Block for specified duration
      const blockDuration = config.blockDurationMs || config.windowMs;
      state.blockedUntil = now + blockDuration;
      const retryAfter = Math.ceil(blockDuration / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  /**
   * Record an attempt for the action
   */
  recordAttempt(action: string): void {
    const state = this.limits.get(action);
    if (state) {
      state.attempts.push(Date.now());
    }
  }

  /**
   * Reset rate limit for an action (e.g., after successful login)
   */
  reset(action: string): void {
    const state = this.limits.get(action);
    if (state) {
      state.attempts = [];
      state.blockedUntil = null;
    }
  }

  /**
   * Get remaining attempts for an action
   */
  getRemainingAttempts(action: string): number {
    const config = this.configs.get(action);
    if (!config) return Infinity;

    const state = this.limits.get(action);
    if (!state) return config.maxAttempts;

    const now = Date.now();
    const recentAttempts = state.attempts.filter(
      (timestamp) => now - timestamp < config.windowMs
    );

    return Math.max(0, config.maxAttempts - recentAttempts.length);
  }

  /**
   * Check if action is currently blocked
   */
  isBlocked(action: string): boolean {
    const state = this.limits.get(action);
    if (!state || !state.blockedUntil) return false;
    return state.blockedUntil > Date.now();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configure common actions
rateLimiter.register('login', {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block after 5 failed attempts
});

rateLimiter.register('signup', {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
});

rateLimiter.register('forgotPassword', {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
});

rateLimiter.register('resetPassword', {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 24 * 60 * 60 * 1000, // 24 hours block
});

rateLimiter.register('verifyEmail', {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
});

rateLimiter.register('resendVerification', {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 2 * 60 * 60 * 1000, // 2 hours block
});





