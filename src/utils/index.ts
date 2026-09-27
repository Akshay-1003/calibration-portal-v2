/**
 * Utils Index
 * Central export point for utility functions
 */

// Cache Management
export {
  CacheManager,
  createCacheKey,
  isCacheEntryValid,
  type CacheEntry,
  type CacheConfig,
} from './cacheManager';

// Cache Debugging (Development only)
export {
  logCacheStats,
  getCacheDebugInfo,
  logCacheKeys,
  CacheMonitor,
  globalCacheMonitor,
  enableCacheDebugging,
  type CacheDebugInfo,
} from './cacheDebugger';

// Validation
export {
  type ValidationRule,
  type ValidationResult,
  type ValidationSchema,
  VALIDATION_PATTERNS,
  validateField,
  validateForm,
  sanitizeHtml as sanitizeHtmlValidation,
} from './validation';

// Security
export {
  sanitizeHtml,
  escapeHtml,
  sanitizeSqlInput,
  validateCSRFToken,
  generateCSRFToken,
} from './security';

// Class Name Utilities
export { cx } from './cx';

// React Component Utilities
export { isReactComponent } from './is-react-component';

// PDF Generation
export * from './pdfGenerator';
export * from './pdfTableData';
