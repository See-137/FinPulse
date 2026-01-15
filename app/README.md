# FinPulse - AI-Powered Financial Intelligence Platform

FinPulse is a modern web application that provides real-time portfolio tracking, market analysis, and AI-powered financial insights. Built with React, TypeScript, and AWS infrastructure, it combines advanced data processing with an intuitive user interface.

## Features

- **Real-Time Portfolio Management** - Track holdings across stocks, cryptocurrencies, and commodities with live price updates
- **Market Intelligence** - Real-time market data, forex rates, and technical analysis
- **AI-Powered Insights** - Gemini-powered financial analysis and recommendations
- **Community Features** - Share insights, follow influencers, and engage with other investors
- **Multi-Device Support** - Seamless authentication and data sync across devices
- **Advanced Analytics** - Premium portfolio analytics for SuperPulse users
- **News Integration** - Curated financial news with sentiment analysis
- **Secure Authentication** - OAuth 2.0 with Google, Cognito email/password auth, and httpOnly cookies

## Tech Stack

### Frontend
- **React** 19.2.3 - UI framework
- **TypeScript** 5.8.2 - Type-safe development
- **Vite** 6.2.0 - Lightning-fast build tool
- **Zustand** 5.0.9 - State management
- **Recharts** - Data visualization
- **DOMPurify** - XSS protection
- **Lucide React** - Icon library

### Backend & Infrastructure
- **AWS Lambda** - Serverless compute
- **AWS API Gateway** - REST API
- **AWS Cognito** - Authentication & authorization
- **AWS DynamoDB** - NoSQL database with PITR
- **AWS CloudFront** - CDN & caching
- **AWS SNS** - Alerting & notifications
- **Terraform** - Infrastructure as Code

### External Services
- **Alpaca API** - Stock & market data
- **CoinGecko API** - Cryptocurrency data
- **NewsAPI** - Financial news
- **Google Gemini API** - AI analysis
- **Redis** - Caching layer

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured (for infrastructure)
- Environment variables set (see [DEVELOPMENT.md](./DEVELOPMENT.md))

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/See-137/FinPulse.git
   cd FinPulse
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys and configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:5173 in your browser.

## Available Scripts

### Development
```bash
npm run dev           # Start development server with Vite
npm run build         # Build for production
npm run preview       # Preview production build locally
npm run type-check    # Run TypeScript compiler check
npm run lint          # Run ESLint
npm test              # Run Vitest unit tests
npm run test:e2e      # Run Playwright E2E tests
npm run test:coverage # Generate test coverage report
```

### Infrastructure
```bash
cd ../finpulse-infrastructure
terraform plan        # Preview infrastructure changes
terraform apply       # Apply infrastructure changes
```

## Environment Variables

Required environment variables in `.env.local`:

```bash
# Cognito Authentication
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_CLIENT_ID=your_cognito_client_id
VITE_COGNITO_DOMAIN=your_cognito_domain

# API Configuration
VITE_API_URL=https://api.finpulse.me
VITE_TOKEN_STORAGE_MODE=cookie              # or 'localStorage' for dev

# Feature Flags
VITE_ENABLE_DEBUG_PANEL=false
VITE_ENABLE_ADMIN_PORTAL=false

# Analytics (Optional)
VITE_SENTRY_DSN=                            # For error tracking in production
```

## Project Structure

```
FinPulse/
├── components/           # React components (views, modals, sidebars)
├── services/            # API clients (auth, portfolio, market data, sync)
├── store/               # Zustand state management
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── i18n/                # Internationalization strings
├── public/              # Static assets
├── e2e/                 # Playwright end-to-end tests
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── index.tsx            # Application entry point
```

## Key Services

### Authentication (`services/authService.ts`)
- Handles Cognito authentication (signup, signin, confirm)
- OAuth 2.0 integration with Google
- Token refresh and session management
- Secure token storage (httpOnly cookies or localStorage)

### Portfolio (`services/portfolioService.ts`)
- CRUD operations for holdings and watchlists
- Backend sync and conflict resolution
- Real-time price updates

### Market Data (`services/marketDataService.ts`)
- Stock prices via Alpaca API
- Cryptocurrency data via CoinGecko
- Forex rates and technical analysis

### Sync & Offline (`services/syncService.ts`)
- Offline-first architecture with queue
- Automatic backend sync
- Conflict resolution for concurrent edits

## State Management

The app uses **Zustand** for state management with separate stores:

- **authStore** - User authentication state
- **portfolioStore** - Holdings, watchlist, sync state (user-scoped)
- **appStore** - Global UI state, theme, preferences

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed architecture documentation.

## Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### E2E Tests
```bash
npm run test:e2e            # Run Playwright tests
npx playwright open         # Debug tests in UI
```

Test files follow the naming pattern `*.test.ts` or `*.spec.ts`.

## Security

- **XSS Protection:** DOMPurify sanitizes all user-generated content and markdown
- **CSRF Protection:** OAuth state parameter validation
- **Token Security:** HttpOnly cookies with secure flag in production
- **Input Validation:** Zod schema validation on Lambda functions
- **API Security:** Cognito authorizers on all protected endpoints
- **CORS:** Restricted to finpulse.me domain
- **Rate Limiting:** API Gateway throttling and usage plans

See [SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md) for latest security updates.

## Deployment

### Frontend
Automatically deployed via GitHub Actions to CloudFront CDN when pushing to main branch.

### Infrastructure
```bash
cd ../finpulse-infrastructure
terraform plan -out=tfplan
terraform apply tfplan
```

See [DEPLOYMENT_READINESS.md](../DEPLOYMENT_READINESS.md) for detailed deployment procedures.

## Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Comprehensive development guide
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
- **[WORK_LOG.md](./WORK_LOG.md)** - Project progress and updates
- **[SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md)** - Security improvements

Infrastructure documentation:
- **[finpulse-infrastructure/README.md](../finpulse-infrastructure/README.md)** - Infrastructure setup
- **[RATE_LIMITING_GUIDE.md](../finpulse-infrastructure/RATE_LIMITING_GUIDE.md)** - Rate limiting configuration

## Troubleshooting

### Common Issues

**"Cannot find module" errors in TypeScript**
- Run `npm install` to ensure all dependencies are installed
- Clear `.vite` cache: `rm -rf node_modules/.vite`

**Port 5173 already in use**
- Use a different port: `npm run dev -- --port 3000`

**Cognito authentication not working**
- Check `VITE_COGNITO_CLIENT_ID` and `VITE_COGNITO_DOMAIN` in `.env.local`
- Verify callback URL is whitelisted in Cognito settings

**WebSocket connection fails**
- Check browser console for connection errors
- Verify API URL in `.env.local`

See [DEVELOPMENT.md](./DEVELOPMENT.md#troubleshooting) for more troubleshooting tips.

## Performance

- **Code Splitting:** Lazy-loaded routes and heavy components
- **Caching:** Redis caching for market data and API responses
- **Optimization:** React.memo, useMemo, useCallback for performance
- **WebSocket:** Real-time price updates for responsive UX
- **Monitoring:** CloudWatch dashboards and performance alerts

## License

This project is proprietary. See LICENSE file for details.

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing documentation in [DEVELOPMENT.md](./DEVELOPMENT.md)
- Review [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

---

**Last Updated:** January 2026  
**Status:** Production Ready
