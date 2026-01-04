/**
 * Stripe Payment Service
 * Handles subscription checkout and management via Stripe
 */

import { PlanType } from '../types';
import { config } from '../config';

// API base URL
const API_BASE_URL = config.apiUrl;

// Stripe Price IDs - these should match your Stripe Dashboard
// Replace with your actual price IDs from Stripe
export const STRIPE_PRICE_IDS: Record<Exclude<PlanType, 'FREE'>, string> = {
  PRO: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_pro_monthly',
  TEAM: import.meta.env.VITE_STRIPE_PRICE_TEAM || 'price_team_monthly'
};

// Stripe public key - safe to expose
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

interface CustomerPortalResponse {
  url: string;
}

interface SubscriptionStatus {
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  plan: PlanType;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Load Stripe.js dynamically
 */
let stripePromise: Promise<any> | null = null;

export const getStripe = async () => {
  if (!stripePromise) {
    const { loadStripe } = await import('@stripe/stripe-js');
    stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

/**
 * Create a checkout session for subscription upgrade
 */
export const createCheckoutSession = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
): Promise<CheckoutSessionResponse> => {
  const response = await fetch(`${API_BASE_URL}/payments/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      email,
      priceId: STRIPE_PRICE_IDS[plan],
      plan,
      successUrl: `${window.location.origin}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancelUrl: `${window.location.origin}?canceled=true`
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return response.json();
};

/**
 * Redirect to Stripe Checkout
 */
export const redirectToCheckout = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
): Promise<void> => {
  try {
    const { url } = await createCheckoutSession(userId, email, plan);
    
    // Redirect to Stripe Checkout
    window.location.href = url;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

/**
 * Get customer portal URL for managing subscription
 */
export const getCustomerPortalUrl = async (userId: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/payments/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
};

/**
 * Redirect to Stripe Customer Portal
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
    const response = await fetch(`${API_BASE_URL}/payments/subscription/${userId}`);
    
    if (response.status === 404) {
      return null; // No subscription
    }
    
    if (!response.ok) {
      throw new Error('Failed to get subscription status');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching subscription:', error);
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
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resume subscription');
  }
};

/**
 * Verify checkout session after redirect
 */
export const verifyCheckoutSession = async (sessionId: string): Promise<{
  success: boolean;
  plan: PlanType;
  userId: string;
}> => {
  const response = await fetch(`${API_BASE_URL}/payments/verify-session/${sessionId}`);
  
  if (!response.ok) {
    throw new Error('Failed to verify session');
  }
  
  return response.json();
};
