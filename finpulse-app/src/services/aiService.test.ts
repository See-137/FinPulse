/**
 * AI Service Tests - OpenAI-powered Market Intelligence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch and localStorage
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockLocalStorage.store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockLocalStorage.store[key]; }),
  clear: vi.fn(() => { mockLocalStorage.store = {}; }),
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

describe('aiService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage.store = {};
  });

  describe('getMarketInsightStream', () => {
    it('should require authentication token', async () => {
      // Import dynamically to get fresh module
      const { getMarketInsightStream } = await import('../../services/aiService');
      
      const callback = vi.fn();
      const result = await getMarketInsightStream('test query', callback);
      
      expect(result).toContain('Authentication Required');
      expect(callback).toHaveBeenCalledWith(expect.stringContaining('Authentication Required'));
    });

    it('should call backend API with token', async () => {
      mockLocalStorage.store['finpulse_id_token'] = 'test-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'AI response here' })
      });
      
      const { getMarketInsightStream } = await import('../../services/aiService');
      
      const callback = vi.fn();
      const result = await getMarketInsightStream('analyze BTC', callback);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/query'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
      expect(result).toBe('AI response here');
    });

    it('should include portfolio context when provided', async () => {
      mockLocalStorage.store['finpulse_id_token'] = 'test-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Portfolio analysis' })
      });
      
      const { getMarketInsightStream } = await import('../../services/aiService');
      
      const portfolio = [
        { symbol: 'BTC', shares: 1, currentPrice: 100000 },
        { symbol: 'ETH', shares: 10, currentPrice: 4000 }
      ];
      
      const callback = vi.fn();
      await getMarketInsightStream('analyze my portfolio', callback, portfolio);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('BTC')
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockLocalStorage.store['finpulse_id_token'] = 'test-token';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });
      
      const { getMarketInsightStream } = await import('../../services/aiService');
      
      const callback = vi.fn();
      const result = await getMarketInsightStream('test query', callback);
      
      expect(result).toContain('Service Temporarily Unavailable');
    });

    it('should handle session expiry', async () => {
      mockLocalStorage.store['finpulse_id_token'] = 'expired-token';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });
      
      const { getMarketInsightStream } = await import('../../services/aiService');
      
      const callback = vi.fn();
      const result = await getMarketInsightStream('test query', callback);
      
      expect(result).toContain('Session Expired');
    });
  });

  describe('summarizeNews', () => {
    it('should return null without token', async () => {
      const { summarizeNews } = await import('../../services/aiService');
      
      const result = await summarizeNews('Test headline');
      
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should summarize news with token', async () => {
      mockLocalStorage.store['finpulse_id_token'] = 'test-token';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Summary of the news' })
      });
      
      const { summarizeNews } = await import('../../services/aiService');
      
      const result = await summarizeNews('Bitcoin hits new high');
      
      expect(result).toBe('Summary of the news');
    });
  });
});
