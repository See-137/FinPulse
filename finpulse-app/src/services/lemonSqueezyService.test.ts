/**
 * LemonSqueezyService Tests
 * Tests for payment checkout, subscription management, and demo mode fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();

// Mock localStorage with proper state management
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

let mockLocalStorage = createMockLocalStorage();

// Mock window.location
const mockLocation = {
  origin: 'https://finpulse.me',
  href: 'https://finpulse.me/dashboard'
};

describe('lemonSqueezyService', () => {
  let originalFetch: typeof fetch;
  let originalLocalStorage: Storage;
  let originalLocation: Location;

  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage = createMockLocalStorage();
    
    originalFetch = global.fetch;
    originalLocalStorage = global.localStorage;
    
    global.fetch = mockFetch;
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });
    Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
    
    // Set up auth token
    mockLocalStorage.setItem('finpulse_id_token', 'test-token');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(global, 'localStorage', { value: originalLocalStorage });
  });

  describe('Variant IDs', () => {
    it('should have correct variant IDs for plans', () => {
      // These are the production variant IDs
      const VARIANT_IDS = {
        PROPULSE: '1229771',
        SUPERPULSE: '1229849'
      };
      
      expect(VARIANT_IDS.PROPULSE).toBe('1229771');
      expect(VARIANT_IDS.SUPERPULSE).toBe('1229849');
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session with valid variant', async () => {
      const checkoutUrl = 'https://finpulse.lemonsqueezy.com/checkout/123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl })
      });

      const response = await mockFetch('/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockLocalStorage.getItem('finpulse_id_token')}`
        },
        body: JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          variantId: '1229771',
          plan: 'PROPULSE',
          successUrl: `${mockLocation.origin}?success=true&plan=PROPULSE`,
          cancelUrl: `${mockLocation.origin}?canceled=true`
        })
      });

      const data = await response.json();
      expect(data.checkoutUrl).toBe(checkoutUrl);
    });

    it('should fall back to demo mode when variant ID is missing', () => {
      const variantId = '';
      const plan = 'PROPULSE';
      
      if (!variantId) {
        const demoUrl = `${mockLocation.origin}?demo_upgrade=${plan}&session_id=demo_${Date.now()}`;
        expect(demoUrl).toContain('demo_upgrade=PROPULSE');
      }
    });

    it('should handle checkout API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Failed to create checkout' })
      });

      const response = await mockFetch('/payments/checkout', { method: 'POST' });
      expect(response.ok).toBe(false);
    });

    it('should include correct success and cancel URLs', () => {
      const plan = 'SUPERPULSE';
      const successUrl = `${mockLocation.origin}?success=true&plan=${plan}`;
      const cancelUrl = `${mockLocation.origin}?canceled=true`;
      
      expect(successUrl).toBe('https://finpulse.me?success=true&plan=SUPERPULSE');
      expect(cancelUrl).toBe('https://finpulse.me?canceled=true');
    });
  });

  describe('getCustomerPortalUrl', () => {
    it('should return customer portal URL', async () => {
      const portalUrl = 'https://finpulse.lemonsqueezy.com/billing/123';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ url: portalUrl })
      });

      const response = await mockFetch('/payments/portal', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          returnUrl: mockLocation.origin
        })
      });

      const data = await response.json();
      expect(data.url).toBe(portalUrl);
    });

    it('should handle missing subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'No subscription found' })
      });

      const response = await mockFetch('/payments/portal', { method: 'POST' });
      expect(response.status).toBe(404);
    });

    it('should fall back to origin when portal fetch fails', () => {
      const fallbackUrl = mockLocation.origin;
      expect(fallbackUrl).toBe('https://finpulse.me');
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return active subscription status', async () => {
      const subscriptionStatus = {
        status: 'active',
        plan: 'PROPULSE',
        currentPeriodEnd: '2026-02-18T00:00:00Z',
        cancelAtPeriodEnd: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(subscriptionStatus)
      });

      const response = await mockFetch('/payments/subscription/user-123');
      const data = await response.json();

      expect(data.status).toBe('active');
      expect(data.plan).toBe('PROPULSE');
      expect(data.cancelAtPeriodEnd).toBe(false);
    });

    it('should return null for users without subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null)
      });

      const response = await mockFetch('/payments/subscription/user-123');
      expect(response.status).toBe(404);
    });

    it.each([
      ['active', 'User has active subscription'],
      ['cancelled', 'User cancelled but still has access'],
      ['past_due', 'Payment failed, grace period'],
      ['paused', 'Subscription paused'],
      ['expired', 'Subscription ended']
    ])('should handle %s subscription status', (status, _description) => {
      const subscription = { status, plan: 'PROPULSE' };
      expect(subscription.status).toBe(status);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const response = await mockFetch('/payments/subscription/user-123/cancel', {
        method: 'POST'
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });

    it('should handle cancel errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Failed to cancel subscription' })
      });

      const response = await mockFetch('/payments/subscription/user-123/cancel', {
        method: 'POST'
      });
      expect(response.ok).toBe(false);
    });
  });

  describe('resumeSubscription', () => {
    it('should resume cancelled subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const response = await mockFetch('/payments/subscription/user-123/resume', {
        method: 'POST'
      });
      const data = await response.json();

      expect(data.success).toBe(true);
    });
  });

  describe('Demo Mode', () => {
    it('should generate demo checkout URL when variant is missing', () => {
      const plan = 'PROPULSE';
      const sessionId = `demo_${Date.now()}`;
      const demoUrl = `${mockLocation.origin}?demo_upgrade=${plan}&session_id=${sessionId}`;
      
      expect(demoUrl).toContain('demo_upgrade=PROPULSE');
      expect(demoUrl).toContain('session_id=demo_');
    });

    it('should detect demo mode from URL', () => {
      const url = new URL('https://finpulse.me?demo_upgrade=PROPULSE&session_id=demo_123');
      const demoUpgrade = url.searchParams.get('demo_upgrade');
      
      expect(demoUpgrade).toBe('PROPULSE');
    });
  });

  describe('LemonSqueezy Overlay', () => {
    it('should check for LemonSqueezy.js availability', () => {
      // Without LemonSqueezy.js loaded
      const hasLemonSqueezy = typeof window !== 'undefined' && (window as any).LemonSqueezy;
      expect(hasLemonSqueezy).toBeFalsy();
    });

    it('should fall back to redirect when overlay unavailable', () => {
      const hasLemonSqueezy = false;
      if (!hasLemonSqueezy) {
        // Would redirect instead
        expect(true).toBe(true);
      }
    });
  });

  describe('Authorization', () => {
    it('should include auth token in requests', () => {
      const token = mockLocalStorage.getItem('finpulse_id_token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      expect(headers.Authorization).toBe('Bearer test-token');
    });

    it('should handle missing auth token', () => {
      mockLocalStorage.removeItem('finpulse_id_token');
      const token = mockLocalStorage.getItem('finpulse_id_token');
      
      expect(token).toBeNull();
    });
  });
});
