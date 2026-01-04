// FinPulse API Configuration
// Auto-generated from Terraform deployment

export const config = {
  // API Gateway endpoint
  apiUrl: import.meta.env.VITE_API_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod',
  
  // Cognito
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-1_b36NPuJf3',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '4lhsbeeae63ne3vgosog38lieu',
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
  }
};

export default config;
