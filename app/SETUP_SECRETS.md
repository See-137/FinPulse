# GitHub Secrets Setup Guide

Before your CI/CD pipelines will work, you need to configure these GitHub repository secrets.

## Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

### AWS Credentials (already configured if deploying)
| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key ID |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret access key |

### Staging Environment
| Secret Name | Value |
|-------------|-------|
| `VITE_API_URL_STAGING` | `https://79yqt9ta2e.execute-api.us-east-1.amazonaws.com/staging` |
| `VITE_COGNITO_USER_POOL_ID_STAGING` | `us-east-1_UgotLwWGm` |
| `VITE_COGNITO_CLIENT_ID_STAGING` | `42t8sjhqj8rkepjjqvio0o9hlo` |

### Production Environment
| Secret Name | Value |
|-------------|-------|
| `VITE_API_URL_PROD` | `https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod` |
| `VITE_COGNITO_USER_POOL_ID_PROD` | `us-east-1_hk2hqbWP0` |
| `VITE_COGNITO_CLIENT_ID_PROD` | `6dc052dlcfggp4r3uhhihd082h` |

## Quick Setup Command

You can also use GitHub CLI to set these secrets:

```bash
# Staging
gh secret set VITE_API_URL_STAGING --body "https://79yqt9ta2e.execute-api.us-east-1.amazonaws.com/staging"
gh secret set VITE_COGNITO_USER_POOL_ID_STAGING --body "us-east-1_UgotLwWGm"
gh secret set VITE_COGNITO_CLIENT_ID_STAGING --body "42t8sjhqj8rkepjjqvio0o9hlo"

# Production
gh secret set VITE_API_URL_PROD --body "https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod"
gh secret set VITE_COGNITO_USER_POOL_ID_PROD --body "us-east-1_hk2hqbWP0"
gh secret set VITE_COGNITO_CLIENT_ID_PROD --body "6dc052dlcfggp4r3uhhihd082h"
```

## Notes

- These values were retrieved from the deployed AWS infrastructure
- The Cognito pool IDs and client IDs are not secret, but keeping them in GitHub Secrets ensures consistency between local and CI/CD builds
- NEVER commit the Gemini API key to the repository - it should only be added to `.env` locally for development
