# API Gateway Module Outputs

output "api_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_name" {
  description = "API Gateway REST API name"
  value       = aws_api_gateway_rest_api.main.name
}

output "api_endpoint" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.main.stage_name
}

output "execution_arn" {
  description = "API Gateway execution ARN"
  value       = aws_api_gateway_rest_api.main.execution_arn
}

output "usage_plan_authenticated_id" {
  description = "Usage plan ID for authenticated users"
  value       = aws_api_gateway_usage_plan.authenticated.id
}

output "usage_plan_public_id" {
  description = "Usage plan ID for public access"
  value       = aws_api_gateway_usage_plan.public.id
}

output "cloudwatch_alarm_latency_arn" {
  description = "CloudWatch alarm ARN for high latency"
  value       = aws_cloudwatch_metric_alarm.high_latency.arn
}

output "cloudwatch_alarm_requests_arn" {
  description = "CloudWatch alarm ARN for excessive requests"
  value       = aws_cloudwatch_metric_alarm.excessive_requests.arn
}
