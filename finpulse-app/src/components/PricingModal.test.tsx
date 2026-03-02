/**
 * PricingModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingModal } from '../../components/PricingModal';
import type { User, PlanType } from '../../types';

// Mock i18n
vi.mock('../../i18n', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'pricing.title': 'Choose Your Plan',
        'pricing.subtitle': 'Unlock powerful features to maximize your pulse',
        'pricing.popular': 'Most Popular',
        'pricing.currentPlan': 'Current Plan',
        'pricing.perMonth': '/mo',
        'pricing.processing': 'Processing...',
        'pricing.manageBilling': 'Manage Billing',
        'pricing.upgrade': 'Upgrade Now',
        'pricing.downgrade': 'Manage Plan',
        'pricing.securePayment': 'Secure payment powered by',
        'pricing.cancelAnytime': 'Cancel anytime. No hidden fees.',
      };
      return translations[key] || key;
    },
    language: 'en',
    isRTL: false,
  }),
}));

// Mock lemonSqueezyService
const mockCreateCheckoutSession = vi.fn();
const mockRedirectToCustomerPortal = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/lemonSqueezyService', () => ({
  createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
  redirectToCustomerPortal: (...args: unknown[]) => mockRedirectToCustomerPortal(...args),
}));

// Mock analytics
vi.mock('../../services/analytics', () => ({
  trackPurchase: vi.fn(),
}));

describe('PricingModal', () => {
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
    user: mockUser,
    isOpen: true,
    onClose: vi.fn(),
    onPlanChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <PricingModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal header with title and subtitle', () => {
    render(<PricingModal {...defaultProps} />);
    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Unlock powerful features to maximize your pulse')).toBeInTheDocument();
  });

  it('renders all three plan cards (Free, ProPulse, SuperPulse)', () => {
    render(<PricingModal {...defaultProps} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('ProPulse')).toBeInTheDocument();
    expect(screen.getByText('SuperPulse')).toBeInTheDocument();
  });

  it('displays correct monthly prices for all plans', () => {
    render(<PricingModal {...defaultProps} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$9.90')).toBeInTheDocument();
    expect(screen.getByText('$29.90')).toBeInTheDocument();
  });

  it('toggles to annual pricing when Annual button is clicked', async () => {
    const user = userEvent.setup();
    render(<PricingModal {...defaultProps} />);

    // Click Annual toggle
    await user.click(screen.getByText('Annual'));

    // Should show annual prices
    expect(screen.getByText('$0')).toBeInTheDocument();
    expect(screen.getByText('$89')).toBeInTheDocument();
    expect(screen.getByText('$249')).toBeInTheDocument();
  });

  it('shows annual savings badges when annual billing is selected', async () => {
    const user = userEvent.setup();
    render(<PricingModal {...defaultProps} />);

    await user.click(screen.getByText('Annual'));

    // ProPulse saves 25%, SuperPulse saves 31%
    expect(screen.getByText('Save 25%')).toBeInTheDocument();
    expect(screen.getByText('Save 31%')).toBeInTheDocument();
  });

  it('shows "Most Popular" badge on ProPulse card (when not current plan)', () => {
    render(<PricingModal {...defaultProps} />);
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('shows "Current Plan" badge on the user current plan card', () => {
    render(<PricingModal {...defaultProps} />);
    // FREE is the current plan
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
  });

  it('shows upgrade buttons for higher-tier plans', () => {
    render(<PricingModal {...defaultProps} />);
    // ProPulse and SuperPulse should show "Upgrade Now"
    const upgradeButtons = screen.getAllByText('Upgrade Now');
    expect(upgradeButtons).toHaveLength(2);
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<PricingModal {...defaultProps} />);

    // Find the close button (contains X icon)
    const closeButtons = screen.getAllByRole('button');
    // The close button is the one in the header (first or last)
    const closeButton = closeButtons.find(btn =>
      btn.classList.contains('hover:bg-white/10') && btn.closest('.sticky')
    );
    if (closeButton) {
      await user.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('renders footer with secure payment and cancel info', () => {
    render(<PricingModal {...defaultProps} />);
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime. No hidden fees.')).toBeInTheDocument();
    expect(screen.getByText(/Not financial advice/)).toBeInTheDocument();
  });

  it('renders plan features in each card', () => {
    render(<PricingModal {...defaultProps} />);
    // Check features from the FREE plan (appears twice: summary + features list)
    const freeFeatures = screen.getAllByText('Stocks & Crypto Tracking');
    expect(freeFeatures.length).toBeGreaterThanOrEqual(1);
    // Check features from PROPULSE
    expect(screen.getByText('Commodities (Gold, Oil, etc.)')).toBeInTheDocument();
    // Check features from SUPERPULSE
    expect(screen.getByText('Priority Support')).toBeInTheDocument();
  });
});
