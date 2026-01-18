# FinPulse Operational Runbook

> Deployment, rollback, and incident procedures.
> Last updated: 2026-01-19

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
