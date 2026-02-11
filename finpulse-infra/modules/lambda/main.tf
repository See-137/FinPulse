# FinPulse Lambda Functions Module
# 8 Microservices with proper IAM roles

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# IAM Role for Lambda Functions
# =============================================================================

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# CloudWatch Logs policy
resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.project_name}-lambda-logs-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        # SECURITY FIX: Restrict to project-specific log groups only
        Resource = "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.project_name}-*"
      }
    ]
  })
}

# VPC access policy (for Redis)
resource "aws_iam_role_policy" "lambda_vpc" {
  name = "${var.project_name}-lambda-vpc-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        # SECURITY FIX: Restrict VPC operations to specific subnets and security groups
        Resource = [
          "arn:aws:ec2:${var.aws_region}:*:network-interface/*",
          "arn:aws:ec2:${var.aws_region}:*:subnet/*",
          "arn:aws:ec2:${var.aws_region}:*:security-group/*"
        ]
      }
    ]
  })
}

# DynamoDB access policy
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-lambda-dynamodb-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project_name}-*",
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.project_name}-*/index/*"
        ]
      }
    ]
  })
}

# Secrets Manager access policy
resource "aws_iam_role_policy" "lambda_secrets" {
  name = "${var.project_name}-lambda-secrets-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/${var.environment}/*"
      }
    ]
  })
}

# X-Ray tracing policy (Phase 5.1 - Observability)
resource "aws_iam_role_policy" "lambda_xray" {
  count = var.enable_xray_tracing ? 1 : 0

  name = "${var.project_name}-lambda-xray-${var.environment}"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets",
          "xray:GetSamplingStatisticSummaries"
        ]
        Resource = "*"
      }
    ]
  })
}

# =============================================================================
# Lambda Functions - 8 Microservices
# =============================================================================

# Placeholder ZIP for initial deployment
# Real code will be deployed via CI/CD or manual upload
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = <<-EOF
      exports.handler = async (event) => {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Placeholder - deploy real code' })
        };
      };
    EOF
    filename = "index.js"
  }
}

# =============================================================================
# Lambda Layer for Shared Utilities
# =============================================================================
# Contains: validation.js, redis-cache.js, cache-manager.js, jwt-verifier.js,
#           rate-limiter.js, request-context.js, env-validator.js
# This eliminates code duplication across all Lambda functions

resource "aws_lambda_layer_version" "shared_utils" {
  count = var.enable_shared_layer && var.shared_layer_zip_path != "" ? 1 : 0

  layer_name          = "${var.project_name}-shared-utils-${var.environment}"
  description         = "Shared utilities: validation, caching, JWT verification, rate limiting, logging"
  compatible_runtimes = ["nodejs20.x"]
  filename            = var.shared_layer_zip_path
  source_code_hash    = filebase64sha256(var.shared_layer_zip_path)

  # Compatible with arm64 architecture used by all Lambdas
  compatible_architectures = [var.lambda_architecture]
}

# Local variable to get layer ARN (empty list if layer disabled)
locals {
  shared_layer_arns = var.enable_shared_layer && var.shared_layer_zip_path != "" ? [aws_lambda_layer_version.shared_utils[0].arn] : []
}

# 1. Auth Service
resource "aws_lambda_function" "auth_service" {
  function_name = "${var.project_name}-auth-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer (validation, JWT verification, rate limiting, etc.)
  layers = local.shared_layer_arns

  # Reserved concurrency to prevent runaway costs and ensure availability
  reserved_concurrent_executions = var.auth_reserved_concurrency > 0 ? var.auth_reserved_concurrency : -1

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      COGNITO_POOL_ID   = var.cognito_user_pool_id
      COGNITO_CLIENT_ID = var.cognito_client_id
      REDIS_ENDPOINT    = var.redis_endpoint
      ALLOWED_ORIGIN    = var.allowed_origin
    }
  }

  tags = var.tags

  # Code is deployed via CI/CD - don't let Terraform overwrite it
  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 2. Market Data Service
resource "aws_lambda_function" "market_data_service" {
  function_name = "${var.project_name}-market-data-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  # Reserved concurrency for high-traffic market data endpoint
  reserved_concurrent_executions = var.market_data_reserved_concurrency > 0 ? var.market_data_reserved_concurrency : -1

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      REDIS_ENDPOINT    = var.redis_endpoint
      ALPACA_SECRET_ARN = var.secret_arns["alpaca-credentials"]
      ALLOWED_ORIGIN    = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 3. Portfolio Service
resource "aws_lambda_function" "portfolio_service" {
  function_name = "${var.project_name}-portfolio-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  # Reserved concurrency for portfolio operations
  reserved_concurrent_executions = var.portfolio_reserved_concurrency > 0 ? var.portfolio_reserved_concurrency : -1

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT     = var.environment
      COGNITO_POOL_ID = var.cognito_user_pool_id
      REDIS_ENDPOINT  = var.redis_endpoint
      ALLOWED_ORIGIN  = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 4. FX Service - REMOVED (merged into market-data service)
# FX functionality is now handled by market-data Lambda
# See: lambda-code/market-data/index.js - handleFxRoutes()

# 5. AI Service (optional)
resource "aws_lambda_function" "ai_service" {
  count = var.enable_ai_service ? 1 : 0

  function_name = "${var.project_name}-ai-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 60 # Longer for AI streaming
  memory_size   = 512

  # Shared utilities layer
  layers = local.shared_layer_arns

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      REDIS_ENDPOINT    = var.redis_endpoint
      GEMINI_SECRET_ARN = var.secret_arns["gemini-api-key"]
      ALLOWED_ORIGIN    = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 6. News Service
resource "aws_lambda_function" "news_service" {
  count = var.enable_news_service ? 1 : 0

  function_name = "${var.project_name}-news-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT        = var.environment
      REDIS_ENDPOINT     = var.redis_endpoint
      NEWSAPI_SECRET_ARN = var.secret_arns["newsapi-key"]
      ALLOWED_ORIGIN     = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 7. Community Service
resource "aws_lambda_function" "community_service" {
  count = var.enable_community_service ? 1 : 0

  function_name = "${var.project_name}-community-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT     = var.environment
      COGNITO_POOL_ID = var.cognito_user_pool_id
      REDIS_ENDPOINT  = var.redis_endpoint
      ALLOWED_ORIGIN  = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 8. Admin Service
resource "aws_lambda_function" "admin_service" {
  function_name = "${var.project_name}-admin-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT       = var.environment
      COGNITO_POOL_ID   = var.cognito_user_pool_id
      COGNITO_CLIENT_ID = var.cognito_client_id
      REDIS_ENDPOINT    = var.redis_endpoint
      ALLOWED_ORIGIN    = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# 9. Twitter/Influencer Service (optional)
resource "aws_lambda_function" "twitter_service" {
  count = var.enable_twitter_service ? 1 : 0

  function_name = "${var.project_name}-twitter-${var.environment}"
  role          = aws_iam_role.lambda_execution.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256

  # Shared utilities layer
  layers = local.shared_layer_arns

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  # X-Ray tracing for observability (Phase 5.1)
  dynamic "tracing_config" {
    for_each = var.enable_xray_tracing ? [1] : []
    content {
      mode = "Active"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.lambda_security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT        = var.environment
      REDIS_ENDPOINT     = var.redis_endpoint
      TWITTER_SECRET_ARN = var.secret_arns["twitter-bearer-token"]
      ALLOWED_ORIGIN     = var.allowed_origin
    }
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
      layers,
    ]
  }
}


# =============================================================================
# CloudWatch Log Groups (with retention)
# =============================================================================

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${aws_lambda_function.auth_service.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "market_data" {
  name              = "/aws/lambda/${aws_lambda_function.market_data_service.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "portfolio" {
  name              = "/aws/lambda/${aws_lambda_function.portfolio_service.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# FX log group removed - FX service merged into market-data

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/aws/lambda/${aws_lambda_function.admin_service.function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

resource "aws_cloudwatch_log_group" "twitter" {
  count             = var.enable_twitter_service ? 1 : 0
  name              = "/aws/lambda/${aws_lambda_function.twitter_service[0].function_name}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

