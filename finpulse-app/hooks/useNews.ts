// Shared News Hook
// Single source of truth for news data across components
// Features: localStorage caching, visibility-aware refresh, request deduplication

import { useEffect, useRef, useReducer } from 'react';
import { NewsArticle, NewsSource, UseNewsReturn } from '../types/news';
import { fetchNews } from './useMarketData';

// API response item shape
interface NewsApiItem {
  id: string;
  title: string;
  description?: string;
  content?: string;
  source?: string;
  url?: string;
  image?: string;
  publishedAt?: string;
  category?: string;
}

// Cache configuration
const CACHE_KEY = 'finpulse_cache_news_v2';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Singleton state for cross-component sharing
let sharedArticles: NewsArticle[] = [];
let sharedSource: NewsSource = 'offline';
let sharedLastUpdated: Date | null = null;
let sharedLoading = false;
let sharedError: string | null = null;
const listeners: Set<() => void> = new Set();
let fetchPromise: Promise<void> | null = null;

// Notify all hook instances of state change
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Load from localStorage cache
const loadFromCache = (): NewsArticle[] | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data as NewsArticle[];
  } catch {
    return null;
  }
};

// Save to localStorage cache
const saveToCache = (data: NewsArticle[]): void => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable - ignore
  }
};

// Core fetch function - shared across all instances
const fetchNewsData = async (): Promise<void> => {
  // If already fetching, return existing promise (deduplication)
  if (fetchPromise) {
    return fetchPromise;
  }

  sharedLoading = true;
  sharedError = null;
  notifyListeners();

  fetchPromise = (async () => {
    try {
      const result = await fetchNews();

      // API returns articles field
      const newsData = result.articles || result.data || [];

      if (result.success && newsData.length > 0) {
        sharedArticles = newsData.map((item: NewsApiItem) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          content: item.content,
          source: item.source || 'News',
          url: item.url || '',
          image: item.image,
          publishedAt: item.publishedAt,
          category: item.category || 'market',
        }));

        // Determine source indicator
        if (result.source === 'static') {
          sharedSource = 'offline';
        } else if (result.cached) {
          sharedSource = 'cached';
        } else {
          sharedSource = 'live';
        }

        saveToCache(sharedArticles);
        sharedLastUpdated = new Date();
      } else {
        sharedSource = 'offline';
      }
    } catch (err) {
      sharedError = err instanceof Error ? err.message : 'Failed to fetch news';
      sharedSource = 'offline';
    } finally {
      sharedLoading = false;
      fetchPromise = null;
      notifyListeners();
    }
  })();

  return fetchPromise;
};

// Initialize from cache on module load
const cachedData = loadFromCache();
if (cachedData) {
  sharedArticles = cachedData;
  sharedSource = 'cached';
}

interface UseNewsOptions {
  maxArticles?: number;
  autoRefresh?: boolean;
}

/**
 * Hook for accessing shared news data
 * Multiple components can use this hook without triggering duplicate API calls
 */
export const useNews = (options: UseNewsOptions = {}): UseNewsReturn => {
  const { maxArticles = 10, autoRefresh = true } = options;

  // Force re-render when shared state changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const isVisibleRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to shared state changes
  useEffect(() => {
    const listener = () => forceUpdate();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Initial fetch if no data
  useEffect(() => {
    if (sharedArticles.length === 0 && !sharedLoading) {
      fetchNewsData();
    }
  }, []);

  // Visibility-aware auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current && intervalRef.current === null) {
        // Tab became visible - start refresh interval
        intervalRef.current = setInterval(() => {
          if (isVisibleRef.current) {
            fetchNewsData();
          }
        }, REFRESH_INTERVAL);
      } else if (!isVisibleRef.current && intervalRef.current !== null) {
        // Tab hidden - stop refresh
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Start refresh interval if visible
    if (document.visibilityState === 'visible') {
      intervalRef.current = setInterval(() => {
        if (isVisibleRef.current) {
          fetchNewsData();
        }
      }, REFRESH_INTERVAL);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  // Return sliced articles based on maxArticles option
  const articles = maxArticles > 0
    ? sharedArticles.slice(0, maxArticles)
    : sharedArticles;

  return {
    articles,
    loading: sharedLoading,
    error: sharedError,
    source: sharedSource,
    refresh: fetchNewsData,
    lastUpdated: sharedLastUpdated,
  };
};

export default useNews;
