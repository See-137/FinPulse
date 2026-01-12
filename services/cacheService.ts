/**
 * Cache Service
 *
 * Provides in-memory caching with TTL support to reduce API calls.
 * Falls back to in-memory cache if Redis is not available.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private readonly defaultTTL: number = 300000; // 5 minutes

  constructor() {
    this.cache = new Map();
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttlMs;

    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get or set pattern: fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const data = await fn();

    // Cache result
    await this.set(key, data, ttlSeconds);

    return data;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`🗑️  Cache cleanup: removed ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: active,
      expiredEntries: expired,
    };
  }
}

// Singleton instance
const cacheService = new CacheService();

/**
 * Generate cache key for whale data
 */
export function getWhaleDataCacheKey(symbol: string): string {
  return `whale:${symbol}`;
}

/**
 * Generate cache key for sentiment data
 */
export function getSentimentCacheKey(symbol: string, hours: number = 24): string {
  return `sentiment:${symbol}:${hours}h`;
}

/**
 * Generate cache key for technical data
 */
export function getTechnicalCacheKey(symbol: string, timeframe: string = '1h'): string {
  return `technical:${symbol}:${timeframe}`;
}

/**
 * Generate cache key for influencer tweets
 */
export function getInfluencerTweetsCacheKey(username: string, hours: number = 24): string {
  return `tweets:${username}:${hours}h`;
}

export { cacheService };
export default cacheService;
