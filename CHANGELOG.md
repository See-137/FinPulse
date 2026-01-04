# Changelog

All notable changes to FinPulse Frontend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
| 1.0.0 | 2026-01-03 | Initial production release |
