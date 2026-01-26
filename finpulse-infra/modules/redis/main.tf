# FinPulse Redis Module
# ElastiCache Redis Replication Group with encryption

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
# Redis Replication Group (supports encryption)
# =============================================================================

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project_name}-redis-${var.environment}"
  description          = "FinPulse Redis cache with encryption"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.node_type
  num_cache_clusters   = var.num_cache_nodes
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = var.security_group_ids

  # Encryption enabled (Phase 4 security improvement)
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  # Automatic failover requires multi-AZ (disabled for single node)
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.num_cache_nodes > 1 ? true : false

  # Maintenance window (Sunday 3-4 AM UTC)
  maintenance_window = "sun:03:00-sun:04:00"

  # Snapshot for recovery
  snapshot_retention_limit = var.environment == "prod" ? 1 : 0
  snapshot_window          = "05:00-06:00"

  tags = var.tags
}
