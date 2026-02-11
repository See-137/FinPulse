/**
 * FinPulse Token Storage Service
 *
 * Single source of truth for all token operations.
 * Abstracts localStorage vs httpOnly cookie storage modes.
 *
 * Benefits:
 * - Eliminates hybrid storage inconsistency
 * - Centralized token lifecycle management
 * - Consistent API across storage modes
 * - Better testability and debugging
 */

import { config } from '../config';

// Storage keys - single source of truth
export const TOKEN_KEYS = {
  ID_TOKEN: 'finpulse_id_token',
  AUTH_TOKENS: 'finpulse_auth_tokens',
  USER: 'finpulse_user',
  USER_SESSION: 'finpulse_user_session',
  DEV_USER: 'finpulse_dev_user',
  COGNITO_USER: 'finpulse_cognito_user',
} as const;

// Token storage mode from environment
type StorageMode = 'localStorage' | 'cookie';
const STORAGE_MODE: StorageMode =
  (import.meta.env.VITE_TOKEN_STORAGE_MODE as StorageMode) || 'cookie';

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface StoredUser {
  userId: string;
  email: string;
  name: string;
  emailVerified?: boolean;
}

/**
 * Token Storage Service
 * Provides unified interface for token operations
 */
class TokenStorageService {
  private storageMode: StorageMode;

  constructor() {
    this.storageMode = STORAGE_MODE;
  }

  /**
   * Get current storage mode
   */
  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  /**
   * Check if using secure cookie mode
   */
  isSecureCookieMode(): boolean {
    return this.storageMode === 'cookie';
  }

  // ============== ID Token Operations ==============

  /**
   * Get the current ID token
   */
  getIdToken(): string | null {
    return localStorage.getItem(TOKEN_KEYS.ID_TOKEN);
  }

  /**
   * Set the ID token
   */
  setIdToken(token: string | null): void {
    if (token) {
      localStorage.setItem(TOKEN_KEYS.ID_TOKEN, token);
    } else {
      localStorage.removeItem(TOKEN_KEYS.ID_TOKEN);
    }
  }

  /**
   * Check if ID token exists
   */
  hasIdToken(): boolean {
    return !!this.getIdToken();
  }

  /**
   * Check if token is expired by decoding JWT
   */
  isIdTokenExpired(): boolean {
    const token = this.getIdToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryMs = payload.exp * 1000;
      return Date.now() >= expiryMs;
    } catch {
      return true;
    }
  }

  /**
   * Get remaining time until token expires (in seconds)
   */
  getTokenRemainingTime(): number {
    const token = this.getIdToken();
    if (!token) return 0;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryMs = payload.exp * 1000;
      const remainingMs = expiryMs - Date.now();
      return Math.max(0, Math.floor(remainingMs / 1000));
    } catch {
      return 0;
    }
  }

  // ============== Full Auth Tokens Operations ==============

  /**
   * Get all stored auth tokens
   */
  getAuthTokens(): AuthTokens | null {
    const tokensJson = localStorage.getItem(TOKEN_KEYS.AUTH_TOKENS);
    if (!tokensJson) return null;

    try {
      return JSON.parse(tokensJson) as AuthTokens;
    } catch {
      return null;
    }
  }

  /**
   * Store all auth tokens
   */
  setAuthTokens(tokens: AuthTokens | null): void {
    if (tokens) {
      localStorage.setItem(TOKEN_KEYS.AUTH_TOKENS, JSON.stringify(tokens));
      // Also update the separate ID token for API calls
      this.setIdToken(tokens.idToken);
    } else {
      localStorage.removeItem(TOKEN_KEYS.AUTH_TOKENS);
      this.setIdToken(null);
    }
  }

  // ============== User Data Operations ==============

  /**
   * Get stored user data
   */
  getStoredUser(): StoredUser | null {
    const userJson = localStorage.getItem(TOKEN_KEYS.USER);
    if (!userJson) return null;

    try {
      return JSON.parse(userJson) as StoredUser;
    } catch {
      return null;
    }
  }

  /**
   * Store user data
   */
  setStoredUser(user: StoredUser | null): void {
    if (user) {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEYS.USER);
    }
  }

  /**
   * Get user session (extended user data)
   */
  getUserSession<T = unknown>(): T | null {
    const sessionJson = localStorage.getItem(TOKEN_KEYS.USER_SESSION);
    if (!sessionJson) return null;

    try {
      return JSON.parse(sessionJson) as T;
    } catch {
      return null;
    }
  }

  /**
   * Store user session
   */
  setUserSession<T>(session: T | null): void {
    if (session) {
      localStorage.setItem(TOKEN_KEYS.USER_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(TOKEN_KEYS.USER_SESSION);
    }
  }

  // ============== Full Session Operations ==============

  /**
   * Store complete session (tokens + user)
   */
  storeSession(tokens: AuthTokens, user: StoredUser): void {
    this.setAuthTokens(tokens);
    this.setStoredUser(user);
  }

  /**
   * Check if a valid session exists
   * Valid = has tokens, user, and non-expired ID token
   */
  hasValidSession(): boolean {
    const tokens = this.getAuthTokens();
    const user = this.getStoredUser();
    const idToken = this.getIdToken();

    if (!tokens || !user || !idToken) {
      return false;
    }

    return !this.isIdTokenExpired();
  }

  /**
   * Get complete session data
   */
  getSession(): { tokens: AuthTokens; user: StoredUser } | null {
    const tokens = this.getAuthTokens();
    const user = this.getStoredUser();

    if (!tokens || !user) {
      return null;
    }

    return { tokens, user };
  }

  // ============== Secure Cookie Operations ==============

  /**
   * Set tokens via httpOnly cookies (for enhanced security)
   * Only used when storage mode is 'cookie'
   */
  async setSecureTokens(tokens: AuthTokens): Promise<boolean> {
    if (!this.isSecureCookieMode()) {
      return true; // Skip if not in cookie mode
    }

    try {
      const response = await fetch(`${config.apiUrl}/auth/set-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokens }),
      });

      if (!response.ok) {
        console.error('[TokenStorage] Failed to set secure tokens:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TokenStorage] Error setting secure tokens:', error);
      return false;
    }
  }

  /**
   * Clear httpOnly cookies
   * Only used when storage mode is 'cookie'
   */
  async clearSecureTokens(): Promise<boolean> {
    if (!this.isSecureCookieMode()) {
      return true; // Skip if not in cookie mode
    }

    try {
      const response = await fetch(`${config.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('[TokenStorage] Clear secure tokens returned non-OK:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[TokenStorage] Error clearing secure tokens:', error);
      return false;
    }
  }

  // ============== Clear All Operations ==============

  /**
   * Clear all auth-related data from storage
   */
  async clearAll(): Promise<void> {
    // Clear localStorage items
    localStorage.removeItem(TOKEN_KEYS.ID_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.AUTH_TOKENS);
    localStorage.removeItem(TOKEN_KEYS.USER);
    localStorage.removeItem(TOKEN_KEYS.USER_SESSION);
    localStorage.removeItem(TOKEN_KEYS.COGNITO_USER);

    // Clear secure cookies if in cookie mode
    if (this.isSecureCookieMode()) {
      await this.clearSecureTokens();
    }
  }

  /**
   * Clear all data synchronously (for immediate cleanup)
   * Note: Does not clear httpOnly cookies - use clearAll() for complete cleanup
   */
  clearAllSync(): void {
    localStorage.removeItem(TOKEN_KEYS.ID_TOKEN);
    localStorage.removeItem(TOKEN_KEYS.AUTH_TOKENS);
    localStorage.removeItem(TOKEN_KEYS.USER);
    localStorage.removeItem(TOKEN_KEYS.USER_SESSION);
    localStorage.removeItem(TOKEN_KEYS.COGNITO_USER);
  }

  // ============== Dev Mode Operations ==============

  /**
   * Get dev mode user (only works in development)
   */
  getDevUser<T = unknown>(): T | null {
    if (!import.meta.env.DEV) {
      return null;
    }

    const devUserJson = localStorage.getItem(TOKEN_KEYS.DEV_USER);
    if (!devUserJson) return null;

    try {
      return JSON.parse(devUserJson) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set dev mode user (only works in development)
   */
  setDevUser<T>(user: T | null): void {
    if (!import.meta.env.DEV) {
      console.warn('[TokenStorage] setDevUser called in non-dev mode, ignoring');
      return;
    }

    if (user) {
      localStorage.setItem(TOKEN_KEYS.DEV_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEYS.DEV_USER);
    }
  }

  // ============== Utility Methods ==============

  /**
   * Parse ID token to extract user info
   */
  parseIdToken(): StoredUser | null {
    const token = this.getIdToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split('@')[0] || 'User',
        emailVerified: payload.email_verified,
      };
    } catch {
      return null;
    }
  }

  /**
   * Debug: Get all stored data (for debugging only)
   */
  debugGetAllData(): Record<string, unknown> {
    if (!import.meta.env.DEV) {
      return { error: 'Debug only available in development' };
    }

    return {
      storageMode: this.storageMode,
      hasIdToken: this.hasIdToken(),
      isExpired: this.isIdTokenExpired(),
      remainingTime: this.getTokenRemainingTime(),
      hasAuthTokens: !!this.getAuthTokens(),
      hasUser: !!this.getStoredUser(),
      hasSession: !!this.getUserSession(),
      hasDevUser: !!this.getDevUser(),
    };
  }
}

// Export singleton instance
export const tokenStorage = new TokenStorageService();
export default tokenStorage;
