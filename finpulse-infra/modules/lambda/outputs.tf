# Lambda Module Outputs

output "lambda_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}

output "function_arns" {
  description = "Map of Lambda function ARNs"
  value = {
    auth        = aws_lambda_function.auth_service.arn
    market_data = aws_lambda_function.market_data_service.arn
    portfolio   = aws_lambda_function.portfolio_service.arn
    fx          = aws_lambda_function.fx_service.arn
    admin       = aws_lambda_function.admin_service.arn
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].arn : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].arn : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].arn : null
  }
}

output "function_names" {
  description = "Map of Lambda function names"
  value = {
    auth        = aws_lambda_function.auth_service.function_name
    market_data = aws_lambda_function.market_data_service.function_name
    portfolio   = aws_lambda_function.portfolio_service.function_name
    fx          = aws_lambda_function.fx_service.function_name
    admin       = aws_lambda_function.admin_service.function_name
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].function_name : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].function_name : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].function_name : null
  }
}

output "invoke_arns" {
  description = "Map of Lambda invoke ARNs (for API Gateway)"
  value = {
    auth        = aws_lambda_function.auth_service.invoke_arn
    market_data = aws_lambda_function.market_data_service.invoke_arn
    portfolio   = aws_lambda_function.portfolio_service.invoke_arn
    fx          = aws_lambda_function.fx_service.invoke_arn
    admin       = aws_lambda_function.admin_service.invoke_arn
    ai          = var.enable_ai_service ? aws_lambda_function.ai_service[0].invoke_arn : null
    news        = var.enable_news_service ? aws_lambda_function.news_service[0].invoke_arn : null
    community   = var.enable_community_service ? aws_lambda_function.community_service[0].invoke_arn : null
  }
}
