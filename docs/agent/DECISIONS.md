# FinPulse Architecture Decision Records

> Short ADR-style decisions with rationale.
> Last updated: 2026-01-25

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
