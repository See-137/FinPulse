# Secrets Module Variables
# This module references EXISTING secrets - it does not create or manage secret values

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "secret_names" {
  description = "List of secret names to reference (secrets must already exist in Secrets Manager)"
  type        = list(string)
  default = [
    # Alpaca is now the ONLY market data provider (stocks + crypto)
    # Replaces: coingecko-api-key, alphavantage-api-key, exchangerate-api-key
    "alpaca-credentials",

    # AI/LLM service
    "gemini-api-key",

    # News APIs (optional, for news feed feature)
    "gnews-api-key",
    "newsapi-key"
  ]
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
