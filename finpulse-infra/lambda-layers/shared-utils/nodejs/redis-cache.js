/**
 * FinPulse Redis Cache Utility
 * Provides caching layer for Lambda functions using ElastiCache Redis
 *
 * Usage:
 *   const cache = require('./redis-cache');
 *
 *   // Get from cache
 *   const data = await cache.get('market:BTC:price');
 *
 *   // Set with TTL
 *   await cache.set('market:BTC:price', priceData, 60); // 60 seconds
 *
 *   // Get or fetch pattern
 *   const data = await cache.getOrFetch('market:BTC:price', fetchFunction, 60);
 */

const Redis = require('ioredis');

// Redis connection (lazy initialized)
let redis = null;
let connectionAttempted = false;

// Configuration
// REDIS_ENDPOINT format from ElastiCache: "redis://hostname:port" or just "hostname:port"
const parseRedisEndpoint = () => {
  const endpoint = process.env.REDIS_ENDPOINT || process.env.REDIS_HOST || '';
  if (!endpoint) return { host: 'localhost', port: 6379 };

  // Handle "hostname:port" format
  if (endpoint.includes(':') && !endpoint.startsWith('redis://')) {
    const [host, port] = endpoint.split(':');
    return { host, port: parseInt(port) || 6379 };
  }

  // Handle "redis://hostname:port" format
  if (endpoint.startsWith('redis://')) {
    const url = new URL(endpoint);
    return { host: url.hostname, port: parseInt(url.port) || 6379 };
  }

  // Just hostname
  return { host: endpoint, port: 6379 };
};

const { host, port } = parseRedisEndpoint();

const REDIS_CONFIG = {
  host,
  port,
  connectTimeout: 5000,
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    if (times > 2) return null; // Stop retrying after 2 attempts
    return Math.min(times * 100, 1000);
  },
  lazyConnect: true,
};

// Default TTLs (in seconds)
const TTL = {
  MARKET_DATA: 60,          // 1 minute for market prices
  PORTFOLIO: 300,           // 5 minutes for portfolio data
  NEWS: 600,                // 10 minutes for news
  USER_SESSION: 3600,       // 1 hour for session data
  AI_RESPONSE: 1800,        // 30 minutes for AI responses
  RATE_LIMIT: 60,           // 1 minute for rate limiting
};

/**
 * Initialize Redis connection
 * @returns {Redis|null} Redis client or null if connection failed
 */
async function getClient() {
  if (redis) return redis;
  if (connectionAttempted && !redis) return null;

  connectionAttempted = true;

  // Skip Redis in local development if not configured
  if (!process.env.REDIS_ENDPOINT && !process.env.REDIS_HOST) {
    console.log('Redis not configured, using fallback caching');
    return null;
  }

  try {
    redis = new Redis(REDIS_CONFIG);

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    await redis.connect();
    return redis;
  } catch (error) {
    console.error('Failed to connect to Redis:', error.message);
    redis = null;
    return null;
  }
}

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
async function get(key) {
  const client = await getClient();
  if (!client) return null;

  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Cache get error for ${key}:`, error.message);
    return null;
  }
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Promise<boolean>} Success status
 */
async function set(key, value, ttl = 300) {
  const client = await getClient();
  if (!client) return false;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Cache set error for ${key}:`, error.message);
    return false;
  }
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function del(key) {
  const client = await getClient();
  if (!client) return false;

  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for ${key}:`, error.message);
    return false;
  }
}

/**
 * Get or fetch pattern - returns cached value or fetches and caches new value
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fetched data
 */
async function getOrFetch(key, fetchFn, ttl = 300) {
  // Try to get from cache first
  const cached = await get(key);
  if (cached !== null) {
    return { data: cached, fromCache: true };
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  await set(key, data, ttl);

  return { data, fromCache: false };
}

/**
 * Increment a counter (useful for rate limiting)
 * @param {string} key - Counter key
 * @param {number} ttl - TTL for the counter
 * @returns {Promise<number>} New counter value
 */
async function incr(key, ttl = 60) {
  const client = await getClient();
  if (!client) return 1;

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ttl);
    }
    return count;
  } catch (error) {
    console.error(`Cache incr error for ${key}:`, error.message);
    return 1;
  }
}

/**
 * Check rate limit
 * @param {string} identifier - User/IP identifier
 * @param {number} limit - Max requests allowed
 * @param {number} window - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
async function checkRateLimit(identifier, limit = 100, window = 60) {
  const key = `ratelimit:${identifier}`;
  const count = await incr(key, window);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetIn: window,
  };
}

/**
 * Execute Redis multi/pipeline for atomic operations
 * @returns {Pipeline|null} Redis pipeline or null if not connected
 */
async function multi() {
  const client = await getClient();
  if (!client) return null;
  return client.multi();
}

/**
 * Get TTL for a key
 * @param {string} key - Cache key
 * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if key doesn't exist
 */
async function ttl(key) {
  const client = await getClient();
  if (!client) return -2;

  try {
    return await client.ttl(key);
  } catch (error) {
    console.error(`Cache TTL error for ${key}:`, error.message);
    return -2;
  }
}

/**
 * Cache key generators for consistent naming
 */
const keys = {
  marketPrice: (symbol) => `market:${symbol}:price`,
  marketPrices: (type) => `market:prices:${type}`,
  portfolio: (userId) => `portfolio:${userId}`,
  news: (category) => `news:${category || 'all'}`,
  aiResponse: (queryHash) => `ai:response:${queryHash}`,
  userSession: (userId) => `session:${userId}`,
  rateLimit: (identifier, endpoint) => `ratelimit:${identifier}:${endpoint}`,
};

/**
 * Close Redis connection (for graceful shutdown)
 */
async function close() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

module.exports = {
  get,
  set,
  del,
  getOrFetch,
  incr,
  checkRateLimit,
  multi,
  ttl,
  keys,
  close,
  TTL,
  getClient,
};
