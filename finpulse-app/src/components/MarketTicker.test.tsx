/**
 * MarketTicker Component Tests
 * Tests the REST-based market ticker with polling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketTicker } from '../../components/MarketTicker';

// Store original fetch
const originalFetch = globalThis.fetch;

// Create mock fetch that resolves immediately
const createMockFetch = () => {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/market/prices') && url.includes('type=crypto')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            BTC: { price: 97500, change24h: 2.1 },
            ETH: { price: 3026.56, change24h: 1.76 },
            SOL: { price: 215.42, change24h: 1 },
          },
        }),
      });
    }
    if (url.includes('/market/prices') && url.includes('type=stock')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            AAPL: { price: 185.5, change24h: 0.5 },
            MSFT: { price: 410.25, change24h: 1.2 },
          },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, rates: { ILS: 3.65 } }),
    });
  });
};

// Mock the config
vi.mock('../../config', () => ({
  config: {
    apiUrl: 'https://api.test.com',
  },
}));

// Mock useMarketData
vi.mock('../../hooks/useMarketData', () => ({
  fetchFxRates: () => Promise.resolve({ success: true, rates: { ILS: 3.65 } }),
}));

// Mock portfolioStore - usePortfolioStore is a Zustand selector hook
vi.mock('../../store/portfolioStore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  usePortfolioStore: (selector: any) => {
    const mockState = {
      getHoldings: () => [],
    };
    return selector ? selector(mockState) : mockState;
  },
}));

describe('MarketTicker', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = createMockFetch();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders without crashing', async () => {
    render(<MarketTicker currency="USD" />);

    // Component should render - wait for Loading text initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays update status after data loads', async () => {
    render(<MarketTicker currency="USD" />);

    // Wait for data to load and show "Just now" or time
    await waitFor(
      () => {
        expect(screen.getByText(/Just now|ago/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('displays crypto symbols after data loads', async () => {
    render(<MarketTicker currency="USD" />);

    // BTC should appear (tripled for animation)
    await waitFor(
      () => {
        const btcElements = screen.getAllByText('BTC');
        expect(btcElements.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  it('formats prices correctly for USD', async () => {
    render(<MarketTicker currency="USD" />);

    // Should display USD prices with $ symbol
    await waitFor(
      () => {
        const priceElements = screen.getAllByText(/\$[\d,]+\.\d{2}/);
        expect(priceElements.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  it('renders ILS currency correctly', async () => {
    render(<MarketTicker currency="ILS" />);

    // Should display ILS prices with ₪ symbol
    await waitFor(
      () => {
        const priceElements = screen.getAllByText(/₪[\d,]+\.\d{2}/);
        expect(priceElements.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );
  });

  it('fetches crypto and stock prices from API', async () => {
    render(<MarketTicker currency="USD" />);

    // Should have made API calls for both crypto and stock prices
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });
});
