/**
 * FinPulse Distributed Rate Limiter
 * Provides Redis-based rate limiting across all Lambda instances
 *
 * Uses sliding window algorithm with Redis sorted sets for accurate
 * rate limiting that works across distributed Lambda instances.
 *
 * Usage:
 *   const { checkRateLimit } = require('./rate-limiter');
 *
 *   const result = await checkRateLimit(userId, 'api:portfolio', 60, 60);
 *   if (!result.allowed) {
 *     return { statusCode: 429, body: 'Too many requests' };
 *   }
 */

const redisCache = require('./redis-cache');

// Default rate limit configurations per action type
const RATE_LIMITS = {
  // API endpoints
  'api:auth': { maxRequests: 10, windowSeconds: 60 },      // 10 req/min for auth
  'api:portfolio': { maxRequests: 60, windowSeconds: 60 }, // 60 req/min for portfolio
  'api:market': { maxRequests: 120, windowSeconds: 60 },   // 120 req/min for market data
  'api:ai': { maxRequests: 20, windowSeconds: 60 },        // 20 req/min for AI
  'api:community': { maxRequests: 30, windowSeconds: 60 }, // 30 req/min for community

  // Specific actions
  'action:login': { maxRequests: 5, windowSeconds: 300 },      // 5 attempts per 5 min
  'action:signup': { maxRequests: 3, windowSeconds: 300 },     // 3 signups per 5 min
  'action:password-reset': { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour
  'action:post': { maxRequests: 10, windowSeconds: 3600 },     // 10 posts per hour
  'action:comment': { maxRequests: 30, windowSeconds: 3600 },  // 30 comments per hour

  // Default
  'default': { maxRequests: 60, windowSeconds: 60 },
};

/**
 * Check rate limit using Redis (distributed, sliding window)
 *
 * @param {string} identifier - User ID, IP address, or other unique identifier
 * @param {string} action - Action type (e.g., 'api:portfolio', 'action:login')
 * @param {number} maxRequests - Maximum requests allowed in window (optional, uses defaults)
 * @param {number} windowSeconds - Time window in seconds (optional, uses defaults)
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfter?: number, resetAt?: Date}>}
 */
async function checkRateLimit(identifier, action, maxRequests = null, windowSeconds = null) {
  // Get default limits for this action if not specified
  const limits = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const max = maxRequests ?? limits.maxRequests;
  const window = windowSeconds ?? limits.windowSeconds;

  const key = `ratelimit:${action}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - window;

  try {
    const redis = await redisCache.getClient();

    // If Redis is not available, fall back to allowing the request
    // (better to allow than block everyone when Redis is down)
    if (!redis) {
      console.warn('[RateLimiter] Redis not available, allowing request');
      return {
        allowed: true,
        remaining: max - 1,
        distributed: false,
      };
    }

    // Use Redis pipeline for atomic operations
    const pipeline = redis.multi();

    // Remove entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Add current request with timestamp as score
    // Use random suffix to allow multiple requests at same timestamp
    pipeline.zadd(key, now, `${now}-${Math.random().toString(36).substr(2, 9)}`);

    // Count requests in current window
    pipeline.zcard(key);

    // Set key expiry (clean up old keys)
    pipeline.expire(key, window + 1);

    const results = await pipeline.exec();

    // zcard result is at index 2, value is second element
    const requestCount = results[2][1];

    if (requestCount > max) {
      // Get oldest request in window to calculate retry time
      const oldestRequests = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestRequests.length >= 2 ? parseInt(oldestRequests[1]) : now;
      const retryAfter = Math.max(1, (oldestTimestamp + window) - now);

      console.log(`[RateLimiter] BLOCKED ${identifier} on ${action}: ${requestCount}/${max} requests`);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        resetAt: new Date((now + retryAfter) * 1000),
        distributed: true,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, max - requestCount),
      resetAt: new Date((now + window) * 1000),
      distributed: true,
    };
  } catch (error) {
    console.error('[RateLimiter] Redis error, allowing request:', error.message);

    // On error, allow request but log it
    return {
      allowed: true,
      remaining: max - 1,
      error: error.message,
      distributed: false,
    };
  }
}

/**
 * Check rate limit and return 429 response if blocked
 * Convenience wrapper for Lambda handlers
 *
 * @param {object} event - Lambda event
 * @param {string} action - Action type
 * @param {string} identifier - User/IP identifier (if null, extracts from event)
 * @returns {Promise<{blocked: boolean, response?: object}>}
 */
async function checkRateLimitForRequest(event, action, identifier = null) {
  // Extract identifier from event if not provided
  const id = identifier ||
    event.requestContext?.authorizer?.claims?.sub ||
    event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.requestContext?.identity?.sourceIp ||
    'anonymous';

  const result = await checkRateLimit(id, action);

  if (!result.allowed) {
    return {
      blocked: true,
      response: {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter || 60),
          'X-RateLimit-Limit': String(RATE_LIMITS[action]?.maxRequests || 60),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt?.toISOString() || '',
        },
        body: JSON.stringify({
          success: false,
          error: 'Too many requests',
          retryAfter: result.retryAfter,
          message: `Rate limit exceeded for ${action}. Please try again in ${result.retryAfter} seconds.`,
        }),
      },
    };
  }

  return {
    blocked: false,
    remaining: result.remaining,
  };
}

/**
 * Get current rate limit status for an identifier
 * Useful for debugging or showing users their remaining quota
 *
 * @param {string} identifier - User ID or IP
 * @param {string} action - Action type
 * @returns {Promise<{count: number, remaining: number, resetAt: Date}>}
 */
async function getRateLimitStatus(identifier, action) {
  const limits = RATE_LIMITS[action] || RATE_LIMITS['default'];
  const key = `ratelimit:${action}:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - limits.windowSeconds;

  try {
    const redis = await redisCache.getClient();
    if (!redis) {
      return { count: 0, remaining: limits.maxRequests, resetAt: null };
    }

    // Clean up and count in one go
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    return {
      count,
      remaining: Math.max(0, limits.maxRequests - count),
      resetAt: new Date((now + limits.windowSeconds) * 1000),
      limit: limits.maxRequests,
      window: limits.windowSeconds,
    };
  } catch (error) {
    console.error('[RateLimiter] Status check error:', error.message);
    return { count: 0, remaining: limits.maxRequests, resetAt: null, error: error.message };
  }
}

/**
 * Reset rate limit for an identifier (admin use)
 *
 * @param {string} identifier - User ID or IP
 * @param {string} action - Action type
 * @returns {Promise<boolean>} Success status
 */
async function resetRateLimit(identifier, action) {
  const key = `ratelimit:${action}:${identifier}`;

  try {
    const redis = await redisCache.getClient();
    if (!redis) return false;

    await redis.del(key);
    console.log(`[RateLimiter] Reset rate limit for ${identifier} on ${action}`);
    return true;
  } catch (error) {
    console.error('[RateLimiter] Reset error:', error.message);
    return false;
  }
}

/**
 * Add rate limit headers to response
 *
 * @param {object} headers - Existing headers object
 * @param {string} action - Action type
 * @param {number} remaining - Remaining requests
 * @param {Date} resetAt - Reset time
 * @returns {object} Headers with rate limit info
 */
function addRateLimitHeaders(headers, action, remaining, resetAt) {
  const limits = RATE_LIMITS[action] || RATE_LIMITS['default'];

  return {
    ...headers,
    'X-RateLimit-Limit': String(limits.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
    'X-RateLimit-Reset': resetAt ? resetAt.toISOString() : '',
  };
}

module.exports = {
  // Core rate limiting
  checkRateLimit,
  checkRateLimitForRequest,

  // Status and management
  getRateLimitStatus,
  resetRateLimit,

  // Helpers
  addRateLimitHeaders,

  // Configuration
  RATE_LIMITS,
};
