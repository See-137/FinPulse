# FinPulse Architecture Decision Records

> Short ADR-style decisions with rationale.
> Last updated: 2026-01-27

---

## ADR-001: Use idToken for API Authentication
**Date:** 2026-01-04
**Status:** Accepted

**Context:** Cognito issues both accessToken and idToken. Need to choose which to use for API Gateway authorization.

**Decision:** Use `idToken` for all API calls.

**Rationale:** 
- accessToken lacks email claim needed for user identification
- idToken contains user attributes (email, name)
- API Gateway Cognito authorizer works with idToken

**Consequences:**
- Frontend must extract and send idToken from auth response
- Token refresh must handle idToken specifically

---

## ADR-002: Google SSO via Cognito Identity Provider
**Date:** 2026-01-18
**Status:** Accepted

**Context:** Need to support Google Sign-In without managing OAuth flow directly.

**Decision:** Configure Google as a Cognito Identity Provider.

**Rationale:**
- Cognito handles OAuth exchange via `/oauth2/idpresponse`
- No need to manage Google tokens in our code
- Unified user pool for email/password and SSO users

**Consequences:**
- Google Cloud Console must have Cognito callback URI
- Account collision prevention needed for existing email/password users
- Added `getUserByEmail()` to Lambda to detect duplicates

---

## ADR-003: Signup-First Landing Page with Preference Memory
**Date:** 2026-01-18
**Status:** Accepted

**Context:** Landing page needed to optimize for new user acquisition while not annoying returning users.

**Decision:** 
- Default to signup mode for new visitors
- Save mode preference to localStorage when user manually toggles
- Returning users auto-land on their preferred mode

**Rationale:**
- New users are growth priority
- Returning users get convenience via localStorage
- OAuth error redirects don't overwrite preference

**Consequences:**
- localStorage key: `finpulse-auth-mode-preference`
- Graceful fallback if localStorage unavailable

---

## ADR-004: Lambda Versioning for Rollback
**Date:** 2026-01-19
**Status:** Proposed

**Context:** Need ability to quickly rollback Lambda changes.

**Decision:** Publish Lambda version before each deploy.

**Rationale:**
- Enables instant rollback via alias update
- No need to re-deploy old code
- Audit trail of deployments

**Consequences:**
- Add version publish to deploy workflow
- Consider Lambda alias for prod traffic

---

## ADR-005: Use Existing addedAt for Holding Age Tracking
**Date:** 2026-01-19
**Status:** Accepted

**Context:** Users requested Total Return metrics including holding age. Two options: use existing `addedAt` timestamp or add new `purchaseDate` field.

**Decision:** Use existing `addedAt` timestamp from DynamoDB for holding age calculation (V1).

**Rationale:**
- Zero migration required - backend already returns `addedAt` ISO timestamp
- Immediate delivery with no backend/infrastructure changes
- "Time in FinPulse" is acceptable proxy for "actual holding age" for most users
- Can add optional `purchaseDate` override in Phase 2 if demanded

**Consequences:**
- Holding Age shows days since added to portfolio app, not actual purchase date
- For assets purchased before using FinPulse, age will be underestimated
- Frontend must preserve `addedAt` in data flow (types.ts, portfolioStore.ts, portfolioService.ts)
- Missing `addedAt` displays "N/A" gracefully

**Related Commit:** 23193b1

---

## ADR-006: Comprehensive CI/CD Pipeline with GitHub Actions

**Date:** 2026-01-25
**Status:** Accepted

**Context:** Needed professional CI/CD pipeline with proper gates, security scanning, and deployment automation.

**Decision:** Implement 7 GitHub Actions workflows in root `.github/workflows/`:
- `ci.yml` - lint, typecheck, test, build
- `deploy.yml` - S3/CloudFront deployment with staging+production environments
- `deploy-lambdas.yml` - Lambda deployment
- `terraform.yml` - infra changes with plan-on-PR, apply-with-approval
- `security.yml` - CodeQL, npm audit, tfsec, gitleaks
- `release.yml` - automated GitHub releases on tag push
- `labeler.yml` - PR auto-labeling

**Rationale:**
- Previous deploy.yml had `continue-on-error: true` allowing broken code to deploy
- Workflows in subfolders (finpulse-infra/.github/) don't trigger
- Need security scanning for supply chain protection
- Need environment gates for production safety

**Consequences:**
- All workflows must be in root `.github/workflows/`
- Production deploys require manual approval in GitHub environment
- Dependabot enabled for dependency updates
- Branch protection enforced on main

---

## ADR-007: V3 Release Strategy

**Date:** 2026-01-25
**Status:** Accepted

**Context:** Major version release with Whale Watch, Total Return Tracking, and security enhancements.

**Decision:** Use multi-channel in-app notification system:
- `changelogs.json` - drives ChangelogModal (shows once)
- `banners.json` - drives TopBanner (dismissible, 7-day duration)
- `NotificationBell` - persistent notification center
- Email template ready for external announcement

**Rationale:**
- Users who miss modal will see banner
- NotificationBell provides persistent access
- Coordination service prevents notification fatigue

**Consequences:**
- Version-specific test assertions should be avoided (use content-agnostic patterns)
- NotificationCoordinator manages channel priority: modal > banner > bell

---

## ADR-008: Unified REST Polling for Market Data (Remove Binance WebSocket)

**Date:** 2026-01-27
**Status:** Accepted

**Context:** MarketTicker was using Binance WebSocket for real-time crypto prices, but portfolio contained coins not listed on Binance (DN/DeepNode, LAVA/Lava Network).

**Decision:** Remove Binance WebSocket dependency and use unified 30-second REST polling for all assets via AWS Lambda `/market/prices` endpoint.

**Rationale:**

- Binance WebSocket only supports Binance-listed coins (~500)
- CoinGecko API supports 15,000+ coins including all portfolio altcoins
- Simpler architecture with synchronized updates for crypto and stocks
- No more desync between different asset types

**Data Flow:**

- Crypto: MarketTicker.tsx -> `/market/prices?type=crypto` -> Lambda -> CoinGecko API
- Stocks: MarketTicker.tsx -> `/market/prices?type=stock` -> Lambda -> Alpaca API

**Files Modified:**

- `finpulse-app/components/MarketTicker.tsx` - Unified polling, removed WebSocket
- `finpulse-app/hooks/useWebSocketPrices.ts` - Fixed fallback to pass symbols
- `finpulse-infra/lambda-code/market-data/index.js` - Graceful 451 handling
- `finpulse-app/services/dataProviders/binanceAPI.ts` - Silent error handling

**Consequences:**

- UI shows "Updated Xs ago" instead of "Live/Delayed" indicator
- All assets update together every 30 seconds
- Lambda requires `COINGECKO_ID_MAP` for non-standard symbol mappings (DN->deepnode, LAVA->lava-network)
- Slightly higher latency (30s vs real-time) but acceptable for portfolio tracking use case

---

## ADR-009: Lambda Layer for Shared Code

**Date:** 2026-01-27
**Status:** Accepted

**Context:** 9 Lambda functions duplicate `validation.js`, `redis-cache.js`, `cache-manager.js` (~10,000 lines duplicated). JWT verification only decoded tokens without verifying signatures. Rate limiting was per-instance (not distributed).

**Decision:** Create a Lambda Layer at `finpulse-infra/lambda-layers/shared-utils/nodejs/` containing all shared modules:
- `jwt-verifier.js` - Secure JWT verification with `aws-jwt-verify`
- `rate-limiter.js` - Redis-based distributed rate limiting
- `request-context.js` - Request ID correlation and structured logging
- `env-validator.js` - Environment variable validation at cold start
- `validation.js`, `redis-cache.js`, `cache-manager.js` - Existing shared code

**Rationale:**
- Eliminates code duplication across all Lambdas
- Enables secure JWT signature verification (P0 security fix)
- Provides distributed rate limiting across all Lambda instances
- Standardizes logging with request ID correlation
- Reduces deployment package sizes

**Consequences:**
- All Lambdas import from `/opt/nodejs/...` with fallback to local for dev
- Terraform manages layer version and attachment
- Layer must be deployed before Lambdas that depend on new modules
- Package layer with: `.\scripts\package-lambda-layer.ps1`

---

## ADR-010: Frontend Auth Refactoring

**Date:** 2026-01-27
**Status:** Accepted

**Context:** App.tsx had 856 lines with 23 useState hooks. Auth logic mixed with UI code. Race condition in `portfolioStore.setCurrentUser()` not awaiting backend load.

**Decision:**
1. Create `AuthContext.tsx` for centralized auth state management
2. Make `setCurrentUser()` async and await `loadFromBackend()`
3. Add retry logic with exponential backoff to portfolio loads
4. Create `GlobalErrorHandler.tsx` for unhandled promise rejections

**Rationale:**
- Separation of concerns improves maintainability
- Async `setCurrentUser()` prevents race conditions
- Retry logic improves resilience to transient network failures
- Global error handler catches async errors that ErrorBoundary misses

**Consequences:**
- Components can use `useAuth()` hook instead of prop drilling
- `setCurrentUser()` callers must now await the result
- Portfolio loads retry up to 3 times with 1s, 2s, 4s delays
- Unhandled promise rejections are logged and recoverable errors don't crash UI

---

## ADR-011: Production Readiness Hardening

**Date:** 2026-02-11
**Status:** Accepted

**Context:** Comprehensive production readiness audit revealed 18+ issues across frontend, backend, and infrastructure. Critical security gaps, missing error boundaries, stale data, and input validation holes.

**Decision:** Implement 14 fixes in a single session:

1. **ErrorBoundary wrappers** — 13 bare `<Suspense>` blocks wrapped with `<ErrorBoundary>`
2. **GlobalErrorHandler mounted** — catches unhandled promise rejections in App root
3. **AuthContext wired** — replaced ~200 lines of inline auth code with `useAuth()` hook
4. **Live FX rates** — Frankfurter API with multi-tier cache (Memory → Redis → API → Static fallback)
5. **Input validation** — Zod schemas on 5 auth/portfolio endpoints
6. **Webhook idempotency** — DynamoDB-based dedup for LemonSqueezy webhooks
7. **CORS parameterization** — `allowed_origin` Terraform variable replaces 7 hardcoded instances
8. **JWT fail-closed** — `verifyJwtSecure()` returns null (not decode-only) when verifier unavailable
9. **Webhook signature hardened** — rejects when secret missing, guards against length-mismatch and null signature
10. **x-user-id bypass gated** — only works in non-prod environments
11. **Self-upgrade blocked** — `plan` and `credits` removed from profile update allowed fields
12. **Schema strictness** — `SettingsUpdateSchema` changed from `.passthrough()` to `.strict()`
13. **subscriptionStatus default** — changed from `'none'` to `'active'` to preserve free-tier behavior
14. **Multi-tab sync key fix** — corrected storage key from `'finpulse-portfolio-storage'` to `'finpulse-portfolio-v2'`

**Rationale:**
- Security: 3 critical auth bypass vectors closed (x-user-id, JWT fallback, self-upgrade)
- Reliability: ErrorBoundary + GlobalErrorHandler prevent blank-screen crashes
- Data quality: Live FX rates replace month-old static values
- Idempotency: Prevents double-processing of payment webhooks
- Maintainability: AuthContext extracts 200+ lines from App.tsx

**Consequences:**
- All existing tests continue to pass (117/117)
- Terraform validates cleanly
- Backend changes are additive (existing valid requests unaffected)
- Invalid requests now return 400 instead of writing unvalidated data
- `allowed_origin` variable needs Terraform apply to take effect in AWS

**Deferred:**
- Payments endpoints still lack JWT auth (H1 from security audit)
- Federated sign-in doesn't verify OAuth tokens server-side (H4)
- Hardcoded tester emails still in source (H2)
- Error message leakage in some catch blocks (H5)
- `tokenStorage.ts` not yet wired into AuthContext
- Portfolio PUT should use partial schema for updates

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]
**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:** [What is the issue?]

**Decision:** [What was decided?]

**Rationale:** [Why this decision?]

**Consequences:** [What are the implications?]
```
