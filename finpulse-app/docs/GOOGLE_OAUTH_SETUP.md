# Google OAuth Setup for FinPulse

## Current Issue
Google OAuth authentication is configured in AWS Cognito but requires the redirect URI to be registered in Google Cloud Console.

## Required Configuration

### Google Cloud Console Setup

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Select the project containing OAuth Client ID: `661966478842-97nhi3hdq17ajl62q4iaqtqivb9c4v32`
3. Go to **APIs & Services** > **Credentials**
4. Click on the OAuth 2.0 Client ID
5. Add the following **Authorized redirect URIs**:
   - `https://finpulse-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - `http://localhost:3000/oauth/callback` (for local development)
   - `http://localhost:5173/oauth/callback` (alternative local port)

### Verification
After adding the redirect URIs:
1. Wait 5-10 minutes for Google to propagate the changes
2. Test the "Continue with Google" button on the login page
3. You should be redirected to Google's consent screen
4. After authorization, you'll be redirected back to the application

## Current Status
- ✅ AWS Cognito Google Identity Provider configured
- ✅ Cognito User Pool Client callback URLs configured
- ⚠️ **Pending**: Google Cloud Console redirect URI registration
- ✅ Alternative: Email/password authentication is fully functional

## Alternative Authentication
While Google OAuth is being configured, users can:
1. Create an account using email/password
2. Use the "Start Tracking Free" link for signup
3. Login with existing credentials

## Related Files
- Infrastructure: `finpulse-infra/modules/cognito/main.tf`
- Environment Config: `finpulse-app/.env`
- Auth Service: `finpulse-app/services/authService.ts`
