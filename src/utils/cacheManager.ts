/**
 * Generic Cache Manager Utility
 * Provides reusable caching functionality with TTL support and in-flight request deduplication
 */

export interface CacheEntry<T> {
  data: T | null;
  timestamp: number | null;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
}

export class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private inFlightRequests: Map<string, Promise<T | null>> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Check if a cache entry is valid based on TTL
   */
  isValid(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry || !entry.timestamp) return false;
    return (Date.now() - entry.timestamp) < this.config.ttl;
  }

  /**
   * Get cached data if valid
   */
  get(key: string): T | null {
    if (this.isValid(key)) {
      const entry = this.cache.get(key);
      return entry?.data ?? null;
    }
    return null;
  }

  /**
   * Set cache data with current timestamp
   */
  set(key: string, data: T | null): void {
    this.cache.set(key, {
      data,
      timestamp: data ? Date.now() : null
    });
  }

  /**
   * Clear specific cache entry or all entries
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.inFlightRequests.delete(key);
    } else {
      this.cache.clear();
      this.inFlightRequests.clear();
    }
  }

  /**
   * Get or set in-flight request to prevent duplicate API calls
   */
  getInFlight(key: string): Promise<T | null> | undefined {
    return this.inFlightRequests.get(key);
  }

  /**
   * Set in-flight request
   */
  setInFlight(key: string, promise: Promise<T | null>): void {
    this.inFlightRequests.set(key, promise);
  }

  /**
   * Remove in-flight request
   */
  clearInFlight(key: string): void {
    this.inFlightRequests.delete(key);
  }

  /**
   * Execute a fetch operation with caching and deduplication
   */
  async fetch(
    key: string,
    fetcher: () => Promise<T | null>,
    options?: { skipCache?: boolean }
  ): Promise<T | null> {
    // Check cache first unless skipCache is true
    if (!options?.skipCache) {
      const cached = this.get(key);
      if (cached !== null) {
        console.log(`[CacheManager] Using cached data for key: ${key}`);
        return cached;
      }
    }

    // Check for in-flight request
    const inFlight = this.getInFlight(key);
    if (inFlight) {
      console.log(`[CacheManager] Reusing in-flight request for key: ${key}`);
      return inFlight;
    }

    // Create new request
    const promise = (async (): Promise<T | null> => {
      try {
        console.log(`[CacheManager] Fetching data for key: ${key}`);
        const data = await fetcher();
        this.set(key, data);
        return data;
      } catch (error) {
        console.error(`[CacheManager] Error fetching data for key: ${key}`, error);
        this.set(key, null);
        throw error;
      } finally {
        this.clearInFlight(key);
      }
    })();

    this.setInFlight(key, promise);
    return promise;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    validEntries: number;
    expiredEntries: number;
    inFlightRequests: number;
  } {
    const keys = this.getKeys();
    const validEntries = keys.filter(key => this.isValid(key)).length;
    
    return {
      size: this.cache.size,
      validEntries,
      expiredEntries: this.cache.size - validEntries,
      inFlightRequests: this.inFlightRequests.size
    };
  }
}

/**
 * Create a composite cache key from multiple parts
 */
export const createCacheKey = (...parts: (string | number | undefined | null)[]): string => {
  return parts.filter(Boolean).join('__');
};

/**
 * Helper to check if a timestamp is valid based on TTL
 */
export const isCacheEntryValid = (timestamp: number | null, ttl: number): boolean => {
  if (!timestamp) return false;
  return (Date.now() - timestamp) < ttl;
};
