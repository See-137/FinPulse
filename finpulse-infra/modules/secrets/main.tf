# FinPulse Secrets Module
# AWS Secrets Manager for API keys
#
# IMPORTANT: Secrets are managed OUTSIDE of Terraform (via AWS Console or CLI)
# This module only REFERENCES existing secrets to provide ARNs to other modules

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Reference Existing Secrets (NOT managed by Terraform)
# =============================================================================

locals {
  # Secret names that should already exist in Secrets Manager
  secret_names = toset(var.secret_names)
}

# Data source to reference existing secrets - does NOT create or modify them
data "aws_secretsmanager_secret" "api_keys" {
  for_each = local.secret_names

  name = "${var.project_name}/${var.environment}/${each.key}"
}
