/**
 * FinPulse CoinGecko Service
 * Fallback data provider for crypto assets not supported by Alpaca
 * 
 * CoinGecko API (Free tier):
 * - 10-30 calls/minute
 * - No API key required for basic endpoints
 * - Broad coverage of altcoins
 */

// =============================================================================
// Configuration
// =============================================================================

const COINGECKO_CONFIG = {
  BASE_URL: 'https://api.coingecko.com/api/v3',
  TIMEOUT: 10000,
  RATE_LIMIT_DELAY: 1500, // ms between requests to avoid rate limiting
};

// Symbol to CoinGecko ID mapping for common coins
// CoinGecko uses slugs like 'bitcoin', 'ethereum', not ticker symbols
const SYMBOL_TO_COINGECKO_ID = {
  // Major coins (should be in Alpaca, but as backup)
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'POL': 'matic-network',
  'LINK': 'chainlink',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'ATOM': 'cosmos',
  'UNI': 'uniswap',
  'XLM': 'stellar',
  
  // Altcoins NOT supported by Alpaca
  'ICP': 'internet-computer',
  'FIL': 'filecoin',
  'HBAR': 'hedera-hashgraph',
  'VET': 'vechain',
  'ALGO': 'algorand',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'INJ': 'injective-protocol',
  'SUI': 'sui',
  'SEI': 'sei-network',
  'TIA': 'celestia',
  'LAVA': 'lava-network',
  'DN': 'deepnode',
  'PEPE': 'pepe',
  'WIF': 'dogwifcoin',
  'BONK': 'bonk',
  'JUP': 'jupiter-exchange-solana',
  'RENDER': 'render-token',
  'FET': 'fetch-ai',
  'TAO': 'bittensor',
  'AAVE': 'aave',
  'MKR': 'maker',
  'CRV': 'curve-dao-token',
  'SNX': 'havven',
  'COMP': 'compound-governance-token',
  'SUSHI': 'sushi',
  'YFI': 'yearn-finance',
  'ENS': 'ethereum-name-service',
  'LDO': 'lido-dao',
  'RPL': 'rocket-pool',
  'FXS': 'frax-share',
  'THETA': 'theta-token',
  'EOS': 'eos',
  'XTZ': 'tezos',
  'FLOW': 'flow',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'GALA': 'gala',
  'IMX': 'immutable-x',
  'ETC': 'ethereum-classic',
  'TON': 'the-open-network',
  'TRX': 'tron',
  'KAS': 'kaspa',
  'GRT': 'the-graph',
  'RUNE': 'thorchain',
  'STX': 'blockstack',
  'NOT': 'notcoin',
  'ORDI': 'ordinals',
  'SHIB': 'shiba-inu',
  'BNB': 'binancecoin',
  
  // Additional altcoins
  'QNT': 'quant-network',
  'XMR': 'monero',
  'CRO': 'crypto-com-chain',
  'OKB': 'okb',
  'MNT': 'mantle',
  'RNDR': 'render-token',
  'ASTR': 'astar',
  'EGLD': 'elrond-erd-2',
  'XDC': 'xdce-crowd-sale',
  'MINA': 'mina-protocol',
  'NEO': 'neo',
  'KAVA': 'kava',
  'ZEC': 'zcash',
  'CAKE': 'pancakeswap-token',
  'CHZ': 'chiliz',
  'CFX': 'conflux-token',
  'XEC': 'ecash',
  'IOTA': 'iota',
  'BTT': 'bittorrent',
  'WLD': 'worldcoin-wld',
  'BLUR': 'blur',
  'FLOKI': 'floki',
  'ROSE': 'oasis-network',
  'KLAY': 'klay-token',
  'ZIL': 'zilliqa',
  'GMT': 'stepn',
  'APE': 'apecoin',
  'AGIX': 'singularitynet',
  '1INCH': '1inch',
  'DYDX': 'dydx',
  'GMX': 'gmx',
  'OSMO': 'osmosis',
  'OCEAN': 'ocean-protocol',
  'AKT': 'akash-network',
};

// Reverse map for looking up symbols from CoinGecko IDs
const COINGECKO_ID_TO_SYMBOL = Object.fromEntries(
  Object.entries(SYMBOL_TO_COINGECKO_ID).map(([symbol, id]) => [id, symbol])
);

// Rate limiting state
let lastRequestTime = 0;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate-limited fetch for CoinGecko API
 */
async function coingeckoFetch(endpoint) {
  // Respect rate limits
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < COINGECKO_CONFIG.RATE_LIMIT_DELAY) {
    await sleep(COINGECKO_CONFIG.RATE_LIMIT_DELAY - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();
  
  const url = `${COINGECKO_CONFIG.BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), COINGECKO_CONFIG.TIMEOUT);
  
  try {
    console.log(`[CoinGecko] GET ${endpoint}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeout);
    
    if (response.status === 429) {
      console.warn('[CoinGecko] Rate limited, waiting...');
      await sleep(60000); // Wait 1 minute on rate limit
      throw new Error('CoinGecko rate limited');
    }
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[CoinGecko] API Error ${response.status}: ${errorBody}`);
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('CoinGecko API request timed out');
    }
    throw error;
  }
}

/**
 * Get CoinGecko ID for a symbol
 */
function getCoingeckoId(symbol) {
  const upper = symbol.toUpperCase();
  return SYMBOL_TO_COINGECKO_ID[upper] || upper.toLowerCase();
}

/**
 * Get symbol from CoinGecko ID
 */
function getSymbolFromId(coingeckoId) {
  return COINGECKO_ID_TO_SYMBOL[coingeckoId] || coingeckoId.toUpperCase();
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get quotes for multiple cryptocurrencies from CoinGecko
 * @param {string[]} symbols - Array of crypto symbols
 * @returns {Promise<object>} - Map of symbol to price data
 */
async function getCryptoQuotes(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }
  
  // Convert symbols to CoinGecko IDs
  const ids = symbols.map(getCoingeckoId);
  const idsParam = ids.join(',');
  
  try {
    // Use simple price endpoint for efficiency
    const data = await coingeckoFetch(
      `/simple/price?ids=${encodeURIComponent(idsParam)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`
    );
    
    const results = {};
    
    for (const [coingeckoId, priceData] of Object.entries(data)) {
      const symbol = getSymbolFromId(coingeckoId);
      
      if (priceData && priceData.usd !== undefined) {
        results[symbol] = {
          symbol,
          price: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          volume: priceData.usd_24h_vol || 0,
          marketCap: priceData.usd_market_cap || 0,
          timestamp: Date.now(),
          provider: 'coingecko',
        };
      }
    }
    
    console.log(`[CoinGecko] Fetched ${Object.keys(results).length}/${symbols.length} crypto quotes`);
    return results;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch crypto quotes:', error.message);
    return {};
  }
}

/**
 * Get detailed info for a single cryptocurrency
 * @param {string} symbol - Crypto symbol
 * @returns {Promise<object|null>}
 */
async function getCryptoDetails(symbol) {
  const coingeckoId = getCoingeckoId(symbol);
  
  try {
    const data = await coingeckoFetch(
      `/coins/${encodeURIComponent(coingeckoId)}?localization=false&tickers=false&community_data=false&developer_data=false`
    );
    
    if (!data) return null;
    
    const marketData = data.market_data || {};
    
    return {
      symbol: symbol.toUpperCase(),
      name: data.name,
      price: marketData.current_price?.usd || 0,
      change24h: marketData.price_change_percentage_24h || 0,
      change7d: marketData.price_change_percentage_7d || 0,
      change30d: marketData.price_change_percentage_30d || 0,
      volume: marketData.total_volume?.usd || 0,
      marketCap: marketData.market_cap?.usd || 0,
      circulatingSupply: marketData.circulating_supply || 0,
      totalSupply: marketData.total_supply || 0,
      ath: marketData.ath?.usd || 0,
      athChangePercent: marketData.ath_change_percentage?.usd || 0,
      athDate: marketData.ath_date?.usd,
      high24h: marketData.high_24h?.usd || 0,
      low24h: marketData.low_24h?.usd || 0,
      image: data.image?.small,
      timestamp: Date.now(),
      provider: 'coingecko',
    };
  } catch (error) {
    console.error(`[CoinGecko] Failed to fetch details for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Search for coins by query
 * @param {string} query - Search term
 * @returns {Promise<Array>}
 */
async function searchCoins(query) {
  try {
    const data = await coingeckoFetch(`/search?query=${encodeURIComponent(query)}`);
    
    return (data.coins || []).slice(0, 20).map(coin => ({
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      coingeckoId: coin.id,
      marketCapRank: coin.market_cap_rank,
      thumb: coin.thumb,
    }));
  } catch (error) {
    console.error('[CoinGecko] Search failed:', error.message);
    return [];
  }
}

/**
 * Check if a symbol is supported by CoinGecko
 * @param {string} symbol - Crypto symbol
 * @returns {boolean}
 */
function isSupported(symbol) {
  const upper = symbol.toUpperCase();
  return SYMBOL_TO_COINGECKO_ID.hasOwnProperty(upper);
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  getCryptoQuotes,
  getCryptoDetails,
  searchCoins,
  isSupported,
  getCoingeckoId,
  getSymbolFromId,
  SYMBOL_TO_COINGECKO_ID,
  COINGECKO_CONFIG,
};
