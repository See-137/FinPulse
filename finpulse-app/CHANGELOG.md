# Changelog

All notable changes to the FinPulse project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Input validation for Lambda functions (planned)
- API Gateway rate limiting (planned)
- Sentry error tracking integration (planned)

---

## [2.1.0] - 2026-01-11

### 🔒 Security

#### Fixed
- **CRITICAL**: Fixed XSS vulnerability in MarkdownRenderer component
  - Replaced custom regex-based parser with `marked` + `DOMPurify`
  - Added whitelist for allowed HTML tags and attributes
  - Implemented URI validation to prevent javascript: URLs
  - Added `useMemo` for performance optimization
  - File: `FinPulse/components/MarkdownRenderer.tsx`

- **CRITICAL**: Removed admin authentication bypass vulnerability
  - Deleted insecure `x-admin-key` header authentication
  - Admin access now requires AWS Cognito group membership only
  - Added comprehensive audit logging for all admin operations
  - Logs unauthorized access attempts with IP and user ID
  - File: `finpulse-infrastructure/lambda-code/admin/index.js`

- **MEDIUM**: Restricted CORS configuration across all Lambda functions
  - Changed from `'Access-Control-Allow-Origin': '*'` to `'https://finpulse.me'`
  - Added `Access-Control-Allow-Credentials: true` for secure cookies
  - Applied to: admin, portfolio, community, market-data, ai, fx Lambda functions
  - Uses `ALLOWED_ORIGIN` environment variable for flexibility

#### Security Audit
- **Audited git history for exposed credentials**
  - Found exposed credentials in commit `19fd3f247a885dd7e65333c5d3b6128e4fdcc7bd`
  - Confirmed `.env` files are properly gitignored
  - ⚠️ **ACTION REQUIRED**: Rotate Cognito and Gemini API credentials

### Added
- **ErrorBoundary Component** for improved application stability
  - Catches JavaScript errors in component tree
  - Displays user-friendly error UI instead of blank screen
  - Provides "Try Again" and "Go Home" recovery options
  - Shows error details in development mode only
  - Includes placeholder for Sentry integration
  - File: `FinPulse/components/ErrorBoundary.tsx`

- **Documentation**
  - `CONTRIBUTING.md` - Comprehensive contribution guidelines
  - `DEVELOPMENT.md` - Development setup and workflow guide
  - `CHANGELOG.md` - This file
  - `SECURITY_FIXES_REPORT.md` - Detailed security audit report

### Dependencies
- Added `marked@17.0.1` - Secure markdown parsing
- Added `dompurify@3.3.1` - HTML sanitization library
- Added `@types/dompurify@3.0.5` - TypeScript type definitions

### Infrastructure
- Updated 6 Lambda functions with security fixes
- Improved CORS configuration for production security
- Enhanced admin access logging and audit trail

---

## [2.0.0] - 2026-01-04

### Added
- CI/CD pipeline with GitHub Actions
- Automated testing infrastructure
  - Unit tests with Vitest
  - E2E tests with Playwright
  - Test coverage reporting
- Redis integration for caching
- Multi-environment support (development, staging, production)

### Changed
- Migrated to React 19
- Updated to Vite 6
- Improved build performance

### Fixed
- OAuth redirect issues
- Token refresh logic
- Error logging improvements

---

## [1.0.0] - 2026-01-02

### Added
- **Frontend Application**
  - React 18 with TypeScript
  - Portfolio tracking (crypto, stocks, commodities)
  - Real-time market data integration
  - AI-powered insights with Google Gemini
  - Multi-device synchronization
  - Community features
  - Premium subscription tiers

- **Backend Infrastructure**
  - 7 AWS Lambda functions
  - DynamoDB database (7 tables)
  - AWS Cognito authentication
  - API Gateway REST API
  - CloudFront CDN
  - ElastiCache Redis

- **Infrastructure as Code**
  - Terraform configuration for all AWS resources
  - Modular Terraform design
  - Separate staging and production environments

### Features
- User authentication (email/password, OAuth)
- Portfolio CRUD operations
- Real-time price updates
- AI assistant for financial insights
- Social features (posts, comments, likes)
- Admin portal
- Multi-currency support (USD, ILS)
- Dark/light theme toggle
- Responsive design

### Integrations
- CoinGecko API (cryptocurrency prices)
- Alpha Vantage API (stock market data)
- NewsAPI (financial news)
- ExchangeRate-API (FX rates)
- Google Gemini AI (AI assistant)
- Stripe (payment processing)

---

## Version History Summary

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 2.1.0 | 2026-01-11 | Security | Critical security fixes, ErrorBoundary, documentation |
| 2.0.0 | 2026-01-04 | Major | CI/CD, testing, Redis, React 19 upgrade |
| 1.0.0 | 2026-01-02 | Major | Initial production release |

---

## Security Vulnerability Log

| Date | Severity | Issue | Status |
|------|----------|-------|--------|
| 2026-01-11 | CRITICAL | XSS in MarkdownRenderer | ✅ FIXED |
| 2026-01-11 | CRITICAL | Admin auth bypass via header | ✅ FIXED |
| 2026-01-11 | CRITICAL | Exposed credentials in git | ⚠️ ROTATION REQUIRED |
| 2026-01-11 | MEDIUM | Overly permissive CORS | ✅ FIXED |
| 2026-01-11 | HIGH | No error boundaries | ✅ FIXED |

---

## Migration Guides

### Migrating to 2.1.0

**Required Actions:**

1. **Rotate Exposed Credentials** (CRITICAL)
   ```bash
   # Update in AWS Console and environment variables:
   - VITE_COGNITO_USER_POOL_ID (create new app client)
   - VITE_COGNITO_CLIENT_ID (new client ID)
   - VITE_GEMINI_API_KEY (generate new key, revoke old)
   ```

2. **Update Dependencies**
   ```bash
   cd FinPulse
   npm install
   ```

3. **Deploy Lambda Changes**
   ```bash
   cd finpulse-infrastructure
   terraform apply
   ```

4. **Wrap App with ErrorBoundary**
   ```typescript
   // App.tsx
   import { ErrorBoundary } from './components/ErrorBoundary';

   <ErrorBoundary>
     <YourApp />
   </ErrorBoundary>
   ```

**Breaking Changes:**
- Admin endpoints no longer accept `x-admin-key` header
- CORS now restricted to `https://finpulse.me` only
- May affect local development if not using proper origin

---

## Upcoming Features (Roadmap)

### v2.2.0 (Week 2)
- [ ] Input validation with Zod for all Lambda functions
- [ ] API Gateway rate limiting
- [ ] JWT signature verification in Lambda
- [ ] Silent error handling fixes
- [ ] Error context preservation

### v2.3.0 (Week 3-4)
- [ ] Increase test coverage to 50%+
- [ ] Extract shared utility functions
- [ ] Refactor mega-components (App.tsx, PortfolioView.tsx)
- [ ] TypeScript strict mode
- [ ] Prettier + ESLint strict rules
- [ ] Pre-commit hooks with Husky

### v3.0.0 (Month 2-3)
- [ ] Progressive Web App (PWA) support
- [ ] Two-factor authentication (2FA)
- [ ] Brokerage account import (Plaid)
- [ ] Enhanced AI analytics
- [ ] Portfolio rebalancing suggestions
- [ ] Mobile apps (React Native)

---

## Release Process

1. **Update Version**
   ```bash
   npm version [major|minor|patch]
   ```

2. **Update CHANGELOG.md**
   - Move items from [Unreleased] to new version
   - Add release date
   - Document breaking changes

3. **Create Git Tag**
   ```bash
   git tag -a v2.1.0 -m "Release v2.1.0 - Security fixes"
   git push origin v2.1.0
   ```

4. **Deploy to Production**
   ```bash
   # Frontend
   cd FinPulse
   npm run build
   # Deploy to S3/CloudFront

   # Backend
   cd finpulse-infrastructure
   terraform apply
   ```

5. **Create GitHub Release**
   - Draft release notes
   - Attach build artifacts
   - Publish release

---

## Contributors

- Oleg H (@See-137) - Project Lead
- Claude Sonnet 4.5 (@anthropic) - AI Development Assistant

---

## Links

- [GitHub Repository](https://github.com/See-137/FinPulse)
- [Production Site](https://finpulse.me)
- [Documentation](./DEVELOPMENT.md)
- [Security Policy](./SECURITY_FIXES_REPORT.md)

---

**Note**: This changelog is maintained manually. Please update it with every significant change, following the format above.
