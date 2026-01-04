// FinPulse Cognito Authentication Service
// Handles user signup, login, and token management

import { config } from '../config';
import { api } from './apiService';

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
}

class AuthService {
  private cognitoUrl: string;
  private clientId: string;
  private currentUser: CognitoUser | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.cognitoUrl = `https://cognito-idp.${config.cognito.region}.amazonaws.com`;
    this.clientId = config.cognito.clientId;
    this.restoreSession();
  }

  // ============== Public Methods ==============

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
      
      // Set token for API calls
      api.setAccessToken(tokens.accessToken);

      // Schedule token refresh
      this.scheduleRefresh(tokens.expiresIn, tokens.refreshToken);

      return { success: true, user, tokens };
    } catch (error) {
      return { success: false, error: 'Network error during sign in' };
    }
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('finpulse_auth_tokens');
    localStorage.removeItem('finpulse_user');
    localStorage.removeItem('finpulse_id_token');
    api.setAccessToken(null);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
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

  getCurrentUser(): CognitoUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
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
    localStorage.setItem('finpulse_auth_tokens', JSON.stringify(tokens));
    localStorage.setItem('finpulse_user', JSON.stringify(user));
    // Store ID token separately for API calls (required by API Gateway Cognito authorizer)
    localStorage.setItem('finpulse_id_token', tokens.idToken);
    this.currentUser = user;
  }

  private restoreSession(): void {
    try {
      const tokensJson = localStorage.getItem('finpulse_auth_tokens');
      const userJson = localStorage.getItem('finpulse_user');
      
      if (tokensJson && userJson) {
        const tokens: AuthTokens = JSON.parse(tokensJson);
        const user: CognitoUser = JSON.parse(userJson);
        
        // Check if idToken is expired by decoding JWT
        if (this.isTokenExpired(tokens.idToken)) {
          console.log('Token expired, attempting refresh...');
          // Try to refresh the token
          this.refreshTokens(tokens.refreshToken).catch(() => {
            console.log('Token refresh failed, clearing session');
            this.signOut();
          });
          return;
        }
        
        this.currentUser = user;
        api.setAccessToken(tokens.accessToken);
        
        // Schedule refresh
        this.scheduleRefresh(tokens.expiresIn, tokens.refreshToken);
      }
    } catch (error) {
      this.signOut();
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
        const tokens: AuthTokens = {
          accessToken: data.AuthenticationResult.AccessToken,
          idToken: data.AuthenticationResult.IdToken,
          refreshToken: refreshToken, // Refresh token stays the same
          expiresIn: data.AuthenticationResult.ExpiresIn,
        };

        const user = this.parseIdToken(tokens.idToken);
        this.storeSession(tokens, user);
        api.setAccessToken(tokens.accessToken);
        this.scheduleRefresh(tokens.expiresIn, refreshToken);
      } else {
        // Refresh failed, sign out
        this.signOut();
      }
    } catch (error) {
      this.signOut();
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
export type { CognitoUser, AuthResult, AuthTokens };
