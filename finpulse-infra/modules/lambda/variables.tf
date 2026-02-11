# Lambda Module Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "lambda_architecture" {
  description = "Lambda architecture (arm64 or x86_64)"
  type        = string
  default     = "arm64"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

# VPC Configuration
variable "private_subnet_ids" {
  description = "Private subnet IDs for Lambda VPC config"
  type        = list(string)
}

variable "lambda_security_group_id" {
  description = "Security group ID for Lambda"
  type        = string
}

# Dependencies
variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "redis_endpoint" {
  description = "Redis endpoint"
  type        = string
}

variable "secret_arns" {
  description = "Map of secret ARNs"
  type        = map(string)
}

# Feature flags
variable "enable_ai_service" {
  description = "Enable AI service Lambda"
  type        = bool
  default     = false
}

variable "enable_news_service" {
  description = "Enable News service Lambda"
  type        = bool
  default     = true
}

variable "enable_community_service" {
  description = "Enable Community service Lambda"
  type        = bool
  default     = true
}

variable "enable_twitter_service" {
  description = "Enable Twitter/influencer feed service Lambda"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# Reserved Concurrency (prevents runaway costs and throttling)
# NOTE: Requires AWS Lambda quota > 70. Current account limit is 10.
# Request increase via: Service Quotas > Lambda > Concurrent executions
variable "auth_reserved_concurrency" {
  description = "Reserved concurrent executions for auth service (0 = disabled)"
  type        = number
  default     = 0 # Disabled - account limit too low
}

variable "market_data_reserved_concurrency" {
  description = "Reserved concurrent executions for market data service (0 = disabled)"
  type        = number
  default     = 0 # Disabled - account limit too low
}

variable "portfolio_reserved_concurrency" {
  description = "Reserved concurrent executions for portfolio service (0 = disabled)"
  type        = number
  default     = 0 # Disabled - account limit too low
}

# Lambda Layer Configuration
variable "shared_layer_zip_path" {
  description = "Path to the shared-utils Lambda layer ZIP file"
  type        = string
  default     = ""
}

variable "enable_shared_layer" {
  description = "Enable shared utilities Lambda layer"
  type        = bool
  default     = true
}

variable "cognito_client_id" {
  description = "Cognito User Pool Client ID for JWT verification"
  type        = string
  default     = ""
}

# CORS Configuration
variable "allowed_origin" {
  description = "CORS allowed origin for Lambda function responses"
  type        = string
  default     = "https://finpulse.me"

  validation {
    condition     = can(regex("^https://", var.allowed_origin)) && var.allowed_origin != "*"
    error_message = "allowed_origin must be an HTTPS URL and cannot be '*'."
  }
}

# Observability Configuration (Phase 5.1)
variable "enable_xray_tracing" {
  description = "Enable AWS X-Ray tracing for all Lambda functions"
  type        = bool
  default     = false
}
