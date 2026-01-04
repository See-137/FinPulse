/**
 * NotificationBell Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '../../components/NotificationBell';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('renders bell icon', () => {
    render(<NotificationBell userPlan="FREE" />);
    // Should have a button with the bell
    const bellButton = screen.getByRole('button');
    expect(bellButton).toBeInTheDocument();
  });

  it('shows unread badge when there are unread notifications', () => {
    render(<NotificationBell userPlan="FREE" />);
    // Default notifications are unread, so badge should show
    const badge = screen.getByText(/\d+/);
    expect(badge).toBeInTheDocument();
  });

  it('opens notification panel on click', async () => {
    const user = userEvent.setup();
    render(<NotificationBell userPlan="FREE" />);
    
    const bellButton = screen.getByRole('button');
    await user.click(bellButton);
    
    // Should show notifications panel
    expect(screen.getByText('FinPulse V2 is Live! 🚀')).toBeInTheDocument();
  });

  it('closes panel when clicking close button', async () => {
    const user = userEvent.setup();
    render(<NotificationBell userPlan="FREE" />);
    
    // Open panel
    const bellButton = screen.getByRole('button');
    await user.click(bellButton);
    
    // Find close button (it's the X button in the panel header)
    const allButtons = screen.getAllByRole('button');
    // The close button is the last button with X icon
    const closeButton = allButtons.find(btn => btn.querySelector('svg.lucide-x'));
    expect(closeButton).toBeDefined();
    
    if (closeButton) {
      await user.click(closeButton);
    }
    
    // Panel should be closed - wait for animation
    await waitFor(() => {
      // After closing, the panel content should not be visible
      const panel = screen.queryByText('FinPulse V2 is Live! 🚀');
      // Either panel is removed or not in document after close
      expect(panel).toBeNull();
    }, { timeout: 1000 });
  });

  it('filters notifications based on user plan', async () => {
    const user = userEvent.setup();
    
    // Render with FREE plan
    render(<NotificationBell userPlan="FREE" />);
    const bellButton = screen.getByRole('button');
    await user.click(bellButton);
    
    // Should show upgrade offer for FREE users
    expect(screen.getByText('Unlock Commodities Tracking')).toBeInTheDocument();
  });

  it('hides targeted notifications for non-matching plans', async () => {
    const user = userEvent.setup();
    
    // Render with PROPULSE plan
    render(<NotificationBell userPlan="PROPULSE" />);
    const bellButton = screen.getByRole('button');
    await user.click(bellButton);
    
    // Should NOT show upgrade offer for PROPULSE users (targeted to FREE only)
    expect(screen.queryByText('Unlock Commodities Tracking')).not.toBeInTheDocument();
  });
});
