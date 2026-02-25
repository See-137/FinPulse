# FinPulse Infrastructure

**Production-ready** Terraform infrastructure for [finpulse.me](https://finpulse.me) — a SaaS financial insights platform.

## 🎯 What's Included

| Component | Description | Monthly Cost |
|-----------|-------------|-------------|
| **VPC + NAT Gateway** | Private networking for Lambda + Redis | ~$16/mo |
| **ElastiCache Redis** | API response caching (cache.t4g.micro) | ~$15/mo |
| **11 DynamoDB Tables** | All microservices data (on-demand) | ~$1/mo |
| **Cognito User Pool** | User auth + Google SSO | Free tier |
| **Secrets Manager** | 6 active API key secrets | ~$2.40/mo |
| **8 Lambda Functions** | Microservices (ARM64, Node.js 20) | ~$1/mo |
| **API Gateway** | REST API with Cognito JWT auth | ~$4/mo |
| **CloudFront** | CDN for finpulse.me | ~$1/mo |
| **CloudWatch** | 8 alarms, 7-day log retention | ~$1/mo |
| **Budget Alerts** | 80% forecasted + 100% actual | Free |

**Total: ~$47/month** (as of Feb 2026)

## 📁 Structure

```
finpulse-infra/
├── main.tf                    # Root config, providers, backend
├── variables.tf               # All variables
├── networking.tf              # VPC, subnets, NAT Gateway, security groups
├── infrastructure.tf          # Module deployments
├── cloudfront.tf              # CloudFront distribution
├── outputs.tf                 # All outputs
├── terraform.tfvars           # Production config
├── .gitignore
│
└── modules/
    ├── api-gateway/           # REST API + JWT + CORS + throttling
    ├── cloudwatch/            # 8 alarms + dashboard
    ├── cognito/               # User auth + Google SSO
    ├── dynamodb/              # 11 tables
    ├── lambda/                # 8 Lambda functions + IAM
    ├── redis/                 # ElastiCache (cache.t4g.micro)
    └── secrets/               # Secrets Manager data sources
```

## 🚀 Quick Start

### 1. Prerequisites

```powershell
# Verify AWS CLI
aws sts get-caller-identity

# Verify Terraform
terraform --version  # >= 1.6.0
```

### 2. Configure

```powershell
cd finpulse-infrastructure

# Copy example config
Copy-Item terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars
# Change: budget_alert_email = "your-email@example.com"
```

### 3. Set API Keys

Market data is powered by **Alpaca Markets** (Algo Trader Plus - $99/mo).

```powershell
# Create Alpaca credentials in AWS Secrets Manager
aws secretsmanager create-secret `
  --name finpulse/prod/alpaca-credentials `
  --secret-string '{"api_key":"YOUR_ALPACA_KEY","api_secret":"YOUR_ALPACA_SECRET"}'

# Optional: For local development, use environment variables
$env:ALPACA_API_KEY = "your-alpaca-key"
$env:ALPACA_API_SECRET = "your-alpaca-secret"
$env:TF_VAR_newsapi_key = "your-key"  # Optional for news
$env:TF_VAR_gemini_api_key = ""       # Optional for AI
```

### 4. Deploy

```powershell
terraform init
terraform plan
terraform apply

# Takes 30-45 minutes (NAT Gateway is slow)
```

## 📊 After Deployment

### Get React Config

```powershell
terraform output -raw react_env_config
```

Add these to your React `.env`:

```
VITE_API_ENDPOINT=https://xxx.execute-api.us-east-1.amazonaws.com/prod
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXX
VITE_COGNITO_CLIENT_ID=1234567890abcdef
VITE_AWS_REGION=us-east-1
```

### View Dashboard

```powershell
terraform output cloudwatch_dashboard_url
```

### Deploy Real Lambda Code

The Lambda functions are created with placeholder code. Deploy your real code:

```powershell
# Example: Update market-data service
aws lambda update-function-code `
  --function-name finpulse-market-data-prod `
  --zip-file fileb://market-data.zip
```

## 🔔 CloudWatch Alarms (8 active, within 10-alarm Free Tier)

| Alarm | Count | Threshold |
|-------|-------|-----------|
| Lambda Error Rate | 6 | > 5% per function (excludes admin + ai) |
| Redis Memory | 1 | > 80% usage |
| API 5xx Errors | 1 | > 10/min |

Alerts go to your `budget_alert_email` via SNS.

## 💰 Cost Breakdown (Feb 2026)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| NAT Gateway + EIP | ~$16 | Single NAT in us-east-1a |
| ElastiCache Redis | ~$15 | cache.t4g.micro, 1 node |
| API Gateway | ~$4 | Requests only (cache disabled) |
| Secrets Manager | ~$2.40 | 6 active secrets |
| DynamoDB | ~$1 | On-demand, 11 tables |
| Lambda | ~$1 | 8 functions, ARM64 |
| CloudFront | ~$1 | finpulse.me CDN |
| CloudWatch | ~$1 | 8 alarms, 7-day retention |
| S3 | ~$0.10 | Frontend + state bucket |
| **Total** | **~$47** | |

*AWS Free Tier (account created Jan 2026) covers Lambda requests, DynamoDB, API Gateway requests, and CloudFront until Jan 2027. Costs shown are real charges — services without free tier.*

## 🛠️ Customization

### Enable AI Service

```hcl
# In terraform.tfvars
enable_ai_service = true
```

Then set the Gemini API key:

```powershell
$env:TF_VAR_gemini_api_key = "your-gemini-key"
terraform apply
```

### Enable API Caching

```hcl
# In terraform.tfvars
enable_api_caching = true  # Adds ~$11/mo — redundant when Redis + DynamoDB caching is active
```

### Multi-AZ Redis (Production)

```hcl
# In terraform.tfvars
redis_num_cache_nodes = 2  # Adds ~$12/mo
```

## 📚 More Info

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon Cognito](https://docs.aws.amazon.com/cognito/)
- [Amazon ElastiCache](https://docs.aws.amazon.com/elasticache/)
