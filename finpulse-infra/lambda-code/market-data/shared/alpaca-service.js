/**
 * FinPulse Alpaca Market Data Service
 * Single source of truth for all market data (stocks + crypto)
 * 
 * Features:
 * - REST API for snapshots and historical data
 * - WebSocket management for real-time streaming
 * - Automatic reconnection and error handling
 * - Symbol normalization (handles both stock and crypto)
 * - CoinGecko fallback for crypto not supported by Alpaca
 * 
 * Alpaca Plan: Algo Trader Plus ($99/mo)
 * - 200 API calls/minute (REST)
 * - Unlimited real-time data (WebSocket)
 * - IEX + SIP feeds available
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// CoinGecko fallback for altcoins not supported by Alpaca
let coingeckoService = null;
try {
  coingeckoService = require('./coingecko-service');
  console.log('[Alpaca] CoinGecko fallback service loaded');
} catch (e) {
  console.log('[Alpaca] CoinGecko fallback not available:', e.message);
}

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

// =============================================================================
// Configuration
// =============================================================================

const ALPACA_CONFIG = {
  // REST API endpoints
  REST_BASE: 'https://data.alpaca.markets',
  
  // WebSocket endpoints (Algo Trader Plus includes real-time)
  WS_STOCK_IEX: 'wss://stream.data.alpaca.markets/v2/iex',
  WS_STOCK_SIP: 'wss://stream.data.alpaca.markets/v2/sip',
  WS_CRYPTO: 'wss://stream.data.alpaca.markets/v1beta3/crypto/us',
  
  // Timeouts
  REST_TIMEOUT: 10000,
  WS_HEARTBEAT_INTERVAL: 30000,
  WS_RECONNECT_DELAY: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
};

// API credentials cache
let cachedCredentials = null;
let credentialsCacheTime = 0;
const CREDENTIALS_CACHE_TTL = 300000; // 5 minutes

// =============================================================================
// Credentials Management
// =============================================================================

/**
 * Get Alpaca API credentials from AWS Secrets Manager
 * @returns {Promise<{apiKey: string, apiSecret: string}>}
 */
async function getCredentials() {
  const now = Date.now();
  if (cachedCredentials && (now - credentialsCacheTime) < CREDENTIALS_CACHE_TTL) {
    return cachedCredentials;
  }
  
  // Try environment variables first (local development)
  if (process.env.ALPACA_API_KEY && process.env.ALPACA_API_SECRET) {
    cachedCredentials = {
      apiKey: process.env.ALPACA_API_KEY,
      apiSecret: process.env.ALPACA_API_SECRET,
    };
    credentialsCacheTime = now;
    console.log('[Alpaca] Using credentials from environment variables');
    return cachedCredentials;
  }
  
  // Try local secret.json (development/testing)
  try {
    const localSecrets = require('../secret.json');
    if (localSecrets.alpaca_api_key && localSecrets.alpaca_api_secret) {
      cachedCredentials = {
        apiKey: localSecrets.alpaca_api_key,
        apiSecret: localSecrets.alpaca_api_secret,
      };
      credentialsCacheTime = now;
      console.log('[Alpaca] Using credentials from local secret.json');
      return cachedCredentials;
    }
  } catch (e) {
    // Continue to Secrets Manager
  }
  
  // AWS Secrets Manager (production)
  try {
    const command = new GetSecretValueCommand({
      SecretId: `finpulse/${process.env.ENVIRONMENT || 'prod'}/alpaca-credentials`
    });
    const response = await secretsClient.send(command);
    
    let secret;
    try {
      secret = JSON.parse(response.SecretString);
    } catch (e) {
      throw new Error('Alpaca credentials must be stored as JSON');
    }
    
    cachedCredentials = {
      apiKey: secret.api_key || secret.apiKey || secret.ALPACA_API_KEY,
      apiSecret: secret.api_secret || secret.apiSecret || secret.ALPACA_API_SECRET,
    };
    
    if (!cachedCredentials.apiKey || !cachedCredentials.apiSecret) {
      throw new Error('Missing api_key or api_secret in Alpaca credentials');
    }
    
    credentialsCacheTime = now;
    console.log('[Alpaca] Using credentials from AWS Secrets Manager');
    return cachedCredentials;
  } catch (error) {
    console.error('[Alpaca] Failed to get credentials:', error.message);
    throw new Error('Alpaca credentials not configured');
  }
}

// =============================================================================
// REST API Client
// =============================================================================

/**
 * Make authenticated REST request to Alpaca
 * @param {string} endpoint - API endpoint (e.g., '/v2/stocks/AAPL/quotes/latest')
 * @param {object} options - Fetch options
 * @returns {Promise<object>}
 */
async function alpacaFetch(endpoint, options = {}) {
  const credentials = await getCredentials();
  
  const url = `${ALPACA_CONFIG.REST_BASE}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALPACA_CONFIG.REST_TIMEOUT);
  
  try {
    console.log(`[Alpaca] GET ${endpoint}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Alpaca] API Error ${response.status}: ${errorBody}`);
      throw new Error(`Alpaca API error: ${response.status} - ${errorBody}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Alpaca API request timed out');
    }
    throw error;
  }
}

// =============================================================================
// Stock Data Functions
// =============================================================================

/**
 * Get latest quotes for multiple stocks
 * @param {string[]} symbols - Array of stock symbols
 * @returns {Promise<object>} - Map of symbol to price data
 */
// Valid symbol regex - only alphanumeric and dots allowed for stocks
const VALID_STOCK_SYMBOL = /^[A-Z0-9.]{1,10}$/;

async function getStockQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Alpaca supports up to 100 symbols per request
  // Filter to valid symbols only (prevents injection)
  const validSymbols = symbols
    .slice(0, 100)
    .map(s => s.toUpperCase())
    .filter(s => VALID_STOCK_SYMBOL.test(s));
  
  if (validSymbols.length === 0) {
    console.warn('[Alpaca] No valid stock symbols provided');
    return {};
  }
  
  if (validSymbols.length < symbols.length) {
    console.warn(`[Alpaca] Filtered ${symbols.length - validSymbols.length} invalid stock symbols`);
  }
  
  const symbolsParam = encodeURIComponent(validSymbols.join(','));
  
  try {
    // Use snapshots endpoint for comprehensive data
    const data = await alpacaFetch(`/v2/stocks/snapshots?symbols=${symbolsParam}&feed=iex`);
    
    const results = {};
    for (const [symbol, snapshot] of Object.entries(data)) {
      if (!snapshot) continue;

      // Get price from best available source: latestTrade > dailyBar > prevDailyBar
      const latestTrade = snapshot.latestTrade;
      const dailyBar = snapshot.dailyBar;
      const prevDailyBar = snapshot.prevDailyBar;

      // Determine current price (prioritize real-time trade, then daily bar close)
      const price = latestTrade?.p || dailyBar?.c || prevDailyBar?.c || 0;
      if (price === 0) continue; // Skip if no price data available

      const prevClose = prevDailyBar?.c || price;
      const change = price - prevClose;
      const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

      results[symbol] = {
        symbol,
        price: price,
        change24h: changePercent,
        volume: dailyBar?.v || 0,
        high: dailyBar?.h || price,
        low: dailyBar?.l || price,
        previousClose: prevClose,
        timestamp: latestTrade?.t ? new Date(latestTrade.t).getTime() : Date.now(),
        provider: 'alpaca',
      };
    }
    
    console.log(`[Alpaca] Fetched ${Object.keys(results).length}/${symbols.length} stock quotes`);
    return results;
  } catch (error) {
    console.error('[Alpaca] Failed to fetch stock quotes:', error.message);
    throw error;
  }
}

/**
 * Get latest quote for a single stock
 * @param {string} symbol - Stock symbol
 * @returns {Promise<object>}
 */
async function getStockQuote(symbol) {
  const quotes = await getStockQuotes([symbol]);
  return quotes[symbol.toUpperCase()] || null;
}

// =============================================================================
// Crypto Data Functions
// =============================================================================

/**
 * Map common crypto symbols to Alpaca format
 * Alpaca uses {SYMBOL}/USD format for crypto
 */
const CRYPTO_SYMBOL_MAP = {
  'BTC': 'BTC/USD',
  'ETH': 'ETH/USD',
  'SOL': 'SOL/USD',
  'XRP': 'XRP/USD',
  'ADA': 'ADA/USD',
  'DOT': 'DOT/USD',
  'AVAX': 'AVAX/USD',
  'MATIC': 'MATIC/USD',
  'LINK': 'LINK/USD',
  'DOGE': 'DOGE/USD',
  'LTC': 'LTC/USD',
  'UNI': 'UNI/USD',
  'ATOM': 'ATOM/USD',
  'XLM': 'XLM/USD',
  'AAVE': 'AAVE/USD',
  'SUSHI': 'SUSHI/USD',
  'BCH': 'BCH/USD',
  'SHIB': 'SHIB/USD',
  'NEAR': 'NEAR/USD',
  'APT': 'APT/USD',
  'ARB': 'ARB/USD',
  'OP': 'OP/USD',
  'MKR': 'MKR/USD',
  'CRV': 'CRV/USD',
  'GRT': 'GRT/USD',
  'FIL': 'FIL/USD',
  'ALGO': 'ALGO/USD',
  'VET': 'VET/USD',
  'HBAR': 'HBAR/USD',
};

/**
 * Convert our symbol to Alpaca crypto symbol
 */
function toAlpacaCryptoSymbol(symbol) {
  const upper = symbol.toUpperCase();
  if (CRYPTO_SYMBOL_MAP[upper]) {
    return CRYPTO_SYMBOL_MAP[upper];
  }
  // If already in Alpaca format
  if (upper.includes('/')) {
    return upper;
  }
  // Default: append /USD
  return `${upper}/USD`;
}

/**
 * Convert Alpaca crypto symbol back to our format
 */
function fromAlpacaCryptoSymbol(alpacaSymbol) {
  return alpacaSymbol.replace('/USD', '').replace('/USDT', '');
}

/**
 * Get latest quotes for multiple cryptocurrencies
 * Uses parallel fetching: Alpaca for supported symbols, CoinGecko for others
 * @param {string[]} symbols - Array of crypto symbols (e.g., ['BTC', 'ETH'])
 * @returns {Promise<object>} - Map of symbol to price data
 */
async function getCryptoQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }

  // Split symbols: CoinGecko-only vs Alpaca-supported
  const coingeckoSymbols = symbols.filter(s => COINGECKO_ONLY.has(s.toUpperCase()));
  const alpacaSymbols = symbols.filter(s => !COINGECKO_ONLY.has(s.toUpperCase()));

  console.log(`[Crypto] Routing: ${alpacaSymbols.length} to Alpaca, ${coingeckoSymbols.length} to CoinGecko`);

  // Fetch in parallel for faster response
  const [alpacaResults, coingeckoResults] = await Promise.all([
    alpacaSymbols.length > 0 ? fetchFromAlpaca(alpacaSymbols) : Promise.resolve({}),
    coingeckoSymbols.length > 0 && coingeckoService
      ? coingeckoService.getCryptoQuotes(coingeckoSymbols).catch(err => {
          console.warn('[CoinGecko] Direct fetch failed:', err.message);
          return {};
        })
      : Promise.resolve({}),
  ]);

  // Merge results
  const results = { ...alpacaResults, ...coingeckoResults };

  // Check if any Alpaca symbols are still missing (fallback to CoinGecko)
  const stillMissing = alpacaSymbols.filter(s => !results[s.toUpperCase()]);
  if (stillMissing.length > 0 && coingeckoService) {
    console.log(`[Alpaca] ${stillMissing.length} symbols missing, trying CoinGecko fallback`);
    try {
      const fallbackResults = await coingeckoService.getCryptoQuotes(stillMissing);
      Object.assign(results, fallbackResults);
    } catch (cgError) {
      console.warn('[CoinGecko] Fallback failed:', cgError.message);
    }
  }

  console.log(`[Crypto] Total: ${Object.keys(results).length}/${symbols.length} quotes fetched`);
  return results;
}

/**
 * Internal: Fetch crypto quotes from Alpaca
 */
async function fetchFromAlpaca(symbols) {
  const alpacaSymbols = symbols.map(toAlpacaCryptoSymbol);
  const symbolsParam = encodeURIComponent(alpacaSymbols.join(','));

  try {
    const data = await alpacaFetch(`/v1beta3/crypto/us/snapshots?symbols=${symbolsParam}`);

    const results = {};
    if (data.snapshots) {
      for (const [alpacaSymbol, snapshot] of Object.entries(data.snapshots)) {
        const ourSymbol = fromAlpacaCryptoSymbol(alpacaSymbol);

        if (snapshot) {
          const latestTrade = snapshot.latestTrade;
          const dailyBar = snapshot.dailyBar;
          const prevDailyBar = snapshot.prevDailyBar;

          const price = latestTrade?.p || dailyBar?.c || 0;
          const prevClose = prevDailyBar?.c || price;
          const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

          results[ourSymbol] = {
            symbol: ourSymbol,
            price: price,
            change24h: changePercent,
            volume: dailyBar?.v || 0,
            high: dailyBar?.h || price,
            low: dailyBar?.l || price,
            previousClose: prevClose,
            timestamp: latestTrade?.t ? new Date(latestTrade.t).getTime() : Date.now(),
            provider: 'alpaca',
          };
        }
      }
    }

    console.log(`[Alpaca] Fetched ${Object.keys(results).length}/${symbols.length} crypto quotes`);
    return results;
  } catch (error) {
    console.error('[Alpaca] Failed to fetch crypto quotes:', error.message);
    return {};
  }
}

/**
 * Get latest quote for a single cryptocurrency
 * @param {string} symbol - Crypto symbol
 * @returns {Promise<object>}
 */
async function getCryptoQuote(symbol) {
  const quotes = await getCryptoQuotes([symbol]);
  return quotes[symbol.toUpperCase()] || null;
}

// =============================================================================
// Combined Market Data Function
// =============================================================================

/**
 * Known crypto symbols - everything else is assumed to be a stock
 * Extended list includes altcoins supported by CoinGecko fallback
 */
const KNOWN_CRYPTO = new Set([
  // Major coins (Alpaca supported)
  'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'AVAX', 'MATIC', 'POL', 'LINK',
  'DOGE', 'BNB', 'SHIB', 'LTC', 'UNI', 'ATOM', 'XLM', 'NEAR', 'APT', 'ARB',
  'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'PEPE', 'WIF', 'BONK', 'JUP', 'RENDER',
  'FET', 'TAO', 'AAVE', 'MKR', 'CRV', 'SNX', 'COMP', 'SUSHI', 'YFI', 'ENS',
  'LDO', 'RPL', 'FXS', 'ALGO', 'HBAR', 'VET', 'FIL', 'THETA', 'EOS', 'XTZ',
  'FLOW', 'SAND', 'MANA', 'AXS', 'GALA', 'IMX', 'BCH', 'ETC', 'TON', 'TRX',
  'KAS', 'GRT', 'RUNE', 'STX', 'NOT', 'ORDI',
  // Altcoins (CoinGecko fallback)
  'ICP', 'LAVA', 'DN', 'QNT', 'XMR', 'CRO', 'OKB', 'MNT', 'RNDR', 'ASTR',
  'EGLD', 'XDC', 'MINA', 'NEO', 'KAVA', 'ZEC', 'CAKE', 'CHZ', 'CFX', 'XEC',
  'IOTA', 'BTT', 'WLD', 'BLUR', 'FLOKI', 'ROSE', 'KLAY', 'ZIL', 'GMT', 'APE',
  'AGIX', '1INCH', 'DYDX', 'GMX', 'OSMO', 'OCEAN', 'AKT',
]);

/**
 * Symbols that should go directly to CoinGecko (not available on Alpaca)
 * These are fetched in parallel with Alpaca symbols to avoid serial fallback delay
 */
const COINGECKO_ONLY = new Set([
  'DN', 'LAVA', 'ICP', 'QNT', 'XMR', 'CRO', 'OKB', 'MNT', 'RNDR', 'ASTR',
  'EGLD', 'XDC', 'MINA', 'NEO', 'KAVA', 'ZEC', 'CAKE', 'CHZ', 'CFX', 'XEC',
  'IOTA', 'BTT', 'WLD', 'BLUR', 'FLOKI', 'ROSE', 'KLAY', 'ZIL', 'GMT', 'APE',
  'AGIX', '1INCH', 'DYDX', 'GMX', 'OSMO', 'OCEAN', 'AKT', 'TON', 'TRX', 'KAS',
  'BNB',
]);

/**
 * Get quotes for a mix of stocks and crypto
 * Automatically routes to correct Alpaca endpoint
 * @param {string[]} symbols - Mixed array of symbols
 * @returns {Promise<object>} - Combined results
 */
async function getQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Separate stocks from crypto
  const cryptoSymbols = [];
  const stockSymbols = [];
  
  for (const symbol of symbols) {
    const upper = symbol.toUpperCase();
    if (KNOWN_CRYPTO.has(upper)) {
      cryptoSymbols.push(upper);
    } else {
      stockSymbols.push(upper);
    }
  }
  
  console.log(`[Alpaca] Routing: ${cryptoSymbols.length} crypto, ${stockSymbols.length} stocks`);
  
  // Fetch in parallel
  const [cryptoResults, stockResults] = await Promise.all([
    cryptoSymbols.length > 0 ? getCryptoQuotes(cryptoSymbols).catch(e => {
      console.error('[Alpaca] Crypto fetch failed:', e.message);
      return {};
    }) : {},
    stockSymbols.length > 0 ? getStockQuotes(stockSymbols).catch(e => {
      console.error('[Alpaca] Stock fetch failed:', e.message);
      return {};
    }) : {},
  ]);
  
  return { ...cryptoResults, ...stockResults };
}

// =============================================================================
// Historical Data Functions
// =============================================================================

/**
 * Get historical bars for a stock
 * @param {string} symbol - Stock symbol
 * @param {string} timeframe - Timeframe (1Min, 5Min, 15Min, 1Hour, 1Day, etc.)
 * @param {number} limit - Number of bars to return
 * @returns {Promise<Array>}
 */
async function getStockBars(symbol, timeframe = '1Day', limit = 30) {
  const upper = symbol.toUpperCase();
  if (!VALID_STOCK_SYMBOL.test(upper)) {
    throw new Error(`Invalid stock symbol: ${symbol}`);
  }
  
  try {
    const data = await alpacaFetch(
      `/v2/stocks/${encodeURIComponent(upper)}/bars?timeframe=${encodeURIComponent(timeframe)}&limit=${limit}&feed=iex`
    );
    
    return (data.bars || []).map(bar => ({
      timestamp: new Date(bar.t).getTime(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
    }));
  } catch (error) {
    console.error(`[Alpaca] Failed to fetch stock bars for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get historical bars for crypto
 * @param {string} symbol - Crypto symbol
 * @param {string} timeframe - Timeframe (1Min, 5Min, 15Min, 1Hour, 1Day, etc.)
 * @param {number} limit - Number of bars to return
 * @returns {Promise<Array>}
 */
async function getCryptoBars(symbol, timeframe = '1Day', limit = 30) {
  const alpacaSymbol = toAlpacaCryptoSymbol(symbol);
  
  try {
    const data = await alpacaFetch(
      `/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(alpacaSymbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`
    );
    
    const bars = data.bars?.[alpacaSymbol] || [];
    return bars.map(bar => ({
      timestamp: new Date(bar.t).getTime(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      vwap: bar.vw,
    }));
  } catch (error) {
    console.error(`[Alpaca] Failed to fetch crypto bars for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get historical bars (auto-routes stock vs crypto)
 * @param {string} symbol - Symbol
 * @param {string} timeframe - Timeframe
 * @param {number} limit - Number of bars
 * @returns {Promise<Array>}
 */
async function getBars(symbol, timeframe = '1Day', limit = 30) {
  const upper = symbol.toUpperCase();
  if (KNOWN_CRYPTO.has(upper)) {
    return getCryptoBars(upper, timeframe, limit);
  }
  return getStockBars(upper, timeframe, limit);
}

// =============================================================================
// Stock Search via Alpaca Trading API
// =============================================================================

/**
 * Search stocks by symbol or name using Alpaca Assets API
 * Uses the trading API (api.alpaca.markets), not the data API
 * @param {string} query - Search query (symbol or company name)
 * @param {number} limit - Max results to return
 * @returns {Promise<Array>} - Array of { symbol, name, exchange, type }
 */
async function searchStocks(query, limit = 15) {
  const credentials = await getCredentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALPACA_CONFIG.REST_TIMEOUT);

  try {
    // Alpaca Assets API filters by status=active and asset_class=us_equity
    const url = `https://api.alpaca.markets/v2/assets?status=active&asset_class=us_equity`;
    console.log(`[Alpaca] Searching stocks for: ${query}`);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'APCA-API-KEY-ID': credentials.apiKey,
        'APCA-API-SECRET-KEY': credentials.apiSecret,
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[Alpaca] Search error: ${response.status}`);
      return [];
    }

    const assets = await response.json();
    const q = query.toUpperCase();

    // Filter and rank results: exact symbol match first, then prefix, then name contains
    const results = assets
      .filter(a => a.tradable && (
        a.symbol.toUpperCase().includes(q) ||
        (a.name && a.name.toUpperCase().includes(q))
      ))
      .sort((a, b) => {
        const aSymbol = a.symbol.toUpperCase();
        const bSymbol = b.symbol.toUpperCase();
        // Exact match first
        if (aSymbol === q) return -1;
        if (bSymbol === q) return 1;
        // Prefix match second
        if (aSymbol.startsWith(q) && !bSymbol.startsWith(q)) return -1;
        if (bSymbol.startsWith(q) && !aSymbol.startsWith(q)) return 1;
        // Shorter symbols first
        return aSymbol.length - bSymbol.length;
      })
      .slice(0, limit)
      .map(a => ({
        symbol: a.symbol,
        name: a.name,
        exchange: a.exchange,
        type: 'stock',
      }));

    console.log(`[Alpaca] Found ${results.length} stocks matching "${query}"`);
    return results;
  } catch (error) {
    clearTimeout(timeout);
    console.error('[Alpaca] Search error:', error.message);
    return [];
  }
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  // Credentials
  getCredentials,
  
  // REST API - Stocks
  getStockQuotes,
  getStockQuote,
  getStockBars,
  
  // REST API - Crypto
  getCryptoQuotes,
  getCryptoQuote,
  getCryptoBars,
  
  // REST API - Combined
  getQuotes,
  getBars,
  searchStocks,
  
  // Utilities
  KNOWN_CRYPTO,
  toAlpacaCryptoSymbol,
  fromAlpacaCryptoSymbol,
  alpacaFetch,
  
  // Config (for testing)
  ALPACA_CONFIG,
};
