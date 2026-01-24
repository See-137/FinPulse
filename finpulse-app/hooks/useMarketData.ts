// Real-time Market Data Hook
// Fetches live data from AWS backend
// Supports dynamic symbols based on user portfolio
// Features: localStorage caching, retry with backoff, request deduplication

import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '../config';

interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  timestamp: number;
}

interface MarketData {
  [key: string]: MarketPrice;
}

interface FxRates {
  base: string;
  rates: Record<string, number>;
  timestamp: string;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  content?: string;
  source: string;
  url: string;
  image?: string;
  publishedAt: string;
  category: string;
}

interface UseMarketDataOptions {
  symbols?: string[];         // Dynamic symbols to fetch
  refreshInterval?: number;   // Refresh interval in ms (default: 60000)
  fetchNews?: boolean;        // Whether to fetch news (default: true)
  fetchFx?: boolean;          // Whether to fetch FX rates (default: true)
}

interface UseMarketDataReturn {
  prices: MarketData | null;
  fxRates: FxRates | null;
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// Cache configuration
const CACHE_KEYS = {
  PRICES: 'finpulse_cache_prices',
  FX_RATES: 'finpulse_cache_fx',
  NEWS: 'finpulse_cache_news',
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// In-flight request deduplication
const inFlightRequests = new Map<string, Promise<any>>();

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('finpulse_id_token');
};

// localStorage cache helpers
const saveToCache = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // localStorage full or unavailable - ignore
  }
};

const loadFromCache = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data as T;
  } catch {
    return null;
  }
};

// Retry with exponential backoff
const fetchWithRetry = async (
  endpoint: string,
  retries = MAX_RETRIES,
  backoff = INITIAL_BACKOFF_MS
): Promise<any> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, { headers });

    if (!response.ok) {
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`API Error: ${response.status}`);
      }
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (retries > 0 && !(error instanceof Error && error.message.includes('4'))) {
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(endpoint, retries - 1, backoff * 2);
    }
    throw error;
  }
};

// Deduplicated fetch - prevents concurrent identical requests
const fetchWithAuth = async (endpoint: string): Promise<any> => {
  // Check if request is already in-flight
  const existingRequest = inFlightRequests.get(endpoint);
  if (existingRequest) {
    return existingRequest;
  }

  // Create new request with retry logic
  const request = fetchWithRetry(endpoint)
    .finally(() => {
      // Clean up after request completes
      inFlightRequests.delete(endpoint);
    });

  inFlightRequests.set(endpoint, request);
  return request;
};

/**
 * Hook for fetching real-time market data
 * @param options - Configuration options including dynamic symbols
 */
export const useMarketData = (options: UseMarketDataOptions | number = {}): UseMarketDataReturn => {
  // Support legacy signature: useMarketData(refreshInterval)
  const opts: UseMarketDataOptions = typeof options === 'number' 
    ? { refreshInterval: options } 
    : options;
  
  const {
    symbols = [],
    refreshInterval = 60000,
    fetchNews: shouldFetchNews = true,
    fetchFx: shouldFetchFx = true,
  } = opts;

  // Load initial state from cache for instant display
  const [prices, setPrices] = useState<MarketData | null>(() => loadFromCache(CACHE_KEYS.PRICES));
  const [fxRates, setFxRates] = useState<FxRates | null>(() => loadFromCache(CACHE_KEYS.FX_RATES));
  const [news, setNews] = useState<NewsItem[]>(() => loadFromCache(CACHE_KEYS.NEWS) || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track previous symbols and in-flight state to prevent duplicates
  const prevSymbolsRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);

  const fetchData = useCallback(async (symbolsToFetch: string[]) => {
    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    try {
      setLoading(true);
      setError(null);

      // Build dynamic symbols list
      // Always include some base symbols for general market overview
      const baseSymbols = ['BTC', 'ETH', 'SOL'];
      const allSymbols = [...new Set([...baseSymbols, ...symbolsToFetch])];
      const symbolsParam = allSymbols.join(',');

      // Build requests array
      const requests: Promise<any>[] = [
        fetchWithAuth(`/market/prices?type=all&symbols=${symbolsParam}`),
      ];

      if (shouldFetchFx) {
        requests.push(fetchWithAuth('/fx/rates?base=USD'));
      }

      if (shouldFetchNews) {
        requests.push(fetchWithAuth('/news/latest'));
      }

      const results = await Promise.allSettled(requests);

      // Process prices (always first)
      const pricesRes = results[0];
      if (pricesRes.status === 'fulfilled' && pricesRes.value.success) {
        const priceData = pricesRes.value.data;
        const transformed: MarketData = {};
        Object.entries(priceData).forEach(([symbol, data]: [string, any]) => {
          transformed[symbol] = {
            symbol,
            price: data.price,
            change24h: data.change24h,
            marketCap: data.marketCap,
            timestamp: data.timestamp,
          };
        });
        setPrices(transformed);
        saveToCache(CACHE_KEYS.PRICES, transformed);
      }

      // Process FX rates (second if enabled)
      let resultIndex = 1;
      if (shouldFetchFx && results[resultIndex]) {
        const fxRes = results[resultIndex];
        if (fxRes.status === 'fulfilled' && fxRes.value.success) {
          const fxData = {
            base: fxRes.value.base,
            rates: fxRes.value.rates,
            timestamp: fxRes.value.timestamp,
          };
          setFxRates(fxData);
          saveToCache(CACHE_KEYS.FX_RATES, fxData);
        }
        resultIndex++;
      }

      // Process news (last if enabled)
      if (shouldFetchNews && results[resultIndex]) {
        const newsRes = results[resultIndex];
        if (newsRes.status === 'fulfilled' && newsRes.value.success) {
          const newsData = newsRes.value.articles || newsRes.value.data || [];
          setNews(newsData);
          saveToCache(CACHE_KEYS.NEWS, newsData);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [shouldFetchNews, shouldFetchFx]);

  // Refetch when symbols change
  useEffect(() => {
    const symbolsKey = symbols.sort().join(',');
    if (symbolsKey !== prevSymbolsRef.current) {
      prevSymbolsRef.current = symbolsKey;
      fetchData(symbols);
    }
  }, [symbols, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData(symbols);
  }, []);  // Only on mount

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(() => fetchData(symbols), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, symbols]);

  return {
    prices,
    fxRates,
    news,
    loading,
    error,
    refresh: () => fetchData(symbols),
    lastUpdated,
  };
};

// Standalone fetch functions for one-off requests
export const fetchMarketPrices = () => fetchWithAuth('/market/prices');
export const fetchFxRates = (base = 'USD') => fetchWithAuth(`/fx/rates?base=${base}`);
export const fetchFxConvert = (amount: number, from: string, to: string) => 
  fetchWithAuth(`/fx/convert?amount=${amount}&from=${from}&to=${to}`);
export const fetchNews = (category?: string) => 
  fetchWithAuth(`/news/latest${category ? `?category=${category}` : ''}`);
export const searchNews = (query: string) => fetchWithAuth(`/news/search?q=${encodeURIComponent(query)}`);

/**
 * Fetch crypto prices - uses AWS backend which proxies to multiple sources
 * The backend handles CoinGecko, Binance, and other APIs server-side (no CORS issues)
 */
export const fetchCoinGeckoPrices = async (symbols: string[]): Promise<Record<string, { price: number; change24h: number }>> => {
  if (symbols.length === 0) return {};
  
  try {
    // Route through AWS backend - it will fetch from CoinGecko/Binance server-side
    const symbolsParam = symbols.map(s => s.toUpperCase()).join(',');
    const response = await fetchWithAuth(`/market/prices?symbols=${symbolsParam}&type=crypto`);
    
    if (!response.success || !response.data) return {};
    
    const result: Record<string, { price: number; change24h: number }> = {};
    
    for (const [symbol, priceData] of Object.entries(response.data)) {
      const pd = priceData as { price?: number; change24h?: number };
      if (pd.price) {
        result[symbol] = {
          price: pd.price,
          change24h: pd.change24h || 0,
        };
      }
    }
    
    return result;
  } catch (err) {
    console.error('CoinGecko fetch failed:', err);
    return {};
  }
};

export default useMarketData;
