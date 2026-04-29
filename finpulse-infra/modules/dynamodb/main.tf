# FinPulse DynamoDB Module
# 7 tables with proper indexes for the 8 microservices

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Users Table
# =============================================================================

resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-users-${var.environment}"
  billing_mode = var.billing_mode
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
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Portfolios Table
# =============================================================================

resource "aws_dynamodb_table" "portfolios" {
  name         = "${var.project_name}-portfolios-${var.environment}"
  billing_mode = var.billing_mode
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
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Market Prices Table (Circuit Breaker Fallback)
# =============================================================================

resource "aws_dynamodb_table" "market_prices" {
  name         = "${var.project_name}-market-prices-${var.environment}"
  billing_mode = var.billing_mode
  hash_key     = "symbol"

  attribute {
    name = "symbol"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# AI Queries Table
# =============================================================================

resource "aws_dynamodb_table" "ai_queries" {
  name         = "${var.project_name}-ai-queries-${var.environment}"
  billing_mode = var.billing_mode
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
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# News Table
# =============================================================================

resource "aws_dynamodb_table" "news" {
  name         = "${var.project_name}-news-${var.environment}"
  billing_mode = var.billing_mode
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
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Community Posts Table
# =============================================================================

resource "aws_dynamodb_table" "community_posts" {
  name         = "${var.project_name}-community-posts-${var.environment}"
  billing_mode = var.billing_mode
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
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Circuit Breaker Table
# =============================================================================

resource "aws_dynamodb_table" "circuit_breaker" {
  name         = "${var.project_name}-circuit-breaker-${var.environment}"
  billing_mode = var.billing_mode
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

  tags = var.tags
}

# =============================================================================
# API Cache Table (Warm Cache with TTL)
# Stores API responses for deduplication and rate limit management
# =============================================================================

resource "aws_dynamodb_table" "api_cache" {
  name         = "${var.project_name}-api-cache-${var.environment}"
  billing_mode = var.billing_mode
  hash_key     = "cacheKey"

  attribute {
    name = "cacheKey"
    type = "S"
  }

  attribute {
    name = "dataType"
    type = "S"
  }

  attribute {
    name = "fetchedAt"
    type = "N"
  }

  # Query by data type (quotes, profiles, financials)
  global_secondary_index {
    name            = "dataType-fetchedAt-index"
    hash_key        = "dataType"
    range_key       = "fetchedAt"
    projection_type = "ALL"
  }

  # Auto-expire cached data
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Historical Prices Table (Cold Storage - Never Expires)
# Stores historical price data for charting and analysis
# =============================================================================

resource "aws_dynamodb_table" "historical_prices" {
  name         = "${var.project_name}-historical-prices-${var.environment}"
  billing_mode = var.billing_mode
  hash_key     = "symbol"
  range_key    = "date"

  attribute {
    name = "symbol"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "assetType"
    type = "S"
  }

  # Query by asset type (stock, crypto) and date range
  global_secondary_index {
    name            = "assetType-date-index"
    hash_key        = "assetType"
    range_key       = "date"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# API Quota Table (Usage Tracking)
# Tracks daily API usage per provider for quota management
# =============================================================================

resource "aws_dynamodb_table" "api_quota" {
  name         = "${var.project_name}-api-quota-${var.environment}"
  billing_mode = var.billing_mode
  hash_key     = "providerDate"

  attribute {
    name = "providerDate"
    type = "S"
  }

  attribute {
    name = "provider"
    type = "S"
  }

  # Query usage by provider across dates
  global_secondary_index {
    name            = "provider-index"
    hash_key        = "provider"
    projection_type = "ALL"
  }

  # Auto-expire old quota records after 90 days
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# Subscriptions Table (LemonSqueezy subscription tracking)
# =============================================================================

resource "aws_dynamodb_table" "subscriptions" {
  name         = "${var.project_name}-subscriptions"
  billing_mode = var.billing_mode
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  # GSI key — the LemonSqueezy subscription id, populated by
  # handleSubscriptionCreated in payments Lambda.
  attribute {
    name = "lemonSqueezySubscriptionId"
    type = "S"
  }

  # GSI: look up subscription by LemonSqueezy subscription id.
  # Replaces the O(table) Scan currently used by handleSubscriptionUpdated /
  # handleSubscriptionCancelled / handleSubscriptionExpired in payments Lambda
  # when custom_data.user_id is missing on a webhook delivery.
  # Build is non-disruptive (additive) but takes minutes-to-hours depending
  # on table size — Lambda code switching to Query against this index must
  # wait until status reflects ACTIVE.
  global_secondary_index {
    name            = "lemonSqueezySubscriptionId-index"
    hash_key        = "lemonSqueezySubscriptionId"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}

# =============================================================================
# User Identities Table (for SSO / OAuth providers)
# =============================================================================
# Supports multiple identity providers per user (Google, Apple, etc.)
# Schema: userId (PK) + provider#providerSubject (SK)
# Enables: account linking, multiple sign-in methods per user

resource "aws_dynamodb_table" "identities" {
  name         = "${var.project_name}-identities-${var.environment}"
  billing_mode = var.billing_mode
  hash_key     = "userId"
  range_key    = "identityKey" # Format: "provider#providerSubject" e.g., "google#117234567890"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "identityKey"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  attribute {
    name = "provider"
    type = "S"
  }

  # GSI: Look up user by email (for account linking / collision detection)
  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    range_key       = "provider"
    projection_type = "ALL"
  }

  # GSI: Look up identity by provider + subject (for sign-in)
  global_secondary_index {
    name            = "provider-subject-index"
    hash_key        = "identityKey"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_pitr
  }

  server_side_encryption {
    enabled = true
  }

  tags = var.tags
}
