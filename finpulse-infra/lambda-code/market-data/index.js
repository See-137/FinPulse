/**
 * FinPulse Market Data Service v3.0
 * Single data source: Alpaca Markets
 * 
 * Migration from CoinGecko + Alpha Vantage → Alpaca
 * - Unified API for stocks and crypto
 * - Better rate limits (200 req/min vs 5 req/min)
 * - Real-time WebSocket support
 * 
 * Endpoints:
 * - GET /market/prices?symbols=BTC,ETH,AAPL - Get quotes
 * - GET /market/prices?type=crypto&symbols=BTC,ETH - Get crypto only
 * - GET /market/prices?type=stock&symbols=AAPL,GOOGL - Get stocks only
 * - GET /market/history?symbol=AAPL&timeframe=1Day&limit=30 - Historical data
 * - GET /market/stats - Service statistics
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Alpaca service (single source of truth)
// Use relative path for local dev, flat path for Lambda deployment
let alpacaService;
try {
  alpacaService = require('./alpaca-service');
} catch (e) {
  alpacaService = require('../shared/alpaca-service');
}

// Multi-tier cache manager
let cacheManager = null;
try {
  cacheManager = require('./cache-manager');
  console.log('Cache manager loaded successfully');
} catch (e) {
  try {
    cacheManager = require('../shared/cache-manager');
    console.log('Cache manager loaded from shared');
  } catch (e2) {
    console.log('Cache manager not available:', e2.message);
  }
}

// Redis cache utility (fallback)
let redisCache = null;
try {
  redisCache = require('../shared/redis-cache');
} catch (e) {
  console.log('Redis cache not available');
}

// Initialize DynamoDB
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// In-memory price cache (fallback when Redis unavailable)
const priceCache = new Map();
const PRICE_CACHE_TTL = 60000; // 1 minute
const MAX_CACHE_SIZE = 500; // Prevent unbounded memory growth

/**
 * Add to memory cache with size limit (LRU-like eviction)
 */
function setCacheWithLimit(key, value) {
  // Evict oldest entries if at capacity
  if (priceCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = priceCache.keys().next().value;
    priceCache.delete(oldestKey);
  }
  priceCache.set(key, value);
}

// =============================================================================
// Price Fetching with Multi-Tier Cache
// =============================================================================

/**
 * Get prices with multi-tier caching
 * Cache layers: Memory → Redis/DynamoDB (via CacheManager) → Alpaca API
 * @param {string[]} symbols - Array of symbols to fetch
 * @param {string} assetType - 'crypto', 'stock', or 'all' (auto-detect)
 * @returns {Promise<object>}
 */
async function getPricesWithCache(symbols, assetType = 'all') {
  const results = {};
  let missingSymbols = [...symbols];
  
  // Generate cache key (use spread to avoid mutating original array)
  const cacheKey = `prices:${assetType}:${[...symbols].sort().join(',')}`;
  
  // Layer 1: Check memory cache
  const memCached = priceCache.get(cacheKey);
  if (memCached && (Date.now() - memCached.timestamp) < PRICE_CACHE_TTL) {
    console.log(`[Cache] Memory hit for ${symbols.length} symbols`);
    return memCached.data;
  }
  
  // Layer 2: Try CacheManager (Redis + DynamoDB)
  if (cacheManager) {
    try {
      const cacheType = assetType === 'all' ? 'mixed' : assetType;
      const { cached, missing } = await cacheManager.getBatchQuotes(symbols, cacheType);
      Object.assign(results, cached);
      missingSymbols = missing;
      
      if (missingSymbols.length === 0) {
        console.log(`[CacheManager] All ${symbols.length} prices from cache`);
        priceCache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
      }
      console.log(`[CacheManager] ${Object.keys(cached).length} hits, ${missingSymbols.length} misses`);
    } catch (e) {
      console.warn('[CacheManager] Error:', e.message);
    }
  }
  
  // Check emergency mode before API calls
  if (cacheManager && cacheManager.isEmergencyMode && cacheManager.isEmergencyMode()) {
    console.warn('[Emergency Mode] Returning cached data only, skipping Alpaca');
    return results;
  }
  
  // Layer 3: Fetch from Alpaca
  if (missingSymbols.length > 0) {
    console.log(`[Alpaca] Fetching ${missingSymbols.length} symbols: ${missingSymbols.join(',')}`);
    
    try {
      let alpacaPrices;
      
      if (assetType === 'crypto') {
        alpacaPrices = await alpacaService.getCryptoQuotes(missingSymbols);
      } else if (assetType === 'stock') {
        alpacaPrices = await alpacaService.getStockQuotes(missingSymbols);
      } else {
        // Auto-detect: use getQuotes which routes automatically
        alpacaPrices = await alpacaService.getQuotes(missingSymbols);
      }
      
      Object.assign(results, alpacaPrices);
      
      // Track API usage
      if (cacheManager && cacheManager.recordApiRequest) {
        await cacheManager.recordApiRequest('alpaca', missingSymbols.length * 100);
      }
      
      // Update caches with new data
      if (cacheManager && Object.keys(alpacaPrices).length > 0) {
        const cacheType = assetType === 'all' ? 'mixed' : assetType;
        await cacheManager.setBatchQuotes(alpacaPrices, cacheType, 'alpaca');
      }
      
      // Update Redis cache
      if (redisCache && Object.keys(alpacaPrices).length > 0) {
        const redisKey = redisCache.keys?.marketPrices ? 
          redisCache.keys.marketPrices(`alpaca:${assetType}`) : 
          `market:alpaca:${assetType}`;
        const existingCache = await redisCache.get(redisKey) || {};
        await redisCache.set(redisKey, { ...existingCache, ...alpacaPrices }, 
          redisCache.TTL?.MARKET_DATA || 300);
      }
    } catch (error) {
      console.error('[Alpaca] Fetch error:', error.message);
      // Return whatever we have from cache
    }
  }
  
  // Update memory cache (with size limit)
  if (Object.keys(results).length > 0) {
    setCacheWithLimit(cacheKey, { data: results, timestamp: Date.now() });
  }
  
  return results;
}

// =============================================================================
// Historical Data
// =============================================================================

/**
 * Get historical price data from Alpaca
 * @param {string} symbol - Symbol to fetch
 * @param {string} timeframe - Timeframe (1Min, 5Min, 15Min, 1Hour, 1Day)
 * @param {number} limit - Number of bars to return
 * @returns {Promise<Array>}
 */
async function getHistoricalPrices(symbol, timeframe = '1Day', limit = 30) {
  try {
    const bars = await alpacaService.getBars(symbol, timeframe, limit);
    return bars;
  } catch (error) {
    console.error('[Historical] Error:', error.message);
    throw error;
  }
}

/**
 * Get historical prices from DynamoDB (internal storage)
 * For prices stored by this service
 */
async function getStoredHistoricalPrices(symbol, hours = 24) {
  const tableName = `finpulse-market-prices-${process.env.ENVIRONMENT || 'prod'}`;
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  try {
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'symbol = :symbol AND #ts >= :startTime',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: {
        ':symbol': symbol.toUpperCase(),
        ':startTime': startTime
      },
      ScanIndexForward: true
    }));
    return result.Items || [];
  } catch (error) {
    console.warn('[DynamoDB] Historical query failed:', error.message);
    return [];
  }
}

/**
 * Store prices in DynamoDB for historical tracking
 */
async function storePrices(prices, type) {
  const tableName = `finpulse-market-prices-${process.env.ENVIRONMENT || 'prod'}`;
  const timestamp = new Date().toISOString();

  console.log(`[Storage] Storing ${Object.keys(prices).length} prices to ${tableName}`);

  const promises = Object.entries(prices).map(([symbol, data]) => {
    const item = {
      symbol: symbol.toUpperCase(),
      timestamp,
      type: type || 'mixed',
      price: data.price,
      change24h: data.change24h,
      volume: data.volume || null,
      high: data.high || null,
      low: data.low || null,
      provider: 'alpaca',
      ttl: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days TTL
    };
    return docClient.send(new PutCommand({
      TableName: tableName,
      Item: item
    })).catch(e => console.warn(`Failed to store ${symbol}:`, e.message));
  });

  await Promise.all(promises);
  console.log(`[Storage] Successfully stored ${Object.keys(prices).length} prices`);
}

// =============================================================================
// CORS Headers
// =============================================================================

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Sanitize event for logging (remove sensitive headers)
 */
function sanitizeEvent(event) {
  const sanitized = { ...event };
  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers };
    delete sanitized.headers.Authorization;
    delete sanitized.headers.authorization;
    delete sanitized.headers.Cookie;
    delete sanitized.headers.cookie;
  }
  if (sanitized.multiValueHeaders) {
    sanitized.multiValueHeaders = { ...sanitized.multiValueHeaders };
    delete sanitized.multiValueHeaders.Authorization;
    delete sanitized.multiValueHeaders.authorization;
  }
  return sanitized;
}

// =============================================================================
// Main Handler
// =============================================================================

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(sanitizeEvent(event)));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    const queryParams = event.queryStringParameters || {};

    // GET /market/prices - Get current prices
    if (path.includes('/prices') && method === 'GET') {
      const type = queryParams.type || 'all';
      const symbolsParam = queryParams.symbols || 'BTC,ETH,SOL';
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase());

      // Map type to assetType
      let assetType = 'all';
      if (type === 'crypto') assetType = 'crypto';
      if (type === 'stock') assetType = 'stock';

      const prices = await getPricesWithCache(symbols, assetType);

      // Store for historical tracking (fire and forget in background)
      storePrices(prices, type).catch(err => 
        console.error('Failed to store prices:', err.message)
      );

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: prices,
          provider: 'alpaca',
          timestamp: new Date().toISOString(),
          meta: {
            requested: symbols.length,
            returned: Object.keys(prices).length,
            type: assetType,
          }
        })
      };
    }

    // GET /market/history - Get historical prices
    if (path.includes('/history') && method === 'GET') {
      const symbol = queryParams.symbol;
      const timeframe = queryParams.timeframe || '1Day';
      const limit = parseInt(queryParams.limit) || 30;
      const source = queryParams.source || 'alpaca'; // 'alpaca' or 'stored'

      if (!symbol) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Symbol is required' })
        };
      }

      let history;
      if (source === 'stored') {
        // Get from our DynamoDB storage
        const hours = parseInt(queryParams.hours) || 24;
        history = await getStoredHistoricalPrices(symbol, hours);
      } else {
        // Get from Alpaca
        history = await getHistoricalPrices(symbol, timeframe, limit);
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: history,
          symbol: symbol.toUpperCase(),
          timeframe,
          provider: 'alpaca',
        })
      };
    }

    // GET /market/stats - Get cache and service statistics
    if (path.includes('/stats') && method === 'GET') {
      const stats = {
        service: 'FinPulse Market Data',
        version: '3.0.0',
        provider: 'alpaca',
        memoryCacheSize: priceCache.size,
        timestamp: new Date().toISOString(),
      };

      if (cacheManager && cacheManager.getCacheStats) {
        try {
          stats.cache = await cacheManager.getCacheStats();
        } catch (e) {
          stats.cache = 'unavailable';
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, data: stats })
      };
    }

    // Default: return available endpoints
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        service: 'FinPulse Market Data',
        version: '3.0.0',
        provider: 'Alpaca Markets',
        features: [
          'Unified stocks + crypto API',
          'Multi-tier caching (Memory → Redis → DynamoDB → Alpaca)',
          'Market-aware TTL',
          '200 requests/minute (vs 5/min with Alpha Vantage)',
          'Real-time WebSocket support',
        ],
        endpoints: [
          'GET /market/prices?symbols=BTC,ETH,AAPL - Get mixed quotes',
          'GET /market/prices?type=crypto&symbols=BTC,ETH - Get crypto only',
          'GET /market/prices?type=stock&symbols=AAPL,GOOGL - Get stocks only',
          'GET /market/history?symbol=AAPL&timeframe=1Day&limit=30 - Historical bars',
          'GET /market/history?symbol=BTC&source=stored&hours=24 - Stored history',
          'GET /market/stats - Service statistics'
        ]
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: process.env.ENVIRONMENT !== 'prod' ? error.message : undefined
      })
    };
  }
};
