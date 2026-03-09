# FinPulse Infrastructure - Main Configuration
# Sweet middle ground: Lambda + CloudWatch + API Gateway

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.35"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  backend "s3" {
    bucket         = "finpulse-terraform-state-383349724213"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
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
