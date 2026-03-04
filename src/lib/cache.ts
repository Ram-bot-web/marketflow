/**
 * Caching utilities
 * Provides in-memory caching with TTL support
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
  timestamp: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, {
      data,
      expiry,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cached value
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    this.cleanup();
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Create singleton instance
export const cache = new Cache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  client: (clientId: string) => `client:${clientId}`,
  clientReports: (clientId: string) => `reports:${clientId}`,
  clientTasks: (clientId: string) => `tasks:${clientId}`,
  clientPlan: (clientId: string) => `plan:${clientId}`,
  allClients: () => 'clients:all',
  adminStats: () => 'admin:stats',
  activities: (clientId?: string) => clientId ? `activities:${clientId}` : 'activities:all',
};

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch and cache
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

/**
 * Invalidate cache by pattern
 */
export function invalidateCache(pattern: string): void {
  const stats = cache.getStats();
  stats.keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}



