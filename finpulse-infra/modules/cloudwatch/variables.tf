# CloudWatch Module Variables

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

variable "alert_email" {
  description = "Email for alert notifications"
  type        = string
  default     = ""
}

# Lambda monitoring
variable "lambda_function_names" {
  description = "Map of service name to Lambda function name"
  type        = map(string)
  default     = {}
}

variable "lambda_error_threshold" {
  description = "Lambda error rate threshold (%)"
  type        = number
  default     = 5
}

# Redis monitoring
variable "redis_cluster_id" {
  description = "Redis cluster ID"
  type        = string
  default     = ""
}

variable "redis_memory_threshold" {
  description = "Redis memory usage threshold (%)"
  type        = number
  default     = 80
}

# API Gateway monitoring
variable "api_gateway_name" {
  description = "API Gateway name"
  type        = string
  default     = ""
}

variable "api_5xx_threshold" {
  description = "API Gateway 5xx error threshold"
  type        = number
  default     = 10
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
