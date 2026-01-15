# Changelog

All notable changes to FinPulse Infrastructure will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-07

### Added
- **LAVA Crypto Mapping** - Added lava-network to CoinGecko symbol mapping
- **Dynamic Stock Fetching** - Fetches any stock symbol not in cache from Alpha Vantage

### Fixed
- **Stock/Crypto Classification** - PLTR, MSTR, COIN, BMNR, NVDA correctly routed to Alpha Vantage
- **Alpha Vantage Rate Limit** - Added 1.1s delay between sequential API calls
- **Rate Limit Logging** - Improved logging for rate-limited responses

### Changed
- Expanded `knownCrypto` set with 60+ cryptocurrency symbols
- Stock price cache now updates incrementally with new symbols

---

## [1.0.0] - 2026-01-03

### Added

#### API Gateway
- REST API with Cognito JWT authorizer
- Rate limiting: 100 req/s default, 10 req/s for AI endpoint
- Usage plans: Free (1000/day) and Premium (50000/day) tiers
- CORS configured for finpulse.me

#### Lambda Functions
- `finpulse-auth-prod` - User registration and profile management
- `finpulse-portfolio-prod` - Portfolio CRUD operations
- `finpulse-market-prod` - CoinGecko price fetching
- `finpulse-news-prod` - GNews API integration
- `finpulse-fx-prod` - ExchangeRate-API currency conversion
- `finpulse-community-prod` - Social features and posts
- `finpulse-admin-prod` - Admin dashboard metrics
- `finpulse-ai-prod` - Gemini 2.0 Flash AI queries

#### Database
- DynamoDB tables: users, portfolios, community
- On-demand capacity mode
- GSI for efficient queries

#### Authentication
- Cognito User Pool with email verification
- Password policy: 8+ chars, mixed case, numbers
- Self-service password reset

#### Hosting
- S3 bucket for static frontend
- CloudFront distribution with custom domain
- ACM SSL certificate for finpulse.me
- HTTPS redirect enabled

#### Secrets Management
- AWS Secrets Manager for API keys
- Cached retrieval in Lambda functions

### Security
- IAM least-privilege roles
- VPC not required (serverless)
- CloudWatch logging enabled

---

## [Unreleased]

### Planned
- WAF integration for DDoS protection
- Lambda@Edge for geo-routing
- ElastiCache Redis for session caching
- CI/CD with GitHub Actions

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.0.0 | 2026-01-03 | Initial production infrastructure |
