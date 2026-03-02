/**
 * SettingsModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from '../../components/SettingsModal';
import type { User, PlanType, Theme } from '../../types';

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'toast.exportDataFailed': 'Failed to export data',
        'toast.accountDeleted': 'Account deleted successfully',
        'toast.deleteAccountFailed': 'Failed to delete account',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

// Mock Toast
const mockShowToast = vi.fn();
vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock authService
const mockSignOut = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/authService', () => ({
  auth: {
    signOut: () => mockSignOut(),
  },
}));

// Mock lemonSqueezyService
const mockRedirectToCustomerPortal = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/lemonSqueezyService', () => ({
  redirectToCustomerPortal: (...args: unknown[]) => mockRedirectToCustomerPortal(...args),
}));

// Mock logger
vi.mock('../../services/logger', () => ({
  componentLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    apiUrl: 'https://api.test.com',
  },
}));

describe('SettingsModal', () => {
  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    plan: 'FREE' as PlanType,
    userRole: 'user',
    credits: {
      ai: 5,
      maxAi: 10,
      assets: 8,
      maxAssets: 20,
    },
    subscriptionStatus: 'none',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: mockUser,
    onUpgrade: vi.fn(),
    onOpenPricing: vi.fn(),
    currentTheme: 'dark' as Theme,
    onThemeChange: vi.fn(),
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SettingsModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the settings modal title and subtitle', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText('Pulse Settings')).toBeInTheDocument();
    expect(screen.getByText(/Manage node configuration/)).toBeInTheDocument();
  });

  it('displays theme toggle buttons (Light, Dark, System)', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('calls onThemeChange when a theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} currentTheme="dark" />);

    await user.click(screen.getByText('Light'));
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('light');

    await user.click(screen.getByText('System'));
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('system');
  });

  it('displays the active plan name and price', () => {
    render(<SettingsModal {...defaultProps} />);
    // FREE plan badge
    expect(screen.getByText('FREE')).toBeInTheDocument();
    // Price display
    expect(screen.getByText('$0')).toBeInTheDocument();
    // Plan description
    expect(screen.getByText(/You are on the Free plan/)).toBeInTheDocument();
  });

  it('displays AI credits and asset slot usage', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText('AI Pulse Credits')).toBeInTheDocument();
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
    expect(screen.getByText('Pulse Slots')).toBeInTheDocument();
    expect(screen.getByText('8 / 20')).toBeInTheDocument();
  });

  it('shows infinity symbol for unlimited credits (SUPERPULSE)', () => {
    const superUser: User = {
      ...mockUser,
      plan: 'SUPERPULSE',
      credits: { ai: 50, maxAi: 9999, assets: 100, maxAssets: 9999 },
    };
    render(<SettingsModal {...defaultProps} user={superUser} />);
    // Unlimited credits display infinity
    const infinityElements = screen.getAllByText(/∞/);
    expect(infinityElements.length).toBeGreaterThanOrEqual(2);
  });

  it('shows upgrade tier buttons that open pricing modal', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    expect(screen.getByText('ProPulse')).toBeInTheDocument();
    expect(screen.getByText('SuperPulse')).toBeInTheDocument();

    // Click the ProPulse upgrade button
    await user.click(screen.getByText('ProPulse'));
    expect(defaultProps.onOpenPricing).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    // The close button has an X icon; find all buttons and use the close one
    const closeButtons = screen.getAllByRole('button');
    // First button in the modal is the close button (top-right X)
    await user.click(closeButtons[0]);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles sign out flow', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await user.click(screen.getByText('Sign Out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(defaultProps.onLogout).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('opens delete account confirmation and requires DELETE text', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    // Click Delete Account
    await user.click(screen.getByText('Delete Account'));

    // Confirmation dialog should appear
    expect(screen.getByText('Delete Forever')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();

    // Delete Forever button should be disabled until DELETE is typed
    const deleteButton = screen.getByText('Delete Forever').closest('button')!;
    expect(deleteButton).toBeDisabled();

    // Type DELETE
    await user.type(screen.getByPlaceholderText('DELETE'), 'DELETE');
    expect(deleteButton).not.toBeDisabled();
  });

  it('cancels delete account confirmation', async () => {
    const user = userEvent.setup();
    render(<SettingsModal {...defaultProps} />);

    await user.click(screen.getByText('Delete Account'));
    expect(screen.getByText('Delete Forever')).toBeInTheDocument();

    await user.click(screen.getByText('Cancel'));
    // Confirmation dialog should be gone
    expect(screen.queryByText('Delete Forever')).not.toBeInTheDocument();
  });
});
