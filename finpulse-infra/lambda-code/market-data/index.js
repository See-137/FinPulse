/**
 * FinPulse Market Data Service v3.2
 * Single data source: Alpaca Markets
 * Now includes FX service (merged from standalone fx-service)
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
 * - GET /market/fx/rates?base=USD - FX rates
 * - GET /market/fx/convert?amount=100&from=USD&to=ILS - Currency conversion
 * - GET /fx/rates, /fx/convert, /fx/currencies - Backward compatibility routes
 */

// =============================================================================
// Shared Utilities from Lambda Layer (with fallback)
// =============================================================================

// Environment validator + request context — each module loads independently
// so a single missing module can't break the others (CLAUDE.md §11).
let envValidator, requestContext;

try { envValidator = require('/opt/nodejs/env-validator'); }
catch (e) {
  try { envValidator = require('../shared/env-validator'); }
  catch (e2) {
    envValidator = {
      ensureEnvValidated: () => true,
      getOptionalEnv: (name, def) => process.env[name] || def,
    };
  }
}

try { requestContext = require('/opt/nodejs/request-context'); }
catch (e) {
  try { requestContext = require('../shared/request-context'); }
  catch (e2) {
    requestContext = {
      createRequestContext: (event) => ({
        requestId: event?.requestContext?.requestId || 'unknown',
        logger: {
          info: (msg, data) => console.log(JSON.stringify({ level: 'INFO', message: msg, ...data })),
          error: (msg, data) => console.error(JSON.stringify({ level: 'ERROR', message: msg, ...data })),
          warn: (msg, data) => console.warn(JSON.stringify({ level: 'WARN', message: msg, ...data })),
        },
      }),
      addRequestIdHeader: (headers, id) => ({ ...headers, 'X-Request-ID': id }),
    };
  }
}

console.log('[MarketData] Layer modules loaded:', {
  envValidator: !!envValidator,
  requestContext: !!requestContext,
});

// Validate environment at cold start
try {
  envValidator.ensureEnvValidated('market-data');
} catch (e) {
  console.error('[MarketData] Environment validation failed:', e.message);
  // Continue but log the error - don't fail completely for backwards compatibility
}

// =============================================================================
// AWS SDK Clients (lazy initialization for cold start optimization)
// =============================================================================

let dynamoClient = null;
let docClient = null;

function getDynamoClient() {
  if (!docClient) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

// Import commands when needed
const { PutCommand, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// =============================================================================
// Service-specific modules (Alpaca, Cache)
// =============================================================================

// Alpaca service (single source of truth)
// Try multiple paths for Lambda deployment compatibility
let alpacaService;
try {
  alpacaService = require('./alpaca-service');
} catch (e) {
  try {
    alpacaService = require('./shared/alpaca-service');
  } catch (e2) {
    alpacaService = require('../shared/alpaca-service');
  }
}

// Multi-tier cache manager
// Priority: Lambda Layer → local shared → fallback
let cacheManager = null;
try {
  cacheManager = require('/opt/nodejs/cache-manager');
  console.log('[MarketData] Cache manager loaded from Lambda Layer');
} catch (e) {
  try {
    cacheManager = require('./cache-manager');
    console.log('[MarketData] Cache manager loaded from local');
  } catch (e2) {
    try {
      cacheManager = require('./shared/cache-manager');
      console.log('[MarketData] Cache manager loaded from ./shared');
    } catch (e3) {
      try {
        cacheManager = require('../shared/cache-manager');
        console.log('[MarketData] Cache manager loaded from ../shared');
      } catch (e4) {
        console.log('[MarketData] Cache manager not available');
      }
    }
  }
}

// Redis cache utility
// Priority: Lambda Layer → local shared → fallback
let redisCache = null;
try {
  redisCache = require('/opt/nodejs/redis-cache');
  console.log('[MarketData] Redis cache loaded from Lambda Layer');
} catch (e) {
  try {
    redisCache = require('./shared/redis-cache');
  } catch (e2) {
    try {
      redisCache = require('../shared/redis-cache');
    } catch (e3) {
      console.log('[MarketData] Redis cache not available');
    }
  }
}

// =============================================================================
// Constants
// =============================================================================

// In-memory price cache (fallback when Redis unavailable)
const priceCache = new Map();
const PRICE_CACHE_TTL = 60000; // 1 minute
const MAX_CACHE_SIZE = 500; // Prevent unbounded memory growth

// Alpaca Rate Limiter - Sliding Window
// Alpaca allows 200 requests/minute, we'll be conservative at 180
const ALPACA_RATE_LIMIT = 180;
const RATE_WINDOW_MS = 60000; // 1 minute
const alpacaRequestLog = [];

/**
 * Check if we can make an Alpaca API request
 * Uses sliding window rate limiting
 * @returns {boolean} true if request is allowed
 */
function checkAlpacaRateLimit() {
  const now = Date.now();

  // Remove requests outside the window
  while (alpacaRequestLog.length > 0 && alpacaRequestLog[0] < now - RATE_WINDOW_MS) {
    alpacaRequestLog.shift();
  }

  // Check if under limit
  return alpacaRequestLog.length < ALPACA_RATE_LIMIT;
}

/**
 * Record an Alpaca API request for rate limiting
 * @param {number} count - Number of logical requests (e.g., symbols fetched)
 */
function recordAlpacaRequest(count = 1) {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    alpacaRequestLog.push(now);
  }
}

/**
 * Get current rate limit status
 * @returns {{ used: number, remaining: number, limit: number, resetsAt: number }}
 */
function getRateLimitStatus() {
  const now = Date.now();

  // Clean old entries
  while (alpacaRequestLog.length > 0 && alpacaRequestLog[0] < now - RATE_WINDOW_MS) {
    alpacaRequestLog.shift();
  }

  const used = alpacaRequestLog.length;
  const oldestRequest = alpacaRequestLog[0];
  const resetsAt = oldestRequest ? oldestRequest + RATE_WINDOW_MS : now;

  return {
    used,
    remaining: Math.max(0, ALPACA_RATE_LIMIT - used),
    limit: ALPACA_RATE_LIMIT,
    resetsAt,
    windowMs: RATE_WINDOW_MS,
  };
}

// =============================================================================
// FX Service (merged from standalone fx-service)
// Static exchange rates (updated periodically)
// =============================================================================

// Fallback static rates (used when live API is unavailable)
// Base: USD - Last updated: 2026-01-09
const FX_FALLBACK_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ILS: 3.65,
  JPY: 157.5,
  CHF: 0.90,
  CAD: 1.44,
  AUD: 1.60,
  CNY: 7.30,
  INR: 85.50,
  BRL: 6.18,
  MXN: 20.50,
  SGD: 1.36,
  HKD: 7.79,
  NOK: 11.40,
  SEK: 11.05,
  DKK: 7.10,
  NZD: 1.78,
  ZAR: 18.70,
  RUB: 101.5,
  KRW: 1450,
  THB: 34.5,
  PLN: 4.05,
  TRY: 35.5,
  PHP: 58.5,
  MYR: 4.45,
  IDR: 16200,
  TWD: 32.5,
  AED: 3.67,
  SAR: 3.75,
};

const FX_FALLBACK_UPDATED = '2026-01-09T00:00:00Z';
const FX_SUPPORTED_CURRENCIES = Object.keys(FX_FALLBACK_RATES);

// Cache for FX rates (memory + Redis)
const fxRatesCache = new Map();
const FX_CACHE_TTL = 900000; // 15 minutes
const FX_REDIS_TTL = 900; // 15 minutes in seconds

/**
 * Fetch live FX rates from Frankfurter API (free, no API key)
 * @returns {{ rates: object, timestamp: string, source: string }} USD-based rates
 */
async function fetchLiveFxRates() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=USD', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Frankfurter API responded with ${response.status}`);
    }

    const data = await response.json();
    // Frankfurter returns rates relative to USD but doesn't include USD itself
    const rates = { USD: 1, ...data.rates };
    // Add currencies Frankfurter doesn't cover using fallback
    for (const [currency, rate] of Object.entries(FX_FALLBACK_RATES)) {
      if (!(currency in rates)) {
        rates[currency] = rate;
      }
    }
    return {
      rates,
      timestamp: new Date(data.date + 'T12:00:00Z').toISOString(),
      source: 'live',
    };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[FX] Live rate fetch failed, using fallback:', error.message);
    return null;
  }
}

/**
 * Get exchange rates for a given base currency
 * Multi-tier cache: Memory → Redis → Frankfurter API → Static fallback
 * @param {string} baseCurrency - Base currency code (e.g., 'USD', 'EUR')
 * @returns {Promise<{ rates: object, timestamp: string, source: string }>}
 */
async function getExchangeRates(baseCurrency = 'USD') {
  // Layer 1: Memory cache (per-base)
  const memKey = `fx:${baseCurrency}`;
  const memCached = fxRatesCache.get(memKey);
  if (memCached && (Date.now() - memCached.fetchedAt) < FX_CACHE_TTL) {
    return memCached;
  }

  // Layer 2: Redis cache (USD-based rates, then convert)
  const redisKey = 'fx:usd:latest';
  let usdRates = null;
  let timestamp = null;
  let source = 'fallback';

  if (redisCache) {
    try {
      const redisCached = await redisCache.get(redisKey);
      if (redisCached && redisCached.rates) {
        usdRates = redisCached.rates;
        timestamp = redisCached.timestamp;
        source = redisCached.source || 'redis';
      }
    } catch (e) {
      console.warn('[FX] Redis read failed:', e.message);
    }
  }

  // Layer 3: Live API fetch
  if (!usdRates) {
    const liveData = await fetchLiveFxRates();
    if (liveData) {
      usdRates = liveData.rates;
      timestamp = liveData.timestamp;
      source = 'live';

      // Store in Redis
      if (redisCache) {
        try {
          await redisCache.set(redisKey, { rates: usdRates, timestamp, source }, FX_REDIS_TTL);
        } catch (e) {
          console.warn('[FX] Redis write failed:', e.message);
        }
      }
    }
  }

  // Layer 4: Static fallback
  if (!usdRates) {
    usdRates = FX_FALLBACK_RATES;
    timestamp = FX_FALLBACK_UPDATED;
    source = 'fallback';
  }

  // Convert from USD base to requested base
  const baseRate = usdRates[baseCurrency];
  if (!baseRate) {
    throw new Error(`Unsupported base currency: ${baseCurrency}`);
  }

  const rates = {};
  for (const [currency, rate] of Object.entries(usdRates)) {
    rates[currency] = rate / baseRate;
  }

  const result = { rates, timestamp, source, fetchedAt: Date.now() };
  fxRatesCache.set(memKey, result);
  return result;
}

/**
 * Handle FX-related routes
 * @param {string} path - Request path
 * @param {object} queryParams - Query parameters
 * @param {object} corsHeaders - CORS headers to use
 * @returns {object|null} - Response object or null if not an FX route
 */
async function handleFxRoutes(path, queryParams, corsHeaders) {
  // Match both /fx/* and /market/fx/* paths
  const isFxRoute = path.includes('/fx/') || path.endsWith('/fx');
  if (!isFxRoute) return null;

  // GET /fx/rates or /market/fx/rates
  if (path.includes('/rates') || path.endsWith('/fx')) {
    const base = (queryParams.base || 'USD').toUpperCase();

    try {
      const fxData = await getExchangeRates(base);

      // Filter to supported currencies
      const filteredRates = {};
      FX_SUPPORTED_CURRENCIES.forEach(currency => {
        if (fxData.rates[currency]) filteredRates[currency] = fxData.rates[currency];
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          base: base,
          rates: filteredRates,
          timestamp: fxData.timestamp,
          source: fxData.source,
        })
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: error.message,
          supported: FX_SUPPORTED_CURRENCIES
        })
      };
    }
  }

  // GET /fx/convert or /market/fx/convert
  if (path.includes('/convert')) {
    const { amount, from = 'USD', to = 'ILS' } = queryParams;

    if (!amount) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'amount parameter required' })
      };
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Invalid amount - must be a positive number' })
      };
    }

    try {
      const fromCurrency = from.toUpperCase();
      const toCurrency = to.toUpperCase();
      const fxData = await getExchangeRates(fromCurrency);
      const rate = fxData.rates[toCurrency];

      if (!rate) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: `Currency ${toCurrency} not supported`,
            supported: FX_SUPPORTED_CURRENCIES
          })
        };
      }

      const converted = numericAmount * rate;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          from: fromCurrency,
          to: toCurrency,
          amount: numericAmount,
          rate: rate,
          converted: Math.round(converted * 100) / 100,
          timestamp: fxData.timestamp,
          source: fxData.source,
        })
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: error.message })
      };
    }
  }

  // GET /fx/currencies or /market/fx/currencies
  if (path.includes('/currencies')) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        currencies: FX_SUPPORTED_CURRENCIES,
        count: FX_SUPPORTED_CURRENCIES.length,
      })
    };
  }

  // FX service info endpoint
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      service: 'FinPulse FX Service (integrated)',
      version: '2.1.0',
      source: 'static',
      note: 'Using static rates (Alpaca does not provide FX data)',
      lastUpdated: FX_FALLBACK_UPDATED,
      endpoints: [
        'GET /fx/rates?base=USD',
        'GET /fx/convert?amount=100&from=USD&to=ILS',
        'GET /fx/currencies',
        'GET /market/fx/rates?base=USD',
        'GET /market/fx/convert?amount=100&from=USD&to=ILS',
      ]
    })
  };
}

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
  
  // Layer 3: Fetch from Alpaca (with rate limit enforcement)
  if (missingSymbols.length > 0) {
    // Check rate limit before making API call
    if (!checkAlpacaRateLimit()) {
      const rateLimitStatus = getRateLimitStatus();
      console.warn(`[RateLimit] Alpaca rate limit reached (${rateLimitStatus.used}/${rateLimitStatus.limit}). Returning cached data only.`);
      // Return whatever we have from cache layers
      return results;
    }

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

      // Record API usage for rate limiting (count as 1 request per batch)
      recordAlpacaRequest(1);

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
    const result = await getDynamoClient().send(new QueryCommand({
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
    return getDynamoClient().send(new PutCommand({
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

// =============================================================================
// Main Handler
// =============================================================================

exports.handler = async (event) => {
  console.log('Market Data Lambda invoked:', event.httpMethod, event.path);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    const queryParams = event.queryStringParameters || {};

    // Handle FX routes (both /fx/* and /market/fx/*)
    const fxResponse = await handleFxRoutes(path, queryParams, corsHeaders);
    if (fxResponse) {
      return fxResponse;
    }

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
        version: '3.0.1',
        provider: 'alpaca',
        memoryCacheSize: priceCache.size,
        rateLimit: getRateLimitStatus(),
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

    // GET /market/binance/klines - Proxy for Binance candlestick data (avoids CORS)
    if (path.includes('/binance/klines') && method === 'GET') {
      const symbol = queryParams.symbol;
      const interval = queryParams.interval || '1h';
      const limit = Math.min(parseInt(queryParams.limit) || 100, 1000);

      if (!symbol) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Symbol parameter is required' })
        };
      }

      try {
        // Format symbol for Binance (add USDT if not present)
        const binanceSymbol = symbol.includes('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;

        // Check cache first
        const cacheKey = `binance:klines:${binanceSymbol}:${interval}:${limit}`;
        const memCached = priceCache.get(cacheKey);
        if (memCached && (Date.now() - memCached.timestamp) < 30000) { // 30 second cache
          console.log(`[Binance Proxy] Cache hit for ${binanceSymbol}`);
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              data: memCached.data,
              cached: true,
              timestamp: new Date().toISOString()
            })
          };
        }

        // Fetch from Binance (server-side - no CORS issues)
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        console.log(`[Binance Proxy] Fetching: ${binanceUrl}`);

        const response = await fetch(binanceUrl);

        if (!response.ok) {
          // Binance returns 451 (geo-blocked) or other errors
          // Return empty data gracefully instead of propagating error
          console.warn(`[Binance Proxy] API returned ${response.status} for ${binanceSymbol} - returning empty data`);
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              data: [],
              symbol: binanceSymbol,
              interval,
              count: 0,
              note: 'Binance data unavailable - using fallback',
              timestamp: new Date().toISOString()
            })
          };
        }

        const klines = await response.json();

        // Transform to OHLCV format
        const ohlcvData = klines.map(k => ({
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5])
        }));

        // Cache the result
        setCacheWithLimit(cacheKey, { data: ohlcvData, timestamp: Date.now() });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: ohlcvData,
            symbol: binanceSymbol,
            interval,
            count: ohlcvData.length,
            cached: false,
            timestamp: new Date().toISOString()
          })
        };
      } catch (error) {
        // Network error or other failure - return empty data gracefully
        console.warn('[Binance Proxy] Error:', error.message);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: [],
            symbol: queryParams.symbol?.toUpperCase() || 'UNKNOWN',
            interval: queryParams.interval || '1h',
            count: 0,
            note: 'Binance data unavailable - using fallback',
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // GET /market/search - Search for stocks by symbol or name
    if (path.includes('/search') && method === 'GET') {
      const query = queryParams.q || queryParams.query || '';
      const type = queryParams.type || 'stock';
      const limit = Math.min(parseInt(queryParams.limit) || 15, 50);

      if (!query || query.length < 1) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Query parameter "q" is required' })
        };
      }

      let results = [];

      if (type === 'stock') {
        // Search stocks via Alpaca Assets API
        results = await alpacaService.searchStocks(query, limit);
      } else if (type === 'crypto') {
        // For crypto, we still use CoinGecko (handled on frontend) or could add here
        // For now, return empty - frontend handles crypto search via CoinGecko
        results = [];
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: results,
          query,
          type,
          provider: type === 'stock' ? 'alpaca' : 'coingecko',
          timestamp: new Date().toISOString(),
        })
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
          'GET /market/search?q=BMNR&type=stock - Search stocks by symbol/name',
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
