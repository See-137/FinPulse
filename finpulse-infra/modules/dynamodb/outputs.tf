# DynamoDB Module Outputs

output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "users_table_arn" {
  value = aws_dynamodb_table.users.arn
}

output "portfolios_table_name" {
  value = aws_dynamodb_table.portfolios.name
}

output "portfolios_table_arn" {
  value = aws_dynamodb_table.portfolios.arn
}

output "market_prices_table_name" {
  value = aws_dynamodb_table.market_prices.name
}

output "market_prices_table_arn" {
  value = aws_dynamodb_table.market_prices.arn
}

output "ai_queries_table_name" {
  value = aws_dynamodb_table.ai_queries.name
}

output "ai_queries_table_arn" {
  value = aws_dynamodb_table.ai_queries.arn
}

output "news_table_name" {
  value = aws_dynamodb_table.news.name
}

output "news_table_arn" {
  value = aws_dynamodb_table.news.arn
}

output "community_posts_table_name" {
  value = aws_dynamodb_table.community_posts.name
}

output "community_posts_table_arn" {
  value = aws_dynamodb_table.community_posts.arn
}

output "circuit_breaker_table_name" {
  value = aws_dynamodb_table.circuit_breaker.name
}

output "circuit_breaker_table_arn" {
  value = aws_dynamodb_table.circuit_breaker.arn
}

# New caching infrastructure tables

output "api_cache_table_name" {
  value = aws_dynamodb_table.api_cache.name
}

output "api_cache_table_arn" {
  value = aws_dynamodb_table.api_cache.arn
}

output "historical_prices_table_name" {
  value = aws_dynamodb_table.historical_prices.name
}

output "historical_prices_table_arn" {
  value = aws_dynamodb_table.historical_prices.arn
}

output "api_quota_table_name" {
  value = aws_dynamodb_table.api_quota.name
}

output "api_quota_table_arn" {
  value = aws_dynamodb_table.api_quota.arn
}

output "all_table_names" {
  value = [
    aws_dynamodb_table.users.name,
    aws_dynamodb_table.portfolios.name,
    aws_dynamodb_table.market_prices.name,
    aws_dynamodb_table.ai_queries.name,
    aws_dynamodb_table.news.name,
    aws_dynamodb_table.community_posts.name,
    aws_dynamodb_table.circuit_breaker.name,
    aws_dynamodb_table.api_cache.name,
    aws_dynamodb_table.historical_prices.name,
    aws_dynamodb_table.api_quota.name,
    aws_dynamodb_table.identities.name,
    aws_dynamodb_table.subscriptions.name,
  ]
}

output "identities_table_name" {
  value = aws_dynamodb_table.identities.name
}

output "identities_table_arn" {
  value = aws_dynamodb_table.identities.arn
}

output "subscriptions_table_name" {
  value = aws_dynamodb_table.subscriptions.name
}

output "subscriptions_table_arn" {
  value = aws_dynamodb_table.subscriptions.arn
}
