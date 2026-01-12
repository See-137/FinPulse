# FinPulse Security Policy

**Last Updated:** January 12, 2026

## Security Overview

FinPulse implements multiple layers of security to protect user data and transactions:

### 1. Authentication & Authorization

- **OAuth 2.0 with AWS Cognito** for secure user authentication
- **Google OAuth 2.0 integration** for federated authentication
- **HttpOnly cookies** for token storage (production default) prevents XSS token theft
- **Token refresh logic** with exponential backoff prevents rate limiting
- **Session management** with device tracking and revocation capabilities

### 2. API Security

- **Bearer token authentication** on all API endpoints
- **CORS protection** restricts requests to verified origins
- **AWS API Gateway** with request throttling
- **AWS WAF (Web Application Firewall)** protects against:
  - OWASP Top 10 attacks
  - SQL injection
  - Cross-site scripting (XSS)
  - DDoS attacks
  - Bot traffic

### 3. Data Protection

- **DOMPurify** sanitizes all user-generated content (removes XSS payloads)
- **Zod validation** ensures data structure integrity before processing
- **Cognito encryption** for sensitive user attributes
- **AWS DynamoDB** with encryption at rest
- **PITR (Point-in-Time Recovery)** enabled for database recovery

### 4. Error Handling & Logging

- **Sentry integration** for production error tracking
- **Centralized logger** with environment-based filtering
- **No sensitive data in logs** (API keys, passwords filtered)
- **Structured logging** for security event tracking
- **7-day CloudWatch log retention** for compliance

### 5. Infrastructure Security

- **Private VPC subnets** for Lambda execution
- **Security groups** restrict Lambda network access
- **IAM roles** with least-privilege principle
- **Secrets Manager** for credential rotation
- **Lambda reserved concurrency** prevents cost spikes from attack vectors

### 6. Frontend Security

- **Content Security Policy (CSP)** prevents inline script execution
- **Strict TypeScript mode** catches type errors at compile time
- **React error boundaries** prevent full app crashes
- **Input validation** on all user inputs
- **HTTPS only** in production

## Security Scanning

### Automated Checks

Run security audit:
```bash
npm run audit:security
```

Audits check for:
- Hardcoded secrets or API keys
- Unsafe console statements
- Authorization vulnerabilities
- XSS protection measures
- TypeScript strict mode compliance
- Dependency vulnerabilities

### Manual Checks

**Weekly:**
- Code review of new features
- Dependency update review
- Security alert monitoring

**Monthly:**
- Full penetration testing assessment
- Access control audit
- Infrastructure security review

## Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Email security concerns to: `security@finpulse.me`

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Best Practices for Users

1. **Use Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols

2. **Enable Two-Factor Authentication**
   - Available via Cognito MFA settings
   - Use authenticator app (TOTP)

3. **Review Connected Devices**
   - Regularly check active sessions
   - Revoke unused devices

4. **Protect API Keys**
   - Never share API credentials
   - Rotate keys quarterly
   - Use environment variables for local development

5. **Stay Updated**
   - Keep browser updated
   - Use latest Node.js version
   - Monitor security advisories

## Security Headers

FinPulse sets the following security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' *.sentry.io
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Compliance

- **GDPR**: Data processing agreements in place
- **SOC 2**: Infrastructure audits conducted
- **OWASP**: Top 10 protections implemented
- **PCI DSS**: Payment processing via Stripe (PCI compliant)

## Incident Response

In case of a security incident:

1. **Immediate Actions**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation (24-48 hours)**
   - Root cause analysis
   - Impact assessment
   - Determine affected users

3. **Remediation (24-72 hours)**
   - Deploy fix
   - Rotate compromised credentials
   - Communicate with users

4. **Post-Incident (7-30 days)**
   - Detailed post-mortem
   - Preventative measures
   - Public disclosure (if required)

## Key Security Contacts

- **Security Lead**: security@finpulse.me
- **Incident Response**: incidents@finpulse.me
- **Infrastructure**: devops@finpulse.me

## Related Documentation

- [README.md](./README.md) - Project overview
- [DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md) - Production deployment
- [MULTI_DEVICE_AUTH.md](./MULTI_DEVICE_AUTH.md) - Device management
- [CREDENTIAL_ROTATION_GUIDE.md](./CREDENTIAL_ROTATION_GUIDE.md) - Secrets rotation

## Changelog

**v2.0 (January 12, 2026)**
- AWS WAF protection
- HttpOnly cookie token storage
- Sentry error tracking
- Centralized logger
- Security audit automation
- Lambda reserved concurrency limits

---

**Version:** 2.0.0  
**Last Reviewed:** January 12, 2026  
**Next Review:** April 12, 2026
