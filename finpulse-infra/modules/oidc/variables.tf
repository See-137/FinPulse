variable "environment" {
  description = "Environment tag applied to all OIDC resources (e.g. prod, staging)."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository in `owner/name` form. Used to scope OIDC trust conditions."
  type        = string
  default     = "see-137/finpulse"

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repo))
    error_message = "github_repo must be in 'owner/name' form (e.g. see-137/finpulse)."
  }
}
