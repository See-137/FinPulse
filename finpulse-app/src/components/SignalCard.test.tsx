/**
 * SignalCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignalCard } from '../../components/SignalCard';
import type { CombinedSignal } from '../../types';

// Mock lucide-react icons to render testable text
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="icon-trending-up">TrendingUp</span>,
  TrendingDown: () => <span data-testid="icon-trending-down">TrendingDown</span>,
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  Zap: () => <span data-testid="icon-zap">Zap</span>,
}));

// ---------- Helpers ----------

const makeBullishSignal = (overrides: Partial<CombinedSignal> = {}): CombinedSignal => ({
  symbol: 'BTC',
  direction: 'bullish',
  confidenceScore: 78,
  componentScores: { whale: 85, trade: 70, sentiment: 60 },
  hasConflict: false,
  isMock: false,
  createdAt: Date.now(),
  ...overrides,
});

const makeBearishSignal = (overrides: Partial<CombinedSignal> = {}): CombinedSignal => ({
  symbol: 'ETH',
  direction: 'bearish',
  confidenceScore: 62,
  componentScores: { whale: 40, trade: 80, sentiment: 0 },
  hasConflict: false,
  isMock: false,
  createdAt: Date.now(),
  ...overrides,
});

const makeNeutralSignal = (overrides: Partial<CombinedSignal> = {}): CombinedSignal => ({
  symbol: 'SOL',
  direction: 'neutral',
  confidenceScore: 50,
  componentScores: { whale: 0, trade: 50, sentiment: 50 },
  hasConflict: false,
  isMock: false,
  createdAt: Date.now(),
  ...overrides,
});

// ---------- Tests ----------

describe('SignalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Full mode tests ---

  it('renders symbol and direction in full mode', () => {
    render(<SignalCard signal={makeBullishSignal()} />);
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('bullish')).toBeInTheDocument();
  });

  it('displays the confidence score in full mode', () => {
    render(<SignalCard signal={makeBullishSignal({ confidenceScore: 92 })} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('shows component breakdown when showComponents is true (default)', () => {
    render(<SignalCard signal={makeBullishSignal()} />);
    expect(screen.getByText('Whale Flow')).toBeInTheDocument();
    expect(screen.getByText('Trade Signal')).toBeInTheDocument();
    expect(screen.getByText('Sentiment')).toBeInTheDocument();
    // Verify the score values are displayed
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('70')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('hides component breakdown when showComponents is false', () => {
    render(<SignalCard signal={makeBullishSignal()} showComponents={false} />);
    expect(screen.queryByText('Whale Flow')).not.toBeInTheDocument();
    expect(screen.queryByText('Trade Signal')).not.toBeInTheDocument();
    expect(screen.queryByText('Sentiment')).not.toBeInTheDocument();
  });

  it('only shows non-zero component scores', () => {
    const signal = makeBearishSignal(); // sentiment = 0
    render(<SignalCard signal={signal} />);
    expect(screen.getByText('Whale Flow')).toBeInTheDocument();
    expect(screen.getByText('Trade Signal')).toBeInTheDocument();
    expect(screen.queryByText('Sentiment')).not.toBeInTheDocument();
  });

  it('renders the mock data indicator when isMock is true', () => {
    render(<SignalCard signal={makeBullishSignal({ isMock: true })} />);
    expect(screen.getByText(/Simulated data/)).toBeInTheDocument();
  });

  it('does not show mock indicator when isMock is false', () => {
    render(<SignalCard signal={makeBullishSignal({ isMock: false })} />);
    expect(screen.queryByText(/Simulated data/)).not.toBeInTheDocument();
  });

  it('shows conflict warning with details when hasConflict is true', () => {
    const signal = makeBullishSignal({
      hasConflict: true,
      conflictDetails: 'Whale activity conflicts with trade signals',
    });
    render(<SignalCard signal={signal} />);
    expect(screen.getByText('Whale activity conflicts with trade signals')).toBeInTheDocument();
    expect(screen.getAllByTestId('icon-alert-triangle').length).toBeGreaterThan(0);
  });

  it('shows accuracy badge when accuracy is provided', () => {
    render(<SignalCard signal={makeBullishSignal({ accuracy: 73 })} />);
    expect(screen.getByText(/73% accuracy/)).toBeInTheDocument();
  });

  it('renders TrendingUp icon for bullish and TrendingDown for bearish', () => {
    const { unmount } = render(<SignalCard signal={makeBullishSignal()} />);
    expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
    unmount();

    render(<SignalCard signal={makeBearishSignal()} />);
    expect(screen.getByTestId('icon-trending-down')).toBeInTheDocument();
  });

  it('fires onClick callback when the card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<SignalCard signal={makeBullishSignal()} onClick={onClick} />);

    // Click on the card wrapper
    await user.click(screen.getByText('BTC'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // --- Compact mode tests ---

  it('renders compact mode with capitalized direction and confidence score', () => {
    render(<SignalCard signal={makeBullishSignal({ confidenceScore: 78 })} compact />);
    expect(screen.getByText('Bullish')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
    // Should NOT show full details
    expect(screen.queryByText('Whale Flow')).not.toBeInTheDocument();
    expect(screen.queryByText('Confidence')).not.toBeInTheDocument();
  });

  it('shows Demo badge in compact mode when isMock is true', () => {
    render(<SignalCard signal={makeBullishSignal({ isMock: true })} compact />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('shows conflict icon in compact mode when hasConflict is true', () => {
    render(<SignalCard signal={makeBullishSignal({ hasConflict: true })} compact />);
    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
  });

  it('renders neutral signal with Zap icon in full mode', () => {
    render(<SignalCard signal={makeNeutralSignal()} />);
    // The neutral direction uses Zap icon
    expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
    expect(screen.getByText('neutral')).toBeInTheDocument();
  });
});
