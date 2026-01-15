# FinPulse CI/CD & Deployment Guide

## Overview

This document describes the CI/CD pipeline and deployment process for FinPulse Lambda functions, ensuring reliable, verified deployments with rollback capabilities.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub Repo    │────▶│  GitHub Actions  │────▶│  AWS Lambda     │
│  (Source Code)  │     │  (CI/CD)         │     │  (Deployed)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
   develop branch         Staging Deploy           finpulse-*-staging
   main branch            Production Deploy        finpulse-*-prod
```

## Deployment Flow

### 1. Development Workflow

```
Feature Branch → Pull Request → develop (staging) → main (production)
```

### 2. Automatic Deployments

| Branch | Environment | Trigger | Approval |
|--------|-------------|---------|----------|
| `develop` | Staging | Push | Automatic |
| `main` | Production | Push | **Manual Required** |

### 3. Manual Deployment

Trigger via GitHub Actions UI:
1. Go to Actions → "Deploy Lambdas"
2. Click "Run workflow"
3. Select environment and function
4. Click "Run workflow"

## Lambda Functions

| Function | Lambda Name (Prod) | Lambda Name (Staging) |
|----------|-------------------|----------------------|
| auth | finpulse-auth-prod | finpulse-auth-staging |
| portfolio | finpulse-portfolio-prod | finpulse-portfolio-staging |
| market-data | finpulse-market-prod | finpulse-market-staging |
| news | finpulse-news-prod | finpulse-news-staging |
| fx | finpulse-fx-prod | finpulse-fx-staging |
| community | finpulse-community-prod | finpulse-community-staging |
| admin | finpulse-admin-prod | finpulse-admin-staging |
| ai | finpulse-ai-prod | finpulse-ai-staging |
| payments | finpulse-payments-prod | finpulse-payments-staging |

## Verification

### Automated Smoke Tests

Each deployment includes automatic smoke tests that:
1. Invoke the Lambda with a test payload
2. Check for placeholder code detection
3. Verify response structure
4. Fail deployment if issues detected

### Manual Verification

Run the verification script:

```powershell
# Check production
.\verify-lambdas.ps1 -Environment prod

# Check staging
.\verify-lambdas.ps1 -Environment staging

# Verbose output
.\verify-lambdas.ps1 -Environment prod -Verbose

# Auto-fix placeholders
.\verify-lambdas.ps1 -Environment prod -FixPlaceholders
```

### Expected Output

```
🔍 FinPulse Lambda Deployment Verification
Environment: prod
============================================

Checking finpulse-auth-prod... ✅ OK (15.2 KB)
Checking finpulse-portfolio-prod... ✅ OK (22.8 KB)
Checking finpulse-market-prod... ✅ OK (1.2 MB)
Checking finpulse-news-prod... ✅ OK (856.3 KB)
Checking finpulse-fx-prod... ✅ OK (12.4 KB)
Checking finpulse-community-prod... ✅ OK (18.9 KB)
Checking finpulse-admin-prod... ✅ OK (11.2 KB)
Checking finpulse-ai-prod... ✅ OK (2.4 MB)
Checking finpulse-payments-prod... ✅ OK (45.6 KB)

✅ All Lambda functions are properly deployed!
```

## Rollback

### Via GitHub Actions

1. Go to Actions → Previous successful run
2. Click "Re-run all jobs"

### Manual Rollback

```bash
# List versions
aws lambda list-versions-by-function --function-name finpulse-ai-prod

# Rollback to specific version
aws lambda update-alias \
  --function-name finpulse-ai-prod \
  --name live \
  --function-version 5
```

### Emergency Rollback

If a deployment breaks production:

```bash
# Download previous working code from another account/backup
# Or use the backup created during deployment
aws lambda update-function-code \
  --function-name finpulse-ai-prod \
  --zip-file fileb://backup.zip
```

## GitHub Environments Setup

### Required Secrets

Set these in GitHub repository settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key with Lambda/API Gateway permissions |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `SLACK_WEBHOOK_URL` | (Optional) Slack notifications |

### Environment Protection Rules

For **production** environment:
1. Go to Settings → Environments → production
2. Enable "Required reviewers"
3. Add appropriate team members
4. Optionally set deployment branches to `main` only

## Troubleshooting

### Deployment Failed - Package Too Small

```
❌ Package too small (269 bytes) - likely missing dependencies!
```

**Cause:** `npm ci` failed or package.json missing

**Fix:**
```bash
cd lambda-code/ai
npm ci --production
zip -r ../deploy-ai.zip .
aws lambda update-function-code --function-name finpulse-ai-prod --zip-file fileb://../deploy-ai.zip
```

### Smoke Test Failed - Placeholder Detected

```
❌ FAILED: Lambda contains placeholder code!
```

**Cause:** Real code was never deployed

**Fix:** Use the verification script with `-FixPlaceholders`:
```powershell
.\verify-lambdas.ps1 -Environment prod -FixPlaceholders
```

### CORS Errors After Deployment

If API returns CORS errors after deployment:

```bash
# Check OPTIONS method integration response
aws apigateway get-integration-response \
  --rest-api-id b3fgmin9yj \
  --resource-id <resource-id> \
  --http-method OPTIONS \
  --status-code 200

# Should have response parameters for CORS headers
```

## Best Practices

1. **Always test in staging first** - Never deploy directly to production
2. **Watch code size** - AI and market-data should be >1MB (have node_modules)
3. **Check CloudWatch logs** - After deployment, verify logs show real execution
4. **Version everything** - Use `--publish` flag to create versions
5. **Monitor after deploy** - Check error rates in CloudWatch for 15 minutes

## Post-Incident: AI Lambda Placeholder Incident

### What Happened
The AI Lambda had 269-byte placeholder code instead of the real 2.4MB Gemini integration code.

### Root Cause
1. Initial Terraform deployment created placeholder
2. CI/CD workflow existed but didn't install npm dependencies
3. No verification step to confirm real code was deployed

### Prevention
1. CI/CD now includes `npm ci --production` before packaging
2. Smoke tests detect placeholder responses
3. Package size check fails if <1KB
4. Verification script added for manual checks

### Lesson Learned
**Source code verification ≠ Deployed code verification**

Always invoke Lambda directly to verify actual behavior after deployment.
