# API Gateway Module Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

# Cognito
variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN for JWT authorizer"
  type        = string
}

# Lambda functions
variable "lambda_function_names" {
  description = "Map of service name to Lambda function name"
  type        = map(string)
}

variable "lambda_invoke_arns" {
  description = "Map of service name to Lambda invoke ARN"
  type        = map(string)
}

# Feature flags
variable "enable_ai_service" {
  description = "Enable AI service endpoints"
  type        = bool
  default     = false
}

variable "enable_news_service" {
  description = "Enable News service endpoints"
  type        = bool
  default     = true
}

variable "enable_community_service" {
  description = "Enable Community service endpoints"
  type        = bool
  default     = true
}

variable "enable_twitter_service" {
  description = "Enable Twitter/influencer feed service endpoints"
  type        = bool
  default     = false
}

# Caching
variable "enable_caching" {
  description = "Enable API Gateway caching"
  type        = bool
  default     = false # $0.02/hour, enable for prod
}

# Logging
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# =============================================================================
# Rate Limiting & Throttling Variables
# =============================================================================

# Default throttle settings (authenticated users)
variable "throttle_burst_limit" {
  description = "Burst capacity for authenticated users (requests)"
  type        = number
  default     = 500 # Can handle 500 concurrent requests
}

variable "throttle_rate_limit" {
  description = "Steady-state rate limit for authenticated users (requests/second)"
  type        = number
  default     = 100 # 100 requests per second
}

# Public endpoint throttle settings (no auth)
variable "public_throttle_burst_limit" {
  description = "Burst capacity for public endpoints (requests)"
  type        = number
  default     = 200 # Lower for public endpoints
}

variable "public_throttle_rate_limit" {
  description = "Steady-state rate limit for public endpoints (requests/second)"
  type        = number
  default     = 50 # 50 requests per second for public
}

# Admin endpoint throttle settings (most restrictive)
variable "admin_throttle_burst_limit" {
  description = "Burst capacity for admin endpoints (requests)"
  type        = number
  default     = 20 # Very low for admin operations
}

variable "admin_throttle_rate_limit" {
  description = "Steady-state rate limit for admin endpoints (requests/second)"
  type        = number
  default     = 5 # 5 requests per second for admin
}

# Usage plan quota settings
variable "user_quota_limit" {
  description = "Quota limit for authenticated users per period"
  type        = number
  default     = 10000 # 10k requests per day
}

variable "user_quota_period" {
  description = "Quota period (DAY, WEEK, MONTH)"
  type        = string
  default     = "DAY"

  validation {
    condition     = contains(["DAY", "WEEK", "MONTH"], var.user_quota_period)
    error_message = "Quota period must be DAY, WEEK, or MONTH"
  }
}

variable "public_quota_limit" {
  description = "Quota limit for public access per period"
  type        = number
  default     = 1000 # 1k requests per day for public
}

variable "public_quota_period" {
  description = "Quota period for public access (DAY, WEEK, MONTH)"
  type        = string
  default     = "DAY"

  validation {
    condition     = contains(["DAY", "WEEK", "MONTH"], var.public_quota_period)
    error_message = "Quota period must be DAY, WEEK, or MONTH"
  }
}

# CloudWatch alarm thresholds (4xx/5xx alarms removed for Free Tier budget)
variable "latency_threshold_ms" {
  description = "Latency threshold in milliseconds"
  type        = number
  default     = 2000 # Alert if average latency >2s
}

variable "request_count_threshold" {
  description = "Request count threshold per minute (potential DoS)"
  type        = number
  default     = 5000 # Alert if >5000 requests in 1 minute
}

# Logging configuration
variable "api_gateway_logging_level" {
  description = "API Gateway logging level (OFF, ERROR, INFO)"
  type        = string
  default     = "ERROR"

  validation {
    condition     = contains(["OFF", "ERROR", "INFO"], var.api_gateway_logging_level)
    error_message = "Logging level must be OFF, ERROR, or INFO"
  }
}

variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing for API Gateway"
  type        = bool
  default     = false # Enable in prod for performance monitoring
}
