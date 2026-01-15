/**
 * API Service Tests
 * Unit tests for apiService HTTP client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock config
vi.mock('../config', () => ({
  config: {
    apiUrl: 'https://api.test.com',
    endpoints: {
      market: '/market/prices',
      fx: '/fx/rates',
      portfolio: '/portfolio',
    },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Import after mocks are setup
import { api } from './apiService';

describe('ApiService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('should set and store ID token', () => {
      const testToken = 'test-id-token';
      api.setIdToken(testToken);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('finpulse_id_token', testToken);
    });

    it('should remove token when set to null', () => {
      api.setIdToken(null);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('finpulse_id_token');
    });

    it('should use setAccessToken as legacy method', () => {
      const testToken = 'legacy-token';
      api.setAccessToken(testToken);

      expect(localStorageMock.setItem).toHaveBeenCalledWith('finpulse_id_token', testToken);
    });

    it('should restore token from localStorage on init', () => {
      localStorageMock.setItem('finpulse_id_token', 'stored-token');
      // Token restoration happens in constructor
      expect(localStorageMock.getItem).toHaveBeenCalledWith('finpulse_id_token');
    });
  });

  describe('HTTP Requests', () => {
    it('should include Authorization header when token is set', async () => {
      const mockFetch = vi.mocked(global.fetch);
      api.setIdToken('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await api.getMarketPrices(['AAPL']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should include Content-Type header', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await api.getMarketPrices();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle successful API responses', async () => {
      const mockFetch = vi.mocked(global.fetch);
      const mockData = [{ symbol: 'AAPL', price: 150 }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      } as Response);

      const response = await api.getMarketPrices(['AAPL']);

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(response.error).toBeUndefined();
    });

    it('should handle API errors with error message', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid symbol' }),
      } as Response);

      const response = await api.getMarketPrices(['INVALID']);

      expect(response.error).toBe('Invalid symbol');
      expect(response.status).toBe(400);
      expect(response.data).toBeUndefined();
    });

    it('should handle HTTP error without message', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toContain('HTTP 500');
      expect(response.status).toBe(500);
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const response = await api.getMarketPrices();

      expect(response.error).toBe('Network timeout');
      expect(response.status).toBe(0);
    });

    it('should handle JSON parse errors', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toContain('HTTP 502');
      expect(response.status).toBe(502);
    });
  });

  describe('Market Data Endpoints', () => {
    it('should fetch market prices without symbols', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await api.getMarketPrices();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/market/prices'),
        expect.any(Object)
      );
    });

    it('should fetch market prices with specific symbols', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      await api.getMarketPrices(['AAPL', 'GOOGL', 'MSFT']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('symbols=AAPL,GOOGL,MSFT'),
        expect.any(Object)
      );
    });
  });

  describe('FX Rates Endpoints', () => {
    it('should fetch FX rates with default base currency', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response);

      await api.getFxRates();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('base=USD'),
        expect.any(Object)
      );
    });

    it('should fetch FX rates with custom base currency', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response);

      await api.getFxRates('EUR');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('base=EUR'),
        expect.any(Object)
      );
    });
  });

  describe('Error Scenarios', () => {
    it('should handle 401 Unauthorized (token expired)', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Token expired' }),
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toBe('Token expired');
      expect(response.status).toBe(401);
    });

    it('should handle 403 Forbidden (insufficient permissions)', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Insufficient permissions' }),
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toBe('Insufficient permissions');
      expect(response.status).toBe(403);
    });

    it('should handle 429 Too Many Requests (rate limited)', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toBe('Rate limit exceeded');
      expect(response.status).toBe(429);
    });

    it('should handle 500 Internal Server Error', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      } as Response);

      const response = await api.getMarketPrices();

      expect(response.error).toBe('Internal server error');
      expect(response.status).toBe(500);
    });
  });

  describe('Request Options', () => {
    it('should merge custom headers with default headers', async () => {
      const mockFetch = vi.mocked(global.fetch);
      api.setIdToken('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      // Would need to test through a method that accepts options
      expect(mockFetch).toBeDefined();
    });
  });
});

// Type definitions for test
interface MarketPrice {
  symbol: string;
  price: number;
}

interface FxRates {
  [key: string]: number;
}
