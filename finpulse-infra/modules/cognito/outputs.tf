# Cognito Module Outputs

output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint"
  value       = aws_cognito_user_pool.main.endpoint
}

output "client_id" {
  description = "Cognito User Pool Client ID"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_domain" {
  description = "Cognito hosted UI domain"
  value       = var.enable_google_sso && var.cognito_domain_prefix != "" ? "https://${var.cognito_domain_prefix}.auth.${data.aws_region.current.name}.amazoncognito.com" : null
}

output "google_sso_enabled" {
  description = "Whether Google SSO is enabled"
  value       = var.enable_google_sso
}

# Data source for region
data "aws_region" "current" {}
