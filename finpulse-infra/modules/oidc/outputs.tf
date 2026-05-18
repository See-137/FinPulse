output "deploy_role_arn" {
  description = "Role ARN for deploy.yml + deploy-lambdas.yml to assume."
  value       = aws_iam_role.deploy.arn
}

output "terraform_role_arn" {
  description = "Role ARN for terraform.yml to assume (plan on PRs, apply on main)."
  value       = aws_iam_role.terraform.arn
}

output "oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.github.arn
}
