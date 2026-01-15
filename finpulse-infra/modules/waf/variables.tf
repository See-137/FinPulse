# AWS WAF Variables

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}

variable "waf_rate_limit" {
  description = "Request rate limit per 5 minutes (per IP)"
  type        = number
  default     = 2000
}

variable "waf_allowed_countries" {
  description = "List of allowed countries (ISO 3166 codes). Empty = all countries allowed"
  type        = list(string)
  default     = []
}

variable "waf_alarm_threshold_blocked" {
  description = "CloudWatch alarm threshold for blocked requests (per 5 min)"
  type        = number
  default     = 100
}

variable "waf_alarm_threshold_rate_limit" {
  description = "CloudWatch alarm threshold for rate-limited requests (per min)"
  type        = number
  default     = 50
}
