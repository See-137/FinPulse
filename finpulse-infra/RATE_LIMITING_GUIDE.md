# API Gateway Rate Limiting Guide

**Date**: January 11, 2026
**Status**: ✅ **CONFIGURED - READY FOR DEPLOYMENT**

---

## Overview

This document describes the comprehensive rate limiting and throttling configuration implemented for the FinPulse API Gateway. Rate limiting protects against abuse, DoS attacks, and ensures fair resource allocation across all users.

---

## 🎯 Security Benefits

### Protection Against:
- **DoS/DDoS Attacks**: Limits request volume per second
- **Brute Force Attacks**: Restricts admin endpoint access
- **API Abuse**: Prevents excessive usage of public endpoints
- **Cost Control**: Reduces unnecessary Lambda invocations
- **Resource Exhaustion**: Protects backend services from overload

### Monitoring & Alerting:
- CloudWatch alarms for high error rates (4xx, 5xx)
- Latency monitoring and alerts
- Request volume spike detection
- Detailed API Gateway logging

---

## 📊 Rate Limit Configuration

### 1. Authenticated User Endpoints (Default)

**Applies to**: `/portfolio`, `/community` (with JWT token)

```
Burst Limit: 500 requests (concurrent capacity)
Rate Limit: 100 requests/second (steady-state)
Daily Quota: 10,000 requests/day
```

**Use Case**: Regular authenticated users performing normal operations

### 2. Public Endpoints (Unauthenticated)

**Applies to**: `/market/prices`, `/fx/rates`

```
Burst Limit: 200 requests
Rate Limit: 50 requests/second
Daily Quota: 1,000 requests/day
```

**Use Case**: Public data access without authentication
**Rationale**: Lower limits prevent abuse while allowing legitimate anonymous access

### 3. Admin Endpoints (Highly Restrictive)

**Applies to**: `/admin/*`

```
Burst Limit: 20 requests
Rate Limit: 5 requests/second
Authentication: Required (Cognito + Admin group)
Full Request Logging: Enabled
```

**Use Case**: Administrative operations (user management, moderation)
**Rationale**: Very restrictive to prevent brute force and unauthorized access

### 4. Auth Endpoints

**Applies to**: `/auth/*` (login, signup, password reset)

```
Uses Default Settings: 500 burst, 100 req/sec
No JWT Required: Public access
```

**Note**: Consider adding separate auth-specific limits in future for brute force protection

---

## 🔧 Terraform Configuration

### Module Variables

The rate limiting configuration is managed through Terraform variables in `modules/api-gateway/variables.tf`:

#### Throttle Settings (Authenticated)
```hcl
throttle_burst_limit = 500  # Concurrent request capacity
throttle_rate_limit  = 100  # Requests per second
```

#### Public Endpoint Throttle Settings
```hcl
public_throttle_burst_limit = 200
public_throttle_rate_limit  = 50
```

#### Admin Endpoint Throttle Settings
```hcl
admin_throttle_burst_limit = 20
admin_throttle_rate_limit  = 5
```

#### Usage Plan Quotas
```hcl
user_quota_limit     = 10000      # Requests per period
user_quota_period    = "DAY"      # DAY, WEEK, or MONTH
public_quota_limit   = 1000
public_quota_period  = "DAY"
```

#### CloudWatch Alarm Thresholds
```hcl
error_4xx_threshold       = 100   # Alert if >100 4xx errors in 5 min
error_5xx_threshold       = 50    # Alert if >50 5xx errors in 5 min
latency_threshold_ms      = 2000  # Alert if avg latency >2s
request_count_threshold   = 5000  # Alert if >5000 req/min (potential DoS)
```

#### Logging Configuration
```hcl
api_gateway_logging_level = "INFO"  # OFF, ERROR, INFO
enable_xray_tracing       = false   # Enable in prod for X-Ray tracing
```

---

## 🚨 CloudWatch Alarms

### 1. High 4xx Errors Alarm
**Name**: `finpulse-api-gateway-high-4xx-{environment}`
**Trigger**: More than 100 4xx errors in 5 minutes (2 consecutive periods)
**Indicates**:
- Rate limiting is actively blocking requests
- Authentication failures
- Client errors or malformed requests
- Potential abuse attempts

### 2. High 5xx Errors Alarm
**Name**: `finpulse-api-gateway-high-5xx-{environment}`
**Trigger**: More than 50 5xx errors in 5 minutes (2 consecutive periods)
**Indicates**:
- Backend Lambda failures
- DynamoDB throttling
- Service outages
- Integration issues

### 3. High Latency Alarm
**Name**: `finpulse-api-gateway-high-latency-{environment}`
**Trigger**: Average latency >2000ms for 5 minutes (2 consecutive periods)
**Indicates**:
- Performance degradation
- Lambda cold starts
- DynamoDB slow queries
- Network issues

### 4. Excessive Requests Alarm
**Name**: `finpulse-api-gateway-excessive-requests-{environment}`
**Trigger**: More than 5000 requests in 1 minute
**Indicates**:
- Potential DoS attack
- Traffic spike
- Bot activity
- Load testing (if planned)

---

## 📈 Usage Plans

### Authenticated User Plan
- **ID**: `{project_name}-authenticated-{environment}`
- **Quota**: 10,000 requests/day
- **Throttle**: 500 burst, 100 req/sec
- **Use**: Issued to authenticated Cognito users

### Public Access Plan
- **ID**: `{project_name}-public-{environment}`
- **Quota**: 1,000 requests/day
- **Throttle**: 200 burst, 50 req/sec
- **Use**: Anonymous/public endpoint access

---

## 🔍 Monitoring & Logging

### API Gateway Access Logs

**Log Group**: `/aws/api-gateway/finpulse-{environment}`
**Retention**: 7 days (configurable via `log_retention_days`)

**Logged Fields**:
```json
{
  "requestId": "unique-request-id",
  "ip": "client-ip-address",
  "caller": "cognito-user-id",
  "user": "authenticated-user",
  "requestTime": "timestamp",
  "httpMethod": "GET/POST/PUT/DELETE",
  "resourcePath": "/portfolio",
  "status": 200,
  "protocol": "HTTP/1.1",
  "responseLength": 1234
}
```

### Method Settings Logging

**Default (all methods)**: `INFO` level
**Admin endpoints**: `INFO` level + full request/response tracing
**Dev/Staging**: Data trace enabled for debugging
**Production**: Data trace disabled (performance + security)

### Viewing Logs

```bash
# View API Gateway logs
aws logs tail /aws/api-gateway/finpulse-prod --follow

# Filter for rate-limited requests (429 errors)
aws logs filter-pattern /aws/api-gateway/finpulse-prod \
  --filter-pattern '{ $.status = 429 }'

# Check for high error rates
aws logs filter-pattern /aws/api-gateway/finpulse-prod \
  --filter-pattern '{ $.status >= 400 }'
```

---

## 🚀 Deployment Instructions

### Step 1: Review Configuration

```bash
cd finpulse-infrastructure

# Review current variables
cat terraform.tfvars

# If needed, override defaults (optional)
echo '
# Rate Limiting Overrides (optional)
throttle_burst_limit = 500
throttle_rate_limit  = 100
enable_xray_tracing  = true  # Enable for production
' >> terraform.tfvars.local
```

### Step 2: Validate Terraform

```bash
terraform validate
# Expected: Success! The configuration is valid.
```

### Step 3: Plan Changes

```bash
terraform plan -out=tfplan-rate-limiting

# Expected output:
# Plan: 10 to add, 2 to change, 0 to destroy
```

### Step 4: Review Plan

Check that the following resources will be created:
- ✅ `aws_api_gateway_method_settings.all` (global throttling)
- ✅ `aws_api_gateway_method_settings.market_prices` (public)
- ✅ `aws_api_gateway_method_settings.fx_rates` (public)
- ✅ `aws_api_gateway_method_settings.admin` (restrictive)
- ✅ `aws_api_gateway_usage_plan.authenticated`
- ✅ `aws_api_gateway_usage_plan.public`
- ✅ `aws_cloudwatch_metric_alarm.high_4xx_errors`
- ✅ `aws_cloudwatch_metric_alarm.high_5xx_errors`
- ✅ `aws_cloudwatch_metric_alarm.high_latency`
- ✅ `aws_cloudwatch_metric_alarm.excessive_requests`

### Step 5: Apply Changes

```bash
# IMPORTANT: Test in staging first!
terraform apply tfplan-rate-limiting

# Confirm: yes
```

### Step 6: Verify Deployment

```bash
# Check API Gateway stage settings
aws apigateway get-stage \
  --rest-api-id $(terraform output -raw api_gateway_id) \
  --stage-name prod

# List usage plans
aws apigateway get-usage-plans

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix finpulse-api-gateway
```

---

## 🧪 Testing Rate Limits

### Test 1: Normal Request (Should Succeed)

```bash
# Single request to public endpoint
curl https://finpulse.me/api/market/prices

# Expected: 200 OK
```

### Test 2: Burst Limit (Public Endpoint)

```bash
# Send 250 rapid requests (exceeds public burst of 200)
for i in {1..250}; do
  curl -s https://finpulse.me/api/market/prices &
done
wait

# Expected:
# - First ~200 requests: 200 OK
# - Remaining requests: 429 Too Many Requests
```

### Test 3: Rate Limit (Sustained)

```bash
# Sustained requests at 60 req/sec (exceeds public limit of 50)
while true; do
  for i in {1..60}; do
    curl -s https://finpulse.me/api/market/prices &
  done
  sleep 1
done

# Expected: Throttled after ~50 requests per second
```

### Test 4: Authenticated Endpoint (Requires JWT)

```bash
# Get JWT token first
TOKEN="your-cognito-jwt-token"

# Test authenticated endpoint
curl -H "Authorization: Bearer $TOKEN" \
  https://finpulse.me/api/portfolio

# Expected: 200 OK (higher limits apply)
```

### Test 5: Admin Endpoint (Very Restrictive)

```bash
# Try admin endpoint (requires admin group)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://finpulse.me/api/admin

# Test burst limit (20 concurrent requests)
for i in {1..25}; do
  curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
    https://finpulse.me/api/admin &
done
wait

# Expected: ~20 succeed, rest get 429
```

---

## 📊 Understanding HTTP 429 Responses

When rate limits are exceeded, API Gateway returns:

**Status Code**: `429 Too Many Requests`

**Response Body**:
```json
{
  "message": "Too Many Requests"
}
```

**Headers**:
```
Retry-After: 1
X-Amzn-ErrorType: TooManyRequestsException
```

### Client-Side Handling

**Recommended Implementation**:
```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 1;
      await sleep(retryAfter * 1000);
      continue; // Retry
    }

    return response;
  }

  throw new Error('Rate limit exceeded after retries');
}
```

---

## 🔧 Adjusting Rate Limits

### When to Increase Limits

- User complaints about throttling during normal usage
- Legitimate traffic patterns hitting limits
- Business growth requires higher capacity
- Load testing shows headroom available

### When to Decrease Limits

- High abuse detection
- Cost optimization requirements
- DDoS attack patterns observed
- Backend capacity constraints

### How to Adjust

**Option 1: Update Variables (Recommended)**

Edit `finpulse-infrastructure/terraform.tfvars`:

```hcl
# Increase authenticated user limits
throttle_burst_limit = 1000  # Was 500
throttle_rate_limit  = 200   # Was 100

# Decrease public limits (if abuse detected)
public_throttle_burst_limit = 100  # Was 200
public_throttle_rate_limit  = 25   # Was 50
```

**Option 2: Per-Environment Overrides**

Create environment-specific files:
- `terraform.tfvars.prod`
- `terraform.tfvars.staging`
- `terraform.tfvars.dev`

```bash
# Apply with environment-specific vars
terraform apply -var-file=terraform.tfvars.prod
```

**Option 3: Runtime Adjustment (Temporary)**

```bash
# Quick override for testing
terraform apply \
  -var="throttle_burst_limit=1000" \
  -var="throttle_rate_limit=200"
```

---

## 🚨 Incident Response

### Scenario 1: Excessive 429 Errors

**Symptoms**: High volume of 429 responses in CloudWatch logs

**Diagnosis**:
```bash
# Check which endpoints are throttled
aws logs filter-pattern /aws/api-gateway/finpulse-prod \
  --filter-pattern '{ $.status = 429 }' \
  --start-time $(date -d '1 hour ago' +%s)000

# Check request volume
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=finpulse-api-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Actions**:
1. Verify if traffic is legitimate (check IP distribution)
2. If legitimate: Increase rate limits temporarily
3. If attack: Consider WAF rules or IP blocking
4. Monitor Lambda concurrency and DynamoDB capacity

### Scenario 2: DoS Attack Detected

**Symptoms**: Excessive requests alarm triggered

**Immediate Actions**:
```bash
# 1. Check top requesting IPs
aws logs filter-pattern /aws/api-gateway/finpulse-prod \
  --filter-pattern '{ $.ip = * }' \
  --start-time $(date -d '10 minutes ago' +%s)000 \
  | jq -r '.events[].message' \
  | jq -r '.ip' \
  | sort | uniq -c | sort -rn | head -20

# 2. Temporarily reduce limits
terraform apply \
  -var="public_throttle_burst_limit=50" \
  -var="public_throttle_rate_limit=10"

# 3. Enable WAF (if not already)
# 4. Contact AWS Support if severe
```

### Scenario 3: Backend Performance Issues

**Symptoms**: High latency alarm triggered

**Diagnosis**:
```bash
# Check Lambda duration
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=finpulse-portfolio-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check DynamoDB throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=finpulse-portfolios-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

**Actions**:
1. Reduce API Gateway rate limits to protect backend
2. Increase Lambda memory/timeout if needed
3. Scale DynamoDB capacity (if throttling detected)
4. Enable API Gateway caching

---

## 📋 Best Practices

### 1. Monitor Continuously
- Set up CloudWatch dashboards for API metrics
- Configure SNS notifications for alarms
- Review logs weekly for abuse patterns

### 2. Test Before Production
- Always test rate limits in staging first
- Use load testing tools (Apache JMeter, k6)
- Validate alarm thresholds are appropriate

### 3. Document Changes
- Update CHANGELOG.md with rate limit changes
- Notify users of quota adjustments
- Maintain runbook for common scenarios

### 4. Implement Client-Side Retry Logic
- Respect Retry-After headers
- Use exponential backoff
- Cache responses when possible

### 5. Plan for Growth
- Review limits quarterly
- Adjust based on usage patterns
- Scale infrastructure proactively

---

## 🎯 Next Steps

### Immediate (This Week)
- ✅ Deploy rate limiting to staging
- ✅ Test all endpoints with load testing
- ✅ Verify CloudWatch alarms trigger correctly
- ✅ Update frontend to handle 429 responses gracefully

### Short-Term (Next 2 Weeks)
- [ ] Enable API Gateway caching for public endpoints
- [ ] Implement per-user API key tracking (optional)
- [ ] Add AWS WAF for advanced threat protection
- [ ] Create CloudWatch dashboard for monitoring

### Long-Term (Next Month)
- [ ] Implement dynamic rate limiting based on load
- [ ] Add geo-blocking for suspicious regions
- [ ] Integrate with Sentry for error tracking
- [ ] Consider API Gateway v2 (HTTP API) for cost savings

---

## 📞 Support & Questions

**Configuration Issues**:
- Check Terraform logs: `terraform apply` output
- Verify AWS permissions for API Gateway updates
- Review CloudWatch logs for deployment errors

**Rate Limiting Not Working**:
- Verify deployment completed: `aws apigateway get-stage`
- Check method settings: `aws apigateway get-method`
- Clear API Gateway cache: May take 5-10 minutes to propagate

**Alarm Not Triggering**:
- Verify CloudWatch metric is publishing
- Check alarm configuration: `aws cloudwatch describe-alarms`
- Ensure threshold is appropriate for traffic volume

**Need Help?**:
- Review this guide: `RATE_LIMITING_GUIDE.md`
- Check Terraform docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings
- AWS API Gateway docs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html

---

**Last Updated**: January 11, 2026
**Created By**: Claude Code
**Next Review**: After production deployment
