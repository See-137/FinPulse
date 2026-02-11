# FinPulse Operational Runbook

> Deployment, rollback, and incident procedures.
> Last updated: 2026-02-11

---

## 1. Frontend Deployment

### Standard Deploy
```powershell
cd finpulse-app

# 1. Build
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://finpulse-frontend-prod-383349724213 --delete --region us-east-1

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E2Y4NTEFQ5LYOK --paths "/*" --region us-east-1
```

### Rollback
```powershell
# Option A: Redeploy previous commit
git checkout <previous-commit>
npm run build
aws s3 sync dist/ s3://finpulse-frontend-prod-383349724213 --delete

# Option B: Restore from S3 versioning (if enabled)
# Check bucket versioning status first
```

---

## 2. Lambda Deployment

### Auth Lambda
```powershell
cd finpulse-infra

# 1. Zip
Compress-Archive -Path lambda-code/auth/* -DestinationPath lambda-deploy/auth.zip -Force

# 2. Deploy
aws lambda update-function-code `
  --function-name finpulse-auth-prod `
  --zip-file fileb://lambda-deploy/auth.zip `
  --region us-east-1

# 3. Verify
aws lambda get-function --function-name finpulse-auth-prod --query "Configuration.LastModified" --region us-east-1
```

### Rollback Lambda
```powershell
# List versions
aws lambda list-versions-by-function --function-name finpulse-auth-prod --region us-east-1

# Publish current as version (before deploy)
aws lambda publish-version --function-name finpulse-auth-prod --region us-east-1

# Rollback to specific version
aws lambda update-alias --function-name finpulse-auth-prod --name prod --function-version <version>
```

---

## 3. Infrastructure Changes

### Pre-flight Checks
```powershell
cd finpulse-infra

# Identity check
aws sts get-caller-identity

# Terraform state
terraform workspace show
terraform fmt -recursive
terraform validate
terraform init -upgrade
```

### Plan (Always Required)
```powershell
terraform plan -out=tfplan
terraform show tfplan
```

### Apply (Only on explicit request)
```powershell
# NEVER run without saved plan
terraform apply tfplan
```

---

## 4. Incident Checks

### Check Lambda Errors
```powershell
aws logs filter-log-events `
  --log-group-name /aws/lambda/finpulse-auth-prod `
  --filter-pattern "ERROR" `
  --start-time (([DateTimeOffset]::UtcNow.AddHours(-1)).ToUnixTimeMilliseconds()) `
  --region us-east-1
```

### Check API Gateway Latency
```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/ApiGateway `
  --metric-name Latency `
  --dimensions Name=ApiName,Value=finpulse-api-prod `
  --start-time (Get-Date).AddHours(-1).ToString("o") `
  --end-time (Get-Date).ToString("o") `
  --period 300 `
  --statistics Average `
  --region us-east-1
```

### Check DynamoDB Throttling
```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/DynamoDB `
  --metric-name ThrottledRequests `
  --dimensions Name=TableName,Value=finpulse-users-prod `
  --start-time (Get-Date).AddHours(-1).ToString("o") `
  --end-time (Get-Date).ToString("o") `
  --period 300 `
  --statistics Sum `
  --region us-east-1
```

---

## 5. Common Issues

### SSO Not Working
1. Check Google IdP in Cognito console
2. Verify callback URLs match (`/oauth/callback`)
3. Check Cognito domain is configured
4. Verify Google Cloud Console has Cognito callback URI

### Auth Token Issues
- Use `idToken` not `accessToken` (accessToken lacks email claim)
- Check Bearer prefix is included
- Verify Cognito authorizer ID: `yialae`

### CloudFront Cache
- Always invalidate after S3 deploy
- Use `/*` for full invalidation
- Wait ~60s for propagation

---

## 6. GitHub Actions Deploy (Primary Method)

### Frontend Deployment
Push to `main` triggers `deploy.yml` → builds Vite app → syncs to S3 → invalidates CloudFront.
```bash
# Monitor
gh run list --limit 5
gh run watch <run-id> --exit-status
```

### Lambda Deployment
Push to `main` with changes in `finpulse-infra/lambda-code/**` triggers `deploy-lambdas.yml`.
- Auto-detects which Lambdas changed
- Runs lint → deploy to production → smoke test → E2E verify
```bash
gh run watch <run-id> --exit-status
```

### Managing GitHub Secrets
```bash
gh secret set VITE_WHALE_ALERT_API_KEY --body "the-key-value"
gh secret list
```

**Environment variables in deploy.yml:**
- `VITE_WHALE_ALERT_API_KEY: ${{ secrets.VITE_WHALE_ALERT_API_KEY }}`
- `VITE_ENABLE_LIVE_WHALE_DATA: true`
- `VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}`

---

## 7. Whale Feature Troubleshooting

### "Demo" Badge Showing on Signals
1. Check GitHub Secret exists: `gh secret list | grep WHALE`
2. Verify deploy.yml passes `VITE_WHALE_ALERT_API_KEY` in build env
3. Trigger redeploy: push any change to main

### Whale Alert API Errors
- **429 (rate limit)**: Built-in 3-retry with exponential backoff handles this
- **Free tier limit**: 10 requests/minute on whale-alert.io
- **API key format**: Plain string (not `wak_*` prefix)

### Mock Data Verification
- Mock data is deterministic (hash-based): same symbol = same values across renders
- Check `wasMockData` getter on `whaleWalletService` instance
- CloudWatch: look for `[Whale] Using mock metrics` log

---

## 8. Auth 401 Debugging

### All Auth Endpoints Return 401
1. Check Lambda Layer attachment:
```bash
aws lambda get-function-configuration --function-name finpulse-auth-prod --query "Layers" --region us-east-1
```
2. If `Layers: null` → decode-only fallback is active (expected until Layer deployed)
3. If Layers present but still 401 → check CloudWatch for `[Auth] CRITICAL: JWT verifier` errors

### Login Not Responding (No Error, No Success)
- Check browser console for `/auth/me` 401 errors
- `AuthContext.tsx` calls `clearAuthData()` on 401 → silently logs user out
- If `/auth/me` returns 401 with valid token: Lambda code is broken, check CloudWatch

### JWT Verification Status
- **Current (2026-02-11)**: Decode-only fallback (`decodeJwt()`) — no signature verification
- **Target**: Deploy Lambda Layer → `verifyJwtSecure()` uses `aws-jwt-verify` with real signature check
- **How to deploy Layer**: `terraform apply` with layer zip (Level C — requires explicit approval)
