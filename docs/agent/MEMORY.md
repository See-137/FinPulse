# FinPulse Agent Memory

> Stable project facts, commands, and invariants. Updated automatically.
> Last updated: 2026-01-27 (session 2)

---

## Project Structure

```
finpulse/
├── finpulse-app/     # React 19 + TypeScript + Vite 6 frontend
├── finpulse-infra/   # Terraform AWS infrastructure
│   ├── lambda-code/  # Lambda source (auth, api, etc.)
│   ├── lambda-deploy/ # Zipped Lambda packages
│   └── modules/      # Terraform modules
└── docs/agent/       # Agent memory (this directory)
```

## Standard Commands

### Frontend (finpulse-app/)
| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build (prod) | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| All tests | `npm run test:all` |

### Infrastructure (finpulse-infra/)
| Task | Command |
|------|---------|
| Format | `terraform fmt -recursive` |
| Validate | `terraform validate` |
| Init | `terraform init -upgrade` |
| Plan | `terraform plan -out=tfplan` |
| Show plan | `terraform show tfplan` |

### Lambda Deployment
```powershell
# 1. Zip lambda
Compress-Archive -Path lambda-code/auth/* -DestinationPath lambda-deploy/auth.zip -Force
# 2. Deploy
aws lambda update-function-code --function-name finpulse-auth-prod --zip-file fileb://lambda-deploy/auth.zip --region us-east-1
```

---

## Architectural Invariants

1. **Auth**: AWS Cognito (User Pool `us-east-1_B6uXjEIKh`). Use `idToken` not `accessToken` for API auth.
2. **SSO**: Google OAuth via Cognito IdP. Domain: `finpulse-auth-prod-v2.auth.us-east-1.amazoncognito.com`
3. **API**: API Gateway → Lambda. Bearer token required.
4. **State**: Zustand (frontend), DynamoDB (backend)
5. **Tiers**: FREE (10 assets), PROPULSE, SUPERPULSE
6. **Holding Type**: Includes `addedAt` timestamp for tracking time in portfolio. Used for Holding Age and Total Return metrics.
7. **Market Data**: REST polling (30s interval), no WebSockets. CoinGecko for crypto, Alpaca for stocks.

---

## Environment Details

| Env | URL | AWS Region |
|-----|-----|------------|
| Production | https://finpulse.me | us-east-1 |
| S3 Bucket | finpulse-frontend-prod-383349724213 | us-east-1 |
| CloudFront | E2Y4NTEFQ5LYOK | - |

---

## Key Files

| Purpose | Path |
|---------|------|
| Auth service | `finpulse-app/services/authService.ts` |
| Portfolio store | `finpulse-app/store/portfolioStore.ts` |
| Portfolio view | `finpulse-app/components/PortfolioView.tsx` |
| Premium analytics | `finpulse-app/components/PremiumAnalytics.tsx` |
| Auth Lambda | `finpulse-infra/lambda-code/auth/index.js` |
| Main Terraform | `finpulse-infra/main.tf` |
| MarketTicker | `finpulse-app/components/MarketTicker.tsx` |
| Market Lambda | `finpulse-infra/lambda-code/market-data/index.js` |
| WebSocket Service | `finpulse-app/services/websocketService.ts` |
| WS Prices Hook | `finpulse-app/hooks/useWebSocketPrices.ts` |
| Alpaca Service | `finpulse-infra/lambda-code/market-data/shared/alpaca-service.js` |
| CoinGecko Service | `finpulse-infra/lambda-code/market-data/shared/coingecko-service.js` |
| Cache Manager | `finpulse-infra/lambda-code/market-data/shared/cache-manager.js` |

---

## Current Version

**V3.0.0** (Released 2026-01-25)
- Whale Watch feature
- Total Return Tracking
- Enhanced Security (httpOnly cookies, Redis rate limiting)
- GDPR Compliance
- Browser push notifications

---

## CI/CD Pipeline

GitHub Actions workflows (must be in root `.github/workflows/`, NOT in subfolders):

| Workflow | File | Trigger |
|----------|------|---------|
| CI | `ci.yml` | Push/PR to main |
| Deploy | `deploy.yml` | Push to main |
| Lambda Deploy | `deploy-lambdas.yml` | Manual/changes to lambda-code/ |
| Terraform | `terraform.yml` | PR with infra changes |
| Security | `security.yml` | Push/PR + weekly |
| Release | `release.yml` | Push tag v*.*.* |
| Labeler | `labeler.yml` | PR opened |

**GitHub Environments**: `staging`, `production` (with manual approval)

**Branch Protection**: main branch protected, requires PR review

---

## ESLint Configuration

- Config file: `finpulse-app/eslint.config.js` (flat config format)
- Scripts folder is **ignored** (no linting for `scripts/`)
- Console warnings allowed for `log`, `warn`, `error`

---

## Testing Patterns

- Use **content-agnostic** test assertions when possible
- Avoid hardcoding version-specific text (e.g., "V2 is Live!")
- Use `it.skip()` for flaky tests that need investigation

---

## Market Data Architecture

**Data Flow:**

```text
MarketTicker.tsx → AWS Lambda /market/prices → CoinGecko (crypto) / Alpaca (stocks)
```

**Backend Crypto Routing** (alpaca-service.js):

- `COINGECKO_ONLY` set: DN, LAVA, ICP, QNT, XMR, BNB, TON, TRX, KAS, etc.
- These symbols go directly to CoinGecko in parallel with Alpaca
- Prevents serial Alpaca→CoinGecko fallback delay

**Frontend Price Sources** (PortfolioView.tsx priority):

1. WebSocket prices (Binance - real-time for BTC, ETH, etc.)
2. CoinGecko prices (non-Binance cryptos)
3. REST API prices (fallback)
4. Stored holding price (last known)

**Polling:** Unified 30-second REST polling for all assets (no WebSockets)

**WebSocket Throttling:**

- Binance WebSocket sends ticks continuously (multiple per second)
- `websocketService.ts` throttles subscriber updates to every 2 seconds
- Prevents portfolio value flickering from rapid updates

**CoinGecko ID Mappings** (non-standard symbols in Lambda `coingecko-service.js`):

| Symbol | CoinGecko ID |
|--------|--------------|
| DN     | deepnode     |
| LAVA   | lava-network |

**Why no WebSocket:**

- Binance WebSocket only supports Binance-listed coins
- CoinGecko supports 15,000+ coins including altcoins (DN, LAVA, etc.)
- Simpler architecture with synchronized updates for all assets

---

## Infrastructure Updates (2026-01-27)

| Change | Description |
|--------|-------------|
| Lambda Consolidation | FX Lambda merged into market-data Lambda, staging env removed |
| Redis Replication | Migrated to replication group with encryption at rest/transit |
| FX Proxy Routes | Added `/fx/convert` and `/fx/currencies` to Terraform API Gateway |
| Alpaca Fix | Handle missing `latestTrade` in stock quotes gracefully |
| Data Freshness | Added indicators showing data source and last update time |
| Binance 451 | Lambda returns empty data gracefully when geo-blocked |
| Parallel Cache | `getBatchQuotes()` now uses `Promise.all()` instead of sequential loop |
| Parallel Crypto | Alpaca + CoinGecko fetched in parallel for faster DN/LAVA loading |
| WS Throttle | WebSocket updates throttled to 2s intervals to prevent UI flickering |
| Price Preservation | WebSocket fallback won't overwrite valid prices with zeros |

**Note:** Phase 4 infra changes were reverted due to AWS limitations.

---

## Definition of Done

- [ ] Build passes (`npm run build`)
- [ ] Lint clean (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Tests pass (when applicable)
- [ ] Git commit with descriptive message
- [ ] Push to remote
- [ ] Infra changes: plan reviewed, apply only on explicit request
