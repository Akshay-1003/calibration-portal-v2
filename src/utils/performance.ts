/**
 * Performance Utilities
 * Helper functions for performance monitoring and optimization
 */

// Preload critical resources
export const preloadCriticalResources = () => {
  const criticalRoutes = ['/dashboard', '/transactions/inward', '/masters/party-master'];
  
  criticalRoutes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
};

// Measure component render performance
export const measureRenderTime = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    console.log(`${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  };
};

// Debounced navigation to prevent rapid clicks
export const debounceNavigation = (callback: () => void, delay: number = 300) => {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

// Memory usage monitoring
export const checkMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    };
  }
  return null;
};
