/**
 * Rate Limiter Service
 *
 * Implements token bucket algorithm for API rate limiting with queueing support.
 * Prevents exceeding API rate limits across all external data providers.
 */

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
  queueEnabled: boolean; // Whether to queue excess requests
}

interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private tokens: number;
  private lastRefill: number;
  private queue: QueuedRequest[] = [];
  private processing: boolean = false;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.windowMs) {
      // Full refill
      this.tokens = this.config.maxRequests;
      this.lastRefill = now;
    } else {
      // Partial refill (linear)
      const refillRate = this.config.maxRequests / this.config.windowMs;
      const tokensToAdd = refillRate * elapsed;
      this.tokens = Math.min(this.config.maxRequests, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Check if a token is available
   */
  private hasToken(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  /**
   * Consume a token
   */
  private consumeToken(): boolean {
    if (this.hasToken()) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0 && this.consumeToken()) {
      const request = this.queue.shift()!;

      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;

    // Schedule next processing if queue not empty
    if (this.queue.length > 0) {
      const waitTime = Math.max(100, this.config.windowMs / this.config.maxRequests);
      setTimeout(() => this.processQueue(), waitTime);
    }
  }

  /**
   * Execute function with rate limiting
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    // Try immediate execution
    if (this.consumeToken()) {
      return await fn();
    }

    // Queue if enabled
    if (this.config.queueEnabled) {
      return new Promise<T>((resolve, reject) => {
        this.queue.push({
          fn: fn as () => Promise<any>,
          resolve,
          reject,
          timestamp: Date.now(),
        });

        this.processQueue();
      });
    }

    // Reject if queue disabled
    throw new Error(`Rate limit exceeded: ${this.config.maxRequests} requests per ${this.config.windowMs}ms`);
  }

  /**
   * Get current status
   */
  getStatus() {
    this.refillTokens();
    return {
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.config.maxRequests,
      queueLength: this.queue.length,
      windowMs: this.config.windowMs,
    };
  }
}

/**
 * Rate limiter instances for each service
 */
const rateLimiters = new Map<string, RateLimiter>();

/**
 * Get or create rate limiter for a service
 */
function getRateLimiter(service: string, config: RateLimitConfig): RateLimiter {
  if (!rateLimiters.has(service)) {
    rateLimiters.set(service, new RateLimiter(config));
  }
  return rateLimiters.get(service)!;
}

/**
 * Rate limiter configurations for each service
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  whaleAlert: {
    maxRequests: 20, // 20% safety buffer below free tier limit of 25/min
    windowMs: 60000,
    queueEnabled: true,
  },
  twitter: {
    maxRequests: 400,
    windowMs: 900000, // 400 requests per 15 minutes
    queueEnabled: true,
  },
  openai: {
    maxRequests: 500,
    windowMs: 60000,
    queueEnabled: true, // Queue AI requests during traffic spikes instead of rejecting
  },
  binance: {
    maxRequests: 1000,
    windowMs: 60000, // 1000 requests per minute
    queueEnabled: false,
  },
  coinGecko: {
    maxRequests: 45,
    windowMs: 60000, // 45 requests per minute (safe buffer for free tier)
    queueEnabled: true,
  },
};

/**
 * Throttle API call with rate limiting
 */
export async function throttle<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const config = RATE_LIMIT_CONFIGS[service];

  if (!config) {
    console.warn(`⚠️  No rate limit config for service: ${service}`);
    return await fn();
  }

  const limiter = getRateLimiter(service, config);
  return await limiter.throttle(fn);
}

/**
 * Get rate limiter status for a service
 */
export function getRateLimitStatus(service: string) {
  const limiter = rateLimiters.get(service);
  if (!limiter) {
    return null;
  }
  return limiter.getStatus();
}

/**
 * Get status for all rate limiters
 */
export function getAllRateLimitStatus() {
  const status: Record<string, any> = {};

  for (const [service, limiter] of rateLimiters.entries()) {
    status[service] = limiter.getStatus();
  }

  return status;
}

export default { throttle, getRateLimitStatus, getAllRateLimitStatus };
