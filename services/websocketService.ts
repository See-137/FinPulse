/**
 * WebSocket Service for Real-Time Market Data
 * 
 * Connects to Binance WebSocket for live crypto prices
 * Provides automatic reconnection and heartbeat
 */

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

type WebSocketCallback = (data: any) => void;

class MarketWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: WebSocketConfig | null = null;
  private prices: Map<string, LivePrice> = new Map();
  private isConnecting = false;
  private subscriptions: Set<WebSocketCallback> = new Set();

  // Binance WebSocket streams for crypto
  private readonly BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
  
  // Map our symbols to Binance format (lowercase + usdt)
  private readonly symbolMap: Record<string, string> = {
    'BTC': 'btcusdt',
    'ETH': 'ethusdt',
    'SOL': 'solusdt',
    'XRP': 'xrpusdt',
    'ADA': 'adausdt',
    'DOT': 'dotusdt',
    'AVAX': 'avaxusdt',
    'MATIC': 'maticusdt',
    'LINK': 'linkusdt',
    'DOGE': 'dogeusdt',
    'BNB': 'bnbusdt',
    'SHIB': 'shibusdt',
  };

  /**
   * Connect to WebSocket with given configuration
   */
  connect(config: WebSocketConfig): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.config = config;
    this.isConnecting = true;
    
    // Build stream URL for multiple symbols
    const streams = config.symbols
      .map(s => this.symbolMap[s.toUpperCase()])
      .filter(Boolean)
      .map(s => `${s}@ticker`)
      .join('/');

    if (!streams) {
      console.warn('No valid symbols for WebSocket connection');
      this.isConnecting = false;
      return;
    }

    const wsUrl = `${this.BINANCE_WS_BASE}/${streams}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('📡 WebSocket connected to Binance');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.config?.onConnectionChange(true);
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.config?.onError?.(new Error('WebSocket connection error'));
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnecting = false;
      this.config?.onConnectionChange(false);
      this.stopHeartbeat();
      
      // Auto-reconnect if not intentionally closed
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    // Binance ticker format
    if (data.e === '24hrTicker') {
      const symbol = this.reverseSymbolMap(data.s);
      if (symbol) {
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
        this.config?.onPriceUpdate(new Map(this.prices));
        
        // Notify all subscribers
        this.subscriptions.forEach(cb => cb(livePrice));
      }
    }
  }

  /**
   * Reverse map Binance symbol to our format
   */
  private reverseSymbolMap(binanceSymbol: string): string | null {
    const lower = binanceSymbol.toLowerCase();
    for (const [our, binance] of Object.entries(this.symbolMap)) {
      if (binance === lower) return our;
    }
    return null;
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
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
      console.error('Max reconnection attempts reached');
      this.config?.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.config) {
        this.connect(this.config);
      }
    }, delay);
  }

  /**
   * Subscribe to price updates for specific symbol
   */
  subscribe(callback: WebSocketCallback): () => void {
    this.subscriptions.add(callback);
    return () => this.subscriptions.delete(callback);
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
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.prices.clear();
    this.subscriptions.clear();
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  /**
   * Update subscription symbols
   */
  updateSymbols(symbols: string[]): void {
    if (this.config) {
      this.disconnect();
      this.config.symbols = symbols;
      this.connect(this.config);
    }
  }
}

// Singleton instance
export const marketWebSocket = new MarketWebSocketService();

export default marketWebSocket;
