/**
 * Cache Debugger Utility
 * Helper functions for debugging and monitoring cache performance
 */

import { CacheManager } from './cacheManager';

export interface CacheDebugInfo {
  name: string;
  stats: {
    size: number;
    validEntries: number;
    expiredEntries: number;
    inFlightRequests: number;
  };
  keys: string[];
}

/**
 * Debug helper to log cache statistics
 */
export const logCacheStats = (cacheName: string, cache: CacheManager): void => {
  const stats = cache.getStats();
  console.group(`📊 Cache Stats: ${cacheName}`);
  console.log('Total Entries:', stats.size);
  console.log('Valid Entries:', stats.validEntries);
  console.log('Expired Entries:', stats.expiredEntries);
  console.log('In-Flight Requests:', stats.inFlightRequests);
  console.log('Hit Rate:', stats.size > 0 ? `${((stats.validEntries / stats.size) * 100).toFixed(2)}%` : 'N/A');
  console.groupEnd();
};

/**
 * Get detailed cache information
 */
export const getCacheDebugInfo = (cacheName: string, cache: CacheManager): CacheDebugInfo => {
  return {
    name: cacheName,
    stats: cache.getStats(),
    keys: cache.getKeys()
  };
};

/**
 * Log all cache keys
 */
export const logCacheKeys = (cacheName: string, cache: CacheManager): void => {
  const keys = cache.getKeys();
  console.group(`🔑 Cache Keys: ${cacheName}`);
  console.log(`Total Keys: ${keys.length}`);
  keys.forEach((key, index) => {
    console.log(`${index + 1}. ${key}`);
  });
  console.groupEnd();
};

/**
 * Monitor cache performance over time
 */
export class CacheMonitor {
  private snapshots: Map<string, CacheDebugInfo[]> = new Map();

  takeSnapshot(cacheName: string, cache: CacheManager): void {
    const info = getCacheDebugInfo(cacheName, cache);
    
    if (!this.snapshots.has(cacheName)) {
      this.snapshots.set(cacheName, []);
    }
    
    this.snapshots.get(cacheName)!.push({
      ...info,
      stats: {
        ...info.stats,
      }
    });
  }

  getSnapshots(cacheName: string): CacheDebugInfo[] {
    return this.snapshots.get(cacheName) || [];
  }

  logHistory(cacheName: string): void {
    const history = this.getSnapshots(cacheName);
    
    if (history.length === 0) {
      console.log(`No history for cache: ${cacheName}`);
      return;
    }

    console.group(`📈 Cache History: ${cacheName}`);
    history.forEach((snapshot, index) => {
      console.log(`\nSnapshot ${index + 1}:`);
      console.log('  Size:', snapshot.stats.size);
      console.log('  Valid:', snapshot.stats.validEntries);
      console.log('  Expired:', snapshot.stats.expiredEntries);
      console.log('  In-Flight:', snapshot.stats.inFlightRequests);
    });
    console.groupEnd();
  }

  clear(cacheName?: string): void {
    if (cacheName) {
      this.snapshots.delete(cacheName);
    } else {
      this.snapshots.clear();
    }
  }
}

/**
 * Global cache monitor instance
 */
export const globalCacheMonitor = new CacheMonitor();

/**
 * Enable cache debugging in development
 */
export const enableCacheDebugging = (caches: Record<string, CacheManager>): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Add to window for console access
  (window as any).__CACHE_DEBUG__ = {
    caches,
    logStats: (cacheName: string) => {
      const cache = caches[cacheName];
      if (cache) {
        logCacheStats(cacheName, cache);
      } else {
        console.error(`Cache not found: ${cacheName}`);
      }
    },
    logKeys: (cacheName: string) => {
      const cache = caches[cacheName];
      if (cache) {
        logCacheKeys(cacheName, cache);
      } else {
        console.error(`Cache not found: ${cacheName}`);
      }
    },
    clearCache: (cacheName: string) => {
      const cache = caches[cacheName];
      if (cache) {
        cache.clear();
        console.log(`✅ Cleared cache: ${cacheName}`);
      } else {
        console.error(`Cache not found: ${cacheName}`);
      }
    },
    listCaches: () => {
      console.log('Available caches:', Object.keys(caches));
    }
  };

  console.log('🔍 Cache debugging enabled. Use window.__CACHE_DEBUG__ to access cache utilities.');
};
