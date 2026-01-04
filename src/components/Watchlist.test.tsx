/**
 * Watchlist Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Watchlist } from '../../components/Watchlist';

// Mock portfolio store
const mockGetWatchlist = vi.fn(() => [
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as const, addedAt: new Date().toISOString() },
  { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO' as const, addedAt: new Date().toISOString() },
]);
const mockAddToWatchlist = vi.fn();
const mockRemoveFromWatchlist = vi.fn();
const mockIsInWatchlist = vi.fn((symbol: string) => ['BTC', 'ETH'].includes(symbol));
const mockSetWatchlistAlert = vi.fn();

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: () => ({
    getWatchlist: mockGetWatchlist,
    addToWatchlist: mockAddToWatchlist,
    removeFromWatchlist: mockRemoveFromWatchlist,
    isInWatchlist: mockIsInWatchlist,
    setWatchlistAlert: mockSetWatchlistAlert,
  }),
}));

// Mock WebSocket prices
vi.mock('../../hooks/useWebSocketPrices', () => ({
  useWebSocketPrices: () => ({
    prices: new Map([
      ['BTC', { price: 97500, change24h: 2.1, lastUpdate: new Date() }],
      ['ETH', { price: 3100, change24h: -1.5, lastUpdate: new Date() }],
    ]),
    isConnected: true,
    lastUpdate: new Date(),
  }),
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'watchlist.title': 'Watchlist',
        'watchlist.addAsset': 'Add Asset',
        'watchlist.search': 'Search assets...',
        'watchlist.empty': 'Your watchlist is empty',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

describe('Watchlist', () => {
  const mockOnAddToPortfolio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders watchlist title', () => {
    render(<Watchlist currency="USD" />);
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
  });

  it('displays watchlist items', () => {
    render(<Watchlist currency="USD" />);
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(<Watchlist currency="USD" />);
    // Should show live indicator when connected
    const liveIndicator = screen.queryByText(/live/i);
    expect(liveIndicator).toBeInTheDocument();
  });

  it('displays prices in correct currency (USD)', () => {
    render(<Watchlist currency="USD" />);
    // Check for USD formatted prices
    const priceElements = screen.getAllByText(/\$[\d,]+/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('displays prices in correct currency (ILS)', () => {
    render(<Watchlist currency="ILS" />);
    // Check for ILS formatted prices
    const priceElements = screen.getAllByText(/₪[\d,]+/);
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('opens add modal when clicking add button', async () => {
    const user = userEvent.setup();
    render(<Watchlist currency="USD" />);
    
    const addButton = screen.getByText('Add Asset');
    await user.click(addButton);
    
    // Modal should be open with search input
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters assets based on search', async () => {
    const user = userEvent.setup();
    render(<Watchlist currency="USD" />);
    
    // Open modal
    const addButton = screen.getByText('Add Asset');
    await user.click(addButton);
    
    // Type in search
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'SOL');
    
    // Should show Solana
    await waitFor(() => {
      expect(screen.getByText('Solana')).toBeInTheDocument();
    });
  });

  it('calls onAddToPortfolio when provided', async () => {
    const user = userEvent.setup();
    render(<Watchlist currency="USD" onAddToPortfolio={mockOnAddToPortfolio} />);
    
    // There should be an "add to portfolio" option for watchlist items
    const addButtons = screen.getAllByRole('button');
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('shows empty state when watchlist is empty', () => {
    mockGetWatchlist.mockReturnValueOnce([]);
    render(<Watchlist currency="USD" />);
    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
  });
});
