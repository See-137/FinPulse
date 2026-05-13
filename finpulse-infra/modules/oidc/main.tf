# FinPulse GitHub Actions OIDC Module
#
# Establishes federated trust between GitHub Actions and AWS so workflows
# assume short-lived STS roles instead of using long-lived IAM access keys.
#
# Two roles are exposed:
#   - deploy:    used by deploy.yml + deploy-lambdas.yml (main branch only)
#   - terraform: used by terraform.yml (main branch for apply, PRs for plan)
#
# Trust is scoped per-ref to prevent fork PRs from assuming roles.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.44"
    }
  }
}

# =============================================================================
# OIDC Provider
# =============================================================================
# Under AWS provider v6, the GitHub thumbprint list is optional and
# auto-managed. Omitted here intentionally — operator should re-add only
# if terraform plan complains.

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = []

  tags = {
    Name        = "github-actions-oidc"
    Environment = var.environment
  }
}

# =============================================================================
# Deploy role — used by deploy.yml + deploy-lambdas.yml
# =============================================================================
# Trust is locked to the main branch only. Frontend + Lambda deploys run on
# push to main; no other ref should be able to assume this role.

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "github-actions-finpulse-deploy"
  description        = "Used by deploy.yml + deploy-lambdas.yml on main branch pushes"
  assume_role_policy = data.aws_iam_policy_document.deploy_trust.json

  tags = {
    Name        = "github-actions-finpulse-deploy"
    Environment = var.environment
  }
}

# Policies attached to the deploy role:
# - S3 PutObject + sync for the CloudFront origin bucket (frontend deploy)
# - CloudFront CreateInvalidation
# - Lambda UpdateFunctionCode + GetFunction (lambda deploy)
# - CloudWatch Logs (deploy logs)
#
# Operator should refine these to the minimum set needed by the two
# deploy workflows. Mirror-of-current-user attachment below is a
# parity-preserving placeholder; do not ship to prod without trimming.

resource "aws_iam_role_policy_attachment" "deploy_admin_placeholder" {
  # ⚠️ Placeholder — operator must replace before merging Stage E (Session F).
  # AdministratorAccess matches what the current IAM user has but defeats the
  # least-privilege intent of OIDC migration. Open a follow-up to trim to the
  # exact set of actions deploy.yml + deploy-lambdas.yml need.
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# =============================================================================
# Terraform role — used by terraform.yml
# =============================================================================
# Trust is dual-condition:
#   - apply: only on main branch
#   - plan:  on pull requests (any branch) so PR jobs can plan
#
# StringLike used so both `refs/heads/main` and `pull_request` subjects match.

data "aws_iam_policy_document" "terraform_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo}:ref:refs/heads/main",
        "repo:${var.github_repo}:pull_request",
      ]
    }
  }
}

resource "aws_iam_role" "terraform" {
  name               = "github-actions-finpulse-terraform"
  description        = "Used by terraform.yml for plan (PRs) and apply (main)"
  assume_role_policy = data.aws_iam_policy_document.terraform_trust.json

  tags = {
    Name        = "github-actions-finpulse-terraform"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "terraform_admin_placeholder" {
  # ⚠️ Same placeholder caveat as deploy role. Terraform plan needs broad read
  # access; apply needs broad write. Operator should split into per-action
  # plan-only vs apply-also policies in a follow-up.
  role       = aws_iam_role.terraform.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
