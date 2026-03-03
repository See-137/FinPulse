# FinPulse API Gateway Module
# REST API with JWT authorizer and caching

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# API Gateway CloudWatch Role (Account-level setting)
# =============================================================================

resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.project_name}-api-gw-cloudwatch-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "api_gateway_cloudwatch" {
  name = "${var.project_name}-api-gw-cloudwatch-${var.environment}"
  role = aws_iam_role.api_gateway_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}

resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# =============================================================================
# API Gateway REST API
# =============================================================================

resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "FinPulse API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = var.tags
}

# =============================================================================
# Cognito Authorizer (JWT)
# =============================================================================

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.project_name}-cognito-authorizer"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"
  provider_arns   = [var.cognito_user_pool_arn]
}

# =============================================================================
# API Resources and Methods
# =============================================================================

# /auth
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "auth"
}

# /market
resource "aws_api_gateway_resource" "market" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "market"
}

# /market/prices
resource "aws_api_gateway_resource" "market_prices" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.market.id
  path_part   = "prices"
}

# /market/{proxy+} - catch-all for other market routes (search, history, stats, binance)
resource "aws_api_gateway_resource" "market_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.market.id
  path_part   = "{proxy+}"
}

# /portfolio
resource "aws_api_gateway_resource" "portfolio" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "portfolio"
}

# /fx
resource "aws_api_gateway_resource" "fx" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "fx"
}

# /fx/rates
resource "aws_api_gateway_resource" "fx_rates" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.fx.id
  path_part   = "rates"
}

# /fx/{proxy+} - catch-all for other FX routes (convert, currencies)
resource "aws_api_gateway_resource" "fx_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.fx.id
  path_part   = "{proxy+}"
}

# /ai (optional)
resource "aws_api_gateway_resource" "ai" {
  count       = var.enable_ai_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "ai"
}

# /news (optional)
resource "aws_api_gateway_resource" "news" {
  count       = var.enable_news_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "news"
}

# /community (optional)
resource "aws_api_gateway_resource" "community" {
  count       = var.enable_community_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "community"
}

# /community/{proxy+} - catch-all for community sub-paths (posts, ticker, user)
resource "aws_api_gateway_resource" "community_proxy" {
  count       = var.enable_community_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.community[0].id
  path_part   = "{proxy+}"
}

# /twitter (optional)
resource "aws_api_gateway_resource" "twitter" {
  count       = var.enable_twitter_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "twitter"
}

# /twitter/{proxy+} - catch-all for twitter routes (tweets, user/:username/tweets)
resource "aws_api_gateway_resource" "twitter_proxy" {
  count       = var.enable_twitter_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.twitter[0].id
  path_part   = "{proxy+}"
}

# /admin
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "admin"
}

# =============================================================================
# GET /market/prices (PUBLIC - no auth required for market data)
# =============================================================================

resource "aws_api_gateway_method" "market_prices_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.market_prices.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "market_prices_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.market_prices.id
  http_method             = aws_api_gateway_method.market_prices_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["market_data"]
}

resource "aws_lambda_permission" "market_prices" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["market_data"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# GET /fx/rates (PUBLIC - no auth required for FX rates)
# Now routed to market-data Lambda (FX consolidated into market-data service)
# =============================================================================

resource "aws_api_gateway_method" "fx_rates_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.fx_rates.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "fx_rates_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.fx_rates.id
  http_method             = aws_api_gateway_method.fx_rates_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  # FX is now handled by market-data Lambda
  uri = var.lambda_invoke_arns["market_data"]
}

# Note: Lambda permission already granted via market_prices (source_arn uses /*/*/*)

# =============================================================================
# ANY /market/{proxy+} (PUBLIC - search, history, stats, binance endpoints)
# =============================================================================

resource "aws_api_gateway_method" "market_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.market_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "market_proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.market_proxy.id
  http_method             = aws_api_gateway_method.market_proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["market_data"]
}

# Note: Lambda permission already granted via market_prices (source_arn uses /*/*/*)

# ANY /fx/{proxy+} - catch-all for other FX routes (convert, currencies)
resource "aws_api_gateway_method" "fx_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.fx_proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "fx_proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.fx_proxy.id
  http_method             = aws_api_gateway_method.fx_proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  # FX is now handled by market-data Lambda
  uri = var.lambda_invoke_arns["market_data"]
}

# =============================================================================
# Portfolio endpoints (GET, PUT, DELETE)
# =============================================================================

resource "aws_api_gateway_method" "portfolio_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.portfolio.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "portfolio_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.portfolio.id
  http_method             = aws_api_gateway_method.portfolio_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["portfolio"]
}

resource "aws_lambda_permission" "portfolio" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["portfolio"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# Auth endpoints (with proxy for sub-paths like /auth/me)
# =============================================================================

# /auth - base path
resource "aws_api_gateway_method" "auth_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth.id
  http_method   = "ANY"
  authorization = "NONE" # Auth endpoints don't need JWT
}

resource "aws_api_gateway_integration" "auth_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth.id
  http_method             = aws_api_gateway_method.auth_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["auth"]
}

# /auth/{proxy+} - handles sub-paths like /auth/me, /auth/set-tokens, etc.
resource "aws_api_gateway_resource" "auth_proxy" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "auth_proxy_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_proxy.id
  http_method   = "ANY"
  authorization = "NONE" # Auth endpoints don't need JWT
}

resource "aws_api_gateway_integration" "auth_proxy_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_proxy.id
  http_method             = aws_api_gateway_method.auth_proxy_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["auth"]
}

resource "aws_lambda_permission" "auth" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["auth"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# Admin endpoints
# =============================================================================

resource "aws_api_gateway_method" "admin_any" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin.id
  http_method   = "ANY"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_any" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin.id
  http_method             = aws_api_gateway_method.admin_any.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["admin"]
}

resource "aws_lambda_permission" "admin" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["admin"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# Twitter endpoints (optional - influencer feed)
# =============================================================================

# ANY /twitter - base path
resource "aws_api_gateway_method" "twitter_any" {
  count         = var.enable_twitter_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.twitter[0].id
  http_method   = "ANY"
  authorization = "NONE" # Public endpoint
}

resource "aws_api_gateway_integration" "twitter_any" {
  count                   = var.enable_twitter_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.twitter[0].id
  http_method             = aws_api_gateway_method.twitter_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["twitter"]
}

# ANY /twitter/{proxy+} - handles sub-paths like /twitter/tweets
resource "aws_api_gateway_method" "twitter_proxy_any" {
  count         = var.enable_twitter_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.twitter_proxy[0].id
  http_method   = "ANY"
  authorization = "NONE" # Public endpoint
}

resource "aws_api_gateway_integration" "twitter_proxy_any" {
  count                   = var.enable_twitter_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.twitter_proxy[0].id
  http_method             = aws_api_gateway_method.twitter_proxy_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["twitter"]
}

resource "aws_lambda_permission" "twitter" {
  count         = var.enable_twitter_service ? 1 : 0
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["twitter"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# News endpoints (optional - news feed)
# =============================================================================

# ANY /news - base path
resource "aws_api_gateway_method" "news_any" {
  count         = var.enable_news_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.news[0].id
  http_method   = "ANY"
  authorization = "NONE" # Public endpoint
}

resource "aws_api_gateway_integration" "news_any" {
  count                   = var.enable_news_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.news[0].id
  http_method             = aws_api_gateway_method.news_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["news"]
}

resource "aws_lambda_permission" "news" {
  count         = var.enable_news_service ? 1 : 0
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["news"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# Community endpoints (optional - social features)
# =============================================================================

# ANY /community - base path
resource "aws_api_gateway_method" "community_any" {
  count         = var.enable_community_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.community[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "community_any" {
  count                   = var.enable_community_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.community[0].id
  http_method             = aws_api_gateway_method.community_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["community"]
}

# ANY /community/{proxy+} - handles sub-paths like /community/posts, /community/ticker/{ticker}
resource "aws_api_gateway_method" "community_proxy_any" {
  count         = var.enable_community_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.community_proxy[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "community_proxy_any" {
  count                   = var.enable_community_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.community_proxy[0].id
  http_method             = aws_api_gateway_method.community_proxy_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["community"]
}

resource "aws_lambda_permission" "community" {
  count         = var.enable_community_service ? 1 : 0
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["community"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# Payments endpoints (optional - LemonSqueezy subscription management)
# Webhook endpoint is PUBLIC (LemonSqueezy needs to call it)
# All other endpoints have JWT auth handled at Lambda level
# =============================================================================

# /payments
resource "aws_api_gateway_resource" "payments" {
  count       = var.enable_payments_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "payments"
}

# /payments/{proxy+} - catch-all for sub-paths (checkout, portal, subscription, webhook)
resource "aws_api_gateway_resource" "payments_proxy" {
  count       = var.enable_payments_service ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payments[0].id
  path_part   = "{proxy+}"
}

# ANY /payments - base path (no API GW auth — Lambda handles auth internally for webhook vs authenticated routes)
resource "aws_api_gateway_method" "payments_any" {
  count         = var.enable_payments_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payments_any" {
  count                   = var.enable_payments_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments[0].id
  http_method             = aws_api_gateway_method.payments_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["payments"]
}

# ANY /payments/{proxy+} - handles sub-paths (webhook, checkout, portal, subscription/{userId})
resource "aws_api_gateway_method" "payments_proxy_any" {
  count         = var.enable_payments_service ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments_proxy[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payments_proxy_any" {
  count                   = var.enable_payments_service ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments_proxy[0].id
  http_method             = aws_api_gateway_method.payments_proxy_any[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arns["payments"]
}

resource "aws_lambda_permission" "payments" {
  count         = var.enable_payments_service ? 1 : 0
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_names["payments"]
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*/*"
}

# =============================================================================
# CORS Support
# =============================================================================

locals {
  # Base CORS resources (always present)
  base_cors_resources = {
    auth          = aws_api_gateway_resource.auth.id
    auth_proxy    = aws_api_gateway_resource.auth_proxy.id
    market_prices = aws_api_gateway_resource.market_prices.id
    market_proxy  = aws_api_gateway_resource.market_proxy.id
    portfolio     = aws_api_gateway_resource.portfolio.id
    fx_rates      = aws_api_gateway_resource.fx_rates.id
    admin         = aws_api_gateway_resource.admin.id
  }

  # Optional CORS resources (conditional on feature flags)
  twitter_cors_resources = var.enable_twitter_service ? {
    twitter       = aws_api_gateway_resource.twitter[0].id
    twitter_proxy = aws_api_gateway_resource.twitter_proxy[0].id
  } : {}

  news_cors_resources = var.enable_news_service ? {
    news = aws_api_gateway_resource.news[0].id
  } : {}

  community_cors_resources = var.enable_community_service ? {
    community       = aws_api_gateway_resource.community[0].id
    community_proxy = aws_api_gateway_resource.community_proxy[0].id
  } : {}

  payments_cors_resources = var.enable_payments_service ? {
    payments       = aws_api_gateway_resource.payments[0].id
    payments_proxy = aws_api_gateway_resource.payments_proxy[0].id
  } : {}

  cors_resources = merge(
    local.base_cors_resources,
    local.twitter_cors_resources,
    local.news_cors_resources,
    local.community_cors_resources,
    local.payments_cors_resources,
  )
}

# Gateway Responses for CORS on error responses (4xx/5xx)
# This ensures CORS headers are returned even when auth fails
resource "aws_api_gateway_gateway_response" "unauthorized" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "UNAUTHORIZED"
  status_code   = "401"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'https://finpulse.me'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = "{\"message\": \"Unauthorized\", \"hint\": \"Please log in to access this resource\"}"
  }
}

resource "aws_api_gateway_gateway_response" "access_denied" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "ACCESS_DENIED"
  status_code   = "403"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'https://finpulse.me'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = "{\"message\": \"Access denied\"}"
  }
}

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'https://finpulse.me'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'https://finpulse.me'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = "{\"message\":$context.error.messageString}"
  }
}

resource "aws_api_gateway_method" "options" {
  for_each = local.cors_resources

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = "OPTIONS"
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }

  depends_on = [aws_api_gateway_method.options]
}

resource "aws_api_gateway_method_response" "options" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true
    "method.response.header.Access-Control-Allow-Methods"     = true
    "method.response.header.Access-Control-Allow-Origin"      = true
    "method.response.header.Access-Control-Allow-Credentials" = true
  }

  depends_on = [aws_api_gateway_method.options]
}

resource "aws_api_gateway_integration_response" "options" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = "OPTIONS"
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods"     = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"      = "'https://finpulse.me'"
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }

  depends_on = [aws_api_gateway_method_response.options]
}

# =============================================================================
# Deployment & Stage
# =============================================================================

resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_method.market_prices_get,
      aws_api_gateway_method.market_proxy_any,
      aws_api_gateway_method.fx_rates_get,
      aws_api_gateway_method.fx_proxy_any,
      aws_api_gateway_method.portfolio_any,
      aws_api_gateway_method.auth_any,
      aws_api_gateway_method.auth_proxy_any,
      aws_api_gateway_method.admin_any,
      aws_api_gateway_method.twitter_any,
      aws_api_gateway_method.twitter_proxy_any,
      aws_api_gateway_method.news_any,
      aws_api_gateway_method.community_any,
      aws_api_gateway_method.community_proxy_any,
      aws_api_gateway_method.payments_any,
      aws_api_gateway_method.payments_proxy_any,
      aws_api_gateway_method.options,
      aws_api_gateway_integration_response.options,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.market_prices_get,
    aws_api_gateway_integration.market_proxy_any,
    aws_api_gateway_integration.fx_rates_get,
    aws_api_gateway_integration.fx_proxy_any,
    aws_api_gateway_integration.portfolio_any,
    aws_api_gateway_integration.auth_any,
    aws_api_gateway_integration.admin_any,
    aws_api_gateway_integration.twitter_any,
    aws_api_gateway_integration.twitter_proxy_any,
    aws_api_gateway_integration.news_any,
    aws_api_gateway_integration.community_any,
    aws_api_gateway_integration.community_proxy_any,
    aws_api_gateway_integration.payments_any,
    aws_api_gateway_integration.payments_proxy_any,
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment

  cache_cluster_enabled = var.enable_caching
  cache_cluster_size    = var.enable_caching ? "0.5" : null

  # Enable CloudWatch logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  # Enable detailed CloudWatch metrics for throttling monitoring
  xray_tracing_enabled = var.enable_xray_tracing

  tags = var.tags

  depends_on = [aws_api_gateway_account.main]
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/api-gateway/${var.project_name}-${var.environment}"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}

# =============================================================================
# Method Settings (Caching for specific endpoints)
# =============================================================================

resource "aws_api_gateway_method_settings" "market_prices_cache" {
  count       = var.enable_caching ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "market/prices/GET"

  settings {
    caching_enabled      = true
    cache_ttl_in_seconds = 30 # 30s cache for market prices
  }
}

resource "aws_api_gateway_method_settings" "fx_rates_cache" {
  count       = var.enable_caching ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "fx/rates/GET"

  settings {
    caching_enabled      = true
    cache_ttl_in_seconds = 300 # 5 min cache for FX rates
  }
}

# =============================================================================
# Rate Limiting & Throttling
# =============================================================================

# Account-level default throttling settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "*/*"

  settings {
    # Throttling - applies to all endpoints by default
    throttling_burst_limit = var.throttle_burst_limit # Burst capacity
    throttling_rate_limit  = var.throttle_rate_limit  # Steady-state rate

    # Enable detailed CloudWatch metrics
    metrics_enabled    = true
    logging_level      = var.api_gateway_logging_level
    data_trace_enabled = var.environment != "prod" # Only in dev/staging
  }
}

# Public endpoints - more restrictive throttling to prevent abuse
resource "aws_api_gateway_method_settings" "market_prices" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "market/prices/GET"

  settings {
    # Lower limits for public endpoints (no auth)
    throttling_burst_limit = var.public_throttle_burst_limit
    throttling_rate_limit  = var.public_throttle_rate_limit

    metrics_enabled = true
    logging_level   = var.api_gateway_logging_level

    # Enable caching if configured
    caching_enabled      = var.enable_caching
    cache_ttl_in_seconds = var.enable_caching ? 30 : null
  }
}

resource "aws_api_gateway_method_settings" "fx_rates" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.main.stage_name
  method_path = "fx/rates/GET"

  settings {
    # Lower limits for public endpoints (no auth)
    throttling_burst_limit = var.public_throttle_burst_limit
    throttling_rate_limit  = var.public_throttle_rate_limit

    metrics_enabled = true
    logging_level   = var.api_gateway_logging_level

    # Enable caching if configured
    caching_enabled      = var.enable_caching
    cache_ttl_in_seconds = var.enable_caching ? 300 : null
  }
}

# Note: Admin endpoints use the global throttle settings from "*/*" above
# Admin-specific restrictive limits are enforced at the Lambda level via Cognito groups

# =============================================================================
# Usage Plans (Optional - for API key-based quotas)
# =============================================================================

# Usage plan for authenticated users
resource "aws_api_gateway_usage_plan" "authenticated" {
  name        = "${var.project_name}-authenticated-${var.environment}"
  description = "Usage plan for authenticated users"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  # Per-user quotas (optional)
  quota_settings {
    limit  = var.user_quota_limit  # Requests per period
    period = var.user_quota_period # DAY, WEEK, or MONTH
  }

  throttle_settings {
    burst_limit = var.throttle_burst_limit
    rate_limit  = var.throttle_rate_limit
  }

  tags = var.tags
}

# Usage plan for public/anonymous access
resource "aws_api_gateway_usage_plan" "public" {
  name        = "${var.project_name}-public-${var.environment}"
  description = "Usage plan for public endpoints"

  api_stages {
    api_id = aws_api_gateway_rest_api.main.id
    stage  = aws_api_gateway_stage.main.stage_name
  }

  quota_settings {
    limit  = var.public_quota_limit # Lower quota for public
    period = var.public_quota_period
  }

  throttle_settings {
    burst_limit = var.public_throttle_burst_limit
    rate_limit  = var.public_throttle_rate_limit
  }

  tags = var.tags
}

# =============================================================================
# CloudWatch Alarms for Rate Limiting
# =============================================================================

# 4xx and 5xx alarms removed — 5xx covered by cloudwatch module's api_5xx,
# 4xx too noisy for Free Tier alarm budget (10 alarms total).

# Alarm for high latency
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${var.project_name}-api-gateway-high-latency-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = var.latency_threshold_ms
  alarm_description   = "Alert when API Gateway latency is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
  }

  tags = var.tags
}

# Alarm for excessive requests (potential DoS)
resource "aws_cloudwatch_metric_alarm" "excessive_requests" {
  alarm_name          = "${var.project_name}-api-gateway-excessive-requests-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Count"
  namespace           = "AWS/ApiGateway"
  period              = 60 # 1 minute
  statistic           = "Sum"
  threshold           = var.request_count_threshold
  alarm_description   = "Alert when API Gateway receives excessive requests (potential DoS attack)"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiName = aws_api_gateway_rest_api.main.name
    Stage   = aws_api_gateway_stage.main.stage_name
  }

  tags = var.tags
}
