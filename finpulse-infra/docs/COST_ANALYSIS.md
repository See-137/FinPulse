# FinPulse AWS Cost Analysis & Optimization Guide
## Last Updated: February 2026

---

## 📊 Current Infrastructure Inventory

### Production Environment
| Service | Resource | Configuration |
|---------|----------|---------------|
| **ElastiCache** | finpulse-cache-prod | cache.t4g.micro × 1 node |
| **Lambda** | 8 functions | 128-512MB, ARM64, Node.js 20 |
| **DynamoDB** | 11 tables | On-demand billing, PITR enabled |
| **API Gateway** | REST API | Pay-per-request (cache disabled) |
| **Cognito** | 1 user pool | Google SSO enabled |
| **VPC** | 1 VPC | 4 subnets, 1 NAT Gateway, 2 VPC endpoints |
| **CloudFront** | 1 distribution | finpulse.me |
| **Secrets Manager** | 6 secrets | API keys (5 Terraform-managed + 1 hardcoded) |
| **S3** | 2 buckets | Frontend + Terraform state |
| **CloudWatch** | 8 alarms | 7-day log retention, ERROR-level execution logs |

---

## 💰 Monthly Cost Breakdown (Feb 2026 — Actual)

### Fixed Costs (run 24/7 regardless of traffic)

| Service | Cost Driver | Monthly Cost |
|---------|-------------|--------------|
| **NAT Gateway** | Hourly charge ($0.045/hr) | ~$13.31 |
| **ElastiCache** | cache.t4g.micro ($0.016/hr) | ~$15.49 |
| **Elastic IP** | Attached to NAT Gateway | ~$3.07 |
| **Secrets Manager** | 6 secrets × $0.40 | ~$2.40 |
| **Fixed Subtotal** | | **~$34.27** |

### Variable Costs (scale with traffic)

| Service | Unit Price | Usage Estimate | Monthly Cost |
|---------|------------|----------------|--------------|
| **API Gateway** | $3.50/1M requests | ~100K requests | ~$3.70 |
| **Lambda** | $0.20/1M req + compute | ~100K requests | ~$0.85 |
| **DynamoDB** | $1.25/1M WCU, $0.25/1M RCU | Low | ~$0.11 |
| **CloudFront** | $0.085/GB | ~5GB | ~$0.43 |
| **CloudWatch** | Logs + metrics | 8 alarms | ~$1.00 |
| **S3** | $0.023/GB | ~1GB | ~$0.02 |
| **Data Transfer** | $0.09/GB | ~5GB | ~$0.45 |
| **Variable Subtotal** | | | **~$6.56** |

### Free Tier Coverage (expires Jan 2027)

These services show $0 in Cost Explorer because Free Tier covers them:
- Lambda: 1M requests + 400K GB-seconds/month
- DynamoDB: 25GB storage + 25 WCU/RCU
- API Gateway: 1M API calls/month (partially covers)
- CloudFront: 1TB data transfer/month
- S3: 5GB storage
- Cognito: 50,000 MAUs

**After Free Tier expires (Jan 2027):** expect ~$4-6/mo increase.

---

## 🎯 Total Monthly Cost

| Category | Cost |
|----------|------|
| Fixed costs | $34.27 |
| Variable costs | $6.56 |
| Free Tier savings | -$0 (already excluded) |
| **TOTAL** | **~$47/month** |

> ⚠️ **Note**: Costs shown are real charges from AWS Cost Explorer (UnblendedCost). Free Tier deductions are already applied.

---

## 📈 Cost Scaling Projections

| Traffic Level | Monthly Requests | Estimated Cost |
|---------------|------------------|----------------|
| **Current** (low) | ~100K | ~$47/month |
| **Medium** | 500K | ~$52/month |
| **High** | 1M | ~$58/month |
| **Very High** | 5M | ~$85/month |

Fixed costs ($34/mo) dominate at low traffic. Variable costs only matter at scale.

---

## ✅ Cost Optimizations Applied (Feb 2026)

1. **✅ WAF Removed** — Was deployed but never attached to CloudFront. Saved **$15.12/mo** for zero protection.
2. **✅ API Gateway Cache Disabled** — Redundant with Redis + DynamoDB caching. Saved **$10.96/mo**.
3. **✅ Deprecated Secrets Deleted** — Removed 5 unused secrets (coingecko, alphavantage, exchangerate, internal-tester, lemonsqueezy). Saved **$2.00/mo**.
4. **✅ CloudWatch Alarms Reduced** — From 38 to 8 alarms, staying within Free Tier. Saved **~$2.70/mo**.
5. **✅ Log Retention Reduced** — From 30 to 7 days. Prevents log storage overages.
6. **✅ Logging Level Changed** — API Gateway execution logs set to ERROR (INFO generates costly logs).
7. **✅ cache.t4g.micro** — ARM-based, 20% cheaper than t3.micro.
8. **✅ Lambda ARM64** — 20% cheaper compute via Graviton2.
9. **✅ DynamoDB On-Demand** — No provisioned capacity waste.
10. **✅ VPC Endpoints** — Gateway endpoints for DynamoDB + S3 (free data transfer).

**Total savings from optimizations: ~$30.78/month**

---

## 🔧 Remaining Optimization Opportunities

### 1. Remove Redis + NAT Gateway + VPC (~$31.87/mo savings)
```
Redis:        $15.49/mo
NAT Gateway:  $13.31/mo
Elastic IP:   $3.07/mo
Total:        $31.87/mo

Risk: HIGH — requires code changes, testing all Lambda functions
Note: redis-cache.js has graceful degradation (returns null on failure,
      falls through to DynamoDB). Removing Redis also enables removing
      NAT Gateway and VPC, since Lambdas would no longer need VPC access.
```

### 2. Secrets Manager → Parameter Store (~$2.40/mo savings)
```
Current: 6 secrets × $0.40 = $2.40/mo
SSM Parameter Store: Free (standard parameters)
Risk: Medium — requires code changes in all Lambda functions
```

### 3. ElastiCache Reserved Instance (if keeping Redis)
```
Current: On-demand cache.t4g.micro = $15.49/month
Reserved (1-year): ~$10/month (35% savings)
Reserved (3-year): ~$7/month (55% savings)
Risk: Low — only commit if Redis is staying long-term
```

---

## 🚫 What NOT to Optimize

| Don't Touch | Reason |
|-------------|--------|
| Lambda memory | Already optimized (128-512MB per function) |
| DynamoDB billing | On-demand is correct for current traffic |
| CloudFront | Minimal cost, provides SSL + caching + custom domain |
| NAT Gateway (alone) | Can't remove without removing Redis/VPC first |
| Cognito | Free tier covers 50,000 MAUs |

---

## 📊 Cost Monitoring

### Budget Alerts (Configured)
- **80% Threshold**: Forecasted alert → email notification
- **100% Threshold**: Actual spend alert → email notification
- **Budget**: $150/month

### Check Current Costs
```bash
# Monthly cost by service
aws ce get-cost-and-usage \
  --time-period Start=2026-02-01,End=2026-03-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## 🔮 Post-Free-Tier Projection (After Jan 2027)

| Metric | Value |
|--------|-------|
| **Current Monthly Cost** | ~$47 |
| **Post-Free-Tier Increase** | +$4-6/mo |
| **Projected Monthly Cost** | ~$51-53 |
| **Biggest Cost Driver** | ElastiCache + NAT Gateway ($34/mo combined) |
| **With Redis removal** | ~$15-17/mo |

---

*Last updated from AWS Cost Explorer data. Actual costs may vary based on usage patterns.*
