// FinPulse Cognito Authentication Service
// Handles user signup, login, and token management
// Supports both localStorage (legacy) and httpOnly cookie token storage

import { config } from '../config';
import { api } from './apiService';
import { authLogger } from './logger';

// Token storage mode - set to 'cookie' for production security
const TOKEN_STORAGE_MODE: 'localStorage' | 'cookie' = 
  (import.meta.env.VITE_TOKEN_STORAGE_MODE as 'localStorage' | 'cookie') || 'cookie';

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface CognitoUser {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

interface AuthResult {
  success: boolean;
  user?: CognitoUser;
  tokens?: AuthTokens;
  error?: string;
  needsConfirmation?: boolean;
  requiresLinking?: boolean;
  existingUserId?: string;
  linkingToken?: string;
}

interface LinkedIdentity {
  provider: string;
  providerSubject: string;
  email: string;
  linkedAt: string;
}

interface OAuthCallbackResult {
  success: boolean;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

/**
 * INTERNAL TEST USER CONFIGURATION
 * Moved to environment variables for security
 * Backend Lambda will handle tester account detection via Cognito groups
 */
const INTERNAL_TESTER_EMAIL = import.meta.env.VITE_INTERNAL_TESTER_EMAIL || '';

// Internal tester config for paywall bypass (email from env var)
const INTERNAL_TESTER_CONFIG = {
  email: INTERNAL_TESTER_EMAIL,
  role: 'internal_tester' as const,
};

// Auth state change callback type
type AuthStateCallback = (user: CognitoUser | null) => void;

class AuthService {
  private cognitoUrl: string;
  private clientId: string;
  private currentUser: CognitoUser | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private useSecureCookies: boolean;
  private authStateCallbacks: Set<AuthStateCallback> = new Set();
  private isRestoringSession: boolean = false;
  private sessionRestorePromise: Promise<CognitoUser | null> | null = null;

  constructor() {
    this.cognitoUrl = `https://cognito-idp.${config.cognito.region}.amazonaws.com`;
    this.clientId = config.cognito.clientId;
    this.useSecureCookies = TOKEN_STORAGE_MODE === 'cookie';
    // Don't restore session in constructor - let App.tsx call it explicitly
    // to avoid race conditions
  }

  // ============== Public Methods ==============

  /**
   * Subscribe to auth state changes
   * Returns unsubscribe function
   */
  onAuthStateChange(callback: AuthStateCallback): () => void {
    this.authStateCallbacks.add(callback);
    return () => this.authStateCallbacks.delete(callback);
  }

  /**
   * Notify all subscribers of auth state change
   */
  private notifyAuthStateChange(user: CognitoUser | null): void {
    this.authStateCallbacks.forEach(cb => cb(user));
  }

  /**
   * Initialize auth service and restore session if available
   * Returns a promise that resolves when session restoration is complete
   */
  async initializeAuth(): Promise<CognitoUser | null> {
    if (this.sessionRestorePromise) {
      return this.sessionRestorePromise;
    }
    this.sessionRestorePromise = this.restoreSessionAsync();
    return this.sessionRestorePromise;
  }

  /**
   * Check if session restoration is in progress
   */
  isInitializing(): boolean {
    return this.isRestoringSession;
  }

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Sign up failed' };
      }

      return {
        success: true,
        needsConfirmation: !data.UserConfirmed,
      };
    } catch (error) {
      return { success: false, error: 'Network error during sign up' };
    }
  }

  async confirmSignUp(email: string, code: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: email,
          ConfirmationCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Confirmation failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during confirmation' };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          AuthFlow: 'USER_PASSWORD_AUTH',
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.__type?.includes('UserNotConfirmedException')) {
          return { success: false, error: 'Please confirm your email first', needsConfirmation: true };
        }
        return { success: false, error: data.message || 'Sign in failed' };
      }

      const tokens: AuthTokens = {
        accessToken: data.AuthenticationResult.AccessToken,
        idToken: data.AuthenticationResult.IdToken,
        refreshToken: data.AuthenticationResult.RefreshToken,
        expiresIn: data.AuthenticationResult.ExpiresIn,
      };

      // Parse user from ID token
      const user = this.parseIdToken(tokens.idToken);
      
      // Store session
      this.storeSession(tokens, user);
      
      // Set ID token for API calls (NOT accessToken - idToken has email claim)
      api.setIdToken(tokens.idToken);

      // Schedule token refresh
      this.scheduleRefresh(tokens.expiresIn, tokens.refreshToken);

      return { success: true, user, tokens };
    } catch (error) {
      return { success: false, error: 'Network error during sign in' };
    }
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    
    // Clear secure cookies if enabled
    if (this.useSecureCookies) {
      await this.clearSecureTokens();
    }
    
    // Always clear localStorage
    localStorage.removeItem('finpulse_auth_tokens');
    localStorage.removeItem('finpulse_user');
    localStorage.removeItem('finpulse_id_token');
    api.setAccessToken(null);
    api.setIdToken(null);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // Reset session restore state
    this.sessionRestorePromise = null;
    
    // Notify subscribers of logout
    this.notifyAuthStateChange(null);
  }

  async forgotPassword(email: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to send reset code' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Password reset failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async resendConfirmationCode(email: string): Promise<AuthResult> {
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to resend code' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // ============== OAuth / Social Sign-In Methods ==============

  /**
   * Initiate Google Sign-In via Cognito Hosted UI
   * Redirects user to Google login page
   */
  initiateGoogleSignIn(): void {
    const { oauth, domain, clientId } = config.cognito;

    if (!domain) {
      authLogger.error('Cognito domain not configured for OAuth');
      return;
    }

    // Generate state for CSRF protection with timestamp
    const state = this.generateOAuthState();
    const stateData = {
      state,
      timestamp: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
    };
    sessionStorage.setItem('oauth_state', JSON.stringify(stateData));

    // Build authorization URL
    const authUrl = new URL(`https://${domain}/oauth2/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', oauth.redirectUri);
    authUrl.searchParams.set('scope', oauth.scopes.join(' '));
    authUrl.searchParams.set('identity_provider', 'Google');
    authUrl.searchParams.set('state', state);

    // Redirect to Google login
    window.location.href = authUrl.toString();
  }

  /**
   * Parse OAuth callback URL parameters
   */
  parseOAuthCallback(): OAuthCallbackResult {
    const params = new URLSearchParams(window.location.search);
    
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    authLogger.debug('[OAuth] parseOAuthCallback:', { 
      hasCode: !!code, 
      state: state?.substring(0, 10) + '...', 
      error, 
      errorDescription 
    });

    if (error) {
      authLogger.warn('[OAuth] Error in callback:', error);
      return { success: false, error, errorDescription: errorDescription || undefined };
    }

    if (!code) {
      authLogger.warn('[OAuth] No code received');
      return { success: false, error: 'no_code', errorDescription: 'No authorization code received' };
    }

    // Verify state matches with expiry check
    const storedStateJson = sessionStorage.getItem('oauth_state');
    if (!storedStateJson) {
      authLogger.error('[OAuth] No stored state found');
      return { success: false, error: 'no_state', errorDescription: 'OAuth state not found - possible replay attack' };
    }

    let storedStateData;
    try {
      storedStateData = JSON.parse(storedStateJson);
    } catch (e) {
      // Backwards compatibility: treat as plain string if not JSON
      storedStateData = { state: storedStateJson, expiresAt: Date.now() + 60000 };
    }

    authLogger.debug('[OAuth] State check:', {
      receivedState: state?.substring(0, 10) + '...',
      storedState: storedStateData.state?.substring(0, 10) + '...',
      matches: state === storedStateData.state,
      isExpired: Date.now() > storedStateData.expiresAt
    });

    // Check expiry (5 min max)
    if (Date.now() > storedStateData.expiresAt) {
      authLogger.error('[OAuth] State expired');
      sessionStorage.removeItem('oauth_state');
      return { success: false, error: 'state_expired', errorDescription: 'OAuth state expired - please try again' };
    }

    // Check state match
    if (state !== storedStateData.state) {
      authLogger.error('[OAuth] State mismatch!');
      sessionStorage.removeItem('oauth_state');
      return { success: false, error: 'state_mismatch', errorDescription: 'OAuth state mismatch - possible CSRF attack' };
    }

    // Clear state after successful verification
    sessionStorage.removeItem('oauth_state');
    authLogger.info('[OAuth] parseOAuthCallback success');
    return { success: true, code, state: state || undefined };
  }

  /**
   * Exchange OAuth authorization code for tokens
   */
  async exchangeOAuthCode(code: string): Promise<AuthResult> {
    const { oauth, domain, clientId } = config.cognito;

    try {
      // Exchange code for tokens via Cognito token endpoint
      const tokenUrl = `https://${domain}/oauth2/token`;
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          code,
          redirect_uri: oauth.redirectUri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { 
          success: false, 
          error: data.error_description || data.error || 'Token exchange failed' 
        };
      }

      const tokens: AuthTokens = {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };

      // Parse user from ID token
      const tokenPayload = this.parseIdToken(tokens.idToken);
      
      // Extract provider info from token
      const provider = this.extractProviderFromToken(tokens.idToken);
      
      // Call our backend to handle federated sign-in
      // This handles account linking and identity management
      const federatedResult = await this.handleFederatedSignIn(
        provider,
        tokenPayload,
        tokens
      );

      return federatedResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      authLogger.error('OAuth code exchange error:', error);
      authLogger.error('Token exchange details:', { domain, clientId, redirectUri: oauth.redirectUri, errorMessage });
      return { success: false, error: `Failed to exchange authorization code: ${errorMessage}` };
    }
  }

  /**
   * Handle federated sign-in with backend
   * Manages account linking and identity tracking
   */
  private async handleFederatedSignIn(
    provider: { name: string; subject: string },
    tokenPayload: CognitoUser,
    tokens: AuthTokens
  ): Promise<AuthResult> {
    authLogger.info('[OAuth] handleFederatedSignIn started', { provider: provider?.name, email: tokenPayload?.email });
    try {
      authLogger.debug('[OAuth] Calling API:', `${config.apiUrl}/auth/federated-signin`);
      const response = await fetch(`${config.apiUrl}/auth/federated-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.name,
          providerSubject: provider.subject,
          email: tokenPayload.email,
          name: tokenPayload.name,
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
        }),
      });

      authLogger.debug('[OAuth] API response status:', response.status);
      const data = await response.json();
      authLogger.debug('[OAuth] API response data:', data);

      // Account collision - needs password verification to link
      if (response.status === 409 && data.requiresLinking) {
        authLogger.info('[OAuth] Account requires linking');
        return {
          success: false,
          requiresLinking: true,
          existingUserId: data.existingUserId,
          linkingToken: data.linkingToken,
          error: data.message,
        };
      }

      if (!response.ok) {
        authLogger.warn('[OAuth] API response not OK');
        return { success: false, error: data.error || 'Federated sign-in failed' };
      }

      // Success - store session
      authLogger.info('[OAuth] API success, storing session');
      const user: CognitoUser = {
        userId: data.data.user.userId,
        email: tokenPayload.email,
        name: tokenPayload.name,
        emailVerified: true, // OAuth emails are verified
      };

      this.storeSession(tokens, user);
      api.setIdToken(tokens.idToken);
      this.scheduleRefresh(tokens.expiresIn, tokens.refreshToken);

      authLogger.info('[OAuth] Session stored, returning success');
      return { success: true, user, tokens };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      authLogger.error('[OAuth] Federated sign-in error:', error);
      authLogger.error('[OAuth] Error details:', { 
        apiUrl: config.apiUrl, 
        provider: provider?.name, 
        email: tokenPayload?.email,
        errorMessage 
      });
      return { success: false, error: `Failed to complete federated sign-in: ${errorMessage}` };
    }
  }

  /**
   * Link an OAuth provider to existing account (requires password verification)
   */
  async linkOAuthProvider(
    provider: string,
    providerSubject: string,
    password: string,
    linkingToken: string
  ): Promise<AuthResult> {
    const idToken = localStorage.getItem('finpulse_id_token');
    
    try {
      const response = await fetch(`${config.apiUrl}/auth/link-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          providerSubject,
          password,
          linkingToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to link account' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during account linking' };
    }
  }

  /**
   * Get all linked identities for current user
   */
  async getLinkedIdentities(): Promise<LinkedIdentity[]> {
    const idToken = localStorage.getItem('finpulse_id_token');

    if (!idToken) {
      authLogger.warn('[Auth] Cannot fetch identities - user not authenticated');
      return [];
    }

    try {
      const response = await fetch(`${config.apiUrl}/auth/identities`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        authLogger.error('[Auth] Failed to get linked identities:', {
          status: response.status,
          error: data.error
        });
        // Don't throw - allow UI to handle gracefully with empty array
        return [];
      }

      return data.data || [];
    } catch (error) {
      console.error('[Auth] Network error fetching linked identities:', error);
      // Don't throw - allow UI to handle gracefully with empty array
      return [];
    }
  }

  /**
   * Unlink an OAuth provider from account
   */
  async unlinkOAuthProvider(provider: string): Promise<AuthResult> {
    const idToken = localStorage.getItem('finpulse_id_token');
    
    try {
      const response = await fetch(`${config.apiUrl}/auth/identities/${provider}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to unlink account' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error during unlinking' };
    }
  }

  // ============== OAuth Helper Methods ==============

  private generateOAuthState(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private extractProviderFromToken(idToken: string): { name: string; subject: string } {
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      
      // Cognito adds identities claim for federated users
      if (payload.identities && payload.identities.length > 0) {
        const identity = payload.identities[0];
        return {
          name: identity.providerName || 'Google',
          subject: identity.userId || payload.sub,
        };
      }

      // Fallback - check issuer
      if (payload.iss?.includes('accounts.google.com')) {
        return { name: 'Google', subject: payload.sub };
      }

      return { name: 'cognito', subject: payload.sub };
    } catch {
      return { name: 'unknown', subject: '' };
    }
  }

  getCurrentUser(): CognitoUser | null {
    // Also verify token exists - if not, user is effectively logged out
    const idToken = localStorage.getItem('finpulse_id_token');
    if (!idToken) {
      this.currentUser = null;
      return null;
    }
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user should bypass paywall restrictions
   * Only internal_tester role bypasses all paywalls for testing
   * @param userEmail - Email to check against internal_tester config
   * @returns true if user is internal_tester and should bypass paywalls
   */
  shouldBypassPaywall(userEmail?: string): boolean {
    const email = userEmail || this.currentUser?.email;
    if (!email) return false;
    
    const isInternalTester = email === INTERNAL_TESTER_CONFIG.email;
    if (isInternalTester) {
      authLogger.debug(`Paywall bypass enabled for internal tester: ${email}`);
    }
    return isInternalTester;
  }

  /**
   * Get internal tester configuration (for testing purposes)
   * Only accessible within authService - not exported to components
   */
  getInternalTesterConfig() {
    return INTERNAL_TESTER_CONFIG;
  }

  // ============== Private Methods ==============

  private parseIdToken(idToken: string): CognitoUser {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      emailVerified: payload.email_verified,
    };
  }

  private storeSession(tokens: AuthTokens, user: CognitoUser): void {
    this.currentUser = user;
    
    // Always store session locally for session restoration
    // This is needed because restoreSessionAsync() checks localStorage
    this.storeSessionLocally(tokens, user);
    
    if (this.useSecureCookies) {
      // Also store tokens via httpOnly cookies (server-side) for enhanced security
      this.setSecureTokens(tokens).catch(err => {
        console.error('Failed to set secure cookies (local storage already set):', err);
      });
    }
  }

  private storeSessionLocally(tokens: AuthTokens, user: CognitoUser): void {
    localStorage.setItem('finpulse_auth_tokens', JSON.stringify(tokens));
    localStorage.setItem('finpulse_user', JSON.stringify(user));
    // Store ID token separately for API calls (required by API Gateway Cognito authorizer)
    localStorage.setItem('finpulse_id_token', tokens.idToken);
  }

  private async setSecureTokens(tokens: AuthTokens): Promise<void> {
    console.log('[Auth] Setting secure tokens via httpOnly cookies');
    const response = await fetch(`${config.apiUrl}/auth/set-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tokens })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('[Auth] Failed to set secure tokens:', {
        status: response.status,
        error: data.error || 'Unknown error'
      });
      throw new Error(`Failed to set secure tokens: ${data.error || response.statusText}`);
    }
    console.log('[Auth] Secure tokens set successfully');
  }

  private async clearSecureTokens(): Promise<void> {
    try {
      console.log('[Auth] Clearing secure tokens');
      const response = await fetch(`${config.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('[Auth] Clear secure tokens returned non-OK status:', response.status);
      } else {
        console.log('[Auth] Secure tokens cleared successfully');
      }
    } catch (err) {
      console.error('[Auth] Network error clearing secure tokens:', err);
      // Don't throw - allow logout to complete locally
    }
  }

  /**
   * Async session restoration with proper token refresh handling
   * Returns the restored user or null if no valid session
   */
  private async restoreSessionAsync(): Promise<CognitoUser | null> {
    if (this.isRestoringSession) {
      console.log('[Auth] Session restoration already in progress');
      return this.sessionRestorePromise;
    }
    
    this.isRestoringSession = true;
    
    try {
      const tokensJson = localStorage.getItem('finpulse_auth_tokens');
      const userJson = localStorage.getItem('finpulse_user');
      const idToken = localStorage.getItem('finpulse_id_token');

      // Require all three to be present for valid session
      if (!tokensJson || !userJson || !idToken) {
        console.log('[Auth] No valid session found in localStorage');
        this.isRestoringSession = false;
        return null;
      }

      const tokens: AuthTokens = JSON.parse(tokensJson);
      const user: CognitoUser = JSON.parse(userJson);

      console.log('[Auth] Found stored session for:', user.email);

      // Check if idToken is expired by decoding JWT
      const isExpired = this.isTokenExpired(tokens.idToken);
      console.log('[Auth] Token expired:', isExpired);
      
      if (isExpired) {
        console.log('[Auth] Stored token expired, attempting refresh...');
        try {
          // Await the token refresh - this is the key fix!
          await this.refreshTokens(tokens.refreshToken);
          console.log('[Auth] Token refresh successful during session restore');
          this.isRestoringSession = false;
          this.notifyAuthStateChange(this.currentUser);
          return this.currentUser;
        } catch (err) {
          console.error('[Auth] Token refresh failed during session restore:', err);
          console.log('[Auth] Clearing invalid session');
          await this.signOut();
          this.isRestoringSession = false;
          return null;
        }
      }

      console.log('[Auth] Restoring valid session for user:', user.email);
      this.currentUser = user;
      api.setIdToken(tokens.idToken); // Use idToken, not accessToken

      // Calculate remaining time from JWT exp claim instead of using original expiresIn
      const remainingSeconds = this.getTokenRemainingTime(tokens.idToken);
      if (remainingSeconds > 0) {
        console.log(`[Auth] Token valid for ${remainingSeconds} seconds, scheduling refresh`);
        this.scheduleRefresh(remainingSeconds, tokens.refreshToken);
      } else {
        // Token about to expire, refresh immediately
        console.log('[Auth] Token about to expire, refreshing immediately');
        try {
          await this.refreshTokens(tokens.refreshToken);
        } catch (err) {
          console.error('[Auth] Immediate token refresh failed:', err);
          await this.signOut();
          this.isRestoringSession = false;
          return null;
        }
      }
      
      this.isRestoringSession = false;
      this.notifyAuthStateChange(this.currentUser);
      return this.currentUser;
    } catch (error) {
      console.error('[Auth] Error restoring session:', error);
      console.log('[Auth] Clearing corrupted session data');
      await this.signOut();
      this.isRestoringSession = false;
      return null;
    }
  }

  // Get remaining time in seconds until token expires
  private getTokenRemainingTime(token: string): number {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryMs = payload.exp * 1000;
      const remainingMs = expiryMs - Date.now();
      return Math.max(0, Math.floor(remainingMs / 1000));
    } catch {
      return 0;
    }
  }

  // Check if JWT token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch {
      return true; // If we can't parse, assume expired
    }
  }

  private async refreshTokens(refreshToken: string): Promise<void> {
    console.log('[Auth] Attempting to refresh tokens...');
    try {
      const response = await fetch(this.cognitoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.AuthenticationResult) {
        console.log('[Auth] Token refresh successful');
        const tokens: AuthTokens = {
          accessToken: data.AuthenticationResult.AccessToken,
          idToken: data.AuthenticationResult.IdToken,
          refreshToken: refreshToken, // Refresh token stays the same
          expiresIn: data.AuthenticationResult.ExpiresIn,
        };

        const user = this.parseIdToken(tokens.idToken);
        this.storeSession(tokens, user);
        // Use idToken for API calls (NOT accessToken) - idToken has email claim needed by Cognito authorizer
        api.setIdToken(tokens.idToken);
        this.scheduleRefresh(tokens.expiresIn, refreshToken);
      } else {
        // Refresh failed - log details and throw error (caller will handle signOut)
        const errorInfo = {
          status: response.status,
          error: data.__type || data.message || 'Unknown error',
          code: data.code
        };
        console.warn('[Auth] Token refresh failed:', errorInfo);
        throw new Error(`Token refresh failed: ${errorInfo.error}`);
      }
    } catch (error) {
      console.error('[Auth] Token refresh error:', error);
      throw error; // Re-throw so caller can handle
    }
  }

  private scheduleRefresh(expiresIn: number, refreshToken: string): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Refresh 5 minutes before expiry
    const refreshIn = (expiresIn - 300) * 1000;
    
    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokens(refreshToken);
      }, refreshIn);
    }
  }
}

// Export singleton
export const auth = new AuthService();
export default auth;
export type { CognitoUser, AuthResult, AuthTokens, LinkedIdentity, OAuthCallbackResult };
