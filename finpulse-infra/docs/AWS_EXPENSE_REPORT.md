# FinPulse AWS Expense & Capacity Report
**Generated:** January 19, 2026
**Budget Threshold:** $150/month
**Current Spend:** ~$18/month

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Current Monthly Cost** | ~$18 |
| **Budget Limit** | $150 |
| **Budget Utilization** | 12% |
| **Remaining Headroom** | $132/month |
| **Estimated User Capacity** | ~5,000 MAU at current config |
| **Primary Cost Driver** | ElastiCache ($11.52/mo) |

---

## 1. Current Resource Inventory

### Compute Resources

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **Lambda** | 8 functions | 128-512MB, ARM64, Node.js 20 | ~$0.85 |
| **ElastiCache** | 1 cluster | cache.t4g.micro (0.5GB RAM) | $11.52 |

### Storage Resources

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **DynamoDB** | 11 tables | On-demand billing, PITR enabled | ~$0.11 |
| **S3** | 2 buckets | Frontend + Terraform state | ~$0.02 |

### Network & CDN

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **CloudFront** | 1 distribution | finpulse.me | ~$0.43 |
| **API Gateway** | 1 REST API | Pay-per-request | ~$0.35 |
| **VPC** | 1 VPC | 4 subnets, NAT Gateway enabled | ~$0.00* |

*NAT Gateway removed for cost savings

### Security & Auth

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **Cognito** | 1 user pool | 9 registered users | Free tier |
| **Secrets Manager** | 6 secrets | API keys storage | $2.40 |
| **WAF** | 1 Web ACL | Rate limiting enabled | ~$5.00 |

### Monitoring

| Service | Resource | Configuration | Monthly Cost |
|---------|----------|---------------|--------------|
| **CloudWatch** | Logs + Alarms | 30-day retention | ~$1.00 |
| **Budgets** | 1 budget | 80% + 100% alerts | Free |

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

| Function | Memory | Timeout | Default Concurrency | Burst Limit |
|----------|--------|---------|---------------------|-------------|
| auth | 256MB | 30s | 1,000 | 3,000 |
| market-data | 256MB | 30s | 1,000 | 3,000 |
| portfolio | 256MB | 30s | 1,000 | 3,000 |
| fx | 128MB | 15s | 1,000 | 3,000 |
| ai | 512MB | 60s | 1,000 | 3,000 |
| news | 256MB | 30s | 1,000 | 3,000 |
| community | 256MB | 30s | 1,000 | 3,000 |
| admin | 256MB | 30s | 1,000 | 3,000 |

**Account-wide Lambda limits (us-east-1):**
- Concurrent executions: 1,000 (soft limit, can request increase)
- Burst concurrency: 3,000

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
| WebSocket connections | N/A | 500 | - |
| REST API payload | <6MB | 10MB | 10MB |

### Cognito Limits

| Metric | Current | Free Tier | Limit |
|--------|---------|-----------|-------|
| Monthly Active Users | 9 | 50,000 | Unlimited |
| Sign-ins/second | Low | - | 20/sec (soft) |
| Tokens/day | Low | - | Unlimited |

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
  - ElastiCache:        $11.52
  - Secrets Manager:    $2.40
  - WAF:                $5.00
  - CloudWatch base:    $1.00
  ─────────────────────────────
  Fixed Total:          $19.92

Variable budget:        $150 - $19.92 = $130.08
Cost per 1K users:      $1.18
─────────────────────────────────────────────
Max users at budget:    ~110,000 MAU
```

### Realistic Capacity Estimates

| Scenario | Users (MAU) | Monthly Cost | % of Budget |
|----------|-------------|--------------|-------------|
| **Current** | 9 | $18 | 12% |
| **Low Growth** | 500 | $20 | 13% |
| **Medium Growth** | 5,000 | $26 | 17% |
| **High Growth** | 25,000 | $50 | 33% |
| **Scale Limit** | 50,000 | $80 | 53% |
| **Budget Cap** | ~110,000 | $150 | 100% |

---

## 5. First Bottlenecks (What Breaks First)

### At ~2,500 Concurrent Users
**Bottleneck:** ElastiCache memory (cache.t4g.micro = 0.5GB)

**Solution:** Upgrade to cache.t4g.small (1.37GB) = +$12/month

### At ~1,000 Concurrent Lambda Executions
**Bottleneck:** Lambda concurrency limit (account default)

**Solution:** Request limit increase (free) or use reserved concurrency

### At ~50,000 MAU
**Bottleneck:** Cognito free tier expires, API costs become significant

**Solution:** Budget increase or implement caching layer

### At ~10,000 Requests/Second
**Bottleneck:** API Gateway throttling

**Solution:** Request limit increase or implement request coalescing

---

## 6. Cost Optimization Status

### Applied Optimizations (Saving ~$45/month)

| Optimization | Savings | Status |
|--------------|---------|--------|
| NAT Gateway removed | $32/mo | Applied |
| ARM64 Lambda | $2/mo | Applied |
| cache.t4g.micro (ARM) | $2/mo | Applied |
| DynamoDB on-demand | Variable | Applied |
| Removed duplicate Cognito pools | $0 | Applied |
| Removed duplicate VPCs | $32/mo | Applied |

### Available Optimizations

| Optimization | Potential Savings | Complexity |
|--------------|-------------------|------------|
| ElastiCache Reserved (1yr) | $4/mo | Low |
| Parameter Store vs Secrets | $2.40/mo | Medium |
| CloudWatch retention 7 days | $0.50/mo | Low |
| WAF rule consolidation | $1-2/mo | Medium |

---

## 7. Budget Alert Configuration

| Alert Type | Threshold | Action |
|------------|-----------|--------|
| Forecasted | 80% ($120) | Email notification |
| Actual | 100% ($150) | Email notification |

**Alert Email:** Configured in terraform.tfvars

---

## 8. Resource Allocation Summary

### To Support 1,000 Users (Moderate Usage)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda memory | 128-512MB | Same | OK |
| ElastiCache | 0.5GB | 0.5GB | OK |
| DynamoDB | On-demand | On-demand | OK |
| API Gateway | Unlimited | Unlimited | OK |
| Cognito | Free tier | Free tier | OK |
| **Estimated Cost** | $18 | $21 | +$3/mo |

### To Support 10,000 Users (Growth Phase)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda memory | 128-512MB | Same | OK |
| ElastiCache | 0.5GB | 1.37GB | Upgrade needed |
| DynamoDB | On-demand | On-demand | OK |
| API Gateway | Unlimited | Unlimited | OK |
| Cognito | Free tier | Free tier | OK |
| **Estimated Cost** | $18 | $42 | +$24/mo |

### To Support 50,000 Users (Scale Phase)

| Resource | Current | Required | Status |
|----------|---------|----------|--------|
| Lambda memory | 128-512MB | 512MB-1GB | Consider upgrade |
| ElastiCache | 0.5GB | 3GB+ | Upgrade needed |
| DynamoDB | On-demand | On-demand | OK |
| API Gateway | 10K rps | Request increase | OK |
| Cognito | Free tier | Paid tier | Cost increase |
| **Estimated Cost** | $18 | $80 | +$62/mo |

---

## 9. Data Growth Projections

### DynamoDB Storage Growth

| Table | Records/User/Month | 10K Users Storage | Cost |
|-------|-------------------|-------------------|------|
| users | 1 | 10MB | $0.003 |
| portfolios | 10 | 50MB | $0.01 |
| ai-queries | 5 (TTL) | 100MB | $0.03 |
| community-posts | 2 | 10MB | $0.003 |
| historical-prices | Shared | 500MB | $0.13 |
| **Total** | - | ~670MB | ~$0.18/mo |

DynamoDB storage: $0.25/GB/month - storage costs remain negligible until TB scale.

---

## 10. Recommendations

### Immediate (No Cost)
1. Monitor CloudWatch dashboards for actual usage patterns
2. Set up cost anomaly detection alerts
3. Review Lambda cold start metrics

### Short-term (< $10/mo increase)
1. Purchase ElastiCache Reserved Instance (1-year) - saves $4/mo
2. Reduce CloudWatch log retention to 7 days for non-critical functions
3. Migrate to Parameter Store for non-secret configs

### Growth Phase (> 5,000 users)
1. Upgrade ElastiCache to cache.t4g.small
2. Implement request caching at CloudFront
3. Consider provisioned DynamoDB for predictable workloads

---

## Appendix: AWS Service Quotas Reference

| Service | Quota | Default | Adjustable |
|---------|-------|---------|------------|
| Lambda concurrent executions | Account | 1,000 | Yes |
| API Gateway requests/second | Per API | 10,000 | Yes |
| DynamoDB tables | Account | 2,500 | Yes |
| Cognito user pools | Account | 1,000 | Yes |
| Secrets Manager secrets | Account | 500,000 | No |
| ElastiCache nodes | Account | 300 | Yes |

---

*Report generated from Terraform configuration analysis. Actual costs may vary based on usage patterns.*
