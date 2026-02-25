/**
 * WebSocket Service for Real-Time Market Data
 * 
 * Connects to Binance WebSocket for live crypto prices
 * Provides automatic reconnection and heartbeat
 * 
 * IMPORTANT: Uses subscriber pattern - accumulates symbols from all callers
 * so multiple components can share the same WebSocket connection
 */

import { wsLogger } from './logger';

export interface LivePrice {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

export interface WebSocketConfig {
  symbols: string[];
  onPriceUpdate: (prices: Map<string, LivePrice>) => void;
  onConnectionChange: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

interface Subscriber {
  id: string;
  symbols: Set<string>;
  onPriceUpdate: (prices: Map<string, LivePrice>) => void;
  onConnectionChange: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

type WebSocketCallback = (data: any) => void;

class MarketWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private prices: Map<string, LivePrice> = new Map();
  private isConnecting = false;
  private callbacks: Set<WebSocketCallback> = new Set();

  // Subscriber tracking - allows multiple components to share one connection
  private subscribers: Map<string, Subscriber> = new Map();
  private subscriberIdCounter = 0;
  private currentSymbols: Set<string> = new Set();

  // Throttling: batch updates to reduce re-renders (update subscribers max once per interval)
  private readonly UPDATE_THROTTLE_MS = 2000; // 2 seconds between UI updates
  private pendingUpdate = false;
  private throttleTimer: NodeJS.Timeout | null = null;

  // Binance WebSocket streams for crypto
  private readonly BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
  
  /**
   * Convert symbol to Binance format (e.g., BTC -> btcusdt)
   * Works with any crypto symbol - no hardcoded list needed
   */
  private toBinanceSymbol(symbol: string): string {
    return `${symbol.toLowerCase()}usdt`;
  }
  
  /**
   * Convert Binance symbol back to our format (e.g., btcusdt -> BTC)
   */
  private fromBinanceSymbol(binanceSymbol: string): string {
    // Remove 'usdt' suffix and uppercase
    return binanceSymbol.toLowerCase().replace(/usdt$/, '').toUpperCase();
  }
  
  /**
   * Get all unique symbols from all subscribers
   */
  private getAllSymbols(): string[] {
    const allSymbols = new Set<string>();
    this.subscribers.forEach(sub => {
      sub.symbols.forEach(s => allSymbols.add(s.toUpperCase()));
    });
    return Array.from(allSymbols);
  }

  /**
   * Subscribe to price updates - returns unsubscribe function
   * Multiple callers can subscribe with different symbol sets
   */
  subscribe(config: WebSocketConfig): () => void {
    const id = `sub_${++this.subscriberIdCounter}`;
    const subscriber: Subscriber = {
      id,
      symbols: new Set(config.symbols.map(s => s.toUpperCase())),
      onPriceUpdate: config.onPriceUpdate,
      onConnectionChange: config.onConnectionChange,
      onError: config.onError,
    };
    
    this.subscribers.set(id, subscriber);
    
    // Check if we need to reconnect with new symbols
    const newSymbols = this.getAllSymbols();
    const needsReconnect = newSymbols.some(s => !this.currentSymbols.has(s));
    
    if (needsReconnect) {
      this.reconnectWithSymbols(newSymbols);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      // Already connected, send current prices immediately
      subscriber.onConnectionChange(true);
      subscriber.onPriceUpdate(new Map(this.prices));
    } else if (!this.isConnecting && this.subscribers.size === 1) {
      // First subscriber, start connection
      this.connectWithSymbols(newSymbols);
    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      // Don't disconnect if other subscribers exist
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Legacy connect method - wraps subscribe for backward compatibility
   */
  connect(config: WebSocketConfig): void {
    // Clear any existing legacy config and use subscriber pattern
    this.subscribe(config);
  }
  
  /**
   * Connect with specified symbols
   */
  private connectWithSymbols(symbols: string[]): void {
    if (this.isConnecting) {
      wsLogger.debug('WebSocket already connecting');
      return;
    }

    this.isConnecting = true;
    this.currentSymbols = new Set(symbols);
    
    // Build stream URL for multiple symbols
    const streams = symbols
      .map(s => this.toBinanceSymbol(s))
      .map(s => `${s}@ticker`)
      .join('/');

    if (!streams) {
      wsLogger.warn('No valid symbols for WebSocket connection');
      this.isConnecting = false;
      return;
    }

    const wsUrl = `${this.BINANCE_WS_BASE}/${streams}`;
    wsLogger.info(`Connecting to Binance WebSocket with ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      wsLogger.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }
  
  /**
   * Reconnect with new symbol set (when subscribers change)
   */
  private reconnectWithSymbols(symbols: string[]): void {
    // Close existing connection cleanly
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Reconnecting with new symbols');
      this.ws = null;
    }
    this.isConnecting = false;
    
    // Connect with merged symbols
    this.connectWithSymbols(symbols);
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      wsLogger.info(`📡 WebSocket connected to Binance (${this.currentSymbols.size} symbols)`);
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Notify ALL subscribers of connection
      this.subscribers.forEach(sub => sub.onConnectionChange(true));
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        wsLogger.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = () => {
      // Only log once per connection attempt to reduce noise
      if (!this.isConnecting) {
        wsLogger.warn('WebSocket connection failed - falling back to REST API');
      }
      // Notify ALL subscribers of error
      this.subscribers.forEach(sub => sub.onError?.(new Error('WebSocket connection error')));
    };

    this.ws.onclose = (event) => {
      wsLogger.debug('WebSocket closed:', { code: event.code, reason: event.reason });
      this.isConnecting = false;
      
      // Notify ALL subscribers of disconnection
      this.subscribers.forEach(sub => sub.onConnectionChange(false));
      this.stopHeartbeat();
      
      // Auto-reconnect if not intentionally closed and we still have subscribers
      if (event.code !== 1000 && this.subscribers.size > 0) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   * Uses throttling to batch updates and reduce UI re-renders
   */
  private handleMessage(data: any): void {
    // Binance ticker format
    if (data.e === '24hrTicker') {
      // Dynamic conversion - works with any crypto symbol
      const symbol = this.fromBinanceSymbol(data.s);
      const livePrice: LivePrice = {
        symbol,
        price: parseFloat(data.c), // Current price
        change24h: parseFloat(data.P), // Price change percent
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        volume24h: parseFloat(data.v),
        timestamp: data.E,
      };

      this.prices.set(symbol, livePrice);

      // Legacy callbacks get immediate updates (for backward compatibility)
      this.callbacks.forEach(cb => cb(livePrice));

      // Throttle subscriber updates to reduce re-renders
      // Instead of notifying on every tick, batch updates every UPDATE_THROTTLE_MS
      this.scheduleSubscriberUpdate();
    }
  }

  /**
   * Schedule a throttled update to subscribers
   * Batches rapid WebSocket updates into periodic UI refreshes
   */
  private scheduleSubscriberUpdate(): void {
    // Mark that we have pending updates
    this.pendingUpdate = true;

    // If timer already running, let it handle the update
    if (this.throttleTimer) return;

    // Start throttle timer
    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;

      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        // Create a fresh copy of all prices
        const allPrices = new Map(this.prices);
        // Notify ALL subscribers with batched prices
        this.subscribers.forEach(sub => sub.onPriceUpdate(allPrices));
      }
    }, this.UPDATE_THROTTLE_MS);
  }

  /**
   * Start heartbeat to keep connection alive
   * Note: Binance WebSocket streams don't support custom JSON ping messages.
   * Sending {type:'ping'} causes Binance to close the connection (code 1003).
   * We rely on the browser's native WebSocket ping/pong frames and Binance's
   * own keep-alive mechanism. If the connection drops, onclose triggers reconnect.
   */
  private startHeartbeat(): void {
    // No-op: Binance manages keep-alive server-side.
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      wsLogger.error('Max reconnection attempts reached');
      this.subscribers.forEach(sub => sub.onError?.(new Error('Max reconnection attempts reached')));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    wsLogger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      const symbols = this.getAllSymbols();
      if (symbols.length > 0) {
        this.connectWithSymbols(symbols);
      }
    }, delay);
  }

  /**
   * Subscribe to individual price updates (legacy pattern)
   */
  addCallback(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Get current cached prices
   */
  getPrices(): Map<string, LivePrice> {
    return new Map(this.prices);
  }

  /**
   * Get single price
   */
  getPrice(symbol: string): LivePrice | undefined {
    return this.prices.get(symbol.toUpperCase());
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    // Clear throttle timer
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.pendingUpdate = false;
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.prices.clear();
    this.callbacks.clear();
    this.currentSymbols.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Update subscription symbols - triggers reconnect if needed
   */
  updateSymbols(symbols: string[]): void {
    const newSymbols = symbols.map(s => s.toUpperCase());
    const needsReconnect = newSymbols.some(s => !this.currentSymbols.has(s));
    
    if (needsReconnect) {
      this.reconnectWithSymbols(newSymbols);
    }
  }
  
  /**
   * Get count of active subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }
  
  /**
   * Get all currently subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return this.getAllSymbols();
  }
}

// Singleton instance
export const marketWebSocket = new MarketWebSocketService();

export default marketWebSocket;
