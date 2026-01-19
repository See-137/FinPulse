# FinPulse Agent Memory

> Stable project facts, commands, and invariants. Updated automatically.
> Last updated: 2026-01-19

---

## Project Structure

```
finpulse/
├── finpulse-app/     # React 19 + TypeScript + Vite 6 frontend
├── finpulse-infra/   # Terraform AWS infrastructure
│   ├── lambda-code/  # Lambda source (auth, api, etc.)
│   ├── lambda-deploy/ # Zipped Lambda packages
│   └── modules/      # Terraform modules
└── docs/agent/       # Agent memory (this directory)
```

## Standard Commands

### Frontend (finpulse-app/)
| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build (prod) | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run type-check` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| All tests | `npm run test:all` |

### Infrastructure (finpulse-infra/)
| Task | Command |
|------|---------|
| Format | `terraform fmt -recursive` |
| Validate | `terraform validate` |
| Init | `terraform init -upgrade` |
| Plan | `terraform plan -out=tfplan` |
| Show plan | `terraform show tfplan` |

### Lambda Deployment
```powershell
# 1. Zip lambda
Compress-Archive -Path lambda-code/auth/* -DestinationPath lambda-deploy/auth.zip -Force
# 2. Deploy
aws lambda update-function-code --function-name finpulse-auth-prod --zip-file fileb://lambda-deploy/auth.zip --region us-east-1
```

---

## Architectural Invariants

1. **Auth**: AWS Cognito (User Pool `us-east-1_B6uXjEIKh`). Use `idToken` not `accessToken` for API auth.
2. **SSO**: Google OAuth via Cognito IdP. Domain: `finpulse-auth-prod-v2.auth.us-east-1.amazoncognito.com`
3. **API**: API Gateway → Lambda. Bearer token required.
4. **State**: Zustand (frontend), DynamoDB (backend)
5. **Tiers**: FREE (10 assets), PROPULSE, SUPERPULSE
6. **Holding Type**: Includes `addedAt` timestamp for tracking time in portfolio. Used for Holding Age and Total Return metrics.

---

## Environment Details

| Env | URL | AWS Region |
|-----|-----|------------|
| Production | https://finpulse.me | us-east-1 |
| S3 Bucket | finpulse-frontend-prod-383349724213 | us-east-1 |
| CloudFront | E2Y4NTEFQ5LYOK | - |

---

## Key Files

| Purpose | Path |
|---------|------|
| Auth service | `finpulse-app/services/authService.ts` |
| Portfolio store | `finpulse-app/store/portfolioStore.ts` |
| Portfolio view | `finpulse-app/components/PortfolioView.tsx` |
| Premium analytics | `finpulse-app/components/PremiumAnalytics.tsx` |
| Auth Lambda | `finpulse-infra/lambda-code/auth/index.js` |
| Main Terraform | `finpulse-infra/main.tf` |

---

## Definition of Done

- [ ] Build passes (`npm run build`)
- [ ] Lint clean (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] Tests pass (when applicable)
- [ ] Git commit with descriptive message
- [ ] Push to remote
- [ ] Infra changes: plan reviewed, apply only on explicit request
