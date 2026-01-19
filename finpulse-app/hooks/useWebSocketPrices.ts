/**
 * useWebSocketPrices Hook
 * 
 * Provides real-time price updates via WebSocket
 * with automatic connection management and fallback to REST API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { marketWebSocket, LivePrice } from '../services/websocketService';
import { fetchMarketPrices } from './useMarketData';

interface UseWebSocketPricesOptions {
  symbols?: string[];
  enabled?: boolean;
  fallbackInterval?: number; // Fallback to REST polling if WS fails
}

interface UseWebSocketPricesReturn {
  prices: Map<string, LivePrice>;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  reconnect: () => void;
  lastUpdate: Date | null;
}

// No default symbols - hook subscribes to whatever symbols the caller provides
// This allows any crypto to work dynamically without hardcoded lists

export function useWebSocketPrices(options: UseWebSocketPricesOptions = {}): UseWebSocketPricesReturn {
  const {
    symbols = [], // Empty by default - caller provides their portfolio symbols
    enabled = true,
    fallbackInterval = 60000,
  } = options;

  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Handle price updates from WebSocket
  const handlePriceUpdate = useCallback((newPrices: Map<string, LivePrice>) => {
    if (!isMountedRef.current) return;
    setPrices(newPrices);
    setLastUpdate(new Date());
    setIsLoading(false);
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback((connected: boolean) => {
    if (!isMountedRef.current) return;
    setIsConnected(connected);
    
    if (!connected) {
      // Start fallback polling when disconnected
      startFallbackPolling();
    } else {
      // Stop fallback when connected
      stopFallbackPolling();
    }
  }, []);

  // Handle WebSocket errors
  const handleError = useCallback((err: Error) => {
    if (!isMountedRef.current) return;
    console.error('WebSocket error:', err);
    setError(err);
  }, []);

  // Fallback to REST API polling when WebSocket disconnects
  const fetchFallbackPrices = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      // Fetch from AWS backend API (handles all price sources server-side)
      const response = await fetchMarketPrices();
      if (response.success && response.data && isMountedRef.current) {
        const newPrices = new Map<string, LivePrice>();
        
        Object.entries(response.data).forEach(([symbol, data]: [string, any]) => {
          newPrices.set(symbol.toUpperCase(), {
            symbol: symbol.toUpperCase(),
            price: data.price,
            change24h: data.change24h || 0,
            high24h: data.high24h || data.price,
            low24h: data.low24h || data.price,
            volume24h: data.volume || 0,
            timestamp: data.timestamp || Date.now(),
          });
        });
        
        setPrices(prev => {
          const merged = new Map(prev);
          newPrices.forEach((value, key) => merged.set(key, value));
          return merged;
        });
        setLastUpdate(new Date());
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Backend API fetch failed:', err);
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) return;
    
    // Immediate fetch
    fetchFallbackPrices();
    
    // Set up interval
    fallbackTimerRef.current = setInterval(fetchFallbackPrices, fallbackInterval);
  }, [fetchFallbackPrices, fallbackInterval]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    setError(null);
    marketWebSocket.disconnect();
    marketWebSocket.connect({
      symbols,
      onPriceUpdate: handlePriceUpdate,
      onConnectionChange: handleConnectionChange,
      onError: handleError,
    });
  }, [symbols, handlePriceUpdate, handleConnectionChange, handleError]);

  // Connect on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      // Use fallback polling if WebSocket disabled
      startFallbackPolling();
      return () => {
        isMountedRef.current = false;
        stopFallbackPolling();
      };
    }

    // Connect WebSocket
    marketWebSocket.connect({
      symbols,
      onPriceUpdate: handlePriceUpdate,
      onConnectionChange: handleConnectionChange,
      onError: handleError,
    });

    // Initial fallback fetch while waiting for WS
    fetchFallbackPrices();

    return () => {
      isMountedRef.current = false;
      marketWebSocket.disconnect();
      stopFallbackPolling();
    };
  }, [enabled, symbols.join(',')]); // Re-connect if symbols change

  return {
    prices,
    isConnected,
    isLoading,
    error,
    reconnect,
    lastUpdate,
  };
}

/**
 * Hook for single symbol real-time price
 */
export function useSymbolPrice(symbol: string, enabled = true) {
  const { prices, isConnected, lastUpdate } = useWebSocketPrices({
    symbols: [symbol],
    enabled,
  });

  return {
    price: prices.get(symbol.toUpperCase()),
    isConnected,
    lastUpdate,
  };
}

export default useWebSocketPrices;
