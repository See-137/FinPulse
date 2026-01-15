# FinPulse Infrastructure - Outputs

# =============================================================================
# AWS Account Info
# =============================================================================

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment"
  value       = var.environment
}

# =============================================================================
# VPC
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

# =============================================================================
# DynamoDB
# =============================================================================

output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    users           = module.dynamodb.users_table_name
    portfolios      = module.dynamodb.portfolios_table_name
    market_prices   = module.dynamodb.market_prices_table_name
    ai_queries      = module.dynamodb.ai_queries_table_name
    news            = module.dynamodb.news_table_name
    community_posts = module.dynamodb.community_posts_table_name
    circuit_breaker = module.dynamodb.circuit_breaker_table_name
  }
}

# =============================================================================
# Cognito (for React frontend)
# =============================================================================

output "cognito" {
  description = "Cognito configuration for React"
  value = {
    user_pool_id = module.cognito.user_pool_id
    client_id    = module.cognito.client_id
    region       = var.aws_region
  }
  sensitive = true
}

# =============================================================================
# Redis
# =============================================================================

output "redis" {
  description = "Redis connection info"
  value = {
    endpoint = module.redis.endpoint
    port     = module.redis.port
  }
}

# =============================================================================
# Lambda Functions
# =============================================================================

output "lambda_functions" {
  description = "Lambda function names"
  value       = module.lambda.function_names
}

# =============================================================================
# API Gateway
# =============================================================================

output "api_gateway" {
  description = "API Gateway info"
  value = {
    endpoint   = module.api_gateway.api_endpoint
    stage_name = module.api_gateway.stage_name
  }
}

# =============================================================================
# CloudWatch (TEMPORARILY COMMENTED FOR IMPORT)
# =============================================================================

# output "cloudwatch_dashboard_url" {
#   description = "CloudWatch Dashboard URL"
#   value       = module.cloudwatch.dashboard_url
# }

# output "sns_alerts_topic_arn" {
#   description = "SNS Topic ARN for alerts"
#   value       = module.cloudwatch.sns_topic_arn
# }

# =============================================================================
# React Frontend Config (copy to .env)
# =============================================================================

output "react_env_config" {
  description = "Environment variables for React frontend"
  value       = <<-EOT
    # Add these to your React .env file:
    VITE_API_ENDPOINT=${module.api_gateway.api_endpoint}
    VITE_COGNITO_USER_POOL_ID=${module.cognito.user_pool_id}
    VITE_COGNITO_CLIENT_ID=${module.cognito.client_id}
    VITE_AWS_REGION=${var.aws_region}
  EOT
  sensitive   = true
}
