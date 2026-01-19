// Real-time Market Data Hook
// Fetches live data from AWS backend
// Supports dynamic symbols based on user portfolio

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

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('finpulse_id_token');
};

// API helper with auth
const fetchWithAuth = async (endpoint: string) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${config.apiUrl}${endpoint}`, { headers });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
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

  const [prices, setPrices] = useState<MarketData | null>(null);
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Track previous symbols to detect changes
  const prevSymbolsRef = useRef<string>('');

  const fetchData = useCallback(async (symbolsToFetch: string[]) => {
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
      }

      // Process FX rates (second if enabled)
      let resultIndex = 1;
      if (shouldFetchFx && results[resultIndex]) {
        const fxRes = results[resultIndex];
        if (fxRes.status === 'fulfilled' && fxRes.value.success) {
          setFxRates({
            base: fxRes.value.base,
            rates: fxRes.value.rates,
            timestamp: fxRes.value.timestamp,
          });
        }
        resultIndex++;
      }

      // Process news (last if enabled)
      if (shouldFetchNews && results[resultIndex]) {
        const newsRes = results[resultIndex];
        if (newsRes.status === 'fulfilled' && newsRes.value.success) {
          setNews(newsRes.value.articles || newsRes.value.data || []);
        }
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
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
 * Fetch crypto prices from CoinGecko (free, no API key required)
 * Used as fallback for cryptos not available on Binance WebSocket
 */
export const fetchCoinGeckoPrices = async (symbols: string[]): Promise<Record<string, { price: number; change24h: number }>> => {
  if (symbols.length === 0) return {};
  
  try {
    // CoinGecko uses IDs, not symbols. Common mappings:
    const symbolToId: Record<string, string> = {
      'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana',
      'XRP': 'ripple', 'ADA': 'cardano', 'DOT': 'polkadot',
      'AVAX': 'avalanche-2', 'MATIC': 'matic-network', 'LINK': 'chainlink',
      'DOGE': 'dogecoin', 'BNB': 'binancecoin', 'SHIB': 'shiba-inu',
      'ICP': 'internet-computer', 'DN': 'destra-network', 'LAVA': 'lava-network',
      'PEPE': 'pepe', 'ARB': 'arbitrum', 'OP': 'optimism',
    };
    
    const ids = symbols
      .map(s => symbolToId[s.toUpperCase()] || s.toLowerCase())
      .join(',');
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) return {};
    
    const data = await response.json();
    const result: Record<string, { price: number; change24h: number }> = {};
    
    // Reverse map IDs back to symbols
    const idToSymbol: Record<string, string> = {};
    for (const [symbol, id] of Object.entries(symbolToId)) {
      idToSymbol[id] = symbol;
    }
    
    for (const [id, priceData] of Object.entries(data)) {
      const symbol = idToSymbol[id] || id.toUpperCase();
      const pd = priceData as { usd?: number; usd_24h_change?: number };
      if (pd.usd) {
        result[symbol] = {
          price: pd.usd,
          change24h: pd.usd_24h_change || 0,
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
