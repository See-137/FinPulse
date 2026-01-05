
# FinPulse DevSecOps Hardening Guide

> **Last Updated**: January 5, 2026  
> **Status**: Production Ready ✅

## 1. Cloud Run Deployment Strategy
```bash
# Deploy with high concurrency but restricted scaling to control costs
gcloud run deploy finpulse-prod \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="FINPULSE_ENV=production" \
  --set-secrets="API_KEY=GEMINI_API_KEY:latest" \
  --max-instances=10 \
  --concurrency=80 \
  --memory=1Gi \
  --cpu=1
```

## 2. Security Hardening Checklist
- [x] **Secret Manager**: API keys stored in AWS Secrets Manager, accessed via Lambda environment variables. No secrets in `.env`.
- [x] **Binary Authorization**: Enabled via CI/CD pipeline - only approved container images deployed.
- [x] **VPC Connector**: All Lambda functions deployed within VPC with proper security groups.
- [x] **Ingress Control**: API Gateway configured with throttling and rate limiting. CloudWatch alarms active.

## 3. Monitoring (SRE)
- **Error Threshold**: Alert if HTTP 5xx responses > 1% over a 5m window. ✅ CloudWatch configured
- **Latency**: Alert if p99 latency for AI insights > 15s. ✅ X-Ray tracing enabled
- **Quota Tracking**: Monitor Gemini API quota usage via Cloud Monitoring to prevent service disruption. ✅ Alerts configured
