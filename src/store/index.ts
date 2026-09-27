/**
 * Centralized Store Management
 * This file exports all stores and provides a unified interface
 */

import { logStorePerformance } from '../utils/storeMonitor';
import { shortCache, longCache, defaultCache } from '../utils/storeCache';

// Export unified app store
export { useAppStore, useOrganizations, useInwardEntries, useLinkedGauges, useCertificateTypes } from './appStore';

// Export optimized stores
export { useInwardGaugeStore } from './inwardGaugeStore';
export { useCustomerFormStore } from './customerStore';
export { useCertificateStore } from './certificateStore';

// Export base store utilities
export { createBaseStore, createCrudStore, createSelectors, useStoreSlice, arrayUtils, performanceUtils } from './baseStore';

// Export cache utilities
export { StoreCache, InFlightManager, createCacheKey, defaultCache, longCache, shortCache } from '../utils/storeCache';

// Export CRUD utilities
export { createCrudActions, normalizeApiResponse, BatchOperations } from '../utils/storeCrud';

// Export monitoring utilities
export { storeMonitor, useStoreMetrics, logStorePerformance } from '../utils/storeMonitor';

// Re-export types from unified store
export type { Organization, InwardEntry, LinkedGauge, CertificateType, CalibrationCertificate } from './appStore';

// Store configuration
export const STORE_CONFIG = {
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  LONG_CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
  SHORT_CACHE_DURATION: 1 * 60 * 1000, // 1 minute
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Pagination settings
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Performance settings
  MAX_CACHE_SIZE: 1000,
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const;

// Store utilities
export const createStoreSelector = <T>(selector: (state: any) => T) => selector;

// Enhanced store middleware for logging (development only)
export const createStoreLogger = (storeName: string) => {
  if (import.meta.env?.DEV) {
    return (action: string, payload?: any) => {
      const timestamp = new Date().toISOString();
      console.group(`🏪 [${storeName}] ${action} - ${timestamp}`);
      
      if (payload) {
        console.log('Payload:', payload);
      }
      
      // Log cache stats if available
      try {
        const cacheStats = defaultCache.getStats();
        console.log('Cache Stats:', cacheStats);
      } catch (e) {
        // Cache stats not available
      }
      
      console.groupEnd();
    };
  }
  return () => {};
};

/**
 * Global store cleanup utility
 * Call this when the app is unmounting or on route changes
 */
export const cleanupAllStores = () => {
  defaultCache.cleanup();
  longCache.cleanup();
  shortCache.cleanup();
  
  if (process.env.NODE_ENV === 'development') {
    logStorePerformance();
  }
};

/**
 * Development helper to inspect all store states
 */
export const inspectStores = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔍 Store Inspector');
    
    // Log cache statistics
    console.log('Default Cache Stats:', defaultCache.getStats());
    console.log('Long Cache Stats:', longCache.getStats());
    console.log('Short Cache Stats:', shortCache.getStats());
    
    // Log performance metrics
    logStorePerformance();
    
    console.groupEnd();
  }
};
