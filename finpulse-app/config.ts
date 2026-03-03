// FinPulse API Configuration
// Supports multiple environments: development, staging, production
//
// IMPORTANT: Environment-specific values should be set via VITE_ environment variables
// See .env.example, .env.staging, and .env.production for templates
// Run `terraform output` in finpulse-infrastructure to get actual values

// Environment detection
const environment = import.meta.env.VITE_ENVIRONMENT || 
  (import.meta.env.DEV ? 'development' : 'production');

// Environment-specific defaults (used only when env vars are not set)
// NOTE: These are fallback values. In CI/CD, all values should come from secrets.
const envDefaults = {
  development: {
    // Development uses the production API for convenience (or set up local backend)
    apiUrl: '',  // Set VITE_API_URL in .env
    userPoolId: '',  // Set VITE_COGNITO_USER_POOL_ID in .env
    clientId: '',  // Set VITE_COGNITO_CLIENT_ID in .env
  },
  staging: {
    // Staging values come from: terraform output staging_api_url, staging_cognito_*
    apiUrl: '',  // Set VITE_API_URL in .env.staging
    userPoolId: '',  // Set VITE_COGNITO_USER_POOL_ID in .env.staging
    clientId: '',  // Set VITE_COGNITO_CLIENT_ID in .env.staging
  },
  production: {
    // Production values come from: terraform output api_gateway, cognito
    apiUrl: '',  // Set VITE_API_URL in .env.production
    userPoolId: '',  // Set VITE_COGNITO_USER_POOL_ID in .env.production
    clientId: '',  // Set VITE_COGNITO_CLIENT_ID in .env.production
  },
};

const defaults = envDefaults[environment as keyof typeof envDefaults] || envDefaults.production;

// Validate required config in non-development environments
const validateConfig = () => {
  const apiUrl = import.meta.env.VITE_API_URL || defaults.apiUrl;
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || defaults.userPoolId;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || defaults.clientId;
  
  if (!apiUrl || !userPoolId || !clientId) {
    console.warn(
      `[FinPulse Config] Missing required environment variables for ${environment} environment.\n` +
      'Please set VITE_API_URL, VITE_COGNITO_USER_POOL_ID, and VITE_COGNITO_CLIENT_ID.\n' +
      'Run "terraform output" in finpulse-infrastructure for values.'
    );
  }
  
  return { apiUrl, userPoolId, clientId };
};

const validated = validateConfig();

// OAuth configuration
const oauthConfig = {
  // Cognito domain for hosted UI
  domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
  // OAuth scopes
  scopes: ['email', 'openid', 'profile'],
  // Callback URL (where Cognito redirects after OAuth)
  redirectUri: import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/oauth/callback`,
  // Logout URL
  logoutUri: import.meta.env.VITE_OAUTH_LOGOUT_URI || window.location.origin,
};

export const config = {
  // Current environment
  environment,
  
  // API Gateway endpoint (use validated value)
  apiUrl: validated.apiUrl,
  
  // Cognito (use validated values)
  cognito: {
    userPoolId: validated.userPoolId,
    clientId: validated.clientId,
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
    // OAuth settings
    domain: oauthConfig.domain,
    oauth: oauthConfig,
  },
  
  // Feature flags
  features: {
    ai: import.meta.env.VITE_ENABLE_AI === 'true',
    community: import.meta.env.VITE_ENABLE_COMMUNITY === 'true',
    news: import.meta.env.VITE_ENABLE_NEWS === 'true',
  },
  
  // LemonSqueezy product variant IDs (public identifiers, not secrets)
  // Override via VITE_LEMONSQUEEZY_VARIANT_* env vars for different environments
  lemonSqueezy: {
    variantPropulse: import.meta.env.VITE_LEMONSQUEEZY_VARIANT_PROPULSE || '1229771',
    variantSuperpulse: import.meta.env.VITE_LEMONSQUEEZY_VARIANT_SUPERPULSE || '1229849',
  },

  // API endpoints
  endpoints: {
    auth: '/auth',
    market: '/market/prices',
    portfolio: '/portfolio',
    fx: '/fx/rates',
    news: '/news',
    community: '/community',
    admin: '/admin',
    payments: '/payments',
    ai: '/ai/query',
    sync: '/sync',
  },
  
  // API helper (use validated value)
  api: {
    baseUrl: validated.apiUrl,
    syncEndpoint: import.meta.env.VITE_SYNC_WS_URL || undefined,
  },
  
  // Helper to check environment
  isDevelopment: () => environment === 'development',
  isStaging: () => environment === 'staging',
  isProduction: () => environment === 'production',
};

export default config;
