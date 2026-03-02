/**
 * PortfolioView Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfolioView } from '../../components/PortfolioView';
import type { User, Holding } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock recharts — PieChart needs an SVG rendering context that jsdom lacks
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

// Mock child components that are complex / have their own tests
vi.mock('../../components/AssetSelector', () => ({
  AssetSelector: ({ onSelect }: any) => (
    <button data-testid="asset-selector" onClick={() => onSelect({ symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' })}>
      mock-asset-selector
    </button>
  ),
}));
vi.mock('../../components/PremiumAnalytics', () => ({
  PremiumAnalytics: () => <div data-testid="premium-analytics">PremiumAnalytics</div>,
}));
vi.mock('../../components/SignalCard', () => ({
  SignalCard: ({ signal }: any) => <span data-testid="signal-card">{signal?.direction}</span>,
}));
vi.mock('../../components/DataFreshnessIndicator', () => ({
  DataFreshnessIndicator: () => <span data-testid="data-freshness">fresh</span>,
  getDataFreshnessStatus: () => 'live',
}));
vi.mock('../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../components/UpgradeModal', () => ({
  UpgradeModal: ({ onClose }: any) => (
    <div data-testid="upgrade-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock('../../components/LockedFeaturePreview', () => ({
  LockedFeaturePreview: () => <div data-testid="locked-feature">Locked</div>,
}));

// Mock services
vi.mock('../../services/signalService', () => ({
  default: { generateLiveSignalsBatch: vi.fn().mockResolvedValue(new Map()) },
}));
vi.mock('../../services/cacheService', () => ({
  cacheService: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
}));

// Mock hooks
vi.mock('../../hooks/useMarketData', () => ({
  useMarketData: () => ({ prices: {}, news: [] }),
  fetchCoinGeckoPrices: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../hooks/useWebSocketPrices', () => ({
  useWebSocketPrices: () => ({
    prices: new Map(),
    isConnected: false,
    lastUpdate: null,
  }),
}));
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock store – return helpers to override per-test
const mockHoldings: Holding[] = [];
const mockAddHolding = vi.fn();
const mockUpdateHolding = vi.fn();
const mockRemoveHolding = vi.fn();

vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: () => ({
    isPrivate: false,
    search: '',
    filterType: null,
    getHoldings: () => mockHoldings,
    setIsPrivate: vi.fn(),
    setSearch: vi.fn(),
    setFilterType: vi.fn(),
    addHolding: mockAddHolding,
    updateHolding: mockUpdateHolding,
    removeHolding: mockRemoveHolding,
    isSyncing: false,
  }),
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'emptyPortfolio.title': 'No Assets Yet',
        'emptyPortfolio.description': 'Add your first asset to start tracking.',
        'emptyPortfolio.cta': 'Add First Asset',
        'emptyPortfolio.noFilterMatch': 'No assets match your filter.',
        'upgrade.assetLimit': 'Asset Limit Reached',
        'upgrade.assetLimitDesc': 'Upgrade to add more assets',
        'upgrade.csvExport': 'CSV Export',
        'upgrade.csvExportDesc': 'Export portfolio CSV',
        'upgrade.csvImport': 'CSV Import',
        'upgrade.csvImportDesc': 'Import portfolio CSV',
        'upgrade.commoditiesLocked': 'Commodities Locked',
        'upgrade.commoditiesLockedDesc': 'Upgrade for commodities',
        'share.button': 'Share',
        'toast.exportFailed': 'Export failed',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freeUser: User = {
  id: 'u1',
  name: 'Test User',
  email: 'test@example.com',
  plan: 'FREE',
  userRole: 'user',
  credits: { ai: 5, maxAi: 10, assets: 0, maxAssets: 20 },
  subscriptionStatus: 'active',
};

const proUser: User = {
  ...freeUser,
  plan: 'PROPULSE',
  credits: { ai: 25, maxAi: 50, assets: 2, maxAssets: 50 },
};

const makeHolding = (overrides: Partial<Holding> = {}): Holding => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  type: 'CRYPTO',
  quantity: 1.5,
  avgCost: 60000,
  currentPrice: 97500,
  dayPL: 2.1,
  ...overrides,
});

const defaultProps = {
  user: freeUser,
  onUpdateUser: vi.fn(),
  currency: 'USD' as const,
  onCurrencyChange: vi.fn(),
  onUpgradeClick: vi.fn(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PortfolioView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHoldings.length = 0; // reset array in-place
  });

  it('renders the PulseBoard header and plan badge', () => {
    render(<PortfolioView {...defaultProps} />);
    expect(screen.getByText('PulseBoard')).toBeInTheDocument();
    expect(screen.getByText(/FREE Pulse Node/i)).toBeInTheDocument();
  });

  it('shows empty state when no holdings exist', () => {
    render(<PortfolioView {...defaultProps} />);
    expect(screen.getByText('No Assets Yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first asset to start tracking.')).toBeInTheDocument();
    expect(screen.getByText('Add First Asset')).toBeInTheDocument();
  });

  it('opens add-asset modal when "Capture Asset" button is clicked', async () => {
    const user = userEvent.setup();
    render(<PortfolioView {...defaultProps} />);

    const captureBtn = screen.getByLabelText('Add new asset to portfolio');
    await user.click(captureBtn);

    // The modal should open with the AssetSelector mock
    expect(screen.getByTestId('asset-selector')).toBeInTheDocument();
  });

  it('renders holdings table when holdings exist', () => {
    mockHoldings.push(
      makeHolding({ symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO' }),
      makeHolding({ symbol: 'AAPL', name: 'Apple Inc', type: 'STOCK', quantity: 10, avgCost: 150, currentPrice: 185 }),
    );

    render(<PortfolioView {...defaultProps} user={{ ...freeUser, credits: { ...freeUser.credits, assets: 2 } }} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('Bitcoin')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc')).toBeInTheDocument();
  });

  it('displays asset type filter tabs (ALL, CRYPTO, STOCK, COMMODITY)', () => {
    mockHoldings.push(makeHolding());

    render(<PortfolioView {...defaultProps} user={{ ...freeUser, credits: { ...freeUser.credits, assets: 1 } }} />);

    expect(screen.getByLabelText('Filter by all assets')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by crypto assets')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by stock assets')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by commodity assets')).toBeInTheDocument();
  });

  it('shows usage counter reflecting number of holdings', () => {
    mockHoldings.push(makeHolding(), makeHolding({ symbol: 'ETH', name: 'Ethereum' }));

    render(<PortfolioView {...defaultProps} user={{ ...freeUser, credits: { ...freeUser.credits, assets: 2 } }} />);

    expect(screen.getByText('2 / 20')).toBeInTheDocument();
  });

  it('shows lock icon on export button for FREE plan', () => {
    render(<PortfolioView {...defaultProps} />);

    const exportBtn = screen.getByLabelText('CSV Export');
    expect(exportBtn).toBeInTheDocument();
    // Lock class is rendered via the Lock icon — the aria label indicates locked state
  });

  it('shows export without lock for ProPulse plan', () => {
    render(<PortfolioView {...defaultProps} user={proUser} />);

    const exportBtn = screen.getByLabelText('Export portfolio to CSV');
    expect(exportBtn).toBeInTheDocument();
  });

  it('provides currency toggle buttons (USD / ILS)', async () => {
    const onCurrencyChange = vi.fn();
    const user = userEvent.setup();
    render(<PortfolioView {...defaultProps} onCurrencyChange={onCurrencyChange} />);

    const ilsButton = screen.getByLabelText('Switch to ILS currency');
    await user.click(ilsButton);

    expect(onCurrencyChange).toHaveBeenCalledWith('ILS');
  });

  it('shows delete confirmation when delete button is clicked', async () => {
    mockHoldings.push(makeHolding({ symbol: 'BTC', name: 'Bitcoin' }));

    const user = userEvent.setup();
    render(<PortfolioView {...defaultProps} user={{ ...freeUser, credits: { ...freeUser.credits, assets: 1 } }} />);

    // Delete button is only visible on hover via CSS but still in DOM
    const deleteBtn = screen.getByLabelText('Delete BTC');
    await user.click(deleteBtn);

    // Confirmation dialog should appear with heading "Remove BTC?"
    await waitFor(() => {
      const removeHeading = screen.getAllByText(/remove/i);
      expect(removeHeading.length).toBeGreaterThan(0);
    });
    // The confirmation text should be visible
    expect(screen.getByText(/This will remove the asset from your portfolio/i)).toBeInTheDocument();
  });

  it('displays Portfolio Value card in sidebar', () => {
    mockHoldings.push(makeHolding({ symbol: 'BTC', quantity: 1, avgCost: 60000, currentPrice: 97500 }));
    render(<PortfolioView {...defaultProps} user={{ ...freeUser, credits: { ...freeUser.credits, assets: 1 } }} />);

    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
    expect(screen.getByText('Allocation')).toBeInTheDocument();
  });

  it('displays share button', () => {
    render(<PortfolioView {...defaultProps} />);
    const shareBtn = screen.getByLabelText('Share');
    expect(shareBtn).toBeInTheDocument();
  });
});
