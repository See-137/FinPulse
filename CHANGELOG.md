# Changelog

All notable changes to FinPulse Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-07

### Added
- **Backend Portfolio Sync** - Holdings now persist to DynamoDB, survives localStorage clear
- **Dynamic Market Prices** - Fetches prices only for user's actual holdings (not hardcoded list)
- **Portfolio Service** - New `portfolioService.ts` for backend API integration

### Fixed
- **PLTR/MSTR/BMNR** - Now correctly classified as stocks (were misrouted to crypto API)
- **LAVA Crypto** - Added mapping to CoinGecko's lava-network
- **Negative Value Sorting** - Portfolio 24h change column now sorts correctly with negative values
- **Alpha Vantage Rate Limit** - Added 1.1s delay between API calls to prevent throttling

### Changed
- `useMarketData` hook now accepts dynamic `symbols` parameter
- `portfolioStore` methods are now async with backend sync
- Watchlist component fetches real-time prices for watchlist items

---

## [1.0.0] - 2026-01-03

### Added
- **Portfolio Tracking** - Real-time asset tracking with multi-currency support (USD/ILS)
- **AI Copilot** - Gemini 2.0 Flash powered market intelligence
- **Live News Feed** - Holdings-based filtering with keyword matching
- **Authentication** - Cognito-based signup, signin, email verification, password reset
- **Landing Page** - Interactive feature showcase with auto-rotation
- **Settings Modal** - Theme switching (light/dark/system), currency selection, logout
- **Market Ticker** - Live crypto prices from CoinGecko API
- **Zustand Store** - Global state management for holdings and preferences

### Technical
- React 18 + TypeScript + Vite build system
- TailwindCSS styling with glass morphism design
- AWS API Gateway integration
- CloudFront CDN deployment at https://finpulse.me

### Security
- Cognito JWT authentication
- HTTPS enforced via CloudFront
- No sensitive data in localStorage (tokens only)

---

## [Unreleased]

### Planned
- Stripe payment integration for premium tiers
- Push notifications for price alerts
- Mobile app (React Native)
- Advanced charting with TradingView
- Portfolio performance analytics

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 2.0.0 | 2026-01-07 | Backend sync, dynamic prices, sorting fix |
| 1.0.0 | 2026-01-03 | Initial production release |
