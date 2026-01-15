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

  # SECURITY FIX: Enable encryption in transit
  # Note: at-rest encryption requires using aws_elasticache_replication_group instead
  transit_encryption_enabled = true

  # Maintenance window (Sunday 3-4 AM UTC)
  maintenance_window = "sun:03:00-sun:04:00"

  # Snapshot (optional, adds cost)
  snapshot_retention_limit = var.environment == "prod" ? 1 : 0

  tags = var.tags
}
