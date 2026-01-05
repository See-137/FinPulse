// FinPulse API Configuration
// Supports multiple environments: development, staging, production

// Environment detection
const environment = import.meta.env.VITE_ENVIRONMENT || 
  (import.meta.env.DEV ? 'development' : 'production');

// Environment-specific defaults
const envDefaults = {
  development: {
    apiUrl: 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod',
    userPoolId: 'us-east-1_b36NPuJf3',
    clientId: '4lhsbeeae63ne3vgosog38lieu',
  },
  staging: {
    apiUrl: 'https://STAGING_API_ID.execute-api.us-east-1.amazonaws.com/staging',
    userPoolId: 'us-east-1_STAGING_POOL',
    clientId: 'STAGING_CLIENT_ID',
  },
  production: {
    apiUrl: 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod',
    userPoolId: 'us-east-1_b36NPuJf3',
    clientId: '4lhsbeeae63ne3vgosog38lieu',
  },
};

const defaults = envDefaults[environment as keyof typeof envDefaults] || envDefaults.production;

export const config = {
  // Current environment
  environment,
  
  // API Gateway endpoint
  apiUrl: import.meta.env.VITE_API_URL || defaults.apiUrl,
  
  // Cognito
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || defaults.userPoolId,
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || defaults.clientId,
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
  },
  
  // Feature flags
  features: {
    ai: import.meta.env.VITE_ENABLE_AI === 'true',
    community: import.meta.env.VITE_ENABLE_COMMUNITY === 'true',
    news: import.meta.env.VITE_ENABLE_NEWS === 'true',
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
  
  // API helper
  api: {
    baseUrl: import.meta.env.VITE_API_URL || defaults.apiUrl,
    syncEndpoint: import.meta.env.VITE_SYNC_WS_URL || undefined,
  },
  
  // Helper to check environment
  isDevelopment: () => environment === 'development',
  isStaging: () => environment === 'staging',
  isProduction: () => environment === 'production',
};

export default config;
