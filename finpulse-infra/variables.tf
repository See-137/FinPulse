# FinPulse Infrastructure - Variables

# =============================================================================
# Core Settings
# =============================================================================

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# =============================================================================
# Alerting
# =============================================================================

variable "budget_alert_email" {
  description = "Email for budget and CloudWatch alerts"
  type        = string
}

variable "budget_alert_amount" {
  description = "Monthly budget alert threshold in USD"
  type        = number
  default     = 150
}

# =============================================================================
# Feature Flags
# =============================================================================

variable "enable_ai_service" {
  description = "Enable AI service (requires Gemini API key)"
  type        = bool
  default     = false
}

variable "enable_news_service" {
  description = "Enable News service"
  type        = bool
  default     = true
}

variable "enable_community_service" {
  description = "Enable Community service"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway (required for Lambda internet access)"
  type        = bool
  default     = true
}

variable "enable_api_caching" {
  description = "Enable API Gateway caching (~$15/mo)"
  type        = bool
  default     = false
}

# =============================================================================
# Infrastructure Settings
# =============================================================================

variable "lambda_architecture" {
  description = "Lambda architecture (arm64 for Graviton2 = 20% cheaper)"
  type        = string
  default     = "arm64"
}

variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PAY_PER_REQUEST or PROVISIONED)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "enable_dynamodb_pitr" {
  description = "Enable DynamoDB Point-in-Time Recovery"
  type        = bool
  default     = true # Enabled for production data protection
}

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of Redis cache nodes"
  type        = number
  default     = 1
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  # SECURITY FIX: Increase production log retention for audit/compliance
  # Production should use 30 days minimum for audit trail
  default = 30
}

# =============================================================================
# CloudWatch Alarm Thresholds
# =============================================================================

variable "lambda_error_threshold" {
  description = "Lambda error rate threshold (%)"
  type        = number
  default     = 5
}

variable "redis_memory_threshold" {
  description = "Redis memory usage threshold (%)"
  type        = number
  default     = 80
}

variable "api_5xx_threshold" {
  description = "API Gateway 5xx error threshold"
  type        = number
  default     = 10
}

variable "api_latency_threshold" {
  description = "API Gateway p95 latency threshold (ms)"
  type        = number
  default     = 3000
}
# =============================================================================
# LemonSqueezy Settings (replaces Stripe - Israeli merchants not supported)
# =============================================================================

variable "lemonsqueezy_api_key" {
  description = "LemonSqueezy API key for payment processing"
  type        = string
  sensitive   = true
  default     = ""
}

variable "lemonsqueezy_store_id" {
  description = "LemonSqueezy Store ID"
  type        = string
  default     = "275175"
}

variable "lemonsqueezy_webhook_secret" {
  description = "LemonSqueezy webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "lemonsqueezy_variant_propulse" {
  description = "LemonSqueezy Variant ID for ProPulse plan"
  type        = string
  default     = "1229771"
}

variable "lemonsqueezy_variant_superpulse" {
  description = "LemonSqueezy Variant ID for SuperPulse plan"
  type        = string
  default     = "1229849"
}

# =============================================================================
# OAuth / Social Sign-In Settings
# =============================================================================

variable "enable_google_sso" {
  description = "Enable Google Sign-In via Cognito"
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth Client ID (from Google Cloud Console)"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret (from Google Cloud Console)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix (must be globally unique, e.g., 'finpulse-auth')"
  type        = string
  default     = ""
}

variable "oauth_callback_urls" {
  description = "Allowed OAuth callback URLs for social sign-in"
  type        = list(string)
  default     = ["http://localhost:5173/oauth/callback"]
}

variable "oauth_logout_urls" {
  description = "Allowed OAuth logout redirect URLs"
  type        = list(string)
  default     = ["http://localhost:5173"]
}
# =============================================================================
# WAF Configuration
# =============================================================================

variable "waf_rate_limit" {
  description = "WAF request rate limit per 5 minutes (per IP)"
  type        = number
  default     = 2000
}

variable "waf_allowed_countries" {
  description = "List of allowed countries for WAF (ISO 3166 codes). Empty = all countries allowed"
  type        = list(string)
  default     = []
}

variable "waf_alarm_threshold_blocked" {
  description = "CloudWatch alarm threshold for WAF blocked requests (per 5 minutes)"
  type        = number
  default     = 100
}

variable "waf_alarm_threshold_rate_limit" {
  description = "CloudWatch alarm threshold for WAF rate-limited requests (per minute)"
  type        = number
  default     = 50
}
