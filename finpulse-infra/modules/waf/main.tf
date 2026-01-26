/**
 * AWS WAF Module for FinPulse
 * Protects CloudFront distribution from common web exploits
 */

resource "aws_wafv2_ip_set" "blacklist" {
  name               = "${var.project_name}-blacklist-${var.environment}"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = []

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-blacklist-${var.environment}"
    }
  )
}

resource "aws_wafv2_web_acl" "cloudfront" {
  name  = "${var.project_name}-waf-${var.environment}"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # ============================================================
  # AWS Managed Rules - Rate Limiting
  # ============================================================

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Exclude known false positives
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-common-rules-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # AWS Managed Rules - Known Bad Inputs
  # ============================================================

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-known-bad-inputs-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # AWS Managed Rules - SQL Injection Protection
  # ============================================================

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-sqli-rules-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # AWS Managed Rules - Regex Pattern Set (Rate Limiting)
  # ============================================================

  rule {
    name     = "RateLimitRule"
    priority = 4

    action {
      block {
        custom_response {
          response_code = 429
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit # Default 2000 requests per 5 mins
        aggregate_key_type = "IP"

        # Don't count CloudFront requests against rate limit
        scope_down_statement {
          not_statement {
            statement {
              byte_match_statement {
                search_string = "CloudFront"
                field_to_match {
                  single_header {
                    name = "user-agent"
                  }
                }
                text_transformation {
                  priority = 0
                  type     = "LOWERCASE"
                }
                positional_constraint = "CONTAINS"
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-rate-limit-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # IP Reputation List (AWS-managed)
  # ============================================================

  rule {
    name     = "AWSManagedRulesAmazonIpReputationList"
    priority = 5

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-ip-reputation-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # Bot Control (Optional - requires additional licensing)
  # ============================================================

  rule {
    name     = "AWSManagedRulesBotControlRuleSet"
    priority = 6

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        # Allow CloudFront health checks
        rule_action_override {
          name = "CategoryHttpLibrary"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-bot-control-${var.environment}"
      sampled_requests_enabled   = true
    }
  }

  # ============================================================
  # Geo IP Blocking (Optional)
  # ============================================================

  dynamic "rule" {
    for_each = length(var.waf_allowed_countries) > 0 ? [1] : []

    content {
      name     = "GeoBlockingRule"
      priority = 7

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.waf_allowed_countries
          # Invert = true means block traffic from these countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project_name}-geo-blocking-${var.environment}"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-metrics-${var.environment}"
    sampled_requests_enabled   = true
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-waf-${var.environment}"
    }
  )
}

# ============================================================
# CloudWatch Logging
# ============================================================

resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  resource_arn = aws_wafv2_web_acl.cloudfront.arn
  # WAF logging requires just the log group ARN (without :* suffix)
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  logging_filter {
    default_behavior = "KEEP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "COUNT"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

resource "aws_cloudwatch_log_group" "waf" {
  # WAF logging requires log group name to start with "aws-waf-logs-"
  name              = "aws-waf-logs-${var.project_name}-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = merge(
    var.tags,
    {
      Name = "${var.project_name}-waf-logs-${var.environment}"
    }
  )
}

# ============================================================
# CloudWatch Alarms for WAF
# ============================================================

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${var.project_name}-waf-blocked-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = var.waf_alarm_threshold_blocked
  alarm_description   = "Alert when WAF blocks high number of requests (possible attack)"

  dimensions = {
    WebACL = aws_wafv2_web_acl.cloudfront.name
    Region = "GLOBAL"
    Rule   = "ALL"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limited_requests" {
  alarm_name          = "${var.project_name}-waf-rate-limited-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 60
  statistic           = "Sum"
  threshold           = var.waf_alarm_threshold_rate_limit
  alarm_description   = "Alert when rate limiting is triggered frequently"

  dimensions = {
    WebACL = aws_wafv2_web_acl.cloudfront.name
    Region = "GLOBAL"
    Rule   = "RateLimitRule"
  }

  tags = var.tags
}

# ============================================================
# Outputs
# ============================================================

output "waf_acl_id" {
  description = "WAF ACL ID"
  value       = aws_wafv2_web_acl.cloudfront.id
}

output "waf_acl_arn" {
  description = "WAF ACL ARN (use this to attach to CloudFront)"
  value       = aws_wafv2_web_acl.cloudfront.arn
}
