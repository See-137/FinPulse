# FinPulse Redis Module
# ElastiCache Redis for caching

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# =============================================================================
# Subnet Group
# =============================================================================

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = var.tags
}

# =============================================================================
# Redis Cluster
# =============================================================================

resource "aws_elasticache_cluster" "main" {
  cluster_id           = "${var.project_name}-cache-${var.environment}"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = var.security_group_ids

  # Transit encryption enabled for security (Phase 4 improvement)
  # WARNING: Enabling forces cluster REPLACEMENT (causes downtime ~5-10 min)
  # User approved this change for scheduled maintenance window
  transit_encryption_enabled = true

  # Maintenance window (Sunday 3-4 AM UTC)
  maintenance_window = "sun:03:00-sun:04:00"

  # Snapshot before replacement to enable recovery if needed
  snapshot_retention_limit = var.environment == "prod" ? 1 : 0

  tags = var.tags

  # Note: No lifecycle ignore_changes for transit_encryption
  # This allows the Phase 4 security upgrade to apply
}
