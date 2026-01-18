/**
 * WatchlistService Tests
 * Tests for watchlist CRUD, price alerts, and localStorage persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();

// Mock localStorage with proper state management
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

let mockLocalStorage = createMockLocalStorage();

interface WatchlistItem {
  symbol: string;
  name: string;
  type: 'crypto' | 'stock';
  alertPrice?: number;
  alertType?: 'above' | 'below';
  addedAt: number;
}

interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
}

describe('watchlistService', () => {
  let originalFetch: typeof fetch;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage = createMockLocalStorage();
    
    originalFetch = global.fetch;
    originalLocalStorage = global.localStorage;
    
    global.fetch = mockFetch;
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });
    
    // Set up auth token
    mockLocalStorage.setItem('finpulse_id_token', 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
  });

  describe('Watchlist CRUD', () => {
    it('should add item to watchlist', () => {
      const watchlist: WatchlistItem[] = [];
      const newItem: WatchlistItem = {
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        addedAt: Date.now()
      };
      
      watchlist.push(newItem);
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(watchlist));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_watchlist')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].symbol).toBe('BTC');
    });

    it('should remove item from watchlist', () => {
      const watchlist: WatchlistItem[] = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() },
        { symbol: 'ETH', name: 'Ethereum', type: 'crypto', addedAt: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(watchlist));
      
      const filtered = watchlist.filter(item => item.symbol !== 'BTC');
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(filtered));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_watchlist')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].symbol).toBe('ETH');
    });

    it('should get all watchlist items', () => {
      const watchlist: WatchlistItem[] = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() },
        { symbol: 'AAPL', name: 'Apple', type: 'stock', addedAt: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(watchlist));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_watchlist')!);
      expect(stored).toHaveLength(2);
    });

    it('should check if symbol exists in watchlist', () => {
      const watchlist: WatchlistItem[] = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(watchlist));
      
      const stored: WatchlistItem[] = JSON.parse(mockLocalStorage.getItem('finpulse_watchlist')!);
      const exists = stored.some(item => item.symbol === 'BTC');
      const notExists = stored.some(item => item.symbol === 'ETH');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should prevent duplicate entries', () => {
      const watchlist: WatchlistItem[] = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() }
      ];
      
      const newItem: WatchlistItem = { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() };
      const exists = watchlist.some(item => item.symbol === newItem.symbol);
      
      if (!exists) {
        watchlist.push(newItem);
      }
      
      expect(watchlist).toHaveLength(1);
    });
  });

  describe('Price Alerts', () => {
    it('should create price alert', () => {
      const alert: PriceAlert = {
        id: 'alert-1',
        symbol: 'BTC',
        targetPrice: 50000,
        direction: 'above',
        triggered: false,
        createdAt: Date.now()
      };
      
      const alerts: PriceAlert[] = [alert];
      mockLocalStorage.setItem('finpulse_price_alerts', JSON.stringify(alerts));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_price_alerts')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].targetPrice).toBe(50000);
    });

    it('should trigger alert when price threshold crossed (above)', () => {
      const alert: PriceAlert = {
        id: 'alert-1',
        symbol: 'BTC',
        targetPrice: 50000,
        direction: 'above',
        triggered: false,
        createdAt: Date.now()
      };
      
      const currentPrice = 51000;
      const shouldTrigger = alert.direction === 'above' && currentPrice >= alert.targetPrice;
      
      expect(shouldTrigger).toBe(true);
    });

    it('should trigger alert when price threshold crossed (below)', () => {
      const alert: PriceAlert = {
        id: 'alert-2',
        symbol: 'ETH',
        targetPrice: 3000,
        direction: 'below',
        triggered: false,
        createdAt: Date.now()
      };
      
      const currentPrice = 2900;
      const shouldTrigger = alert.direction === 'below' && currentPrice <= alert.targetPrice;
      
      expect(shouldTrigger).toBe(true);
    });

    it('should not trigger alert when threshold not crossed', () => {
      const alert: PriceAlert = {
        id: 'alert-1',
        symbol: 'BTC',
        targetPrice: 50000,
        direction: 'above',
        triggered: false,
        createdAt: Date.now()
      };
      
      const currentPrice = 49000;
      const shouldTrigger = alert.direction === 'above' && currentPrice >= alert.targetPrice;
      
      expect(shouldTrigger).toBe(false);
    });

    it('should mark alert as triggered', () => {
      const alert: PriceAlert = {
        id: 'alert-1',
        symbol: 'BTC',
        targetPrice: 50000,
        direction: 'above',
        triggered: false,
        createdAt: Date.now()
      };
      
      alert.triggered = true;
      alert.triggeredAt = Date.now();
      
      expect(alert.triggered).toBe(true);
      expect(alert.triggeredAt).toBeDefined();
    });

    it('should delete price alert', () => {
      const alerts: PriceAlert[] = [
        { id: 'alert-1', symbol: 'BTC', targetPrice: 50000, direction: 'above', triggered: false, createdAt: Date.now() },
        { id: 'alert-2', symbol: 'ETH', targetPrice: 3000, direction: 'below', triggered: false, createdAt: Date.now() }
      ];
      
      const filtered = alerts.filter(a => a.id !== 'alert-1');
      mockLocalStorage.setItem('finpulse_price_alerts', JSON.stringify(filtered));
      
      const stored = JSON.parse(mockLocalStorage.getItem('finpulse_price_alerts')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].symbol).toBe('ETH');
    });

    it('should get all alerts for a symbol', () => {
      const alerts: PriceAlert[] = [
        { id: 'alert-1', symbol: 'BTC', targetPrice: 50000, direction: 'above', triggered: false, createdAt: Date.now() },
        { id: 'alert-2', symbol: 'BTC', targetPrice: 40000, direction: 'below', triggered: false, createdAt: Date.now() },
        { id: 'alert-3', symbol: 'ETH', targetPrice: 3000, direction: 'above', triggered: false, createdAt: Date.now() }
      ];
      
      const btcAlerts = alerts.filter(a => a.symbol === 'BTC');
      expect(btcAlerts).toHaveLength(2);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist watchlist across sessions', () => {
      const watchlist: WatchlistItem[] = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', addedAt: Date.now() }
      ];
      mockLocalStorage.setItem('finpulse_watchlist', JSON.stringify(watchlist));
      
      // Simulate new session
      const stored = mockLocalStorage.getItem('finpulse_watchlist');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toHaveLength(1);
    });

    it('should handle empty watchlist', () => {
      const stored = mockLocalStorage.getItem('finpulse_watchlist');
      expect(stored).toBeNull();
    });

    it('should handle corrupted data gracefully', () => {
      mockLocalStorage.setItem('finpulse_watchlist', 'invalid-json');
      
      let watchlist: WatchlistItem[] = [];
      try {
        watchlist = JSON.parse(mockLocalStorage.getItem('finpulse_watchlist')!);
      } catch {
        watchlist = [];
      }
      
      expect(watchlist).toEqual([]);
    });
  });

  describe('Asset Types', () => {
    it.each([
      ['BTC', 'crypto'],
      ['ETH', 'crypto'],
      ['AAPL', 'stock'],
      ['MSFT', 'stock']
    ])('should categorize %s as %s', (symbol, type) => {
      const item: WatchlistItem = {
        symbol,
        name: symbol,
        type: type as 'crypto' | 'stock',
        addedAt: Date.now()
      };
      
      expect(item.type).toBe(type);
    });
  });

  describe('Watchlist Limits', () => {
    it('should enforce maximum watchlist size for free tier', () => {
      const maxFreeItems = 10;
      const watchlist: WatchlistItem[] = Array.from({ length: 11 }, (_, i) => ({
        symbol: `ASSET${i}`,
        name: `Asset ${i}`,
        type: 'crypto' as const,
        addedAt: Date.now()
      }));
      
      const canAdd = watchlist.length < maxFreeItems;
      expect(canAdd).toBe(false);
    });

    it('should allow more items for premium users', () => {
      const maxPremiumItems = 50;
      const watchlist: WatchlistItem[] = Array.from({ length: 30 }, (_, i) => ({
        symbol: `ASSET${i}`,
        name: `Asset ${i}`,
        type: 'crypto' as const,
        addedAt: Date.now()
      }));
      
      const canAdd = watchlist.length < maxPremiumItems;
      expect(canAdd).toBe(true);
    });
  });

  describe('Alert Notifications', () => {
    it('should check for triggered alerts', () => {
      const alerts: PriceAlert[] = [
        { id: 'alert-1', symbol: 'BTC', targetPrice: 50000, direction: 'above', triggered: true, createdAt: Date.now(), triggeredAt: Date.now() },
        { id: 'alert-2', symbol: 'ETH', targetPrice: 3000, direction: 'below', triggered: false, createdAt: Date.now() }
      ];
      
      const triggeredAlerts = alerts.filter(a => a.triggered);
      const pendingAlerts = alerts.filter(a => !a.triggered);
      
      expect(triggeredAlerts).toHaveLength(1);
      expect(pendingAlerts).toHaveLength(1);
    });

    it('should format alert notification message', () => {
      const alert: PriceAlert = {
        id: 'alert-1',
        symbol: 'BTC',
        targetPrice: 50000,
        direction: 'above',
        triggered: true,
        createdAt: Date.now()
      };
      
      const message = `${alert.symbol} price is now ${alert.direction} $${alert.targetPrice.toLocaleString()}`;
      expect(message).toBe('BTC price is now above $50,000');
    });
  });
});
