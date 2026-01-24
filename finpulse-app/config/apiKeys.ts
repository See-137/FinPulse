/**
 * Centralized API Key Management
 *
 * This module provides secure access to API keys from environment variables
 * with validation and fallback to mock mode when keys are missing.
 */

interface ApiConfig {
  // Whale Data
  whaleAlert: {
    apiKey: string | null;
    enabled: boolean;
  };

  // Social Sentiment
  twitter: {
    bearerToken: string | null;
    enabled: boolean;
  };

  openai: {
    apiKey: string | null;
    enabled: boolean;
  };

  // Technical Analysis
  binance: {
    apiKey: string | null;
    secretKey: string | null;
    enabled: boolean;
  };

  coinGecko: {
    apiKey: string | null;
    enabled: boolean;
  };

  // Feature Flags
  features: {
    liveWhaleData: boolean;
    liveSentiment: boolean;
    liveTechnical: boolean;
  };

  // Caching
  cache: {
    whaleDataTTL: number;
    sentimentTTL: number;
    technicalTTL: number;
    redisUrl: string | null;
  };

  // Rate Limiting
  rateLimits: {
    whaleAlert: number;
    twitter: number;
    openai: number;
  };
}

/**
 * Get environment variable with fallback (Vite compatible)
 */
function getEnv(key: string, defaultValue: string | null = null): string | null {
  // Vite exposes env vars via import.meta.env
  // VITE_* prefixed vars are exposed to client
  const viteKey = key.replace('NEXT_PUBLIC_', 'VITE_');
  const value = (import.meta.env as Record<string, string | undefined>)[viteKey];
  return value || defaultValue;
}

/**
 * Get boolean environment variable
 */
function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = getEnv(key);
  if (value === null) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = getEnv(key);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate API configuration and warn about missing keys
 */
function validateConfig(config: ApiConfig): void {
  const warnings: string[] = [];

  // Check whale data
  if (config.features.liveWhaleData && !config.whaleAlert.apiKey) {
    warnings.push('Whale Alert API key missing - falling back to mock data');
  }

  // Check sentiment
  if (config.features.liveSentiment) {
    if (!config.twitter.bearerToken) {
      warnings.push('Twitter Bearer Token missing - sentiment analysis disabled');
    }
    if (!config.openai.apiKey) {
      warnings.push('OpenAI API key missing - using basic sentiment analysis');
    }
  }

  // Check technical
  if (config.features.liveTechnical && !config.binance.enabled && !config.coinGecko.enabled) {
    warnings.push('No technical data API configured - falling back to mock data');
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('⚠️  API Configuration Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('   → See .env.local.example for required environment variables');
  }
}

/**
 * Load and validate API configuration
 */
export const apiConfig: ApiConfig = {
  whaleAlert: {
    apiKey: getEnv('WHALE_ALERT_API_KEY'),
    enabled: !!getEnv('WHALE_ALERT_API_KEY'),
  },

  twitter: {
    bearerToken: getEnv('TWITTER_BEARER_TOKEN'),
    enabled: !!getEnv('TWITTER_BEARER_TOKEN'),
  },

  openai: {
    apiKey: getEnv('OPENAI_API_KEY'),
    enabled: !!getEnv('OPENAI_API_KEY'),
  },

  binance: {
    apiKey: getEnv('BINANCE_API_KEY'),
    secretKey: getEnv('BINANCE_SECRET_KEY'),
    enabled: true, // Public endpoints don't require keys
  },

  coinGecko: {
    apiKey: getEnv('COINGECKO_API_KEY'),
    enabled: true, // Free tier doesn't require key
  },

  features: {
    liveWhaleData: getBoolEnv('VITE_ENABLE_LIVE_WHALE_DATA', true), // Enable live data by default
    liveSentiment: getBoolEnv('VITE_ENABLE_LIVE_SENTIMENT', true),  // Enable live data by default
    liveTechnical: getBoolEnv('VITE_ENABLE_LIVE_TECHNICAL', true),  // Enable live data by default
  },

  cache: {
    whaleDataTTL: getNumberEnv('CACHE_TTL_WHALE_DATA', 300), // 5 min default
    sentimentTTL: getNumberEnv('CACHE_TTL_SENTIMENT', 900),   // 15 min default
    technicalTTL: getNumberEnv('CACHE_TTL_TECHNICAL', 60),    // 1 min default
    redisUrl: getEnv('REDIS_URL'),
  },

  rateLimits: {
    whaleAlert: getNumberEnv('RATE_LIMIT_WHALE_ALERT', 25),  // 25/min
    twitter: getNumberEnv('RATE_LIMIT_TWITTER', 400),          // 400/15min
    openai: getNumberEnv('RATE_LIMIT_OPENAI', 500),            // 500/min
  },
};

// Validate configuration on module load
validateConfig(apiConfig);

/**
 * Check if mock mode is active (no live data)
 */
export function isMockMode(): boolean {
  return (
    !apiConfig.features.liveWhaleData &&
    !apiConfig.features.liveSentiment &&
    !apiConfig.features.liveTechnical
  );
}

/**
 * Get API status summary
 */
export function getApiStatus() {
  return {
    whaleData: apiConfig.features.liveWhaleData && apiConfig.whaleAlert.enabled ? 'live' : 'mock',
    sentiment: apiConfig.features.liveSentiment && apiConfig.twitter.enabled ? 'live' : 'mock',
    technical: apiConfig.features.liveTechnical ? 'live' : 'mock',
    mockMode: isMockMode(),
  };
}

export default apiConfig;
