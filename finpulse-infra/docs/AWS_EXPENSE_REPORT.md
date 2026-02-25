# FinPulse AWS Expense & Capacity Report
**Last Updated:** February 2026
**Budget Threshold:** $150/month
**Current Spend:** ~$47/month

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Current Monthly Cost** | ~$47 |
| **Budget Limit** | $150 |
| **Budget Utilization** | 31% |
| **Remaining Headroom** | ~$103/month |
| **Primary Cost Drivers** | ElastiCache ($15.49) + NAT Gateway ($16.38) |
| **Free Tier Expiry** | January 2027 |
| **Lambda Concurrency** | 10 (quota increase to 1,000 pending) |

---

## 1. Current Resource Inventory

### Compute Resources

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **Lambda** | 8 functions | 128-512MB, ARM64, Node.js 20 | ~$0.85 |
| **ElastiCache** | 1 cluster | cache.t4g.micro (0.5GB RAM) | $15.49 |

### Storage Resources

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **DynamoDB** | 11 tables | On-demand billing, PITR enabled | ~$0.11 |
| **S3** | 2 buckets | Frontend + Terraform state | ~$0.02 |

### Network & CDN

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **CloudFront** | 1 distribution | finpulse.me | ~$0.43 |
| **API Gateway** | 1 REST API | Pay-per-request (cache disabled) | ~$3.70 |
| **VPC** | 1 VPC | 4 subnets, NAT Gateway active | ~$16.38 |
| **VPC Endpoints** | DynamoDB + S3 | Gateway type (free) | $0.00 |

### Security & Auth

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **Cognito** | 1 user pool | Google SSO enabled | Free tier |
| **Secrets Manager** | 6 secrets | 5 Terraform-managed + 1 hardcoded (openai) | $2.40 |

### Monitoring

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **CloudWatch** | 8 alarms + logs | 7-day retention, ERROR-level execution logs | ~$1.00 |
| **Budgets** | 1 budget | 80% forecasted + 100% actual alerts | Free |

---

## 2. DynamoDB Tables - Data Capacity

| Table | Purpose | Key Structure | Storage Estimate |
|-------|---------|---------------|------------------|
| `finpulse-users-prod` | User profiles | userId (PK), email (GSI) | ~1KB/user |
| `finpulse-portfolios-prod` | Asset holdings | userId (PK), assetId (SK) | ~500B/asset |
| `finpulse-market-prices-prod` | Circuit breaker cache | symbol (PK) | ~200B/symbol |
| `finpulse-ai-queries-prod` | AI query history | userId (PK), queryId (SK) | ~2KB/query |
| `finpulse-news-prod` | News articles | newsId (PK) | ~1KB/article |
| `finpulse-community-posts-prod` | Social posts | postId (PK), userId (GSI) | ~500B/post |
| `finpulse-circuit-breaker-prod` | Service health | serviceName (PK) | ~100B/service |
| `finpulse-api-cache-prod` | API response cache | cacheKey (PK) | ~2KB/entry |
| `finpulse-historical-prices-prod` | Price history | symbol (PK), date (SK) | ~200B/record |
| `finpulse-api-quota-prod` | API usage tracking | providerDate (PK) | ~100B/record |
| `finpulse-identities-prod` | SSO identities | userId (PK), identityKey (SK) | ~500B/identity |

**DynamoDB Limits:**
- Maximum item size: 400KB
- On-demand capacity: Effectively unlimited (auto-scales)
- Cost: $1.25/million write requests, $0.25/million read requests

---

## 3. Resource Limits & Scaling Thresholds

### Lambda Concurrency Limits

| Function | Memory | Timeout | Concurrency |
|----------|--------|---------|-------------|
| auth | 256MB | 30s | Shared pool |
| market-data | 256MB | 30s | Shared pool |
| portfolio | 256MB | 30s | Shared pool |
| fx | 128MB | 15s | Shared pool |
| ai | 512MB | 60s | Shared pool |
| news | 256MB | 30s | Shared pool |
| community | 256MB | 30s | Shared pool |
| admin | 256MB | 30s | Shared pool |

**Account-wide Lambda limits (us-east-1):**
- Applied concurrent executions: **10** (new account restriction)
- Quota increase to **1,000** submitted Feb 2026 (pending AWS approval)
- Burst concurrency: 3,000 (once quota is raised)

> ⚠️ **IMPORTANT**: The current limit of 10 concurrent executions is the primary scaling bottleneck. This supports approximately 50-250 concurrent users depending on request patterns. Monitor the quota increase request status.

### ElastiCache Limits

| Metric | Current | Limit | Utilization |
|--------|---------|-------|-------------|
| Node Type | cache.t4g.micro | - | - |
| Memory | 0.5GB | 0.5GB | ~5% estimated |
| Network | Moderate | Moderate | Low |
| Connections | - | 65,000 | Low |

**Redis Memory Formula:**
- Session data: ~200 bytes/user
- Cache entries: ~500 bytes/item
- Estimated capacity: ~2,500 concurrent sessions at current node

### API Gateway Limits

| Metric | Current | Soft Limit | Hard Limit |
|--------|---------|------------|------------|
| Requests/second | Low | 10,000 | 10,000 |
| REST API payload | <6MB | 10MB | 10MB |
| Throttle (default) | 500 burst / 100 rate | Configurable | 10,000 |

### Cognito Limits

| Metric | Current | Free Tier | Limit |
|--------|---------|-----------|-------|
| Monthly Active Users | ~10 | 50,000 | Unlimited |
| Sign-ins/second | Low | - | 20/sec (soft) |

---

## 4. Capacity Projections - Users to Budget Limit

### Cost Per User Breakdown (estimated)

| Component | Cost/1K Users/Month | Notes |
|-----------|---------------------|-------|
| Lambda invocations | $0.20 | ~100 requests/user/month |
| Lambda compute | $0.50 | 256MB × 500ms avg |
| DynamoDB reads | $0.02 | ~20 reads/user/month |
| DynamoDB writes | $0.05 | ~5 writes/user/month |
| API Gateway | $0.35 | ~100 requests/user/month |
| CloudFront | $0.04 | ~10MB/user/month |
| CloudWatch | $0.02 | Logging overhead |
| **Total per 1K users** | **~$1.18** | Variable usage |

### Scaling to Budget Limit ($150/month)

```
Fixed costs (regardless of users):
  - ElastiCache:        $15.49
  - NAT Gateway + EIP:  $16.38
  - Secrets Manager:    $2.40
  - CloudWatch base:    $1.00
  ─────────────────────────────
  Fixed Total:          $35.27

Variable budget:        $150 - $35.27 = $114.73
Cost per 1K users:      $1.18
─────────────────────────────────────────────
Max users at budget:    ~97,000 MAU
```

### Realistic Capacity Estimates

| Scenario | Users (MAU) | Monthly Cost | % of Budget |
|----------|-------------|--------------|-------------|
| **Current** | ~10 | $47 | 31% |
| **Low Growth** | 500 | $49 | 33% |
| **Medium Growth** | 5,000 | $53 | 35% |
| **High Growth** | 25,000 | $65 | 43% |
| **Scale Limit** | 50,000 | $95 | 63% |
| **Budget Cap** | ~97,000 | $150 | 100% |

> Note: Fixed costs ($35/mo) dominate at low user counts. The infrastructure can handle significant growth within budget.

---

## 5. First Bottlenecks (What Breaks First)

### At ~250 Concurrent Users (CURRENT RISK)
**Bottleneck:** Lambda concurrency limit (account-level = 10)

**Status:** Quota increase to 1,000 submitted, pending AWS approval.
**Mitigation:** Monitor via `aws service-quotas list-requested-service-quota-change-history --service-code lambda`

### At ~2,500 Concurrent Users
**Bottleneck:** ElastiCache memory (cache.t4g.micro = 0.5GB)

**Solution:** Upgrade to cache.t4g.small (1.37GB) = +$12/month

### At ~1,000 Concurrent Lambda Executions
**Bottleneck:** Lambda concurrency (after quota increase)

**Solution:** Request further limit increase (free) or use reserved concurrency

### At ~50,000 MAU
**Bottleneck:** Cognito free tier expires, API costs become significant

**Solution:** Budget increase or optimize caching

---

## 6. Cost Optimization History

### Applied Optimizations (Total Savings: ~$30.78/month)

| Optimization | Savings | Date | Status |
|--------------|---------|------|--------|
| WAF removed (was unattached) | $15.12/mo | Feb 2026 | ✅ Applied |
| API Gateway cache disabled | $10.96/mo | Feb 2026 | ✅ Applied |
| Deprecated secrets deleted (5) | $2.00/mo | Feb 2026 | ✅ Applied |
| CloudWatch alarms reduced (38→8) | $2.70/mo | Feb 2026 | ✅ Applied |
| Log retention reduced (30→7 days) | included above | Feb 2026 | ✅ Applied |
| ARM64 Lambda (Graviton2) | ~$2/mo | Jan 2026 | ✅ Applied |
| cache.t4g.micro (ARM) | ~$2/mo | Jan 2026 | ✅ Applied |
| DynamoDB on-demand | Variable | Jan 2026 | ✅ Applied |
| VPC endpoints (DynamoDB + S3) | Data transfer | Jan 2026 | ✅ Applied |

### Remaining Opportunities

| Optimization | Potential Savings | Risk | Complexity |
|--------------|-------------------|------|------------|
| Remove Redis + NAT + VPC | $31.87/mo | High | High |
| Parameter Store vs Secrets | $2.40/mo | Medium | Medium |
| ElastiCache Reserved (1yr) | $5/mo | Low | Low |

---

## 7. Active Secrets Inventory

| Secret Name | Used By | Status |
|-------------|---------|--------|
| `finpulse/prod/alpaca-credentials` | market-data Lambda | ✅ Active (Terraform) |
| `finpulse/prod/gemini-api-key` | ai Lambda | ✅ Active (Terraform) |
| `finpulse/prod/gnews-api-key` | news Lambda | ✅ Active (Terraform) |
| `finpulse/prod/newsapi-key` | news Lambda | ✅ Active (Terraform) |
| `finpulse/prod/twitter-bearer-token` | twitter Lambda | ✅ Active (Terraform) |
| `finpulse/prod/openai-api-key` | ai Lambda (hardcoded) | ✅ Active (NOT in Terraform) |

**Deleted (Feb 2026):** coingecko, alphavantage, exchangerate, internal-tester, lemonsqueezy — 7-day recovery window until Feb 28, 2026.

---

## 8. Budget Alert Configuration

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| Forecasted | 80% ($120) | Email notification |
| Actual | 100% ($150) | Email notification |

**Alert Email:** Configured in terraform.tfvars

---

## 9. Resource Allocation by User Scale

### To Support 1,000 Users (Moderate Usage)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda concurrency | 10 | 1,000 | ⚠️ Quota increase pending |
| Lambda memory | 128-512MB | Same | ✅ OK |
| ElastiCache | 0.5GB | 0.5GB | ✅ OK |
| DynamoDB | On-demand | On-demand | ✅ OK |
| **Estimated Cost** | $47 | $48 | +$1/mo |

### To Support 10,000 Users (Growth Phase)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda concurrency | 10 | 1,000+ | ⚠️ Quota increase needed |
| ElastiCache | 0.5GB | 1.37GB | ⚠️ Upgrade needed |
| DynamoDB | On-demand | On-demand | ✅ OK |
| **Estimated Cost** | $47 | $62 | +$15/mo |

### To Support 50,000 Users (Scale Phase)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda concurrency | 10 | 3,000+ | ⚠️ Quota increase needed |
| Lambda memory | 128-512MB | 512MB-1GB | Consider upgrade |
| ElastiCache | 0.5GB | 3GB+ | ⚠️ Upgrade needed |
| DynamoDB | On-demand | On-demand | ✅ OK |
| **Estimated Cost** | $47 | $95 | +$48/mo |

---

## 10. Recommendations

### Immediate (No Cost)
1. ✅ ~~Monitor CloudWatch dashboards~~ — 8 alarms active
2. **Monitor Lambda concurrency quota increase** — critical for scaling beyond 50-250 users
3. Review Lambda cold start metrics after quota increase

### Short-term (When Users > 1,000)
1. Upgrade ElastiCache to cache.t4g.small if Redis memory > 60%
2. Consider ElastiCache Reserved Instance if committing to Redis long-term
3. Request further Lambda concurrency increase if needed

### Growth Phase (> 5,000 users)
1. Evaluate Redis necessity — DynamoDB-only caching may suffice
2. Implement request caching at CloudFront level
3. Consider provisioned DynamoDB for predictable workloads

---

## Appendix: AWS Service Quotas Reference

| Service | Quota | Current Applied | Default | Adjustable |
|---------|-------|-----------------|---------|------------|
| Lambda concurrent executions | Account | **10** (pending → 1,000) | 1,000 | Yes |
| API Gateway requests/second | Per API | 10,000 | 10,000 | Yes |
| DynamoDB tables | Account | 2,500 | 2,500 | Yes |
| Cognito user pools | Account | 1,000 | 1,000 | Yes |
| Secrets Manager secrets | Account | 500,000 | 500,000 | No |
| ElastiCache nodes | Account | 300 | 300 | Yes |

---

*Report based on AWS Cost Explorer data and Terraform configuration analysis. Actual costs may vary based on usage patterns.*
