/**
 * Paddle Payment Service
 * Handles subscription checkout and management via Paddle
 */

import { PlanType } from '../types';
import { config } from '../config';

// API base URL
const API_BASE_URL = config.apiUrl;

// Paddle Price IDs - these should match your Paddle Dashboard
// Replace with your actual price IDs from Paddle
export const PADDLE_PRICE_IDS: Record<Exclude<PlanType, 'FREE'>, string> = {
  PROPULSE: import.meta.env.VITE_PADDLE_PRICE_PROPULSE || 'pri_propulse_monthly',
  SUPERPULSE: import.meta.env.VITE_PADDLE_PRICE_SUPERPULSE || 'pri_superpulse_monthly'
};

// Paddle client token - safe to expose
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';

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
      priceId: PADDLE_PRICE_IDS[plan],
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
 * Redirect to Paddle Checkout
 */
export const redirectToCheckout = async (
  userId: string,
  email: string,
  plan: Exclude<PlanType, 'FREE'>
): Promise<void> => {
  try {
    const { url } = await createCheckoutSession(userId, email, plan);
    
    // Redirect to Paddle Checkout
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
