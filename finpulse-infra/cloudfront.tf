# FinPulse CloudFront Distribution
# =============================================================================
# This manages the CloudFront distribution for the frontend SPA
# Import existing distribution: terraform import aws_cloudfront_distribution.frontend E2Y4NTEFQ5LYOK
# =============================================================================

# S3 bucket for frontend (reference existing bucket)
data "aws_s3_bucket" "frontend" {
  bucket = "finpulse-frontend-prod-${data.aws_caller_identity.current.account_id}"
}

# ACM certificate (reference existing certificate)
data "aws_acm_certificate" "frontend" {
  domain   = "finpulse.me"
  statuses = ["ISSUED"]
}

# CloudFront Origin Access Control (for S3 website endpoint, we use custom origin)
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "FinPulse Frontend"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  http_version        = "http2"

  aliases = ["finpulse.me", "www.finpulse.me"]

  # Origin - S3 website endpoint (custom origin for SPA)
  origin {
    domain_name = "${data.aws_s3_bucket.frontend.bucket}.s3-website-${var.aws_region}.amazonaws.com"
    origin_id   = "S3-finpulse-frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      # SECURITY FIX: Remove deprecated TLS 1.0/1.1 protocols
      origin_ssl_protocols = ["TLSv1.2"]
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-finpulse-frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # SPA Error Pages - Return index.html for client-side routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 300
  }

  # SSL Certificate
  # SECURITY FIX: Upgrade to TLS 1.2_2021 (latest secure version supported)
  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # No geo restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name        = "finpulse-frontend-${var.environment}"
    Environment = var.environment
    Project     = "FinPulse"
    ManagedBy   = "Terraform"
  }

  # Prevent accidental destruction
  lifecycle {
    prevent_destroy = true
  }
}

# Output CloudFront details
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}
