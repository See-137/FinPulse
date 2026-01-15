/**
 * FinPulse Multi-Tier Cache Manager
 * Implements intelligent caching strategy: Redis (hot) → DynamoDB (warm) → API (miss)
 * 
 * Features:
 * - Multi-tier caching with automatic fallback
 * - Market-aware TTL (different during market hours vs after)
 * - Quota tracking and management
 * - Batch operation support
 * - Emergency cache-only mode
 * 
 * Usage:
 *   const cacheManager = require('./cache-manager');
 *   const data = await cacheManager.getQuote('AAPL');
 *   await cacheManager.setQuote('AAPL', priceData);
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, BatchWriteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Try to load Redis cache (may not be available in all environments)
let redisCache = null;
try {
  redisCache = require('./redis-cache');
} catch (e) {
  console.log('Redis cache not available, using DynamoDB-only caching');
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

// Environment and table configuration
const ENV = process.env.ENVIRONMENT || 'prod';
const TABLES = {
  API_CACHE: process.env.API_CACHE_TABLE || `finpulse-api-cache-${ENV}`,
  HISTORICAL_PRICES: process.env.HISTORICAL_PRICES_TABLE || `finpulse-historical-prices-${ENV}`,
  API_QUOTA: process.env.API_QUOTA_TABLE || `finpulse-api-quota-${ENV}`,
  MARKET_PRICES: process.env.MARKET_PRICES_TABLE || `finpulse-market-prices-${ENV}`,
};

// =============================================================================
// TTL Configuration (in seconds)
// =============================================================================

const TTL_CONFIG = {
  // Real-time data
  QUOTE_MARKET_OPEN: 300,      // 5 minutes during market hours
  QUOTE_MARKET_CLOSED: 57600,  // 16 hours after close
  QUOTE_CRYPTO: 60,            // 1 minute for crypto (24/7 markets)
  
  // Daily data
  EOD_PRICES: 86400,           // 24 hours
  NEWS: 3600,                  // 1 hour
  
  // Periodic data
  COMPANY_PROFILE: 2592000,    // 30 days
  FINANCIAL_STATEMENTS: 7776000, // 90 days
  SEC_FILINGS: 15552000,       // 180 days
  
  // Static data
  HISTORICAL_PRICES: null,     // Never expire (stored in DynamoDB)
  SYMBOL_DIRECTORY: 604800,    // 7 days
};

// =============================================================================
// Market Hours Detection (US Markets)
// =============================================================================

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM Eastern Time
 */
function isMarketOpen() {
  const now = new Date();
  
  // Get Eastern Time (handles DST automatically)
  const etOptions = { timeZone: 'America/New_York' };
  const etString = now.toLocaleString('en-US', etOptions);
  const etDate = new Date(etString);
  
  const day = etDate.getDay();
  const hour = etDate.getHours();
  const minute = etDate.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  // Market closed on weekends
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min)
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM
  
  return totalMinutes >= marketOpen && totalMinutes < marketClose;
}

/**
 * Check if it's extended hours trading
 * Pre-market: 4:00 AM - 9:30 AM, After-hours: 4:00 PM - 8:00 PM
 */
function isExtendedHours() {
  const now = new Date();
  const etOptions = { timeZone: 'America/New_York' };
  const etString = now.toLocaleString('en-US', etOptions);
  const etDate = new Date(etString);
  
  const day = etDate.getDay();
  const hour = etDate.getHours();
  const minute = etDate.getMinutes();
  const totalMinutes = hour * 60 + minute;
  
  // No extended hours on weekends
  if (day === 0 || day === 6) return false;
  
  // Pre-market: 4:00 AM - 9:30 AM
  const preMarketStart = 4 * 60;
  const preMarketEnd = 9 * 60 + 30;
  
  // After-hours: 4:00 PM - 8:00 PM
  const afterHoursStart = 16 * 60;
  const afterHoursEnd = 20 * 60;
  
  return (totalMinutes >= preMarketStart && totalMinutes < preMarketEnd) ||
         (totalMinutes >= afterHoursStart && totalMinutes < afterHoursEnd);
}

/**
 * Get appropriate TTL for quote data based on asset type and market hours
 */
function getQuoteTTL(assetType = 'stock') {
  if (assetType === 'crypto') {
    return TTL_CONFIG.QUOTE_CRYPTO;
  }
  
  if (isMarketOpen()) {
    return TTL_CONFIG.QUOTE_MARKET_OPEN;
  }
  
  if (isExtendedHours()) {
    return Math.floor(TTL_CONFIG.QUOTE_MARKET_OPEN * 3); // 15 minutes during extended hours
  }
  
  return TTL_CONFIG.QUOTE_MARKET_CLOSED;
}

// =============================================================================
// Multi-Tier Cache Operations
// =============================================================================

/**
 * Get data from cache (Redis → DynamoDB → null)
 * @param {string} cacheKey - Unique cache key
 * @param {string} dataType - Type of data (quote, profile, etc.)
 * @returns {Promise<{data: any, source: string}|null>}
 */
async function getFromCache(cacheKey, dataType = 'quote') {
  // Layer 1: Try Redis (hot cache)
  if (redisCache) {
    try {
      const redisData = await redisCache.get(cacheKey);
      if (redisData) {
        console.log(`Cache HIT (Redis): ${cacheKey}`);
        return { data: redisData, source: 'redis' };
      }
    } catch (e) {
      console.warn(`Redis get error: ${e.message}`);
    }
  }
  
  // Layer 2: Try DynamoDB (warm cache)
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.API_CACHE,
      Key: { cacheKey },
    }));
    
    if (result.Item) {
      const { response, expiresAt } = result.Item;
      
      // Check if not expired
      const now = Math.floor(Date.now() / 1000);
      if (!expiresAt || expiresAt > now) {
        console.log(`Cache HIT (DynamoDB): ${cacheKey}`);
        
        // Warm up Redis with this data
        if (redisCache) {
          const remainingTTL = expiresAt ? Math.max(60, expiresAt - now) : 300;
          await redisCache.set(cacheKey, response, remainingTTL);
        }
        
        return { data: response, source: 'dynamodb' };
      }
    }
  } catch (e) {
    console.warn(`DynamoDB cache get error: ${e.message}`);
  }
  
  console.log(`Cache MISS: ${cacheKey}`);
  return null;
}

/**
 * Set data in cache (both Redis and DynamoDB)
 * @param {string} cacheKey - Unique cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - TTL in seconds
 * @param {string} dataType - Type of data (quote, profile, etc.)
 * @param {object} metadata - Additional metadata
 */
async function setInCache(cacheKey, data, ttl, dataType = 'quote', metadata = {}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = ttl ? now + ttl : null;
  
  // Layer 1: Set in Redis (hot cache)
  if (redisCache && ttl) {
    try {
      await redisCache.set(cacheKey, data, ttl);
    } catch (e) {
      console.warn(`Redis set error: ${e.message}`);
    }
  }
  
  // Layer 2: Set in DynamoDB (warm cache)
  try {
    const item = {
      cacheKey,
      dataType,
      response: data,
      fetchedAt: now,
      expiresAt,
      sizeBytes: JSON.stringify(data).length,
      provider: metadata.provider || 'unknown',
      ...metadata,
    };
    
    await docClient.send(new PutCommand({
      TableName: TABLES.API_CACHE,
      Item: item,
    }));
    
    console.log(`Cache SET: ${cacheKey} (TTL: ${ttl}s)`);
  } catch (e) {
    console.warn(`DynamoDB cache set error: ${e.message}`);
  }
}

/**
 * Invalidate cache entry
 * @param {string} cacheKey - Cache key to invalidate
 */
async function invalidateCache(cacheKey) {
  // Delete from Redis
  if (redisCache) {
    try {
      await redisCache.del(cacheKey);
    } catch (e) {
      console.warn(`Redis delete error: ${e.message}`);
    }
  }
  
  // Delete from DynamoDB (or let TTL handle it)
  // For immediate invalidation, we set expiresAt to now
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLES.API_CACHE,
      Key: { cacheKey },
      UpdateExpression: 'SET expiresAt = :now',
      ExpressionAttributeValues: {
        ':now': Math.floor(Date.now() / 1000),
      },
    }));
  } catch (e) {
    // Ignore if item doesn't exist
  }
}

// =============================================================================
// Quote-Specific Cache Operations
// =============================================================================

/**
 * Get quote from cache
 * @param {string} symbol - Stock/crypto symbol
 * @param {string} assetType - 'stock' or 'crypto'
 */
async function getQuote(symbol, assetType = 'stock') {
  const cacheKey = `quote:${symbol.toUpperCase()}`;
  return getFromCache(cacheKey, 'quote');
}

/**
 * Set quote in cache with market-aware TTL
 * @param {string} symbol - Stock/crypto symbol
 * @param {object} quoteData - Quote data
 * @param {string} assetType - 'stock' or 'crypto'
 * @param {string} provider - Data provider name
 */
async function setQuote(symbol, quoteData, assetType = 'stock', provider = 'alphavantage') {
  const cacheKey = `quote:${symbol.toUpperCase()}`;
  const ttl = getQuoteTTL(assetType);
  
  await setInCache(cacheKey, quoteData, ttl, 'quote', {
    provider,
    symbol: symbol.toUpperCase(),
    assetType,
  });
}

/**
 * Get multiple quotes from cache (batch operation)
 * @param {string[]} symbols - Array of symbols
 * @param {string} assetType - 'stock' or 'crypto'
 * @returns {Promise<{cached: object, missing: string[]}>}
 */
async function getBatchQuotes(symbols, assetType = 'stock') {
  const cached = {};
  const missing = [];
  
  // Try to get each symbol from cache
  for (const symbol of symbols) {
    const result = await getQuote(symbol, assetType);
    if (result) {
      cached[symbol.toUpperCase()] = result.data;
    } else {
      missing.push(symbol);
    }
  }
  
  return { cached, missing };
}

/**
 * Set multiple quotes in cache (batch operation)
 * @param {object} quotes - Object with symbol keys and quote data values
 * @param {string} assetType - 'stock' or 'crypto'
 * @param {string} provider - Data provider name
 */
async function setBatchQuotes(quotes, assetType = 'stock', provider = 'alphavantage') {
  const ttl = getQuoteTTL(assetType);
  
  const promises = Object.entries(quotes).map(([symbol, data]) => 
    setInCache(`quote:${symbol.toUpperCase()}`, data, ttl, 'quote', {
      provider,
      symbol: symbol.toUpperCase(),
      assetType,
    })
  );
  
  await Promise.all(promises);
}

// =============================================================================
// Historical Prices (Cold Storage - Never Expires)
// =============================================================================

/**
 * Get historical prices from cold storage
 * @param {string} symbol - Stock/crypto symbol
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function getHistoricalPrices(symbol, startDate, endDate) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.HISTORICAL_PRICES,
      KeyConditionExpression: '#sym = :symbol AND #dt BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#sym': 'symbol',
        '#dt': 'date',
      },
      ExpressionAttributeValues: {
        ':symbol': symbol.toUpperCase(),
        ':start': startDate,
        ':end': endDate,
      },
    }));
    
    return result.Items || [];
  } catch (e) {
    console.error(`Error fetching historical prices: ${e.message}`);
    return [];
  }
}

/**
 * Store historical prices (batch write)
 * @param {string} symbol - Stock/crypto symbol
 * @param {array} prices - Array of price objects with date, close, volume, etc.
 * @param {string} assetType - 'stock' or 'crypto'
 * @param {string} provider - Data provider name
 */
async function setHistoricalPrices(symbol, prices, assetType = 'stock', provider = 'alphavantage') {
  if (!prices || prices.length === 0) return;
  
  const sym = symbol.toUpperCase();
  
  // DynamoDB BatchWrite supports max 25 items per request
  const batches = [];
  for (let i = 0; i < prices.length; i += 25) {
    batches.push(prices.slice(i, i + 25));
  }
  
  for (const batch of batches) {
    const writeRequests = batch.map(price => ({
      PutRequest: {
        Item: {
          symbol: sym,
          date: price.date,
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          volume: price.volume,
          adjClose: price.adjClose || price.close,
          assetType,
          provider,
          fetchedAt: Math.floor(Date.now() / 1000),
        },
      },
    }));
    
    try {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLES.HISTORICAL_PRICES]: writeRequests,
        },
      }));
    } catch (e) {
      console.error(`Error storing historical prices: ${e.message}`);
    }
  }
}

// =============================================================================
// API Quota Management
// =============================================================================

/**
 * Get current quota usage for a provider
 * @param {string} provider - Provider name (alphavantage, coingecko, etc.)
 * @returns {Promise<{requestsUsed: number, bandwidthUsed: number, dailyLimit: number}>}
 */
async function getQuotaUsage(provider) {
  const today = new Date().toISOString().split('T')[0];
  const providerDate = `${provider}:${today}`;
  
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLES.API_QUOTA,
      Key: { providerDate },
    }));
    
    if (result.Item) {
      return {
        requestsUsed: result.Item.requestsUsed || 0,
        bandwidthUsed: result.Item.bandwidthUsed || 0,
        dailyLimit: result.Item.dailyLimit || 500,
        lastUpdated: result.Item.updatedAt,
      };
    }
  } catch (e) {
    console.warn(`Error getting quota: ${e.message}`);
  }
  
  return { requestsUsed: 0, bandwidthUsed: 0, dailyLimit: 500 };
}

/**
 * Record API request for quota tracking
 * @param {string} provider - Provider name
 * @param {number} responseSize - Response size in bytes
 */
async function recordApiRequest(provider, responseSize = 0) {
  const today = new Date().toISOString().split('T')[0];
  const providerDate = `${provider}:${today}`;
  const now = Math.floor(Date.now() / 1000);
  
  // Set expiration to 90 days from now
  const expiresAt = now + (90 * 24 * 60 * 60);
  
  try {
    await docClient.send(new UpdateCommand({
      TableName: TABLES.API_QUOTA,
      Key: { providerDate },
      UpdateExpression: `
        SET requestsUsed = if_not_exists(requestsUsed, :zero) + :one,
            bandwidthUsed = if_not_exists(bandwidthUsed, :zero) + :size,
            provider = :provider,
            updatedAt = :now,
            expiresAt = :expires,
            dailyLimit = if_not_exists(dailyLimit, :limit)
      `,
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':size': responseSize,
        ':provider': provider,
        ':now': now,
        ':expires': expiresAt,
        ':limit': provider === 'alphavantage' ? 500 : 250,
      },
    }));
  } catch (e) {
    console.warn(`Error recording quota: ${e.message}`);
  }
}

/**
 * Check if we can make an API request (under quota)
 * @param {string} provider - Provider name
 * @returns {Promise<{allowed: boolean, remaining: number, message: string}>}
 */
async function canMakeRequest(provider) {
  const quota = await getQuotaUsage(provider);
  const remaining = quota.dailyLimit - quota.requestsUsed;
  
  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      message: `Daily quota exhausted for ${provider}. Resets at midnight.`,
    };
  }
  
  // Warning threshold at 80%
  if (remaining < quota.dailyLimit * 0.2) {
    console.warn(`[Quota Warning] ${provider}: ${remaining}/${quota.dailyLimit} requests remaining`);
  }
  
  return {
    allowed: true,
    remaining,
    message: `OK. ${remaining}/${quota.dailyLimit} requests remaining.`,
  };
}

// =============================================================================
// Emergency Cache-Only Mode
// =============================================================================

let emergencyModeActive = false;
let emergencyModeExpires = 0;

/**
 * Activate emergency cache-only mode
 * @param {number} duration - Duration in seconds (default: 1 hour)
 */
function activateEmergencyMode(duration = 3600) {
  emergencyModeActive = true;
  emergencyModeExpires = Date.now() + (duration * 1000);
  console.warn(`[EMERGENCY MODE] Activated for ${duration} seconds. Serving stale cache only.`);
}

/**
 * Check if emergency mode is active
 */
function isEmergencyMode() {
  if (emergencyModeActive && Date.now() < emergencyModeExpires) {
    return true;
  }
  
  // Auto-deactivate if expired
  if (emergencyModeActive && Date.now() >= emergencyModeExpires) {
    emergencyModeActive = false;
    console.log('[EMERGENCY MODE] Deactivated (expired)');
  }
  
  return false;
}

/**
 * Deactivate emergency mode
 */
function deactivateEmergencyMode() {
  emergencyModeActive = false;
  emergencyModeExpires = 0;
  console.log('[EMERGENCY MODE] Deactivated manually');
}

// =============================================================================
// Cache Statistics
// =============================================================================

/**
 * Get cache statistics for monitoring
 */
async function getCacheStats() {
  // Get quota for all known providers
  const providers = ['alphavantage', 'coingecko', 'gnews'];
  const quotas = {};
  
  for (const provider of providers) {
    quotas[provider] = await getQuotaUsage(provider);
  }
  
  return {
    timestamp: new Date().toISOString(),
    marketOpen: isMarketOpen(),
    extendedHours: isExtendedHours(),
    emergencyMode: isEmergencyMode(),
    quotas,
    ttlConfig: {
      quoteStock: getQuoteTTL('stock'),
      quoteCrypto: getQuoteTTL('crypto'),
    },
  };
}

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  // Core cache operations
  getFromCache,
  setInCache,
  invalidateCache,
  
  // Quote operations
  getQuote,
  setQuote,
  getBatchQuotes,
  setBatchQuotes,
  
  // Historical prices
  getHistoricalPrices,
  setHistoricalPrices,
  
  // Quota management
  getQuotaUsage,
  recordApiRequest,
  canMakeRequest,
  
  // Emergency mode
  activateEmergencyMode,
  isEmergencyMode,
  deactivateEmergencyMode,
  
  // Market awareness
  isMarketOpen,
  isExtendedHours,
  getQuoteTTL,
  
  // Statistics
  getCacheStats,
  
  // Configuration
  TTL_CONFIG,
  TABLES,
};
