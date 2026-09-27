# Cache Manager Utility

A reusable, generic cache management utility with TTL (Time To Live) support and in-flight request deduplication.

## Features

- **Generic Type Support**: Works with any data type
- **TTL-based Expiration**: Automatic cache invalidation based on time
- **In-flight Request Deduplication**: Prevents duplicate API calls for the same resource
- **Simple API**: Easy to use with minimal setup
- **Cache Statistics**: Monitor cache performance and usage

## Usage

### Basic Setup

```typescript
import { CacheManager } from '../utils/cacheManager';

// Create a cache manager with 5-minute TTL
const userCache = new CacheManager<User>({ ttl: 5 * 60 * 1000 });
```

### Fetching with Cache

```typescript
// The fetch method handles caching automatically
const user = await userCache.fetch('user-123', async () => {
  return await apiClient.get('/users/123');
});
```

### Manual Cache Operations

```typescript
// Check if cache is valid
if (userCache.isValid('user-123')) {
  const cachedUser = userCache.get('user-123');
}

// Set cache manually
userCache.set('user-123', userData);

// Clear specific cache entry
userCache.clear('user-123');

// Clear all cache
userCache.clear();
```

### Composite Cache Keys

For caching data that depends on multiple identifiers:

```typescript
import { createCacheKey } from '../utils/cacheManager';

const cacheKey = createCacheKey(inwardId, gaugeId);
const data = await cache.fetch(cacheKey, fetchFunction);
```

### Cache Statistics

```typescript
const stats = cache.getStats();
console.log(stats);
// {
//   size: 10,
//   validEntries: 8,
//   expiredEntries: 2,
//   inFlightRequests: 1
// }
```

## API Reference

### CacheManager Class

#### Constructor

```typescript
new CacheManager<T>(config: CacheConfig)
```

- `config.ttl`: Time to live in milliseconds

#### Methods

- `isValid(key: string): boolean` - Check if cache entry is valid
- `get(key: string): T | null` - Get cached data if valid
- `set(key: string, data: T | null): void` - Set cache data
- `clear(key?: string): void` - Clear cache (specific or all)
- `fetch(key: string, fetcher: () => Promise<T | null>, options?: { skipCache?: boolean }): Promise<T | null>` - Fetch with automatic caching
- `getStats()` - Get cache statistics

### Helper Functions

- `createCacheKey(...parts): string` - Create composite cache key
- `isCacheEntryValid(timestamp: number | null, ttl: number): boolean` - Check timestamp validity

## Example: Store Integration

```typescript
import { CacheManager, createCacheKey } from '../utils/cacheManager';

// Initialize cache managers
const gaugeCache = new CacheManager<Gauge>({ ttl: 5 * 60 * 1000 });

// In your store
export const useMyStore = create((set, get) => ({
  fetchGauge: async (gaugeId: string) => {
    try {
      const result = await gaugeCache.fetch(gaugeId, async () => {
        return await apiClient.get(`/gauges/${gaugeId}`);
      });
      return result;
    } catch (error) {
      console.error('Error fetching gauge:', error);
      return null;
    }
  },
  
  clearCache: (gaugeId?: string) => {
    gaugeCache.clear(gaugeId);
  }
}));
```

## Benefits

1. **Reduced API Calls**: Cached data prevents unnecessary network requests
2. **Better Performance**: Instant data retrieval from cache
3. **Request Deduplication**: Multiple simultaneous requests for the same resource are merged
4. **Automatic Cleanup**: TTL-based expiration keeps cache fresh
5. **Reusable**: Use across different stores and components
6. **Type-Safe**: Full TypeScript support with generics

## Best Practices

1. Set appropriate TTL based on data freshness requirements
2. Use composite keys for multi-parameter caching
3. Clear cache when data is mutated
4. Monitor cache statistics in development
5. Handle cache misses gracefully
