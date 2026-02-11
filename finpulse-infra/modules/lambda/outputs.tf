# Lambda Module Outputs

output "lambda_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}

output "shared_layer_arn" {
  description = "Shared utilities Lambda layer ARN"
  value       = var.enable_shared_layer && var.shared_layer_zip_path != "" ? aws_lambda_layer_version.shared_utils[0].arn : null
}

output "shared_layer_version" {
  description = "Shared utilities Lambda layer version"
  value       = var.enable_shared_layer && var.shared_layer_zip_path != "" ? aws_lambda_layer_version.shared_utils[0].version : null
}

output "function_arns" {
  description = "Map of Lambda function ARNs"
  value = {
    auth        = aws_lambda_function.auth_service.arn
    market_data = aws_lambda_function.market_data_service.arn
    portfolio   = aws_lambda_function.portfolio_service.arn
    admin       = aws_lambda_function.admin_service.arn
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].arn : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].arn : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].arn : null
    # fx removed - merged into market_data
  }
}

output "function_names" {
  description = "Map of Lambda function names"
  value = {
    auth        = aws_lambda_function.auth_service.function_name
    market_data = aws_lambda_function.market_data_service.function_name
    portfolio   = aws_lambda_function.portfolio_service.function_name
    admin       = aws_lambda_function.admin_service.function_name
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].function_name : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].function_name : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].function_name : null
    # fx removed - merged into market_data
  }
}

output "invoke_arns" {
  description = "Map of Lambda invoke ARNs (for API Gateway)"
  value = {
    auth        = aws_lambda_function.auth_service.invoke_arn
    market_data = aws_lambda_function.market_data_service.invoke_arn
    portfolio   = aws_lambda_function.portfolio_service.invoke_arn
    admin       = aws_lambda_function.admin_service.invoke_arn
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].invoke_arn : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].invoke_arn : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].invoke_arn : null
    # fx removed - merged into market_data
  }
}
