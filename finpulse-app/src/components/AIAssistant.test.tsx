/**
 * AIAssistant Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIAssistant } from '../../components/AIAssistant';
import type { User } from '../../types';

// ---------- Mocks ----------

// Mock portfolio store
vi.mock('../../store/portfolioStore', () => ({
  usePortfolioStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      getHoldings: () => [
        { symbol: 'BTC', name: 'Bitcoin', quantity: 1, avgCost: 50000, currentPrice: 97000, type: 'CRYPTO' },
      ],
    };
    return selector(state);
  },
}));

// Mock getMarketInsightStream
const mockGetMarketInsightStream = vi.fn(
  async (_query: string, callback: (text: string) => void, _portfolio?: unknown[]) => {
    callback('Here is the market insight for your query.');
    return 'Here is the market insight for your query.';
  }
);

vi.mock('../../services/aiService', () => ({
  getMarketInsightStream: (query: string, cb: (text: string) => void, portfolio?: unknown[]) => mockGetMarketInsightStream(query, cb, portfolio),
}));

// Mock MarkdownRenderer to just render text
vi.mock('../../components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ text }: { text: string }) => <span data-testid="markdown">{text}</span>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="icon-send">Send</span>,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Crown: () => <span data-testid="icon-crown">Crown</span>,
}));

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'aiAssistant.title': 'AI Assistant',
        'aiAssistant.subtitle': 'Powered by AI',
        'aiAssistant.welcomeMessage': 'How can I help you today?',
        'aiAssistant.welcomeSubtitle': 'Ask me about markets, stocks, or crypto',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// ---------- Helpers ----------

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  plan: 'FREE',
  userRole: 'user',
  credits: { ai: 0, maxAi: 5, assets: 3, maxAssets: 5 },
  subscriptionStatus: 'active',
  ...overrides,
});

// ---------- Tests ----------

describe('AIAssistant', () => {
  const mockOnUpdateUsage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toggle button (sparkles icon when closed)', () => {
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);
    // The fixed button should be present
    const toggleButtons = screen.getAllByRole('button');
    expect(toggleButtons.length).toBeGreaterThan(0);
  });

  it('opens the chat panel when clicking the toggle button', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    // Click the toggle button (first button in the DOM is the fixed toggle)
    const toggleButton = screen.getAllByRole('button')[0];
    await user.click(toggleButton);

    // Panel should now be visible with the title
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Powered by AI')).toBeInTheDocument();
  });

  it('shows the welcome message when chat has no messages', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('How can I help you today?')).toBeInTheDocument();
    expect(screen.getByText('Ask me about markets, stocks, or crypto')).toBeInTheDocument();
  });

  it('sends a user message and displays the AI response', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    // Open panel
    await user.click(screen.getAllByRole('button')[0]);

    // Type a question
    const input = screen.getByPlaceholderText('Query the markets...');
    await user.type(input, 'What is BTC doing?');
    await user.keyboard('{Enter}');

    // User message should appear
    await waitFor(() => {
      expect(screen.getByText('What is BTC doing?')).toBeInTheDocument();
    });

    // AI response should appear (rendered through the MarkdownRenderer mock)
    await waitFor(() => {
      expect(screen.getByText('Here is the market insight for your query.')).toBeInTheDocument();
    });

    // onUpdateUsage should have been called with incremented credit count
    expect(mockOnUpdateUsage).toHaveBeenCalledWith(1);
  });

  it('calls getMarketInsightStream with portfolio context', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    const input = screen.getByPlaceholderText('Query the markets...');
    await user.type(input, 'Analyze my portfolio');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockGetMarketInsightStream).toHaveBeenCalledTimes(1);
    });

    // Verify portfolio context was passed (third argument)
    const callArgs = mockGetMarketInsightStream.mock.calls[0];
    expect(callArgs[0]).toBe('Analyze my portfolio');
    expect(callArgs[2]).toEqual([
      { symbol: 'BTC', name: 'Bitcoin', quantity: 1, avgCost: 50000, currentPrice: 97000, type: 'CRYPTO' },
    ]);
  });

  it('does not submit an empty query', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    // Submit with empty input
    const input = screen.getByPlaceholderText('Query the markets...');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(mockGetMarketInsightStream).not.toHaveBeenCalled();
    expect(mockOnUpdateUsage).not.toHaveBeenCalled();
  });

  it('shows upgrade message when AI credits are exhausted (FREE plan)', async () => {
    const user = userEvent.setup();
    const exhaustedUser = makeUser({
      plan: 'FREE',
      credits: { ai: 5, maxAi: 5, assets: 3, maxAssets: 5 },
    });

    render(<AIAssistant user={exhaustedUser} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    const input = screen.getByPlaceholderText('Query the markets...');
    await user.type(input, 'Tell me about ETH');
    await user.keyboard('{Enter}');

    // Should NOT call the AI service
    expect(mockGetMarketInsightStream).not.toHaveBeenCalled();

    // Should show upgrade message via MarkdownRenderer
    await waitFor(() => {
      const markdownElements = screen.getAllByTestId('markdown');
      const upgradeText = markdownElements.find((el) =>
        el.textContent?.includes('Daily AI Limit Reached')
      );
      expect(upgradeText).toBeDefined();
    });
  });

  it('shows upgrade message for PROPULSE plan when credits exhausted', async () => {
    const user = userEvent.setup();
    const exhaustedUser = makeUser({
      plan: 'PROPULSE',
      credits: { ai: 10, maxAi: 10, assets: 20, maxAssets: 20 },
    });

    render(<AIAssistant user={exhaustedUser} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    const input = screen.getByPlaceholderText('Query the markets...');
    await user.type(input, 'Analyze BTC');
    await user.keyboard('{Enter}');

    expect(mockGetMarketInsightStream).not.toHaveBeenCalled();

    await waitFor(() => {
      const markdownElements = screen.getAllByTestId('markdown');
      const upgradeText = markdownElements.find((el) =>
        el.textContent?.includes('SuperPulse')
      );
      expect(upgradeText).toBeDefined();
    });
  });

  it('clears the input field after submitting a message', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    await user.click(screen.getAllByRole('button')[0]);

    const input = screen.getByPlaceholderText('Query the markets...') as HTMLInputElement;
    await user.type(input, 'Tell me about SOL');
    expect(input.value).toBe('Tell me about SOL');

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('closes the panel when clicking the toggle button again', async () => {
    const user = userEvent.setup();
    render(<AIAssistant user={makeUser()} onUpdateUsage={mockOnUpdateUsage} />);

    const toggleButton = screen.getAllByRole('button')[0];

    // Open
    await user.click(toggleButton);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();

    // Close (icon switches to X)
    await user.click(toggleButton);

    // Panel should have the scale-90/opacity-0 classes (pointer-events-none)
    const panel = screen.getByText('AI Assistant').closest('div.fixed');
    expect(panel?.className).toContain('pointer-events-none');
  });
});
