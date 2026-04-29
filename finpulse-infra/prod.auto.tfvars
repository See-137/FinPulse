# FinPulse Production Configuration
#
# This file is auto-loaded by Terraform (any *.auto.tfvars file is read on init).
# It contains the non-sensitive operator-chosen values for the prod deployment.
# Sensitive values (google_client_secret, lemonsqueezy_api_key, etc.) are
# NOT in this file — they are passed via TF_VAR_<name> environment variables
# from GitHub Secrets in terraform.yml, or from AWS Secrets Manager at runtime.
#
# Why committed (despite the *.tfvars gitignore pattern): the values here are
# feature flags, region, budget thresholds, and OAuth client IDs (which are
# public per Google's own OAuth spec — only the client_secret is sensitive).
# Without these values committed, CI cannot generate clean plans against the
# real production state, and every infra PR shows accumulated drift.
#
# To override locally for testing: create `terraform.tfvars` (gitignored) —
# its values take precedence over this file.

# =============================================================================
# Required Settings
# =============================================================================

environment        = "prod"
aws_region         = "us-east-1"
budget_alert_email = "realsee137@gmail.com"

# =============================================================================
# Budget
# =============================================================================

budget_alert_amount = 150 # Monthly budget in USD

# =============================================================================
# Feature Flags
# =============================================================================

enable_ai_service        = true # Gemini API enabled
enable_news_service      = true
enable_community_service = true
enable_nat_gateway       = true  # Required for Lambda internet access
enable_api_caching       = false # Disabled: saves ~$11/mo; Redis + DynamoDB caching handles this
enable_lambda_layer      = true
lambda_layer_zip_path    = "lambda-layers/shared-utils.zip"

# =============================================================================
# Infrastructure Settings
# =============================================================================

lambda_architecture           = "arm64" # Graviton2 = 20% cheaper
dynamodb_billing_mode         = "PAY_PER_REQUEST"
enable_dynamodb_pitr          = true # Point-in-time recovery enabled for production
redis_node_type               = "cache.t4g.micro"
redis_num_cache_nodes         = 1
cloudwatch_log_retention_days = 7

# =============================================================================
# CloudWatch Alarm Thresholds
# =============================================================================

lambda_error_threshold = 5  # Alert if error rate > 5%
redis_memory_threshold = 80 # Alert if memory > 80%
api_5xx_threshold      = 10 # Alert if > 10 5xx errors/min

# =============================================================================
# OAuth / Social Sign-In (Google SSO)
# =============================================================================
# google_client_id is public per Google's OAuth spec (it's embedded in
# client-side JS during normal OAuth flows — not a secret).
# google_client_secret is SENSITIVE — supplied via TF_VAR_google_client_secret
# from GitHub Secret GOOGLE_CLIENT_SECRET in terraform.yml.

enable_google_sso     = true
google_client_id      = "661966478842-97nhi3hdq17ajl62q4iaqtqivb9c4v32.apps.googleusercontent.com"
cognito_domain_prefix = "finpulse-auth"

oauth_callback_urls = [
  "http://localhost:5173/oauth/callback",
  "https://finpulse.me/oauth/callback"
]

oauth_logout_urls = [
  "http://localhost:5173",
  "https://finpulse.me"
]
