# Terraform State vs AWS Resources - Comparison Matrix

**Generated:** January 6, 2026  
**Region:** us-east-1

---

## Status Legend
| Symbol | Meaning |
|--------|---------|
| 🔴 ORPHAN | Resource exists in AWS but not tracked by Terraform state |
| 🟡 MISSING | Resource defined in Terraform but deleted from AWS |
| 🟠 DRIFT | Tag mismatch between expected and actual |
| ✅ SYNCED | Resource properly tracked (none currently) |
| ⚫ DELETED | Successfully removed during cleanup |

---

## 1. Cognito User Pools

| Pool ID | Name | Status | Notes |
|---------|------|--------|-------|
| `us-east-1_b36NPuJf3` | finpulse-users-prod | 🔴 ORPHAN | Active, 9 users |
| `us-east-1_Qz94aQpeK` | finpulse-users-staging | 🔴 ORPHAN | Active |
| `us-east-1_dCeYifKF4` | finpulse-users-prod | ⚫ DELETED | Cleanup |
| `us-east-1_hk2hqbWP0` | finpulse-users-prod | ⚫ DELETED | Cleanup |
| `us-east-1_UgotLwWGm` | finpulse-users-staging | ⚫ DELETED | Cleanup |

---

## 2. Lambda Functions

| Function Name | Env | Status | Expected Tags |
|---------------|-----|--------|---------------|
| `finpulse-auth-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-portfolio-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-market-data-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-news-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-fx-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-community-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-admin-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-ai-prod` | prod | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-auth-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-portfolio-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-market-data-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-news-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-fx-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-community-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-admin-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |
| `finpulse-ai-staging` | staging | 🔴 ORPHAN | ManagedBy=Terraform |

---

## 3. DynamoDB Tables

| Table Name | Status | Expected Env Tag |
|------------|--------|------------------|
| `finpulse-ai-queries-prod` | 🔴 ORPHAN | prod |
| `finpulse-circuit-breaker-prod` | 🔴 ORPHAN | prod |
| `finpulse-community-posts-prod` | 🔴 ORPHAN | prod |
| `finpulse-market-prices-prod` | 🔴 ORPHAN | prod |
| `finpulse-news-prod` | 🔴 ORPHAN | prod |
| `finpulse-portfolios-prod` | 🔴 ORPHAN | prod |
| `finpulse-users-prod` | 🔴 ORPHAN | prod |

---

## 4. API Gateway

| API ID | Name | Status | Notes |
|--------|------|--------|-------|
| `b3fgmin9yj` | finpulse-api-prod | 🔴 ORPHAN | Production |
| `79yqt9ta2e` | finpulse-api-staging | 🔴 ORPHAN | Staging |
| `p4td5qunfa` | finpulse-api-staging | ⚫ DELETED | Duplicate removed |

---

## 5. VPCs (Tag Comparison)

| VPC ID | Name | Env Tag | ManagedBy | Status |
|--------|------|---------|-----------|--------|
| `vpc-07e97299881cde1fb` | (default) | - | - | DEFAULT |
| `vpc-094d78d41ebab7d48` | finpulse-vpc-prod | prod | Terraform | 🔴 ORPHAN |
| `vpc-0039ca070f7ac3a0e` | finpulse-vpc-prod | prod | Terraform | 🟠 DRIFT |

> ⚠️ **DRIFT DETECTED**: Two VPCs with identical Name and Environment tags exist. One should be deleted.

---

## 6. Secrets Manager

| Secret Name | Status | JSON Valid |
|-------------|--------|------------|
| `finpulse/prod/coingecko-api-key` | 🔴 ORPHAN | ✅ |
| `finpulse/prod/newsapi-key` | 🔴 ORPHAN | ✅ |
| `finpulse/prod/gemini-api-key` | 🔴 ORPHAN | ✅ |
| `finpulse/prod/exchangerate-api-key` | 🔴 ORPHAN | ✅ |
| `finpulse/prod/alphavantage-api-key` | 🔴 ORPHAN | ✅ |
| `finpulse/prod/gnews-api-key` | 🔴 ORPHAN | ✅ |

---

## 7. S3 Buckets

| Bucket Name | Status | Purpose |
|-------------|--------|---------|
| `finpulse-frontend-prod-383349724213` | 🔴 ORPHAN | Frontend hosting |

---

## 8. CloudFront Distributions

| Distribution ID | Domain | Alias | Status |
|-----------------|--------|-------|--------|
| `E2Y4NTEFQ5LYOK` | d3dr4c4c9tndfn.cloudfront.net | finpulse.me | 🔴 ORPHAN |

---

## Summary Table

| Category | In AWS | In TF State | Orphaned | Deleted | Drifted |
|----------|--------|-------------|----------|---------|---------|
| Cognito Pools | 2 | 0 | 2 | 3 | 0 |
| Lambda Functions | 16 | 0 | 16 | 0 | 0 |
| DynamoDB Tables | 7 | 0 | 7 | 0 | 0 |
| API Gateway | 2 | 0 | 2 | 1 | 0 |
| VPCs (FinPulse) | 2 | 0 | 1 | 0 | 1 |
| Secrets Manager | 6 | 0 | 6 | 0 | 0 |
| S3 Buckets | 1 | 0 | 1 | 0 | 0 |
| CloudFront | 1 | 0 | 1 | 0 | 0 |
| **TOTAL** | **37** | **0** | **36** | **4** | **1** |

---

## ⚠️ Critical Findings

1. **NO TERRAFORM STATE FILE EXISTS** - All 36 active resources are orphaned
2. Terraform configs exist in repo but state was never committed or backed up remotely
3. **1 VPC drift detected** - Duplicate VPCs with identical Name/Environment tags
4. **4 resources successfully deleted** during cleanup session

---

## 🔧 Recommendations

### 1. Configure Remote State Backend
```hcl
terraform {
  backend "s3" {
    bucket         = "finpulse-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

### 2. Import Existing Resources
```bash
# Lambda functions
terraform import aws_lambda_function.auth_prod finpulse-auth-prod
terraform import aws_lambda_function.portfolio_prod finpulse-portfolio-prod
# ... repeat for all 16 lambdas

# Cognito
terraform import aws_cognito_user_pool.prod us-east-1_b36NPuJf3

# DynamoDB
terraform import aws_dynamodb_table.portfolios finpulse-portfolios-prod
# ... repeat for all 7 tables

# API Gateway
terraform import aws_api_gateway_rest_api.prod b3fgmin9yj
```

### 3. Delete Duplicate VPC
```bash
# WARNING: VPC vpc-0039ca070f7ac3a0e has NAT Gateway (incurs costs ~$32/mo)
# Must delete NAT gateway first, then subnets, then IGW, then VPC
aws ec2 delete-nat-gateway --nat-gateway-id nat-0c7907e0d7f2d32b1
# Wait for deletion...
aws ec2 delete-subnet --subnet-id subnet-0e1c169a534d643ca
# ... delete remaining subnets
aws ec2 detach-internet-gateway --internet-gateway-id igw-032e093382f5def49 --vpc-id vpc-0039ca070f7ac3a0e
aws ec2 delete-internet-gateway --internet-gateway-id igw-032e093382f5def49
aws ec2 delete-vpc --vpc-id vpc-0039ca070f7ac3a0e
```

### 4. Generate Import Config (Terraform 1.5+)
```bash
terraform plan -generate-config-out=imported.tf
```

---

## Cost Impact of Orphaned Resources

| Resource | Monthly Cost Est. |
|----------|-------------------|
| NAT Gateway (duplicate VPC) | ~$32 |
| Lambda (16 functions) | ~$0 (pay per use) |
| DynamoDB (7 tables, on-demand) | ~$0-5 |
| Secrets Manager (6 secrets) | ~$2.40 |
| CloudFront | ~$0-10 |
| **Potential Savings** | **~$32+/month** |

---

*Report generated by FinPulse AWS Audit Tool*
