/**
 * FinPulse Authentication Context
 * Centralizes authentication state and logic extracted from App.tsx
 *
 * Features:
 * - Session restoration from Cognito
 * - OAuth callback handling (Google Sign-In)
 * - Login/logout functionality
 * - Token management
 * - Dev mode bypass (gated behind environment flag)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, PlanType, UserRole } from '../types';
import { auth } from '../services/authService';
import { api } from '../services/apiService';
import { usePortfolioStore } from '../store/portfolioStore';
import { SaaS_PLANS } from '../constants';
import { trackCompleteRegistration } from '../services/analytics';
import { recordLoginDate } from '../services/milestoneService';

// API URL for profile fetch
const API_URL = import.meta.env.VITE_API_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod';

// =============================================================================
// Types
// =============================================================================

interface AuthState {
  user: User | null;
  isAuthInitializing: boolean;
  isOAuthProcessing: boolean;
  oauthError: string | null;
  userCreatedAt: string | undefined;
}

interface AuthContextValue extends AuthState {
  login: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearOAuthError: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateUserPlan: (plan: PlanType) => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
  onUserChange?: (user: User | null) => void;
}

// =============================================================================
// Constants
// =============================================================================

const USER_STORAGE_KEY = 'finpulse_user_session';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map backend plan names to frontend plan types
 */
function mapBackendPlanToFrontend(backendPlan: string | undefined): PlanType {
  const planMap: Record<string, PlanType> = {
    'FREE': 'FREE',
    'free': 'FREE',
    'PROPULSE': 'PROPULSE',
    'propulse': 'PROPULSE',
    'PREMIUM': 'PROPULSE',
    'premium': 'PROPULSE',
    'SUPERPULSE': 'SUPERPULSE',
    'superpulse': 'SUPERPULSE',
    'PRO': 'SUPERPULSE',
    'pro': 'SUPERPULSE',
    'ENTERPRISE': 'SUPERPULSE',
    'enterprise': 'SUPERPULSE'
  };
  return planMap[backendPlan || 'FREE'] || 'FREE';
}

/**
 * Clear all auth-related data from storage
 */
function clearAuthData(): void {
  auth.signOut();
  api.setIdToken(null);
  localStorage.removeItem('finpulse_id_token');
  localStorage.removeItem('finpulse_user_session');
  localStorage.removeItem('finpulse_auth_tokens');
  localStorage.removeItem('finpulse_user');
  localStorage.removeItem('finpulse_cognito_user');
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function AuthProvider({ children, onUserChange }: AuthProviderProps) {
  const { setCurrentUser, clearCurrentUser } = usePortfolioStore();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);
  const [isOAuthProcessing, setIsOAuthProcessing] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | undefined>(undefined);

  /**
   * Fetch user profile from backend via /auth/me endpoint
   * Mirrors the fetchUserProfile function in App.tsx
   */
  const fetchUserProfile = useCallback(async (_userId: string): Promise<{ user: User; createdAt?: string } | null> => {
    try {
      const idToken = localStorage.getItem('finpulse_id_token');
      if (!idToken) {
        console.log('[AuthContext] fetchUserProfile: No idToken in localStorage');
        return null;
      }

      console.log('[AuthContext] fetchUserProfile: Calling', `${API_URL}/auth/me`);
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });

      if (!response.ok) {
        console.error('[AuthContext] fetchUserProfile: API returned', response.status, response.statusText);
        if (response.status === 401) {
          clearAuthData();
        }
        return null;
      }

      const data = await response.json();
      console.log('[AuthContext] fetchUserProfile: Got user data', data);
      const backendUser = data.data || data;

      // Map backend plan to frontend plan type
      const frontendPlan = mapBackendPlanToFrontend(backendUser.plan);

      // Map backend user to frontend User type (including required userRole and subscriptionStatus)
      const userObj: User = {
        id: backendUser.userId || backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        plan: frontendPlan,
        userRole: (backendUser.userRole as UserRole) || 'user',
        subscriptionStatus: backendUser.subscriptionStatus || 'active',
        credits: {
          ai: backendUser.credits?.ai ?? 0,
          maxAi: backendUser.credits?.maxAi ?? SaaS_PLANS[frontendPlan].maxAiQueries,
          assets: backendUser.credits?.assets ?? 0,
          maxAssets: backendUser.credits?.maxAssets ?? SaaS_PLANS[frontendPlan].maxAssets,
        },
      };

      return { user: userObj, createdAt: backendUser.createdAt };
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user profile:', error);
      return null;
    }
  }, []);

  /**
   * Restore session from Cognito on mount
   */
  useEffect(() => {
    const restoreAuth = async () => {
      setIsAuthInitializing(true);

      try {
        // DEV MODE: Allow bypassing auth with explicit build-time flag
        if (import.meta.env.VITE_ENABLE_DEV_AUTH === 'true' && import.meta.env.DEV) {
          const devModeUser = localStorage.getItem('finpulse_dev_user');
          if (devModeUser) {
            console.log('[AuthContext] DEV MODE: Using local user session');
            const parsedUser = JSON.parse(devModeUser);
            setUser(parsedUser);
            setIsAuthInitializing(false);
            return;
          }
        }

        // Use async initializeAuth that properly waits for token refresh
        const cognitoUser = await auth.initializeAuth();

        if (!cognitoUser) {
          console.log('[AuthContext] No valid session to restore');
          setIsAuthInitializing(false);
          return;
        }

        const idToken = localStorage.getItem('finpulse_id_token');
        if (!idToken) {
          console.log('[AuthContext] Partial session state, cleaning up');
          clearAuthData();
          setIsAuthInitializing(false);
          return;
        }

        // Token is already validated and refreshed by initializeAuth
        api.setIdToken(idToken);

        // Create User object from Cognito credentials + backend data
        const result = await fetchUserProfile(cognitoUser.userId);
        if (result) {
          console.log('[AuthContext] Session restored for user:', result.user.email);
          setUser(result.user);
          setUserCreatedAt(result.createdAt);
          setCurrentUser(result.user.id);
          recordLoginDate();
        } else {
          console.log('[AuthContext] Profile fetch failed, clearing auth');
          clearAuthData();
        }
      } catch (error) {
        console.error('[AuthContext] Auth restoration error:', error);
        clearAuthData();
      } finally {
        setIsAuthInitializing(false);
      }
    };

    restoreAuth();
  }, [setCurrentUser, fetchUserProfile]);

  /**
   * Handle OAuth callback (Google Sign-In)
   */
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;

      // Check if this is an OAuth callback
      if (!searchParams.has('code') && !pathname.includes('/oauth/callback')) {
        return;
      }

      // Parse the callback
      const callbackResult = auth.parseOAuthCallback();

      if (!callbackResult.success) {
        setOauthError(callbackResult.errorDescription || callbackResult.error || 'OAuth failed');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (!callbackResult.code) {
        return;
      }

      setIsOAuthProcessing(true);
      setOauthError(null);

      try {
        // Exchange code for tokens and complete sign-in
        const result = await auth.exchangeOAuthCode(callbackResult.code);

        // Clear the URL params
        window.history.replaceState({}, '', '/');

        if (result.success && result.user) {
          const idToken = localStorage.getItem('finpulse_id_token');
          if (idToken) {
            api.setIdToken(idToken);
          }

          const profile = await fetchUserProfile(result.user.userId);
          if (profile) {
            setUser(profile.user);
            setUserCreatedAt(profile.createdAt);
            setCurrentUser(profile.user.id);
            recordLoginDate();
          }
        } else if (result.requiresLinking) {
          sessionStorage.setItem('oauth_linking', JSON.stringify({
            existingUserId: result.existingUserId,
            linkingToken: result.linkingToken,
            error: result.error
          }));
          setOauthError(result.error || 'An account with this email already exists. Please sign in with your password to link accounts.');
        } else {
          setOauthError(result.error || 'OAuth sign-in failed');
        }
      } catch (error) {
        console.error('[AuthContext] OAuth callback error:', error);
        setOauthError('Failed to complete sign-in. Please try again.');
      } finally {
        setIsOAuthProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [setCurrentUser, fetchUserProfile]);

  /**
   * Persist user session to localStorage
   */
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  /**
   * Notify parent of user changes
   */
  useEffect(() => {
    onUserChange?.(user);
  }, [user, onUserChange]);

  /**
   * Login handler - called after successful authentication
   */
  const login = useCallback(async (_email: string, _name: string) => {
    const cognitoUser = auth.getCurrentUser();
    if (!cognitoUser) {
      console.error('[AuthContext] No Cognito user found');
      return;
    }

    const idToken = localStorage.getItem('finpulse_id_token');
    if (idToken) {
      api.setIdToken(idToken);
    }

    const result = await fetchUserProfile(cognitoUser.userId);
    if (result) {
      setUser(result.user);
      setUserCreatedAt(result.createdAt);
      setCurrentUser(result.user.id);
      // Analytics: track signup/login completion
      trackCompleteRegistration(result.user.id);
      recordLoginDate();
    }
  }, [setCurrentUser, fetchUserProfile]);

  /**
   * Logout handler
   */
  const logout = useCallback(async () => {
    await auth.signOut();
    api.setIdToken(null);
    setUser(null);
    setUserCreatedAt(undefined);
    clearCurrentUser();
    localStorage.removeItem(USER_STORAGE_KEY);
  }, [clearCurrentUser]);

  /**
   * Clear OAuth error
   */
  const clearOAuthError = useCallback(() => {
    setOauthError(null);
  }, []);

  /**
   * Update user partially
   */
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  /**
   * Update user plan with credit limits
   */
  const updateUserPlan = useCallback((plan: PlanType) => {
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        plan,
        credits: {
          ...prev.credits,
          maxAi: SaaS_PLANS[plan].maxAiQueries,
          maxAssets: SaaS_PLANS[plan].maxAssets
        }
      };
    });
  }, []);

  // Memoize context value
  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthInitializing,
    isOAuthProcessing,
    oauthError,
    userCreatedAt,
    login,
    logout,
    clearOAuthError,
    updateUser,
    updateUserPlan,
  }), [
    user,
    isAuthInitializing,
    isOAuthProcessing,
    oauthError,
    userCreatedAt,
    login,
    logout,
    clearOAuthError,
    updateUser,
    updateUserPlan,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Use the auth context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { user, isAuthInitializing } = useAuth();
  return !isAuthInitializing && user !== null;
}

/**
 * Get current user (throws if not authenticated)
 */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useCurrentUser must be used when user is authenticated');
  }
  return user;
}

export default AuthContext;
