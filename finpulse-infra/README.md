# FinPulse Infrastructure

**Sweet middle ground** - Production-ready Terraform infrastructure with essential SRE features.

## 🎯 What's Included

| Component | Description | Cost |
|-----------|-------------|------|
| **VPC + NAT Gateway** | Private networking for Lambda | ~$35/mo |
| **7 DynamoDB Tables** | All microservices data | ~$12/mo |
| **Cognito User Pool** | User authentication | Free |
| **Redis Cache** | API response caching | ~$12/mo |
| **Secrets Manager** | API key storage | ~$2/mo |
| **8 Lambda Functions** | Microservices (placeholder code) | ~$5/mo |
| **API Gateway** | REST API with JWT auth | ~$5/mo |
| **CloudWatch Alarms** | Error rate, latency, memory alerts | ~$2/mo |
| **CloudWatch Dashboard** | Visual monitoring | Free |
| **Budget Alerts** | Cost monitoring | Free |

**Total: ~$75/month**

## 📁 Structure

```
finpulse-infrastructure/
├── main.tf                    # Root config
├── variables.tf               # All variables
├── secrets.tf                 # API key variables
├── networking.tf              # VPC, subnets, NAT
├── infrastructure.tf          # Module deployments
├── outputs.tf                 # All outputs
├── terraform.tfvars.example   # Example config
├── .gitignore
│
└── modules/
    ├── dynamodb/              # 7 tables
    ├── cognito/               # User auth
    ├── redis/                 # ElastiCache
    ├── secrets/               # Secrets Manager
    ├── lambda/                # 8 Lambda functions + IAM
    ├── api-gateway/           # REST API + JWT + CORS
    └── cloudwatch/            # Alarms + Dashboard
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

## 🔔 CloudWatch Alarms

| Alarm | Threshold | When |
|-------|-----------|------|
| Lambda Error Rate | > 5% | Any Lambda has high errors |
| Lambda Duration | > 24s | Lambda approaching timeout |
| DynamoDB Throttle | > 1 | Table being throttled |
| Redis Memory | > 80% | Cache filling up |
| API 5xx Errors | > 10/min | Backend failures |
| API Latency | > 3000ms p95 | Slow responses |

Alerts go to your `budget_alert_email`.

## 💰 Cost Breakdown

| Service | Monthly Cost |
|---------|--------------|
| NAT Gateway | $35 |
| DynamoDB (On-Demand) | $12 |
| ElastiCache Redis | $12 |
| Lambda | $5 |
| API Gateway | $5 |
| Secrets Manager | $2 |
| CloudWatch | $2 |
| **Total** | **~$75** |

*Costs are estimates for ~250 users/month*

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
enable_api_caching = true  # Adds ~$15/mo
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
