# Cognito Module Variables

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "password_min_length" {
  description = "Minimum password length"
  type        = number
  default     = 8
}

variable "mfa_configuration" {
  description = "MFA configuration (OFF, ON, OPTIONAL)"
  type        = string
  default     = "OPTIONAL"
}

# =============================================================================
# OAuth / Social Sign-In Settings
# =============================================================================

variable "enable_google_sso" {
  description = "Enable Google Sign-In"
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "oauth_callback_urls" {
  description = "Allowed OAuth callback URLs"
  type        = list(string)
  default     = ["http://localhost:5173/oauth/callback"]
}

variable "oauth_logout_urls" {
  description = "Allowed OAuth logout URLs"
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "cognito_domain_prefix" {
  description = "Cognito hosted UI domain prefix (must be globally unique)"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
