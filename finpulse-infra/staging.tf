# Staging Environment Configuration for FinPulse
# This creates parallel staging resources with -staging suffix

locals {
  staging_suffix = "-staging"

  # Staging Lambda functions DISABLED to maximize production concurrency
  # AWS account has 10 concurrent execution limit - need all for production
  # Re-enable when Lambda quota is increased via Service Quotas
  lambda_functions_staging = {}

  # Original staging functions (kept for reference):
  # lambda_functions_staging = {
  #   auth        = "finpulse-auth-staging"
  #   portfolio   = "finpulse-portfolio-staging"
  #   market-data = "finpulse-market-data-staging"
  #   news        = "finpulse-news-staging"
  #   community   = "finpulse-community-staging"
  #   admin       = "finpulse-admin-staging"
  #   ai          = "finpulse-ai-staging"
  #   payments    = "finpulse-payments-staging"
  # }
}

# ==============================================================
# Staging Lambda Functions
# ==============================================================

resource "aws_lambda_function" "staging" {
  for_each = local.lambda_functions_staging

  function_name = each.value
  role          = aws_iam_role.lambda_exec_staging.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  # Start with placeholder - CI/CD will deploy real code
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = "staging"
      # API keys are fetched from Secrets Manager at runtime, not hardcoded
      # Staging uses the same prod secrets - separate staging secrets can be created if needed
      SECRETS_PREFIX       = "finpulse/prod"
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.staging.id
      COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.staging.id
    }
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }

  lifecycle {
    ignore_changes = [
      filename,
      source_code_hash,
      environment,
    ]
  }
}

# Placeholder archive for initial deployment
data "archive_file" "placeholder" {
  type        = "zip"
  output_path = "${path.module}/placeholder.zip"

  source {
    content  = "exports.handler = async (event) => ({ statusCode: 200, body: JSON.stringify({ message: 'Staging placeholder - deploy via CI/CD' }) });"
    filename = "index.js"
  }
}

# ==============================================================
# Staging IAM Role
# ==============================================================

resource "aws_iam_role" "lambda_exec_staging" {
  name = "finpulse-lambda-exec-staging"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Environment = "staging"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic_staging" {
  role       = aws_iam_role.lambda_exec_staging.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_secrets_staging" {
  name = "finpulse-lambda-secrets-staging"
  role = aws_iam_role.lambda_exec_staging.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:finpulse/*"
      ]
    }]
  })
}

# ==============================================================
# Staging Cognito User Pool
# ==============================================================

resource "aws_cognito_user_pool" "staging" {
  name = "finpulse-users-staging"

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  tags = {
    Environment = "staging"
  }
}

resource "aws_cognito_user_pool_client" "staging" {
  name         = "finpulse-client-staging"
  user_pool_id = aws_cognito_user_pool.staging.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = false

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

# ==============================================================
# Staging DynamoDB Tables (7 tables matching production)
# ==============================================================

resource "aws_dynamodb_table" "users_staging" {
  name         = "finpulse-users-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false # Disabled for staging to save costs
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "portfolios_staging" {
  name         = "finpulse-portfolios-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "assetId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "assetId"
    type = "S"
  }

  attribute {
    name = "symbol"
    type = "S"
  }

  global_secondary_index {
    name            = "symbol-index"
    hash_key        = "symbol"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "market_prices_staging" {
  name         = "finpulse-market-prices-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "symbol"

  attribute {
    name = "symbol"
    type = "S"
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "ai_queries_staging" {
  name         = "finpulse-ai-queries-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "queryId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "queryId"
    type = "S"
  }

  attribute {
    name = "month"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-month-index"
    hash_key        = "userId"
    range_key       = "month"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "news_staging" {
  name         = "finpulse-news-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "newsId"

  attribute {
    name = "newsId"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "community_posts_staging" {
  name         = "finpulse-community-posts-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "postId"

  attribute {
    name = "postId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  global_secondary_index {
    name            = "timestamp-index"
    hash_key        = "timestamp"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "userId-timestamp-index"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_dynamodb_table" "circuit_breaker_staging" {
  name         = "finpulse-circuit-breaker-staging"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "serviceName"

  attribute {
    name = "serviceName"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

# ==============================================================
# Staging ElastiCache (Redis)
# ==============================================================

resource "aws_elasticache_subnet_group" "staging" {
  name       = "finpulse-redis-staging"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

resource "aws_elasticache_cluster" "staging" {
  cluster_id           = "finpulse-cache-staging"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t4g.micro" # Smallest for staging
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.staging.name
  security_group_ids = [aws_security_group.redis.id]

  # Maintenance window (Sunday 3-4 AM UTC)
  maintenance_window = "sun:03:00-sun:04:00"

  # No snapshots for staging (cost savings)
  snapshot_retention_limit = 0

  tags = {
    Environment = "staging"
    Project     = "finpulse"
    ManagedBy   = "terraform"
  }
}

# ==============================================================
# Staging API Gateway
# ==============================================================

resource "aws_api_gateway_rest_api" "staging" {
  name        = "finpulse-api-staging"
  description = "FinPulse Staging API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = "staging"
  }
}

# Authorizer
resource "aws_api_gateway_authorizer" "cognito_staging" {
  name            = "CognitoAuthorizer-staging"
  rest_api_id     = aws_api_gateway_rest_api.staging.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [aws_cognito_user_pool.staging.arn]
  identity_source = "method.request.header.Authorization"
}

# ==============================================================
# Staging API Routes (simplified - expand as needed)
# ==============================================================

# Market prices - public
resource "aws_api_gateway_resource" "market_staging" {
  rest_api_id = aws_api_gateway_rest_api.staging.id
  parent_id   = aws_api_gateway_rest_api.staging.root_resource_id
  path_part   = "market"
}

resource "aws_api_gateway_resource" "market_prices_staging" {
  rest_api_id = aws_api_gateway_rest_api.staging.id
  parent_id   = aws_api_gateway_resource.market_staging.id
  path_part   = "prices"
}

resource "aws_api_gateway_method" "market_prices_get_staging" {
  rest_api_id   = aws_api_gateway_rest_api.staging.id
  resource_id   = aws_api_gateway_resource.market_prices_staging.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "market_prices_staging" {
  count = length(local.lambda_functions_staging) > 0 ? 1 : 0

  rest_api_id             = aws_api_gateway_rest_api.staging.id
  resource_id             = aws_api_gateway_resource.market_prices_staging.id
  http_method             = aws_api_gateway_method.market_prices_get_staging.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.staging["market-data"].invoke_arn
}

# AI query - authenticated
resource "aws_api_gateway_resource" "ai_staging" {
  rest_api_id = aws_api_gateway_rest_api.staging.id
  parent_id   = aws_api_gateway_rest_api.staging.root_resource_id
  path_part   = "ai"
}

resource "aws_api_gateway_resource" "ai_query_staging" {
  rest_api_id = aws_api_gateway_rest_api.staging.id
  parent_id   = aws_api_gateway_resource.ai_staging.id
  path_part   = "query"
}

resource "aws_api_gateway_method" "ai_query_post_staging" {
  rest_api_id   = aws_api_gateway_rest_api.staging.id
  resource_id   = aws_api_gateway_resource.ai_query_staging.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito_staging.id
}

resource "aws_api_gateway_integration" "ai_query_staging" {
  count = length(local.lambda_functions_staging) > 0 ? 1 : 0

  rest_api_id             = aws_api_gateway_rest_api.staging.id
  resource_id             = aws_api_gateway_resource.ai_query_staging.id
  http_method             = aws_api_gateway_method.ai_query_post_staging.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.staging["ai"].invoke_arn
}

# ==============================================================
# Lambda Permissions for API Gateway
# ==============================================================

resource "aws_lambda_permission" "api_gateway_staging" {
  for_each = local.lambda_functions_staging

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.staging[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.staging.execution_arn}/*/*"
}

# ==============================================================
# Staging Deployment
# ==============================================================

resource "aws_api_gateway_deployment" "staging" {
  rest_api_id = aws_api_gateway_rest_api.staging.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.market_staging.id,
      aws_api_gateway_resource.ai_staging.id,
      length(local.lambda_functions_staging),
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  # Only depend on integrations if Lambdas are enabled
  depends_on = []
}

resource "aws_api_gateway_stage" "staging" {
  deployment_id = aws_api_gateway_deployment.staging.id
  rest_api_id   = aws_api_gateway_rest_api.staging.id
  stage_name    = "staging"

  tags = {
    Environment = "staging"
  }
}

# ==============================================================
# Outputs
# ==============================================================

output "staging_api_url" {
  value       = aws_api_gateway_stage.staging.invoke_url
  description = "Staging API Gateway URL"
}

output "staging_cognito_user_pool_id" {
  value       = aws_cognito_user_pool.staging.id
  description = "Staging Cognito User Pool ID"
}

output "staging_cognito_client_id" {
  value       = aws_cognito_user_pool_client.staging.id
  description = "Staging Cognito Client ID"
}

output "staging_lambda_functions" {
  value       = { for k, v in aws_lambda_function.staging : k => v.function_name }
  description = "Map of staging Lambda function names"
}
