/**
 * LemonSqueezy Payment Service
 * Handles subscription checkout and management via LemonSqueezy
 * 
 * LemonSqueezy is a Merchant of Record - they handle:
 * - Payment processing
 * - Tax collection (VAT, GST, etc.)
 * - Invoicing and receipts
 * - Refunds and chargebacks
 * 
 * Setup:
 * 1. Create account at https://lemonsqueezy.com
 * 2. Create a Store
 * 3. Create Products for each plan (PROPULSE, SUPERPULSE)
 * 4. Get Variant IDs from product page
 * 5. Set up webhook at /payments/webhook
 */

import { PlanType } from '../types';
import { config } from '../config';
import { createLogger } from './logger';

const paymentLogger = createLogger('Payments');

// API base URL
const API_BASE_URL = config.apiUrl;

// LemonSqueezy Variant IDs - sourced from config (with env var override + hardcoded defaults)
export const LEMONSQUEEZY_VARIANT_IDS: Record<Exclude<PlanType, 'FREE'>, string> = {
  PROPULSE: config.lemonSqueezy.variantPropulse,
  SUPERPULSE: config.lemonSqueezy.variantSuperpulse,
};

// Extend Window interface for LemonSqueezy.js
declare global {
  interface Window {
    LemonSqueezy?: {
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

interface CheckoutResponse {
  checkoutUrl: string;
}

interface CustomerPortalResponse {
  url: string;
}

interface SubscriptionStatus {
  status: 'active' | 'cancelled' | 'past_due' | 'paused' | 'on_trial' | 'expired';
  plan: PlanType;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  customerPortalUrl?: string;
}

/**
 * Create a LemonSqueezy checkout URL
 * Uses the LemonSqueezy Checkout overlay or redirect
 */
export const createCheckoutSession = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>,
  billingInterval: 'month' | 'year' = 'month'
): Promise<{ url: string }> => {
  const variantId = LEMONSQUEEZY_VARIANT_IDS[plan];
  
  if (!variantId) {
    paymentLogger.error(`No variant ID configured for plan: ${plan}`);
    throw new Error('Payments are not yet available. Please try again later or contact support.');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/payments/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('finpulse_id_token')}`
      },
      body: JSON.stringify({
        userId,
        email,
        variantId,
        plan,
        billingInterval,
        successUrl: `${window.location.origin}?success=true&plan=${plan}`,
        cancelUrl: `${window.location.origin}?canceled=true`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout');
    }

    const data: CheckoutResponse = await response.json();
    return { url: data.checkoutUrl };
  } catch (error) {
    paymentLogger.error('Checkout creation failed:', error as Error);
    throw error;
  }
};

/**
 * Redirect to LemonSqueezy Checkout
 */
export const redirectToCheckout = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
): Promise<void> => {
  try {
    const { url } = await createCheckoutSession(userId, email, plan);
    window.location.href = url;
  } catch (error) {
    paymentLogger.error('Checkout redirect failed:', error as Error);
    throw error;
  }
};

/**
 * Get customer portal URL for managing subscription
 * LemonSqueezy provides a hosted customer portal
 */
export const getCustomerPortalUrl = async (userId: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('finpulse_id_token')}`
      },
      body: JSON.stringify({
        userId,
        returnUrl: window.location.origin
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get portal URL');
    }

    const data: CustomerPortalResponse = await response.json();
    return data.url;
  } catch (error) {
    paymentLogger.error('Portal URL fetch failed:', error as Error);
    // Fallback to home page
    return window.location.origin;
  }
};

/**
 * Redirect to LemonSqueezy Customer Portal
 */
export const redirectToCustomerPortal = async (userId: string): Promise<void> => {
  const url = await getCustomerPortalUrl(userId);
  window.location.href = url;
};

/**
 * Get subscription status for a user
 */
export const getSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/subscription/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('finpulse_id_token')}`
      }
    });
    
    if (response.status === 404) {
      return null; // No subscription
    }
    
    if (!response.ok) {
      throw new Error('Failed to get subscription status');
    }
    
    return response.json();
  } catch (error) {
    paymentLogger.error('Subscription status fetch failed:', error as Error);
    return null;
  }
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async (userId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/payments/subscription/${userId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('finpulse_id_token')}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel subscription');
  }
};

/**
 * Resume canceled subscription (if before period end)
 */
export const resumeSubscription = async (userId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/payments/subscription/${userId}/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('finpulse_id_token')}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resume subscription');
  }
};

/**
 * Open LemonSqueezy checkout in overlay mode (better UX)
 * Requires LemonSqueezy.js to be loaded
 */
export const openCheckoutOverlay = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
): Promise<void> => {
  const variantId = LEMONSQUEEZY_VARIANT_IDS[plan];
  
  if (!variantId) {
    // Fall back to redirect
    return redirectToCheckout(userId, email, plan);
  }

  // Check if LemonSqueezy.js is loaded
  if (typeof window !== 'undefined' && window.LemonSqueezy) {
    window.LemonSqueezy.Url.Open(
      `https://finpulse.lemonsqueezy.com/checkout/buy/${variantId}?` +
      `checkout[email]=${encodeURIComponent(email)}&` +
      `checkout[custom][user_id]=${encodeURIComponent(userId)}`
    );
  } else {
    // Fallback to redirect
    return redirectToCheckout(userId, email, plan);
  }
};
