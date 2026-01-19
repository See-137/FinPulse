# FinPulse Architecture Decision Records

> Short ADR-style decisions with rationale.
> Last updated: 2026-01-19

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
