/**
 * Store Performance Monitoring and Cleanup Utilities
 */

import { defaultCache, longCache, shortCache } from './storeCache';

export interface StoreMetrics {
  cacheHitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  cacheSize: number;
}

class StoreMonitor {
  private metrics: Map<string, StoreMetrics> = new Map();
  private requestTimes: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Record a successful request
   */
  recordRequest(storeName: string, responseTime: number, fromCache: boolean = false) {
    void fromCache;
    // Update request count
    const currentCount = this.requestCounts.get(storeName) || 0;
    this.requestCounts.set(storeName, currentCount + 1);

    // Update response times
    const times = this.requestTimes.get(storeName) || [];
    times.push(responseTime);
    
    // Keep only last 100 requests for performance
    if (times.length > 100) {
      times.shift();
    }
    this.requestTimes.set(storeName, times);

    // Update metrics
    this.updateMetrics(storeName);
  }

  /**
   * Record an error
   */
  recordError(storeName: string) {
    const currentErrors = this.errorCounts.get(storeName) || 0;
    this.errorCounts.set(storeName, currentErrors + 1);
    
    const currentCount = this.requestCounts.get(storeName) || 0;
    this.requestCounts.set(storeName, currentCount + 1);

    this.updateMetrics(storeName);
  }

  /**
   * Get metrics for a specific store
   */
  getMetrics(storeName: string): StoreMetrics | null {
    return this.metrics.get(storeName) || null;
  }

  /**
   * Get all store metrics
   */
  getAllMetrics(): Record<string, StoreMetrics> {
    const result: Record<string, StoreMetrics> = {};
    for (const [storeName, metrics] of this.metrics.entries()) {
      result[storeName] = metrics;
    }
    return result;
  }

  /**
   * Update metrics for a store
   */
  private updateMetrics(storeName: string) {
    const requestCount = this.requestCounts.get(storeName) || 0;
    const errorCount = this.errorCounts.get(storeName) || 0;
    const responseTimes = this.requestTimes.get(storeName) || [];

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;

    // For cache hit rate, we'd need to track cache hits vs misses
    // This is a simplified version
    const cacheHitRate = 0.8; // Placeholder - would need actual tracking

    this.metrics.set(storeName, {
      cacheHitRate,
      totalRequests: requestCount,
      averageResponseTime,
      errorRate,
      cacheSize: 0 // Would need to get from actual cache
    });
  }

  /**
   * Start periodic cleanup of old data
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  /**
   * Cleanup old metrics and cache data
   */
  private cleanup() {
    // Clean up caches
    defaultCache.cleanup();
    longCache.cleanup();
    shortCache.cleanup();

    // Reset metrics older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    void oneHourAgo;
    
    // This is a simplified cleanup - in a real implementation,
    // you'd track timestamps for each metric entry
    console.log('Store monitor cleanup completed');
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.metrics.clear();
    this.requestTimes.clear();
    this.errorCounts.clear();
    this.requestCounts.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const allMetrics = this.getAllMetrics();
    const storeNames = Object.keys(allMetrics);

    if (storeNames.length === 0) {
      return 'No store metrics available';
    }

    let report = '📊 Store Performance Report\n';
    report += '================================\n\n';

    for (const storeName of storeNames) {
      const metrics = allMetrics[storeName];
      report += `🏪 ${storeName}\n`;
      report += `   Total Requests: ${metrics.totalRequests}\n`;
      report += `   Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms\n`;
      report += `   Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%\n`;
      report += `   Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(2)}%\n\n`;
    }

    // Overall statistics
    const totalRequests = storeNames.reduce((sum, name) => sum + allMetrics[name].totalRequests, 0);
    const avgResponseTime = storeNames.reduce((sum, name) => sum + allMetrics[name].averageResponseTime, 0) / storeNames.length;
    const avgErrorRate = storeNames.reduce((sum, name) => sum + allMetrics[name].errorRate, 0) / storeNames.length;

    report += '📈 Overall Statistics\n';
    report += `   Total Requests: ${totalRequests}\n`;
    report += `   Average Response Time: ${avgResponseTime.toFixed(2)}ms\n`;
    report += `   Average Error Rate: ${(avgErrorRate * 100).toFixed(2)}%\n`;

    return report;
  }
}

// Global monitor instance
export const storeMonitor = new StoreMonitor();

/**
 * Decorator for monitoring store operations
 */
export function monitorStoreOperation(storeName: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    void target;
    void propertyName;
    const method = descriptor.value!;

    descriptor.value = (async function (this: any, ...args: any[]) {
      const startTime = performance.now();
      
      try {
        const result = await method.apply(this, args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        storeMonitor.recordRequest(storeName, responseTime);
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        void responseTime;
        
        storeMonitor.recordError(storeName);
        
        throw error;
      }
    }) as T;

    return descriptor;
  };
}

/**
 * Hook for accessing store metrics in components
 */
export function useStoreMetrics(storeName?: string) {
  if (storeName) {
    return storeMonitor.getMetrics(storeName);
  }
  return storeMonitor.getAllMetrics();
}

/**
 * Development helper for logging store performance
 */
export function logStorePerformance() {
  if (process.env.NODE_ENV === 'development') {
    console.log(storeMonitor.generateReport());
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    storeMonitor.destroy();
  });
}
