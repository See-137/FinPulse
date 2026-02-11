/**
 * FinPulse Analytics Service
 * Centralized event tracking for Meta Pixel + Conversions API (CAPI)
 *
 * Events fire client-side via fbq() and server-side via CAPI Lambda.
 * Deduplication uses shared eventID (client + server send same ID).
 *
 * Privacy: All events are gated behind cookie consent.
 * The Pixel base code only loads after user opts in (see CookieConsent component).
 */

import { config } from '../config';
import { createLogger } from './logger';

const analyticsLogger = createLogger('Analytics');

// ---- Consent state ----
const CONSENT_KEY = 'finpulse_cookie_consent';

export type ConsentChoice = 'accepted' | 'declined' | null;

export const getConsent = (): ConsentChoice => {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === 'accepted' || stored === 'declined') return stored;
  return null;
};

export const setConsent = (choice: 'accepted' | 'declined'): void => {
  localStorage.setItem(CONSENT_KEY, choice);
  if (choice === 'accepted') {
    initPixel();
  }
};

// ---- UTM handling ----
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const UTM_STORAGE_KEY = 'finpulse_utm';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

/** Capture UTM params from URL and persist to sessionStorage */
export const captureUTMParams = (): UTMParams => {
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};
  let hasUTM = false;

  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) {
      utm[key] = val;
      hasUTM = true;
    }
  }

  if (hasUTM) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    analyticsLogger.info('UTM params captured', utm as Record<string, unknown>);
  }

  return getStoredUTM();
};

export const getStoredUTM = (): UTMParams => {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// ---- Event ID generation (for Pixel ↔ CAPI dedup) ----
const generateEventId = (): string =>
  `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

// ---- Meta Pixel helpers ----
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const isPixelLoaded = (): boolean => typeof window.fbq === 'function';

/** Initialise Meta Pixel (called after consent accepted) */
export const initPixel = (): void => {
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (!pixelId) {
    analyticsLogger.warn('Meta Pixel ID not configured (VITE_META_PIXEL_ID)');
    return;
  }
  if (isPixelLoaded()) return; // Already initialised

  // Dynamically load the Pixel script
  /* eslint-disable */
  (function(f: any,b: any,e: any,v: any,n?: any,t?: any,s?: any){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)
  })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq?.('init', pixelId);
  window.fbq?.('track', 'PageView');
  analyticsLogger.info(`Meta Pixel initialised: ${pixelId}`);
};

// ---- CAPI relay ----
const sendCAPI = async (
  eventName: string,
  eventId: string,
  customData?: Record<string, unknown>,
  userData?: Record<string, unknown>
): Promise<void> => {
  const capiUrl = config.apiUrl;
  if (!capiUrl) return;

  try {
    await fetch(`${capiUrl}/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        event_time: Math.floor(Date.now() / 1000),
        custom_data: customData,
        user_data: userData,
        utm: getStoredUTM(),
      }),
    });
  } catch (err) {
    // Non-blocking — analytics failures must never break the app
    analyticsLogger.warn('CAPI relay failed', err);
  }
};

// ---- Public event functions ----

/**
 * Track landing page view (fires on LandingPage mount).
 * Maps to Meta Pixel "PageView" (already fired on init) + custom LandingView via CAPI.
 */
export const trackLandingView = (): void => {
  if (getConsent() !== 'accepted') return;

  const eventId = generateEventId();
  // Pixel PageView is auto-fired on init; send CAPI for dedup
  sendCAPI('LandingView', eventId, { page: 'landing', ...getStoredUTM() });
  analyticsLogger.info('LandingView tracked');
};

/**
 * Track successful signup / registration.
 * Maps to Meta Pixel "CompleteRegistration".
 */
export const trackCompleteRegistration = (userId: string): void => {
  if (getConsent() !== 'accepted') return;

  const eventId = generateEventId();
  window.fbq?.('track', 'CompleteRegistration', { content_name: 'signup' }, { eventID: eventId });
  sendCAPI('CompleteRegistration', eventId, { content_name: 'signup' }, { external_id: userId });
  analyticsLogger.info(`CompleteRegistration tracked: ${userId}`);
};

/**
 * Track activation (first meaningful dashboard state — holdings added + chart visible).
 * Custom event — no standard Pixel equivalent.
 */
export const trackActivation = (userId: string, assetCount: number): void => {
  if (getConsent() !== 'accepted') return;

  const eventId = generateEventId();
  window.fbq?.('trackCustom', 'Activation', { asset_count: assetCount }, { eventID: eventId });
  sendCAPI('Activation', eventId, { asset_count: assetCount }, { external_id: userId });
  analyticsLogger.info(`Activation tracked: ${userId} assets: ${assetCount}`);
};

/**
 * Track purchase / subscription upgrade.
 * Maps to Meta Pixel "Purchase".
 */
export const trackPurchase = (
  userId: string,
  plan: string,
  value: number,
  currency: string = 'USD',
  billingInterval: 'month' | 'year' = 'month'
): void => {
  if (getConsent() !== 'accepted') return;

  const eventId = generateEventId();
  const data = { value, currency, content_name: plan, content_type: 'subscription', billing_interval: billingInterval };
  window.fbq?.('track', 'Purchase', data, { eventID: eventId });
  sendCAPI('Purchase', eventId, data, { external_id: userId });
  analyticsLogger.info(`Purchase tracked: ${plan} ${value} ${currency} ${billingInterval}`);
};

/**
 * Track subscription renewal (webhook-side primarily, but client can also fire).
 * Custom event.
 */
export const trackRenewal = (userId: string, plan: string, value: number): void => {
  if (getConsent() !== 'accepted') return;

  const eventId = generateEventId();
  window.fbq?.('trackCustom', 'Renewal', { plan, value, currency: 'USD' }, { eventID: eventId });
  sendCAPI('Renewal', eventId, { plan, value, currency: 'USD' }, { external_id: userId });
  analyticsLogger.info(`Renewal tracked: ${userId} ${plan} ${value}`);
};
