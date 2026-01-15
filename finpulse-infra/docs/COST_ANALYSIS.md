# FinPulse AWS Cost Analysis & Optimization Guide
## Generated: January 6, 2026

---

## 📊 Current Infrastructure Inventory

### Production Environment
| Service | Resource | Configuration |
|---------|----------|---------------|
| **ElastiCache** | finpulse-cache-prod | cache.t4g.micro × 1 node |
| **Lambda** | 8 functions | 256-512MB, Node.js 20 |
| **DynamoDB** | 7 tables | On-demand billing |
| **API Gateway** | REST API | Pay-per-request |
| **Cognito** | 1 user pool | 9 users |
| **VPC** | 1 VPC | 4 subnets, no NAT Gateway |
| **CloudFront** | 1 distribution | finpulse.me |
| **Secrets Manager** | 6 secrets | API keys |
| **S3** | 2 buckets | Frontend + Terraform state |

### Staging Environment
| Service | Resource | Configuration |
|---------|----------|---------------|
| **Lambda** | 8 functions | Same as prod |
| **Cognito** | 1 user pool | Staging pool |
| **API Gateway** | REST API | Staging endpoint |

---

## 💰 Monthly Cost Estimate

### Production Costs (Primary)

| Service | Unit Price | Usage Estimate | Monthly Cost |
|---------|------------|----------------|--------------|
| **ElastiCache** (cache.t4g.micro) | $0.016/hr | 720 hrs | **$11.52** |
| **Lambda** (8 functions) | $0.20/1M requests | ~100K requests | **$0.02** |
| **Lambda Compute** | $0.0000166667/GB-s | ~50K GB-s | **$0.83** |
| **DynamoDB** (on-demand) | $1.25/1M WCU | ~50K writes | **$0.06** |
| **DynamoDB** (reads) | $0.25/1M RCU | ~200K reads | **$0.05** |
| **API Gateway** | $3.50/1M requests | ~100K requests | **$0.35** |
| **CloudFront** | $0.085/GB | ~5GB | **$0.43** |
| **Secrets Manager** | $0.40/secret/mo | 6 secrets | **$2.40** |
| **S3** | $0.023/GB | ~1GB | **$0.02** |
| **CloudWatch Logs** | $0.50/GB | ~2GB | **$1.00** |
| **Data Transfer** | $0.09/GB | ~10GB | **$0.90** |

**Production Subtotal: ~$17.58/month**

### Staging Costs (Secondary)

| Service | Monthly Cost |
|---------|--------------|
| Lambda (minimal usage) | $0.00 (free tier) |
| API Gateway | $0.00 (free tier) |
| DynamoDB | $0.00 (free tier) |
| Cognito | $0.00 (free tier) |

**Staging Subtotal: ~$0.00/month** (Free tier covers staging)

---

## 🎯 Total Estimated Monthly Cost

| Environment | Cost |
|-------------|------|
| Production | $17.58 |
| Staging | $0.00 |
| **TOTAL** | **~$18/month** |

> ⚠️ **Note**: This assumes low-to-moderate traffic. Costs scale with usage.

---

## 📈 Cost Scaling Projections

| Traffic Level | Monthly Requests | Estimated Cost |
|---------------|------------------|----------------|
| **Low** (current) | 100K | $18/month |
| **Medium** | 500K | $25/month |
| **High** | 1M | $35/month |
| **Very High** | 5M | $80/month |

---

## ✅ Cost Optimizations Already Applied

1. **✅ NAT Gateway Removed** - Saved ~$32/month
2. **✅ cache.t4g.micro** - ARM-based, 20% cheaper than t3.micro
3. **✅ DynamoDB On-Demand** - No provisioned capacity waste
4. **✅ Lambda ARM64** - 20% cheaper compute
5. **✅ No duplicate Cognito pools** - Cleaned up 3 duplicates
6. **✅ No duplicate VPCs** - Removed redundant VPC with NAT

---

## 🔧 Additional Optimization Opportunities

### 1. ElastiCache Reserved Instance (Recommended)
```
Current: On-demand cache.t4g.micro = $11.52/month
Reserved (1-year): ~$7.50/month (35% savings)
Reserved (3-year): ~$5.00/month (57% savings)
```

### 2. Consider ElastiCache Serverless (For Variable Traffic)
```
If traffic is very inconsistent:
- Serverless starts at $0.0034/ECU-hour
- Break-even: ~3,400 ECU-hours/month
- Better for <50% utilization
```

### 3. CloudWatch Log Retention
```hcl
# In terraform.tfvars, reduce retention:
cloudwatch_log_retention_days = 7  # Currently: 30

Savings: ~$0.50/month
```

### 4. Secrets Manager Alternatives
```
Current: 6 secrets × $0.40 = $2.40/month

Alternative: AWS Parameter Store (free for standard)
Savings: $2.40/month

Note: Requires code changes to use SSM instead of Secrets Manager
```

---

## 🚫 What NOT to Optimize

| Don't Touch | Reason |
|-------------|--------|
| Lambda memory | Already optimized (256-512MB) |
| DynamoDB billing | On-demand is correct for unpredictable traffic |
| API Gateway | REST API is cheaper than HTTP for your use case |
| CloudFront | Minimal cost, provides SSL + caching |

---

## 📊 Cost Monitoring Setup

### Budget Alerts (Already Configured)
- **80% Threshold**: Forecasted alert
- **100% Threshold**: Actual spend alert
- **Email**: Configured in terraform.tfvars

### Recommended Additional Monitoring
```bash
# Create daily cost anomaly detection
aws ce create-anomaly-monitor \
  --anomaly-monitor '{"MonitorName":"FinPulse-Daily","MonitorType":"DIMENSIONAL","MonitorDimension":"SERVICE"}'
```

---

## 🔮 Free Tier Coverage

Services within AWS Free Tier (first 12 months):
- Lambda: 1M requests/month, 400K GB-seconds
- DynamoDB: 25GB storage, 25 WCU, 25 RCU
- API Gateway: 1M API calls/month
- CloudFront: 1TB data transfer/month
- S3: 5GB storage
- Cognito: 50,000 MAUs

**After free tier expires, expect costs to increase by ~$5-10/month**

---

## Summary

| Metric | Value |
|--------|-------|
| **Current Monthly Cost** | ~$18 |
| **With Reserved ElastiCache** | ~$13 |
| **After Free Tier Expires** | ~$25-30 |
| **Biggest Cost Driver** | ElastiCache ($11.52) |
| **Cost per 1K Users** | ~$0.02 |
