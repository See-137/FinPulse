/**
 * NewsSidebar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewsSidebar } from '../../components/NewsSidebar';

// ---------- Mocks ----------

// Mock portfolio store
const mockGetHoldings = vi.fn(() => [
  { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as const, quantity: 1, avgCost: 50000, currentPrice: 97000, dayPL: 100 },
  { symbol: 'AAPL', name: 'Apple', type: 'STOCK' as const, quantity: 10, avgCost: 150, currentPrice: 180, dayPL: 5 },
]);

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: () => ({
    getHoldings: mockGetHoldings,
    currentUserId: 'user-1',
    userHoldings: {},
  }),
}));

// Mock useNews hook
const mockRefresh = vi.fn(async () => {});
const mockUseNews = vi.fn((_symbols?: string[]) => ({
  articles: [
    {
      id: 'article-1',
      title: 'Bitcoin hits new high',
      description: 'BTC surges past $97k',
      source: 'CoinDesk',
      url: 'https://example.com/btc',
      publishedAt: new Date().toISOString(),
      category: 'crypto',
    },
    {
      id: 'article-2',
      title: 'Apple quarterly earnings',
      description: 'Strong results for AAPL',
      source: 'Reuters',
      url: 'https://example.com/aapl',
      publishedAt: new Date().toISOString(),
      category: 'stocks',
    },
    {
      id: 'article-3',
      title: 'Global markets rally',
      description: 'Markets show broad strength',
      source: 'Bloomberg',
      url: '',
      publishedAt: new Date().toISOString(),
      category: 'market',
    },
  ],
  loading: false,
  source: 'live' as string,
  refresh: mockRefresh,
  error: null,
  lastUpdated: new Date(),
}));

vi.mock('../../hooks/useNews', () => ({
  useNews: (symbols?: string[]) => mockUseNews(symbols),
}));

// Mock InfluencerFeed to avoid deep rendering
vi.mock('../../components/InfluencerFeed', () => ({
  InfluencerFeed: () => <div data-testid="influencer-feed">InfluencerFeed</div>,
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'news.marketNews': 'Market News',
        'news.holdings': 'Holdings',
        'news.xFeed': 'X Feed',
        'news.all': 'All',
        'news.live': 'LIVE',
        'news.recent': 'RECENT',
        'news.offline': 'OFFLINE',
        'news.cachedTooltip': 'Showing cached data',
        'news.noNewsHoldings': 'No news for your holdings',
        'news.noNewsAvailable': 'No news available',
        'news.addAssetsForNews': 'Add assets to see relevant news',
        'news.checkBackLater': 'Check back later',
        'news.noSource': 'Source unavailable',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// ---------- Tests ----------

describe('NewsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply default return values after clearAllMocks
    mockGetHoldings.mockReturnValue([
      { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' as const, quantity: 1, avgCost: 50000, currentPrice: 97000, dayPL: 100 },
      { symbol: 'AAPL', name: 'Apple', type: 'STOCK' as const, quantity: 10, avgCost: 150, currentPrice: 180, dayPL: 5 },
    ]);
  });

  it('renders the Market News header', () => {
    render(<NewsSidebar />);
    expect(screen.getByText('Market News')).toBeInTheDocument();
  });

  it('renders all three filter tabs', () => {
    render(<NewsSidebar />);
    expect(screen.getByText('Holdings')).toBeInTheDocument();
    expect(screen.getByText('X Feed')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows LIVE badge when news source is live', () => {
    render(<NewsSidebar />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows RECENT badge when news source is cached', () => {
    mockUseNews.mockReturnValueOnce({
      articles: [{ id: '1', title: 'Test', description: '', source: 'Test', url: '#', publishedAt: new Date().toISOString(), category: 'market' }],
      loading: false,
      source: 'cached' as string,
      refresh: mockRefresh,
      error: null,
      lastUpdated: new Date(),
    });
    render(<NewsSidebar />);
    expect(screen.getByText('RECENT')).toBeInTheDocument();
  });

  it('displays news article titles in All tab', () => {
    render(<NewsSidebar />);
    expect(screen.getByText('Bitcoin hits new high')).toBeInTheDocument();
    expect(screen.getByText('Apple quarterly earnings')).toBeInTheDocument();
    expect(screen.getByText('Global markets rally')).toBeInTheDocument();
  });

  it('renders article source and category tag', () => {
    render(<NewsSidebar />);
    expect(screen.getByText('CoinDesk')).toBeInTheDocument();
    expect(screen.getByText('CRYPTO')).toBeInTheDocument();
  });

  it('shows "Source unavailable" text for articles without a URL', () => {
    render(<NewsSidebar />);
    // Article 3 has url: '' so it should show noSource text
    expect(screen.getByText('Source unavailable')).toBeInTheDocument();
  });

  it('calls refresh when clicking the refresh button', async () => {
    const user = userEvent.setup();
    render(<NewsSidebar />);

    // The refresh button is the only button outside the filter tabs
    const buttons = screen.getAllByRole('button');
    // Find the refresh button (not one of the filter tab buttons)
    const refreshButton = buttons.find(
      (btn) => !['Holdings', 'X Feed', 'All'].includes(btn.textContent || '')
    );
    expect(refreshButton).toBeDefined();
    await user.click(refreshButton!);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('switches to X Feed tab and renders InfluencerFeed', async () => {
    const user = userEvent.setup();
    render(<NewsSidebar />);

    await user.click(screen.getByText('X Feed'));
    expect(screen.getByTestId('influencer-feed')).toBeInTheDocument();
  });

  it('shows empty state on Holdings tab when user has no holdings', async () => {
    mockGetHoldings.mockReturnValue([]);
    const user = userEvent.setup();
    render(<NewsSidebar />);

    await user.click(screen.getByText('Holdings'));
    expect(screen.getByText('No news for your holdings')).toBeInTheDocument();
    expect(screen.getByText('Add assets to see relevant news')).toBeInTheDocument();
  });
});
