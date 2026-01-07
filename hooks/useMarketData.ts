// Real-time Market Data Hook
// Fetches live data from AWS backend

import { useState, useEffect, useCallback } from 'react';
import { config } from '../config';

interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  timestamp: number;
}

interface MarketData {
  BTC: MarketPrice;
  ETH: MarketPrice;
  SOL: MarketPrice;
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

interface UseMarketDataReturn {
  prices: MarketData | null;
  fxRates: FxRates | null;
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const DEFAULT_TOKEN_STORAGE_MODE: 'localStorage' | 'cookie' = import.meta.env.PROD ? 'cookie' : 'localStorage';
const TOKEN_STORAGE_MODE: 'localStorage' | 'cookie' =
  (import.meta.env.VITE_TOKEN_STORAGE_MODE as 'localStorage' | 'cookie') || DEFAULT_TOKEN_STORAGE_MODE;
const USE_SECURE_COOKIES = TOKEN_STORAGE_MODE === 'cookie';

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (USE_SECURE_COOKIES) {
    return null;
  }
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
  
  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    headers,
    ...(USE_SECURE_COOKIES ? { credentials: 'include' } : {}),
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
};

export const useMarketData = (refreshInterval = 60000): UseMarketDataReturn => {
  const [prices, setPrices] = useState<MarketData | null>(null);
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      // Request both crypto and stock prices with type=all
      const [pricesRes, fxRes, newsRes] = await Promise.allSettled([
        fetchWithAuth('/market/prices?type=all&symbols=BTC,ETH,SOL,XRP,ADA,DOT,AVAX,MATIC,LINK,DOGE,AAPL,MSFT,GOOGL,AMZN,NVDA,TSLA,META,JPM,V,MA'),
        fetchWithAuth('/fx/rates?base=USD'),
        fetchWithAuth('/news/latest'),
      ]);

      const rejected = [pricesRes, fxRes, newsRes].filter(result => result.status === 'rejected');
      if (rejected.length > 0) {
        setError('Some data sources failed to load. Showing partial data.');
      }

      // Process prices
      if (pricesRes.status === 'fulfilled' && pricesRes.value.success) {
        const priceData = pricesRes.value.data;
        // Transform to include symbol in each price object
        const transformed: MarketData = {} as MarketData;
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

      // Process FX rates
      if (fxRes.status === 'fulfilled' && fxRes.value.success) {
        setFxRates({
          base: fxRes.value.base,
          rates: fxRes.value.rates,
          timestamp: fxRes.value.timestamp,
        });
      }

      // Process news
      if (newsRes.status === 'fulfilled' && newsRes.value.success) {
        setNews(newsRes.value.data || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return {
    prices,
    fxRates,
    news,
    loading,
    error,
    refresh: fetchData,
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

export default useMarketData;
