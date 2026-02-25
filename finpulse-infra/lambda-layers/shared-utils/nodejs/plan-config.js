/**
 * FinPulse Plan Configuration — Single Source of Truth
 *
 * ALL plan limits must be defined here. Do NOT define plan limits
 * anywhere else (auth Lambda, payments Lambda, frontend constants).
 *
 * Plan names: FREE, PROPULSE, SUPERPULSE (canonical, uppercase)
 */

const PLAN_LIMITS = {
  FREE: {
    maxAssets: 20,
    maxAiQueries: 10,
    features: ['portfolio', 'news', 'community']
  },
  PROPULSE: {
    maxAssets: 50,
    maxAiQueries: 50,
    features: ['portfolio', 'news', 'community', 'ai', 'commodities', 'csv_export']
  },
  SUPERPULSE: {
    maxAssets: 9999,
    maxAiQueries: 9999,
    features: ['portfolio', 'news', 'community', 'ai', 'commodities', 'csv_export', 'premium_analytics', 'priority_support', 'ad_free']
  }
};

const VALID_PLAN_NAMES = Object.keys(PLAN_LIMITS);

/**
 * Get limits for a plan. Returns FREE limits if plan is unknown.
 * @param {string} plan - Plan name (FREE, PROPULSE, SUPERPULSE)
 * @returns {{ maxAssets: number, maxAiQueries: number, features: string[] }}
 */
function getPlanLimits(plan) {
  const normalized = (plan || 'FREE').toUpperCase();
  return PLAN_LIMITS[normalized] || PLAN_LIMITS.FREE;
}

/**
 * Check if a plan name is valid.
 * @param {string} plan
 * @returns {boolean}
 */
function isValidPlan(plan) {
  return VALID_PLAN_NAMES.includes((plan || '').toUpperCase());
}

module.exports = {
  PLAN_LIMITS,
  VALID_PLAN_NAMES,
  getPlanLimits,
  isValidPlan
};
