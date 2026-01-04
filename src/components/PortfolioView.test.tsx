import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PortfolioView } from '../../components/PortfolioView';
import { usePortfolioStore } from '../../store/portfolioStore';
import { User } from '../../types';

// Mock the hooks
vi.mock('../../hooks/useMarketData', () => ({
  useMarketData: () => ({ prices: {}, loading: false })
}));

vi.mock('../../hooks/useWebSocketPrices', () => ({
  useWebSocketPrices: () => ({ prices: new Map(), isConnected: false })
}));

describe('PortfolioView - Free Tier Insights', () => {
  const mockUser: User = {
    id: 'test-user-123',
    email: 'test@finpulse.me',
    name: 'Test User',
    plan: 'FREE',
    credits: { assets: 3, maxAssets: 8, ai: 0, maxAi: 5 },
    settings: { theme: 'dark', language: 'en', currency: 'USD' }
  };

  const mockUpdateUser = vi.fn();

  beforeEach(() => {
    // Reset portfolio store
    const store = usePortfolioStore.getState();
    store.clearCurrentUser();
    store.setCurrentUser(mockUser.id);
    store.setHoldings([]);
  });

  it('should render portfolio insights when holdings exist', () => {
    const store = usePortfolioStore.getState();
    
    // Ensure user is set
    store.setCurrentUser(mockUser.id);
    
    // Add some holdings
    store.addHolding({
      symbol: 'BTC',
      name: 'Bitcoin',
      type: 'CRYPTO',
      quantity: 0.5,
      avgCost: 90000,
      currentPrice: 95000,
      dayPL: 2.5
    });
    
    store.addHolding({
      symbol: 'ETH',
      name: 'Ethereum',
      type: 'CRYPTO',
      quantity: 2,
      avgCost: 3000,
      currentPrice: 3100,
      dayPL: 1.8
    });
    
    store.addHolding({
      symbol: 'NVDA',
      name: 'Nvidia',
      type: 'STOCK',
      quantity: 5,
      avgCost: 180,
      currentPrice: 188.85,
      dayPL: 5.16
    });

    render(
      <PortfolioView 
        user={mockUser} 
        onUpdateUser={mockUpdateUser}
        currency="USD"
        onCurrencyChange={vi.fn()}
      />
    );

    // Check if the new insights sections are rendered
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Diversity Score')).toBeInTheDocument();
    expect(screen.getByText('Quick Stats')).toBeInTheDocument();
  });

  it('should not show insights when portfolio is empty', () => {
    render(
      <PortfolioView 
        user={mockUser} 
        onUpdateUser={mockUpdateUser}
        currency="USD"
        onCurrencyChange={vi.fn()}
      />
    );

    // Insights should not be rendered for empty portfolio
    expect(screen.queryByText('Performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Diversity Score')).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Stats')).not.toBeInTheDocument();
  });
});
