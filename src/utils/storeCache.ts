/**
 * Unified Cache System for Zustand Stores
 * Replaces multiple cache implementations with a single, consistent approach
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class StoreCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;
  private maxSize: number;

  constructor(config: CacheConfig = {}) {
    this.ttl = config.ttl ?? 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = config.maxSize ?? 1000; // Default max 1000 entries
  }

  /**
   * Get cached data if valid
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache
   */
  set(key: string, data: T): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Check if cache entry is valid
   */
  isValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return (Date.now() - entry.timestamp) < this.ttl;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > this.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * In-flight request manager to prevent duplicate API calls
 */
export class InFlightManager {
  private requests = new Map<string, Promise<any>>();

  /**
   * Get existing request or create new one
   */
  async getOrCreate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Return existing request if in flight
    if (this.requests.has(key)) {
      return this.requests.get(key)!;
    }

    // Create new request
    const request = requestFn().finally(() => {
      // Clean up after completion
      this.requests.delete(key);
    });

    this.requests.set(key, request);
    return request;
  }

  /**
   * Check if request is in flight
   */
  isInFlight(key: string): boolean {
    return this.requests.has(key);
  }

  /**
   * Cancel all in-flight requests
   */
  cancelAll(): void {
    this.requests.clear();
  }
}

/**
 * Utility functions for cache key generation
 */
export const createCacheKey = (...parts: (string | number | undefined | null)[]): string => {
  return parts
    .filter(part => part !== undefined && part !== null)
    .map(part => String(part))
    .join('__');
};

/**
 * Default cache instances for common use cases
 */
export const defaultCache = new StoreCache({ ttl: 5 * 60 * 1000 }); // 5 minutes
export const longCache = new StoreCache({ ttl: 30 * 60 * 1000 }); // 30 minutes
export const shortCache = new StoreCache({ ttl: 1 * 60 * 1000 }); // 1 minute

/**
 * Global in-flight manager
 */
export const globalInFlight = new InFlightManager();