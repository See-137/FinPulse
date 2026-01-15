/**
 * MarketTicker Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketTicker } from '../../components/MarketTicker';

// Mock the hooks
vi.mock('../../hooks/useWebSocketPrices', () => ({
  useWebSocketPrices: () => ({
    prices: new Map([
      ['BTC', { price: 97500, change24h: 2.1 }],
      ['ETH', { price: 3100, change24h: -1.5 }],
    ]),
    isConnected: true,
    lastUpdate: new Date(),
  }),
}));

vi.mock('../../hooks/useMarketData', () => ({
  fetchFxRates: () => Promise.resolve({ success: true, rates: { ILS: 3.65 } }),
}));

describe('MarketTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MarketTicker currency="USD" />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays connection status indicator', () => {
    render(<MarketTicker currency="USD" />);
    // Should show "Live" when connected
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays crypto symbols', () => {
    render(<MarketTicker currency="USD" />);
    // BTC should appear multiple times due to the tripled animation
    const btcElements = screen.getAllByText('BTC');
    expect(btcElements.length).toBeGreaterThan(0);
  });

  it('formats prices correctly for USD', () => {
    render(<MarketTicker currency="USD" />);
    // Should display USD prices with $ symbol
    const priceElements = screen.getAllByText(/\$[\d,]+\.\d{2}/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('renders ILS currency correctly', () => {
    render(<MarketTicker currency="ILS" />);
    // Should display ILS prices with ₪ symbol
    const priceElements = screen.getAllByText(/₪[\d,]+\.\d{2}/);
    expect(priceElements.length).toBeGreaterThan(0);
  });
});
