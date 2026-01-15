# Secrets Module Outputs
# References to existing secrets (not managed by Terraform)

output "secret_arns" {
  description = "Map of secret names to ARNs"
  value       = { for k, v in data.aws_secretsmanager_secret.api_keys : k => v.arn }
}

output "secret_names" {
  description = "Map of secret names to full names"
  value       = { for k, v in data.aws_secretsmanager_secret.api_keys : k => v.name }
}
