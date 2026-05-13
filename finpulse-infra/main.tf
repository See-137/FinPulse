# FinPulse Infrastructure - Main Configuration
# Sweet middle ground: Lambda + CloudWatch + API Gateway

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.44"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Backend config is supplied via -backend-config=prod.tfbackend so the
  # bucket/key/region/lock table are not hardcoded and the module can be
  # reused across environments without code changes.
  backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "FinPulse"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Get current AWS account info
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables
locals {
  project_name = "finpulse"

  common_tags = {
    Project     = "FinPulse"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
