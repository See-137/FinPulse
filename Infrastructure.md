
# FinPulse DevSecOps Hardening Guide

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
- [ ] **Secret Manager**: Never store Gemini API keys in `.env`. Use `gcloud secrets` and grant the Cloud Run service account `secretmanager.viewer`.
- [ ] **Binary Authorization**: Enable to ensure only signed container images are deployed.
- [ ] **VPC Connector**: If connecting to a database (e.g., Cloud SQL), route all egress through a VPC connector.
- [ ] **Ingress Control**: Set ingress to `internal-and-cloud-load-balancing` once a global LB is configured with Cloud Armor (DDoS protection).

## 3. Monitoring (SRE)
- **Error Threshold**: Alert if HTTP 5xx responses > 1% over a 5m window.
- **Latency**: Alert if p99 latency for AI insights > 15s.
- **Quota Tracking**: Monitor Gemini API quota usage via Cloud Monitoring to prevent service disruption.
