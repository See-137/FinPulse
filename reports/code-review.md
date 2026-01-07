# FinPulse Code Review Findings & Patch Plan

## Scope
Focused on client security, authentication, realtime sync, and data loading resiliency.

## Findings & Patches Applied

### 1) Client-side exposure of Gemini API key
**Finding:** The build injected the Gemini key into the client bundle, which makes it retrievable by end users.

**Patch:** Added `VITE_ALLOW_CLIENT_AI_KEY` gate and disabled client key injection by default; `geminiService` only reads keys in development or when explicitly allowed. This reduces accidental key exposure in production.

**Files:**
- `vite.config.ts`
- `services/geminiService.ts`

### 2) Token storage defaults to localStorage in production
**Finding:** The auth service defaulted to `localStorage`, which increases XSS exposure in production.

**Patch:** Default token storage now uses secure cookies in production unless overridden by `VITE_TOKEN_STORAGE_MODE`. The session restoration path skips localStorage in cookie mode to avoid false logouts.

**Files:**
- `services/authService.ts`

### 3) Sync service uses an access token key that is never set
**Finding:** Sync was reading `finpulse_access_token`, but auth only stores `finpulse_id_token`, causing sync authorization headers to be empty.

**Patch:** Added a token helper that reads `finpulse_id_token` first and falls back to `finpulse_access_token` for backward compatibility. This token is now used for sync fetch calls and reconnect logic.

**Files:**
- `services/syncService.ts`

### 4) Partial failures in market data fetch were hidden
**Finding:** `Promise.allSettled` never threw, so API rejections were silently ignored and `error` was not updated.

**Patch:** Added rejection detection to surface a partial-error message while still displaying available data.

**Files:**
- `hooks/useMarketData.ts`

## Follow-Up Recommendations
- Add a backend session endpoint for cookie-mode session restoration (e.g., `/auth/session`) to rehydrate user state on refresh.
- Replace WebSocket query-string auth with a safer mechanism (subprotocol token or signed short-lived token).
- Replace the placeholder Gemini tests with meaningful mocks and assertions.

## Summary
These changes reduce the risk of API key exposure, improve production auth defaults, unblock realtime sync authorization, and surface partial data failures to users without hard-failing the UI.
