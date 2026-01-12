/**
 * Test Utilities
 * Custom render functions and helpers for testing FinPulse components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Custom render function that wraps components with necessary providers
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const AllProviders = ({ children }: { children: React.ReactNode }) => {
    // Add context providers here as needed (e.g., AuthProvider, ThemeProvider)
    return <>{children}</>;
  };

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
};

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  subscription: 'premium' as const,
  ...overrides,
});

/**
 * Create mock portfolio data for testing
 */
export const createMockPortfolio = (overrides = {}) => ({
  holdings: [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.5,
      avgCost: 45000,
      currentPrice: 48000,
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      quantity: 2,
      avgCost: 2500,
      currentPrice: 2800,
    },
  ],
  totalValue: 29600,
  totalPL: 1700,
  plPercent: 6.09,
  ...overrides,
});

/**
 * Create mock market data for testing
 */
export const createMockMarketData = () => [
  { symbol: 'BTC', name: 'Bitcoin', price: 48000, change24h: 2.5 },
  { symbol: 'ETH', name: 'Ethereum', price: 2800, change24h: -1.2 },
  { symbol: 'XRP', name: 'XRP', price: 2.09, change24h: 5.1 },
];

/**
 * Wait for async operations in tests
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Re-export testing-library functions
export { render as renderTL } from '@testing-library/react';
export { customRender as render };
