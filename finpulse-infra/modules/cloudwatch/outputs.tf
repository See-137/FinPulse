# CloudWatch Module Outputs

output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "alarms" {
  description = "List of alarm names"
  value = concat(
    [for k, v in aws_cloudwatch_metric_alarm.lambda_errors : v.alarm_name],
    [for k, v in aws_cloudwatch_metric_alarm.lambda_duration : v.alarm_name],
    [for k, v in aws_cloudwatch_metric_alarm.dynamodb_throttle : v.alarm_name],
    var.redis_cluster_id != "" ? [aws_cloudwatch_metric_alarm.redis_memory[0].alarm_name] : [],
    var.api_gateway_name != "" ? [
      aws_cloudwatch_metric_alarm.api_5xx[0].alarm_name,
      aws_cloudwatch_metric_alarm.api_latency[0].alarm_name
    ] : []
  )
}
