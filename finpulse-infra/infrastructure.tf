# FinPulse Infrastructure - Module Deployments
# Sweet middle: DynamoDB + Cognito + Redis + Secrets + Lambda + API Gateway + CloudWatch

# =============================================================================
# DynamoDB Tables
# =============================================================================

module "dynamodb" {
  source = "./modules/dynamodb"

  project_name = local.project_name
  environment  = var.environment
  billing_mode = var.dynamodb_billing_mode
  enable_pitr  = var.enable_dynamodb_pitr
  tags         = local.common_tags
}

# =============================================================================
# Cognito User Pool
# =============================================================================

module "cognito" {
  source = "./modules/cognito"

  project_name          = local.project_name
  environment           = var.environment
  enable_google_sso     = var.enable_google_sso
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
  cognito_domain_prefix = var.cognito_domain_prefix
  oauth_callback_urls   = var.oauth_callback_urls
  oauth_logout_urls     = var.oauth_logout_urls
  tags                  = local.common_tags
}

# =============================================================================
# Redis Cache
# =============================================================================

module "redis" {
  source = "./modules/redis"

  project_name       = local.project_name
  environment        = var.environment
  node_type          = var.redis_node_type
  num_cache_nodes    = var.redis_num_cache_nodes
  subnet_ids         = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.redis.id]
  tags               = local.common_tags

  depends_on = [aws_nat_gateway.main]
}

# =============================================================================
# Secrets Manager (References existing secrets - NOT managed by Terraform)
# =============================================================================
# IMPORTANT: API keys are stored directly in AWS Secrets Manager via AWS CLI/Console
# This module only references them to get ARNs for Lambda IAM policies

module "secrets" {
  source = "./modules/secrets"

  project_name = local.project_name
  environment  = var.environment
  secret_names = [
    "alpaca-credentials",
    "gemini-api-key",
    "gnews-api-key",
    "newsapi-key",
    "twitter-bearer-token",
  ]
  tags = local.common_tags
}

# =============================================================================
# Lambda Functions
# =============================================================================

module "lambda" {
  source = "./modules/lambda"

  project_name             = local.project_name
  environment              = var.environment
  aws_region               = var.aws_region
  lambda_architecture      = var.lambda_architecture
  log_retention_days       = var.cloudwatch_log_retention_days
  private_subnet_ids       = aws_subnet.private[*].id
  lambda_security_group_id = aws_security_group.lambda.id
  cognito_user_pool_id     = module.cognito.user_pool_id
  cognito_client_id        = module.cognito.client_id
  redis_endpoint           = module.redis.connection_string
  secret_arns              = module.secrets.secret_arns
  enable_ai_service        = var.enable_ai_service
  enable_news_service      = var.enable_news_service
  enable_community_service = var.enable_community_service
  enable_twitter_service   = var.enable_twitter_service
  enable_payments_service  = var.enable_payments_service
  allowed_origin           = var.allowed_origin
  tags                     = local.common_tags

  # Lambda Layer configuration
  # Set path to enable layer: shared_layer_zip_path = "${path.module}/lambda-layers/shared-utils.zip"
  enable_shared_layer   = var.enable_lambda_layer
  shared_layer_zip_path = var.lambda_layer_zip_path

  # Observability (Phase 5.1)
  enable_xray_tracing = var.enable_xray_tracing

  depends_on = [module.redis, module.secrets]
}

# =============================================================================
# API Gateway
# =============================================================================

module "api_gateway" {
  source = "./modules/api-gateway"

  project_name              = local.project_name
  environment               = var.environment
  aws_region                = var.aws_region
  cognito_user_pool_arn     = module.cognito.user_pool_arn
  lambda_function_names     = module.lambda.function_names
  lambda_invoke_arns        = module.lambda.invoke_arns
  enable_ai_service         = var.enable_ai_service
  enable_news_service       = var.enable_news_service
  enable_community_service  = var.enable_community_service
  enable_twitter_service    = var.enable_twitter_service
  enable_payments_service   = var.enable_payments_service
  enable_caching            = var.enable_api_caching
  log_retention_days        = var.cloudwatch_log_retention_days
  api_gateway_logging_level = "ERROR" # INFO generates costly execution logs; access logs still active
  tags                      = local.common_tags

  depends_on = [module.lambda]
}

# =============================================================================
# CloudWatch Alarms
# =============================================================================

module "cloudwatch" {
  source = "./modules/cloudwatch"

  project_name           = local.project_name
  environment            = var.environment
  aws_region             = var.aws_region
  alert_email            = var.budget_alert_email
  lambda_function_names  = module.lambda.function_names
  lambda_error_threshold = var.lambda_error_threshold
  redis_cluster_id       = module.redis.cluster_id
  redis_memory_threshold = var.redis_memory_threshold
  api_gateway_name       = module.api_gateway.api_name
  api_5xx_threshold      = var.api_5xx_threshold
  tags                   = local.common_tags

  depends_on = [module.lambda, module.api_gateway]
}

# =============================================================================
# Budget Alert
# =============================================================================

resource "aws_budgets_budget" "monthly" {
  name         = "${local.project_name}-monthly-${var.environment}"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_alert_amount)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
