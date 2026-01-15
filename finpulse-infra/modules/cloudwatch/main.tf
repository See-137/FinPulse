# FinPulse CloudWatch Alarms Module
# Essential SRE alerts - not overkill, just the important stuff

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# SNS Topic for Alerts
# =============================================================================

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts-${var.environment}"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# =============================================================================
# Lambda Alarms - Error Rate
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.lambda_function_names

  alarm_name          = "${var.project_name}-${each.key}-errors-${var.environment}"
  alarm_description   = "Lambda ${each.key} error rate > ${var.lambda_error_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = var.lambda_error_threshold

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = each.value
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = each.value
      }
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  treat_missing_data = "notBreaching" # No alerts when no traffic
  tags               = var.tags
}

# =============================================================================
# Lambda Duration Alarm (Approaching Timeout)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = var.lambda_function_names

  alarm_name          = "${var.project_name}-${each.key}-duration-${var.environment}"
  alarm_description   = "Lambda ${each.key} duration > 80% of timeout"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 24000 # 24 seconds (80% of 30s timeout)

  dimensions = {
    FunctionName = each.value
  }

  alarm_actions      = [aws_sns_topic.alerts.arn]
  treat_missing_data = "notBreaching"
  tags               = var.tags
}

# =============================================================================
# DynamoDB Throttling Alarm
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttle" {
  for_each = toset(var.dynamodb_table_names)

  alarm_name          = "${var.project_name}-dynamodb-throttle-${each.value}-${var.environment}"
  alarm_description   = "DynamoDB table ${each.value} is being throttled"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 1

  metric_query {
    id          = "throttles"
    expression  = "read_throttle + write_throttle"
    label       = "Total Throttles"
    return_data = true
  }

  metric_query {
    id = "read_throttle"
    metric {
      metric_name = "ReadThrottledRequests"
      namespace   = "AWS/DynamoDB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        TableName = each.value
      }
    }
  }

  metric_query {
    id = "write_throttle"
    metric {
      metric_name = "WriteThrottledRequests"
      namespace   = "AWS/DynamoDB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        TableName = each.value
      }
    }
  }

  alarm_actions      = [aws_sns_topic.alerts.arn]
  treat_missing_data = "notBreaching"
  tags               = var.tags
}

# =============================================================================
# Redis Memory Alarm
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  count = var.redis_cluster_id != "" ? 1 : 0

  alarm_name          = "${var.project_name}-redis-memory-${var.environment}"
  alarm_description   = "Redis memory usage > ${var.redis_memory_threshold}%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = var.redis_memory_threshold

  dimensions = {
    CacheClusterId = var.redis_cluster_id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = var.tags
}

# =============================================================================
# API Gateway 5xx Errors
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  count = var.api_gateway_name != "" ? 1 : 0

  alarm_name          = "${var.project_name}-api-5xx-${var.environment}"
  alarm_description   = "API Gateway 5xx errors > ${var.api_5xx_threshold}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = var.api_5xx_threshold

  dimensions = {
    ApiName = var.api_gateway_name
  }

  alarm_actions      = [aws_sns_topic.alerts.arn]
  treat_missing_data = "notBreaching"
  tags               = var.tags
}

# =============================================================================
# API Gateway Latency (p95)
# =============================================================================

resource "aws_cloudwatch_metric_alarm" "api_latency" {
  count = var.api_gateway_name != "" ? 1 : 0

  alarm_name          = "${var.project_name}-api-latency-${var.environment}"
  alarm_description   = "API Gateway p95 latency > ${var.api_latency_threshold}ms"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  extended_statistic  = "p95"
  threshold           = var.api_latency_threshold

  dimensions = {
    ApiName = var.api_gateway_name
  }

  alarm_actions      = [aws_sns_topic.alerts.arn]
  treat_missing_data = "notBreaching"
  tags               = var.tags
}

# =============================================================================
# Dashboard (Simple Overview)
# =============================================================================

# Filter out null function names
locals {
  valid_lambda_functions = { for k, v in var.lambda_function_names : k => v if v != null }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # Lambda Invocations
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Invocations"
          region = var.aws_region
          metrics = [
            for name, fn in local.valid_lambda_functions : [
              "AWS/Lambda", "Invocations", "FunctionName", fn, { label = name }
            ]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      # Lambda Errors
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Errors"
          region = var.aws_region
          metrics = [
            for name, fn in local.valid_lambda_functions : [
              "AWS/Lambda", "Errors", "FunctionName", fn, { label = name }
            ]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      # Lambda Duration
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Lambda Duration (p95)"
          region = var.aws_region
          metrics = [
            for name, fn in local.valid_lambda_functions : [
              "AWS/Lambda", "Duration", "FunctionName", fn, { label = name, stat = "p95" }
            ]
          ]
          period = 300
        }
      },
      # Redis Memory
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title  = "Redis Memory %"
          region = var.aws_region
          metrics = var.redis_cluster_id != "" ? [
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", "CacheClusterId", var.redis_cluster_id]
          ] : []
          period = 300
        }
      }
    ]
  })
}
