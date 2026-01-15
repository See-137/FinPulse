/**
 * FinPulse FX Service v2.0
 * Static exchange rates (updated periodically)
 * 
 * Note: Alpaca doesn't provide FX rates. For a trading app focused on
 * stocks/crypto, we use static rates that are updated weekly.
 * For real-time FX, consider adding a dedicated FX API later.
 * 
 * Migration: Removed ExchangeRate-API dependency
 */

// Static rates (as of last update - refresh manually or via scheduled job)
// Base: USD - Last updated: 2026-01-09
const STATIC_RATES = {
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

const LAST_UPDATED = '2026-01-09T00:00:00Z';
const SUPPORTED_CURRENCIES = Object.keys(STATIC_RATES);

// Cache for converted rates (to avoid recalculating)
const ratesCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

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

/**
 * Get exchange rates for a given base currency
 * @param {string} baseCurrency - Base currency code (e.g., 'USD', 'EUR')
 * @returns {object} - Exchange rates relative to base
 */
function getExchangeRates(baseCurrency = 'USD') {
  const cacheKey = `rates:${baseCurrency}`;
  const cached = ratesCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.rates;
  }
  
  const baseRate = STATIC_RATES[baseCurrency];
  if (!baseRate) {
    throw new Error(`Unsupported base currency: ${baseCurrency}`);
  }
  
  // Convert all rates relative to requested base
  const rates = {};
  for (const [currency, rate] of Object.entries(STATIC_RATES)) {
    rates[currency] = rate / baseRate;
  }
  
  ratesCache.set(cacheKey, { rates, timestamp: Date.now() });
  return rates;
}

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(sanitizeEvent(event)));
  
  const headers = {
    'Content-Type': 'application/json',
    process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path || '';
    const queryParams = event.queryStringParameters || {};
    
    // GET /fx/rates
    if (path.includes('/rates') || path.endsWith('/fx')) {
      const base = (queryParams.base || 'USD').toUpperCase();
      
      try {
        const rates = getExchangeRates(base);
        
        // Filter to supported currencies if requested
        const filteredRates = {};
        SUPPORTED_CURRENCIES.forEach(currency => {
          if (rates[currency]) filteredRates[currency] = rates[currency];
        });
        
        return {
          statusCode: 200, 
          headers,
          body: JSON.stringify({ 
            success: true, 
            base: base, 
            rates: filteredRates, 
            timestamp: LAST_UPDATED,
            source: 'static',
            note: 'Rates are approximate and updated weekly. For real-time FX, upgrade to premium.'
          })
        };
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: error.message,
            supported: SUPPORTED_CURRENCIES
          })
        };
      }
    }
    
    // GET /fx/convert?amount=100&from=USD&to=ILS
    if (path.includes('/convert')) {
      const { amount, from = 'USD', to = 'ILS' } = queryParams;
      
      if (!amount) {
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ success: false, error: 'amount parameter required' }) 
        };
      }
      
      // Validate amount is a valid positive number
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid amount - must be a positive number' })
        };
      }
      
      try {
        const fromCurrency = from.toUpperCase();
        const toCurrency = to.toUpperCase();
        const rates = getExchangeRates(fromCurrency);
        const rate = rates[toCurrency];
        
        if (!rate) {
          return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ 
              success: false,
              error: `Currency ${toCurrency} not supported`,
              supported: SUPPORTED_CURRENCIES
            }) 
          };
        }
        
        const converted = numericAmount * rate;
        
        return {
          statusCode: 200, 
          headers,
          body: JSON.stringify({ 
            success: true, 
            from: fromCurrency, 
            to: toCurrency, 
            amount: numericAmount, 
            rate: rate, 
            converted: Math.round(converted * 100) / 100, 
            timestamp: LAST_UPDATED,
            source: 'static'
          })
        };
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
    }
    
    // GET /fx/currencies
    if (path.includes('/currencies')) {
      return {
        statusCode: 200, 
        headers,
        body: JSON.stringify({ 
          success: true, 
          currencies: SUPPORTED_CURRENCIES, 
          count: SUPPORTED_CURRENCIES.length,
          lastUpdated: LAST_UPDATED
        })
      };
    }
    
    // Default
    return {
      statusCode: 200, 
      headers,
      body: JSON.stringify({ 
        service: 'FinPulse FX Service', 
        version: '2.0.0',
        source: 'static',
        note: 'Using static rates (Alpaca does not provide FX data)',
        lastUpdated: LAST_UPDATED,
        endpoints: [
          'GET /fx/rates?base=USD', 
          'GET /fx/convert?amount=100&from=USD&to=ILS', 
          'GET /fx/currencies'
        ] 
      })
    };
    
  } catch (error) {
    console.error('FX Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        message: error.message 
      }) 
    };
  }
};
