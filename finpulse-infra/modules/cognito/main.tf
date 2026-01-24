# FinPulse Cognito Module
# User authentication with email-based signup

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Cognito User Pool
# =============================================================================

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users-${var.environment}"

  # Email-based signup (use username_attributes OR alias_attributes, not both)
  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  # Password policy
  password_policy {
    minimum_length    = var.password_min_length
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # User attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = false

    string_attribute_constraints {
      min_length = 5
      max_length = 254
    }
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  # MFA configuration - OFF, OPTIONAL, or ON
  # When OPTIONAL/ON, need to enable software token (TOTP)
  mfa_configuration = var.mfa_configuration

  dynamic "software_token_mfa_configuration" {
    for_each = var.mfa_configuration != "OFF" ? [1] : []
    content {
      enabled = true
    }
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Advanced security - disabled for Essentials pricing tier
  # Enable only if upgraded to Plus tier
  # user_pool_add_ons {
  #   advanced_security_mode = "ENFORCED"
  # }

  # Deletion protection (prod only)
  deletion_protection = var.environment == "prod" ? "ACTIVE" : "INACTIVE"

  tags = var.tags

  # Lifecycle: ignore changes to prevent recreation of imported resources
  # The prod-v2 pool was imported with name "finpulse-users-prod-v2"
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      name,              # Imported resource has different name suffix
      user_pool_add_ons, # Requires Plus tier, ignore if already set in AWS
      schema             # Schema cannot be changed after pool creation
    ]
  }
}

# =============================================================================
# User Pool Client (for React frontend)
# =============================================================================

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.project_name}-frontend-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for SPA (false is AWS default)
  # Note: Don't set generate_secret if importing existing client
  # as it forces replacement even when unchanged

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]

  # Token validity
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # Supported identity providers
  supported_identity_providers = var.enable_google_sso ? ["COGNITO", "Google"] : ["COGNITO"]

  # OAuth configuration (required for social sign-in)
  allowed_oauth_flows_user_pool_client = var.enable_google_sso
  allowed_oauth_flows                  = var.enable_google_sso ? ["code"] : []
  allowed_oauth_scopes                 = var.enable_google_sso ? ["email", "openid", "profile"] : []
  callback_urls                        = var.enable_google_sso ? var.oauth_callback_urls : []
  logout_urls                          = var.enable_google_sso ? var.oauth_logout_urls : []

  # Prevent accidental recreation of production client
  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      generate_secret,
      name,                    # Imported resource has different name suffix
      allowed_oauth_flows,     # Imported resource may have additional flows
      access_token_validity,   # AWS returns 0 for default values
      id_token_validity        # AWS returns 0 for default values
    ]
  }
}

# =============================================================================
# Cognito Domain (required for OAuth flows)
# =============================================================================

resource "aws_cognito_user_pool_domain" "main" {
  count = var.enable_google_sso && var.cognito_domain_prefix != "" ? 1 : 0

  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# =============================================================================
# Google Identity Provider
# =============================================================================

resource "aws_cognito_identity_provider" "google" {
  count = var.enable_google_sso ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id                     = var.google_client_id
    client_secret                 = var.google_client_secret
    authorize_scopes              = "email profile openid"
    attributes_url                = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url                 = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer                   = "https://accounts.google.com"
    token_request_method          = "POST"
    token_url                     = "https://www.googleapis.com/oauth2/v4/token"
  }

  # Map Google attributes to Cognito attributes
  attribute_mapping = {
    email    = "email"
    name     = "name"
    username = "sub"
    picture  = "picture"
  }

  lifecycle {
    ignore_changes = [
      provider_details["client_secret"]
    ]
  }
}
